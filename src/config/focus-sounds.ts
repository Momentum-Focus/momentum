/**
 * Configuração dos Sons de Foco
 *
 * Este arquivo contém URLs de fallback caso os áudios não estejam
 * disponíveis no Supabase Storage.
 *
 * O sistema tenta primeiro buscar as URLs do backend (Supabase Storage).
 * Se não encontrar, usa estas URLs de fallback.
 *
 * Para adicionar os áudios corretos:
 * 1. Faça upload no Supabase Storage (pasta focus-sounds/)
 * 2. Ou use o endpoint POST /media/focus-sounds/upload
 * 3. Veja instruções em: momentum-dev/scripts/upload-focus-sounds.md
 */

export const FOCUS_SOUND_URLS = {
  // URLs de fallback (substitua por URLs reais se necessário)
  rain: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  ocean: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  fireplace: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  lofi: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
} as const;
