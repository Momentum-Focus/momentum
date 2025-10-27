import React, { useState } from 'react';
import { Plus, Play, Check, Trash2, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DraggableWidget } from './DraggableWidget';
import { Task } from '../FocusApp';
import { useToast } from '@/hooks/use-toast';

interface TasksWidgetProps {
  onClose: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onTaskStart: (task: Task) => void;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  onClose,
  tasks,
  setTasks,
  onTaskStart,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [cycles, setCycles] = useState('');
  const [breakDuration, setBreakDuration] = useState('');
  const [breakCount, setBreakCount] = useState('');
  const { toast } = useToast();

  const showAdvancedFields = parseInt(estimatedTime) > 30;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim() || !estimatedTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome da tarefa e tempo estimado.",
        variant: "destructive",
      });
      return;
    }

    // Validação para campos avançados obrigatórios quando tempo > 30 min
    if (showAdvancedFields && (!cycles || !breakDuration || !breakCount)) {
      toast({
        title: "Campos obrigatórios",
        description: "Para tarefas acima de 30 minutos, todos os campos de configuração do Pomodoro são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName.trim(),
      estimatedTime: parseInt(estimatedTime),
      ...(showAdvancedFields && {
        cycles: cycles ? parseInt(cycles) : undefined,
        breakDuration: breakDuration ? parseInt(breakDuration) : undefined,
        breakCount: breakCount ? parseInt(breakCount) : undefined,
      }),
    };

    setTasks(prev => [...prev, newTask]);
    
    // Reset form
    setTaskName('');
    setEstimatedTime('');
    setCycles('');
    setBreakDuration('');
    setBreakCount('');
    setShowForm(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, isCompleted: true, isActive: false }
        : task
    ));
  };

  return (
    <DraggableWidget
      title="Gestão de Tarefas"
      onClose={onClose}
      className="w-96 max-h-[80vh] overflow-hidden"
    >
      <div className="p-6 space-y-4">
        {/* Add Task Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-primary hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        )}

        {/* Add Task Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gradient-subtle rounded-lg border border-widget-border">
            <div>
              <Label htmlFor="taskName">Nome da Tarefa</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Ex: Estudar React"
                required
              />
            </div>

            <div>
              <Label htmlFor="estimatedTime">Estimativa de Tempo (minutos)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="Ex: 45"
                min="1"
                required
              />
            </div>

            {/* Advanced Fields - Conditional */}
            {showAdvancedFields && (
              <div className="space-y-4 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm text-muted-foreground">
                  ⚡ Tarefa longa detectada! Configure os ciclos Pomodoro:
                </p>
                
                <div>
                  <Label htmlFor="cycles">Quantos Ciclos Pomodoro? *</Label>
                  <Input
                    id="cycles"
                    type="number"
                    value={cycles}
                    onChange={(e) => setCycles(e.target.value)}
                    placeholder="Ex: 3"
                    min="1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="breakDuration">Duração da Pausa (min) *</Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(e.target.value)}
                      placeholder="5"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="breakCount">Número de Pausas *</Label>
                    <Input
                      id="breakCount"
                      type="number"
                      value={breakCount}
                      onChange={(e) => setBreakCount(e.target.value)}
                      placeholder="2"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Criar Tarefa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {/* Task List */}
        {tasks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-medium text-muted-foreground">Suas Tarefas</h3>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all ${
                    task.isCompleted
                      ? 'bg-success/10 border-success/20'
                      : task.isActive
                      ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                      : 'bg-widget-background border-widget-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {task.estimatedTime} min
                        {task.cycles && ` • ${task.cycles} ciclos`}
                      </p>
                      {task.isActive && (
                        <p className="text-xs text-primary font-medium">🎯 Ativa</p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {!task.isCompleted && !task.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTaskStart(task)}
                          className="hover:bg-primary/10"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {!task.isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteTask(task.id)}
                          className="hover:bg-success/10"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTask(task.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tasks.length === 0 && !showForm && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa criada ainda.</p>
            <p className="text-sm">Adicione sua primeira tarefa para começar!</p>
          </div>
        )}
      </div>
    </DraggableWidget>
  );
};