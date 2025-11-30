import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Zap,
  Edit2,
  Save,
  Coffee,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { CommentSection } from "./CommentSection";
import { TagManager } from "./TagManager";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  estimatedDurationMinutes?: number | null;
  estimatedSessions?: number | null;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
}

interface TaskDetailsModalProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityConfig = {
  LOW: {
    label: "Baixa",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  MEDIUM: {
    label: "Média",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  HIGH: {
    label: "Alta",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  URGENT: {
    label: "Urgente",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "Data não disponível";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data não disponível";

    // Formatação em português brasileiro
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "Data não disponível";
  }
};

// Smart Pomodoro Logic Functions
const calculateOptimalCycles = (totalMinutes: number): number => {
  if (totalMinutes <= 30) return 1;
  return Math.ceil(totalMinutes / 25);
};

const calculateCycleDuration = (
  totalMinutes: number,
  cycles: number
): number => {
  if (cycles === 0) return totalMinutes;
  return Math.round(totalMinutes / cycles);
};

const requiresLongBreak = (totalMinutes: number, cycles: number): boolean => {
  return totalMinutes > 60 || cycles >= 4;
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  taskId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [totalMinutes, setTotalMinutes] = useState<string>("");
  const [cycles, setCycles] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const isInitialLoad = useRef(true);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    data: task,
    isLoading,
    error: taskError,
  } = useQuery<Task>({
    queryKey: ["tasks", taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((res) => res.data),
    enabled: open && !!taskId,
    retry: 1,
  });

  // Initialize form state when task loads
  useEffect(() => {
    if (task && task.id) {
      setTitle(task.title || "");
      // Ensure description is separate from title - don't use title as description
      setDescription(task.description || "");
      setPriority(task.priority || "MEDIUM");

      // Handle totalMinutes - allow empty string for editing
      const duration = task.estimatedDurationMinutes;
      setTotalMinutes(duration && duration > 0 ? duration.toString() : "");

      const sessions = task.estimatedSessions;
      setCycles(sessions && sessions > 0 ? sessions : 1);

      setEditingTitle(false);
      setHasChanges(false);
      isInitialLoad.current = true;

      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    }
  }, [task]);

  // Convert totalMinutes string to number for calculations
  const totalMinutesNum = totalMinutes === "" ? 0 : Number(totalMinutes);

  // Smart Pomodoro calculations
  const isLongTask = totalMinutesNum > 30;
  const cycleDuration = calculateCycleDuration(totalMinutesNum, cycles);
  const needsLongBreak = requiresLongBreak(totalMinutesNum, cycles);
  const shortBreaks = cycles > 1 ? cycles - 1 : 0;

  // Auto-adjust cycles when duration changes
  useEffect(() => {
    if (!task || isInitialLoad.current || totalMinutes === "") return;

    const numValue = Number(totalMinutes);
    if (isNaN(numValue) || numValue < 1) return;

    if (numValue <= 30) {
      if (cycles !== 1) {
        setCycles(1);
        setHasChanges(true);
      }
    } else {
      const optimal = calculateOptimalCycles(numValue);
      if (cycles !== optimal) {
        setCycles(optimal);
        setHasChanges(true);
      }
    }
  }, [totalMinutes]);

  const { mutate: updateTask } = useMutation({
    mutationFn: (data: Partial<Task>) => api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTitle(false);
      setHasChanges(false);
      setIsSaving(false);
      toast({
        title: "Tarefa atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast({
        title: "Erro ao salvar",
        description:
          error.response?.data?.message ||
          "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!taskId) return;
    setIsSaving(true);

    const numMinutes = totalMinutes === "" ? null : Number(totalMinutes);

    updateTask({
      title,
      description: description || null,
      priority,
      estimatedDurationMinutes:
        numMinutes && numMinutes > 0 ? numMinutes : null,
      estimatedSessions: cycles > 0 ? cycles : null,
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasChanges(true);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setHasChanges(true);
  };

  const handleTotalMinutesChange = (value: string) => {
    // Always allow empty string to clear input
    if (value === "" || value === "-") {
      setTotalMinutes("");
      setHasChanges(true);
      return;
    }

    // Only allow numbers (including decimals for user typing)
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTotalMinutes(value);
      setHasChanges(true);
    }
  };

  // Validate and normalize on blur
  const handleTotalMinutesBlur = () => {
    if (totalMinutes === "" || totalMinutes === "-") {
      return; // Keep empty if user cleared it
    }
    const numValue = Number(totalMinutes);
    if (isNaN(numValue) || numValue < 1) {
      // Reset to empty if invalid
      setTotalMinutes("");
    } else {
      // Ensure it's a valid integer
      setTotalMinutes(Math.floor(numValue).toString());
    }
  };

  const handleCyclesChange = (value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 8) {
      setCycles(numValue);
      setHasChanges(true);
    }
  };

  const handlePriorityChange = (newPriority: Task["priority"]) => {
    setPriority(newPriority);
    setHasChanges(true);
  };

  const resetForm = () => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "MEDIUM");
      const duration = task.estimatedDurationMinutes;
      setTotalMinutes(duration && duration > 0 ? duration.toString() : "");
      const sessions = task.estimatedSessions;
      setCycles(sessions && sessions > 0 ? sessions : 1);
      setEditingTitle(false);
      setHasChanges(false);
    }
  };

  if (!open || !taskId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-[#0F1115]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl [&>button]:hidden !grid grid-rows-[auto_1fr_auto] h-[90vh]">
        {/* Accessibility */}
        <DialogTitle className="sr-only">Detalhes da Tarefa</DialogTitle>
        <DialogDescription className="sr-only">
          Visualize e gerencie todos os detalhes da tarefa, incluindo estimativa
          de tempo, ciclos Pomodoro, tags e comentários
        </DialogDescription>

        {/* Header - Fixed */}
        <div className="flex items-start justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 pr-4">
            {editingTitle ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false);
                  }
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                    if (task) {
                      setTitle(task.title || "");
                    }
                  }
                }}
                className="text-3xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white/90 placeholder:text-white/40 font-medium"
                placeholder="Título da tarefa"
                autoFocus
              />
            ) : (
              <h2
                className="text-3xl font-bold text-white/90 cursor-text hover:text-white transition-colors group"
                onClick={() => {
                  setEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
              >
                {title || task?.title || "Sem título"}
                <Edit2 className="inline-block h-4 w-4 ml-2 opacity-0 group-hover:opacity-50 text-white/40 transition-opacity" />
              </h2>
            )}

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {/* Priority Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 border rounded-full px-3 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity text-white",
                      priority && priorityConfig[priority].color
                    )}
                  >
                    {priority && (
                      <>
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0",
                            priority === "LOW" && "bg-green-400",
                            priority === "MEDIUM" && "bg-yellow-400",
                            priority === "HIGH" && "bg-orange-400",
                            priority === "URGENT" && "bg-red-400"
                          )}
                        />
                        {priorityConfig[priority].label}
                      </>
                    )}
                    <ChevronDown className="ml-1.5 h-3 w-3 text-white/70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1A1D23] backdrop-blur-xl border border-white/10 rounded-xl p-1 min-w-[140px]">
                  {(
                    Object.keys(priorityConfig) as Array<
                      keyof typeof priorityConfig
                    >
                  ).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handlePriorityChange(key)}
                      className={cn(
                        "cursor-pointer rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors",
                        priority === key && "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full mr-2.5 flex-shrink-0",
                          key === "LOW" && "bg-green-400",
                          key === "MEDIUM" && "bg-yellow-400",
                          key === "HIGH" && "bg-orange-400",
                          key === "URGENT" && "bg-red-400"
                        )}
                      />
                      <span className="text-white/90">
                        {priorityConfig[key].label}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date */}
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Calendar className="h-3 w-3" />
                <span>Criado em {formatDate(task?.createdAt)}</span>
              </div>

              {/* Completed Badge */}
              {task?.isCompleted && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 h-7 px-3 rounded-full">
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Concluída
                </Badge>
              )}
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 text-white/40 hover:text-white/90 hover:bg-transparent rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-white/60">Carregando...</p>
            </div>
          ) : taskError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <p className="text-red-400">Erro ao carregar tarefa</p>
              <p className="text-white/40 text-sm">
                {taskError instanceof Error
                  ? taskError.message
                  : "Não foi possível carregar os detalhes da tarefa"}
              </p>
            </div>
          ) : task ? (
            <>
              {/* Smart Pomodoro Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/60" />
                  <h3 className="text-xs uppercase tracking-wide text-white/40 font-light">
                    Estimativa de Tempo
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-white/40 font-light">
                      Tempo Total Estimado (minutos)
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={totalMinutes}
                      onChange={(e) => handleTotalMinutesChange(e.target.value)}
                      onBlur={handleTotalMinutesBlur}
                      placeholder="Ex: 60"
                      className="bg-white/5 border-none text-white/90 rounded-2xl h-12 text-center text-lg focus:ring-1 focus:outline-none focus:border-none placeholder:text-white/30"
                      onFocus={(e) =>
                        (e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`)
                      }
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    />
                  </div>

                  {/* Long Task Planning */}
                  <AnimatePresence>
                    {isLongTask && totalMinutesNum > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-4"
                      >
                        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm font-semibold text-yellow-400">
                              Planejamento de Foco
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-xs text-white/70 font-medium">
                                Quantidade de Ciclos
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="8"
                                value={cycles}
                                onChange={(e) =>
                                  handleCyclesChange(e.target.value)
                                }
                                className="bg-white/5 border-none text-white/90 rounded-xl h-10 text-center focus:ring-1 focus:outline-none focus:border-none"
                                onFocus={(e) =>
                                  (e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`)
                                }
                                onBlur={(e) =>
                                  (e.currentTarget.style.boxShadow = "none")
                                }
                              />
                            </div>

                            <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
                              <p className="text-xs text-white/60">
                                <span className="font-semibold text-white/80">
                                  {cycleDuration}min
                                </span>{" "}
                                de foco por ciclo
                              </p>
                              {shortBreaks > 0 && (
                                <p className="text-xs text-white/60">
                                  <span className="font-semibold text-white/80">
                                    {shortBreaks}
                                  </span>{" "}
                                  pausa(s) curta(s) de 5min
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Long Break Warning */}
                          {needsLongBreak && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-xl p-3 flex items-start gap-2.5 border"
                              style={{
                                backgroundColor: `${themeColor}10`,
                                borderColor: `${themeColor}30`,
                              }}
                            >
                              <Coffee
                                className="h-4 w-4 mt-0.5 flex-shrink-0"
                                style={{ color: `${themeColor}CC` }}
                              />
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: `${themeColor}DD` }}
                              >
                                <span className="font-semibold">
                                  Tarefa extensa detectada.
                                </span>{" "}
                                Uma pausa longa de 15min será sugerida após o 4º
                                ciclo para manter seu foco.
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Short Task Info */}
                  {!isLongTask && totalMinutesNum > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <p className="text-xs text-white/60 text-center">
                        Tarefa curta:{" "}
                        <span className="font-semibold text-white/80">
                          1 ciclo de {totalMinutesNum} minutos
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Description Section */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wide text-white/40 font-light">
                  Descrição
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Adicione notas ou detalhes..."
                  className="bg-white/5 border-none text-white/90 rounded-2xl min-h-[120px] p-4 resize-none focus:ring-1 focus:outline-none focus:border-none placeholder:text-white/30"
                  onFocus={(e) =>
                    (e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`)
                  }
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                  rows={5}
                />
              </div>

              <Separator className="bg-white/10" />

              {/* Tags Section */}
              <TagManager taskId={task.id} taskTags={task.tags || []} />

              <Separator className="bg-white/10" />

              {/* Comments Section */}
              <CommentSection taskId={task.id} />
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-white/60">Tarefa não encontrada</p>
            </div>
          )}
        </div>

        {/* Footer with Save Button - Fixed */}
        {hasChanges && (
          <div className="border-t border-white/10 p-4 flex items-center justify-end gap-3 bg-[#0F1115]/50 backdrop-blur-sm rounded-b-[32px] flex-shrink-0">
            <Button
              variant="ghost"
              onClick={resetForm}
              className="text-white/60 hover:text-white/90 hover:bg-white/5 rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="text-white rounded-full px-6 font-medium"
              style={{
                backgroundColor: themeColor,
              }}
              onMouseEnter={(e) => {
                if (!isSaving && title.trim()) {
                  e.currentTarget.style.filter = "brightness(1.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              {isSaving ? (
                "Salvando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
