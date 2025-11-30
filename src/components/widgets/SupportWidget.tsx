import React, { useState } from "react";
import { Headphones, Send, CheckCircle2 } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useFeatureCheck } from "@/hooks/use-feature-check";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-context";
import { AuthWall } from "../AuthWall";

interface SupportWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({
  onClose,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [showAuthWall, setShowAuthWall] = useState(false);
  const { requireFeature, hasFeature } = useFeatureCheck();
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const hasPrioritySupport = hasFeature("PRIORITY_SUPPORT");

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      api.post("/support/message", data).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "Nossa equipe entrará em contato em breve.",
      });
      setTitle("");
      setMessage("");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) {
        requireFeature("PRIORITY_SUPPORT", "Suporte Prioritário", "Epic");
        return;
      }
      toast({
        title: "Erro ao enviar mensagem",
        description:
          error.response?.data?.message ||
          "Não foi possível enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPrioritySupport) {
      requireFeature("PRIORITY_SUPPORT", "Suporte Prioritário", "Epic");
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    sendMessage({
      title: title.trim(),
      description: message.trim(),
    });
  };

  return (
    <>
      <WidgetContainer
        title="Suporte Prioritário"
        onClose={onClose}
        className="w-96 max-h-[80vh] overflow-hidden"
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
      >
        <div className="p-6 space-y-6">
          {/* Badge Priority Access */}
          <div className="flex items-center justify-center">
            <div
              className="px-4 py-2 rounded-full text-xs font-medium text-white flex items-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              <Headphones className="h-3.5 w-3.5" />
              Priority Access
            </div>
          </div>

          {/* Description */}
          <div className="text-center space-y-2">
            <p className="text-sm text-white/90 font-light">
              Envie uma mensagem diretamente para nossa equipe de
              desenvolvimento.
            </p>
            <p className="text-xs text-white/60 font-light">
              Resposta garantida em até 24 horas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 font-light text-xs">
                Assunto *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Problema com timer, Sugestão de feature..."
                className="bg-white/5 border-white/10 text-white/90 placeholder:text-white/30 transition-all"
                maxLength={200}
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

            <div className="space-y-2">
              <Label className="text-white/60 font-light text-xs">
                Mensagem *
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva seu problema, sugestão ou dúvida..."
                className="bg-white/5 border-white/10 text-white/90 placeholder:text-white/30 min-h-[120px] resize-none transition-all"
                maxLength={2000}
                onFocus={(e) => {
                  e.target.style.borderColor = `${themeColor}50`;
                  e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
              />
              <p className="text-xs text-white/40 text-right">
                {message.length}/2000
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSending || !title.trim() || !message.trim()}
              className="w-full text-white rounded-xl h-11 font-light disabled:opacity-40"
              style={{
                backgroundColor: themeColor,
              }}
              onMouseEnter={(e) => {
                if (!isSending && title.trim() && message.trim()) {
                  const color = themeColor;
                  const r = parseInt(color.slice(1, 3), 16);
                  const g = parseInt(color.slice(3, 5), 16);
                  const b = parseInt(color.slice(5, 7), 16);
                  const darker = `rgb(${Math.max(0, r - 20)}, ${Math.max(
                    0,
                    g - 20
                  )}, ${Math.max(0, b - 20)})`;
                  e.currentTarget.style.backgroundColor = darker;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSending && title.trim() && message.trim()) {
                  e.currentTarget.style.backgroundColor = themeColor;
                }
              }}
            >
              {isSending ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </form>

          {/* Success State (if needed) */}
          {false && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 space-y-3"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <CheckCircle2
                  className="h-8 w-8"
                  style={{ color: themeColor }}
                />
              </div>
              <p className="text-sm text-white/90 font-light text-center">
                Mensagem enviada com sucesso!
              </p>
              <p className="text-xs text-white/60 font-light text-center">
                Nossa equipe entrará em contato em breve.
              </p>
            </motion.div>
          )}
        </div>
      </WidgetContainer>

      <AuthWall
        open={showAuthWall}
        onOpenChange={setShowAuthWall}
        message="Faça login ou crie uma conta para acessar o suporte prioritário."
      />
    </>
  );
};
