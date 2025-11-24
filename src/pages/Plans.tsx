import { useSubscription } from "@/context/subscription-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Check } from "lucide-react";

type PlanResponse = {
  id: number;
  name: string;
  description?: string;
  price?: string;
  features: Array<{
    feature: {
      code: string;
      name: string;
      description?: string;
    };
  }>;
};

const Plans = () => {
  const { planName, refresh } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  // Planos mockados para desenvolvimento
  const mockPlans: PlanResponse[] = [
    {
      id: 1,
      name: "VIBES",
      description:
        "Plano gratuito com timer básico, gestão de tarefas e fundos em imagem.",
      price: "0",
      features: [],
    },
    {
      id: 2,
      name: "FLOW",
      description:
        "Tudo do Vibes + fundos em vídeo, projetos e relatórios básicos.",
      price: "19.90",
      features: [],
    },
    {
      id: 3,
      name: "EPIC",
      description:
        "Tudo do Flow + relatórios avançados, customização total e suporte prioritário.",
      price: "39.90",
      features: [],
    },
  ];

  const { data: plans, isLoading } = useQuery<PlanResponse[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/plans");
        return Array.isArray(data) && data.length > 0 ? data : mockPlans;
      } catch (error) {
        console.error("Erro ao buscar planos:", error);
        return mockPlans;
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: number) => {
      const { data } = await api.post("/plans/subscribe", { planId });
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Assinatura atualizada",
        description: "Obrigado por evoluir seu foco com o Momentum.",
      });
      refresh();
    },
    onError: (error: any) => {
      const description =
        error.response?.data?.message || "Não foi possível atualizar o plano.";
      toast({
        title: "Falha na assinatura",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: number) => {
    if (!token) {
      navigate("/login");
      return;
    }
    subscribeMutation.mutate(planId);
  };

  const getPlanFeatures = (planName: string) => {
    const baseFeatures = [
      "Timer básico",
      "Gestão de Tarefas",
      "Fundo (Imagem)",
      "Integração Spotify/YT Music",
    ];

    if (planName === "VIBES") {
      return baseFeatures;
    }

    if (planName === "FLOW") {
      return [
        ...baseFeatures,
        "Fundo (Vídeo)",
        "Projetos",
        "Relatórios Básicos",
        "Histórico",
      ];
    }

    if (planName === "EPIC") {
      return [
        ...baseFeatures,
        "Fundo (Vídeo)",
        "Projetos",
        "Relatórios Básicos",
        "Histórico",
        "Relatórios Avançados/Insights",
        "Customização Total",
        "Integrações Extras",
        "Suporte Prioritário",
      ];
    }

    return baseFeatures;
  };

  const sortedPlans = plans
    ? [...plans].sort((a, b) => {
        const order = ["VIBES", "FLOW", "EPIC"];
        return order.indexOf(a.name) - order.indexOf(b.name);
      })
    : [];

  return (
    <div className="min-h-screen bg-[#0F1115] text-white/90 flex flex-col items-center px-6 py-16 relative overflow-hidden">
      {/* Background abstrato */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header com Logo */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="text-xs tracking-[0.5em] uppercase text-white/40 hover:text-white/60 transition-colors font-light"
        >
          Momentum
        </Link>
      </div>

      <div className="relative z-10 max-w-7xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-xs tracking-[0.6em] uppercase text-white/40 font-light">
            Momentum Plans
          </p>
          <h1 className="text-4xl md:text-6xl font-light tracking-wide">
            Escolha o seu ritmo
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base font-light">
            Do básico ao premium, temos a solução perfeita para você evoluir seu
            foco.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {sortedPlans.map((plan) => {
              const isCurrent = planName?.toUpperCase() === plan.name;
              const isVibes = plan.name === "VIBES";
              const isFlow = plan.name === "FLOW";
              const isEpic = plan.name === "EPIC";
              const isVibesAndLoggedIn =
                isVibes &&
                token &&
                (!planName || planName.toUpperCase() === "VIBES");
              const planFeatures = getPlanFeatures(plan.name);

              return (
                <div
                  key={plan.id}
                  className={`zen-glass border rounded-3xl p-8 flex flex-col gap-6 relative transition-all ${
                    isFlow
                      ? "border-blue-500/80 shadow-[0_20px_60px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/30"
                      : "border-white/10"
                  }`}
                >
                  {/* Badge destacado - apenas FLOW */}
                  {isFlow && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-blue-500 text-white text-xs px-4 py-1.5 rounded-full font-light tracking-widest uppercase shadow-lg shadow-blue-500/50">
                        Popular
                      </div>
                    </div>
                  )}

                  {/* Header do Plano */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40 font-light">
                      {plan.name}
                    </p>
                    <h2 className="text-4xl font-light">
                      {plan.price && Number(plan.price) > 0
                        ? `R$ ${Number(plan.price)
                            .toFixed(2)
                            .replace(".", ",")}`
                        : "Grátis"}
                      {plan.price && Number(plan.price) > 0 && (
                        <span className="text-lg text-white/50 font-light">
                          /mês
                        </span>
                      )}
                    </h2>
                    <p className="text-white/60 text-sm font-light leading-relaxed">
                      {plan.description || "Plano essencial para foco diário."}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40 font-light">
                      Recursos
                    </p>
                    <ul className="space-y-3 text-sm text-white/80">
                      {planFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check
                            className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5"
                            strokeWidth={1.5}
                          />
                          <span className="font-light">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={
                      isCurrent ||
                      isVibesAndLoggedIn ||
                      subscribeMutation.isPending
                    }
                    className={`w-full py-3 rounded-full transition-all font-light ${
                      isCurrent || isVibesAndLoggedIn
                        ? "bg-white/10 text-white/60 cursor-not-allowed"
                        : isFlow
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {isVibesAndLoggedIn
                      ? "Já Adquirido"
                      : isCurrent
                      ? "Plano Atual"
                      : subscribeMutation.isPending
                      ? "Processando..."
                      : "Assinar Agora"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
