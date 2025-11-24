import React, { useState, useRef, useEffect } from "react";

interface SeekBarProps {
  value: number; // 0-100 (percentual)
  duration: number; // duração total em segundos
  currentTime: number; // tempo atual em segundos
  onChange: (time: number) => void; // callback com tempo em segundos
  onDragStart?: () => void; // callback quando começa a arrastar
  onDragEnd?: () => void; // callback quando termina de arrastar
  accentColor?: string; // cor de destaque (padrão: verde do Spotify)
  disabled?: boolean;
  className?: string;
}

export const SeekBar: React.FC<SeekBarProps> = ({
  value,
  duration,
  currentTime,
  onChange,
  onDragStart,
  onDragEnd,
  accentColor = "#1DB954", // Verde do Spotify por padrão
  disabled = false,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const barRef = useRef<HTMLDivElement>(null);

  // Formata tempo em segundos para MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Atualiza dragValue quando value muda (mas não durante drag)
  useEffect(() => {
    if (!isDragging) {
      setDragValue(value);
    }
  }, [value, isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation(); // Previne que o widget seja arrastado
    setIsDragging(true);
    onDragStart?.(); // Notifica que começou a arrastar
    handleSeek(e);
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement> | MouseEvent
  ) => {
    if (!isDragging || disabled) return;
    handleSeek(e);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Aplica o valor final
    const finalTime = (dragValue / 100) * duration;
    onChange(finalTime);
    onDragEnd?.(); // Notifica que terminou de arrastar
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setDragValue(percentage);
  };

  // Adiciona listeners globais para drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      handleSeek(e);
    };

    const handleGlobalMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      const finalTime = (dragValue / 100) * duration;
      onChange(finalTime);
      onDragEnd?.();
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragValue, duration, onChange, onDragEnd, disabled]);

  const displayValue = isDragging ? dragValue : value;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-white/60 tabular-nums min-w-[35px] text-right">
        {formatTime(currentTime)}
      </span>
      <div
        ref={barRef}
        className="flex-1 h-1 bg-white/10 rounded-full relative cursor-pointer group"
        onMouseDown={handleMouseDown}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="absolute h-full rounded-full transition-all"
          style={{ width: `${displayValue}%`, backgroundColor: accentColor }}
        />
        {/* Handle invisível para melhor área de clique */}
        <div className="absolute inset-0" />
        {/* Handle visível no hover */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
          style={{ left: `${displayValue}%` }}
        />
      </div>
      <span className="text-[10px] text-white/60 tabular-nums min-w-[35px]">
        {formatTime(duration)}
      </span>
    </div>
  );
};
