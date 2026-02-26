import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { GameState, ChatMessage, DrawEvent, type CreateUserRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Specific request type for room creation from frontend perspective
export interface CreateRoomFrontendRequest {
  hostId?: string | null;
  maxPlayers?: number;
  roundCount?: number;
  roundTime?: number;
}

// === API HOOKS ===

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const res = await fetch(api.users.create.path, {
        method: api.users.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create user');
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      // Store user in local storage for persistence across reloads
      localStorage.setItem('userId', data.id);
      localStorage.setItem('username', data.username);
      localStorage.setItem('avatar', data.avatar || 'default');
    }
  });
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: async (data: CreateRoomFrontendRequest) => {
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create room');
      // The backend returns { room, code }
      return await res.json();
    },
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: async ({ code, userId }: { code: string, userId: string }) => {
      const res = await fetch(api.rooms.join.path, {
        method: api.rooms.join.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId }),
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Room not found');
        throw new Error('Failed to join room');
      }
      return api.rooms.join.responses[200].parse(await res.json());
    },
  });
}

export function useRoom(code: string) {
  return useQuery({
    queryKey: [api.rooms.get.path, code],
    queryFn: async () => {
      const url = buildUrl(api.rooms.get.path, { code });
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch room');
      return api.rooms.get.responses[200].parse(await res.json());
    },
    enabled: !!code,
  });
}

// === SOCKET HOOK ===

export function useGameSocket(roomId: string | null, userId: string | null, username: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!roomId || !userId || !username) return;

    const newSocket = io({
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('joinRoom', { code: roomId, user: { id: userId, username, avatar: localStorage.getItem('avatar') || '🐶' } });
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('timerUpdate', (time: number) => {
      setGameState(prev => prev ? { ...prev, timer: time } : null);
    });

    newSocket.on('message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message].slice(-5)); // Keep only last 5 messages
      
      // Toast for correct guesses or system messages if needed
      if (message.type === 'system' && message.text.includes('winner')) {
        toast({
          title: "Round Ended!",
          description: message.text,
          variant: "default", 
        });
      }
    });
    
    newSocket.on('error', (err: any) => {
        toast({
            title: "Connection Error",
            description: err.message || "Something went wrong",
            variant: "destructive"
        });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, userId, username, toast]);

  const sendDraw = (event: DrawEvent) => {
    socket?.emit('draw', event);
  };

  const sendChat = (text: string) => {
    if (!userId) return;
    socket?.emit('chat', { code: roomId, message: text, userId });
  };
  
  const startGame = () => {
      socket?.emit('startGame', roomId);
  };
  
  const selectWord = (word: string) => {
      socket?.emit('selectWord', { code: roomId, word });
  };

  return { socket, gameState, chatMessages, sendDraw, sendChat, startGame, selectWord };
}
