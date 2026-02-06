import { useEffect, useRef, useState } from "react";
import { useCallback } from "react";
import { DrawEvent } from "@shared/schema";
import { Pencil, Paintbrush, Eraser, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameCanvasProps {
  isDrawer: boolean;
  color: string;
  size: number;
  socket: any;
  roomId: string;
  mode: "pencil" | "brush" | "eraser";
  setMode: (m: "pencil" | "brush" | "eraser") => void;
  onUndo?: (fn: () => void) => void;
  onRedo?: (fn: () => void) => void;
  onClear?: (fn: () => void) => void;
  canUndo?: (val: boolean) => void;
  canRedo?: (val: boolean) => void;
}

export function GameCanvas({
  isDrawer,
  color,
  size,
  socket,
  roomId,
  mode,
  setMode,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (canUndo) canUndo(historyIndex > 0);
    if (canRedo) canRedo(historyIndex < history.length - 1);
  }, [historyIndex, history.length, canUndo, canRedo]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

const undo = useCallback(() => {
  setHistoryIndex((prevIndex) => {
    if (prevIndex <= 0) return prevIndex;

    const newIndex = prevIndex - 1;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit("draw", { type: "clear", roomId });

      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => ctx.drawImage(img, 0, 0);
    }

    return newIndex;
  });
}, [history, socket, roomId]);

const redo = useCallback(() => {
  setHistoryIndex((prevIndex) => {
    if (prevIndex >= history.length - 1) return prevIndex;

    const newIndex = prevIndex + 1;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit("draw", { type: "clear", roomId });

      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => ctx.drawImage(img, 0, 0);
    }

    return newIndex;
  });
}, [history, socket, roomId]);


 const clear = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("draw", { type: "clear", roomId });
  saveToHistory();
}, [socket, roomId]);

useEffect(() => {
  onUndo?.(undo);
  onRedo?.(redo);
  onClear?.(clear);
}, [undo, redo, clear]);

  const loadFromHistory = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Broadcast the cleared state and then we'd ideally broadcast the image
      // Since our protocol is stroke-based, we broadcast a clear event
      socket.emit("draw", { type: "clear", roomId });
      
      // For now, since we don't have a "broadcast image" event, we'll just keep it local.
      // But we must at least clear the other side.
    };
  };

  // Initialize canvas context and handle resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx?.drawImage(canvas, 0, 0);

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Save initial blank state
      if (history.length === 0) {
        saveToHistory();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!socket) return;

  const handleDraw = (data: DrawEvent) => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  // CLEAR event
  if (data.type === "clear") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // END event
  if (data.type === "end") {
    ctx.closePath();
    return;
  }

  // START / DRAG events MUST have these values
  if (
    data.x === undefined ||
    data.y === undefined ||
    data.color === undefined ||
    data.size === undefined
  ) {
    return; // safety guard
  }

  const w = canvas.width;
  const h = canvas.height;

  const x = data.x * w;
  const y = data.y * h;

  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;

  if (data.type === "start") {
    ctx.beginPath();
    ctx.moveTo(x, y);
  } else if (data.type === "drag") {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
};


    socket.on("draw", handleDraw);
  
    return () => {
      socket.off("draw", handleDraw);
      // socket.off("clear");
    };
  }, [socket]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);

    const { x, y } = getCoords(e);
    const isEraser = mode === "eraser";
    const drawColor = isEraser ? "#ffffff" : color;
    const drawSize = isEraser ? size * 2 : (mode === "pencil" ? Math.max(2, size / 2) : size);

    drawLocally(x, y, "start", drawColor, drawSize);
    emitDraw(x, y, "start", drawColor, drawSize);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawing) return;

    const { x, y } = getCoords(e);
    const isEraser = mode === "eraser";
    const drawColor = isEraser ? "#ffffff" : color;
    const drawSize = isEraser ? size * 2 : (mode === "pencil" ? Math.max(2, size / 2) : size);

    drawLocally(x, y, "drag", drawColor, drawSize);
    emitDraw(x, y, "drag", drawColor, drawSize);
  };

const stopDrawing = () => {
  if (!isDrawer || !isDrawing) return;
  setIsDrawing(false);

  const ctx = canvasRef.current?.getContext("2d");
  ctx?.closePath();

  // Do NOT emit wrong color/size
  socket.emit("draw", {
  type: "end",
  roomId,
} satisfies DrawEvent);
  saveToHistory();
};

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const drawLocally = (
    x: number,
    y: number,
    type: "start" | "drag",
    drawColor: string,
    drawSize: number,
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "start") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

 const emitDraw = (
  x: number,
  y: number,
  type: DrawEvent["type"],
  drawColor: string,
  drawSize: number
) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const payload: DrawEvent = {
    type,
    roomId,
    x: x / canvas.width,
    y: y / canvas.height,
    color: drawColor,
    size: drawSize,
  };

  socket.emit("draw", payload);
};


  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[350px] bg-white rounded-lg sm:rounded-xl shadow-inner border-2 overflow-hidden touch-none select-none",
        isDrawer ? "cursor-crosshair" : "cursor-default"
      )}
    >
      <canvas
        ref={canvasRef}
        className="touch-none w-full h-full block"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!isDrawer ? (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 xs:px-2.5 sm:px-3 py-1 xs:py-1.5 bg-black/50 text-white text-xs xs:text-xs sm:text-sm rounded-full pointer-events-none select-none backdrop-blur-sm">
          👀 Guessing Mode
        </div>
      ) : null}
    </div>
  );
}
