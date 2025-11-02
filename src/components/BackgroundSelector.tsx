import React, { useRef } from "react";
import { Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableWidget } from "./widgets/DraggableWidget";

interface BackgroundSelectorProps {
  onClose: () => void;
  onBackgroundSelect: (background: string) => void;
  currentBackground: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

const PRESET_BACKGROUNDS = [
  {
    id: "forest",
    name: "Floresta Tranquila",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80",
    description: "Natureza verde e relaxante",
  },
  {
    id: "ocean",
    name: "Oceano Calmo",
    url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1920&q=80",
    description: "Vista serena do mar",
  },
  {
    id: "mountains",
    name: "Montanhas Nevadas",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80",
    description: "Paisagem montanhosa inspiradora",
  },
  {
    id: "library",
    name: "Biblioteca Aconchegante",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1920&q=80",
    description: "Ambiente de estudo clássico",
  },
  {
    id: "minimal",
    name: "Minimalista",
    url: "",
    description: "Fundo neutro e limpo",
  },
];

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  onClose,
  onBackgroundSelect,
  currentBackground,
  defaultPosition,
  onPositionChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onBackgroundSelect(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (background: string) => {
    onBackgroundSelect(background);
  };

  return (
    <DraggableWidget
      title="Personalizar Fundo"
      onClose={onClose}
      className="w-96 max-h-[80vh] overflow-hidden"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
    >
      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Upload Personalizado
          </h3>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full h-12 border-dashed border-2 hover:bg-primary/5"
          >
            <Upload className="h-4 w-4 mr-2" />
            Carregar Imagem ou Vídeo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">
            Formatos suportados: JPG, PNG, MP4, WebM
          </p>
        </div>

        {/* Preset Backgrounds */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Fundos Pré-definidos
          </h3>
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {PRESET_BACKGROUNDS.map((bg) => (
              <div
                key={bg.id}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  currentBackground === bg.url
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-widget-border hover:border-primary/50"
                }`}
                onClick={() => handlePresetSelect(bg.url)}
              >
                {bg.url ? (
                  <div
                    className="w-full h-20 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${bg.url})` }}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    {currentBackground === bg.url && (
                      <div className="absolute top-1 right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-20 bg-gradient-subtle border border-widget-border relative flex items-center justify-center">
                    <div className="text-2xl text-muted-foreground">○</div>
                    {currentBackground === bg.url && (
                      <div className="absolute top-1 right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                )}
                <div className="p-2">
                  <h4 className="text-sm font-medium text-foreground">
                    {bg.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {bg.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Background Info */}
        {currentBackground && (
          <div className="p-3 bg-gradient-subtle rounded-lg border border-widget-border">
            <p className="text-sm text-muted-foreground mb-1">Fundo Atual:</p>
            <p className="text-sm font-medium text-foreground">
              {PRESET_BACKGROUNDS.find((bg) => bg.url === currentBackground)
                ?.name || "Imagem Personalizada"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetSelect("")}
              className="mt-2 w-full"
            >
              <X className="h-3 w-3 mr-1" />
              Remover Fundo
            </Button>
          </div>
        )}
      </div>
    </DraggableWidget>
  );
};
