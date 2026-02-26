import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useRoom, useGameSocket } from "@/hooks/use-game";
import { GameCanvas } from "@/components/GameCanvas";
import { ColorPicker } from "@/components/ColorPicker";
import { ChatBox } from "@/components/ChatBox";
import { PlayerList } from "@/components/PlayerList";
import { useToast } from "@/hooks/use-toast";
import { Clock, Share2, Copy, Play, Mic, MicOff, Send } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GameRoom() {
  const [match, params] = useRoute("/room/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const code = params?.code || "";
  
  // Local state
  const [userId] = useState(() => localStorage.getItem("userId"));
  const [username] = useState(() => localStorage.getItem("username"));
  const [drawColor, setDrawColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [drawMode, setDrawMode] = useState<"pencil" | "brush" | "eraser">("brush");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoFn, setUndoFn] = useState<(() => void) | null>(null);
  const [redoFn, setRedoFn] = useState<(() => void) | null>(null);
  const [clearFn, setClearFn] = useState<(() => void) | null>(null);

  const previousDrawerId = useRef<string | null>(null);
  const [currentWord, setCurrentWord] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'chat' | 'players'>('chat');

  // Mobile chat input state
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(true);

  // Queries & Socket
  const { data: room, isLoading: roomLoading, error: roomError } = useRoom(code);
  const { 
    socket, 
    gameState, 
    chatMessages, 
    sendDraw, 
    sendChat, 
    startGame, 
    selectWord: originalSelectWord 
  } = useGameSocket(code, userId, username);

  const selectWord = (word: string) => {
    setCurrentWord(word);
    originalSelectWord(word);
  };

  // Redirect if basic info missing
  useEffect(() => {
    if (!userId || !username) {
      setLocation("/");
      toast({ title: "Error", description: "Session lost. Please join again.", variant: "destructive" });
    }
  }, [userId, username, setLocation, toast]);

  // Update currentWord when drawer selects a word or when word is set via auto-select
  useEffect(() => {
    if (gameState?.drawerId === userId && gameState?.state === 'drawing' && gameState?.word) {
      setCurrentWord(gameState.word);
    }
  }, [gameState?.word, gameState?.state, gameState?.drawerId, userId]);

  // Reset currentWord when transitioning between states
  useEffect(() => {
    if (gameState?.state === 'selecting_word') {
      setCurrentWord('');
    }
  }, [gameState?.state]);

  useEffect(() => {
    if (gameState?.state === 'round_end' && clearFn) {
      clearFn();
    }
  }, [gameState?.state, clearFn]);

  // Clear canvas and reset word when drawer changes
  useEffect(() => {
    if (gameState && previousDrawerId.current && previousDrawerId.current !== gameState.drawerId) {
      setCurrentWord('');
      if (clearFn) {
        clearFn();
      }
    }
    if (gameState) {
      previousDrawerId.current = gameState.drawerId;
    }
  }, [gameState?.drawerId, clearFn]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasVoiceSupport(false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setChatInput(transcript.trim());
        recognitionRef.current.stop();
      }
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (roomLoading || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="font-display text-xl animate-pulse">Loading Game Room...</p>
        </div>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="bg-red-500/10 p-8 rounded-2xl border border-red-500/50 text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-400">Room Not Found</h2>
          <p>This room doesn't exist or has expired.</p>
          <button onClick={() => setLocation("/")} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const isHost = room?.hostId === userId;
  const isDrawer = gameState.drawerId === userId;
  const isSelecting = gameState.state === 'selecting_word';
  const isRoundEnd = gameState.status === 'playing' && gameState.state === 'round_end';
  const showWord = isDrawer || isRoundEnd;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  const handleChatInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isDrawer) return;
    sendChat(chatInput);
    setChatInput("");
  };

  const toggleVoiceRecognition = () => {
    if (!hasVoiceSupport || !recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setChatInput("");
      recognitionRef.current.start();
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden flex flex-col bg-slate-900 p-2 sm:p-3 md:p-4 gap-3 sm:gap-4 md:gap-5 max-w-[2000px] mx-auto">
      
    {/* HEADER: Mobile Responsive */}
   <header className="w-full bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl px-2 py-2 sm:px-3 sm:py-3 border border-white/10 shadow-lg shrink-0 z-10">

  {/* Row Container */}
  <div className="flex items-center justify-between gap-2">

    {/* LEFT: Timer + Round */}
    <div className="flex flex-col items-center gap-1">
      <div className="bg-slate-800 text-white rounded-md px-2 sm:px-3 py-1 font-mono font-bold text-sm sm:text-xl border border-slate-600 flex items-center gap-1 sm:gap-2 shadow-inner">
        <Clock className="w-3 h-3 sm:w-5 sm:h-5 text-blue-400" />
        <span>{gameState.timer}s</span>
      </div>
      <div className="text-white/70 font-bold text-[10px] sm:text-sm">
        Round {gameState.round}/{room!.roundCount}
      </div>
    </div>

    {/* CENTER: Word */}
    <div className="flex-1 flex justify-center px-2 overflow-hidden">
      <div className="px-2 sm:px-6 py-1 bg-white rounded-md border border-slate-200 shadow-[0_3px_0_#cbd5e1] max-w-full">
        <h2 className="font-mono text-xs sm:text-lg md:text-2xl tracking-[0.15em] sm:tracking-[0.25em] font-bold text-slate-800 uppercase truncate">
          {isDrawer && gameState.state === 'drawing'
            ? currentWord
            : (!isDrawer ? gameState.wordHint : '...')}
        </h2>
      </div>
    </div>

    {/* RIGHT: Room Code */}
    <div>
      <button
        onClick={copyCode}
        className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] sm:text-sm whitespace-nowrap"
      >
        <span className="font-mono">{code}</span>
        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
    </div>

  </div>
</header>


      {/* MAIN GAME AREA */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 min-h-0 overflow-hidden">
        
        {/* LEFT: Player List - Desktop Only */}
        <div className="hidden lg:flex flex-col w-56 xl:w-64 bg-slate-800/50 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-md border border-white/10 shrink-0 overflow-y-auto custom-scrollbar">
          <PlayerList players={gameState.players} currentDrawerId={gameState.drawerId} />
        </div>

        {/* CENTER: Canvas + Mobile Bottom UI */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent lg:rounded-xl lg:md:rounded-2xl lg:overflow-hidden lg:shadow-2xl lg:ring-2 lg:md:ring-4 lg:ring-white/10">
          
          {/* Waiting / Selecting Overlay */}
          {isSelecting && (
             <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
               {isDrawer ? (
                 <div className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-sm w-full mx-auto">
                   <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-display text-white animate-bounce">Choose a Word!</h2>
                   <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
                     {gameState.wordOptions?.map(word => ( 
                       <button
                         key={word}
                         onClick={() => selectWord(word)}
                         className="px-3 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-white hover:bg-yellow-300 text-slate-900 text-sm sm:text-base md:text-lg lg:text-xl font-bold rounded-lg sm:rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] md:shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 md:active:translate-y-1 active:shadow-none transition-all uppercase"
                       >
                         {word}
                       </button>
                     ))}
                   </div>
                 </div>
               ) : (
                 <div className="text-center text-white space-y-4 p-4">
                    <div className="text-5xl sm:text-6xl md:text-7xl mb-4 animate-pulse">🤔</div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{gameState.players.find(p => p.id === gameState.drawerId)?.username} is choosing a word...</h2>
                 </div>
               )}
             </div>
          )}

          {/* Lobby Waiting Overlay */}
          {gameState.status === 'lobby' && (
             <div className="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4">
                <div className="text-center space-y-4 sm:space-y-6 max-w-sm w-full">
                   <h2 className="text-2xl xs:text-3xl sm:text-4xl font-display text-white">Waiting for Players...</h2>
                   <div className="bg-white/5 p-3 sm:p-4 rounded-lg sm:rounded-xl space-y-2 sm:space-y-3">
                     <p className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest">Settings</p>
                     <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-white font-mono text-xs sm:text-sm">
                        <span className="bg-blue-500/20 px-2 sm:px-3 py-1 rounded-lg border border-blue-500/30">{room?.roundCount} Rounds</span>
                        <span className="bg-purple-500/20 px-2 sm:px-3 py-1 rounded-lg border border-purple-500/30">{room?.roundTime}s Limit</span>
                     </div>
                   </div>
                   <div className="flex flex-wrap justify-center gap-2">
                     {gameState.players.map(p => (
                       <div key={p.id} className="bg-white/10 px-2 sm:px-3 py-1 rounded-full text-white text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                         <span>{p.avatar}</span> <span className="hidden xs:inline">{p.username}</span>
                       </div>
                     ))}
                   </div>
                   {isHost && gameState.players.length >= 2 ? (
                     <button 
                       onClick={startGame}
                       className="btn-success text-lg sm:text-xl md:text-2xl px-6 sm:px-12 py-2 sm:py-4 w-full animate-pulse"
                     >
                       Start Game
                     </button>
                   ) : isHost ? (
                     <div className="text-white/70 bg-white/5 p-3 sm:p-4 rounded-lg sm:rounded-xl text-xs sm:text-sm space-y-2">
                       <p>Need at least 2 players to start.</p>
                       <div className="mt-2 text-lg text-yellow-400 hover:text-yellow-200 font-mono bg-black/30 p-2 rounded select-all cursor-pointer" onClick={copyCode}>
                         Invite: {code} <Copy className="w-5 h-5 inline ml-1"/>
                       </div>
                     </div>
                   ) : (
                     <div className="text-blue-300 animate-pulse text-sm sm:text-base">Waiting for host to start...</div>
                   )}
                </div>
             </div>
          )}

          {/* Game Over / Leaderboard Overlay */}
          {gameState.status === 'finished' && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center animate-in zoom-in duration-500 p-4">
              <div className="text-center space-y-6 sm:space-y-8 w-full max-w-sm sm:max-w-md p-4 sm:p-6 md:p-8 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl">
                <div className="space-y-1 sm:space-y-2">
                  <h2 className="text-3xl xs:text-4xl sm:text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 drop-shadow-lg">Game Over!</h2>
                  <p className="text-white/60 font-bold tracking-widest uppercase text-xs sm:text-sm">Final Leaderboard</p>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  {gameState.players.sort((a, b) => b.score - a.score).map((p, idx) => (
                    <div 
                      key={p.id} 
                      className={cn(
                        "flex items-center justify-between p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-2xl border-2 transition-all text-xs xs:text-sm sm:text-base",
                        idx === 0 ? "bg-yellow-400 text-slate-900 border-yellow-200 scale-105 shadow-[0_4px_0_#ca8a04] md:shadow-[0_8px_0_#ca8a04]" : 
                        idx === 1 ? "bg-slate-300 text-slate-800 border-slate-100 shadow-[0_3px_0_#94a3b8] md:shadow-[0_6px_0_#94a3b8]" :
                        idx === 2 ? "bg-orange-400 text-slate-900 border-orange-200 shadow-[0_3px_0_#c2410c] md:shadow-[0_6px_0_#c2410c]" :
                        "bg-white/10 text-white border-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-lg sm:text-2xl font-black opacity-90 w-8"># {idx + 1}</span>
                        <span className="text-xl sm:text-3xl">{p.avatar}</span>
                        <span className="font-bold truncate">{p.username}</span>
                      </div>
                      <span className="text-lg sm:text-2xl font-black">{p.score}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setLocation("/")}
                  className="btn-primary w-full text-base sm:text-lg md:text-xl py-3 sm:py-4"
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          )}

          <GameCanvas 
            isDrawer={isDrawer && gameState.state === 'drawing'} 
            color={drawColor}
            size={brushSize}
            socket={socket}
            roomId={code}
            mode={drawMode}
            setMode={setDrawMode}
            onUndo={(fn) => setUndoFn(() => fn)}
            onRedo={(fn) => setRedoFn(() => fn)}
            onClear={(fn) => setClearFn(() => fn)}
            canUndo={setCanUndo}
            canRedo={setCanRedo}
          />

          {/* Desktop Only: Canvas Tools Overlay (Only for Drawer) */}
          {isDrawer && gameState.state === 'drawing' && (
            <div className="hidden lg:block absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 w-[98%] xs:w-[96%] sm:w-[95%] max-w-3xl animate-in slide-in-from-bottom-4 z-40">
              <ColorPicker 
                color={drawColor} 
                setColor={setDrawColor} 
                size={brushSize} 
                setSize={setBrushSize}
                onClear={() => clearFn?.()}
                onUndo={() => undoFn?.()}
                onRedo={() => redoFn?.()}
                canUndo={canUndo}
                canRedo={canRedo}
                mode={drawMode}
                setMode={setDrawMode}
              />
            </div>
          )}

          {/* MOBILE ONLY: Bottom UI Container */}
          <div className="flex flex-col lg:hidden flex-1 min-h-0 overflow-hidden">
            {/* Drawing Tools - Drawer Only */}
            {isDrawer && gameState.state === 'drawing' && (
              <div className="px-6 xs:px-2.5 sm:px-5 py-2 bg-slate-800/90 border-b border-white/10 shrink-0">
                <ColorPicker 
                  color={drawColor} 
                  setColor={setDrawColor} 
                  size={brushSize} 
                  setSize={setBrushSize}
                  onClear={() => clearFn?.()}
                  onUndo={() => undoFn?.()}
                  onRedo={() => redoFn?.()}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  mode={drawMode}
                  setMode={setDrawMode}
                />
              </div>
            )}

            {/* Tab Buttons */}
            <div className="flex border-t border-white/10 bg-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors ${activeTab === 'chat' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors ${activeTab === 'players' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
              >
                👥 Players
              </button>
            </div>

            {/* CHAT DIV */}
           <div className="flex-1 min-h-0 bg-slate-800 pb-16 lg:pb-0">
            {activeTab === 'chat' && (
              <div className="h-full min-h-0 flex flex-col">
                <ChatBox
                  messages={chatMessages}
                />
              </div>
            )}

              {activeTab === 'players' && (
                <div className="h-full overflow-y-auto p-2 sm:p-3 custom-scrollbar">
                  <PlayerList players={gameState.players} currentDrawerId={gameState.drawerId} />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT: Chat & Player List - Desktop Only */}
        <div className="hidden lg:flex w-72 xl:w-80 flex-col gap-4 md:gap-6 h-auto shrink-0">
          <div className="max-h-48 xl:max-h-56 overflow-y-auto bg-slate-800/50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 backdrop-blur-md custom-scrollbar">
             <PlayerList players={gameState.players} currentDrawerId={gameState.drawerId} />
          </div>
          <div className="flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden">
             <ChatBox 
               messages={chatMessages} 
             />
          </div>
        </div>

      </div>

      {/* DESKTOP ONLY: Chat Input inside Chat Panel */}
      {activeTab === 'chat' && (
        <form
          onSubmit={handleChatInputSubmit}
          className="hidden lg:flex items-center gap-2 p-3 bg-slate-800/90 backdrop-blur-md border-t border-white/10"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isListening ? "Listening..." : (isDrawer ? "Chat disabled" : "Type guess...")}
            disabled={isDrawer || gameState.state !== 'drawing'}
            className={cn(
              "flex-1 bg-slate-900 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none placeholder:text-slate-500 disabled:opacity-50",
              isListening && "border-red-500 border-2"
            )}
          />

          {hasVoiceSupport && (
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              disabled={isDrawer || gameState.state !== 'drawing'}
              title={isListening ? "Stop listening" : "Start voice input"}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!chatInput.trim() || isDrawer || gameState.state !== 'drawing'}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* MOBILE ONLY: Fixed Chat Input Bar at Bottom of Viewport */}
      {activeTab === 'chat' && (
        <form 
          onSubmit={handleChatInputSubmit}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-2 xs:p-2.5 sm:p-3 bg-slate-800/95 backdrop-blur-md border-t border-white/10 flex gap-1.5 xs:gap-2 w-screen"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isListening ? "Listening..." : (isDrawer ? "Chat disabled" : "Type guess...")}
            disabled={isDrawer || gameState.state !== 'drawing'}
            className={cn(
              "flex-1 bg-slate-900 text-white text-xs xs:text-sm p-2 xs:p-2.5 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none placeholder:text-slate-500 disabled:opacity-50 min-w-0",
              isListening && "border-red-500 border-2"
            )}
          />
          {hasVoiceSupport && (
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              disabled={isDrawer || gameState.state !== 'drawing'}
              title={isListening ? "Stop listening" : "Start voice input"}
              className={cn(
                "p-2 xs:p-2.5 rounded-lg transition-colors shrink-0",
                isListening 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button 
            type="submit" 
            disabled={!chatInput.trim() || isDrawer || gameState.state !== 'drawing'}
            className="bg-blue-600 text-white p-2 xs:p-2.5 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
