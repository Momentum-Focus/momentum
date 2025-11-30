import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
};

/**
 * Hook para verificar se o perfil do usuário está completo
 * Redireciona automaticamente para /complete-profile se faltar phone ou cpf
 */
export const useProfileCheck = (enabled: boolean = true) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    enabled: enabled && !!token,
    retry: 1,
  });

  useEffect(() => {
    if (!enabled || !token) return;

    if (!isLoading && user) {
      const isProfileIncomplete = !user.phone || !user.cpf;

      if (isProfileIncomplete) {
        // Redireciona para completar perfil
        navigate("/complete-profile", { replace: true });
      }
    }
  }, [user, isLoading, enabled, token, navigate]);

  return {
    user,
    isLoading,
    isProfileComplete: user ? !!(user.phone && user.cpf) : false,
  };
};
