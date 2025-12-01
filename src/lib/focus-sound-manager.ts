/**
 * Gerenciador Global de Sons de Foco
 *
 * Este módulo gerencia o áudio de forma global para garantir que
 * continue tocando em loop mesmo quando o widget é fechado.
 */

type FocusSound = "rain" | "ocean" | "fireplace" | "lofi" | null;

class FocusSoundManager {
  private audio: HTMLAudioElement | null = null;
  private currentSound: FocusSound = null;
  private volume: number = 0.5;

  /**
   * Inicia um som de foco em loop infinito
   */
  play(soundUrl: string, soundType: FocusSound): void {
    // Para qualquer som anterior
    this.stop();

    // Valida se a URL é válida
    if (!soundUrl || soundUrl.trim() === "") {
      console.error("URL do som de foco inválida ou vazia");
      return;
    }

    // Verifica se a URL é acessível antes de criar o elemento de áudio
    fetch(soundUrl, { method: "HEAD" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Arquivo não encontrado: ${response.status}`);
        }
        // Se a URL é válida, cria e reproduz o áudio
        this.createAndPlayAudio(soundUrl, soundType);
      })
      .catch((error) => {
        console.error("Erro ao validar URL do som de foco:", error);
        console.error("URL tentada:", soundUrl);
        // Tenta mesmo assim, pode ser um problema de CORS no HEAD request
        this.createAndPlayAudio(soundUrl, soundType);
      });
  }

  /**
   * Cria e reproduz o elemento de áudio
   */
  private createAndPlayAudio(soundUrl: string, soundType: FocusSound): void {
    try {
      // Cria novo áudio
      this.audio = new Audio(soundUrl);
      this.audio.loop = true; // Loop infinito
      this.audio.volume = this.volume;
      this.currentSound = soundType;

      // Event listeners para diferentes tipos de erro
      this.audio.addEventListener("error", (e) => {
        const error = this.audio?.error;
        if (error) {
          let errorMessage = "Erro desconhecido";
          // Códigos de erro do MediaError (valores numéricos)
          // MEDIA_ERR_ABORTED = 1
          // MEDIA_ERR_NETWORK = 2
          // MEDIA_ERR_DECODE = 3
          // MEDIA_ERR_SRC_NOT_SUPPORTED = 4
          switch (error.code) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = "Reprodução abortada";
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = "Erro de rede ao carregar o áudio";
              break;
            case 3: // MEDIA_ERR_DECODE
              errorMessage = "Erro ao decodificar o áudio";
              break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage =
                "Formato de áudio não suportado ou arquivo não encontrado";
              break;
          }
          console.error(
            `Erro ao tocar som de foco (${soundType}):`,
            errorMessage
          );
          console.error("URL:", soundUrl);
          console.error("Código de erro:", error.code);
        } else {
          console.error("Erro ao tocar som de foco");
        }
        this.stop();
      });

      // Inicia a reprodução
      this.audio
        .play()
        .then(() => {
          console.log(`Som de foco iniciado: ${soundType}`);
        })
        .catch((error) => {
          console.error("Erro ao iniciar som de foco:", error);
          console.error("URL:", soundUrl);
          this.stop();
        });
    } catch (error) {
      console.error("Erro ao criar elemento de áudio:", error);
      this.stop();
    }
  }

  /**
   * Para o som de foco atual
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.loop = false;
      this.audio = null;
    }
    this.currentSound = null;

    // Remove do localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("momentum-active-focus-sound");
    }
  }

  /**
   * Verifica se um som está tocando
   */
  isPlaying(soundType: FocusSound): boolean {
    return (
      this.currentSound === soundType &&
      this.audio !== null &&
      !this.audio.paused
    );
  }

  /**
   * Retorna o som ativo
   */
  getCurrentSound(): FocusSound {
    return this.currentSound;
  }

  /**
   * Define o volume (0 a 1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Restaura um som salvo no localStorage
   */
  restore(savedSound: FocusSound, soundUrl: string): void {
    if (savedSound && !this.isPlaying(savedSound)) {
      this.play(soundUrl, savedSound);
    }
  }
}

// Instância global única
export const focusSoundManager = new FocusSoundManager();
