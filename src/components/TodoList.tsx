// src/components/TodoList.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Check, 
  Trash2, 
  Edit2, 
  Plus, 
  Circle, 
  CheckCircle2,
  X
} from 'lucide-react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'active' | 'completed';

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  useEffect(() => {
    loadTodos();
  }, []);
  
  const loadTodos = () => {
    const savedTodos = localStorage.getItem(`todos_${currentUser.id}`);
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  };
  
  const saveTodos = (newTodos: Todo[]) => {
    localStorage.setItem(`todos_${currentUser.id}`, JSON.stringify(newTodos));
    setTodos(newTodos);
  };
  
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    const newTodo: Todo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedTodos = [...todos, newTodo];
    saveTodos(updatedTodos);
    setInputValue('');
  };
  
  const toggleTodo = (id: number) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos(updatedTodos);
  };
  
  const deleteTodo = (id: number) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    saveTodos(updatedTodos);
  };
  
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };
  
  const saveEdit = (id: number) => {
    if (editingText.trim() === '') return;
    
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, text: editingText.trim() } : todo
    );
    saveTodos(updatedTodos);
    setEditingId(null);
    setEditingText('');
  };
  
  const getFilteredTodos = () => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  };
  
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const activeTodos = totalTodos - completedTodos;
  
  const filteredTodos = getFilteredTodos();

  return (
    <Card className="w-full transform transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <span>Minhas Tarefas</span>
          </span>
          <div className="text-sm font-normal text-gray-500 transition-all duration-300">
            {activeTodos} ativa{activeTodos !== 1 ? 's' : ''} • {completedTodos} completa{completedTodos !== 1 ? 's' : ''}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Formulário com animação */}
        <form onSubmit={addTodo} className="flex gap-2">
          <Input
            type="text"
            placeholder="Adicionar nova tarefa..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 transition-all duration-200 focus:scale-[1.02]"
          />
          <Button 
            type="submit" 
            size="icon"
            className="transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          </Button>
        </form>
        
        {/* Filtros com animação */}
        <div className="flex gap-2 justify-center border-b pb-3">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Todas ({totalTodos})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('active')}
            className="transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Ativas ({activeTodos})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('completed')}
            className="transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Completas ({completedTodos})
          </Button>
        </div>
        
        {/* Lista de tarefas com animações */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">
              {filter === 'all' && '✨ Nenhuma tarefa ainda. Adicione uma acima!'}
              {filter === 'active' && '✅ Nenhuma tarefa ativa no momento.'}
              {filter === 'completed' && '🎯 Nenhuma tarefa completada ainda.'}
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] ${
                  todo.completed
                    ? 'bg-gray-50 border-gray-200 opacity-75'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                }}
              >
                {/* Checkbox animado */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="flex-shrink-0 transition-all duration-300 hover:scale-125 active:scale-90"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 animate-bounce-in" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 hover:text-blue-500 transition-colors duration-200" />
                  )}
                </button>
                
                {editingId === todo.id ? (
                  <div className="flex-1 flex gap-2 animate-scale-in">
                    <Input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(todo.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 transition-all duration-200"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => saveEdit(todo.id)}
                      className="transition-all duration-200 hover:scale-110 hover:bg-green-100 active:scale-95"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="transition-all duration-200 hover:scale-110 hover:bg-red-100 active:scale-95"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`flex-1 transition-all duration-300 ${
                        todo.completed
                          ? 'line-through text-gray-400'
                          : 'text-gray-700'
                      }`}
                    >
                      {todo.text}
                    </span>
                    
                    {/* Botões de ação animados */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(todo)}
                        className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-blue-100 active:scale-95"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600 transition-transform duration-200 hover:rotate-12" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTodo(todo.id)}
                        className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-red-100 active:scale-95"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 transition-transform duration-200 hover:rotate-12" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Estatísticas com animação */}
        {totalTodos > 0 && (
          <div className="pt-3 border-t text-center text-sm text-gray-500 transition-all duration-300">
            {completedTodos === totalTodos ? (
              <span className="text-green-600 font-medium animate-bounce-in inline-flex items-center gap-2">
                🎉 Parabéns! Todas as tarefas completadas!
              </span>
            ) : (
              <span className="transition-all duration-300">
                Você completou {completedTodos} de {totalTodos} tarefa{totalTodos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Adiciona keyframes no componente
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes bounce-in {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  .animate-scale-in {
    animation: scale-in 0.3s ease-out;
  }
  
  .group:hover .group-hover\\:opacity-100 {
    opacity: 1;
  }
`;
document.head.appendChild(style);
