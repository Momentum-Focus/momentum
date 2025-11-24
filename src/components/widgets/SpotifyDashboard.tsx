import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronLeft,
  Search,
  Plus,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SpotifyUrlInput } from "./SpotifyUrlInput";
import { useMusicPlayer } from "@/context/music-player-context";
import { SeekBar } from "@/components/ui/SeekBar";
import { VolumeSlider } from "@/components/ui/VolumeSlider";
import spotifyIcon from "@/assets/icon-spotify.png";

interface SpotifyDashboardProps {
  onDisconnect?: () => void;
  onPlay?: () => void;
  isDisconnecting?: boolean;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

type ViewState = "LIBRARY" | "PLAYLIST_DETAIL" | "PLAYER_FOCUS";

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  image: string | null;
  tracksCount: number;
  owner: string;
  uri: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
  uri: string;
  duration: number;
}

export const SpotifyDashboard: React.FC<SpotifyDashboardProps> = ({
  onDisconnect,
  onPlay,
  isDisconnecting = false,
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
    playSpotify,
    pause,
    resume,
    seek,
    setVolume,
    setIsSeeking,
    setIsAdjustingVolume,
    spotifyPlayerRef,
    spotifyDeviceId,
    isSpotifyReady,
  } = useMusicPlayer();

  // Estados de navegação
  const [view, setView] = useState<ViewState>("LIBRARY");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<SpotifyPlaylist | null>(
    null
  );

  // Sincronização: Se já está tocando música ao abrir o widget, mostra o player
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (
      !hasSyncedRef.current &&
      activeService === "SPOTIFY" &&
      isPlaying &&
      contextCurrentTrack
    ) {
      setView("PLAYER_FOCUS");
      hasSyncedRef.current = true;
    }
  }, [activeService, isPlaying, contextCurrentTrack]);

  // Estados locais (apenas para UI)
  const [isShuffling, setIsShuffling] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "context" | "track">(
    "off"
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar status do Spotify (isConnected, isPremium)
  const { data: spotifyStatus } = useQuery<{
    isConnected: boolean;
    isPremium: boolean;
  }>({
    queryKey: ["spotifyStatus"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/status");
      return data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Buscar perfil do usuário
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data } = await api.get("/user");
      return data;
    },
    retry: 1,
  });

  const isPremium =
    spotifyStatus?.isPremium === true ||
    userProfile?.spotifyProduct === "premium";
  const isFree = !isPremium && spotifyStatus?.isConnected === true;

  // Buscar access token - só se for Premium e conectado
  const {
    data: spotifyToken,
    error: tokenError,
    isError: isTokenError,
  } = useQuery({
    queryKey: ["spotifyToken"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/token");
      return data.accessToken;
    },
    enabled: spotifyStatus?.isConnected === true && isPremium,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 3600000,
    staleTime: 3300000,
  });

  // Trata erros do token
  useEffect(() => {
    if (tokenError && (tokenError as any)?.response?.status === 400) {
      toast({
        title: "Token inválido",
        description: "Por favor, reconecte sua conta do Spotify.",
        variant: "destructive",
      });
    }
  }, [tokenError, toast]);

  // Buscar playlists
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useQuery<
    SpotifyPlaylist[]
  >({
    queryKey: ["spotifyPlaylists"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/playlists");
      return data;
    },
    enabled:
      spotifyStatus?.isConnected === true && !!spotifyToken && !isTokenError,
    retry: 1,
  });

  // Buscar músicas salvas
  const { data: savedTracks = [], isLoading: isLoadingTracks } = useQuery<
    SpotifyTrack[]
  >({
    queryKey: ["spotifySavedTracks"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/saved-tracks?limit=50");
      return data;
    },
    enabled:
      spotifyStatus?.isConnected === true && !!spotifyToken && !isTokenError,
    retry: 1,
  });

  const focusPlaylistId = userProfile?.spotifyFocusPlaylistUri
    ? userProfile.spotifyFocusPlaylistUri.replace("spotify:playlist:", "")
    : null;

  // Buscar informações da playlist de foco
  const { data: focusPlaylistInfo } = useQuery({
    queryKey: ["spotifyFocusPlaylist", focusPlaylistId],
    queryFn: async () => {
      if (!focusPlaylistId) return null;
      const { data } = await api.get(
        `/media/spotify/playlist/preview?playlistId=${focusPlaylistId}`
      );
      return data;
    },
    enabled: !!focusPlaylistId && !!spotifyToken && !isTokenError,
    retry: 1,
  });

  // Busca global do Spotify
  const { data: searchResults = [], isLoading: isLoadingSearch } = useQuery<
    SpotifyTrack[]
  >({
    queryKey: ["spotifySearch", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data } = await api.get(
        `/media/spotify/search?q=${encodeURIComponent(searchQuery)}`
      );
      return data;
    },
    enabled:
      showSearchResults &&
      !!searchQuery.trim() &&
      !!spotifyToken &&
      !isTokenError,
    retry: 1,
  });

  // Handlers usando o contexto global
  const handlePlayPause = () => {
    if (activeService !== "SPOTIFY") return;
    if (isPlaying) {
      pause();
    } else {
      resume();
      onPlay?.();
    }
  };

  const handleNext = async () => {
    if (!spotifyPlayerRef.current || activeService !== "SPOTIFY") return;
    try {
      await spotifyPlayerRef.current.nextTrack();
    } catch (error) {
      console.error("Erro ao avançar:", error);
    }
  };

  const handlePrevious = async () => {
    if (!spotifyPlayerRef.current || activeService !== "SPOTIFY") return;
    try {
      await spotifyPlayerRef.current.previousTrack();
    } catch (error) {
      console.error("Erro ao voltar:", error);
    }
  };

  const handleShuffle = async () => {
    if (!spotifyDeviceId || activeService !== "SPOTIFY") return;

    const newShuffleState = !isShuffling;

    try {
      // Busca o token do Spotify via API do backend
      const tokenResponse = await api.get("/media/spotify/token");
      const accessToken = tokenResponse.data.accessToken;

      if (!accessToken) {
        throw new Error("Não foi possível obter token do Spotify.");
      }

      // Chama a API REST do Spotify para alternar shuffle
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${newShuffleState}&device_id=${spotifyDeviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok || response.status === 204) {
        setIsShuffling(newShuffleState);
      } else {
        throw new Error("Falha ao alternar shuffle");
      }
    } catch (error) {
      console.error("Erro ao alternar shuffle:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alternar o modo aleatório.",
        variant: "destructive",
      });
    }
  };

  const handleRepeat = async () => {
    if (!spotifyDeviceId || activeService !== "SPOTIFY") return;

    const modes: Array<"off" | "context" | "track"> = [
      "off",
      "context",
      "track",
    ];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    try {
      // Busca o token do Spotify via API do backend
      const tokenResponse = await api.get("/media/spotify/token");
      const accessToken = tokenResponse.data.accessToken;

      if (!accessToken) {
        throw new Error("Não foi possível obter token do Spotify.");
      }

      // Chama a API REST do Spotify para alternar repeat
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${nextMode}&device_id=${spotifyDeviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok || response.status === 204) {
        setRepeatMode(nextMode);
      } else {
        throw new Error("Falha ao alternar repeat");
      }
    } catch (error) {
      console.error("Erro ao alternar repeat:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alternar o modo de repetição.",
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

  // Buscar tracks de uma playlist específica
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );
  const { data: playlistTracks, isLoading: isLoadingPlaylistTracks } =
    useQuery<{
      items: SpotifyTrack[];
      total: number;
    }>({
      queryKey: ["spotifyPlaylistTracks", selectedPlaylistId],
      queryFn: async () => {
        if (!selectedPlaylistId) return { items: [], total: 0 };
        const { data } = await api.get(
          `/media/spotify/playlist/${selectedPlaylistId}/tracks?limit=100`
        );
        return data;
      },
      enabled: !!selectedPlaylistId && !!spotifyToken && !isTokenError,
      retry: 1,
    });

  const handlePlaylistClick = (playlist: SpotifyPlaylist) => {
    // Abre a visualização de detalhes (não toca)
    setActivePlaylist(playlist);
    setSelectedPlaylistId(playlist.id);
    setView("PLAYLIST_DETAIL");
  };

  const handlePlayPlaylist = async (
    playlist: SpotifyPlaylist,
    shuffle: boolean = false
  ) => {
    if (isFree) {
      const trackId = playlist.uri.replace("spotify:playlist:", "");
      const deepLink = `spotify:playlist:${trackId}`;
      toast({
        title: "Modo Gratuito",
        description: "Abrindo no seu App...",
      });
      window.location.href = deepLink;
      return;
    }

    // Verifica se o player está pronto (só precisa do deviceId)
    if (!isSpotifyReady || !spotifyDeviceId) {
      toast({
        title: "Conectando ao Spotify...",
        description: "Aguarde o player inicializar completamente.",
        variant: "default",
      });
      return;
    }

    try {
      // Usa a função playSpotify do contexto (usa API REST)
      await playSpotify(playlist.uri, { shuffle });

      if (shuffle) {
        setIsShuffling(true);
      }

      setView("PLAYER_FOCUS");
      onPlay?.();
    } catch (error: any) {
      console.error("[SpotifyDashboard] Erro ao reproduzir playlist:", error);
      toast({
        title: "Falha ao iniciar reprodução",
        description: error.message || "Não foi possível reproduzir.",
        variant: "destructive",
      });
    }
  };

  const handlePlayTrack = async (track: SpotifyTrack) => {
    if (isFree) {
      const trackId = track.uri.replace("spotify:track:", "");
      const deepLink = `spotify:track:${trackId}`;
      toast({
        title: "Modo Gratuito",
        description: "Abrindo no seu App...",
      });
      window.location.href = deepLink;
      return;
    }

    // Verifica se o player está pronto (só precisa do deviceId)
    if (!isSpotifyReady || !spotifyDeviceId) {
      toast({
        title: "Conectando ao Spotify...",
        description: "Aguarde o player inicializar completamente.",
        variant: "default",
      });
      return;
    }

    try {
      // Usa a função playSpotify do contexto (usa API REST)
      await playSpotify(track.uri);

      // Atualiza o contexto global para sincronizar a UI (track info)
      playTrack("SPOTIFY", {
        id: track.id,
        title: track.name,
        artist: track.artist,
        cover: track.image || undefined,
        duration: track.duration / 1000, // converte ms para segundos
        uri: track.uri,
        service: "SPOTIFY",
      });

      setView("PLAYER_FOCUS");
      onPlay?.();
    } catch (error: any) {
      console.error("[SpotifyDashboard] Erro ao reproduzir track:", error);
      toast({
        title: "Falha ao iniciar reprodução",
        description: error.message || "Não foi possível reproduzir.",
        variant: "destructive",
      });
    }
  };

  // Se for Free, mostra apenas biblioteca com aviso elegante
  if (isFree && view === "LIBRARY") {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-[#121212] text-white relative overflow-hidden box-border">
        {/* Card Informativo Free */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2.5 mb-2">
            <p className="text-xs font-semibold text-yellow-400 mb-1">
              Modo Gratuito
            </p>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Visualize sua biblioteca. Para reproduzir, abra no app.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="px-3 pb-2 flex-shrink-0 relative">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">Biblioteca</h2>
            <div className="flex items-center gap-1">
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  disabled={isDisconnecting}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400"
                  title="Desconectar Spotify"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowUrlInput(true)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title="Adicionar playlist"
              >
                <Plus className="h-4 w-4 text-white/70" />
              </button>
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
          {showSearch && (
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
          )}
        </div>

        {/* Lista de Playlists */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
          {isLoadingPlaylists ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (playlists as SpotifyPlaylist[]).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {(playlists as SpotifyPlaylist[])
                .filter((p) =>
                  searchQuery
                    ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    : true
                )
                .map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlaylistClick(playlist)}
                    className="group bg-white/5 hover:bg-white/10 rounded-lg p-2 transition-colors text-left"
                  >
                    {playlist.image ? (
                      <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-full aspect-square rounded-md object-cover mb-1.5"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-md bg-[#1DB954]/20 flex items-center justify-center mb-1.5">
                        <img
                          src={spotifyIcon}
                          alt="Spotify"
                          className="w-8 h-8 opacity-60"
                        />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white truncate mb-0.5">
                      {playlist.name}
                    </p>
                    <p className="text-[10px] text-white/60 truncate">
                      {playlist.tracksCount} músicas
                    </p>
                  </button>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50 text-xs">
              Nenhuma playlist encontrada
            </div>
          )}
        </div>

        {showUrlInput && (
          <SpotifyUrlInput
            onClose={() => setShowUrlInput(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }}
          />
        )}
      </div>
    );
  }

  // Visualização: BIBLIOTECA (Premium)
  if (view === "LIBRARY") {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-[#121212] text-white relative overflow-hidden box-border">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 relative">
          {/* Indicador de Conectando */}
          {!isFree && !isSpotifyReady && (
            <div className="mb-2 bg-blue-500/10 border border-blue-500/30 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-blue-400">
                  Conectando ao Spotify...
                </p>
              </div>
              <p className="text-[10px] text-white/60 mt-1">
                Aguarde o player inicializar completamente.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">Biblioteca</h2>
            <div className="flex items-center gap-1">
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  disabled={isDisconnecting}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400"
                  title="Desconectar Spotify"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowUrlInput(true)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title="Adicionar playlist"
              >
                <Plus className="h-4 w-4 text-white/70" />
              </button>
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
          {showSearch && (
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
          )}
        </div>

        {/* Mini Player (se está tocando música) */}
        {activeService === "SPOTIFY" && contextCurrentTrack && (
          <div
            onClick={() => setView("PLAYER_FOCUS")}
            className="mx-3 mb-2 bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-colors border border-white/10"
          >
            {contextCurrentTrack.cover ? (
              <img
                src={contextCurrentTrack.cover}
                alt={contextCurrentTrack.title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                <img
                  src={spotifyIcon}
                  alt="Spotify"
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

        {/* Lista de Playlists ou Resultados da Busca */}
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
            ) : (searchResults as SpotifyTrack[]).length > 0 ? (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-white/70 mb-2">
                  Resultados da Busca
                </h3>
                {(searchResults as SpotifyTrack[]).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      handlePlayTrack(track);
                      setShowSearchResults(false);
                      setSearchQuery("");
                      setShowSearch(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                  >
                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.name}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                        <img
                          src={spotifyIcon}
                          alt="Spotify"
                          className="w-5 h-5 opacity-60"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {track.name}
                      </p>
                      <p className="text-[10px] text-white/60 truncate">
                        {track.artist}
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
          ) : isLoadingPlaylists ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (playlists as SpotifyPlaylist[]).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {(playlists as SpotifyPlaylist[])
                .filter((p) =>
                  searchQuery
                    ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    : true
                )
                .map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlaylistClick(playlist)}
                    className="group bg-white/5 hover:bg-white/10 rounded-lg p-2 transition-colors text-left"
                  >
                    {playlist.image ? (
                      <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-full aspect-square rounded-md object-cover mb-1.5"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-md bg-[#1DB954]/20 flex items-center justify-center mb-1.5">
                        <img
                          src={spotifyIcon}
                          alt="Spotify"
                          className="w-8 h-8 opacity-60"
                        />
                      </div>
                    )}
                    <p className="text-xs font-medium text-white truncate mb-0.5">
                      {playlist.name}
                    </p>
                    <p className="text-[10px] text-white/60 truncate">
                      {playlist.tracksCount} músicas
                    </p>
                  </button>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50 text-xs">
              Nenhuma playlist encontrada
            </div>
          )}
        </div>

        {showUrlInput && (
          <SpotifyUrlInput
            onClose={() => setShowUrlInput(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }}
          />
        )}
      </div>
    );
  }

  // Visualização: DETALHES DA PLAYLIST
  if (view === "PLAYLIST_DETAIL" && activePlaylist) {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-[#121212] text-white relative overflow-hidden box-border">
        {/* Header com Voltar */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => {
              setView("LIBRARY");
              setActivePlaylist(null);
              setSelectedPlaylistId(null);
            }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-white/70" />
          </button>
          <p className="text-xs text-white/70 font-medium truncate flex-1">
            {activePlaylist.name}
          </p>
        </div>

        {/* Conteúdo da Playlist */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          {/* Topo: Capa, Título, Descrição */}
          <div className="px-3 pt-4 pb-3">
            <div className="flex gap-3 mb-3">
              {activePlaylist.image ? (
                <img
                  src={activePlaylist.image}
                  alt={activePlaylist.name}
                  className="w-20 h-20 max-w-full rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                  <img
                    src={spotifyIcon}
                    alt="Spotify"
                    className="w-10 h-10 opacity-60"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate mb-1">
                  {activePlaylist.name}
                </h3>
                {activePlaylist.description && (
                  <p className="text-xs text-white/60 line-clamp-2 mb-1">
                    {activePlaylist.description}
                  </p>
                )}
                <p className="text-[10px] text-white/50">
                  {activePlaylist.tracksCount} músicas
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 max-w-full">
              <button
                onClick={() => handlePlayPlaylist(activePlaylist, false)}
                disabled={
                  isFree || !spotifyToken || !isSpotifyReady || !spotifyDeviceId
                }
                className="flex-1 min-w-0 bg-[#1DB954] hover:bg-[#1ed760] text-white text-xs font-medium py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Tocar</span>
              </button>
              <button
                onClick={() => handlePlayPlaylist(activePlaylist, true)}
                disabled={
                  isFree || !spotifyToken || !isSpotifyReady || !spotifyDeviceId
                }
                className="flex-1 min-w-0 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                {playlistTracks.items.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                  >
                    <span className="text-[10px] text-white/40 w-4 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {track.name}
                      </p>
                      <p className="text-[10px] text-white/60 truncate">
                        {track.artist}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/40 flex-shrink-0">
                      {Math.floor(track.duration / 60000)}:
                      {String(
                        Math.floor((track.duration % 60000) / 1000)
                      ).padStart(2, "0")}
                    </span>
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
      </div>
    );
  }

  // Visualização: PLAYER DE FOCO
  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#121212] text-white relative overflow-hidden box-border">
      {/* Header com Voltar */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 flex items-center gap-2">
        <button
          onClick={() => {
            // Volta para detalhes se tinha playlist, senão volta para biblioteca
            if (activePlaylist && view === "PLAYER_FOCUS") {
              setView("PLAYLIST_DETAIL");
            } else {
              setView("LIBRARY");
              setActivePlaylist(null);
              setSelectedPlaylistId(null);
            }
          }}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-white/70" />
        </button>
        <p className="text-xs text-white/70 font-medium truncate flex-1">
          {activePlaylist?.name || "Tocando Agora"}
        </p>
      </div>

      {/* Área Central */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 min-h-0 overflow-hidden">
        {/* Capa do Álbum */}
        {contextCurrentTrack?.cover ? (
          <img
            src={contextCurrentTrack.cover}
            alt={contextCurrentTrack.title}
            className="w-40 h-40 max-w-full rounded-xl object-cover shadow-2xl mb-3 flex-shrink-0"
          />
        ) : (
          <div className="w-40 h-40 rounded-xl bg-[#1DB954]/20 flex items-center justify-center shadow-2xl mb-3 flex-shrink-0">
            <img
              src={spotifyIcon}
              alt="Spotify"
              className="w-14 h-14 opacity-60"
            />
          </div>
        )}

        {/* Info da Música */}
        <div className="w-full text-center mb-4 flex-shrink-0">
          <p className="text-sm font-medium text-white truncate mb-1">
            {contextCurrentTrack?.title || "Nenhuma música tocando"}
          </p>
          <p className="text-xs text-white/60 truncate">
            {contextCurrentTrack?.artist || "Artista desconhecido"}
          </p>
        </div>

        {/* Se for Free, mostra aviso elegante */}
        {isFree ? (
          <div className="w-full space-y-4 flex-shrink-0">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-yellow-400 mb-2 font-semibold">
                Reprodução via Web requer Premium
              </p>
              <p className="text-[10px] text-white/60 mb-3">
                Abra o App Desktop para controlar a reprodução.
              </p>
              {contextCurrentTrack?.uri && (
                <button
                  onClick={() => {
                    window.location.href = contextCurrentTrack.uri!;
                  }}
                  className="px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-semibold transition-colors flex items-center gap-2 mx-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir no App
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Barra de Progresso (SeekBar) */}
            <div className="w-full px-4 mb-3 flex-shrink-0">
              <SeekBar
                value={(position / duration) * 100}
                duration={duration}
                currentTime={position}
                onChange={seek}
                accentColor="#1DB954"
                onDragStart={() => setIsSeeking(true)}
                onDragEnd={() => setIsSeeking(false)}
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
              />
            </div>

            {/* Controles Principais */}
            <div className="flex items-center justify-center gap-3 mb-3 flex-shrink-0">
              <button
                onClick={handleShuffle}
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
                className={`p-2 transition-colors ${
                  isShuffling
                    ? "text-[#1DB954]"
                    : "text-white/70 hover:text-white"
                } disabled:opacity-50`}
              >
                <Shuffle className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handlePrevious}
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
                className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipBack className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
                className="w-12 h-12 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center text-black shadow-lg flex-shrink-0"
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
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
                className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipForward className="h-5 w-5" strokeWidth={2} />
              </button>

              <button
                onClick={handleRepeat}
                disabled={
                  activeService !== "SPOTIFY" || !spotifyPlayerRef.current
                }
                className={`p-2 transition-colors ${
                  repeatMode !== "off"
                    ? "text-[#1DB954]"
                    : "text-white/70 hover:text-white"
                } disabled:opacity-50`}
              >
                {repeatMode === "track" ? (
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
                accentColor="#1DB954"
                onDragStart={() => setIsAdjustingVolume(true)}
                onDragEnd={(finalValue) => {
                  // Primeiro define isAdjustingVolume como false
                  setIsAdjustingVolume(false);
                  // Depois atualiza o volume forçando o envio para o player
                  setVolume(finalValue, true);
                }}
                disabled={activeService !== "SPOTIFY"}
                className="w-32"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
