import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Search, Cloud, Waves, Flame, Music } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { YouTubePlayer } from "./YouTubePlayer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  const [activeTab, setActiveTab] = useState<"spotify" | "youtube">("spotify");
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: userProfile } = useQuery<any>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
  });

  useEffect(() => {
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

  const isSpotifyConnected = spotifyStatus?.isConnected || userProfile?.isSpotifyConnected;
  const isGoogleConnected = googleStatus?.isConnected || userProfile?.isGoogleConnected;

  return (
    <WidgetContainer
      title="Player de Música"
      onClose={onClose}
      className="w-96"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-black/20 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("spotify")}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === "spotify"
                ? "bg-white/10 text-white/90"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Spotify
          </button>
          <button
            onClick={() => setActiveTab("youtube")}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === "youtube"
                ? "bg-white/10 text-white/90"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            YouTube
          </button>
        </div>

        {/* Spotify Tab */}
        {activeTab === "spotify" && (
          <div className="space-y-6">
            {isSpotifyConnected ? (
              <div className="space-y-6">
                <div className="text-center py-6 rounded-xl border border-white/10 bg-black/20">
              <div className="w-16 h-16 bg-[#1DB954]/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-[#1DB954] text-2xl font-bold">S</span>
              </div>
                  <h4 className="text-sm text-white/90 mb-1 font-medium">
                Spotify Conectado
              </h4>
                  <p className="text-xs text-white/50 font-light">
                    Player do Spotify em desenvolvimento
                  </p>
                </div>
            </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={handleConnectSpotify}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1DB954] hover:opacity-90 transition-opacity text-white font-medium"
                >
                  <span className="text-xl font-bold">S</span>
                  <span>Conectar com Spotify</span>
                </button>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="text-xs text-white/50 uppercase tracking-wider font-light">
                    Sons de Foco
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 transition-all duration-200 flex items-center gap-2">
                      <Cloud className="h-4 w-4" strokeWidth={1.5} />
                      Chuva
                    </button>
                    <button className="px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 transition-all duration-200 flex items-center gap-2">
                      <Waves className="h-4 w-4" strokeWidth={1.5} />
                      Oceano
              </button>
                    <button className="px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 transition-all duration-200 flex items-center gap-2">
                      <Flame className="h-4 w-4" strokeWidth={1.5} />
                      Lareira
              </button>
                    <button className="px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 transition-all duration-200 flex items-center gap-2">
                      <Music className="h-4 w-4" strokeWidth={1.5} />
                      Lo-fi
              </button>
            </div>
              </div>
              </div>
            )}
          </div>
        )}

        {/* YouTube Tab */}
        {activeTab === "youtube" && (
          <div className="space-y-6">
            {isGoogleConnected ? (
          <YouTubePlayer
            onDisconnect={() => {
              queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }}
          />
        ) : (
                <button
                  onClick={handleConnectGoogle}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FF0000] hover:opacity-90 transition-opacity text-white font-medium"
              >
                <span className="text-xl font-bold">Y</span>
                <span>Conectar com YouTube Music</span>
                </button>
            )}
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};
