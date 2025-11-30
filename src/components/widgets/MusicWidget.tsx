import React, { useState, useEffect, useRef } from "react";
import { Cloud, Waves, Flame, Music } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { SpotifyDashboard } from "./SpotifyDashboard";
import { YouTubeMusicDashboard } from "./YouTubeMusicDashboard";
import { MediaErrorBoundary } from "./MediaErrorBoundary";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/theme-context";
import { useMusicPlayer } from "@/context/music-player-context";
import spotifyIcon from "@/assets/icon-spotify.png";
import musicIcon from "@/assets/icon-music.png";
import { FOCUS_SOUND_URLS } from "@/config/focus-sounds";

interface MusicWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

type FocusSound = "rain" | "ocean" | "fireplace" | "lofi" | null;

export const MusicWidget: React.FC<MusicWidgetProps> = ({
  onClose,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  // Persistência de aba ativa no localStorage
  const loadActiveTab = (): "spotify" | "youtube" => {
    if (typeof window === "undefined") return "spotify";
    const saved = localStorage.getItem("momentum-music-active-tab");
    if (saved === "spotify" || saved === "youtube") {
      return saved;
    }
    return "spotify";
  };

  // Contexto global do player
  const { activeService, isPlaying } = useMusicPlayer();

  const [activeFocusSound, setActiveFocusSound] = useState<FocusSound>(null);
  const focusSoundAudioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { themeColor } = useTheme();

  const { data: spotifyStatus } = useQuery<{
    isConnected: boolean;
    isPremium: boolean;
  }>({
    queryKey: ["spotifyStatus"],
    queryFn: () => api.get("/media/spotify/status").then((res) => res.data),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: googleStatus } = useQuery<{ isConnected: boolean }>({
    queryKey: ["googleStatus"],
    queryFn: () => api.get("/media/google/status").then((res) => res.data),
    retry: 1,
  });

  const [activeTab, setActiveTab] = useState<"spotify" | "youtube">(() => {
    return loadActiveTab();
  });

  // Lógica Smart Default para aba inicial (apenas na primeira vez)
  useEffect(() => {
    const saved = localStorage.getItem("momentum-music-active-tab");
    if (saved) return; // Se já tem valor salvo, não muda

    // Aguarda os status carregarem
    if (spotifyStatus === undefined || googleStatus === undefined) return;

    // Se conectado nos dois: Abre Spotify
    if (spotifyStatus?.isConnected && googleStatus?.isConnected) {
      setActiveTab("spotify");
      localStorage.setItem("momentum-music-active-tab", "spotify");
      return;
    }
    // Se conectado só em um: Abre o que estiver conectado
    if (spotifyStatus?.isConnected) {
      setActiveTab("spotify");
      localStorage.setItem("momentum-music-active-tab", "spotify");
      return;
    }
    if (googleStatus?.isConnected) {
      setActiveTab("youtube");
      localStorage.setItem("momentum-music-active-tab", "youtube");
      return;
    }
    // Padrão: Spotify
    setActiveTab("spotify");
    localStorage.setItem("momentum-music-active-tab", "spotify");
  }, [spotifyStatus?.isConnected, googleStatus?.isConnected]);

  // Salva aba ativa sempre que mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("momentum-music-active-tab", activeTab);
    }
  }, [activeTab]);

  const { data: userProfile } = useQuery<any>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
  });

  // Mutations para disconnect
  const disconnectSpotifyMutation = useMutation({
    mutationFn: () => api.post("/media/spotify/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["spotifyPlaylists"] });
      queryClient.invalidateQueries({ queryKey: ["spotifySavedTracks"] });
      toast({
        title: "Spotify desconectado",
        description: "Sua conta do Spotify foi desconectada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao desconectar Spotify:", error);
      toast({
        title: "Erro ao desconectar",
        description:
          error.response?.data?.message ||
          "Não foi possível desconectar o Spotify. Verifique se o backend está rodando.",
        variant: "destructive",
      });
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => api.post("/media/google/disconnect"),
    onSuccess: () => {
      // Remove e cancela queries imediatamente para evitar requisições
      queryClient.cancelQueries({ queryKey: ["youtubePlaylists"] });
      queryClient.cancelQueries({ queryKey: ["youtubeSearch"] });
      queryClient.removeQueries({ queryKey: ["youtubePlaylists"] });
      queryClient.removeQueries({ queryKey: ["youtubeSearch"] });

      // Depois invalida as queries de status (isso vai atualizar o isGoogleConnected)
      queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });

      toast({
        title: "YouTube Music desconectado",
        description: "Sua conta do YouTube Music foi desconectada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao desconectar YouTube Music:", error);
      toast({
        title: "Erro ao desconectar",
        description:
          error.response?.data?.message ||
          "Não foi possível desconectar o YouTube Music. Verifique se o backend está rodando.",
        variant: "destructive",
      });
    },
  });

  // URLs dos sons de foco - busca do backend ou usa fallback
  const { data: focusSoundUrlsFromAPI } = useQuery<{
    rain: string | null;
    ocean: string | null;
    fireplace: string | null;
    lofi: string | null;
  }>({
    queryKey: ["focusSoundUrls"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/media/focus-sounds/urls");
        return data;
      } catch (error) {
        console.error("Erro ao buscar URLs dos sons de foco:", error);
        return {
          rain: null,
          ocean: null,
          fireplace: null,
          lofi: null,
        };
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Usa URLs do backend se disponíveis, senão usa fallback do arquivo de config
  const focusSoundUrls: Record<Exclude<FocusSound, null>, string> = {
    rain: focusSoundUrlsFromAPI?.rain || FOCUS_SOUND_URLS.rain,
    ocean: focusSoundUrlsFromAPI?.ocean || FOCUS_SOUND_URLS.ocean,
    fireplace: focusSoundUrlsFromAPI?.fireplace || FOCUS_SOUND_URLS.fireplace,
    lofi: focusSoundUrlsFromAPI?.lofi || FOCUS_SOUND_URLS.lofi,
  };

  // Monitorar mudanças no estado de reprodução para parar sons de foco
  useEffect(() => {
    if (isPlaying && activeFocusSound) {
      stopFocusSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const handleFocusSoundPlay = (sound: FocusSound) => {
    if (sound === activeFocusSound) {
      stopFocusSound();
      return;
    }

    stopFocusSound();

    if (sound && focusSoundUrls[sound]) {
      setActiveFocusSound(sound);

      if (focusSoundAudioRef.current) {
        focusSoundAudioRef.current.pause();
        focusSoundAudioRef.current = null;
      }

      const audio = new Audio(focusSoundUrls[sound]);
      audio.loop = true;
      audio.volume = 0.5;

      audio.addEventListener("play", () => {
        setActiveFocusSound(sound);
      });

      audio.addEventListener("error", (error) => {
        console.error("Erro ao tocar som de foco:", error);
        toast({
          title: "Erro",
          description:
            "Não foi possível reproduzir o som de foco. Verifique sua conexão.",
          variant: "destructive",
        });
        setActiveFocusSound(null);
      });

      audio.play().catch((error) => {
        console.error("Erro ao tocar som de foco:", error);
        toast({
          title: "Erro",
          description: "Não foi possível reproduzir o som de foco.",
          variant: "destructive",
        });
        setActiveFocusSound(null);
      });

      focusSoundAudioRef.current = audio;
    }
  };

  const stopFocusSound = () => {
    if (focusSoundAudioRef.current) {
      focusSoundAudioRef.current.pause();
      focusSoundAudioRef.current = null;
    }
    setActiveFocusSound(null);
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (focusSoundAudioRef.current) {
        focusSoundAudioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Aceita mensagens de qualquer origem para o callback do Spotify/Google
      // O backend envia a mensagem do callback, que pode ter origem diferente
      // A validação de segurança é feita pelo tipo de mensagem e dados
      if (!event.data || typeof event.data !== "object") {
        return;
      }

      // Tratamento de erros
      if (event.data?.type === "MEDIA_CONNECT_ERROR") {
        console.error("[MusicWidget] Erro ao conectar:", event.data);
        toast({
          title: "Erro ao conectar",
          description: event.data.error || "Ocorreu um erro ao conectar.",
          variant: "destructive",
        });
        return;
      }

      // Novo formato: MEDIA_CONNECT_SUCCESS
      if (
        event.data?.type === "MEDIA_CONNECT_SUCCESS" &&
        event.data?.provider === "spotify"
      ) {
        toast({
          title: "Spotify conectado com sucesso!",
          description: "Sua conta do Spotify foi conectada.",
        });

        // Invalida e refaz todas as queries relacionadas ao Spotify
        // Primeiro invalida o userProfile para garantir que o estado isSpotifyConnected seja atualizado
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.refetchQueries({ queryKey: ["userProfile"] });

        // Aguarda um delay maior para garantir que o backend salvou os tokens
        // O backend já tem um delay de 1s, então esperamos mais 2.5s para garantir
        setTimeout(() => {
          // Primeiro, força refetch do userProfile para atualizar isSpotifyConnected
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
          queryClient.refetchQueries({ queryKey: ["userProfile"] });

          // Aguarda um pouco antes de buscar status
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
            queryClient.refetchQueries({ queryKey: ["spotifyStatus"] });

            queryClient.invalidateQueries({ queryKey: ["spotifyToken"] });
            queryClient.refetchQueries({ queryKey: ["spotifyToken"] });

            // Aguarda mais um pouco antes de buscar playlists e tracks
            // para garantir que o token está disponível
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["spotifyPlaylists"] });
              queryClient.refetchQueries({ queryKey: ["spotifyPlaylists"] });

              queryClient.invalidateQueries({
                queryKey: ["spotifySavedTracks"],
              });
              queryClient.refetchQueries({ queryKey: ["spotifySavedTracks"] });
            }, 1500);
          }, 1000);
        }, 2500);

        return;
      }

      // Formato antigo (compatibilidade)
      if (event.data?.type === "SPOTIFY_CONNECTED" && event.data?.success) {
        toast({
          title: "Spotify conectado com sucesso!",
          description: "Sua conta do Spotify foi conectada.",
        });

        // Invalida e refaz todas as queries relacionadas ao Spotify
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.refetchQueries({ queryKey: ["userProfile"] });

        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
          queryClient.refetchQueries({ queryKey: ["spotifyStatus"] });

          queryClient.invalidateQueries({ queryKey: ["spotifyToken"] });
          queryClient.refetchQueries({ queryKey: ["spotifyToken"] });

          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["spotifyPlaylists"] });
            queryClient.refetchQueries({ queryKey: ["spotifyPlaylists"] });

            queryClient.invalidateQueries({ queryKey: ["spotifySavedTracks"] });
            queryClient.refetchQueries({ queryKey: ["spotifySavedTracks"] });
          }, 500);
        }, 1000);

        return;
      }

      if (
        event.data?.type === "MEDIA_CONNECT_SUCCESS" &&
        event.data?.provider === "google"
      ) {
        toast({
          title: "YouTube Music conectado com sucesso!",
          description: "Sua conta do YouTube Music foi conectada.",
        });
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["youtubePlaylists"] });
      }

      // Manter compatibilidade com o formato antigo
      if (event.data?.type === "GOOGLE_CONNECTED" && event.data?.success) {
        toast({
          title: "YouTube Music conectado com sucesso!",
          description: "Sua conta do YouTube Music foi conectada.",
        });
        queryClient.invalidateQueries({ queryKey: ["spotifyStatus"] });
        queryClient.invalidateQueries({ queryKey: ["googleStatus"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["youtubePlaylists"] });
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

    // Adiciona timestamp para forçar nova autenticação e evitar cache
    const timestamp = Date.now();
    const popup = window.open(
      `${apiUrl}/media/spotify/login?jwt=${encodeURIComponent(
        token
      )}&_t=${timestamp}`,
      "Spotify Login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,directories=no,status=no`
    );

    if (!popup) {
      toast({
        title: "Erro",
        description:
          "Não foi possível abrir a janela de autenticação. Verifique se os pop-ups estão bloqueados.",
        variant: "destructive",
      });
      return;
    }
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

    if (!popup) {
      toast({
        title: "Erro",
        description:
          "Não foi possível abrir a janela de autenticação. Verifique se os pop-ups estão bloqueados.",
        variant: "destructive",
      });
      return;
    }
  };

  const handleDisconnectSpotify = () => {
    disconnectSpotifyMutation.mutate();
  };

  const handleDisconnectGoogle = () => {
    disconnectGoogleMutation.mutate();
  };

  const isSpotifyConnected =
    spotifyStatus?.isConnected || userProfile?.isSpotifyConnected;
  const isGoogleConnected =
    googleStatus?.isConnected || userProfile?.isGoogleConnected;

  return (
    <WidgetContainer
      title="Player de Música"
      onClose={onClose}
      className="w-[420px] h-[700px] flex flex-col overflow-hidden"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      {/* Container Principal com Flexbox */}
      <div className="flex flex-col h-full overflow-hidden max-w-full">
        {/* Header - Tabs (Fixo) */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
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
        </div>

        {/* Corpo - Dashboard ou Botão de Conexão (Flexível) */}
        <div className="flex-1 min-h-0 overflow-hidden px-5">
          {activeTab === "spotify" && (
            <>
              {isSpotifyConnected ? (
                <div className="h-full overflow-hidden max-w-full box-border">
                  <MediaErrorBoundary
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full py-12 px-4 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 max-w-full">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full mb-4 flex items-center justify-center">
                          <img
                            src={spotifyIcon}
                            alt="Spotify"
                            className="w-8 h-8 opacity-60"
                          />
                        </div>
                        <h3 className="text-white/90 font-semibold mb-2">
                          Erro ao carregar Spotify
                        </h3>
                        <p className="text-white/60 text-sm text-center max-w-xs mb-4">
                          Tente desconectar e reconectar sua conta
                        </p>
                        <button
                          onClick={handleDisconnectSpotify}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-sm transition-all"
                        >
                          Desconectar
                        </button>
                      </div>
                    }
                  >
                    <SpotifyDashboard
                      onDisconnect={handleDisconnectSpotify}
                      isDisconnecting={disconnectSpotifyMutation.isPending}
                    />
                  </MediaErrorBoundary>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-3 py-8">
                  <button
                    onClick={handleConnectSpotify}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] transition-all text-black font-semibold shadow-lg shadow-[#1DB954]/30 hover:shadow-[#1DB954]/40"
                  >
                    <img src={spotifyIcon} alt="Spotify" className="w-5 h-5" />
                    <span>Conectar Spotify</span>
                  </button>
                  <p className="text-xs text-white/40 text-center px-2">
                    Player Web requer Spotify Premium. Contas Free têm acesso
                    apenas à visualização.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "youtube" && (
            <>
              {isGoogleConnected ? (
                <div className="h-full overflow-hidden max-w-full box-border">
                  <MediaErrorBoundary
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full py-12 px-4 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 max-w-full">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full mb-4 flex items-center justify-center">
                          <img
                            src={musicIcon}
                            alt="YouTube Music"
                            className="w-8 h-8 opacity-60"
                          />
                        </div>
                        <h3 className="text-white/90 font-semibold mb-2">
                          Erro ao carregar YouTube Music
                        </h3>
                        <p className="text-white/60 text-sm text-center max-w-xs mb-4">
                          Tente desconectar e reconectar sua conta
                        </p>
                        <button
                          onClick={handleDisconnectGoogle}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-sm transition-all"
                        >
                          Desconectar
                        </button>
                      </div>
                    }
                  >
                    <YouTubeMusicDashboard
                      onDisconnect={handleDisconnectGoogle}
                      isDisconnecting={disconnectGoogleMutation.isPending}
                      isConnected={isGoogleConnected}
                    />
                  </MediaErrorBoundary>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <button
                    onClick={handleConnectGoogle}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-[#FF0000] hover:bg-[#FF0000]/90 transition-all text-white font-light shadow-lg shadow-[#FF0000]/20"
                  >
                    <img
                      src={musicIcon}
                      alt="YouTube Music"
                      className="w-5 h-5"
                    />
                    <span>Conectar YouTube Music</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Divider (Fixo) */}
        <div className="flex-shrink-0 relative px-5 py-2">
          <div className="absolute inset-x-5 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/40 backdrop-blur-sm px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/40 font-light rounded-full border border-white/10">
              Sons de Foco
            </span>
          </div>
        </div>

        {/* Focus Sounds Footer - SEMPRE VISÍVEL (Fixo) */}
        <div className="flex-shrink-0 px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleFocusSoundPlay("rain")}
              className={`px-4 py-2 rounded-full text-xs transition-all duration-200 flex items-center gap-2 font-light ${
                activeFocusSound === "rain"
                  ? "border text-white/90"
                  : "bg-white/5 hover:bg-white/10 border-0 text-white/90"
              }`}
              style={
                activeFocusSound === "rain"
                  ? {
                      backgroundColor: `${themeColor}20`,
                      borderColor: `${themeColor}50`,
                      color: `${themeColor}CC`,
                    }
                  : undefined
              }
            >
              <Cloud className="h-4 w-4" strokeWidth={1.5} />
              Chuva
            </button>
            <button
              onClick={() => handleFocusSoundPlay("ocean")}
              className={`px-4 py-2 rounded-full text-xs transition-all duration-200 flex items-center gap-2 font-light ${
                activeFocusSound === "ocean"
                  ? "border text-white/90"
                  : "bg-white/5 hover:bg-white/10 border-0 text-white/90"
              }`}
              style={
                activeFocusSound === "ocean"
                  ? {
                      backgroundColor: `${themeColor}20`,
                      borderColor: `${themeColor}50`,
                      color: `${themeColor}CC`,
                    }
                  : undefined
              }
            >
              <Waves className="h-4 w-4" strokeWidth={1.5} />
              Oceano
            </button>
            <button
              onClick={() => handleFocusSoundPlay("fireplace")}
              className={`px-4 py-2 rounded-full text-xs transition-all duration-200 flex items-center gap-2 font-light ${
                activeFocusSound === "fireplace"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "bg-white/5 hover:bg-white/10 border-0 text-white/90"
              }`}
            >
              <Flame className="h-4 w-4" strokeWidth={1.5} />
              Lareira
            </button>
            <button
              onClick={() => handleFocusSoundPlay("lofi")}
              className={`px-4 py-2 rounded-full text-xs transition-all duration-200 flex items-center gap-2 font-light ${
                activeFocusSound === "lofi"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-white/5 hover:bg-white/10 border-0 text-white/90"
              }`}
            >
              <Music className="h-4 w-4" strokeWidth={1.5} />
              Lo-fi
            </button>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};
