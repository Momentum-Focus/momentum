import FocusApp from "@/components/FocusApp";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

const Index = () => {
  const token = localStorage.getItem("authToken");
  const { toast } = useToast();

  const {
    data: user,
    isLoading: isLoadingUser,
    error,
  } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      // Verifica se o token existe antes de fazer a requisição
      const currentToken = localStorage.getItem("authToken");
      if (!currentToken) {
        throw new Error("Token não encontrado");
      }
      return api.get("/user").then((res) => res.data);
    },
    retry: 1,
    enabled: !!token,
    refetchOnMount: true, // Sempre refetch quando o componente monta
    refetchOnWindowFocus: false, // Não refetch quando a janela ganha foco
  });

  // Log para debug (remover depois)
  useEffect(() => {
    if (error) {
      console.log("Erro ao buscar perfil:", error);
      console.log("Token no localStorage:", localStorage.getItem("authToken"));
    }
  }, [error]);

  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem("logoutSuccess");
    if (logoutSuccess === "true") {
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
      sessionStorage.removeItem("logoutSuccess");
    }
  }, [toast]);

  // Modo Visitante: mostra FocusApp mesmo sem token
  return <FocusApp isGuestMode={!token} user={user} />;
};

export default Index;
