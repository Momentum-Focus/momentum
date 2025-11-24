import React, { useState } from "react";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SpotifyUrlInputProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SpotifyUrlInput: React.FC<SpotifyUrlInputProps> = ({
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState("");
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Extrai o ID da playlist da URL
  const extractPlaylistId = (url: string): string | null => {
    const urlMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) {
      return uriMatch[1];
    }

    return null;
  };

  // Valida e busca preview da playlist
  const validateAndPreview = async () => {
    if (!url.trim()) {
      setError("Por favor, insira um link de playlist");
      return;
    }

    const id = extractPlaylistId(url);
    if (!id) {
      setError(
        "Link inválido. Por favor, insira um link válido de Playlist do Spotify"
      );
      setPreviewData(null);
      return;
    }

    setIsValidating(true);
    setError(null);
    setPlaylistId(id);

    try {
      const { data } = await api.get(
        `/media/spotify/playlist/preview?playlistId=${id}`
      );
      setPreviewData(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      if (
        errorMessage?.includes("não encontrada") ||
        errorMessage?.includes("inválida")
      ) {
        setError("Playlist não encontrada ou inválida. Verifique o link.");
      } else {
        setError(
          "Erro ao validar playlist. Verifique o link e tente novamente."
        );
      }
      setPreviewData(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Salva a playlist como foco
  const saveMutation = useMutation({
    mutationFn: (playlistUrl: string) =>
      api.post("/media/spotify/playlist", { url: playlistUrl }),
    onSuccess: () => {
      toast({
        title: "Playlist de foco definida!",
        description: "Sua playlist personalizada foi salva com sucesso.",
      });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao salvar",
        description:
          err.response?.data?.message || "Não foi possível salvar a playlist.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!url.trim() || !previewData) {
      return;
    }

    saveMutation.mutate(url);
  };

  const handleUrlBlur = () => {
    if (url.trim()) {
      validateAndPreview();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="zen-glass rounded-3xl p-6 w-full max-w-md mx-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Adicionar Playlist de Foco
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">
              Cole o link da playlist do Spotify
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                  setPreviewData(null);
                }}
                onBlur={handleUrlBlur}
                placeholder="https://open.spotify.com/playlist/..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full"
              />
              <Button
                onClick={validateAndPreview}
                disabled={isValidating || !url.trim()}
                className="rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold px-4"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verificar"
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Preview Card */}
          {previewData && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex gap-4">
                {previewData.image && (
                  <img
                    src={previewData.image}
                    alt={previewData.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm mb-1 truncate">
                    {previewData.name}
                  </h4>
                  <p className="text-xs text-white/70 mb-2">
                    {previewData.owner}
                  </p>
                  <p className="text-xs text-white/50">
                    {previewData.tracksCount} músicas
                  </p>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-[#1DB954]" />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-full border-white/10 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!previewData || saveMutation.isPending}
              className="flex-1 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar como Playlist de Foco"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
