// src/pages/Dashboard.tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PomodoroTimer from '@/components/PomodoroTimer';
import TodoList from '@/components/TodoList';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Pega as informações do usuário logado
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header com animação */}
      <header className="bg-white shadow-sm border-b transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 hover:scale-110 hover:rotate-12">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Olá, {currentUser.name}!
              </h2>
              <p className="text-sm text-gray-500">{currentUser.email}</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>
      
      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Momentum Focus
          </h1>
          <p className="text-gray-600">
            Gerencie seu tempo e aumente sua produtividade
          </p>
        </div>
        
        {/* Grid com Timer e TodoList */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Timer Pomodoro */}
          <div>
            <PomodoroTimer />
          </div>
          
          {/* Lista de Tarefas */}
          <div>
            <TodoList />
          </div>
        </div>
        
        {/* Área para futuras features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-lg mb-2">🎵 Músicas & Sons</h3>
            <p className="text-gray-600 text-sm mb-4">
              Em breve: sons ambiente e playlists para ajudar na concentração
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Chuva
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Café
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Natureza
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                Lo-fi
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-lg mb-2">🌄 Ambientes</h3>
            <p className="text-gray-600 text-sm mb-4">
              Em breve: backgrounds personalizados com vídeos e imagens
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-sky-100 text-sky-700 text-xs rounded-full">
                Praias
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                Montanhas
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                Cidades
              </span>
              <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">
                Espaço
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
