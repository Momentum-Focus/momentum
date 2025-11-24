import { useSubscription } from "@/context/subscription-context";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const useFeatureCheck = () => {
  const { features, planName } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAuthWall, setShowAuthWall] = useState(false);

  const hasFeature = (featureCode: string): boolean => {
    return features.includes(featureCode);
  };

  const requireFeature = (
    featureCode: string,
    featureName: string,
    planRequired: string = "Flow"
  ): boolean => {
    if (hasFeature(featureCode)) {
      return true;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setShowAuthWall(true);
      return false;
    }

    toast({
      title: "Recurso exclusivo",
      description: `Esta funcionalidade está disponível apenas no plano ${planRequired}. Faça upgrade para desbloquear.`,
    });
    navigate("/plans");
    return false;
  };

  const isGuest = !localStorage.getItem("authToken");
  const isVibes = !planName || planName.toUpperCase() === "VIBES";
  const isFlow = planName?.toUpperCase() === "FLOW";
  const isEpic = planName?.toUpperCase() === "EPIC";

  return {
    hasFeature,
    requireFeature,
    showAuthWall,
    setShowAuthWall,
    isGuest,
    isVibes,
    isFlow,
    isEpic,
    planName,
    features,
  };
};
