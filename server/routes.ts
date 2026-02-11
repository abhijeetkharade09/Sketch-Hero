
import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Levenshtein distance for detecting close guesses
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

// Check if guess is close to the correct word
function isCloseGuess(guess: string, correctWord: string): boolean {
  const distance = levenshteinDistance(guess, correctWord);
  const maxDistance = Math.max(2, Math.floor(correctWord.length / 3));
  return distance > 0 && distance <= maxDistance && distance <= 2;
}

// Game State Management (In-Memory for performance)
// In a production app with multiple instances, this would need Redis
interface GameRoomState {
  roomId: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  state: "lobby" | "selecting_word" | "drawing" | "round_end" | "game_end";
  round: number;
  maxRounds: number;
  roundTime: number; 
  currentDrawerIndex: number;
  drawerId: string | null;
  word: string | null;
  wordHint: string; 
  wordOptions: string[];
  timer: number | null;
  players: Map<string, {
    id: string;
    username: string;
    avatar: string;
    score: number;
    connected: boolean;
    socketId: string;
    hasGuessed: boolean;
  }>;
  timerInterval?: NodeJS.Timeout;
}
const rooms = new Map<string, GameRoomState>();

const WORDS = [

  "apple",    //Alphabet & Common Words
  "banana",
  "elephant",
  "guitar",
  "jellyfish",
  "lion",
  "monkey",
  "octopus",
  "penguin",
  "robot",
  "umbrella",
  "whale",
  "zebra",
  "airplane",
  "beach",
  "cloud",
  "dragon",
  "earth",
  "flower",
  "backpack",    // Objects & Things
  "bicycle",
  "binoculars",
  "calculator",
  "camera",
  "candle",
  "clock",
  "compass",
  "crown",
  "envelope",
  "flashlight",
  "headphones",
  "hourglass",
  "keychain",
  "ladder",
  "lock",
  "microphone",
  "notebook",
  "paintbrush",
  "pillow",
  "scissors",
  "telescope",
  "toothbrush",
  "wallet",
  "watch",
  "chameleon",  // Animals
  "dolphin",
  "eagle",
  "flamingo",
  "frog",
  "kangaroo",
  "koala",
  "lobster",
  "parrot",
  "peacock",
  "rabbit",
  "seahorse",
  "snail",
  "turtle",
  "wolf",
  "bridge",    // Places & Structures
  "campfire",
  "castle",
  "classroom",
  "fountain",
  "garage",
  "lighthouse",
  "playground",
  "stadium",
  "treehouse",
  "windmill", 
  "ambulance",  // Vehicles & Transport
  "bulldozer",
  "helicopter",
  "motorcycle",
  "rocket",
  "school",
  "submarine",
  "tractor",
  "engine",
  "dancing",   // Actions & Concepts
  "fishing",
  "painting",
  "reading",
  "sleepwalking",
  "skateboarding",
  "snowboarding",
  "surfing",
  "thinking",
  "yawning",
  "avalanche",   // Nature & Environment
  "camping",
  "desert",
  "earthquake",
  "forest",
  "hurricane",
  "island",
  "mountain",
  "rainbow",
  "volcano",
  "waterfall"
];


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
    },
  });

  // REST API Routes
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      // Validate only the fields coming from client
      const bodySchema = z.object({
        hostId: z.string().uuid().nullable().optional(),
        maxPlayers: z.number().optional(),
        roundCount: z.number().optional(),
        roundTime: z.number().optional(),
      });
      const input = bodySchema.parse(req.body);
      
      // Generate unique 4-letter code
      let code = "";
      let isUnique = false;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const existing = await storage.getRoomByCode(code);
        if (!existing) isUnique = true;
      }

      const room = await storage.createRoom({ 
        hostId: input.hostId || null,
        maxPlayers: input.maxPlayers || 8,
        roundCount: input.roundCount || 3,
        roundTime: input.roundTime || 60,
        code: code
      });
      
    // Initialize in-memory state
      rooms.set(code, {
        roomId: room.id,
        hostId: input.hostId || "temp",
        status: "lobby",
        state: "lobby",
        round: 0,
        maxRounds: room.roundCount || 3,
        roundTime: room.roundTime || 60,
        currentDrawerIndex: 0,
        drawerId: null,
        word: null,
        wordHint: "",
        wordOptions: [],
        timer: room.roundTime || 60,
        players: new Map(),
      });

      console.log(`Room created successfully: ${code}`);
      res.status(201).json({ room, code });
    } catch (err) {
      console.error("Detailed room creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const room = await storage.getRoomByCode(code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  });

  app.post(api.rooms.join.path, async (req, res) => {
     // Check if room exists
     const room = await storage.getRoomByCode(req.body.code);
     if (!room) return res.status(404).json({ message: "Room not found" });
     // Could check max players here
     res.json(room);
  });


  // Socket.IO Logic
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinRoom", ({ code, user }: { code: string, user: { id: string, username: string, avatar: string } }) => {
      console.log(`User ${user.username} joining room ${code}`);
      const room = rooms.get(code);
      if (!room) {
        console.error(`Room ${code} not found for join`);
        socket.emit("error", { message: "Room not found" });
        return;
      }

      socket.join(code);
      
      // Add player if not exists
      if (!room.players.has(user.id)) {
        room.players.set(user.id, {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          score: 0,
          connected: true,
          socketId: socket.id,
          hasGuessed: false
        });
        
        // First player is host if not set (or host reconnecting)
        if (!room.hostId || room.hostId === "temp") {
          room.hostId = user.id;
        }
      } else {
        // Reconnect logic
        const player = room.players.get(user.id)!;
        player.connected = true;
        player.socketId = socket.id;
      }

      // Broadcast update
      io.to(code).emit("gameState", getPublicGameState(room));
      io.to(code).emit("message", {
        type: "system",
        text: `${user.username} joined the room!`,
        id: "sys-" + Date.now(),
        timestamp: Date.now()
      });
    });

   socket.on("draw", (data) => {
  // Broadcast to everyone ELSE in the room
  socket.to(data.roomId).emit("draw", data);
});

    socket.on("clear", (data: any) => {
      const roomId = data.roomId || data.code;
      if (roomId) {
        io.to(roomId).emit("clear");
      }
    });

    socket.on("startGame", (code: string) => {
      const room = rooms.get(code);
      if (!room) return;
      if (room.status === "playing") return;

      room.status = "playing";
      room.round = 1;
      startRound(io, room, code);
    });
    
    socket.on("chat", (data: { code: string, message: string, userId: string }) => {
      const room = rooms.get(data.code);
      if (!room) return;

      const player = room.players.get(data.userId);
      if (!player) return;

      // Check if it's a correct guess
      if (room.word && data.message.toLowerCase().trim() === room.word.toLowerCase() && room.drawerId !== data.userId && !player.hasGuessed) {
         // Correct guess!
         // Award points based on speed: (remaining time / total time) * 100
         const roundDuration = room.roundTime || 60;
         const points = Math.max(50, Math.ceil(((room.timer || 0) / roundDuration) * 100));
         player.score += points;
         player.hasGuessed = true;

         // Bonus for drawer
         const drawer = room.players.get(room.drawerId!);
         if (drawer) {
            drawer.score += 5;
         }

         io.to(data.code).emit("message", {
           type: "system",
           text: `${player.username} guessed the word!`,
           id: "sys-" + Date.now(),
           timestamp: Date.now(),
           isCorrect: true
         });
         
         io.to(data.code).emit("gameState", getPublicGameState(room));
         io.to(data.code).emit("correctGuess", { userId: player.id });

         // Check if everyone guessed
         const guessers = Array.from(room.players.values()).filter(p => p.id !== room.drawerId && p.connected);
         if (guessers.every(p => p.hasGuessed)) {
             endRound(io, room, data.code);
         }

      } else if (room.word && room.drawerId !== data.userId && !player.hasGuessed && isCloseGuess(data.message, room.word)) {
         // Close guess - show feedback to all non-drawer players
         io.to(data.code).emit("message", {
           type: "system",
           text: `${data.message} is close!`,
           id: "sys-" + Date.now(),
           timestamp: Date.now(),
           isCorrect: false
         });

      } else {
         // Regular chat message (if they haven't guessed yet, or if game allows chatting after guessing)
         // Usually if you guessed, your messages are hidden from non-guessers, but for MVP we simplify
         if (player.hasGuessed) {
            // Send only to others who guessed (skipping for MVP complexity)
            // Just don't show the word in chat if they type it again?
         }

         io.to(data.code).emit("message", {
           id: Date.now().toString(),
           userId: player.id,
           username: player.username,
           text: data.message,
           type: "chat",
           timestamp: Date.now()
         });
      }
    });

    socket.on("selectWord", ({ code, word }: { code: string, word: string }) => {
      const room = rooms.get(code);
      if (!room || room.drawerId !== socketToUserId(socket, room) || room.word) return;
      handleWordSelection(io, room, code, word);
    });

    socket.on("disconnect", () => {
       // Find room user was in
       for (const [code, room] of Array.from(rooms.entries())) {
          for (const [id, player] of Array.from(room.players.entries())) {
             if (player.socketId === socket.id) {
                player.connected = false;
                io.to(code).emit("gameState", getPublicGameState(room));
                io.to(code).emit("message", {
                   type: "system",
                   text: `${player.username} disconnected.`,
                   id: "sys-" + Date.now(),
                   timestamp: Date.now()
                });
                break;
             }
          }
       }
    });
  });

  return httpServer;
}

