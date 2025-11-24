import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { User, Save, Trash2, Trophy, Lock } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProfileFormData) =>
      api.patch("/user", data).then((res) => res.data),
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
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
        <DialogContent className="max-w-2xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] px-8 py-8">
          {/* Header com Avatar */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/40 to-blue-500/10 border-2 border-blue-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <User className="h-12 w-12 text-blue-300" strokeWidth={1.2} />
                </div>
                <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse" />
              </div>
            </div>
            <DialogTitle className="text-white/90 font-light text-2xl tracking-wide mb-1">
              {user?.name || "Usuário"}
            </DialogTitle>
            <DialogDescription className="text-white/60 font-light text-sm">
              Gerencie seu perfil e configurações
            </DialogDescription>
          </div>

          {/* Segmented Control (Pílulas) */}
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(value) => {
              if (value) setActiveTab(value as "profile" | "achievements");
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-1 mb-6"
          >
            <ToggleGroupItem
              value="profile"
              aria-label="Perfil"
              className="flex-1 data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 rounded-xl transition-all"
            >
              <User className="h-4 w-4 mr-2" />
              Perfil
            </ToggleGroupItem>
            <ToggleGroupItem
              value="achievements"
              aria-label="Conquistas"
              className="flex-1 data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 rounded-xl transition-all"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Conquistas
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Conteúdo das Abas */}
          <div className="min-h-[300px]">
            {/* Aba Perfil */}
            {activeTab === "profile" && (
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                      Nome
                    </Label>
                    <Input
                      {...register("name", { required: "Nome é obrigatório" })}
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="Seu nome"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-400">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
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
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="seu@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                      Telefone
                    </Label>
                    <Input
                      type="tel"
                      {...register("phone", {
                        required: "Telefone é obrigatório",
                      })}
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-400">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-white/60 font-light flex items-center gap-2">
                      CPF
                      <Lock
                        className="h-3 w-3 text-white/40"
                        strokeWidth={1.5}
                      />
                    </Label>
                    <Input
                      value={user?.cpf || ""}
                      disabled
                      readOnly
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-white/30 cursor-not-allowed opacity-50"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* Aba Conquistas */}
            {activeTab === "achievements" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allAchievements.map((achievement) => {
                  const isUnlocked = earnedAchievementCodes.has(
                    achievement.code
                  );
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 border rounded-xl transition-all ${
                        isUnlocked
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-white/10 bg-white/5 opacity-50"
                      }`}
                    >
                      <div className="flex flex-col items-center text-center space-y-2">
                        <Trophy
                          className={`h-8 w-8 ${
                            isUnlocked ? "text-blue-400" : "text-white/30"
                          }`}
                          strokeWidth={1.5}
                        />
                        <div>
                          <h4 className="text-sm font-medium text-white/90">
                            {achievement.name}
                          </h4>
                          <p className="text-xs text-white/50 mt-1">
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

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
            {activeTab === "profile" && (
              <>
                <Button
                  onClick={handleSubmit(handleSave)}
                  disabled={isUpdating}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-11 font-light"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl h-11 font-light"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conta
                </Button>
              </>
            )}
            {activeTab === "focus" && (
              <Button
                onClick={handleSaveTimer}
                disabled={!isTimerDirty || isSavingFocus}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-11 font-light disabled:opacity-40"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingFocus ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}
            {activeTab === "achievements" && (
              <div className="w-full text-center text-sm text-white/50 font-light">
                Continue focado para desbloquear mais conquistas!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="zen-glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">
              Excluir Conta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir sua conta? Esta ação não pode ser
              desfeita. Todos os seus dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="text-white/70 border-white/20"
            >
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
