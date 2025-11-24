import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Heart,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import spotifyIcon from "@/assets/icon-spotify.png";

interface SpotifyPlayerProps {
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

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({
  onDisconnect,
  onPlay,
  isDisconnecting = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const [activeView, setActiveView] = useState<"library" | "player">("library");
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SpotifyPlaylist | null>(null);
  const { toast } = useToast();
  const playerRef = useRef<any>(null);

  // Buscar access token do Spotify
  const { data: spotifyToken } = useQuery({
    queryKey: ["spotifyToken"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/token");
      return data.accessToken;
    },
    retry: 2,
    refetchInterval: 3600000,
    staleTime: 3300000,
  });

  // Buscar playlists
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useQuery<
    SpotifyPlaylist[]
  >({
    queryKey: ["spotifyPlaylists"],
    queryFn: async () => {
      const { data } = await api.get("/media/spotify/playlists");
      return data;
    },
    enabled: !!spotifyToken,
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
    enabled: !!spotifyToken,
    retry: 1,
  });

  // Mutation para reproduzir conteúdo
  const playContentMutation = useMutation({
    mutationFn: ({ uri, deviceId }: { uri: string; deviceId?: string }) =>
      api.post("/media/spotify/play", { uri, deviceId }),
    onSuccess: () => {
      setActiveView("player");
      onPlay?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reproduzir",
        description:
          error.response?.data?.message ||
          "Não foi possível reproduzir o conteúdo",
        variant: "destructive",
      });
    },
  });

