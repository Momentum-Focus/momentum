import React, { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface YouTubePlayerProps {
  onDisconnect?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ onDisconnect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { toast } = useToast();

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
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar música no YouTube..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="h-10 w-10 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
        >
          <Search className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {searchResults.map((video) => (
            <button
              key={video.id}
              onClick={() => handleSelectVideo(video)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-black/20 transition-colors text-left border border-white/10"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white/90 truncate">
                  {video.title}
                </p>
                <p className="text-xs text-white/50 truncate font-light">
                  {video.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Current Track */}
      {currentVideo && (
        <div className="text-center py-6 rounded-xl border border-white/10 bg-black/20">
          {currentVideo.thumbnail && (
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-20 h-20 rounded-xl mx-auto mb-3 object-cover"
            />
          )}
          <h4 className="text-lg font-medium text-white/90 truncate px-2 mb-1">
            {currentVideo.title}
          </h4>
          <p className="text-sm text-white/50 truncate px-2 font-light">
            {currentVideo.channelTitle || "YouTube Music"}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
          disabled={!currentVideo}
        >
          <SkipBack className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <button
          onClick={handlePlayPause}
          className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center text-white"
          disabled={!currentVideo && searchResults.length === 0}
        >
          {isPlayingVideo ? (
            <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" strokeWidth={2} fill="currentColor" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" strokeWidth={2} fill="currentColor" />
          )}
        </button>

        <button
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 disabled:opacity-50"
          disabled={!currentVideo}
        >
          <SkipForward className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-light">Volume</span>
          <span className="text-xs text-white/90 font-light">{volume}%</span>
        </div>
        <div className="relative h-1 bg-white/10 rounded-full group">
          <div
            className="absolute h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${volume}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Disconnect Button */}
      {onDisconnect && (
        <button
          onClick={onDisconnect}
          className="w-full px-4 py-2 rounded-xl bg-transparent hover:bg-red-500/20 text-red-400 font-medium transition-colors border border-red-500/30"
        >
          Desconectar YouTube Music
        </button>
      )}
    </div>
  );
};

