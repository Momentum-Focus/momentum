import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DraggableWidget } from "./DraggableWidget";
import { YouTubePlayer } from "./YouTubePlayer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MusicWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

export const MusicWidget: React.FC<MusicWidgetProps> = ({
  onClose,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [currentTrack] = useState("Sons da Natureza - Chuva");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Verifica o status de conexão do Spotify e Google
  const { data: spotifyStatus } = useQuery<{ isConnected: boolean }>({
    queryKey: ["spotifyStatus"],
    queryFn: () => api.get("/media/spotify/status").then((res) => res.data),
    retry: 1,
  });

  const { data: googleStatus } = useQuery<{ isConnected: boolean }>({
    queryKey: ["googleStatus"],
    queryFn: () => api.get("/media/google/status").then((res) => res.data),
    retry: 1,
  });

  // Busca o perfil do usuário para verificar status de conexão completo
  const { data: userProfile } = useQuery<any>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
  });

  useEffect(() => {
    // Escuta mensagens do popup de autenticação
    const handleMessage = (event: MessageEvent) => {
      const frontendUrl = window.location.origin;
      
      if (event.data?.type === "SPOTIFY_CONNECTED" && event.data?.success) {
        toast({
          title: "Spotify conectado com sucesso!",
          description: "Sua conta do Spotify foi conectada.",
        });
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
      
      if (event.data?.type === "GOOGLE_CONNECTED" && event.data?.success) {
        toast({
          title: "YouTube Music conectado com sucesso!",
          description: "Sua conta do YouTube Music foi conectada.",
        });
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient, toast]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleConnectSpotify = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para conectar o Spotify",
        variant: "destructive",
      });
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${apiUrl}/media/spotify/login?token=${encodeURIComponent(token)}`,
      "Spotify Login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,directories=no,status=no`
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    }, 500);
  };

  const handleConnectGoogle = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para conectar o YouTube Music",
        variant: "destructive",
      });
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${apiUrl}/media/google/connect?token=${encodeURIComponent(token)}`,
      "YouTube Music Login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,directories=no,status=no`
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    }, 500);
  };

  // Determina qual player ou botões mostrar baseado no status de conexão
  const isSpotifyConnected = spotifyStatus?.isConnected || userProfile?.isSpotifyConnected;
  const isGoogleConnected = googleStatus?.isConnected || userProfile?.isGoogleConnected;

  return (
    <DraggableWidget
      title="Player de Música"
      onClose={onClose}
      className="w-80"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      <div className="p-6 space-y-6">
        {/* Renderiza o player apropriado ou botões de conexão */}
        {isSpotifyConnected ? (
          // Spotify Player (placeholder - pode ser expandido depois)
          <div className="space-y-4">
            <div className="text-center py-4 bg-gradient-subtle rounded-lg border border-widget-border">
              <div className="w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-green-500 text-2xl font-bold">S</span>
              </div>
              <h4 className="font-medium text-foreground">Spotify Conectado</h4>
              <p className="text-sm text-muted-foreground">Player do Spotify em desenvolvimento</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="lg">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button onClick={handlePlayPause} size="lg" className="bg-gradient-primary hover:bg-primary-hover">
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button variant="ghost" size="lg">
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="text-sm text-foreground">{volume[0]}%</span>
              </div>
              <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="w-full" />
            </div>
          </div>
        ) : isGoogleConnected ? (
          // YouTube Player
          <YouTubePlayer
            onDisconnect={() => {
              queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }}
          />
        ) : (
          // Botões de conexão (nenhum conectado)
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Conectar Plataformas
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleConnectSpotify}
              >
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                Conectar com Spotify
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleConnectGoogle}
              >
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Y</span>
                </div>
                Conectar com YouTube Music
              </Button>
            </div>
          </div>
        )}

        {/* Preset Sounds (apenas se nenhuma plataforma estiver conectada) */}
        {!isSpotifyConnected && !isGoogleConnected && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Sons de Foco
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                🌧️ Chuva
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                🌊 Oceano
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                🔥 Lareira
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                🎵 Lo-fi
              </Button>
            </div>
          </div>
        )}
      </div>
    </DraggableWidget>
  );
};