function startRound(io: SocketIOServer, room: GameRoomState, code: string) {
    // Select new drawer
    const playerArray = Array.from(room.players.values()).filter(p => p.connected);
    if (playerArray.length === 0) return;

    // Sequential rotation based on currentDrawerIndex
    const drawer = playerArray[room.currentDrawerIndex % playerArray.length];
    room.drawerId = drawer.id;
    
    // Pick 3 random words
    const shuffled = [...WORDS].sort(() => 0.5 - Math.random());
    room.wordOptions = shuffled.slice(0, 3);
    room.word = null;
    room.status = "playing";
    room.state = "selecting_word"; // Added to room state for cleaner UI sync
    
    // Reset guesses
    room.players.forEach(p => p.hasGuessed = false);

    room.timer = 15; // 15 seconds to pick a word
    
    io.to(code).emit("gameState", getPublicGameState(room));
    io.to(code).emit("wordChoices", { choices: room.wordOptions });
    io.to(code).emit("message", { type: "system", text: `Round ${room.round} started! ${drawer.username} is choosing a word.`, id: "sys-"+Date.now(), timestamp: Date.now() });

    // Start Selection Timer
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
        if (room.timer === null || room.timer <= 0) {
            clearInterval(room.timerInterval); // CRITICAL: Stop the interval
            if (!room.word) {
                // Auto-select first word if drawer didn't pick
                handleWordSelection(io, room, code, room.wordOptions[0]);
            }
            return;
        }
        room.timer--;
        io.to(code).emit("timerUpdate", room.timer);
    }, 1000);
}

