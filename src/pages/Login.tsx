import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import momentumLogo from "@/assets/momentum-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

type LoginFormInputs = {
  email: string;
  password: string;
};

type AuthResponse = {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
};

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const { mutate, isPending } = useMutation<
    AuthResponse,
    Error,
    LoginFormInputs
  >({
    mutationFn: (data) => api.post("/auth/login", data).then((res) => res.data),

    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);

      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta, ${data.user.name}.`,
      });

      navigate("/");
    },

    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description:
          error.response?.data?.message || "Verifique seu e-mail e senha.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormInputs) => {
    mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-3">
            <img src={momentumLogo} alt="Momentum" className="w-16 h-16" />
            <CardTitle className="text-3xl font-bold text-foreground">
              Acessar minha conta
            </CardTitle>
          </div>
          <CardDescription>Use seu e-mail e senha para entrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email", { required: "E-mail é obrigatório" })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                {...register("password", { required: "Senha é obrigatória" })}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center space-y-2">
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha
              </Link>

              <div className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Criar conta
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
