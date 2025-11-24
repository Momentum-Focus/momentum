import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import musicIcon from "@/assets/icon-music.png";

interface YouTubePlayerProps {
  onDisconnect?: () => void;
  onPlay?: () => void;
  isDisconnecting?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  onDisconnect,
  onPlay,
  isDisconnecting = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<YouTubePlaylist | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Buscar playlists do YouTube
  const {
    data: playlists = [],
    isLoading: isLoadingPlaylists,
    error: playlistsError,
  } = useQuery<YouTubePlaylist[]>({
    queryKey: ["youtubePlaylists"],
    queryFn: async () => {
      const { data } = await api.get("/media/youtube/playlists");
      return data;
    },
    retry: 1,
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      if (
        errorMessage?.includes("Reconecte") ||
        errorMessage?.includes("token")
      ) {
        toast({
          title: "Erro de autenticação",
          description:
            "Sua conexão com o YouTube Music expirou ou está inválida. Por favor, desconecte e reconecte sua conta.",
          variant: "destructive",
          duration: 6000,
        });
      }
    },
  });

  // Carregar YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        if (playerRef.current && !youtubePlayerRef.current) {
          initializePlayer();
        }
      };
    } else if (
      window.YT &&
      window.YT.Player &&
      playerRef.current &&
      !youtubePlayerRef.current
    ) {
      initializePlayer();
    }

    return () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const initializePlayer = () => {
    const iframeElement = document.getElementById("youtube-iframe");
    if (!iframeElement || youtubePlayerRef.current) return;

    youtubePlayerRef.current = new window.YT.Player("youtube-iframe", {
      height: "200",
      width: "100%",
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        iv_load_policy: 3,
        disablekb: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          youtubePlayerRef.current = event.target;
          youtubePlayerRef.current.setVolume(volume);
          setPlayer(youtubePlayerRef.current);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            onPlay?.();
            updateProgress();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            setCurrentVideo(null);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
          }
        },
        onError: (event: any) => {
          console.error("Erro no player do YouTube:", event.data);
          toast({
            title: "Erro ao reproduzir",
            description:
              "Não foi possível reproduzir o vídeo. Tente novamente.",
            variant: "destructive",
          });
        },
      },
    });
  };

  const updateProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (youtubePlayerRef.current && isPlaying) {
        try {
          const currentTime = youtubePlayerRef.current.getCurrentTime();
          const duration = youtubePlayerRef.current.getDuration();
          // Progress é atualizado visualmente através do estado do player
        } catch (error) {
          // Ignora erros de progresso
        }
      }
    }, 1000);
  };

  // Atualizar volume quando mudar
  useEffect(() => {
    if (player && typeof player.setVolume === "function") {
      player.setVolume(volume);
    }
  }, [volume, player]);

  const handlePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSelectPlaylist = async (playlist: YouTubePlaylist) => {
    setSelectedPlaylist(playlist);

    // Buscar vídeos da playlist
    try {
      const { data } = await api.get(`/media/youtube/playlist/${playlist.id}`);

      if (data.items && data.items.length > 0) {
        const firstVideo = data.items[0];
        setCurrentVideo(firstVideo);

        if (player && typeof player.loadVideoById === "function") {
          player.loadVideoById(firstVideo.id);
        }
      } else {
        toast({
          title: "Playlist vazia",
          description: "Esta playlist não contém vídeos.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar playlist",
        description:
          error.response?.data?.error ||
          "Não foi possível carregar a playlist.",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (player && typeof player.nextVideo === "function") {
      player.nextVideo();
    }
  };

  const handlePrevious = () => {
    if (player && typeof player.previousVideo === "function") {
      player.previousVideo();
    }
  };

  return (
    <div className="space-y-4">
      {/* Library View */}
      {!currentVideo && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/50 font-light mb-2 px-1">
              Suas Playlists
            </h3>
            {isLoadingPlaylists ? (
              <div className="text-center py-4 text-white/50 text-sm">
                Carregando...
              </div>
            ) : playlistsError ? (
              <div className="text-center py-4 rounded-xl border border-red-500/30 bg-red-500/10">
                <p className="text-sm text-red-400 mb-2 font-medium">
                  Erro ao carregar playlists
                </p>
                <p className="text-xs text-red-300/80 font-light mb-3 px-2">
                  {playlistsError.response?.data?.message ||
                    "Não foi possível carregar suas playlists. Tente reconectar sua conta."}
                </p>
                {onDisconnect && (
                  <button
                    onClick={onDisconnect}
                    className="px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors border border-red-500/30"
                  >
                    Reconectar Conta
                  </button>
                )}
              </div>
            ) : playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left border border-white/10"
                  >
                    {playlist.thumbnail ? (
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#FF0000]/20 flex items-center justify-center">
                        <img
                          src={musicIcon}
                          alt="YouTube Music"
                          className="w-8 h-8 opacity-60"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white/90 truncate">
                        {playlist.title}
                      </p>
                      <p className="text-xs text-white/50 truncate font-light">
                        {playlist.itemCount} vídeos
                      </p>
                    </div>
                    <Play
                      className="h-5 w-5 text-[#FF0000]"
                      strokeWidth={2}
                      fill="currentColor"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white/50 text-sm">
                Nenhuma playlist encontrada
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player View */}
      {currentVideo && (
        <div className="space-y-4">
          <button
            onClick={() => {
              setCurrentVideo(null);
              setSelectedPlaylist(null);
              if (player && typeof player.stopVideo === "function") {
                player.stopVideo();
              }
            }}
            className="text-xs text-white/50 hover:text-white/90 transition-colors"
          >
            ← Voltar para biblioteca
          </button>

          {/* YouTube IFrame Player */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
            <div ref={playerRef} className="w-full">
              <div id="youtube-iframe" className="w-full" />
            </div>
          </div>

          {/* Current Video Info */}
          <div className="text-center py-4 rounded-xl border border-white/10 bg-black/20">
            <h4 className="text-lg font-medium text-white/90 truncate px-2 mb-1">
              {currentVideo.title || "YouTube Music"}
            </h4>
            <p className="text-sm text-white/50 truncate px-2 font-light">
              {currentVideo.channelTitle || "YouTube"}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={!player || !currentVideo}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
            >
              <SkipBack className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={!player || !currentVideo}
              className="h-12 w-12 rounded-full bg-[#FF0000] hover:bg-[#FF0000]/90 disabled:opacity-50 transition-colors flex items-center justify-center text-white shadow-lg shadow-[#FF0000]/30"
            >
              {isPlaying ? (
                <Pause
                  className="h-6 w-6"
                  strokeWidth={2}
                  fill="currentColor"
                />
              ) : (
                <Play
                  className="h-6 w-6 ml-0.5"
                  strokeWidth={2}
                  fill="currentColor"
                />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={!player || !currentVideo}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
            >
              <SkipForward className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-light">Volume</span>
              <span className="text-xs text-white/90 font-light">
                {volume}%
              </span>
            </div>
            <div className="relative h-1 bg-white/10 rounded-full group">
              <div
                className="absolute h-full bg-[#FF0000] rounded-full transition-all"
                style={{ width: `${volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentVideo && playlists.length === 0 && !isLoadingPlaylists && (
        <div className="text-center py-8 rounded-xl border border-white/10 bg-[#FF0000]/10">
          <div className="w-16 h-16 bg-[#FF0000]/20 rounded-full mx-auto mb-3 flex items-center justify-center">
            <img src={musicIcon} alt="YouTube Music" className="w-8 h-8" />
          </div>
          <h4 className="text-sm text-white/90 mb-1 font-medium">
            YouTube Music Conectado
          </h4>
          <p className="text-xs text-white/50 font-light">
            Selecione uma playlist para começar
          </p>
        </div>
      )}

      {/* Disconnect Button */}
      {onDisconnect && (
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="w-full px-4 py-2 rounded-full bg-transparent hover:bg-red-500/20 text-red-400 font-light transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDisconnecting ? "Desconectando..." : "Desconectar YouTube Music"}
        </button>
      )}
    </div>
  );
};
