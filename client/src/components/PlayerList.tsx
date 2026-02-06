import { GameState } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Trophy, Pencil, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlayerListProps {
  players: GameState['players'];
  currentDrawerId: string | null;
}

export function PlayerList({ players, currentDrawerId }: PlayerListProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-1 xs:space-y-1 sm:space-y-1 w-full">
      <h3 className="text-white font-bold text-xs xs:text-sm sm:text-base uppercase tracking-wider mb-2 xs:mb-2.5 sm:mb-3 px-1">👥 Players ({players.length})</h3>
      
      <div className="space-y-1 xs:space-y-1 sm:space-y-1 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence>
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative flex items-center gap-2 xs:gap-2.5 sm:gap-3 p-1.5 xs:p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all border-2",
                player.id === currentDrawerId 
                  ? "bg-white/20 border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.2)]" 
                  : player.hasGuessed
                    ? "bg-green-500/20 border-green-500/40"
                    : "bg-white/10 border-transparent hover:bg-white/15"
              )}
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-base xs:text-lg sm:text-xl shadow-sm">
                  {player.avatar}
                </div>
                {index === 0 && player.score > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 sm:-top-1.5 sm:-right-1.5 bg-yellow-400 text-yellow-900 w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md">
                    <Trophy className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 xs:gap-1.5">
                  <span className={cn("font-bold text-xs xs:text-sm sm:text-base truncate", player.connected ? "text-white" : "text-white/50 line-through")}>
                    {player.username}
                  </span>
                  {player.id === currentDrawerId && (
                    <Pencil className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 animate-pulse shrink-0" />
                  )}
                  {player.hasGuessed && (
                    <CheckCircle2 className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-green-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs xs:text-xs sm:text-sm font-medium text-white/60">
                  {player.score} pts
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
