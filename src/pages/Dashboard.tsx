import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PomodoroWidget } from '@/components/PomodoroWidget';
import { TasksWidget, Task } from '@/components/TasksWidget';
import { LogOut, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { MusicWidget } from '@/components/MusicWidget';

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [showMusic, setShowMusic] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showPomodoro, setShowPomodoro] = useState(true);

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isErrorUser,
  } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: () => api.get('/user/me').then((res) => res.data),
    retry: 1,
  });

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    queryClient.clear();
    navigate('/login');
  };

  const handleTaskStart = (task: Task) => {
    setActiveTask(task);
    setShowPomodoro(true);
  };
  
  const handleTaskComplete = () => {
    setActiveTask(null);
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isErrorUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro de Autenticação</h2>
        <p className="text-muted-foreground mb-4">
          Não foi possível carregar seu perfil. Sua sessão pode ter expirado.
        </p>
        <Button onClick={handleLogout}>Voltar para o Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b transition-all duration-300 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 hover:scale-110 hover:rotate-12">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-foreground dark:text-gray-100">
                Olá, {user?.name}!
              </h2>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Pronto para focar?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-slide-in-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTasks(!showTasks)}
            >
              Tarefas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMusic(!showMusic)}
            >
              Música
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="pt-24">
        {showPomodoro && (
           <PomodoroWidget
            onClose={() => setShowPomodoro(false)}
            activeTask={activeTask}
            onTaskComplete={handleTaskComplete}
          />
        )}

        {showTasks && (
          <TasksWidget
            onClose={() => setShowTasks(false)}
            onTaskStart={handleTaskStart}
          />
        )}
        
        {showMusic && (
          <MusicWidget onClose={() => setShowMusic(false)} />
        )}
      </main>
    </div>
  );
}