  // Carregar Spotify Web Playback SDK
  useEffect(() => {
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        // SDK está pronto
      };
    }
  }, []);

  // Inicializar player quando token estiver disponível
  useEffect(() => {
    if (!spotifyToken || !window.Spotify) return;

    setIsPremiumRequired(false);

    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }

    const newPlayer = new window.Spotify.Player({
      name: "Momentum Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(spotifyToken);
      },
      volume: 0.5,
    });

    newPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      setPlayer(newPlayer);
      playerRef.current = newPlayer;
    });

    newPlayer.addListener(
      "not_ready",
      ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline", device_id);
        setPlayer(null);
        playerRef.current = null;
      }
    );

    newPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      setIsPlaying(!state.paused);
      setCurrentTrack(state.track_window.current_track);

      if (state.duration && state.position !== null) {
        const progressPercent = (state.position / state.duration) * 100;
        setProgress(progressPercent);
      }
    });

    newPlayer.addListener(
      "authentication_error",
      ({ message }: { message: string }) => {
        console.error("Falha na autenticação do Spotify:", message);
        toast({
          title: "Erro de autenticação",
          description:
            "Não foi possível autenticar com o Spotify. Tente reconectar.",
          variant: "destructive",
        });
        setPlayer(null);
        playerRef.current = null;
      }
    );

    newPlayer.addListener(
      "account_error",
      ({ message }: { message: string }) => {
        const isPremiumError = message?.toLowerCase().includes("premium");

        if (isPremiumError) {
          setIsPremiumRequired(true);
          toast({
            title: "Conta Premium necessária",
            description:
              "O Spotify Web Player requer uma conta Premium. Faça upgrade no Spotify para usar este recurso.",
            variant: "destructive",
            duration: 6000,
          });
        } else {
          toast({
            title: "Erro na conta",
            description: "Não foi possível acessar sua conta do Spotify.",
            variant: "destructive",
          });
        }
        setPlayer(null);
        playerRef.current = null;
      }
    );

    newPlayer.addListener(
      "playback_error",
      ({ message }: { message: string }) => {
        console.error("Erro de reprodução do Spotify:", message);
      }
    );

    newPlayer
      .connect()
      .then((success: boolean) => {
        if (!success) {
          console.error("Falha ao conectar o player do Spotify");
          toast({
            title: "Erro ao conectar",
            description: "Não foi possível conectar o player do Spotify.",
            variant: "destructive",
          });
        }
      })
      .catch((error: any) => {
        console.error("Erro ao inicializar player do Spotify:", error);
        toast({
          title: "Erro ao inicializar",
          description: "Não foi possível inicializar o player do Spotify.",
          variant: "destructive",
        });
      });

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [spotifyToken, toast, onPlay]);

  const handlePlayPause = async () => {
    if (!player) return;

    if (isPlaying) {
      await player.pause();
      setIsPlaying(false);
    } else {
      await player.resume();
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const handleNext = async () => {
    if (!player) return;
    await player.nextTrack();
  };

  const handlePrevious = async () => {
    if (!player) return;
    await player.previousTrack();
  };

  const handlePlayPlaylist = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    playContentMutation.mutate({
      uri: playlist.uri,
      deviceId: deviceId || undefined,
    });
  };

  const handlePlayTrack = (track: SpotifyTrack) => {
    playContentMutation.mutate({
      uri: track.uri,
      deviceId: deviceId || undefined,
    });
  };

  if (isPremiumRequired) {
    return (
      <div className="text-center py-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full mx-auto mb-3 flex items-center justify-center">
          <img src={spotifyIcon} alt="Spotify" className="w-8 h-8 opacity-60" />
        </div>
        <h4 className="text-sm text-yellow-400 mb-2 font-medium">
          Conta Premium Necessária
        </h4>
        <p className="text-xs text-yellow-300/80 font-light mb-3 px-2">
          O Spotify Web Player requer uma conta Premium para funcionar.
        </p>
        <a
          href="https://www.spotify.com/premium/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-semibold transition-colors"
        >
          Fazer Upgrade no Spotify
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Library View */}
      {activeView === "library" && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {/* Saved Tracks Section */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/50 font-light mb-2 px-1">
              Músicas Curtidas
            </h3>
            {isLoadingTracks ? (
              <div className="text-center py-4 text-white/50 text-sm">
                Carregando...
              </div>
            ) : savedTracks.length > 0 ? (
              <div className="space-y-1">
                {savedTracks.slice(0, 10).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    {track.image && (
                      <img
                        src={track.image}
                        alt={track.album}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate font-medium">
                        {track.name}
                      </p>
                      <p className="text-xs text-white/50 truncate font-light">
                        {track.artist}
                      </p>
                    </div>
                    <Play className="h-4 w-4 text-white/40" strokeWidth={2} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white/50 text-sm">
                Nenhuma música salva encontrada
              </div>
            )}
          </div>

          {/* Playlists Section */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/50 font-light mb-2 px-1">
              Suas Playlists
            </h3>
            {isLoadingPlaylists ? (
              <div className="text-center py-4 text-white/50 text-sm">
                Carregando...
              </div>
            ) : playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlayPlaylist(playlist)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left border border-white/10"
                  >
                    {playlist.image ? (
                      <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#1DB954]/20 flex items-center justify-center">
                        <img
                          src={spotifyIcon}
                          alt="Spotify"
                          className="w-8 h-8 opacity-60"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white/90 truncate">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-white/50 truncate font-light">
                        {playlist.owner} • {playlist.tracksCount} músicas
                      </p>
                    </div>
                    <Play
                      className="h-5 w-5 text-[#1DB954]"
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
      {activeView === "player" && currentTrack && (
        <div className="space-y-4">
          <button
            onClick={() => setActiveView("library")}
            className="text-xs text-white/50 hover:text-white/90 transition-colors"
          >
            ← Voltar para biblioteca
          </button>

          <div className="text-center py-6 rounded-xl border border-white/10 bg-[#1DB954]/10">
            {currentTrack.album.images[0] && (
              <img
                src={currentTrack.album.images[0].url}
                alt={currentTrack.name}
                className="w-32 h-32 rounded-xl mx-auto mb-4 object-cover"
              />
            )}
            <h4 className="text-lg font-medium text-white/90 truncate px-2 mb-1">
              {currentTrack.name}
            </h4>
            <p className="text-sm text-white/50 truncate px-2 font-light">
              {currentTrack.artists[0]?.name || "Spotify"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1 bg-white/10 rounded-full">
            <div
              className="absolute h-full bg-[#1DB954] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button className="h-8 w-8 rounded-full bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 hover:text-white/90">
              <Shuffle className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              onClick={handlePrevious}
              disabled={!player}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
            >
              <SkipBack className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={!player}
              className="h-12 w-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 transition-colors flex items-center justify-center text-black font-semibold shadow-lg shadow-[#1DB954]/30"
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
              disabled={!player}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
            >
              <SkipForward className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button className="h-8 w-8 rounded-full bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 hover:text-white/90">
              <Repeat className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Empty State - No track playing */}
      {activeView === "library" && !currentTrack && (
        <div className="text-center py-8 rounded-xl border border-white/10 bg-[#1DB954]/10">
          <div className="w-16 h-16 bg-[#1DB954]/20 rounded-full mx-auto mb-3 flex items-center justify-center">
            <img src={spotifyIcon} alt="Spotify" className="w-8 h-8" />
          </div>
          <h4 className="text-sm text-white/90 mb-1 font-medium">
            Spotify Conectado
          </h4>
          <p className="text-xs text-white/50 font-light">
            Selecione uma playlist ou música para começar
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
          {isDisconnecting ? "Desconectando..." : "Desconectar Spotify"}
        </button>
      )}
    </div>
  );
};
