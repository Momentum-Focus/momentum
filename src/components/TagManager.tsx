import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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

export const TagManager: React.FC<TagManagerProps> = ({ taskId, taskTags = [] }) => {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3B82F6");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((res) => res.data),
  });

  const taskTagIds = taskTags.map((tag) => tag.id);
  const availableTags = allTags.filter((tag) => !taskTagIds.includes(tag.id));

  const { mutate: createTag } = useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post("/tags", data),
    onSuccess: (newTag: Tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      addTagToTask(newTag.id);
      setTagName("");
      setIsCreating(false);
      toast({
        title: "Tag criada",
        description: "A tag foi criada e adicionada à tarefa.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
      if (error.response?.status === 403) {
        navigate("/plans");
      }
    },
  });

  const { mutate: addTagToTask } = useMutation({
    mutationFn: (tagId: number) =>
      api.post(`/tags/${tagId}/tasks/${taskId}`),
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
    mutationFn: (tagId: number) =>
      api.delete(`/tags/${tagId}/tasks/${taskId}`),
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

  const handleCreateAndAddTag = () => {
    if (!tagName.trim()) {
      return;
    }
    createTag({ name: tagName.trim(), color: tagColor });
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
        <TagIcon className="h-4 w-4" />
        <h4 className="font-semibold text-sm">Tags</h4>
      </div>

      {taskTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {taskTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              style={{
                backgroundColor: tag.color
                  ? `${tag.color}20`
                  : undefined,
                borderColor: tag.color || undefined,
                color: tag.color || undefined,
              }}
              className="flex items-center gap-1"
            >
              {tag.name}
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            {!isCreating ? (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Tags Disponíveis</h4>
                  {availableTags.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {availableTags.map((tag) => (
                        <Button
                          key={tag.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleAddExistingTag(tag.id)}
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{
                              backgroundColor: tag.color || "#3B82F6",
                            }}
                          />
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma tag disponível
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Nova Tag
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Tag</label>
                  <Input
                    placeholder="Ex: Urgente"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cor</label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          tagColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent"
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
                    className="flex-1"
                    onClick={handleCreateAndAddTag}
                    disabled={!tagName.trim()}
                  >
                    Criar e Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
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

