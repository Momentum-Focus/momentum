import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      toast({
        title: "Erro na autenticação",
        description: error || "Ocorreu um erro ao autenticar com o Google",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!token) {
      toast({
        title: "Erro na autenticação",
        description: "Token não fornecido",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    localStorage.setItem("authToken", token);

    // Verificar se o perfil está completo após salvar o token
    setIsCheckingProfile(true);
    api
      .get("/user")
      .then((res) => {
        const user = res.data;
        const isProfileIncomplete = !user.phone || !user.cpf;

        if (isProfileIncomplete) {
          toast({
            title: "Quase lá!",
            description: "Complete seu perfil para continuar.",
          });
          navigate("/complete-profile", { replace: true });
        } else {
          toast({
            title: "Login bem-sucedido!",
            description: "Bem-vindo ao Momentum.",
          });
          navigate("/", { replace: true });
        }
      })
      .catch((error) => {
        console.error("Erro ao verificar perfil:", error);
        // Se houver erro, ainda redireciona para home
        // O Index.tsx também verifica o perfil
        toast({
          title: "Login bem-sucedido!",
          description: "Bem-vindo ao Momentum.",
        });
        navigate("/", { replace: true });
      })
      .finally(() => {
        setIsCheckingProfile(false);
      });
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          {isCheckingProfile
            ? "Verificando perfil..."
            : "Processando autenticação..."}
        </h1>
        <p className="text-muted-foreground">
          Aguarde enquanto redirecionamos você.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
