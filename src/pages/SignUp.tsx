import React from "react";
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

type SignUpFormInputs = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
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

const SignUp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormInputs>();

  const password = watch("password");

  const { mutate, isPending } = useMutation<
    AuthResponse,
    Error,
    Omit<SignUpFormInputs, "confirm">
  >({
    mutationFn: (data) =>
      api.post("/auth/register", data).then((res) => res.data),

    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${data.user.name}.`,
      });

      navigate("/");
    },

    onError: (error: any) => {
      console.error("Erro ao criar conta:", error);

      let errorMessage = "Ocorreu um erro ao criar sua conta. Tente novamente.";

      if (error.response?.data) {
        const errorData = error.response.data;

        // Mensagem específica do backend
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Detalhes adicionais se disponíveis
        else if (errorData.error) {
          errorMessage = `${errorData.error}${
            errorData.details ? `: ${errorData.details}` : ""
          }`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSignUp = (data: SignUpFormInputs) => {
    const { confirm, ...apiData } = data;
    mutate(apiData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-3">
            <img src={momentumLogo} alt="Momentum" className="w-16 h-16" />
            <CardTitle className="text-3xl font-bold text-foreground">
              Criar nova conta
            </CardTitle>
          </div>
          <CardDescription>Preencha seus dados para começar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                {...register("name", { required: "Nome é obrigatório" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

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
              <Label htmlFor="phone">Telefone (c/ DDD)</Label>
              <Input
                id="phone"
                placeholder="Ex: 11999998888"
                {...register("phone", { required: "Telefone é obrigatório" })}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha forte"
                {...register("password", {
                  required: "Senha é obrigatória",
                  minLength: {
                    value: 8,
                    message: "A senha deve ter no mínimo 8 caracteres",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repita sua senha"
                {...register("confirm", {
                  required: "Confirmação é obrigatória",
                  validate: (value) =>
                    value === password || "As senhas não coincidem",
                })}
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">
                  {errors.confirm.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Criando conta..." : "Cadastrar"}
            </Button>

            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
