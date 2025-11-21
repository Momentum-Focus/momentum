import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { User, Edit2, Save, X, Trash2, Trophy, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useFocusSettings } from "@/hooks/use-focus-settings";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProfileFormData = {
  name: string;
  email: string;
  phone: string;
};

type BaseAchievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
};

type UserAchievement = {
  id: number;
  earnedAt: string;
  achievement: BaseAchievement;
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    enabled: open,
  });

  const { data: earnedAchievements = [] } = useQuery<UserAchievement[]>({
    queryKey: ["achievements", "me"],
    queryFn: () => api.get("/achievements/me").then((res) => res.data),
    enabled: open,
  });

  const { data: allAchievements = [] } = useQuery<BaseAchievement[]>({
    queryKey: ["achievements", "catalog"],
    queryFn: () => api.get("/achievements").then((res) => res.data),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user, reset]);

  const { data: focusSettings, saveSettings, saving: isSavingFocus } = useFocusSettings();
  const [timerSettings, setTimerSettings] = useState({
    focusDurationMinutes: 25,
    shortBreakDurationMinutes: 5,
    longBreakDurationMinutes: 15,
    cyclesBeforeLongBreak: 4,
  });
  const [isTimerDirty, setIsTimerDirty] = useState(false);

  useEffect(() => {
    if (focusSettings) {
      setTimerSettings(focusSettings);
      setIsTimerDirty(false);
    }
  }, [focusSettings]);

  const handleTimerChange = (
    field: keyof typeof timerSettings,
    value: number
  ) => {
    setIsTimerDirty(true);
    setTimerSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveTimer = async () => {
    try {
      await saveSettings(timerSettings);
      toast({
        title: "Configurações salvas",
        description: "Seu cronômetro Pomodoro foi atualizado.",
      });
      setIsTimerDirty(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description:
          error.response?.data?.message ||
          "Não foi possível atualizar suas configurações agora.",
        variant: "destructive",
      });
    }
  };

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProfileFormData) =>
      api.patch("/user/profile", data).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete("/user").then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso.",
      });
      localStorage.removeItem("authToken");
      queryClient.clear();
      navigate("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir conta",
        description:
          error.response?.data?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: ProfileFormData) => {
    updateProfile(data);
  };

  const handleCancel = () => {
    reset({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    deleteAccount();
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] px-8 py-10">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-light text-3xl tracking-wide">
              Perfil do Usuário
            </DialogTitle>
            <DialogDescription className="text-white/60 font-light">
              Gerencie suas informações pessoais e veja suas conquistas.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-2xl p-1">
              <TabsTrigger
                value="profile"
                className="text-white/60 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-white shadow-inner shadow-black/20 transition-colors"
              >
                Perfil
              </TabsTrigger>
              <TabsTrigger
                value="achievements"
                className="text-white/60 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-white shadow-inner shadow-black/20 transition-colors"
              >
                Conquistas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              {!isEditing ? (
                <div className="space-y-8">
                  {/* Avatar */}
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-b from-blue-500/30 to-blue-500/5 border border-blue-400/50 flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                      <User className="h-14 w-14 text-blue-300" strokeWidth={1.3} />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-light">
                        Nome
                      </label>
                      <p className="mt-2 text-lg text-white/90 font-medium">
                        {user?.name || "—"}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-light">
                        Email
                      </label>
                      <p className="mt-2 text-lg text-white/90 font-medium break-all">
                        {user?.email || "—"}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-light">
                        Telefone
                      </label>
                      <p className="mt-2 text-lg text-white/80 font-medium">
                        {user?.phone || "—"}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-light flex items-center gap-2">
                        CPF
                        <Lock className="h-3 w-3" strokeWidth={1.5} />
                      </label>
                      <p className="mt-2 text-lg text-white/40 font-medium flex items-center gap-2">
                        {user?.cpf || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                          Configurações de Foco
                        </p>
                        <p className="text-sm text-white/70">
                          Personalize sua rotina de Pomodoro
                        </p>
                      </div>
                      <button
                        onClick={handleSaveTimer}
                        disabled={!isTimerDirty || isSavingFocus}
                        className="px-3 py-2 rounded-xl bg-blue-500/90 text-white text-sm disabled:opacity-40"
                      >
                        {isSavingFocus ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-white/50 space-y-2">
                        <span>Foco (min)</span>
                        <input
                          type="number"
                          min={1}
                          value={timerSettings.focusDurationMinutes}
                          onChange={(event) =>
                            handleTimerChange(
                              "focusDurationMinutes",
                              parseInt(event.target.value, 10) || 1
                            )
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        />
                      </label>
                      <label className="text-xs text-white/50 space-y-2">
                        <span>Pausa Curta (min)</span>
                        <input
                          type="number"
                          min={1}
                          value={timerSettings.shortBreakDurationMinutes}
                          onChange={(event) =>
                            handleTimerChange(
                              "shortBreakDurationMinutes",
                              parseInt(event.target.value, 10) || 1
                            )
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        />
                      </label>
                      <label className="text-xs text-white/50 space-y-2">
                        <span>Pausa Longa (min)</span>
                        <input
                          type="number"
                          min={1}
                          value={timerSettings.longBreakDurationMinutes}
                          onChange={(event) =>
                            handleTimerChange(
                              "longBreakDurationMinutes",
                              parseInt(event.target.value, 10) || 1
                            )
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        />
                      </label>
                      <label className="text-xs text-white/50 space-y-2">
                        <span>Ciclos até pausa longa</span>
                        <input
                          type="number"
                          min={1}
                          value={timerSettings.cyclesBeforeLongBreak}
                          onChange={(event) =>
                            handleTimerChange(
                              "cyclesBeforeLongBreak",
                              parseInt(event.target.value, 10) || 1
                            )
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <motion.button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-blue-500/90 hover:bg-blue-500 text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                      Editar Perfil
                    </motion.button>
                    <motion.button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-3 rounded-2xl bg-transparent hover:bg-red-500/20 text-red-400 font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      Excluir Conta
                    </motion.button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-light">
                      Nome
                    </label>
                    <input
                      {...register("name", { required: "Nome é obrigatório" })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Seu nome"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-400">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-light">
                      Email
                    </label>
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email é obrigatório",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Email inválido",
                        },
                      })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="seu@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-light">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      {...register("phone", { required: "Telefone é obrigatório" })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="(00) 00000-0000"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-400">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-light flex items-center gap-2">
                      CPF
                      <Lock className="h-3 w-3" strokeWidth={1.5} />
                    </label>
                    <input
                      value={user?.cpf || ""}
                      disabled
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white/30 cursor-not-allowed"
                    />
                    <p className="text-xs text-white/30 font-light">
                      O CPF não pode ser alterado.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
                      whileHover={{ scale: isUpdating ? 1 : 1.02 }}
                      whileTap={{ scale: isUpdating ? 1 : 0.98 }}
                    >
                      <Save className="h-4 w-4" strokeWidth={1.5} />
                      {isUpdating ? "Salvando..." : "Salvar"}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleCancel}
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2 rounded-xl bg-transparent hover:bg-white/10 text-white/90 font-medium transition-colors flex items-center justify-center gap-2 border border-white/10"
                      whileHover={{ scale: isUpdating ? 1 : 1.02 }}
                      whileTap={{ scale: isUpdating ? 1 : 0.98 }}
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                      Cancelar
                    </motion.button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4 mt-6">
              {allAchievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allAchievements.map((achievement) => {
                    const earned = earnedAchievements.find(
                      (item) => item.achievement.code === achievement.code
                    );
                    const isUnlocked = Boolean(earned);
                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 border rounded-2xl transition-all ${
                          isUnlocked
                            ? "border-blue-500/60 bg-blue-500/10 shadow-[0_15px_40px_rgba(59,130,246,0.25)]"
                            : "border-white/10 bg-black/20 opacity-70"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                              isUnlocked ? "bg-blue-500/30" : "bg-white/5"
                            }`}
                          >
                            <Trophy
                              className="h-6 w-6"
                              strokeWidth={1.4}
                              color={isUnlocked ? "#60A5FA" : "#6B7280"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-lg text-white">
                              {achievement.name}
                            </h3>
                            <p className="text-sm text-white/60 mt-1 font-light">
                              {achievement.description}
                            </p>
                            <p className="text-xs text-white/40 mt-3 font-light">
                              {isUnlocked
                                ? `Conquistado em ${new Date(
                                    earned?.earnedAt || ""
                                  ).toLocaleDateString("pt-BR")}`
                                : "Complete desafios para desbloquear"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 space-y-4 border border-dashed border-white/15 rounded-3xl bg-white/5">
                  <Trophy className="h-16 w-16 mx-auto text-white/20" strokeWidth={1.2} />
                  <div className="space-y-2">
                    <p className="text-white/70 font-light text-lg">
                      Carregando conquistas...
                    </p>
                    <p className="text-sm text-white/40 font-light">
                      Aguarde enquanto buscamos sua galeria de medalhas.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="zen-glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja excluir sua conta? Esta ação não pode ser
              desfeita. Todos os seus dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-white/70">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "Excluindo..." : "Excluir Conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
