import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface YouTubePlayerProps {
  onDisconnect?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ onDisconnect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: playlists } = useQuery<any[]>({
    queryKey: ["youtubePlaylists"],
    queryFn: () => api.get("/media/youtube/playlists").then((res) => res.data),
    retry: 1,
    enabled: false, // Só busca quando necessário
  });

  const { mutate: searchYouTube, isPending: isSearching } = useMutation({
    mutationFn: (query: string) =>
      api.get(`/media/youtube/search?q=${encodeURIComponent(query)}`).then((res) => res.data),
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.error) {
        toast({
          title: "Erro na busca",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na busca",
        description: error.response?.data?.error || "Erro ao buscar vídeos",
        variant: "destructive",
      });
    },
  });

  const { mutate: playVideo, isPending: isPlayingVideo } = useMutation({
    mutationFn: (videoId: string) =>
      api.post("/media/youtube/play", { videoId }).then((res) => res.data),
    onSuccess: (data) => {
      if (data.video) {
        setCurrentVideo(data.video);
        setIsPlaying(true);
        toast({
          title: "Reproduzindo",
          description: data.video.title,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reproduzir",
        description: error.response?.data?.error || "Erro ao reproduzir vídeo",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchYouTube(searchQuery);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (currentVideo && !isPlaying) {
      // Se não há vídeo tocando, toca o primeiro resultado ou o atual
      if (searchResults.length > 0 && !currentVideo) {
        playVideo(searchResults[0].id);
      }
    }
  };

  const handleSelectVideo = (video: any) => {
    setCurrentVideo(video);
    playVideo(video.id);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar música no YouTube..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {searchResults.map((video) => (
            <button
              key={video.id}
              onClick={() => handleSelectVideo(video)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{video.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {video.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Current Track */}
      {currentVideo && (
        <div className="text-center py-4 bg-gradient-subtle rounded-lg border border-widget-border">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
            {currentVideo.thumbnail ? (
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Volume2 className="h-8 w-8 text-primary" />
            )}
          </div>
          <h4 className="font-medium text-foreground truncate px-2">
            {currentVideo.title}
          </h4>
          <p className="text-sm text-muted-foreground truncate px-2">
            {currentVideo.channelTitle || "YouTube Music"}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="lg" disabled={!currentVideo}>
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          onClick={handlePlayPause}
          size="lg"
          className="bg-gradient-primary hover:bg-primary-hover"
          disabled={!currentVideo && searchResults.length === 0}
        >
          {isPlayingVideo ? (
            <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <Button variant="ghost" size="lg" disabled={!currentVideo}>
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Volume</span>
          <span className="text-sm text-foreground">{volume[0]}%</span>
        </div>
        <Slider
          value={volume}
          onValueChange={setVolume}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* Video Embed (se disponível) */}
      {currentVideo && currentVideo.embedUrl && (
        <div className="aspect-video rounded-lg overflow-hidden border border-widget-border">
          <iframe
            src={`${currentVideo.embedUrl}?autoplay=${isPlaying ? 1 : 0}&mute=${volume[0] === 0 ? 1 : 0}`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            title={currentVideo.title}
          />
        </div>
      )}

      {/* Disconnect Button */}
      {onDisconnect && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onDisconnect}
        >
          Desconectar YouTube Music
        </Button>
      )}
    </div>
  );
};

