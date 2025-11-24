import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMusicPlayer } from "@/context/music-player-context";

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Componente Headless que mantém os players vivos em segundo plano
 * Este componente NUNCA é desmontado, garantindo que a música continue tocando
 * mesmo quando os widgets são fechados.
 */
export const HeadlessMusicPlayer: React.FC = () => {
  const {
    spotifyPlayerRef,
    youtubePlayerRef,
    activeService,
    isPlaying,
    setVolume,
    _updatePlayingState,
    _updateCurrentTrack,
    _updatePosition,
    _updateDuration,
    _setSpotifyDeviceId,
    _setSpotifyReady,
  } = useMusicPlayer();

  const spotifyInitializedRef = useRef(false);
  const youtubeInitializedRef = useRef(false);

  // Buscar token do Spotify
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

  // Buscar status do Spotify
  const { data: spotifyStatus } = useQuery<{
    isConnected: boolean;
    isPremium: boolean;
  }>({
    queryKey: ["spotifyStatus"],
    queryFn: () => api.get("/media/spotify/status").then((res) => res.data),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Inicializar Spotify Web Playback SDK (apenas uma vez)
  useEffect(() => {
    if (
      !spotifyStatus?.isConnected ||
      !spotifyStatus?.isPremium ||
      spotifyInitializedRef.current ||
      window.Spotify
    ) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("[HeadlessPlayer] Spotify SDK carregado");
    };
  }, [spotifyStatus]);

  // Inicializar Player do Spotify (apenas uma vez)
  useEffect(() => {
    if (
      !spotifyToken ||
      !spotifyStatus?.isConnected ||
      !spotifyStatus?.isPremium ||
      !window.Spotify ||
      spotifyPlayerRef.current ||
      spotifyInitializedRef.current
    ) {
      return;
    }

    spotifyInitializedRef.current = true;

    const newPlayer = new window.Spotify.Player({
      name: "Momentum Headless Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(spotifyToken);
      },
      volume: 0.75,
    });

    // Atribui o player ao ref imediatamente (antes de conectar)
    // Isso permite que os métodos estejam disponíveis mesmo antes do evento "ready"
    spotifyPlayerRef.current = newPlayer;

    newPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("[HeadlessPlayer] Spotify Player pronto, device:", device_id);
      // Garante que o ref ainda aponta para o player
      spotifyPlayerRef.current = newPlayer;
      // Salva o device_id e marca como pronto imediatamente
      // O controle de playback é feito via API REST, não precisa verificar métodos locais
      _setSpotifyDeviceId(device_id);
      _setSpotifyReady(true);
    });

    newPlayer.addListener("not_ready", () => {
      console.log("[HeadlessPlayer] Spotify Player não está pronto");
      _setSpotifyReady(false);
      // Não remove o ref, mantém o player para tentar reconectar
    });

    newPlayer.addListener(
      "initialization_error",
      ({ message }: { message: string }) => {
        console.error(
          "[HeadlessPlayer] Erro de inicialização Spotify:",
          message
        );
        _setSpotifyReady(false);
        _setSpotifyDeviceId(null);
      }
    );

    newPlayer.addListener(
      "authentication_error",
      ({ message }: { message: string }) => {
        console.error(
          "[HeadlessPlayer] Erro de autenticação Spotify:",
          message
        );
        _setSpotifyReady(false);
        _setSpotifyDeviceId(null);
        // TODO: Disparar refresh de token
      }
    );

    newPlayer.addListener(
      "account_error",
      ({ message }: { message: string }) => {
        console.error(
          "[HeadlessPlayer] Erro de conta Spotify (provavelmente Free):",
          message
        );
        _setSpotifyReady(false);
        _setSpotifyDeviceId(null);
      }
    );

    newPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      // Sincroniza estado com o contexto
      _updatePlayingState(!state.paused);

      if (state.track_window?.current_track) {
        const track = state.track_window.current_track;
        _updateCurrentTrack({
          id: track.id,
          title: track.name,
          artist: track.artists[0]?.name || "Artista desconhecido",
          cover: track.album?.images[0]?.url || undefined,
          duration: track.duration_ms / 1000, // converte para segundos
          uri: track.uri,
          service: "SPOTIFY",
        });
      }

      if (state.duration && state.position !== null) {
        _updatePosition(state.position / 1000); // converte para segundos
        _updateDuration(state.duration / 1000); // converte para segundos
      }
    });

    newPlayer.connect().catch((error: any) => {
      console.error("[HeadlessPlayer] Erro ao conectar Spotify Player:", error);
      spotifyPlayerRef.current = null;
    });

    return () => {
      // NUNCA desconecta - mantém o player vivo
      // Apenas limpa em caso de desconexão real
    };
  }, [
    spotifyToken,
    spotifyStatus,
    spotifyPlayerRef,
    _updatePlayingState,
    _updateCurrentTrack,
    _updatePosition,
    _updateDuration,
    _setSpotifyDeviceId,
    _setSpotifyReady,
  ]);

  // Inicializar YouTube IFrame API (apenas uma vez)
  useEffect(() => {
    if (youtubeInitializedRef.current || window.YT) {
      return;
    }

    const initializeYouTube = () => {
      if (youtubePlayerRef.current || youtubeInitializedRef.current) {
        return;
      }

      const iframeElement = document.getElementById("youtube-iframe-headless");
      if (!iframeElement || !window.YT || !window.YT.Player) {
        setTimeout(initializeYouTube, 200);
        return;
      }

      try {
        youtubeInitializedRef.current = true;
        const currentOrigin = window.location.origin;

        youtubePlayerRef.current = new window.YT.Player(
          "youtube-iframe-headless",
          {
            height: "1",
            width: "1",
            playerVars: {
              autoplay: 0,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              fs: 0,
              iv_load_policy: 3,
              disablekb: 1,
              enablejsapi: 1,
              origin: currentOrigin,
              host: "https://www.youtube.com",
              playsinline: 1,
            },
            events: {
              onReady: () => {
                console.log("[HeadlessPlayer] YouTube Player pronto");
                if (
                  youtubePlayerRef.current &&
                  typeof youtubePlayerRef.current.setVolume === "function"
                ) {
                  youtubePlayerRef.current.setVolume(75);
                }
              },
              onStateChange: (event: any) => {
                const state = event.data;
                if (state === window.YT.PlayerState.PLAYING) {
                  _updatePlayingState(true);
                } else if (state === window.YT.PlayerState.PAUSED) {
                  _updatePlayingState(false);
                } else if (state === window.YT.PlayerState.ENDED) {
                  _updatePlayingState(false);
                }

                // Atualiza posição e duração
                try {
                  const currentTime =
                    youtubePlayerRef.current?.getCurrentTime?.();
                  const duration = youtubePlayerRef.current?.getDuration?.();
                  if (currentTime !== undefined && currentTime !== null) {
                    _updatePosition(currentTime);
                  }
                  if (
                    duration !== undefined &&
                    duration !== null &&
                    duration > 0
                  ) {
                    _updateDuration(duration);
                  }
                } catch (error) {
                  // Ignora erros
                }
              },
              onError: (event: any) => {
                console.error(
                  "[HeadlessPlayer] Erro no YouTube Player:",
                  event.data
                );
              },
            },
          }
        );
      } catch (error: any) {
        console.error(
          "[HeadlessPlayer] Erro ao inicializar YouTube Player:",
          error
        );
        youtubeInitializedRef.current = false;
      }
    };

    if (!window.YT) {
      const originalOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalOnReady) {
          originalOnReady();
        }
        setTimeout(initializeYouTube, 300);
      };

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.defer = true;
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    } else if (window.YT && window.YT.Player) {
      setTimeout(initializeYouTube, 300);
    }
  }, [youtubePlayerRef, _updatePlayingState, _updatePosition, _updateDuration]);

  // Sincronizar volume com o contexto
  useEffect(() => {
    if (
      spotifyPlayerRef.current &&
      typeof spotifyPlayerRef.current.setVolume === "function"
    ) {
      try {
        spotifyPlayerRef.current.setVolume(0.75); // Volume padrão
      } catch (error) {
        // Ignora erros
      }
    }
  }, [spotifyPlayerRef]);

  // Iframes ocultos para os players (nunca são removidos do DOM)
  return (
    <div
      className="fixed opacity-0 pointer-events-none"
      style={{ width: "1px", height: "1px", overflow: "hidden", zIndex: -1 }}
    >
      <div
        id="youtube-iframe-headless"
        style={{ width: "1px", height: "1px" }}
      />
    </div>
  );
};
