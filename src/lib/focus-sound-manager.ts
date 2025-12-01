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

    // Cria novo áudio
    this.audio = new Audio(soundUrl);
    this.audio.loop = true; // Loop infinito
    this.audio.volume = this.volume;
    this.currentSound = soundType;

    // Event listeners
    this.audio.addEventListener("error", () => {
      console.error("Erro ao tocar som de foco");
      this.stop();
    });

    // Inicia a reprodução
    this.audio.play().catch((error) => {
      console.error("Erro ao iniciar som de foco:", error);
      this.stop();
    });
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
