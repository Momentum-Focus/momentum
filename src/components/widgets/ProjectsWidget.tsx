import React, { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Folder,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useFeatureCheck } from "@/hooks/use-feature-check";
import { useTheme } from "@/context/theme-context";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ProjectsWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

type Project = {
  id: number;
  name: string;
  description?: string;
  color?: string;
  dueDate?: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  tasks?: Task[];
};

type Task = {
  id: number;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
};

const colorPresets = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Pink", value: "#EC4899" },
];

export const ProjectsWidget: React.FC<ProjectsWidgetProps> = ({
  onClose,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [view, setView] = useState<"list" | "details">("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#3B82F6");
  const [customColor, setCustomColor] = useState<string>("#3B82F6");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [createDateValue, setCreateDateValue] = useState("");
  const [editDateValue, setEditDateValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { requireFeature, hasFeature } = useFeatureCheck();
  const { themeColor } = useTheme();
  const hasProjectsFeature = hasFeature("PROJECTS");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/project").then((res) => res.data),
    enabled: hasProjectsFeature,
  });

  const { mutate: createProject, isPending: isCreating } = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      color?: string;
      dueDate?: string;
    }) => api.post("/project", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreateModal(false);
      setSelectedColor("#3B82F6");
      setCustomColor("#3B82F6");
      setShowColorPicker(false);
      setCreateDateValue("");
      toast({
        title: "Projeto criado",
        description: "Seu projeto foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Não foi possível criar o projeto. Tente novamente.";

      if (error.response?.status === 400) {
        errorMessage =
          error.response?.data?.message ||
          "Dados inválidos. Verifique os campos e tente novamente.";
      } else if (error.response?.status === 403) {
        errorMessage =
          error.response?.data?.message ||
          "Você não tem permissão para criar mais projetos. Faça upgrade do seu plano.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Erro ao criar projeto",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const { mutate: updateProject, isPending: isUpdating } = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        description?: string;
        color?: string;
        dueDate?: string;
        status?: string;
      };
    }) => api.patch(`/project/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: ["project", selectedProject?.id],
      });
      setShowEditModal(false);
      setEditingProject(null);
      setSelectedColor("#3B82F6");
      setCustomColor("#3B82F6");
      setShowColorPicker(false);
      setEditDateValue("");
      toast({
        title: "Projeto atualizado",
        description: "Seu projeto foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      let errorMessage =
        "Não foi possível atualizar o projeto. Tente novamente.";

      if (error.response?.status === 400) {
        errorMessage =
          error.response?.data?.message ||
          "Dados inválidos. Verifique os campos e tente novamente.";
      } else if (error.response?.status === 404) {
        errorMessage = "Projeto não encontrado.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Erro ao atualizar projeto",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteProject, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/project/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProject) {
        setView("list");
        setSelectedProject(null);
      }
      toast({
        title: "Projeto excluído",
        description: "Seu projeto foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir projeto",
        description:
          error.response?.data?.message ||
          "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    },
  });

  const { mutate: createTask } = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      projectId: number;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    }) => api.post("/tasks", data).then((res) => res.data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Atualiza o projeto selecionado com os dados mais recentes
      if (selectedProject) {
        try {
          const { data } = await api.get(`/project/${selectedProject.id}`);
          setSelectedProject(data);
        } catch (error) {
          // Se falhar, apenas invalida a query
          queryClient.invalidateQueries({
            queryKey: ["project", selectedProject.id],
          });
        }
      }

      toast({
        title: "Tarefa criada",
        description: "A tarefa foi adicionada ao projeto.",
      });
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

  // Máscara de data (permite apagar um caractere por vez)
  const formatDateInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");

    if (numbers.length === 0) return "";

    // Formata como DD/MM/YYYY
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(
        4,
        8
      )}`;
    }
  };

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (value: string) => void
  ) => {
    const formatted = formatDateInput(e.target.value);
    setValue(formatted);
  };

  const handleDateKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    setValue: (value: string) => void
  ) => {
    // Permite apagar normalmente
    if (e.key === "Backspace" || e.key === "Delete") {
      return;
    }

    // Permite navegação
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Tab") {
      return;
    }

    // Permite apenas números
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const convertDateToISO = (dateString: string): string | undefined => {
    if (!dateString) return undefined;

    // Remove formatação
    const numbers = dateString.replace(/\D/g, "");

    if (numbers.length !== 8) return undefined;

    // Formato: DD/MM/YYYY -> YYYY-MM-DD
    const day = numbers.slice(0, 2);
    const month = numbers.slice(2, 4);
    const year = numbers.slice(4, 8);

    // Valida data
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (
      dayNum < 1 ||
      dayNum > 31 ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900
    ) {
      return undefined;
    }

    return `${year}-${month}-${day}`;
  };

  const handleCreateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    if (!requireFeature("PROJECTS", "Projetos", "Flow")) {
      return;
    }

    // Validações
    if (!name || name.length < 3) {
      toast({
        title: "Nome inválido",
        description: "O nome deve ter pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (name.length > 100) {
      toast({
        title: "Nome muito longo",
        description: "O nome deve ter no máximo 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const dueDateISO = convertDateToISO(createDateValue);
    if (createDateValue && !dueDateISO) {
      toast({
        title: "Data inválida",
        description: "Por favor, insira uma data válida no formato DD/MM/AAAA.",
        variant: "destructive",
      });
      return;
    }

    createProject({
      name,
      description: description || undefined,
      color: selectedColor || "#3B82F6",
      dueDate: dueDateISO,
    });
  };

  const handleEditProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    // Validações
    if (!name || name.length < 3) {
      toast({
        title: "Nome inválido",
        description: "O nome deve ter pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (name.length > 100) {
      toast({
        title: "Nome muito longo",
        description: "O nome deve ter no máximo 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const dueDateISO = convertDateToISO(editDateValue);
    if (editDateValue && !dueDateISO) {
      toast({
        title: "Data inválida",
        description: "Por favor, insira uma data válida no formato DD/MM/AAAA.",
        variant: "destructive",
      });
      return;
    }

    updateProject({
      id: editingProject.id,
      data: {
        name,
        description: description || undefined,
        color: selectedColor || editingProject.color || "#3B82F6",
        dueDate: dueDateISO,
      },
    });
  };

  const handleProjectClick = async (project: Project) => {
    if (!requireFeature("PROJECTS", "Projetos", "Flow")) {
      return;
    }

    try {
      const { data } = await api.get(`/project/${project.id}`);
      setSelectedProject(data);
      setView("details");
      // Invalida a query para garantir que os dados estejam atualizados
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projeto",
        description: "Não foi possível carregar os detalhes do projeto.",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    createTask({
      title,
      description: description || undefined,
      projectId: selectedProject.id,
      priority: "MEDIUM",
    });

    e.currentTarget.reset();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-400";
      case "IN_PROGRESS":
        return ""; // Will use inline style with themeColor
      default:
        return "text-white/60";
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "IN_PROGRESS") {
      return { color: themeColor };
    }
    return {};
  };

  if (isLoading) {
    return (
      <WidgetContainer
        title="Projetos"
        onClose={onClose}
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
      >
        <div className="p-6 flex items-center justify-center">
          <p className="text-white/60 font-light">Carregando...</p>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <>
      <WidgetContainer
        title={
          view === "details" ? selectedProject?.name || "Projeto" : "Projetos"
        }
        onClose={onClose}
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
        headerActions={
          view === "details" ? (
            <button
              onClick={() => {
                setView("list");
                setSelectedProject(null);
              }}
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (!requireFeature("PROJECTS", "Projetos", "Flow")) {
                  return;
                }
                setShowCreateModal(true);
              }}
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        }
      >
        {view === "list" ? (
          <div className="p-6">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 font-light mb-2">
                  Nenhum projeto ainda
                </p>
                <p className="text-white/40 text-sm font-light">
                  Crie seu primeiro projeto para começar
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Gradiente de fade no final */}
                {projects.length > 2 && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none z-10" />
                )}
                <div
                  className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                  style={{
                    maxHeight:
                      projects.length > 2
                        ? "calc(2*180px + 1*16px + 90px)" // 2 projetos completos (180px cada) + 1 espaçamento (16px) + metade do 3º (90px)
                        : "none",
                  }}
                >
                  {projects.map((project, index) => {
                    const isPartialVisible = index === 2 && projects.length > 2;

                    return (
                      <motion.div
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className={cn(
                          "zen-glass rounded-xl p-4 cursor-pointer transition-all hover:bg-white/5 border border-white/10",
                          project.color && "border-l-4",
                          isPartialVisible && "opacity-70"
                        )}
                        style={{
                          borderLeftColor: project.color || undefined,
                        }}
                        whileHover={{ scale: isPartialVisible ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-white/90 font-medium text-lg">
                            {project.name}
                          </h3>
                          <span
                            className={cn(
                              "text-xs font-light px-2 py-1 rounded-full",
                              getStatusColor(project.status)
                            )}
                            style={getStatusStyle(project.status)}
                          >
                            {project.status === "COMPLETED"
                              ? "Concluído"
                              : project.status === "IN_PROGRESS"
                              ? "Em Progresso"
                              : "Não Iniciado"}
                          </span>
                        </div>

                        {project.description && (
                          <p className="text-white/60 text-sm font-light mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        {project.progress !== undefined && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                              <span>Progresso</span>
                              <span>
                                {project.completedTasks || 0} /{" "}
                                {project.totalTasks || 0} tarefas
                              </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full"
                                style={{ backgroundColor: themeColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        )}

                        {project.dueDate && (
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-2">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.dueDate)}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          selectedProject && (
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white/90 font-medium text-xl mb-1">
                    {selectedProject.name}
                  </h2>
                  {selectedProject.description && (
                    <p className="text-white/60 text-sm font-light">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setShowEditModal(true);
                    }}
                    className="text-white/60 hover:text-white/90 transition-colors p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm("Tem certeza que deseja excluir este projeto?")
                      ) {
                        deleteProject(selectedProject.id);
                      }
                    }}
                    className="text-white/60 hover:text-red-400 transition-colors p-2"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="zen-glass rounded-xl p-4 border border-white/10">
                <h3 className="text-white/90 font-medium mb-3">
                  Tarefas do Projeto
                </h3>

                <form onSubmit={handleCreateTask} className="mb-4">
                  <div className="flex items-center gap-2">
                    <Input
                      name="title"
                      placeholder="Nova tarefa..."
                      className="flex-1 bg-white/5 border-white/10 text-white/90 placeholder:text-white/30 transition-all"
                      onFocus={(e) => {
                        e.target.style.borderColor = `${themeColor}50`;
                        e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "";
                        e.target.style.boxShadow = "";
                      }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      style={{
                        backgroundColor: themeColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "brightness(1)";
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </form>

                {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-white/40" />
                        )}
                        <div className="flex-1">
                          <p
                            className={cn(
                              "text-white/90 font-light",
                              task.isCompleted && "line-through text-white/60"
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-white/60 text-xs font-light">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-sm font-light text-center py-4">
                    Nenhuma tarefa ainda
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </WidgetContainer>

      {/* Create Project Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setSelectedColor("#3B82F6");
            setCustomColor("#3B82F6");
            setShowColorPicker(false);
            setCreateDateValue("");
          }
        }}
      >
        <DialogContent className="zen-glass border-white/10 bg-black/70 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-light">
              Criar Novo Projeto
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <Label className="text-white/60 font-light">Nome *</Label>
              <Input
                name="name"
                required
                minLength={3}
                maxLength={100}
                className="bg-white/5 border-white/10 text-white/90 transition-all"
                placeholder="Nome do projeto"
                onFocus={(e) => {
                  e.target.style.borderColor = `${themeColor}50`;
                  e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
              />
            </div>
            <div>
              <Label className="text-white/60 font-light">Descrição</Label>
              <Textarea
                name="description"
                className="bg-white/5 border-white/10 text-white/90"
                rows={3}
                placeholder="Descrição do projeto (opcional)"
              />
            </div>
            <div>
              <Label className="text-white/60 font-light">Cor</Label>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {colorPresets.map((color) => (
                  <label
                    key={color.value}
                    className="cursor-pointer relative"
                    title={color.name}
                  >
                    <input
                      type="radio"
                      name="color"
                      value={color.value}
                      checked={
                        selectedColor === color.value && !showColorPicker
                      }
                      onChange={(e) => {
                        setSelectedColor(e.target.value);
                        setShowColorPicker(false);
                      }}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-colors",
                        selectedColor === color.value && !showColorPicker
                          ? "border-white/80 scale-110"
                          : "border-white/20 hover:border-white/40"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  </label>
                ))}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPicker(!showColorPicker);
                      if (!showColorPicker) {
                        setSelectedColor(customColor);
                      }
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-colors flex items-center justify-center text-white/60 hover:text-white/90",
                      showColorPicker
                        ? "border-white/80 scale-110 bg-white/10"
                        : "border-white/20 hover:border-white/40 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
                    )}
                    title="Escolher cor personalizada"
                  >
                    <span className="text-xs">+</span>
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-10 left-0 z-50 bg-black/90 rounded-lg p-3 border border-white/10">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setSelectedColor(e.target.value);
                        }}
                        className="w-32 h-8 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-white/60 font-light">
                Data de Vencimento
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                <Input
                  name="dueDate"
                  type="text"
                  value={createDateValue}
                  onChange={(e) => handleDateChange(e, setCreateDateValue)}
                  onKeyDown={(e) =>
                    handleDateKeyDown(e, createDateValue, setCreateDateValue)
                  }
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="bg-white/5 border-white/10 text-white/90 pl-10 transition-all"
                  onFocus={(e) => {
                    e.target.style.borderColor = `${themeColor}50`;
                    e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "";
                    e.target.style.boxShadow = "";
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedColor("#3B82F6");
                  setCustomColor("#3B82F6");
                  setShowColorPicker(false);
                  setCreateDateValue("");
                }}
                className="border-white/10 text-white/90 hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                style={{
                  backgroundColor: themeColor,
                }}
                onMouseEnter={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.filter = "brightness(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingProject(null);
            setSelectedColor("#3B82F6");
            setCustomColor("#3B82F6");
            setShowColorPicker(false);
            setEditDateValue("");
          } else if (editingProject) {
            setSelectedColor(editingProject.color || "#3B82F6");
            setCustomColor(editingProject.color || "#3B82F6");
            setEditDateValue(
              editingProject.dueDate
                ? formatDateForInput(editingProject.dueDate)
                : ""
            );
          }
        }}
      >
        <DialogContent className="zen-glass border-white/10 bg-black/70 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-light">
              Editar Projeto
            </DialogTitle>
          </DialogHeader>
          {editingProject && (
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <Label className="text-white/60 font-light">Nome *</Label>
                <Input
                  name="name"
                  defaultValue={editingProject.name}
                  required
                  minLength={3}
                  maxLength={100}
                  className="bg-white/5 border-white/10 text-white/90 transition-all"
                  onFocus={(e) => {
                    e.target.style.borderColor = `${themeColor}50`;
                    e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "";
                    e.target.style.boxShadow = "";
                  }}
                />
              </div>
              <div>
                <Label className="text-white/60 font-light">Descrição</Label>
                <Textarea
                  name="description"
                  defaultValue={editingProject.description || ""}
                  className="bg-white/5 border-white/10 text-white/90"
                  rows={3}
                  placeholder="Descrição do projeto (opcional)"
                />
              </div>
              <div>
                <Label className="text-white/60 font-light">Cor</Label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {colorPresets.map((color) => (
                    <label
                      key={color.value}
                      className="cursor-pointer relative"
                      title={color.name}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        checked={
                          selectedColor === color.value && !showColorPicker
                        }
                        onChange={(e) => {
                          setSelectedColor(e.target.value);
                          setShowColorPicker(false);
                        }}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-colors",
                          selectedColor === color.value && !showColorPicker
                            ? "border-white/80 scale-110"
                            : "border-white/20 hover:border-white/40"
                        )}
                        style={{ backgroundColor: color.value }}
                      />
                    </label>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorPicker(!showColorPicker);
                        if (!showColorPicker) {
                          setSelectedColor(customColor);
                        }
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-colors flex items-center justify-center text-white/60 hover:text-white/90",
                        showColorPicker
                          ? "border-white/80 scale-110 bg-white/10"
                          : "border-white/20 hover:border-white/40 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
                      )}
                      title="Escolher cor personalizada"
                    >
                      <span className="text-xs">+</span>
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-10 left-0 z-50 bg-black/90 rounded-lg p-3 border border-white/10">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value);
                            setSelectedColor(e.target.value);
                          }}
                          className="w-32 h-8 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-white/60 font-light">
                  Data de Vencimento
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                  <Input
                    name="dueDate"
                    type="text"
                    value={editDateValue}
                    onChange={(e) => handleDateChange(e, setEditDateValue)}
                    onKeyDown={(e) =>
                      handleDateKeyDown(e, editDateValue, setEditDateValue)
                    }
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="bg-white/5 border-white/10 text-white/90 pl-10 transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = `${themeColor}50`;
                      e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                    setSelectedColor("#3B82F6");
                    setCustomColor("#3B82F6");
                    setShowColorPicker(false);
                    setEditDateValue("");
                  }}
                  className="border-white/10 text-white/90 hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    backgroundColor: themeColor,
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdating) {
                      e.currentTarget.style.filter = "brightness(1.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "brightness(1)";
                  }}
                >
                  {isUpdating ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
