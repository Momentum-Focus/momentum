import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api } from "@/lib/api";

type SubscriptionFeature = {
  feature: {
    code: string;
    name: string;
  };
};

type SubscriptionResponse = {
  plan?: {
    name: string;
    features: SubscriptionFeature[];
  };
};

type SubscriptionContextValue = {
  planName: string | null;
  features: string[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  planName: null,
  features: [],
  loading: false,
  refresh: async () => {},
});

export const SubscriptionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [features, setFeatures] = useState<string[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setPlanName(null);
      setFeatures([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get<SubscriptionResponse>("/plans/me");
      if (data?.plan) {
        setPlanName(data.plan.name);
        setFeatures(data.plan.features?.map((item) => item.feature.code) ?? []);
      } else {
        setPlanName("VIBES");
        setFeatures([]);
      }
    } catch (error) {
      setPlanName(null);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{ planName, features, loading, refresh: fetchSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
