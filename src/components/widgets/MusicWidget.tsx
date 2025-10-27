import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DraggableWidget } from './DraggableWidget';

interface MusicWidgetProps {
  onClose: () => void;
}

export const MusicWidget: React.FC<MusicWidgetProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [currentTrack] = useState('Sons da Natureza - Chuva');

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <DraggableWidget
      title="Player de Música"
      onClose={onClose}
      className="w-80"
    >
      <div className="p-6 space-y-6">
        {/* Platform Connections */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Conectar Plataformas</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => alert('Conectar com Spotify em breve!')}
            >
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              Conectar com Spotify
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => alert('Conectar com YouTube Music em breve!')}
            >
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Y</span>
              </div>
              Conectar com YouTube Music
            </Button>
          </div>
        </div>

        {/* Current Track */}
        <div className="text-center py-4 bg-gradient-subtle rounded-lg border border-widget-border">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
            <Volume2 className="h-8 w-8 text-primary" />
          </div>
          <h4 className="font-medium text-foreground">{currentTrack}</h4>
          <p className="text-sm text-muted-foreground">Música de Foco</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="lg">
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="bg-gradient-primary hover:bg-primary-hover"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <Button variant="ghost" size="lg">
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

        {/* Preset Sounds */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Sons de Foco</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              🌧️ Chuva
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              🌊 Oceano
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              🔥 Lareira
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              🎵 Lo-fi
            </Button>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};