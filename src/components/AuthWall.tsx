import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AuthWallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export const AuthWall: React.FC<AuthWallProps> = ({
  open,
  onOpenChange,
  message = "Esta ação requer autenticação. Faça login ou crie uma conta para continuar.",
}) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="zen-glass border-white/10 rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white/90 font-light text-2xl">
            Autenticação Necessária
          </DialogTitle>
          <DialogDescription className="text-white/60 font-light">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/login");
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            Entrar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/signup");
            }}
            variant="outline"
            className="flex-1 border-white/20 text-white/90 hover:bg-white/10"
          >
            Criar Conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
