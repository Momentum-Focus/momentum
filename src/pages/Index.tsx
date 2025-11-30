import FocusApp from "@/components/FocusApp";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
};

const Index = () => {
  const token = localStorage.getItem("authToken");
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // Verificar se o perfil está completo quando o usuário estiver logado
  useEffect(() => {
    if (token && user && !isLoadingUser) {
      const isProfileIncomplete = !user.phone || !user.cpf;
      if (isProfileIncomplete) {
        navigate("/complete-profile", { replace: true });
      }
    }
  }, [user, isLoadingUser, token, navigate]);

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
