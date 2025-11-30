import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { User, Save, Trophy, Lock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-context";

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
  const [activeTab, setActiveTab] = useState<"profile" | "achievements">(
    "profile"
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { themeColor } = useTheme();

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
    watch,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const watchedValues = watch();

  // Detecta mudanças no formulário
  useEffect(() => {
    if (!user) return;

    const hasChanges =
      watchedValues.name !== user.name ||
      watchedValues.email !== user.email ||
      watchedValues.phone !== user.phone;

    setIsDirty(hasChanges);
  }, [watchedValues, user]);

  // Reseta o formulário quando o usuário carrega
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      setIsDirty(false);
    }
  }, [user, reset]);

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProfileFormData) =>
      api.patch("/user", data).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setIsDirty(false);
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

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    deleteAccount();
  };

  if (isLoading) {
    return null;
  }

  const earnedAchievementCodes = new Set(
    earnedAchievements.map((ea) => ea.achievement.code)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] h-auto overflow-hidden p-0 rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-50">
          {/* Accessibility */}
          <DialogTitle className="sr-only">Perfil do Usuário</DialogTitle>
          <DialogDescription className="sr-only">
            Gerencie seu perfil e configurações, visualize suas conquistas
          </DialogDescription>

          {/* Conteúdo com scroll natural */}
          <div className="overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="px-8 pt-12 pb-8 space-y-8">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div
                    className="w-28 h-28 rounded-full border-4 flex items-center justify-center"
                    style={{
                      borderColor: themeColor,
                      boxShadow: `0 0 40px ${themeColor}40`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(to bottom right, ${themeColor}30, ${themeColor}10)`,
                      }}
                    >
                      <User
                        className="h-14 w-14"
                        style={{ color: themeColor }}
                        strokeWidth={1.2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div className="text-center">
                <h2 className="text-white/90 font-light text-2xl tracking-wide">
                  {user?.name || "Usuário"}
                </h2>
                <p className="text-white/60 font-light text-sm mt-1">
                  Gerencie seu perfil e configurações
                </p>
              </div>

              {/* Abas (Pílulas) */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`px-6 py-2.5 rounded-full text-sm font-light transition-all duration-200 ${
                    activeTab === "profile"
                      ? "text-white shadow-lg"
                      : "text-white/60 hover:text-white/80 bg-white/5"
                  }`}
                  style={
                    activeTab === "profile"
                      ? {
                          backgroundColor: themeColor,
                          boxShadow: `0 4px 20px ${themeColor}40`,
                        }
                      : {}
                  }
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Perfil
                </button>
                <button
                  onClick={() => setActiveTab("achievements")}
                  className={`px-6 py-2.5 rounded-full text-sm font-light transition-all duration-200 ${
                    activeTab === "achievements"
                      ? "text-white shadow-lg"
                      : "text-white/60 hover:text-white/80 bg-white/5"
                  }`}
                  style={
                    activeTab === "achievements"
                      ? {
                          backgroundColor: themeColor,
                          boxShadow: `0 4px 20px ${themeColor}40`,
                        }
                      : {}
                  }
                >
                  <Trophy className="h-4 w-4 inline mr-2" />
                  Conquistas
                </button>
              </div>

              {/* Conteúdo das Abas */}
              {activeTab === "profile" && (
                <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-white/40 font-light">
                        Nome
                      </Label>
                      <Input
                        {...register("name", {
                          required: "Nome é obrigatório",
                        })}
                        className="bg-white/5 border-0 rounded-2xl h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-offset-0 transition-all text-base font-light"
                        style={
                          {
                            "--tw-ring-color": `${themeColor}50`,
                          } as React.CSSProperties
                        }
                        onFocus={(e) => {
                          e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = "";
                        }}
                        placeholder="Seu nome"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-400 font-light">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-white/40 font-light">
                        Email
                      </Label>
                      <Input
                        type="email"
                        {...register("email", {
                          required: "Email é obrigatório",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Email inválido",
                          },
                        })}
                        className="bg-white/5 border-0 rounded-2xl h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-offset-0 transition-all text-base font-light"
                        style={
                          {
                            "--tw-ring-color": `${themeColor}50`,
                          } as React.CSSProperties
                        }
                        onFocus={(e) => {
                          e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = "";
                        }}
                        placeholder="seu@email.com"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-400 font-light">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-white/40 font-light">
                        Telefone
                      </Label>
                      <Input
                        type="tel"
                        {...register("phone", {
                          required: "Telefone é obrigatório",
                        })}
                        className="bg-white/5 border-0 rounded-2xl h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-offset-0 transition-all text-base font-light"
                        style={
                          {
                            "--tw-ring-color": `${themeColor}50`,
                          } as React.CSSProperties
                        }
                        onFocus={(e) => {
                          e.target.style.boxShadow = `0 0 0 1px ${themeColor}50`;
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = "";
                        }}
                        placeholder="(00) 00000-0000"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-400 font-light">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-white/40 font-light flex items-center gap-2">
                        CPF
                        <Lock
                          className="h-3 w-3 text-white/30"
                          strokeWidth={1.5}
                        />
                      </Label>
                      <Input
                        value={user?.cpf || ""}
                        disabled
                        readOnly
                        className="bg-white/5 border-0 rounded-2xl h-12 text-white/30 cursor-not-allowed opacity-50 text-base font-light"
                      />
                    </div>
                  </div>

                  {/* Botão Salvar (Só aparece quando há mudanças) */}
                  <AnimatePresence>
                    {isDirty && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="pt-4"
                      >
                        <Button
                          type="submit"
                          disabled={isUpdating}
                          className="w-full text-white rounded-full h-12 font-light text-base shadow-lg"
                          style={{
                            backgroundColor: themeColor,
                            boxShadow: `0 4px 20px ${themeColor}40`,
                          }}
                          onMouseEnter={(e) => {
                            const color = themeColor;
                            const r = parseInt(color.slice(1, 3), 16);
                            const g = parseInt(color.slice(3, 5), 16);
                            const b = parseInt(color.slice(5, 7), 16);
                            const darker = `rgb(${Math.max(
                              0,
                              r - 20
                            )}, ${Math.max(0, g - 20)}, ${Math.max(
                              0,
                              b - 20
                            )})`;
                            e.currentTarget.style.backgroundColor = darker;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeColor;
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isUpdating ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Zona de Perigo (Link discreto) */}
                  <div className="pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs text-red-400/60 hover:text-red-400/80 font-light transition-colors flex items-center gap-1.5 mx-auto"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Zona de Perigo: Excluir minha conta
                    </button>
                  </div>
                </form>
              )}

              {/* Aba Conquistas */}
              {activeTab === "achievements" && (
                <div className="grid grid-cols-2 gap-3">
                  {allAchievements.map((achievement) => {
                    const isUnlocked = earnedAchievementCodes.has(
                      achievement.code
                    );
                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 border rounded-2xl transition-all ${
                          isUnlocked
                            ? ""
                            : "border-white/10 bg-white/5 opacity-50"
                        }`}
                        style={
                          isUnlocked
                            ? {
                                borderColor: `${themeColor}60`,
                                backgroundColor: `${themeColor}10`,
                              }
                            : {}
                        }
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Trophy
                            className={`h-8 w-8 ${
                              isUnlocked ? "" : "text-white/30"
                            }`}
                            style={isUnlocked ? { color: themeColor } : {}}
                            strokeWidth={1.5}
                          />
                          <div>
                            <h4 className="text-sm font-light text-white/90">
                              {achievement.name}
                            </h4>
                            <p className="text-xs text-white/50 mt-1 font-light">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="zen-glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90 font-light">
              Excluir Conta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 font-light">
              Tem certeza que deseja excluir sua conta? Esta ação não pode ser
              desfeita. Todos os seus dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="text-white/70 border-white/20 font-light"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white font-light"
            >
              {isDeleting ? "Excluindo..." : "Excluir Conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
