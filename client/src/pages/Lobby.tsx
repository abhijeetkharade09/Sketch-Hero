import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AvatarSelector } from "@/components/AvatarSelector";
import { useCreateUser, useCreateRoom, useJoinRoom } from "@/hooks/use-game";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Palette, Play, Users } from "lucide-react";
import confetti from "canvas-confetti";

confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
});

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("🐶");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "join" | "create">("menu");
  const [rounds, setRounds] = useState(2);
  const [timeLimit, setTimeLimit] = useState(60);

  // Load from local storage
  useEffect(() => {
    const savedName = localStorage.getItem("username");
    const savedAvatar = localStorage.getItem("avatar");
    if (savedName) setUsername(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
    
    // Welcome confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const createUser = useCreateUser();
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      toast({ title: "Name required", description: "Please enter a username first!", variant: "destructive" });
      return;
    }

    try {
      const user = await createUser.mutateAsync({ username, avatar });
      const { code } = await createRoom.mutateAsync({ 
        hostId: user.id, 
        roundCount: rounds, 
        roundTime: timeLimit 
      });
      setLocation(`/room/${code}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      toast({ title: "Info required", description: "Please enter a username and room code!", variant: "destructive" });
      return;
    }

    try {
      const user = await createUser.mutateAsync({ username, avatar });
      await joinRoom.mutateAsync({ code: roomCode, userId: user.id });
      setLocation(`/room/${roomCode}`);
    } catch (err: any) {
      toast({ title: "Cannot join", description: err.message, variant: "destructive" });
    }
  };

  const isPending = createUser.isPending || createRoom.isPending || joinRoom.isPending;

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8 md:px-6 lg:px-8 relative">
      <div className="w-full max-w-[80%] sm:max-w-md mx-auto animate-in fade-in zoom-in duration-500">
        
        {/* Logo/Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 relative overflow-hidden">
          <div className="relative inline-block max-w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] md:drop-shadow-[3px_3px_0_rgba(0,0,0,0.5)] lg:drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] transform -rotate-2 sm:-rotate-3 hover:rotate-2 sm:hover:rotate-3 transition-transform cursor-default leading-tight">
              Sketch Hero
            </h1>
            <span className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl absolute -top-1 -right-6 sm:-top-2 sm:-right-8 md:-top-3 md:-right-10 lg:-top-4 lg:-right-4 rotate-12 drop-shadow-lg">✏️</span>
          </div>
          <p className="text-blue-200 font-bold mt-2 text-sm sm:text-base md:text-lg">Draw - Guess - Win!</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-2xl border border-white/20">
          
          {/* User Setup Section */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-7 md:mb-8">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider pl-1">Your Name</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a fun nickname..."
                className="input-cartoon w-full"
                maxLength={12}
              />
            </div>

            <AvatarSelector value={avatar} onChange={setAvatar} />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 sm:space-y-4">
            {mode === "menu" && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => setMode("create")}
                  className="btn-success flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-5 md:py-6 group"
                >
                  <Palette className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm md:text-base lg:text-lg font-bold">Create Room</span>
                </button>
                <button
                  onClick={() => setMode("join")}
                  className="btn-primary flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-5 md:py-6 group"
                >
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm md:text-base lg:text-lg font-bold">Join Room</span>
                </button>
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-3 sm:space-y-4 animate-in slide-in-from-right duration-300">
                <div className="bg-green-500/20 p-3 sm:p-4 rounded-xl text-white border border-green-500/30 space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block">Rounds</label>
                    <select 
                      value={rounds} 
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg p-2 sm:p-2.5 font-bold text-sm sm:text-base"
                    >
                      {[2, 4, 6, 8, 10].map(r => <option key={r} value={r}>{r} Rounds</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block">Time Limit (seconds)</label>
                    <select 
                      value={timeLimit} 
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg p-2 sm:p-2.5 font-bold text-sm sm:text-base"
                    >
                      {[30, 45, 60, 80, 1000].map(t => <option key={t} value={t}>{t} Seconds</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button 
                    onClick={() => setMode("menu")}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-slate-600 hover:bg-slate-500 shadow-[0_4px_0_#334155] active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleCreateRoom}
                    disabled={isPending}
                    className="flex-[2] btn-success text-sm sm:text-base md:text-lg lg:text-xl flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3"
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Play fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <span className="font-bold">Start Game</span>
                  </button>
                </div>
              </div>
            )}

            {mode === "join" && (
              <div className="space-y-3 sm:space-y-4 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider pl-1">Room Code</label>
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="X7Y2Z9"
                    className="input-cartoon text-center uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] lg:tracking-[0.5em] font-mono text-lg sm:text-xl md:text-2xl w-full"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-2 sm:gap-3 pt-2">
                  <button 
                    onClick={() => setMode("menu")}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-slate-600 hover:bg-slate-500 shadow-[0_4px_0_#334155] active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleJoinRoom}
                    disabled={isPending}
                    className="flex-[2] btn-primary text-sm sm:text-base md:text-lg lg:text-xl flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3"
                  >
                    {isPending && <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />}
                    <span className="font-bold">Enter Room</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Decorative footer */}
      <div className="mt-6 sm:mt-8 text-white/20 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider uppercase text-center px-4 max-w-md">
        {/* <span className="block sm:inline">Multiplayer Drawing Game </span> */}
        <span className="block sm:inline">Made with ❤️ by <a href="" className="hover:text-white/40 transition-colors">Abhijeet Kharade</a></span>
      </div>
    </div>
  );
}