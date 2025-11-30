import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Lightbulb,
  Clock,
  CheckSquare,
  Folder,
  Zap,
  Lock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useFeatureCheck } from "@/hooks/use-feature-check";
import { useTheme } from "@/context/theme-context";
import { AuthWall } from "../AuthWall";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useReportsState, type PeriodFilter } from "@/hooks/useReportsState";

interface ReportsWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

type OverviewReport = {
  totalFocusHours: number;
  tasksCompleted: number;
  activeProjects: number;
  focusTimePerInterval: Array<{
    date: string;
    minutes: number;
    hours: number;
  }>;
  projectDistribution: Array<{
    projectName: string;
    taskCount: number;
    completedTasks: number;
    percentage: number;
  }>;
};

type InsightsReport = OverviewReport & {
  efficiency: {
    savedMinutes: number;
    efficiencyRate: number;
    message: string;
  };
  sessionBreakdown: {
    focusSessions: number;
    shortBreakSessions: number;
    longBreakSessions: number;
  };
  projectVelocity: Array<{
    projectName: string;
    tasksCompleted: number;
    averageTimePerTask: number;
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    icon?: string;
  }>;
};

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F1115]/95 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-white/90 font-light text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-white/70 text-xs"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value.toFixed(2)}h
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ReportsWidget: React.FC<ReportsWidgetProps> = ({
  onClose,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const { hasFeature, isGuest, requireFeature, features, planName, isEpic } =
    useFeatureCheck();
  const hasBasicReports = hasFeature("BASIC_REPORTS");
  // Accept either ADVANCED_INSIGHTS or ADVANCED_REPORTS, or if user has EPIC plan
  const hasAdvancedInsights =
    hasFeature("ADVANCED_INSIGHTS") ||
    hasFeature("ADVANCED_REPORTS") ||
    isEpic ||
    planName?.toUpperCase() === "EPIC";

  const [activeTab, setActiveTab] = useState<"overview" | "insights">(
    "overview"
  );

  // Use persisted state hook
  const {
    period,
    customDateRange,
    updatePeriod,
    updateCustomDateRange,
    resetCustomDateRange,
  } = useReportsState(hasAdvancedInsights);

  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);

  // Build query URL with optional custom date range
  const buildReportUrl = (endpoint: string) => {
    const baseUrl = `/report/${endpoint}`;
    if (period === "CUSTOM" && customDateRange.from && customDateRange.to) {
      const from = customDateRange.from.toISOString().split("T")[0];
      const to = customDateRange.to.toISOString().split("T")[0];
      return `${baseUrl}?startDate=${from}&endDate=${to}`;
    }
    return `${baseUrl}?period=${period}`;
  };

  // Overview query
  const isCustomPeriod = period === "CUSTOM";
  const isCustomDateValid =
    !isCustomPeriod || (!!customDateRange.from && !!customDateRange.to);
  const shouldFetchOverview = Boolean(
    hasBasicReports && !isGuest && isCustomDateValid
  );

  const {
    data: overviewData,
    isLoading: isLoadingOverview,
    error: overviewError,
  } = useQuery<OverviewReport>({
    queryKey: [
      "report-overview",
      period,
      customDateRange.from,
      customDateRange.to,
    ],
    queryFn: () => api.get(buildReportUrl("overview")).then((res) => res.data),
    enabled: shouldFetchOverview,
    retry: 1,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Insights query (Epic only) - Only query if user has permission
  const shouldFetchInsights = Boolean(
    hasAdvancedInsights && // Frontend check (EPIC or ADVANCED_REPORTS or ADVANCED_INSIGHTS)
      !isGuest &&
      activeTab === "insights" &&
      isCustomDateValid
  );

  const {
    data: insightsData,
    isLoading: isLoadingInsights,
    error: insightsError,
  } = useQuery<InsightsReport>({
    queryKey: [
      "report-insights",
      period,
      customDateRange.from,
      customDateRange.to,
    ],
    queryFn: () => api.get(buildReportUrl("insights")).then((res) => res.data),
    enabled: shouldFetchInsights,
    retry: false, // Don't retry on error to avoid loops
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchOnMount: false, // Don't refetch when component mounts again
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Determine loading and error states based on active tab
  const isLoading =
    activeTab === "overview"
      ? isLoadingOverview
      : activeTab === "insights"
      ? isLoadingInsights
      : false;

  const error = activeTab === "overview" ? overviewError : insightsError;

  // Check if insights error is 403 (permission denied)
  const isInsights403 =
    insightsError && (insightsError as any)?.response?.status === 403;

  if (isGuest || !hasBasicReports) {
    return (
      <WidgetContainer
        title="Relatórios"
        onClose={onClose}
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
      >
        <AuthWall
          featureName="Relatórios"
          planRequired="Flow"
          onClose={onClose}
        />
      </WidgetContainer>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === "insights" && !hasAdvancedInsights) {
      requireFeature("ADVANCED_INSIGHTS", "Insights Avançados", "Epic");
      return;
    }
    setActiveTab(value as "overview" | "insights");
  };

  return (
    <WidgetContainer
      title="Relatórios"
      onClose={onClose}
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
      className="w-[700px] max-h-[85vh]"
    >
      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-80px)] custom-scrollbar">
        {/* Period Filter */}
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onValueChange={(value) => {
              const newPeriod = value as PeriodFilter;
              updatePeriod(newPeriod);
              if (newPeriod !== "CUSTOM") {
                setIsCustomDatePickerOpen(false);
                resetCustomDateRange();
              } else {
                setIsCustomDatePickerOpen(true);
              }
            }}
          >
            <SelectTrigger
              className="w-[180px] bg-white/5 border-white/10 text-white/90 focus:ring-2 focus:ring-offset-0 focus:border-white/20"
              style={
                {
                  "--ring-color": themeColor,
                } as React.CSSProperties & { "--ring-color": string }
              }
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 2px ${themeColor}40`;
                e.currentTarget.style.borderColor = `${themeColor}80`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="bg-[#0F1115] border-white/10"
              style={
                {
                  "--theme-color": themeColor,
                } as React.CSSProperties & { "--theme-color": string }
              }
            >
              {hasAdvancedInsights ? (
                <>
                  <SelectItem
                    value="DAY"
                    className="text-white/90 cursor-pointer"
                  >
                    Hoje
                  </SelectItem>
                  <SelectItem
                    value="WEEK"
                    className="text-white/90 cursor-pointer"
                  >
                    Esta Semana
                  </SelectItem>
                  <SelectItem
                    value="MONTH"
                    className="text-white/90 cursor-pointer"
                  >
                    Este Mês
                  </SelectItem>
                  <SelectItem
                    value="YEAR"
                    className="text-white/90 cursor-pointer"
                  >
                    Este Ano
                  </SelectItem>
                  <SelectItem
                    value="CUSTOM"
                    className="text-white/90 cursor-pointer"
                  >
                    Personalizado
                  </SelectItem>
                </>
              ) : (
                <>
                  <SelectItem
                    value="MONTH"
                    className="text-white/90 cursor-pointer"
                  >
                    Este Mês
                  </SelectItem>
                  <SelectItem
                    value="YEAR"
                    className="text-white/90 cursor-pointer"
                  >
                    Este Ano
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker - Only visible when CUSTOM is selected */}
          {period === "CUSTOM" && (
            <Popover
              open={isCustomDatePickerOpen}
              onOpenChange={setIsCustomDatePickerOpen}
            >
              <PopoverTrigger asChild>
                <button
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/90 hover:bg-white/10 transition-colors text-sm font-light flex items-center gap-2"
                  style={{
                    borderColor:
                      customDateRange.from && customDateRange.to
                        ? themeColor
                        : undefined,
                  }}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {customDateRange.from && customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "dd/MM/yyyy", {
                        locale: ptBR,
                      })}{" "}
                      -{" "}
                      {format(customDateRange.to, "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </>
                  ) : (
                    "Selecionar período"
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-[#0F1115] border-white/10 rounded-xl overflow-hidden"
                align="start"
              >
                <div
                  className="theme-calendar"
                  style={
                    {
                      "--calendar-theme-color": themeColor,
                    } as React.CSSProperties & {
                      "--calendar-theme-color": string;
                    }
                  }
                >
                  {/* Display textual do range selecionado */}
                  {(customDateRange.from || customDateRange.to) && (
                    <div className="px-4 pt-4 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/60 font-light">De:</span>
                        <span className="text-white font-medium">
                          {customDateRange.from
                            ? format(customDateRange.from, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "---"}
                        </span>
                        <span className="text-white/60 font-light mx-1">
                          até
                        </span>
                        <span className="text-white font-medium">
                          {customDateRange.to
                            ? format(customDateRange.to, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "---"}
                        </span>
                      </div>
                    </div>
                  )}

                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from || new Date()}
                    selected={{
                      from: customDateRange.from,
                      to: customDateRange.to,
                    }}
                    onSelect={(range) => {
                      updateCustomDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                      // Close popover only when both dates are fully selected
                      // Wait a bit to ensure the selection is complete
                      if (range?.from && range?.to) {
                        setTimeout(() => {
                          setIsCustomDatePickerOpen(false);
                        }, 150);
                      }
                    }}
                    numberOfMonths={1}
                    locale={ptBR}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: themeColor,
                        color: "white",
                      },
                      range_start: {
                        backgroundColor: themeColor,
                        color: "white",
                        borderRadius: "50%",
                      },
                      range_end: {
                        backgroundColor: themeColor,
                        color: "white",
                        borderRadius: "50%",
                      },
                      range_middle: {
                        backgroundColor: `${themeColor}33`, // 20% opacity
                        color: "white",
                        borderRadius: "0",
                      },
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Tabs - Always visible */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white/90 text-white/60"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white/90 text-white/60 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasAdvancedInsights}
            >
              Insights & IA
              {!hasAdvancedInsights && (
                <Lock className="h-3 w-3 text-white/40" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {isLoadingOverview ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="h-8 w-8 border-2 border-white/20 rounded-full animate-spin"
                  style={{ borderTopColor: themeColor }}
                />
              </div>
            ) : overviewError || !overviewData ? (
              <div className="text-center py-12">
                <p className="text-white/60 font-light mb-2">
                  Erro ao carregar relatórios
                </p>
                <p className="text-white/40 text-sm font-light">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="zen-glass rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="h-4 w-4 text-white/50" />
                    </div>
                    <p className="text-xs text-white/50 font-light uppercase tracking-wider mb-1">
                      Horas Focadas
                    </p>
                    <p className="text-2xl font-thin text-white/90">
                      {overviewData.totalFocusHours.toFixed(1)}h
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="zen-glass rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CheckSquare className="h-4 w-4 text-white/50" />
                    </div>
                    <p className="text-xs text-white/50 font-light uppercase tracking-wider mb-1">
                      Tarefas Feitas
                    </p>
                    <p className="text-2xl font-thin text-white/90">
                      {overviewData.tasksCompleted}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="zen-glass rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Folder className="h-4 w-4 text-white/50" />
                    </div>
                    <p className="text-xs text-white/50 font-light uppercase tracking-wider mb-1">
                      Projetos Ativos
                    </p>
                    <p className="text-2xl font-thin text-white/90">
                      {overviewData.activeProjects}
                    </p>
                  </motion.div>
                </div>
                {/* Area Chart */}
                <div className="zen-glass rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-white/90 mb-4">
                    Tendência de Foco
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={overviewData.focusTimePerInterval.map((item) => ({
                        date: item.date,
                        horas: item.hours,
                      }))}
                    >
                      <defs>
                        <linearGradient
                          id="colorFocus"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={themeColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={themeColor}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.5)"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.5)"
                        style={{ fontSize: "12px" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="horas"
                        stroke={themeColor}
                        fillOpacity={1}
                        fill="url(#colorFocus)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Chart */}
                {overviewData.projectDistribution.length > 0 && (
                  <div className="zen-glass rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-medium text-white/90 mb-4">
                      Distribuição de Projetos
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={overviewData.projectDistribution.map(
                            (item, index) => ({
                              name: item.projectName,
                              value: item.percentage,
                              color: COLORS[index % COLORS.length],
                              tasks: item.taskCount,
                              completed: item.completedTasks,
                            })
                          )}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {overviewData.projectDistribution.map(
                            (item, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {overviewData.projectDistribution.map(
                        (project, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              />
                              <span className="text-white/70">
                                {project.projectName}
                              </span>
                            </div>
                            <span className="text-white/50">
                              {project.completedTasks}/{project.taskCount}{" "}
                              concluídas
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {hasAdvancedInsights && (
            <TabsContent value="insights" className="space-y-6 mt-6">
              {isLoadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="h-8 w-8 border-2 border-white/20 rounded-full animate-spin"
                    style={{ borderTopColor: themeColor }}
                  />
                </div>
              ) : isInsights403 ? (
                <div className="text-center py-12">
                  <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 font-light mb-2">Acesso negado</p>
                  <p className="text-white/40 text-sm font-light">
                    Você precisa da feature ADVANCED_INSIGHTS para acessar esta
                    funcionalidade.
                  </p>
                  <p className="text-white/40 text-xs font-light mt-2">
                    Entre em contato com o suporte se você acredita que deveria
                    ter acesso.
                  </p>
                  <button
                    onClick={() => setActiveTab("overview")}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-light transition-colors"
                    style={{
                      backgroundColor: `${themeColor}20`,
                      color: themeColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${themeColor}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${themeColor}20`;
                    }}
                  >
                    Voltar para Visão Geral
                  </button>
                </div>
              ) : insightsError ? (
                <div className="text-center py-12">
                  <p className="text-white/60 font-light mb-2">
                    Erro ao carregar insights
                  </p>
                  <p className="text-white/40 text-sm font-light">
                    Tente novamente mais tarde
                  </p>
                  <button
                    onClick={() => setActiveTab("overview")}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-light transition-colors"
                    style={{
                      backgroundColor: `${themeColor}20`,
                      color: themeColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${themeColor}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${themeColor}20`;
                    }}
                  >
                    Voltar para Visão Geral
                  </button>
                </div>
              ) : insightsData ? (
                <>
                  {/* Efficiency Card */}
                  <div className="zen-glass rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-sm font-medium text-white/90">
                        Eficiência
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/50 font-light">
                          {insightsData.efficiency.message}
                        </p>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            insightsData.efficiency.efficiencyRate > 0
                              ? "text-emerald-400"
                              : insightsData.efficiency.efficiencyRate < 0
                              ? "text-red-400"
                              : "text-white/60"
                          )}
                        >
                          {insightsData.efficiency.efficiencyRate > 0
                            ? "+"
                            : ""}
                          {insightsData.efficiency.efficiencyRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.abs(insightsData.efficiency.efficiencyRate)
                            )}%`,
                            backgroundColor:
                              insightsData.efficiency.efficiencyRate > 0
                                ? "#10B981"
                                : "#EF4444",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Session Breakdown */}
                  <div className="zen-glass rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-medium text-white/90 mb-4">
                      Breakdown de Sessões
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={[
                          {
                            name: "Foco",
                            value: insightsData.sessionBreakdown.focusSessions,
                            color: themeColor,
                          },
                          {
                            name: "Pausa Curta",
                            value:
                              insightsData.sessionBreakdown.shortBreakSessions,
                            color: "#10B981",
                          },
                          {
                            name: "Pausa Longa",
                            value:
                              insightsData.sessionBreakdown.longBreakSessions,
                            color: "#F59E0B",
                          },
                        ]}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="rgba(255,255,255,0.5)"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.5)"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {[
                            { color: themeColor },
                            { color: "#10B981" },
                            { color: "#F59E0B" },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Recommendations */}
                  {insightsData.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-white/90">
                        Recomendações
                      </h3>
                      {insightsData.recommendations.map((rec, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="zen-glass rounded-xl p-4 border border-white/10"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{rec.icon || "💡"}</span>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-white/90 mb-1">
                                {rec.title}
                              </h4>
                              <p className="text-sm text-white/70 font-light">
                                {rec.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 font-light mb-2">
                    Carregando insights...
                  </p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </WidgetContainer>
  );
};
