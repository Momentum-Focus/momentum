import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, Clock, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { CommentSection } from "./CommentSection";
import { TagManager } from "./TagManager";

interface Task {
  id: number;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  estimatedDurationMinutes?: number;
  estimatedSessions?: number;
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

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  URGENT: "bg-red-100 text-red-800 border-red-200",
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  taskId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["tasks", taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((res) => res.data),
    enabled: open && !!taskId,
  });

  if (!open || !taskId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Tarefa</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie todos os detalhes da tarefa
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : task ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{task.title}</h2>
                  {task.description && (
                    <p className="text-muted-foreground mt-2">{task.description}</p>
                  )}
                </div>
                {task.isCompleted && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluída
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {task.priority && (
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                )}
                {task.estimatedDurationMinutes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.estimatedDurationMinutes} min
                  </Badge>
                )}
                {task.estimatedSessions && (
                  <Badge variant="outline">
                    {task.estimatedSessions} sessões
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criada em: {new Date(task.createdAt).toLocaleDateString("pt-BR")}
                </div>
                <div>
                  Atualizada em: {new Date(task.updatedAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            <Separator />

            <TagManager taskId={task.id} taskTags={task.tags || []} />

            <Separator />

            <CommentSection taskId={task.id} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Tarefa não encontrada</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

