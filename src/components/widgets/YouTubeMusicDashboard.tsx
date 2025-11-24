import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Search,
  Link as LinkIcon,
  X,
  ChevronLeft,
  List,
  LogOut,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMusicPlayer } from "@/context/music-player-context";
import { SeekBar } from "@/components/ui/SeekBar";
import { VolumeSlider } from "@/components/ui/VolumeSlider";
import musicIcon from "@/assets/icon-music.png";

interface YouTubeMusicDashboardProps {
  onDisconnect?: () => void;
  onPlay?: () => void;
  isDisconnecting?: boolean;
  isConnected?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type ViewState = "LIBRARY" | "PLAYLIST_DETAIL" | "PLAYER";

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  channelTitle: string;
  position?: number;
}

export const YouTubeMusicDashboard: React.FC<YouTubeMusicDashboardProps> = ({
  onDisconnect,
  onPlay,
  isDisconnecting = false,
  isConnected = true,
}) => {
  // Contexto global do player
  const {
    activeService,
    isPlaying,
    currentTrack: contextCurrentTrack,
    position,
    duration,
    volume,
    playTrack,
    pause,
    resume,
    seek,
    setVolume,
    setIsSeeking,
    setIsAdjustingVolume,
    youtubePlayerRef,
  } = useMusicPlayer();

  // Estados de navegação
  const [view, setView] = useState<ViewState>("LIBRARY");
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<YouTubePlaylist | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Sincronização: Se já está tocando música ao abrir o widget, mostra o player
  const hasSyncedRef = useRef(false);
  const playlistLoadedRef = useRef<string | null>(null); // Para evitar múltiplas execuções
  const playerReadyCheckRef = useRef(false);

  // Verifica periodicamente se o player está pronto
  useEffect(() => {
    if (activeService !== "YOUTUBE") {
      playerReadyCheckRef.current = false;
      return;
    }

    const checkPlayerReady = () => {
      if (youtubePlayerRef.current) {
        try {
          // Verifica se o player tem os métodos necessários
          const hasMethods =
            typeof youtubePlayerRef.current.playVideo === "function" &&
            typeof youtubePlayerRef.current.pauseVideo === "function";

          if (hasMethods) {
            playerReadyCheckRef.current = true;
            return true;
          }
        } catch (error) {
          // Ignora erros
        }
      }
      return false;
    };

    // Verifica imediatamente
    if (checkPlayerReady()) {
      return;
    }

    // Se não estiver pronto, verifica periodicamente
    const interval = setInterval(() => {
      if (checkPlayerReady()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeService]);

  useEffect(() => {
    if (
      !hasSyncedRef.current &&
      activeService === "YOUTUBE" &&
      isPlaying &&
      contextCurrentTrack
    ) {
      setView("PLAYER");
      hasSyncedRef.current = true;
    }
  }, [activeService, isPlaying, contextCurrentTrack]);

  // Estados locais (apenas para UI)
  const [currentQueue, setCurrentQueue] = useState<YouTubeVideo[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar userProfile para verificar isGoogleConnected
  const { data: userProfile } = useQuery<any>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Desabilita queries quando desconectar
  useEffect(() => {
    if (!isConnected || !userProfile?.isGoogleConnected) {
      queryClient.cancelQueries({ queryKey: ["youtubePlaylists"] });
      queryClient.setQueryData(["youtubePlaylists"], []);
      queryClient.removeQueries({ queryKey: ["youtubePlaylists"] });
    }
  }, [isConnected, userProfile?.isGoogleConnected, queryClient]);

  // Buscar playlists
  const {
    data: playlists = [],
    isLoading: isLoadingPlaylists,
    error: playlistsError,
  } = useQuery<YouTubePlaylist[]>({
    queryKey: ["youtubePlaylists", isConnected],
    queryFn: async ({ signal }) => {
      if (!isConnected) return [];
      try {
        const { data } = await api.get("/media/youtube/playlists", { signal });
        return data;
      } catch (error: any) {
        if (
          error.name === "CanceledError" ||
          error.code === "ERR_CANCELED" ||
          !isConnected
        ) {
          return [];
        }
        throw error;
      }
    },
    enabled: isConnected && !!userProfile?.isGoogleConnected,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Buscar músicas da playlist
  const { data: playlistTracks, isLoading: isLoadingPlaylistTracks } =
    useQuery<{
      playlistId: string;
      items: YouTubeVideo[];
      total: number;
    }>({
      queryKey: ["youtubePlaylistItems", selectedPlaylist?.id],
      queryFn: async () => {
        if (!selectedPlaylist?.id) {
          return { playlistId: "", items: [], total: 0 };
        }
        const { data } = await api.get(
          `/media/youtube/playlist/${selectedPlaylist.id}/items`
        );
        return data;
      },
      enabled:
        !!selectedPlaylist?.id &&
        (view === "PLAYER" || view === "PLAYLIST_DETAIL"),
      retry: false,
    });

  // Busca global do YouTube
  const { data: searchResults = [], isLoading: isLoadingSearch } = useQuery<
    YouTubeVideo[]
  >({
    queryKey: ["youtubeSearch", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data } = await api.get(
        `/media/youtube/search?q=${encodeURIComponent(searchQuery)}`
      );
      return data;
    },
    enabled:
      showSearchResults &&
      !!searchQuery.trim() &&
      isConnected &&
      !!userProfile?.isGoogleConnected,
    retry: 1,
  });

  // Função auxiliar para verificar se o player está pronto
  const isPlayerReady = useCallback(() => {
    if (!youtubePlayerRef.current) {
      return false;
    }
    try {
      // Verifica se o player tem os métodos necessários
      const hasMethods = 
        typeof youtubePlayerRef.current.playVideo === "function" &&
        typeof youtubePlayerRef.current.pauseVideo === "function" &&
        typeof youtubePlayerRef.current.getPlayerState === "function";
      
      if (!hasMethods) {
        return false;
      }

      // Tenta obter o estado do player
      const playerState = youtubePlayerRef.current.getPlayerState?.();
      return playerState !== undefined && playerState !== null;
    } catch (error) {
      return false;
    }
  }, []);

  // Handlers usando o contexto global
  const handlePlayPause = () => {
    if (activeService !== "YOUTUBE") {
      return;
    }

    if (!youtubePlayerRef.current) {
      toast({
        title: "Player não pronto",
        description: "Aguarde o player carregar...",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    try {
      if (isPlaying) {
        pause();
      } else {
        resume();
        onPlay?.();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível controlar a reprodução.",
        variant: "destructive",
      });
    }
  };

  // Handler para busca (Enter)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowSearchResults(true);
    }
  };

  const handlePlaylistClick = (playlist: YouTubePlaylist) => {
    // Abre a visualização de detalhes (não toca)
    setSelectedPlaylist(playlist);
    setView("PLAYLIST_DETAIL");
  };

  const handlePlayPlaylist = (
    playlist: YouTubePlaylist,
    shuffle: boolean = false
  ) => {
    setSelectedPlaylist(playlist);
    setIsShuffled(shuffle);
    setView("PLAYER");
  };

  const handlePlayTrack = (video: YouTubeVideo) => {
    if (!video?.id || typeof video.id !== "string" || video.id.trim() === "") {
      toast({
        title: "Erro",
        description: "ID do vídeo inválido.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlaylist) {
      const allTracks = playlistTracks?.items || [];
      if (allTracks.length === 0) {
        toast({
          title: "Erro",
          description: "Lista de músicas vazia.",
          variant: "destructive",
        });
        return;
      }

      const trackIndex = allTracks.findIndex((v) => v.id === video.id);
      if (trackIndex !== -1) {
        setCurrentQueue(allTracks);
        setCurrentQueueIndex(trackIndex);
        setView("PLAYER");
      }
    } else {
      // Se não há playlist selecionada, cria uma fila com apenas esta música
      // Isso permite que os botões next/previous funcionem mesmo para músicas individuais
      setCurrentQueue([video]);
      setCurrentQueueIndex(0);
    }

    // Usa o contexto global para tocar
    playTrack("YOUTUBE", {
      id: video.id,
      title: video.title,
      artist: video.channelTitle || "Artista desconhecido",
      cover: video.thumbnail || undefined,
      duration: 0, // YouTube não retorna duração na busca, será atualizado pelo player
      service: "YOUTUBE",
    });
    setView("PLAYER");
    onPlay?.();
  };

  useEffect(() => {
    // Evita múltiplas execuções para a mesma playlist
    const playlistId = selectedPlaylist?.id || "none";
    if (
      view === "PLAYER" &&
      playlistTracks &&
      playlistTracks.items &&
      playlistTracks.items.length > 0 &&
      playlistLoadedRef.current !== playlistId
    ) {
      const tracks = isShuffled
        ? [...playlistTracks.items].sort(() => Math.random() - 0.5)
        : playlistTracks.items;

      // Prevenção de crash: verifica se há tracks antes de inicializar
      if (tracks.length === 0) {
        toast({
          title: "Playlist vazia",
          description: "Esta playlist não contém músicas.",
          variant: "destructive",
        });
        setView("PLAYLIST_DETAIL");
        return;
      }

      // Validação: verifica se todos os vídeos têm IDs válidos
      const validTracks = tracks.filter(
        (track) =>
          track?.id && typeof track.id === "string" && track.id.trim() !== ""
      );

      if (validTracks.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum vídeo válido encontrado na playlist.",
          variant: "destructive",
        });
        setView("PLAYLIST_DETAIL");
        return;
      }

      if (validTracks.length < tracks.length) {
        // Alguns vídeos inválidos foram removidos da fila
      }

      // Marca como carregado antes de atualizar o estado
      playlistLoadedRef.current = playlistId;
      setCurrentQueue(validTracks);
      setCurrentQueueIndex(0);
      const firstVideo = validTracks[0];

      // Usa o contexto global para tocar
      playTrack("YOUTUBE", {
        id: firstVideo.id,
        title: firstVideo.title,
        artist: firstVideo.channelTitle || "Artista desconhecido",
        cover: firstVideo.thumbnail || undefined,
        duration: 0,
        service: "YOUTUBE",
      });
      onPlay?.();
    }
  }, [
    view,
    playlistTracks,
    isShuffled,
    selectedPlaylist?.id,
    playTrack,
    onPlay,
  ]);

  // Reset do ref quando a playlist muda
  useEffect(() => {
    if (!selectedPlaylist) {
      playlistLoadedRef.current = null;
    }
  }, [selectedPlaylist]);

  const handleNext = () => {
    if (activeService !== "YOUTUBE") {
      return;
    }

    if (!youtubePlayerRef.current) {
      toast({
        title: "Player não pronto",
        description: "Aguarde o player carregar...",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    if (currentQueue.length === 0) {
      toast({
        title: "Fila vazia",
        description: "Não há mais músicas na fila.",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    if (currentQueueIndex >= currentQueue.length - 1) {
      if (repeatMode === "all") {
        const firstVideo = currentQueue[0];
        if (
          firstVideo?.id &&
          typeof firstVideo.id === "string" &&
          firstVideo.id.trim() !== ""
        ) {
          setCurrentQueueIndex(0);
          playTrack("YOUTUBE", {
            id: firstVideo.id,
            title: firstVideo.title,
            artist: firstVideo.channelTitle || "Artista desconhecido",
            cover: firstVideo.thumbnail || undefined,
            duration: 0,
            service: "YOUTUBE",
          });
        }
      }
      return;
    }

    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= currentQueue.length) return;

    const nextVideo = currentQueue[nextIndex];
    if (
      !nextVideo?.id ||
      typeof nextVideo.id !== "string" ||
      nextVideo.id.trim() === ""
    ) {
      if (nextIndex + 1 < currentQueue.length) {
        setCurrentQueueIndex(nextIndex + 1);
        handleNext();
      }
      return;
    }

    setCurrentQueueIndex(nextIndex);
    playTrack("YOUTUBE", {
      id: nextVideo.id,
      title: nextVideo.title,
      artist: nextVideo.channelTitle || "Artista desconhecido",
      cover: nextVideo.thumbnail || undefined,
      duration: 0,
      service: "YOUTUBE",
    });
  };

  const handlePrevious = () => {
    if (activeService !== "YOUTUBE") {
      return;
    }

    if (!youtubePlayerRef.current) {
      toast({
        title: "Player não pronto",
        description: "Aguarde o player carregar...",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    if (currentQueue.length === 0) {
      toast({
        title: "Fila vazia",
        description: "Não há músicas na fila.",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    // Se estiver nos primeiros 3 segundos, volta para o início da música atual
    // Caso contrário, vai para a música anterior
    if (position > 3) {
      // Volta para o início da música atual
      seek(0);
      return;
    }

    if (currentQueueIndex <= 0) {
      // Se estiver na primeira música e repeatMode é "all", vai para a última
      if (repeatMode === "all" && currentQueue.length > 0) {
        const lastVideo = currentQueue[currentQueue.length - 1];
        if (
          lastVideo?.id &&
          typeof lastVideo.id === "string" &&
          lastVideo.id.trim() !== ""
        ) {
          setCurrentQueueIndex(currentQueue.length - 1);
          playTrack("YOUTUBE", {
            id: lastVideo.id,
            title: lastVideo.title,
            artist: lastVideo.channelTitle || "Artista desconhecido",
            cover: lastVideo.thumbnail || undefined,
            duration: 0,
            service: "YOUTUBE",
          });
        }
      }
      return;
    }

    const prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0 || prevIndex >= currentQueue.length) return;

    const prevVideo = currentQueue[prevIndex];
    if (
      !prevVideo?.id ||
      typeof prevVideo.id !== "string" ||
      prevVideo.id.trim() === ""
    ) {
      return;
    }

    setCurrentQueueIndex(prevIndex);
    playTrack("YOUTUBE", {
      id: prevVideo.id,
      title: prevVideo.title,
      artist: prevVideo.channelTitle || "Artista desconhecido",
      cover: prevVideo.thumbnail || undefined,
      duration: 0,
      service: "YOUTUBE",
    });
  };

  const handleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const handleRepeat = () => {
    const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  const handlePlaybackError = (errorCode: number) => {
    const errorMessages: { [key: number]: string } = {
      2: "Parâmetro inválido",
      5: "Conteúdo não pode ser reproduzido em players HTML5",
      100: "Vídeo não encontrado",
      101: "Reprodução em players incorporados não permitida",
      150: "Reprodução em players incorporados não permitida",
    };

    const errorMessage =
      errorMessages[errorCode] || `Erro desconhecido (código: ${errorCode})`;

    // Erros que indicam que o vídeo não pode ser reproduzido: pula para o próximo
    if (errorCode === 101 || errorCode === 150 || errorCode === 100) {
      toast({
        title: "Vídeo não disponível",
        description: "Pulando para o próximo...",
        variant: "default",
        duration: 2000,
      });
      // Usa setTimeout para evitar problemas de estado durante o erro
      setTimeout(() => {
        handleNext();
      }, 500);
      return;
    }

    toast({
      title: "Erro ao reproduzir",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handleVideoEnded = useCallback(() => {
    if (activeService !== "YOUTUBE" || !youtubePlayerRef.current) return;

    // Modo Repeat One: repete o mesmo vídeo
    if (repeatMode === "one" && contextCurrentTrack) {
      playTrack("YOUTUBE", contextCurrentTrack);
      return;
    }

    if (currentQueue.length === 0) return;
    if (currentQueueIndex < 0 || currentQueueIndex >= currentQueue.length)
      return;

    // Avança para o próximo vídeo se não estiver no último
    if (currentQueueIndex < currentQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      if (nextIndex >= currentQueue.length) return;

      const nextVideo = currentQueue[nextIndex];
      if (
        !nextVideo?.id ||
        typeof nextVideo.id !== "string" ||
        nextVideo.id.trim() === ""
      ) {
        if (nextIndex + 1 < currentQueue.length) {
          setCurrentQueueIndex(nextIndex + 1);
          // Chama handleNext recursivamente
          const skipVideo = currentQueue[nextIndex + 1];
          if (
            skipVideo?.id &&
            typeof skipVideo.id === "string" &&
            skipVideo.id.trim() !== ""
          ) {
            setCurrentQueueIndex(nextIndex + 1);
            playTrack("YOUTUBE", {
              id: skipVideo.id,
              title: skipVideo.title,
              artist: skipVideo.channelTitle || "Artista desconhecido",
              cover: skipVideo.thumbnail || undefined,
              duration: 0,
              service: "YOUTUBE",
            });
          }
        }
        return;
      }

      setCurrentQueueIndex(nextIndex);
      playTrack("YOUTUBE", {
        id: nextVideo.id,
        title: nextVideo.title,
        artist: nextVideo.channelTitle || "Artista desconhecido",
        cover: nextVideo.thumbnail || undefined,
        duration: 0,
        service: "YOUTUBE",
      });
    } else if (repeatMode === "all") {
      // Modo Repeat All: volta ao início
      const firstVideo = currentQueue[0];
      if (
        !firstVideo?.id ||
        typeof firstVideo.id !== "string" ||
        firstVideo.id.trim() === ""
      ) {
        return;
      }

      setCurrentQueueIndex(0);
      playTrack("YOUTUBE", {
        id: firstVideo.id,
        title: firstVideo.title,
        artist: firstVideo.channelTitle || "Artista desconhecido",
        cover: firstVideo.thumbnail || undefined,
        duration: 0,
        service: "YOUTUBE",
      });
    }
  }, [
    activeService,
    youtubePlayerRef,
    repeatMode,
    contextCurrentTrack,
    currentQueue,
    currentQueueIndex,
    playTrack,
  ]);

  // Detecta quando o vídeo termina através do contexto
  const prevIsPlayingRef = useRef(isPlaying);
  useEffect(() => {
    // Detecta transição de playing -> not playing quando o vídeo termina
    if (prevIsPlayingRef.current && !isPlaying && activeService === "YOUTUBE") {
      // Verifica se realmente terminou (não apenas pausou)
      if (youtubePlayerRef.current) {
        try {
          const playerState = youtubePlayerRef.current.getPlayerState?.();
          if (playerState === window.YT?.PlayerState?.ENDED) {
            handleVideoEnded();
          }
        } catch (error) {
          // Ignora erros
        }
      }
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, activeService, handleVideoEnded]);

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#030303] text-white relative overflow-hidden box-border">
      {view === "LIBRARY" && (
        <>
          {/* Header Compacto */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">
                Sua Biblioteca
              </h2>
              <div className="flex items-center gap-1">
                {onDisconnect && (
                  <button
                    onClick={onDisconnect}
                    disabled={isDisconnecting}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400"
                    title="Desconectar YouTube Music"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setShowSearchResults(false);
                      setSearchQuery("");
                    }
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Search className="h-4 w-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Search Bar (condicional) */}
            {showSearch && (
              <div className="mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      setShowSearchResults(true);
                    } else {
                      setShowSearchResults(false);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar músicas..."
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
                />
              </div>
            )}
          </div>

          {/* Mini Player (se está tocando música) */}
          {activeService === "YOUTUBE" && contextCurrentTrack && (
            <div
              onClick={() => setView("PLAYER")}
              className="mx-3 mb-2 bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-colors border border-white/10"
            >
              {contextCurrentTrack.cover ? (
                <img
                  src={contextCurrentTrack.cover}
                  alt={contextCurrentTrack.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-[#FF0000]/20 flex items-center justify-center flex-shrink-0">
                  <img
                    src={musicIcon}
                    alt="YouTube Music"
                    className="w-5 h-5 opacity-60"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {contextCurrentTrack.title}
                </p>
                <p className="text-[10px] text-white/60 truncate">
                  {contextCurrentTrack.artist}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" fill="currentColor" />
                ) : (
                  <Play
                    className="h-4 w-4 text-white ml-0.5"
                    fill="currentColor"
                  />
                )}
              </button>
            </div>
          )}

          {/* Lista de Playlists ou Resultados da Busca - Scrollable */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0 scrollbar-hide">
            {showSearchResults && searchQuery.trim() ? (
              isLoadingSearch ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-white/5 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : (searchResults as YouTubeVideo[]).length > 0 ? (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-white/70 mb-2">
                    Resultados da Busca
                  </h3>
                  {(searchResults as YouTubeVideo[]).map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        handlePlayTrack(video);
                        setShowSearchResults(false);
                        setSearchQuery("");
                        setShowSearch(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                    >
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#FF0000]/20 flex items-center justify-center flex-shrink-0">
                          <img
                            src={musicIcon}
                            alt="YouTube Music"
                            className="w-5 h-5 opacity-60"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {video.title}
                        </p>
                        <p className="text-[10px] text-white/60 truncate">
                          {video.channelTitle}
                        </p>
                      </div>
                      <Play className="h-4 w-4 text-white/40 group-hover:text-white/70 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/50 text-xs">
                  Nenhum resultado encontrado
                </div>
              )
            ) : playlistsError ? (
              <div className="text-center py-6 px-2">
                <p className="text-xs text-red-400 mb-2">Erro ao carregar</p>
                {onDisconnect && (
                  <button
                    onClick={onDisconnect}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Reconectar
                  </button>
                )}
              </div>
            ) : isLoadingPlaylists ? (
              <div className="text-center py-6 text-white/50 text-xs">
                Carregando...
              </div>
            ) : (playlists as YouTubePlaylist[]).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {(playlists as YouTubePlaylist[])
                  .filter((p) =>
                    searchQuery
                      ? p.title
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handlePlaylistClick(playlist)}
                      className="group bg-white/5 hover:bg-white/10 rounded-lg p-2 transition-colors text-left"
                    >
                      {playlist.thumbnail ? (
                        <img
                          src={playlist.thumbnail}
                          alt={playlist.title}
                          className="w-full aspect-square rounded-lg object-cover mb-1.5"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-[#FF0000]/20 flex items-center justify-center mb-1.5">
                          <img
                            src={musicIcon}
                            alt="YouTube Music"
                            className="w-8 h-8 opacity-60"
                          />
                        </div>
                      )}
                      <p className="text-xs font-medium text-white truncate mb-0.5">
                        {playlist.title}
                      </p>
                      <p className="text-[10px] text-white/60 truncate">
                        {playlist.itemCount} músicas
                      </p>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 px-2">
                <p className="text-xs text-white/50 mb-1">Nenhuma playlist</p>
                <p className="text-[10px] text-white/40">
                  Crie um canal do YouTube primeiro
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {view === "PLAYLIST_DETAIL" && selectedPlaylist && (
        <>
          {/* Header com Voltar */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                setView("LIBRARY");
                setSelectedPlaylist(null);
              }}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
            <p className="text-xs text-white/70 font-medium truncate flex-1">
              {selectedPlaylist.title}
            </p>
          </div>

          {/* Conteúdo da Playlist */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            {/* Topo: Capa, Título, Descrição */}
            <div className="px-3 pt-4 pb-3">
              <div className="flex gap-3 mb-3">
                {selectedPlaylist.thumbnail ? (
                  <img
                    src={selectedPlaylist.thumbnail}
                    alt={selectedPlaylist.title}
                    className="w-20 h-20 max-w-full rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-[#FF0000]/20 flex items-center justify-center flex-shrink-0">
                    <img
                      src={musicIcon}
                      alt="YouTube Music"
                      className="w-10 h-10 opacity-60"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate mb-1">
                    {selectedPlaylist.title}
                  </h3>
                  {selectedPlaylist.description && (
                    <p className="text-xs text-white/60 line-clamp-2 mb-1">
                      {selectedPlaylist.description}
                    </p>
                  )}
                  <p className="text-[10px] text-white/50">
                    {selectedPlaylist.itemCount} músicas
                  </p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 max-w-full">
                <button
                  onClick={() => handlePlayPlaylist(selectedPlaylist, false)}
                  className="flex-1 min-w-0 bg-[#FF0000] hover:bg-[#FF3333] text-white text-xs font-medium py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Tocar</span>
                </button>
                <button
                  onClick={() => handlePlayPlaylist(selectedPlaylist, true)}
                  className="flex-1 min-w-0 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <Shuffle className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Aleatório</span>
                </button>
              </div>
            </div>

            {/* Lista de Músicas */}
            <div className="px-3 pb-3">
              <h4 className="text-xs font-semibold text-white/70 mb-2">
                Músicas
              </h4>
              {isLoadingPlaylistTracks ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-white/5 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : playlistTracks?.items && playlistTracks.items.length > 0 ? (
                <div className="space-y-1">
                  {playlistTracks.items.map((video, index) => (
                    <button
                      key={video.id}
                      onClick={() => handlePlayTrack(video)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                    >
                      <span className="text-[10px] text-white/40 w-4 flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {video.title}
                        </p>
                        <p className="text-[10px] text-white/60 truncate">
                          {video.channelTitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/50 text-xs">
                  Nenhuma música encontrada
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === "PLAYER" && contextCurrentTrack && (
        <>
          {/* Header de Navegação */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0 flex items-center justify-between">
            <button
              onClick={() => {
                if (selectedPlaylist) {
                  setView("PLAYLIST_DETAIL");
                } else {
                  setView("LIBRARY");
                  setSelectedPlaylist(null);
                  setCurrentQueue([]);
                }
              }}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
            <p className="text-xs text-white/50 font-medium">Tocando Agora</p>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="h-4 w-4 text-white/70" />
            </button>
          </div>

          {/* Área Central - Capa e Info */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 min-h-0 overflow-hidden">
            {contextCurrentTrack.cover ? (
              <img
                src={contextCurrentTrack.cover}
                alt={contextCurrentTrack.title}
                className="w-40 h-40 max-w-full rounded-xl object-cover shadow-2xl mb-3 flex-shrink-0"
              />
            ) : (
              <div className="w-40 h-40 rounded-xl bg-[#FF0000]/20 flex items-center justify-center shadow-2xl mb-3 flex-shrink-0">
                <img
                  src={musicIcon}
                  alt="YouTube Music"
                  className="w-14 h-14 opacity-60"
                />
              </div>
            )}

            <div className="w-full text-center mb-4 flex-shrink-0">
              <p className="text-sm font-medium text-white truncate mb-1">
                {contextCurrentTrack.title || "YouTube Music"}
              </p>
              <p className="text-xs text-white/60 truncate">
                {contextCurrentTrack.artist || "YouTube"}
              </p>
            </div>

            {/* Barra de Progresso (SeekBar) */}
            <div className="w-full px-4 mb-3 flex-shrink-0">
              <SeekBar
                value={(position / duration) * 100}
                duration={duration}
                currentTime={position}
                onChange={seek}
                accentColor="#FF0000"
                onDragStart={() => setIsSeeking(true)}
                onDragEnd={() => setIsSeeking(false)}
                disabled={
                  activeService !== "YOUTUBE" || !youtubePlayerRef.current
                }
              />
            </div>

            {/* Controles Principais */}
            <div className="flex items-center justify-center gap-3 mb-3 flex-shrink-0">
              <button
                onClick={handleShuffle}
                disabled={activeService !== "YOUTUBE"}
                className={`p-2 transition-colors ${
                  isShuffled
                    ? "text-[#FF0000]"
                    : "text-white/70 hover:text-white"
                } disabled:opacity-50`}
              >
                <Shuffle className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handlePrevious}
                disabled={activeService !== "YOUTUBE"}
                className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipBack className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={activeService !== "YOUTUBE"}
                className="w-12 h-12 rounded-full bg-[#FF0000] hover:bg-[#FF3333] disabled:opacity-50 transition-all flex items-center justify-center text-white shadow-lg shadow-[#FF0000]/30"
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
                disabled={activeService !== "YOUTUBE"}
                className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipForward className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handleRepeat}
                disabled={activeService !== "YOUTUBE"}
                className={`p-2 transition-colors ${
                  repeatMode !== "off"
                    ? "text-[#FF0000]"
                    : "text-white/70 hover:text-white"
                } disabled:opacity-50`}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Repeat className="h-5 w-5" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Volume Control */}
            <div className="w-full px-4 flex items-center justify-center gap-2 flex-shrink-0 pb-2">
              <VolumeSlider
                value={volume}
                onChange={setVolume}
                accentColor="#FF0000"
                onDragStart={() => setIsAdjustingVolume(true)}
                onDragEnd={(finalValue) => {
                  setIsAdjustingVolume(false);
                  setVolume(finalValue, true);
                }}
                disabled={activeService !== "YOUTUBE"}
                className="w-32"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
