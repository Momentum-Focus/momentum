import React, { useState, useMemo } from "react";
import {
  Plus,
  Check,
  Trash2,
  Play,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Folder,
} from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { Task } from "../FocusApp";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TaskDetailsModal } from "../TaskDetailsModal";
import { AuthWall } from "../AuthWall";
import { useTheme } from "@/context/theme-context";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TasksWidgetProps {
  onClose: () => void;
  onTaskStart: (task: Task) => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
  isGuestMode?: boolean;
}

type BackendTask = {
  id: number;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  estimatedDurationMinutes?: number;
  estimatedSessions?: number;
  projectId?: number | null;
  project?: {
    id: number;
    name: string;
    color?: string | null;
  } | null;
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
    cycles: backendTask.estimatedSessions || undefined,
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
  isGuestMode = false,
}) => {
  const [taskName, setTaskName] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showAuthWall, setShowAuthWall] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load collapsed projects from localStorage
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("collapsedProjects");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            return new Set(Array.isArray(parsed) ? parsed : []);
          } catch {
            return new Set();
          }
        }
      }
      return new Set();
    }
  );
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: backendTasks = [], isLoading: isLoadingTasks } = useQuery<
    BackendTask[]
  >({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((res) => res.data),
    enabled: !isGuestMode,
  });

  const tasks = backendTasks.map(backendTaskToFrontendTask);

  // Agrupa tasks por projeto
  const groupedTasks = useMemo(() => {
    const groups: {
      projectId: number | null;
      projectName: string | null;
      projectColor: string | null;
      tasks: (Task & { backendTask: BackendTask })[];
    }[] = [];
    const projectMap = new Map<number | null, number>();

    backendTasks.forEach((backendTask) => {
      const task = backendTaskToFrontendTask(backendTask);
      const projectId = backendTask.projectId || null;
      const projectName = backendTask.project?.name || null;
      const projectColor = backendTask.project?.color || null;

      let groupIndex = projectMap.get(projectId);
      if (groupIndex === undefined) {
        groupIndex = groups.length;
        projectMap.set(projectId, groupIndex);
        groups.push({
          projectId,
          projectName,
          projectColor,
          tasks: [],
        });
      }

      groups[groupIndex].tasks.push({ ...task, backendTask });
    });

    return groups;
  }, [backendTasks]);

  const toggleProjectCollapse = (projectId: number | null) => {
    setCollapsedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId ?? -1)) {
        newSet.delete(projectId ?? -1);
      } else {
        newSet.add(projectId ?? -1);
      }
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "collapsedProjects",
          JSON.stringify(Array.from(newSet))
        );
      }
      return newSet;
    });
  };

  const { data: tagOptions = [] } = useQuery<TagOption[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((res) => res.data),
    enabled: !isGuestMode,
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

  const { mutate: deleteTag } = useMutation<{ message: string }, Error, number>(
    {
      mutationFn: (tagId) =>
        api.delete(`/tags/${tagId}`).then((res) => res.data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tags"] });
        toast({
          title: "Tag excluída",
          description: "A tag foi excluída com sucesso.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erro ao excluir tag",
          description:
            error.response?.data?.message || "Não foi possível excluir a tag.",
          variant: "destructive",
        });
      },
    }
  );

  const handleDeleteSelectedTags = () => {
    if (selectedTagIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTags = () => {
    // Delete all selected tags (will be removed from list via query invalidation)
    selectedTagIds.forEach((tagId) => {
      deleteTag(tagId);
    });
    // Clear selection immediately
    setSelectedTagIds([]);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isGuestMode) {
      setShowAuthWall(true);
      return;
    }

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
    if (isGuestMode) {
      setShowAuthWall(true);
      return;
    }
    const numericId = parseInt(taskId);
    if (!isNaN(numericId)) {
      deleteTask(numericId);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    if (isGuestMode) {
      setShowAuthWall(true);
      return;
    }
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
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTagInline = () => {
    if (isGuestMode) {
      setShowAuthWall(true);
      return;
    }
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
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="O que você vai focar hoje?"
                className="flex-1 bg-transparent border-b border-white/20 outline-none px-2 py-2 text-white/90 placeholder:text-white/30 transition-colors font-light"
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = themeColor)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")
                }
              />
              <motion.button
                type="submit"
                disabled={isCreatingTask || !taskName.trim()}
                className="h-8 w-8 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
                style={{
                  backgroundColor: themeColor,
                }}
                onMouseEnter={(e) => {
                  if (!isCreatingTask && taskName.trim()) {
                    e.currentTarget.style.filter = "brightness(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1)";
                }}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {selectedTagIds.length} selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSelectedTags()}
                    className="h-5 w-5 rounded-full bg-red-500/90 hover:bg-red-500 border border-red-400/50 flex items-center justify-center transition-colors"
                    title="Excluir tags selecionadas"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
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
                  const tagColor = tag.color || "#3B82F6";
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => handleToggleTagSelection(tag.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs transition-all font-light",
                        isActive
                          ? "text-white shadow-lg"
                          : "text-white/70 hover:text-white/90"
                      )}
                      style={{
                        backgroundColor: isActive ? tagColor : `${tagColor}20`,
                        border: `1px solid ${
                          isActive ? tagColor : `${tagColor}40`
                        }`,
                      }}
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
          {!isLoadingTasks && groupedTasks.length > 0 && (
            <div className="relative">
              <div className="space-y-2 max-h-[calc(3*80px+8px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {(() => {
                  let visibleCount = 0;
                  let fadeItemFound = false;

                  return groupedTasks.map((group, groupIndex) => {
                    const isCollapsed = collapsedProjects.has(
                      group.projectId ?? -1
                    );
                    const projectKey = group.projectId ?? -1;
                    const visibleTasks = isCollapsed ? [] : group.tasks;

                    return (
                      <div key={projectKey} className="space-y-2">
                        {/* Project Header (se tiver projeto) */}
                        {group.projectName && (
                          <button
                            onClick={() =>
                              toggleProjectCollapse(group.projectId)
                            }
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  group.projectColor || "#3B82F6",
                              }}
                            />
                            <Folder className="h-3 w-3 text-white/60" />
                            <span className="text-xs font-medium text-white/70 flex-1 text-left">
                              {group.projectName}
                            </span>
                            <span className="text-xs text-white/40">
                              {group.tasks.length}
                            </span>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-white/40" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-white/40" />
                            )}
                          </button>
                        )}

                        {/* Tasks do grupo */}
                        {visibleTasks.map((task, taskIndex) => {
                          const isVisible = visibleCount < 3;
                          const isFadeItem =
                            visibleCount === 3 && !fadeItemFound;

                          if (isFadeItem) {
                            fadeItemFound = true;
                            visibleCount++;
                            return (
                              <div
                                key={task.id}
                                className="relative opacity-40 pointer-events-none"
                              >
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
                                  <div className="h-5 w-5 rounded-full border-2 border-white/30" />
                                  <div className="flex-1">
                                    <div className="h-4 bg-white/20 rounded w-3/4 mb-1" />
                                    <div className="h-3 bg-white/10 rounded w-1/4" />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (!isVisible) {
                            visibleCount++;
                            return null;
                          }

                          visibleCount++;

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                task.isCompleted ? "opacity-50" : "",
                                group.projectColor
                                  ? "bg-black/20 hover:bg-black/30"
                                  : "bg-black/20 hover:bg-black/30"
                              )}
                              style={{
                                borderLeftColor: group.projectColor
                                  ? group.projectColor
                                  : undefined,
                                borderLeftWidth: group.projectColor ? 3 : 1,
                              }}
                            >
                              {/* Custom Checkbox */}
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className={cn(
                                  "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                  task.isCompleted
                                    ? "border-white/30 hover:border-white/50"
                                    : "border-white/30 hover:border-white/50"
                                )}
                                style={
                                  task.isCompleted
                                    ? {
                                        backgroundColor: themeColor,
                                        borderColor: themeColor,
                                      }
                                    : {}
                                }
                              >
                                {task.isCompleted && (
                                  <Check
                                    className="h-3 w-3 text-white"
                                    strokeWidth={2}
                                  />
                                )}
                              </button>

                              {/* Task Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    task.isCompleted
                                      ? "line-through text-white/50"
                                      : "text-white/90"
                                  )}
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
                                  <Eye
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </button>
                                {!task.isCompleted && (
                                  <button
                                    onClick={() => onTaskStart(task)}
                                    className="h-7 w-7 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/60 hover:text-white/90"
                                  >
                                    <Play
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="h-7 w-7 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center text-white/60 hover:text-red-400"
                                >
                                  <Trash2
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingTasks && groupedTasks.length === 0 && (
            <div className="text-center py-12 text-white/50">
              <p className="text-sm font-light">
                Nenhuma tarefa criada ainda. Adicione sua primeira tarefa para
                começar!
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
      <AuthWall
        open={showAuthWall}
        onOpenChange={setShowAuthWall}
        message="Criar e gerenciar tarefas requer autenticação. Faça login ou crie uma conta para continuar."
      />

      {/* Delete Tags Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#0F1115]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl p-0 max-w-md">
          <AlertDialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl font-light text-white/90">
                Excluir {selectedTagIds.length === 1 ? "tag" : "tags"}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-white/60 font-light leading-relaxed pt-2">
              {selectedTagIds.length === 1
                ? "Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita."
                : `Tem certeza que deseja excluir ${selectedTagIds.length} tags selecionadas? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 pt-4 flex-row justify-end gap-3">
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white/90 rounded-full px-6 font-light">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTags}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 font-light"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
