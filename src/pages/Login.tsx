import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import momentumLogo from "@/assets/momentum-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import googleIcon from "@/assets/icon-google.png";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type LoginFormInputs = {
  email: string;
  password: string;
};

type AuthResponse = {
  message?: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  token?: string;
  access_token?: string; // Backend retorna access_token
};

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailAutofilled, setIsEmailAutofilled] = useState(false);
  const [isPasswordAutofilled, setIsPasswordAutofilled] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const emailRegister = register("email", {
    required: "E-mail é obrigatório",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "E-mail inválido",
    },
  });
  const passwordRegister = register("password", {
    required: "Senha é obrigatória",
  });

  const checkAutofill = (
    input: HTMLInputElement | null,
    setter: (value: boolean) => void
  ) => {
    if (!input) {
      setter(false);
      return;
    }

    // Verifica se tem valor primeiro
    const hasValue = input.value.length > 0;
    if (!hasValue) {
      setter(false);
      return;
    }

    // Verifica se o input tem a pseudo-classe :autofill (mais confiável)
    const hasAutofillClass =
      input.matches(":-webkit-autofill") || input.matches(":autofill");

    if (hasAutofillClass) {
      setter(true);
      return;
    }

    // Verifica se o input tem autofill através do estilo aplicado pelo navegador
    const styles = window.getComputedStyle(input);
    const bgColor = styles.backgroundColor;
    const computedBg = bgColor.toLowerCase().trim();

    // Verifica se o background é branco sólido (autofill do navegador)
    // Autofill do navegador aplica fundo branco sólido
    // bg-white/5 = rgba(255, 255, 255, 0.05) que aparece como rgba(0, 0, 0, 0) ou transparent
    // Autofill aplica rgb(255, 255, 255) ou rgba(250, 255, 189, 1) ou rgba(255, 255, 255, 1)
    const isWhiteBackground =
      computedBg === "rgb(255, 255, 255)" ||
      computedBg === "rgba(255, 255, 255, 1)" ||
      computedBg.startsWith("rgba(250, 255, 189") ||
      (computedBg.startsWith("rgba(255, 255, 255") &&
        !computedBg.includes("0.05") &&
        !computedBg.includes("0, 0, 0") &&
        !computedBg.includes("0.02"));

    const isAutofilled = isWhiteBackground;
    setter(isAutofilled);
  };

  useEffect(() => {
    const checkEmail = () =>
      checkAutofill(emailInputRef.current, setIsEmailAutofilled);
    const checkPassword = () =>
      checkAutofill(passwordInputRef.current, setIsPasswordAutofilled);

    const checkAll = () => {
      checkEmail();
      checkPassword();
    };

    // Delay inicial para dar tempo do autocomplete ser aplicado
    const initialChecks = [100, 200, 300, 500, 800, 1000];
    initialChecks.forEach((delay) => {
      setTimeout(checkAll, delay);
    });

    checkAll();
    const interval = setInterval(checkAll, 100);

    const emailInput = emailInputRef.current;
    const passwordInput = passwordInputRef.current;

    if (emailInput) {
      const observer = new MutationObserver(() => {
        setTimeout(checkEmail, 50);
      });
      observer.observe(emailInput, {
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: false,
        subtree: false,
      });
      emailInput.addEventListener("input", () => setTimeout(checkEmail, 50));
      emailInput.addEventListener("change", () => setTimeout(checkEmail, 50));
      emailInput.addEventListener("focus", () => setTimeout(checkEmail, 100));
      emailInput.addEventListener("blur", () => setTimeout(checkEmail, 100));
      emailInput.addEventListener("animationstart", checkEmail);
    }

    if (passwordInput) {
      const observer = new MutationObserver(() => {
        setTimeout(checkPassword, 50);
      });
      observer.observe(passwordInput, {
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: false,
        subtree: false,
      });
      passwordInput.addEventListener("input", () =>
        setTimeout(checkPassword, 50)
      );
      passwordInput.addEventListener("change", () =>
        setTimeout(checkPassword, 50)
      );
      passwordInput.addEventListener("focus", () =>
        setTimeout(checkPassword, 100)
      );
      passwordInput.addEventListener("blur", () =>
        setTimeout(checkPassword, 100)
      );
      passwordInput.addEventListener("animationstart", checkPassword);
    }

    return () => {
      clearInterval(interval);
      if (emailInput) {
        emailInput.removeEventListener("input", checkEmail as any);
        emailInput.removeEventListener("change", checkEmail as any);
        emailInput.removeEventListener("focus", checkEmail as any);
        emailInput.removeEventListener("blur", checkEmail as any);
        emailInput.removeEventListener("animationstart", checkEmail);
      }
      if (passwordInput) {
        passwordInput.removeEventListener("input", checkPassword as any);
        passwordInput.removeEventListener("change", checkPassword as any);
        passwordInput.removeEventListener("focus", checkPassword as any);
        passwordInput.removeEventListener("blur", checkPassword as any);
        passwordInput.removeEventListener("animationstart", checkPassword);
      }
    };
  }, []);

  const { mutate, isPending } = useMutation<
    AuthResponse,
    Error,
    LoginFormInputs
  >({
    mutationFn: (data) => api.post("/auth/login", data).then((res) => res.data),

    onSuccess: (data) => {
      // Limpar flag de token removido antes de salvar o novo token
      sessionStorage.removeItem("tokenRemoved");

      // O backend retorna access_token, mas pode retornar token também
      const token = data.access_token || data.token;

      if (!token) {
        toast({
          title: "Erro",
          description: "Token não recebido do servidor. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Salvar token primeiro
      localStorage.setItem("authToken", token);

      // Verificar se o token foi salvo corretamente
      const savedToken = localStorage.getItem("authToken");
      if (!savedToken) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar o token. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Remover queries do cache para forçar refetch na próxima página
      queryClient.removeQueries({ queryKey: ["userProfile"] });
      queryClient.removeQueries({ queryKey: ["plans"] });

      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta, ${data.user.name}.`,
      });

      // Pequeno delay para garantir que o token seja salvo antes do reload
      setTimeout(() => {
        window.location.replace("/");
      }, 50);
    },

    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description:
          error.response?.data?.message || "Verifique seu e-mail e senha.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormInputs) => {
    mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] relative overflow-hidden p-4">
      {/* Background abstrato com overlay fosco */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Card Glassmorphism */}
      <div className="relative z-10 w-full max-w-md">
        <div className="zen-glass border-white/10 rounded-3xl p-12 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src={momentumLogo}
                alt="Momentum"
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-white/90 tracking-wide mb-2">
              Acessar minha conta
            </h1>
            <p className="text-white/60 font-light text-sm">
              Use seu e-mail e senha para entrar
            </p>
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
            {/* Inputs */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs uppercase tracking-widest text-white/60 font-light"
              >
                E-mail
              </Label>
              <div className="relative">
                <Mail
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                    isEmailAutofilled ? "text-black/60" : "text-white/40"
                  }`}
                  strokeWidth={1.5}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...emailRegister}
                  ref={(e) => {
                    emailInputRef.current = e;
                    if (emailRegister.ref) {
                      if (typeof emailRegister.ref === "function") {
                        emailRegister.ref(e);
                      } else {
                        emailRegister.ref.current = e;
                      }
                    }
                  }}
                  className="bg-white/5 border-0 rounded-full h-12 pl-11 pr-4 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs uppercase tracking-widest text-white/60 font-light"
              >
                Senha
              </Label>
              <div className="relative">
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                    isPasswordAutofilled ? "text-black/60" : "text-white/40"
                  }`}
                  strokeWidth={1.5}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  {...passwordRegister}
                  ref={(e) => {
                    passwordInputRef.current = e;
                    if (passwordRegister.ref) {
                      if (typeof passwordRegister.ref === "function") {
                        passwordRegister.ref(e);
                      } else {
                        passwordRegister.ref.current = e;
                      }
                    }
                  }}
                  className="bg-white/5 border-0 rounded-full h-12 pl-11 pr-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${
                    isPasswordAutofilled
                      ? "text-black/60 hover:text-black/80"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Botão Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-light transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 !text-white"
              style={{ color: "white" }}
              disabled={isPending}
            >
              {isPending ? "Entrando..." : "Entrar"}
            </Button>

            {/* Divisor */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black/40 backdrop-blur-sm px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/40 font-light rounded-full border border-white/10">
                  Ou continue com
                </span>
              </div>
            </div>

            {/* Botão Social - Apenas Google */}
            <div>
              <a
                href={`${
                  import.meta.env.VITE_API_URL || "http://localhost:3000"
                }/auth/google/login`}
                className="block"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 text-white/90 rounded-full font-light transition-all group !text-white/90"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  <img
                    src={googleIcon}
                    alt="Google"
                    className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform"
                  />
                  Continuar com Google
                </Button>
              </a>
            </div>

            {/* Links */}
            <div className="text-center space-y-3 pt-4">
              <Link
                to="/forgot-password"
                className="block text-sm text-white/60 hover:text-white/90 transition-colors font-light"
              >
                Esqueci minha senha
              </Link>

              <div className="text-sm text-white/60 font-light">
                Não tem uma conta?{" "}
                <Link
                  to="/signup"
                  className="text-blue-400 hover:text-blue-300 transition-colors no-underline"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