function handleWordSelection(io: SocketIOServer, room: GameRoomState, code: string, selectedWord: string) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    
    room.word = selectedWord;
    room.wordHint = room.word.replace(/[a-zA-Z]/g, "_ ");
    room.state = "drawing";
    
    // Get original room duration from storage if needed or use the one stored in state
    // room.timer was set to roundTime during room creation in state
    // But it might have been modified by selection timer. 
    // We should probably store roundTime separately in GameRoomState.
    // For now let's assume we can fetch it or just use a default if it was lost.
    
    // Let's check how rooms are initialized. 
    // roundTime is stored in room.timer initially.
    // However, room.timer is used for the selection phase (15s).
    // We need to store the actual round duration.
    
    // Actually, let's look at startRound:
    // room.timer = 15;
    
    // We need to know what the original roundTime was.
    // Let's add roundTime to GameRoomState.
    
    room.timer = room.roundTime || 60; 

    io.to(code).emit("gameState", getPublicGameState(room));
    io.to(code).emit("message", { type: "system", text: `${room.players.get(room.drawerId!)?.username} has chosen a word!`, id: "sys-"+Date.now(), timestamp: Date.now() });

    // Start Drawing Timer
    const roundDuration = room.timer;
    room.timerInterval = setInterval(() => {
        if (room.timer === null || room.timer <= 0) {
            clearInterval(room.timerInterval); // CRITICAL: Stop the interval
            endRound(io, room, code);
            return;
        }
        room.timer--;
        io.to(code).emit("timerUpdate", room.timer);
        
        if (room.timer === Math.floor(roundDuration * 0.5) || room.timer === Math.floor(roundDuration * 0.25)) {
             revealHint(room);
             io.to(code).emit("gameState", getPublicGameState(room));
        }
    }, 1000);
}

