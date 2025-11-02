// src/components/PomodoroTimer.tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

// Tipos de sessão
type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export default function PomodoroTimer() {
  // CONFIGURAÇÕES (em minutos)
  const [focusTime, setFocusTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  
  // ESTADOS DO TIMER
  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [minutes, setMinutes] = useState(focusTime);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Referência para o intervalo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Efeito que roda o timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completou!
            handleSessionComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    // Limpeza: remove o intervalo quando o componente for desmontado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, minutes, seconds]);
  
  // Função chamada quando uma sessão é completada
  const handleSessionComplete = () => {
    setIsActive(false);
    
    // Toca um som (opcional - você pode adicionar um arquivo de áudio)
    playNotificationSound();
    
    if (sessionType === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // A cada 4 sessões de foco, faz um intervalo longo
      if (newCompletedSessions % 4 === 0) {
        setSessionType('longBreak');
        setMinutes(longBreakTime);
      } else {
        setSessionType('shortBreak');
        setMinutes(shortBreakTime);
      }
    } else {
      // Se estava em intervalo, volta para foco
      setSessionType('focus');
      setMinutes(focusTime);
    }
    
    setSeconds(0);
  };
  
  // Função para tocar som de notificação
  const playNotificationSound = () => {
    // Cria um beep simples usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };
  
  // Inicia ou pausa o timer
  const toggleTimer = () => {
    setIsActive(!isActive);
  };
  
  // Reseta o timer
  const resetTimer = () => {
    setIsActive(false);
    setSeconds(0);
    
    if (sessionType === 'focus') {
      setMinutes(focusTime);
    } else if (sessionType === 'shortBreak') {
      setMinutes(shortBreakTime);
    } else {
      setMinutes(longBreakTime);
    }
  };
  
  // Muda o tipo de sessão manualmente
  const changeSession = (type: SessionType) => {
    setIsActive(false);
    setSessionType(type);
    setSeconds(0);
    
    if (type === 'focus') {
      setMinutes(focusTime);
    } else if (type === 'shortBreak') {
      setMinutes(shortBreakTime);
    } else {
      setMinutes(longBreakTime);
    }
  };
  
  // Formata o tempo para exibição (MM:SS)
  const formatTime = () => {
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  // Cores baseadas no tipo de sessão
  const getSessionColor = () => {
    switch (sessionType) {
      case 'focus':
        return 'bg-gradient-to-br from-red-500 to-orange-500';
      case 'shortBreak':
        return 'bg-gradient-to-br from-green-500 to-teal-500';
      case 'longBreak':
        return 'bg-gradient-to-br from-blue-500 to-purple-500';
    }
  };
  
  const getSessionLabel = () => {
    switch (sessionType) {
      case 'focus':
        return 'Foco';
      case 'shortBreak':
        return 'Intervalo Curto';
      case 'longBreak':
        return 'Intervalo Longo';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto transform transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-between">
          <span className="transition-all duration-300">Timer Pomodoro</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="transition-all duration-200 hover:scale-110 hover:rotate-90 active:scale-95"
          >
            <Settings className="h-5 w-5 transition-transform duration-300" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Configurações */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Configurações (minutos)</h3>
            <div className="space-y-2">
              <label className="text-sm">
                Tempo de Foco:
                <input
                  type="number"
                  value={focusTime}
                  onChange={(e) => setFocusTime(Number(e.target.value))}
                  className="ml-2 w-20 p-1 border rounded"
                  min="1"
                  max="60"
                />
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm">
                Intervalo Curto:
                <input
                  type="number"
                  value={shortBreakTime}
                  onChange={(e) => setShortBreakTime(Number(e.target.value))}
                  className="ml-2 w-20 p-1 border rounded"
                  min="1"
                  max="30"
                />
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm">
                Intervalo Longo:
                <input
                  type="number"
                  value={longBreakTime}
                  onChange={(e) => setLongBreakTime(Number(e.target.value))}
                  className="ml-2 w-20 p-1 border rounded"
                  min="1"
                  max="60"
                />
              </label>
            </div>
          </div>
        )}
        
        {/* Seletores de Sessão */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={sessionType === 'focus' ? 'default' : 'outline'}
            onClick={() => changeSession('focus')}
            disabled={isActive}
          >
            Foco
          </Button>
          <Button
            variant={sessionType === 'shortBreak' ? 'default' : 'outline'}
            onClick={() => changeSession('shortBreak')}
            disabled={isActive}
          >
            Intervalo
          </Button>
          <Button
            variant={sessionType === 'longBreak' ? 'default' : 'outline'}
            onClick={() => changeSession('longBreak')}
            disabled={isActive}
          >
            Descanso
          </Button>
        </div>
        
        {/* Display do Timer */}
        <div className={`${getSessionColor()} rounded-2xl p-8 text-white`}>
          <div className="text-center space-y-4">
            <div className="text-sm font-medium opacity-90">
              {getSessionLabel()}
            </div>
            <div className="text-6xl font-bold font-mono">
              {formatTime()}
            </div>
            <div className="text-sm opacity-75">
              Sessões completadas: {completedSessions}
            </div>
          </div>
        </div>
        
        {/* Controles */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={toggleTimer}
            size="lg"
            className="flex-1"
          >
            {isActive ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Iniciar
              </>
            )}
          </Button>
          
          <Button
            onClick={resetTimer}
            size="lg"
            variant="outline"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Informação sobre Pomodoro */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>💡 Técnica Pomodoro: trabalhe focado e faça pausas regulares</p>
          <p>🎯 A cada 4 sessões de foco, faça um descanso mais longo</p>
        </div>
      </CardContent>
    </Card>
  );
}
