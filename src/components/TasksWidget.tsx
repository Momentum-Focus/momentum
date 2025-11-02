import React, { useState } from 'react';
import { Plus, Play, Check, Trash2, CheckSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DraggableWidget } from './DraggableWidget';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useForm, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Project {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority?: TaskPriority;
  isCompleted: boolean;
  projectId?: number;
  project?: Project;
}

type TaskFormInputs = {
  title: string;
  priority: TaskPriority;
};

interface TasksWidgetProps {
  onClose: () => void;
  onTaskStart: (task: Task) => void;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  onClose,
  onTaskStart,
}) => {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormInputs>({
    defaultValues: {
      title: '',
      priority: 'MEDIUM',
    },
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
  } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((res) => res.data),
  });

  const invalidateTasksQuery = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const { mutate: createTask, isPending: isCreatingTask } = useMutation<
    Task,
    Error,
    TaskFormInputs
  >({
    mutationFn: (newTask) =>
      api.post('/tasks', newTask).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: 'Tarefa criada!',
        description: 'Sua nova tarefa foi adicionada à lista.',
      });
      invalidateTasksQuery();
      reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar tarefa',
        description:
          error.response?.data?.message || 'Não foi possível criar a tarefa.',
        variant: 'destructive',
      });
    },
  });

  const { mutate: updateTask } = useMutation<
    Task,
    Error,
    { id: number; data: Partial<Task> }
  >({
    mutationFn: ({ id, data }) =>
      api.patch(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: (updatedTask) => {
      toast({
        title: updatedTask.isCompleted
          ? 'Tarefa Concluída!'
          : 'Tarefa Atualizada!',
      });
      invalidateTasksQuery();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar tarefa',
        description:
          error.response?.data?.message || 'Não foi possível atualizar a tarefa.',
        variant: 'destructive',
      });
    },
  });

  const { mutate: deleteTask } = useMutation<
    { message: string },
    Error,
    number
  >({
    mutationFn: (id) => api.delete(`/tasks/${id}`).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: 'Tarefa deletada',
      });
      invalidateTasksQuery();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao deletar tarefa',
        description:
          error.response?.data?.message || 'Não foi possível deletar a tarefa.',
        variant: 'destructive',
      });
    },
  });

  const handleFormSubmit = (data: TaskFormInputs) => {
    createTask(data);
  };

  const handleCompleteTask = (id: number) => {
    updateTask({ id, data: { isCompleted: true } });
  };

  const handleDeleteTask = (id: number) => {
    deleteTask(id);
  };

  const getPriorityClasses = (priority?: TaskPriority) => {
    switch (priority) {
      case 'HIGH':
        return 'border-l-orange-500';
      case 'URGENT':
        return 'border-l-red-500';
      case 'LOW':
        return 'border-l-blue-400';
      case 'MEDIUM':
      default:
        return 'border-l-gray-400';
    }
  };

  return (
    <DraggableWidget
      title="Minhas Tarefas"
      onClose={onClose}
      className="w-96"
      defaultPosition={{ x: 50, y: 120 }}
    >
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4 p-4 border rounded-md bg-muted/50"
          >
            <div className="space-y-2">
              <Label htmlFor="taskName">Nome da Tarefa</Label>
              <Input
                id="taskName"
                placeholder="Ex: Estudar React Hooks"
                {...register('title', {
                  required: 'O título é obrigatório',
                })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Definir prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="MEDIUM">Média</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Separator />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreatingTask}
              >
                {isCreatingTask ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        )}

        <Separator />

        {isLoadingTasks && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isErrorTasks && (
           <div className="text-center py-8 text-destructive">
             <p>Erro ao carregar tarefas.</p>
           </div>
        )}

        {!isLoadingTasks && !isErrorTasks && tasks.length > 0 && (
          <>
            <div className="space-y-2">
              {tasks.filter(task => !task.isCompleted).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 bg-card rounded-md border border-l-4 ${getPriorityClasses(task.priority)}`}
                >
                  <span className="font-medium text-sm">{task.title}</span>
                  
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTaskStart(task)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteTask(task.id)}
                      className="hover:bg-success/10"
                    >
                      <Check className="h-3 w-3" />
                    </Button>

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
              ))}
            </div>

            {tasks.filter(task => task.isCompleted).length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  Concluídas
                </h4>
                <div className="space-y-2">
                  {tasks.filter(task => task.isCompleted).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-card/60 rounded-md border"
                    >
                      <span className="font-medium text-sm text-muted-foreground line-through">
                        {task.title}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTask(task.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {!isLoadingTasks && tasks.length === 0 && !showForm && (
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