function revealHint(room: GameRoomState) {
    if (!room.word) return;
    const wordArr = room.word.split('');
    const hintArr = room.wordHint.split(' ').filter(c => c !== ''); // simple split
    
    // Current hint format: "_ _ A _" -> need to be careful with parsing
    // Let's use a simpler hint array stored in memory if we want robustness, 
    // but for now, just random reveal
    
    // Re-construct hint
    let newHint = "";
    let revealed = false;
    for(let i=0; i<room.word.length; i++) {
        if (Math.random() > 0.7 && !revealed && room.wordHint[i*2] === '_') { // *2 because of space
             newHint += room.word[i] + " ";
             revealed = true;
        } else {
             // Keep existing or _
             newHint += (room.wordHint[i*2] !== '_' ? room.wordHint[i*2] : "_") + " ";
        }
    }
    room.wordHint = newHint.trim();
}

function endRound(io: SocketIOServer, room: GameRoomState, code: string) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timer = 0;
    
    io.to(code).emit("message", { type: "system", text: `Round ended! The word was ${room.word}`, id: "sys-"+Date.now(), timestamp: Date.now() });
    
    // Reveal word
    io.to(code).emit("roundEnd", { word: room.word });
    
    setTimeout(() => {
        // Advance to next drawer
        const playerArray = Array.from(room.players.values()).filter(p => p.connected);
        if (playerArray.length === 0) return;
        
        room.currentDrawerIndex = (room.currentDrawerIndex + 1) % playerArray.length;
        
        // If we've cycled through all players, increment round
        if (room.currentDrawerIndex === 0) {
            room.round++;
        }
        
        // Check if game is finished
        if (room.round > room.maxRounds) {
            room.status = "finished";
            io.to(code).emit("gameState", getPublicGameState(room));
            io.to(code).emit("gameEnd", { players: Array.from(room.players.values()) });
        } else {
            startRound(io, room, code);
        }
    }, 5000); // 5s cooldown
}

function socketToUserId(socket: any, room: GameRoomState): string | null {
  for (const [id, p] of Array.from(room.players.entries())) {
    if (p.socketId === socket.id) return id;
  }
  return null;
}

function getPublicGameState(room: GameRoomState) {
    // Hide word from non-drawers (unless round over)
    return {
        roomId: room.roomId,
        status: room.status,
        state: room.state,
        round: room.round,
        maxRounds: room.maxRounds,
        drawerId: room.drawerId,
        wordHint: room.wordHint,
        wordOptions: room.wordOptions,
        timer: room.timer,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            username: p.username,
            avatar: p.avatar,
            score: p.score,
            connected: p.connected,
            isDrawer: p.id === room.drawerId,
            hasGuessed: p.hasGuessed
        })),
        hostId: room.hostId
    };
}
