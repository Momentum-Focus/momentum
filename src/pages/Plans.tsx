import { useSubscription } from "@/context/subscription-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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

  const { data: plans, isLoading } = useQuery<PlanResponse[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await api.get("/plans");
      return data;
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

  return (
    <div className="min-h-screen bg-[#0F1115] text-white/90 flex flex-col items-center px-6 py-16">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <p className="text-xs tracking-[0.6em] uppercase text-white/40">
            Momentum Plans
          </p>
          <h1 className="text-4xl md:text-5xl font-light tracking-wide">
            Evolua seu Foco
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base">
            Escolha o plano que mais combina com o seu ritmo. O Momentum Pro
            desbloqueia uploads em vídeo, projetos ilimitados e organização
            avançada.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {plans?.map((plan) => {
              const isCurrent = planName?.toUpperCase() === plan.name;
              const isPro = plan.name === "PRO";
              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl border ${
                    isPro
                      ? "border-blue-500/60 shadow-[0_20px_60px_rgba(59,130,246,0.25)]"
                      : "border-white/10"
                  } bg-white/5 backdrop-blur-2xl p-8 flex flex-col gap-6`}
                >
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.4em] text-white/40">
                      {plan.name}
                    </p>
                    <h2 className="text-3xl font-light">
                      {plan.price ? `R$ ${Number(plan.price).toFixed(2)}` : "Grátis"}
                    </h2>
                    <p className="text-white/60 text-sm">
                      {plan.description || "Plano essencial para foco diário."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                      Recursos
                    </p>
                    <ul className="space-y-2 text-sm text-white/80">
                      {plan.features.length === 0 && (
                        <li className="text-white/50">Recursos básicos</li>
                      )}
                      {plan.features.map((feature) => (
                        <li key={feature.feature.code} className="flex items-center gap-2">
                          <span className="text-blue-400">•</span>
                          <span>{feature.feature.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || subscribeMutation.isPending}
                    className={`w-full py-3 rounded-2xl transition-all ${
                      isCurrent
                        ? "bg-white/10 text-white/60 cursor-not-allowed"
                        : isPro
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {isCurrent
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

