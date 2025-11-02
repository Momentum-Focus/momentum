import FocusApp from "@/components/FocusApp";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

const Index = () => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");

  const { data: user, isLoading: isLoadingUser } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
    enabled: !!token, // Só busca se houver token
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    queryClient.clear();
    window.location.reload(); // Recarrega a página para atualizar o estado
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <FocusApp />

      <div className="absolute top-6 right-6">
        {token && !isLoadingUser && user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, {user.name}!
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : (
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Index;
