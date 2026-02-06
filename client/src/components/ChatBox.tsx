import { useRef, useEffect } from "react";
import { ChatMessage } from "@shared/schema";
import { Trophy, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBoxProps {
  messages: ChatMessage[];
}

export function ChatBox({ messages }: ChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  
  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg sm:rounded-xl backdrop-blur-md border border-white/10 overflow-hidden">
      <div className="p-2 xs:p-2.5 sm:p-3 bg-slate-800/80 border-b border-white/10 shrink-0">
        <h3 className="text-white font-bold text-xs xs:text-sm sm:text-base tracking-wide flex items-center gap-2">
          💬 Chat & Guesses
        </h3>
      </div>
      
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 xs:p-2.5 sm:p-3 space-y-1.5 xs:space-y-2 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-xs xs:text-sm py-4 italic">
            No messages yet. Start guessing!
          </div>
        )}
        
        {[...messages].reverse().map((msg, i) => (
          <div 
            key={`${msg.id || i}-${i}`} 
          className={cn(
            "text-xs sm:text-sm rounded-md animate-in slide-in-from-left-2 duration-300 transition-all",
            msg.type === "system"
              ? msg.isCorrect
                ? "bg-green-500 text-white px-2 py-0.5 text-[6px] font-medium text-center"
                : msg.text.includes("close")
                ? "bg-yellow-400 text-slate-900 px-2 py-0.5 text-[10px] font-medium text-center"
                : "bg-blue-500/20 text-blue-200 px-2 py-0.5 text-[9px] font-medium text-center"
              : "bg-white/5 text-white/90 px-2 py-1.5 hover:bg-white/10"
          )}

          >
            {msg.type === 'system' && !msg.isCorrect && <Info className="w-2.5 h-2.5 xs:w-3 xs:h-3 inline mr-1" />}
            {msg.isCorrect && <Trophy className="w-3 h-3 xs:w-4 xs:h-4 inline mr-1 xs:mr-2 text-yellow-300 animate-bounce" />}
            
            {(msg.type !== 'system' && !msg.isCorrect) && (
              <span className="font-medium text-white/60 mr-1 xs:mr-2 break-all">{msg.username}:</span>
            )}
            
            <span className={cn(msg.isCorrect ? "text-white text-sm xs:text-base tracking-wider font-medium" : "")}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
