import React, { useState } from "react";
import { Plus, Play, Check, Trash2, CheckSquare, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DraggableWidget } from "./DraggableWidget";
import { Task } from "../FocusApp";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TaskDetailsModal } from "../TaskDetailsModal";

interface TasksWidgetProps {
  onClose: () => void;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  onTaskStart: (task: Task) => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

type BackendTask = {
  id: number;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  estimatedDurationMinutes?: number;
  estimatedSessions?: number;
};

// Função para converter Task do backend para Task do frontend
const backendTaskToFrontendTask = (backendTask: BackendTask): Task => {
  return {
    id: backendTask.id.toString(),
    name: backendTask.title,
    estimatedTime: backendTask.estimatedDurationMinutes || 25,
    isCompleted: backendTask.isCompleted,
    isActive: false,
  };
};

// Função para converter Task do frontend para formato do backend
const frontendTaskToBackendTask = (task: Task) => {
  return {
    title: task.name,
    description: task.name,
    priority: "MEDIUM" as const,
    estimatedDurationMinutes: task.estimatedTime,
    estimatedSessions: task.cycles,
  };
};

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  onClose,
  tasks: externalTasks,
  setTasks: externalSetTasks,
  onTaskStart,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [cycles, setCycles] = useState("");
  const [breakDuration, setBreakDuration] = useState("");
  const [breakCount, setBreakCount] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sempre busca do backend (ignora tasks externas se houver)
  const {
    data: backendTasks = [],
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
  } = useQuery<BackendTask[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((res) => res.data),
    enabled: true, // Sempre busca do backend
  });

  // Converter tasks do backend para o formato do frontend
  const tasks = backendTasks.map(backendTaskToFrontendTask);

  const showAdvancedFields = parseInt(estimatedTime) > 30;

  const invalidateTasksQuery = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const { mutate: createTask, isPending: isCreatingTask } = useMutation<
    BackendTask,
    Error,
    any
  >({
    mutationFn: (newTask) =>
      api.post("/tasks", newTask).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Tarefa criada!",
        description: "Sua nova tarefa foi adicionada à lista.",
      });
      invalidateTasksQuery();
      if (externalSetTasks) {
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
        externalSetTasks((prev) => [...prev, newTask]);
      }
      // Reset form
      setTaskName("");
      setEstimatedTime("");
      setCycles("");
      setBreakDuration("");
      setBreakCount("");
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tarefa",
        description:
          error.response?.data?.message || "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateTask } = useMutation<BackendTask, Error, any>({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.patch(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      invalidateTasksQuery();
      if (externalSetTasks) {
        // Se está usando estado externo, não precisa fazer nada pois o backend já atualizou
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description:
          error.response?.data?.message ||
          "Não foi possível atualizar a tarefa.",
        variant: "destructive",
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
        title: "Tarefa deletada",
      });
      invalidateTasksQuery();
      if (externalSetTasks) {
        // Se está usando estado externo, não precisa fazer nada pois o backend já deletou
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar tarefa",
        description:
          error.response?.data?.message || "Não foi possível deletar a tarefa.",
        variant: "destructive",
      });
    },
  });

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
        description:
          "Para tarefas acima de 30 minutos, todos os campos de configuração do Pomodoro são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newTaskData = {
      title: taskName.trim(),
      description: taskName.trim(),
      priority: "MEDIUM" as const,
      estimatedDurationMinutes: parseInt(estimatedTime),
      ...(showAdvancedFields && {
        estimatedSessions: cycles ? parseInt(cycles) : undefined,
      }),
    };

    createTask(newTaskData);
  };

  const handleDeleteTask = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      deleteTask(numericId);
    } else if (externalSetTasks) {
      // Se o ID não é numérico, está usando estado local
      externalSetTasks((prev) => prev.filter((task) => task.id !== taskId));
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      updateTask({ id: numericId, data: { isCompleted: true } });
    } else if (externalSetTasks) {
      externalSetTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, isCompleted: true, isActive: false }
            : task
        )
      );
    }
  };

  const handleViewTaskDetails = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      setSelectedTaskId(numericId);
      setShowTaskDetails(true);
    }
  };

  return (
    <DraggableWidget
      title="Gestão de Tarefas"
      onClose={onClose}
      className="w-96 max-h-[80vh] overflow-hidden"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
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
          <form
            onSubmit={handleSubmit}
            className="space-y-4 p-4 bg-gradient-subtle rounded-lg border border-widget-border"
          >
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
              <Label htmlFor="estimatedTime">
                Estimativa de Tempo (minutos)
              </Label>
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
                    <Label htmlFor="breakDuration">
                      Duração da Pausa (min) *
                    </Label>
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
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreatingTask}
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Tarefa"
                )}
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

        {/* Loading State */}
        {isLoadingTasks && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {isErrorTasks && (
          <div className="text-center py-8 text-destructive">
            <p>Erro ao carregar tarefas.</p>
          </div>
        )}

        {/* Task List */}
        {!isLoadingTasks && !isErrorTasks && tasks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-medium text-muted-foreground">
                Suas Tarefas
              </h3>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all ${
                    task.isCompleted
                      ? "bg-success/10 border-success/20"
                      : task.isActive
                      ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                      : "bg-widget-background border-widget-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          task.isCompleted
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {task.estimatedTime} min
                        {task.cycles && ` • ${task.cycles} ciclos`}
                      </p>
                      {task.isActive && (
                        <p className="text-xs text-primary font-medium">
                          🎯 Ativa
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTaskDetails(task.id)}
                        className="hover:bg-primary/10"
                        title="Ver detalhes"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
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

        {!isLoadingTasks && tasks.length === 0 && !showForm && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa criada ainda.</p>
            <p className="text-sm">
              Adicione sua primeira tarefa para começar!
            </p>
          </div>
        )}
      </div>
      <TaskDetailsModal
        taskId={selectedTaskId}
        open={showTaskDetails}
        onOpenChange={(open) => {
          setShowTaskDetails(open);
          if (!open) {
            setSelectedTaskId(null);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }
        }}
      />
    </DraggableWidget>
  );
};
