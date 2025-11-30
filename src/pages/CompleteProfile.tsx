import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, User } from "lucide-react";
import momentumLogo from "@/assets/momentum-logo.png";

type CompleteProfileFormInputs = {
  phone?: string;
  cpf?: string;
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [phoneValue, setPhoneValue] = useState("");
  const [cpfValue, setCpfValue] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const { data: user, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    enabled: !!token,
  });

  // Determinar quais campos estão faltando e inicializar valores
  useEffect(() => {
    if (user) {
      const missing: string[] = [];
      if (!user.phone) {
        missing.push("phone");
        setPhoneValue("");
      } else {
        // Formatar telefone existente se houver
        const numbers = user.phone.replace(/\D/g, "");
        if (numbers.length > 0) {
          setPhoneValue(formatPhone(numbers));
        }
      }
      if (!user.cpf) {
        missing.push("cpf");
        setCpfValue("");
      } else {
        // Formatar CPF existente se houver
        const numbers = user.cpf.replace(/\D/g, "");
        if (numbers.length > 0) {
          setCpfValue(formatCPF(numbers));
        }
      }
      setMissingFields(missing);
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CompleteProfileFormInputs>({
    defaultValues: {
      phone: user?.phone || "",
      cpf: user?.cpf || "",
    },
  });

  // Função de formatação de telefone (igual ao SignUp)
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(
        3,
        7
      )}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(
      3,
      7
    )}-${numbers.slice(7, 11)}`;
  };

  // Função de formatação de CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6
      )}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6,
      9
    )}-${numbers.slice(9, 11)}`;
  };

  // Handler de mudança de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    const numbers = formatted.replace(/\D/g, "");
    setValue("phone", numbers, { shouldValidate: true });
  };

  // Handler de mudança de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfValue(formatted);
    const numbers = formatted.replace(/\D/g, "");
    setValue("cpf", numbers, { shouldValidate: true });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CompleteProfileFormInputs) =>
      api.patch("/user/complete-profile", data).then((res) => res.data),
    onSuccess: () => {
      // Invalidar e refazer a query do perfil
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast({
        title: "Perfil completado!",
        description: "Seus dados foram salvos com sucesso.",
      });
      navigate("/", { replace: true });
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
    // Enviar apenas os campos que estão faltando
    // Remover formatação antes de enviar
    const dataToSend: CompleteProfileFormInputs = {};

    if (missingFields.includes("phone")) {
      const phoneNumbers = phoneValue.replace(/\D/g, "");
      if (!phoneNumbers || phoneNumbers.length < 10) {
        toast({
          title: "Erro de validação",
          description: "Telefone deve ter no mínimo 10 dígitos",
          variant: "destructive",
        });
        return;
      }
      dataToSend.phone = phoneNumbers;
    }

    if (missingFields.includes("cpf")) {
      const cpfNumbers = cpfValue.replace(/\D/g, "");
      if (!cpfNumbers || cpfNumbers.length !== 11) {
        toast({
          title: "Erro de validação",
          description: "CPF deve ter 11 dígitos",
          variant: "destructive",
        });
        return;
      }
      dataToSend.cpf = cpfNumbers;
    }

    mutate(dataToSend);
  };

  if (!token || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
        <div className="text-center">
          <p className="text-white/60 font-light">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se o perfil já está completo, redirecionar
  if (user && user.phone && user.cpf) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] relative overflow-hidden p-4">
      {/* Background abstrato com overlay fosco */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Card Glassmorphism */}
      <div className="relative z-10 w-full max-w-md">
        <div className="zen-glass border-white/10 rounded-3xl p-12 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src={momentumLogo}
                alt="Momentum"
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-white/90 tracking-wide mb-2">
              Quase lá!
            </h1>
            <p className="text-white/60 font-light text-sm">
              Complete seu perfil para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmit(handleCompleteProfile)}
            className="space-y-5"
          >
            {missingFields.includes("phone") && (
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-xs uppercase tracking-widest text-white/60 font-light"
                >
                  Telefone (c/ DDD)
                </Label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(61) 9 9999-9999"
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    onBlur={(e) => {
                      const numbers = e.target.value.replace(/\D/g, "");
                      setValue("phone", numbers, { shouldValidate: true });
                    }}
                    className="bg-white/5 border-0 rounded-full h-12 pl-11 pr-4 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-400">{errors.phone.message}</p>
                )}
              </div>
            )}

            {missingFields.includes("cpf") && (
              <div className="space-y-2">
                <Label
                  htmlFor="cpf"
                  className="text-xs uppercase tracking-widest text-white/60 font-light"
                >
                  CPF
                </Label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpfValue}
                    onChange={handleCpfChange}
                    onBlur={(e) => {
                      const numbers = e.target.value.replace(/\D/g, "");
                      setValue("cpf", numbers, { shouldValidate: true });
                    }}
                    className="bg-white/5 border-0 rounded-full h-12 pl-11 pr-4 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                {errors.cpf && (
                  <p className="text-sm text-red-400">{errors.cpf.message}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-light transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 !text-white"
              style={{ color: "white" }}
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Salvar e continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
