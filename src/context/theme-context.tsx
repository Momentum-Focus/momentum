import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSubscription } from "./subscription-context";

type ThemeContextType = {
  themeColor: string;
  setThemeColor: (color: string) => void;
  isLoading: boolean;
  hasCustomization: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME_COLOR = "#3B82F6"; // Blue

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { features } = useSubscription();
  const hasCustomization = features.includes("FULL_CUSTOMIZATION");
  const queryClient = useQueryClient();

  // Initialize theme from localStorage if available (for immediate application)
  const [themeColor, setThemeColorState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("themeColor");
      if (saved) {
        document.documentElement.style.setProperty("--theme-color", saved);
        return saved;
      }
    }
    return DEFAULT_THEME_COLOR;
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings-focus"],
    queryFn: () => api.get("/settings-focus").then((res) => res.data),
    enabled: true, // Always fetch, even if user doesn't have customization yet
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  useEffect(() => {
    if (settings?.themeColor) {
      setThemeColorState(settings.themeColor);
      // Apply to CSS variable
      document.documentElement.style.setProperty(
        "--theme-color",
        settings.themeColor
      );
      // Update localStorage to keep in sync
      if (typeof window !== "undefined") {
        localStorage.setItem("themeColor", settings.themeColor);
      }
    } else if (settings && !settings.themeColor) {
      // Settings exist but no themeColor, use default
      setThemeColorState(DEFAULT_THEME_COLOR);
      document.documentElement.style.setProperty(
        "--theme-color",
        DEFAULT_THEME_COLOR
      );
      if (typeof window !== "undefined") {
        localStorage.removeItem("themeColor");
      }
    } else if (!isLoading && !settings) {
      // No settings yet, use default
      setThemeColorState(DEFAULT_THEME_COLOR);
      document.documentElement.style.setProperty(
        "--theme-color",
        DEFAULT_THEME_COLOR
      );
      if (typeof window !== "undefined") {
        localStorage.removeItem("themeColor");
      }
    }
  }, [settings, isLoading]);

  const { mutate: updateTheme } = useMutation({
    mutationFn: (color: string) =>
      api
        .patch("/settings-focus/theme", { themeColor: color })
        .then((res) => res.data),
    onSuccess: (data, color) => {
      // Update state immediately
      setThemeColorState(color);
      document.documentElement.style.setProperty("--theme-color", color);
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("themeColor", color);
      }
      // Invalidate and refetch to ensure consistency
      queryClient.setQueryData(["settings-focus"], (old: any) => ({
        ...old,
        themeColor: color,
      }));
      queryClient.invalidateQueries({ queryKey: ["settings-focus"] });
    },
    onError: (error) => {
      console.error("Error updating theme:", error);
    },
  });

  const setThemeColor = (color: string) => {
    if (!hasCustomization) return;
    setThemeColorState(color);
    document.documentElement.style.setProperty("--theme-color", color);
    // Save to localStorage for immediate persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("themeColor", color);
    }
    updateTheme(color);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor: themeColor || DEFAULT_THEME_COLOR,
        setThemeColor,
        isLoading,
        hasCustomization,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
