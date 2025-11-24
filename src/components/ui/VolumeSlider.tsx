import React, { useState, useRef, useEffect } from "react";

interface VolumeSliderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  onDragStart?: () => void; // callback quando começa a arrastar
  onDragEnd?: (finalValue: number) => void; // callback quando termina de arrastar, recebe o valor final
  accentColor?: string; // cor de destaque (padrão: verde do Spotify)
  disabled?: boolean;
  className?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
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
    const finalValue = dragValue;
    setIsDragging(false);
    // Atualiza o estado primeiro
    onChange(finalValue);
    // Passa o valor final para onDragEnd
    onDragEnd?.(finalValue);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setDragValue(percentage);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      handleSeek(e);
    };

    const handleGlobalMouseUp = () => {
      if (!isDragging) return;
      const finalValue = dragValue;
      setIsDragging(false);
      // Atualiza o estado primeiro
      onChange(finalValue);
      // Passa o valor final para onDragEnd
      onDragEnd?.(finalValue);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragValue, onChange, onDragEnd, disabled]);

  const displayValue = isDragging ? dragValue : value;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        ref={barRef}
        className="flex-1 h-1 bg-white/20 rounded-full relative cursor-pointer group"
        onMouseDown={handleMouseDown}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="absolute h-full rounded-full transition-all"
          style={{ width: `${displayValue}%`, backgroundColor: accentColor }}
        />
        <div className="absolute inset-0" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
          style={{ left: `${displayValue}%` }}
        />
      </div>
    </div>
  );
};
