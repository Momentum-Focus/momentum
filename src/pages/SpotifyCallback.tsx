import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Esta página é usada como fallback caso o popup não funcione
    // O fluxo normal usa postMessage do popup
    
    const error = searchParams.get("error");

    if (error) {
      toast({
        title: "Erro na autenticação do Spotify",
        description: error || "Ocorreu um erro ao conectar com o Spotify",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Se chegou aqui sem erro, significa que a autenticação foi bem-sucedida
    // Os tokens já foram salvos no backend pelo SpotifyStrategy
    toast({
      title: "Spotify conectado com sucesso!",
      description: "Sua conta do Spotify foi conectada com sucesso.",
    });

    navigate("/");
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processando autenticação do Spotify...</h1>
        <p className="text-muted-foreground">Aguarde enquanto redirecionamos você.</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;

