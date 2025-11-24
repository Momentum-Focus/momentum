import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

// Tipos
type Service = "SPOTIFY" | "YOUTUBE" | null;

interface Track {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  duration: number; // em segundos
  uri?: string; // Para Spotify
  service: Service;
}

interface MusicPlayerState {
  activeService: Service;
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number; // posição atual em segundos
  volume: number; // 0-100
  duration: number; // duração total em segundos
}

interface MusicPlayerContextType extends MusicPlayerState {
  // Estado do player
  spotifyDeviceId: string | null;
  isSpotifyReady: boolean;
  // Métodos de controle
  playTrack: (service: Service, track: Track) => Promise<void>;
  playSpotify: (uri: string, options?: { shuffle?: boolean }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  next: () => void;
  previous: () => void;
  // Métodos para controlar estados de arrasto (previnem atualização durante drag)
  setIsSeeking: (seeking: boolean) => void;
  setIsAdjustingVolume: (adjusting: boolean) => void;
  // Métodos internos para atualização de estado (usados pelos listeners)
  _updatePlayingState: (playing: boolean) => void;
  _updateCurrentTrack: (track: Track | null) => void;
  _updatePosition: (position: number) => void;
  _updateDuration: (duration: number) => void;
  _setSpotifyDeviceId: (deviceId: string | null) => void;
  _setSpotifyReady: (ready: boolean) => void;
  // Referências para os players (para acesso direto quando necessário)
  spotifyPlayerRef: React.MutableRefObject<any>;
  youtubePlayerRef: React.MutableRefObject<any>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(
  undefined
);

interface MusicPlayerProviderProps {
  children: ReactNode;
}

export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({
  children,
}) => {
  // Estado global
  const [activeService, setActiveService] = useState<Service>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [volume, setVolumeState] = useState(75);
  const [duration, setDuration] = useState(0);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  // Estados de controle para sliders (previnem atualização durante arrasto)
  const [isSeeking, setIsSeeking] = useState(false);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);

  // Refs para os players (mantidos vivos mesmo quando componentes são desmontados)
  const spotifyPlayerRef = useRef<any>(null);
  const youtubePlayerRef = useRef<any>(null);

  // Interval para atualizar posição
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Atualiza posição periodicamente quando está tocando
  // NÃO atualiza se o usuário estiver arrastando o slider (isSeeking)
  useEffect(() => {
    if (isPlaying && activeService && !isSeeking) {
      positionIntervalRef.current = setInterval(() => {
        if (activeService === "SPOTIFY" && spotifyPlayerRef.current) {
          try {
            spotifyPlayerRef.current.getCurrentState().then((state: any) => {
              if (state && !isSeeking) {
                setPosition(state.position / 1000); // converte ms para segundos
              }
            });
          } catch (error) {
            // Ignora erros
          }
        } else if (activeService === "YOUTUBE" && youtubePlayerRef.current) {
          try {
            const currentTime = youtubePlayerRef.current.getCurrentTime?.();
            if (
              currentTime !== undefined &&
              currentTime !== null &&
              !isSeeking
            ) {
              setPosition(currentTime);
            }
          } catch (error) {
            // Ignora erros
          }
        }
      }, 1000);
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    }

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [isPlaying, activeService, isSeeking]);

  // Pausa o serviço que não está ativo
  const pauseInactiveService = useCallback((newService: Service) => {
    if (newService === "SPOTIFY" && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.pauseVideo?.();
      } catch (error) {
        // Ignora erros
      }
    } else if (newService === "YOUTUBE" && spotifyPlayerRef.current) {
      try {
        spotifyPlayerRef.current.pause?.();
      } catch (error) {
        // Ignora erros
      }
    }
  }, []);

  // Função simplificada para tocar Spotify (aceita apenas URI)
  const playSpotify = useCallback(
    async (uri: string, options?: { shuffle?: boolean }) => {
      // Verifica se o player está pronto e tem deviceId
      if (!spotifyDeviceId) {
        console.error("[MusicPlayer] Spotify deviceId não disponível");
        throw new Error(
          "Player não está pronto. Aguarde o player inicializar."
        );
      }

      // Optimistic Update: Atualiza UI imediatamente para resposta instantânea
      const previousPlayingState = isPlaying;
      const previousService = activeService;
      setActiveService("SPOTIFY");
      setIsPlaying(true);
      pauseInactiveService("SPOTIFY");

      try {
        const isPlaylist = uri.startsWith("spotify:playlist:");

        // Busca o token do Spotify via API do backend
        const tokenResponse = await api.get("/media/spotify/token");
        const accessToken = tokenResponse.data.accessToken;

        if (!accessToken) {
          // Reverte optimistic update em caso de erro
          setActiveService(previousService);
          setIsPlaying(previousPlayingState);
          throw new Error("Não foi possível obter token do Spotify.");
        }

        // Configura shuffle ANTES de tocar (se solicitado)
        if (options?.shuffle) {
          try {
            await fetch(
              `https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${spotifyDeviceId}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
          } catch (shuffleError) {
            // Continua mesmo se shuffle falhar
          }
        }

        // Prepara o body da requisição
        const playBody: any = isPlaylist
          ? { context_uri: uri }
          : { uris: [uri] };

        // Faz a requisição para tocar usando a API REST do Spotify
        const playResponse = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(playBody),
          }
        );

        if (!playResponse.ok && playResponse.status !== 204) {
          const errorData = await playResponse.json().catch(() => ({}));
          // Reverte optimistic update em caso de erro
          setActiveService(previousService);
          setIsPlaying(previousPlayingState);
          throw new Error(
            errorData.error?.message || "Falha ao iniciar reprodução"
          );
        }

        // O SDK vai atualizar currentTrack via player_state_changed
      } catch (error: any) {
        // Reverte optimistic update em caso de erro
        setActiveService(previousService);
        setIsPlaying(previousPlayingState);
        throw error; // Re-lança para o componente tratar
      }
    },
    [spotifyDeviceId, pauseInactiveService, isPlaying, activeService]
  );

  // Toca uma música (método genérico que aceita Track completo)
  const playTrack = useCallback(
    async (service: Service, track: Track) => {
      if (!service || !track) return;

      // Pausa o serviço que não está ativo
      pauseInactiveService(service);

      setActiveService(service);
      setCurrentTrack(track);
      setDuration(track.duration);
      setPosition(0);

      if (service === "SPOTIFY") {
        // Usa playSpotify para simplificar
        if (track.uri) {
          await playSpotify(track.uri);
        }
      } else if (service === "YOUTUBE" && youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.loadVideoById?.(track.id);
          youtubePlayerRef.current.playVideo?.();
          setIsPlaying(true);
        } catch (error) {
          console.error("[MusicPlayer] Erro ao tocar no YouTube:", error);
        }
      }
    },
    [pauseInactiveService, playSpotify]
  );

  // Pausa
  const pause = useCallback(() => {
    if (activeService === "SPOTIFY" && spotifyPlayerRef.current) {
      try {
        spotifyPlayerRef.current.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error("[MusicPlayer] Erro ao pausar Spotify:", error);
      }
    } else if (activeService === "YOUTUBE" && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } catch (error) {
        console.error("[MusicPlayer] Erro ao pausar YouTube:", error);
      }
    }
  }, [activeService]);

  // Resume
  const resume = useCallback(() => {
    if (activeService === "SPOTIFY" && spotifyPlayerRef.current) {
      try {
        spotifyPlayerRef.current.resume();
        setIsPlaying(true);
      } catch (error) {
        console.error("[MusicPlayer] Erro ao resumir Spotify:", error);
      }
    } else if (activeService === "YOUTUBE" && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.playVideo?.();
        setIsPlaying(true);
      } catch (error) {
        console.error("[MusicPlayer] Erro ao resumir YouTube:", error);
      }
    }
  }, [activeService]);

  // Seek (pular para um tempo específico)
  const seek = useCallback(
    (time: number) => {
      if (activeService === "SPOTIFY" && spotifyPlayerRef.current) {
        try {
          spotifyPlayerRef.current.seek(time * 1000); // Spotify usa milissegundos
          setPosition(time);
        } catch (error) {
          console.error("[MusicPlayer] Erro ao fazer seek no Spotify:", error);
        }
      } else if (activeService === "YOUTUBE" && youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.seekTo?.(time, true);
          setPosition(time);
        } catch (error) {
          console.error("[MusicPlayer] Erro ao fazer seek no YouTube:", error);
        }
      }
    },
    [activeService]
  );

  // Volume
  // Atualiza o estado imediatamente, mas só envia para o player quando não estiver ajustando
  // (durante o arrasto, o volume só é enviado quando soltar o mouse)
  const setVolume = useCallback(
    (newVolume: number, forceUpdate = false) => {
      const clampedVolume = Math.max(0, Math.min(100, newVolume));
      setVolumeState(clampedVolume);

      // Envia para o player se não estiver ajustando OU se for forçado (no onDragEnd)
      if (!isAdjustingVolume || forceUpdate) {
        if (spotifyPlayerRef.current) {
          try {
            spotifyPlayerRef.current.setVolume?.(clampedVolume / 100); // Spotify usa 0-1
          } catch (error) {
            // Ignora erros
          }
        }

        if (youtubePlayerRef.current) {
          try {
            youtubePlayerRef.current.setVolume?.(clampedVolume);
          } catch (error) {
            // Ignora erros
          }
        }
      }
    },
    [isAdjustingVolume, spotifyPlayerRef, youtubePlayerRef]
  );

  // Next (placeholder - será implementado quando tiver fila)
  const next = useCallback(() => {
    // TODO: Implementar quando tiver fila de reprodução
    console.log("[MusicPlayer] Next - não implementado ainda");
  }, []);

  // Previous (placeholder - será implementado quando tiver fila)
  const previous = useCallback(() => {
    // TODO: Implementar quando tiver fila de reprodução
    console.log("[MusicPlayer] Previous - não implementado ainda");
  }, []);

  // Métodos internos para atualização de estado (usados pelos listeners dos players)
  const _updatePlayingState = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const _updateCurrentTrack = useCallback((track: Track | null) => {
    setCurrentTrack(track);
  }, []);

  const _updatePosition = useCallback((pos: number) => {
    setPosition(pos);
  }, []);

  const _updateDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const _setSpotifyDeviceId = useCallback((deviceId: string | null) => {
    setSpotifyDeviceId(deviceId);
  }, []);

  const _setSpotifyReady = useCallback((ready: boolean) => {
    setIsSpotifyReady(ready);
  }, []);

  const handleSetIsSeeking = useCallback((seeking: boolean) => {
    setIsSeeking(seeking);
  }, []);

  const handleSetIsAdjustingVolume = useCallback((adjusting: boolean) => {
    setIsAdjustingVolume(adjusting);
  }, []);

  const value: MusicPlayerContextType = {
    activeService,
    isPlaying,
    currentTrack,
    position,
    volume,
    duration,
    spotifyDeviceId,
    isSpotifyReady,
    playTrack,
    playSpotify,
    pause,
    resume,
    seek,
    setVolume,
    next,
    previous,
    setIsSeeking: handleSetIsSeeking,
    setIsAdjustingVolume: handleSetIsAdjustingVolume,
    _updatePlayingState,
    _updateCurrentTrack,
    _updatePosition,
    _updateDuration,
    _setSpotifyDeviceId,
    _setSpotifyReady,
    spotifyPlayerRef,
    youtubePlayerRef,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error(
      "useMusicPlayer deve ser usado dentro de um MusicPlayerProvider"
    );
  }
  return context;
};
