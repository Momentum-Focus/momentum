import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/theme-context";
import { Separator } from "@/components/ui/separator";

interface Comment {
  id: number;
  content: string;
  userId: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  taskId?: number;
  projectId?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  projectId,
}) => {
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const queryClient = useQueryClient();

  const queryKey = taskId
    ? ["comments", "task", taskId]
    : ["comments", "project", projectId];

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (taskId) params.append("taskId", taskId.toString());
      if (projectId) params.append("projectId", projectId.toString());
      return api.get(`/comments?${params.toString()}`).then((res) => res.data);
    },
    enabled: !!taskId || !!projectId,
  });

  const { mutate: createComment, isPending: isCreating } = useMutation({
    mutationFn: (content: string) =>
      api.post("/comments", {
        content,
        taskId: taskId || undefined,
        projectId: projectId || undefined,
      }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar comentário",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteComment, isPending: isDeleting } = useMutation({
    mutationFn: (commentId: number) => api.delete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Comentário removido",
        description: "O comentário foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover comentário",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      return;
    }
    createComment(commentText.trim());
  };

  const { data: currentUser } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-white/60" />
        <h3 className="font-light text-white/90">Comentários</h3>
        <span className="text-sm text-white/40 font-light">
          ({comments.length})
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Adicione um comentário..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={3}
          className="resize-none bg-white/5 border-white/10 rounded-xl text-white/90 placeholder:text-white/30 focus:ring-1 focus:outline-none transition-all"
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`;
            e.currentTarget.style.borderColor = `${themeColor}80`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isCreating || !commentText.trim()}
          className="w-full text-white rounded-xl font-light transition-colors"
          style={{ backgroundColor: themeColor }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = `${themeColor}E6`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = themeColor)
          }
        >
          <Send className="h-4 w-4 mr-2" />
          {isCreating ? "Enviando..." : "Enviar comentário"}
        </Button>
      </form>

      <Separator className="bg-white/10" />

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-white/40 font-light">
            Carregando comentários...
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/40 font-light text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-light text-sm text-white/90">
                      {comment.user?.name || "Usuário"}
                    </span>
                    <span className="text-xs text-white/40 font-light">
                      {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 font-light whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                {currentUser?.id === comment.userId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteComment(comment.id)}
                    disabled={isDeleting}
                    className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
