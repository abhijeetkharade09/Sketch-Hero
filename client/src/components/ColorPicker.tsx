import { cn } from "@/lib/utils";
import { Undo, Redo, Eraser, Pencil, Paintbrush, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
  "#00FFFF", "#FF00FF", "#C0C0C0", "#808080", "#800000", "#808000", 
  "#008000", "#800080", "#008080", "#000080", "#FFA500", "#A52A2A"
];

const SIZES = [2, 5, 10, 20, 30, 45];

interface ColorPickerProps {
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  mode: "pencil" | "brush" | "eraser";
  setMode: (m: "pencil" | "brush" | "eraser") => void;
}

export function ColorPicker({ 
  color, setColor, 
  size, setSize, 
  onClear, onUndo, onRedo, 
  canUndo, canRedo,
  mode, setMode
}: ColorPickerProps) {
  const colorScrollRef = useRef<HTMLDivElement>(null);

  const scrollColors = (direction: 'left' | 'right') => {
    if (colorScrollRef.current) {
      const scrollAmount = 150;
      colorScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl shadow-lg border border-slate-200 flex flex-col gap-1.5 sm:gap-2 md:gap-3 w-full">
      
      {/* Top Row: Tools & Actions */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {/* Drawing Tools */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 rounded-md p-0.5">
          <button
            onClick={() => setMode("pencil")}
            className={cn(
              "p-1 sm:p-1.5 rounded transition-all",
              mode === "pencil" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"
            )}
            title="Pencil"
          >
            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setMode("brush")}
            className={cn(
              "p-1 sm:p-1.5 rounded transition-all",
              mode === "brush" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"
            )}
            title="Brush"
          >
            <Paintbrush className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setMode("eraser")}
            className={cn(
              "p-1 sm:p-1.5 rounded transition-all",
              mode === "eraser" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"
            )}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={onClear}
            className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 uppercase tracking-wider transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Color Picker Row with Scroll Buttons */}
      <div className="flex items-center gap-1">
        {/* Left Scroll Button */}
        <button
          onClick={() => scrollColors('left')}
          className="shrink-0 p-0.5 sm:p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors lg:hidden"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>

        {/* Colors Container */}
        <div 
          ref={colorScrollRef}
          className="flex gap-1 sm:gap-1.5 overflow-x-auto lg:overflow-visible flex-1 lg:grid lg:grid-cols-9 scrollbar-hide lg:scrollbar-default"
        >
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full border transition-all hover:scale-110",
                color === c 
                  ? "ring-2 ring-offset-1 ring-blue-500 scale-110 border-blue-400" 
                  : "border-slate-300"
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scrollColors('right')}
          className="shrink-0 p-0.5 sm:p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors lg:hidden"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Brush Size Row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="text-[10px] sm:text-xs font-semibold text-slate-600 whitespace-nowrap">Size:</span>
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto flex-1 scrollbar-hide">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                "shrink-0 rounded-full bg-slate-800 transition-all hover:bg-slate-600 hover:scale-110",
                size === s ? "ring-2 ring-offset-1 ring-blue-500 bg-blue-600" : ""
              )}
              style={{ 
                width: Math.min(24, s * 0.4 + 8), 
                height: Math.min(24, s * 0.4 + 8) 
              }}
              title={`Size ${s}px`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}