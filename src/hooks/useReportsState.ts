import { useState, useEffect } from "react";

export type PeriodFilter = "DAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

interface ReportsState {
  period: PeriodFilter;
  customDateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const STORAGE_KEY = "momentum-reports-state";

const defaultState: ReportsState = {
  period: "MONTH",
  customDateRange: {
    from: undefined,
    to: undefined,
  },
};

export const useReportsState = (hasAdvancedInsights: boolean) => {
  const [state, setState] = useState<ReportsState>(() => {
    if (typeof window === "undefined") {
      return {
        ...defaultState,
        period: hasAdvancedInsights ? "WEEK" : "MONTH",
      };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          period: parsed.period || (hasAdvancedInsights ? "WEEK" : "MONTH"),
          customDateRange: {
            from: parsed.customDateRange?.from
              ? new Date(parsed.customDateRange.from)
              : undefined,
            to: parsed.customDateRange?.to
              ? new Date(parsed.customDateRange.to)
              : undefined,
          },
        };
      }
    } catch (error) {
      console.error("Error loading reports state:", error);
    }

    return {
      ...defaultState,
      period: hasAdvancedInsights ? "WEEK" : "MONTH",
    };
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      const toSave = {
        period: state.period,
        customDateRange: {
          from: state.customDateRange.from?.toISOString(),
          to: state.customDateRange.to?.toISOString(),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error("Error saving reports state:", error);
    }
  }, [state]);

  const updatePeriod = (period: PeriodFilter) => {
    setState((prev) => ({ ...prev, period }));
  };

  const updateCustomDateRange = (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    setState((prev) => ({
      ...prev,
      customDateRange: range,
    }));
  };

  const resetCustomDateRange = () => {
    setState((prev) => ({
      ...prev,
      customDateRange: { from: undefined, to: undefined },
    }));
  };

  return {
    period: state.period,
    customDateRange: state.customDateRange,
    updatePeriod,
    updateCustomDateRange,
    resetCustomDateRange,
  };
};
