import React, { useState } from "react";
import { Plus, Check, Trash2, Play, Eye } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { Task } from "../FocusApp";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TaskDetailsModal } from "../TaskDetailsModal";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TasksWidgetProps {
  onClose: () => void;
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

type TagOption = {
  id: number;
  name: string;
  color?: string;
};

const backendTaskToFrontendTask = (backendTask: BackendTask): Task => {
  return {
    id: backendTask.id.toString(),
    name: backendTask.title,
    estimatedTime: backendTask.estimatedDurationMinutes || 25,
    isCompleted: backendTask.isCompleted,
    isActive: false,
  };
};

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  onClose,
  onTaskStart,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [taskName, setTaskName] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: backendTasks = [],
    isLoading: isLoadingTasks,
  } = useQuery<BackendTask[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((res) => res.data),
  });

  const tasks = backendTasks.map(backendTaskToFrontendTask);

  const { data: tagOptions = [] } = useQuery<TagOption[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((res) => res.data),
  });

  const { mutate: createTask, isPending: isCreatingTask } = useMutation<
    BackendTask,
    Error,
    any
  >({
    mutationFn: (newTask) =>
      api.post("/tasks", newTask).then((res) => res.data),
    onSuccess: async (createdTask) => {
      if (selectedTagIds.length > 0 && createdTask?.id) {
        await Promise.all(
          selectedTagIds.map((tagId) =>
            api.post(`/tags/${tagId}/tasks/${createdTask.id}`)
          )
        ).catch(() => {
          toast({
            title: "Erro ao vincular tags",
            description: "Algumas tags não foram adicionadas.",
            variant: "destructive",
          });
        });
      }

      toast({
        title: "Tarefa criada!",
        description: "Sua nova tarefa foi adicionada à lista.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTaskName("");
      setSelectedTagIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tarefa",
        description:
          error.response?.data?.message || "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    },
  });

  const { mutate: createTagQuick, isPending: isCreatingTag } = useMutation({
    mutationFn: (name: string) =>
      api.post("/tags", { name }).then((res) => res.data),
    onSuccess: (tag: TagOption) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName("");
      toast({
        title: "Tag criada",
        description: "Tag disponível para uso imediato.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description:
          error.response?.data?.message ||
          "Não foi possível criar a tag agora.",
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    },
  });

  const { mutate: updateTask } = useMutation<BackendTask, Error, any>({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.patch(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
    if (!taskName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o nome da tarefa.",
        variant: "destructive",
      });
      return;
    }

    createTask({
      title: taskName.trim(),
      description: taskName.trim(),
      priority: "MEDIUM" as const,
      estimatedDurationMinutes: 25,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      deleteTask(numericId);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      updateTask({ id: numericId, data: { isCompleted: true } });
    }
  };

  const handleViewTaskDetails = (taskId: string) => {
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      setSelectedTaskId(numericId);
      setShowTaskDetails(true);
    }
  };

  const handleToggleTagSelection = (tagId: number) => {
    setSelectedTagIds((prev) =>
    prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTagInline = () => {
    if (!newTagName.trim()) {
      return;
    }
    createTagQuick(newTagName.trim());
  };

  return (
    <>
      <WidgetContainer
        title="Gestão de Tarefas"
        onClose={onClose}
        className="w-96 max-h-[80vh] overflow-hidden"
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
      >
        <div className="p-6 space-y-4">
          {/* Add Task Input */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="O que você vai focar hoje?"
                className="flex-1 bg-transparent border-b border-white/20 focus:border-blue-500 outline-none px-2 py-2 text-white/90 placeholder:text-white/30 transition-colors font-light"
              />
              <motion.button
                type="submit"
                disabled={isCreatingTask || !taskName.trim()}
                className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </motion.button>
            </form>
          </div>

          <div className="space-y-3 border border-white/10 rounded-2xl p-4 bg-black/10">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                Tags
              </p>
              {selectedTagIds.length > 0 && (
                <span className="text-xs text-white/60">
                  {selectedTagIds.length} selecionada(s)
                </span>
              )}
            </div>
            {tagOptions.length === 0 ? (
              <p className="text-sm text-white/40">
                Nenhuma tag criada ainda. Adicione uma abaixo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
                  const isActive = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => handleToggleTagSelection(tag.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-xs transition-all",
                        isActive
                          ? "bg-blue-500/20 border-blue-500 text-blue-200"
                          : "border-white/10 text-white/70 hover:border-white/30"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Criar nova tag"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                className="flex-1 bg-transparent border-b border-white/20 focus:border-blue-500 outline-none px-2 py-2 text-white/90 placeholder:text-white/30 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={handleCreateTagInline}
                disabled={!newTagName.trim() || isCreatingTag}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white/80 disabled:opacity-40"
              >
                {isCreatingTag ? "Criando..." : "Adicionar"}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingTasks && (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Task List */}
          {!isLoadingTasks && tasks.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 transition-all ${
                    task.isCompleted ? "opacity-50" : ""
                  }`}
                >
                  {/* Custom Checkbox */}
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      task.isCompleted
                        ? "bg-blue-500 border-blue-500"
                        : "border-white/30 hover:border-white/50"
                    }`}
                  >
                    {task.isCompleted && (
                      <Check className="h-3 w-3 text-white" strokeWidth={2} />
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.isCompleted
                          ? "line-through text-white/50"
                          : "text-white/90"
                      }`}
                    >
                      {task.name}
                    </p>
                    <p className="text-xs text-white/50 font-light">
                      {task.estimatedTime} min
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewTaskDetails(task.id)}
                      className="h-7 w-7 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/60 hover:text-white/90"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    {!task.isCompleted && (
                      <button
                        onClick={() => onTaskStart(task)}
                        className="h-7 w-7 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/60 hover:text-white/90"
                      >
                        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="h-7 w-7 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center text-white/60 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingTasks && tasks.length === 0 && (
            <div className="text-center py-12 text-white/50">
              <p className="text-sm font-light">
                Nenhuma tarefa criada ainda. Adicione sua primeira tarefa para começar!
              </p>
            </div>
          )}
        </div>
      </WidgetContainer>

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
    </>
  );
};
