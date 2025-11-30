import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";

interface Tag {
  id: number;
  name: string;
  color?: string;
  userId: number;
}

interface TagManagerProps {
  taskId: number;
  taskTags?: Tag[];
}

export const TagManager: React.FC<TagManagerProps> = ({
  taskId,
  taskTags = [],
}) => {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3B82F6");
  const [isCreating, setIsCreating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((res) => res.data),
  });

  const taskTagIds = taskTags.map((tag) => tag.id);
  const availableTags = allTags.filter((tag) => !taskTagIds.includes(tag.id));

  // Check if scroll is needed and update arrow visibility
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Scroll handlers
  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);
    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 300);
  };

  React.useEffect(() => {
    // Delay to ensure DOM is ready
    const timer = setTimeout(() => {
      checkScroll();
    }, 100);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        clearTimeout(timer);
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
    return () => clearTimeout(timer);
  }, [availableTags.length, taskTags.length]);

  const { mutateAsync: createTagMutation } = useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post("/tags", data).then((res) => res.data),
  });

  const { mutate: addTagToTask } = useMutation({
    mutationFn: (tagId: number) => api.post(`/tags/${tagId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      toast({
        title: "Tag adicionada",
        description: "A tag foi adicionada à tarefa.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar tag",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    },
  });

  const { mutate: removeTagFromTask } = useMutation({
    mutationFn: (tagId: number) => api.delete(`/tags/${tagId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      toast({
        title: "Tag removida",
        description: "A tag foi removida da tarefa.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover tag",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAndAddTag = async () => {
    if (!tagName.trim()) {
      return;
    }

    try {
      // Create tag and wait for response
      const newTag = await createTagMutation({
        name: tagName.trim(),
        color: tagColor,
      });

      // Validate response
      if (!newTag || !newTag.id) {
        throw new Error("Resposta da API inválida: ID da tag não encontrado");
      }

      // Invalidate tags cache
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      // Add tag to task
      addTagToTask(newTag.id);

      // Reset form
      setTagName("");
      setIsCreating(false);

      toast({
        title: "Tag criada",
        description: "A tag foi criada e adicionada à tarefa.",
      });
    } catch (error: any) {
      console.error("Erro ao criar tag:", error);
      toast({
        title: "Erro ao criar tag",
        description:
          error.response?.data?.message ||
          error.message ||
          "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    }
  };

  const handleAddExistingTag = (tagId: number) => {
    addTagToTask(tagId);
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagFromTask(tagId);
  };

  const predefinedColors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-white/60" />
        <h4 className="font-semibold text-sm text-white/70">Tags</h4>
      </div>

      {/* Tags Carousel */}
      {taskTags.length > 0 && (
        <div className="relative">
          {/* Left Fade Gradient */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0F1115] to-transparent z-10 pointer-events-none" />
          )}

          {/* Right Fade Gradient */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-[#0F1115] z-10 pointer-events-none" />
          )}

          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-[#0F1115]/80 backdrop-blur-sm border border-white/10 rounded-full p-1.5 hover:bg-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
          )}

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-[#0F1115]/80 backdrop-blur-sm border border-white/10 rounded-full p-1.5 hover:bg-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {taskTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  borderColor: tag.color || undefined,
                  color: tag.color || undefined,
                }}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap relative transition-all duration-200 hover:scale-105"
              >
                <span>{tag.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-white/10 rounded-full opacity-70 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 ml-0.5 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag.id);
                  }}
                  aria-label={`Remover tag ${tag.name}`}
                  title="Remover tag"
                >
                  <X className="h-3.5 w-3.5 text-white/60 hover:text-white/90 transition-colors" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white/80 hover:text-white/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-[#0F1115]/95 backdrop-blur-xl border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="space-y-4">
            {!isCreating ? (
              <>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-white/90">
                    Tags Disponíveis
                  </h4>
                  {availableTags.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
                      {availableTags.map((tag) => (
                        <Button
                          key={tag.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10 text-white/80 hover:text-white/90 rounded-xl"
                          onClick={() => handleAddExistingTag(tag.id)}
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{
                              backgroundColor: tag.color || "#3B82F6",
                            }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 text-center py-2">
                      Nenhuma tag disponível
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full text-white rounded-full transition-colors"
                  style={{ backgroundColor: themeColor }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = `${themeColor}E6`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = themeColor)
                  }
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Nova Tag
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Nome da Tag
                  </label>
                  <Input
                    placeholder="Ex: Urgente"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagName.trim()) {
                        handleCreateAndAddTag();
                      }
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setTagName("");
                      }
                    }}
                    className="bg-white/5 border-white/10 text-white/90 rounded-xl focus:ring-2 focus:outline-none"
                    onFocus={(e) =>
                      (e.currentTarget.style.boxShadow = `0 0 0 2px ${themeColor}80`)
                    }
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Cor
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          tagColor === color
                            ? "border-white/60 scale-110 shadow-lg"
                            : "border-transparent hover:border-white/30"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setTagColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-white rounded-full transition-colors"
                    style={{ backgroundColor: themeColor }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = `${themeColor}E6`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = themeColor)
                    }
                    onClick={handleCreateAndAddTag}
                    disabled={!tagName.trim()}
                  >
                    Criar e Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/10 text-white/80 hover:bg-white/10 rounded-full"
                    onClick={() => {
                      setIsCreating(false);
                      setTagName("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
