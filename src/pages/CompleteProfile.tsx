import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

type CompleteProfileFormInputs = {
  phone: string;
  cpf: string;
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const { data: user } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    enabled: !!token,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileFormInputs>({
    defaultValues: {
      phone: user?.phone || "",
      cpf: user?.cpf || "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CompleteProfileFormInputs) =>
      api.patch("/user/complete-profile", data).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Perfil completado!",
        description: "Seus dados foram salvos com sucesso.",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar dados",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteProfile = (data: CompleteProfileFormInputs) => {
    mutate(data);
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete seu perfil</CardTitle>
          <CardDescription>
            Precisamos de algumas informações adicionais para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleCompleteProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                {...register("phone", {
                  required: "Telefone é obrigatório",
                })}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                {...register("cpf", {
                  required: "CPF é obrigatório",
                  pattern: {
                    value: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
                    message: "CPF deve estar no formato 000.000.000-00",
                  },
                })}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar e continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;

