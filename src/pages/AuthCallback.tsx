import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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

    toast({
      title: "Login bem-sucedido!",
      description: "Bem-vindo ao Momentum.",
    });

    navigate("/");
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processando autenticação...</h1>
        <p className="text-muted-foreground">Aguarde enquanto redirecionamos você.</p>
      </div>
    </div>
  );
};

export default AuthCallback;

