import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type FocusSettings = {
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  cyclesBeforeLongBreak: number;
};

export const useFocusSettings = () => {
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("authToken");
  const queryClient = useQueryClient();

  const query = useQuery<FocusSettings>({
    queryKey: ["focus-settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings-focus");
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });

  const mutation = useMutation({
    mutationFn: async (values: Partial<FocusSettings>) => {
      const { data } = await api.put("/settings-focus", values);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["focus-settings"], data);
    },
  });

  return {
    ...query,
    saveSettings: mutation.mutateAsync,
    saving: mutation.isPending,
  };
};

