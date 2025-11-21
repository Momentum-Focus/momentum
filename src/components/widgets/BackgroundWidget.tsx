import React, { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { motion } from "framer-motion";
import { useSubscription } from "@/context/subscription-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BackgroundWidgetProps {
  onClose: () => void;
  onBackgroundSelect: (background: string) => void;
  currentBackground: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
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

export const BackgroundWidget: React.FC<BackgroundWidgetProps> = ({
  onClose,
  onBackgroundSelect,
  currentBackground,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { features } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const canUploadVideos = features.includes("VIDEO_BACKGROUND");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/") && !canUploadVideos) {
      toast({
        title: "Recurso Pro",
        description: "Faça upgrade para o Momentum Pro para usar fundos em vídeo.",
      });
      navigate("/plans");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);

    try {
      const { data } = await api.post("/media/background/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      onBackgroundSelect(data.url);
      toast({
        title: "Plano de fundo atualizado",
        description: data.isVideo
          ? "Vídeo aplicado com sucesso."
          : "Imagem aplicada com sucesso.",
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Não foi possível carregar o fundo. Tente novamente.";
      toast({
        title: "Erro ao carregar",
        description: message,
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePresetSelect = (background: string) => {
    onBackgroundSelect(background);
  };

  return (
    <WidgetContainer
      title="Personalizar Fundo"
      onClose={onClose}
      className="w-96 max-h-[80vh] overflow-hidden"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <div className="space-y-3">
          <h3 className="text-xs text-white/50 uppercase tracking-wider font-light">
            Upload Personalizado
          </h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/30 transition-colors group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto mb-3 text-white/50 group-hover:text-white/70 transition-colors" strokeWidth={1.5} />
            <p className="text-sm text-white/90 font-light mb-1">
              {isUploading ? "Enviando..." : "Arraste ou clique"}
            </p>
            <p className="text-xs text-white/50 font-light">
              {canUploadVideos
                ? "JPG, PNG, MP4, WebM habilitados"
                : "Plano Free: apenas JPG/PNG"}
            </p>
          </div>
        </div>

        {/* Preset Backgrounds */}
        <div className="space-y-3">
          <h3 className="text-xs text-white/50 uppercase tracking-wider font-light">
            Fundos Pré-definidos
          </h3>
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {PRESET_BACKGROUNDS.map((bg) => {
              const isSelected = currentBackground === bg.url;
              return (
                <motion.button
                  key={bg.id}
                  onClick={() => handlePresetSelect(bg.url)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/50"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {bg.url ? (
                    <div
                      className="w-full h-24 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${bg.url})` }}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" strokeWidth={2} />
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-black/40 border border-white/10 relative flex items-center justify-center">
                      <div className="text-2xl text-white/30">○</div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" strokeWidth={2} />
                        </motion.div>
                      )}
                    </div>
                  )}
                  <div className="p-2">
                    <h4 className="text-xs font-medium text-white/90 text-left">
                      {bg.name}
                    </h4>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};

