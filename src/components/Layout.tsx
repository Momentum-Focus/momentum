import React from "react";
import { LogOut, LogIn } from "lucide-react";
import momentumLogo from "@/assets/momentum-logo.png";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  backgroundImage?: string;
  userName?: string;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  backgroundImage,
  userName,
  onLogout,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Background Image/Video */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between">
          <div className="flex flex-col">
            <p className="text-xs tracking-[0.5em] uppercase text-white/40">
              Momentum
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/plans"
              className="text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors"
            >
              Planos
            </Link>
            {userName ? (
              <>
                <span className="text-sm text-white/60 font-light">
                  Olá, {userName}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="h-8 w-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center group"
                  >
                    <LogOut
                      className="h-4 w-4 text-white/60 group-hover:text-red-400 transition-colors"
                      strokeWidth={1.5}
                    />
                  </button>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 transition-all text-sm font-light"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                Entrar
              </Link>
            )}
          </div>
        </header>

        {/* Center Hero */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-4 px-6">
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl shadow-black/40">
                <img
                  src={momentumLogo}
                  alt="Momentum"
                  className="w-12 h-12 object-contain opacity-90"
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs tracking-[0.6em] uppercase text-white/40">
                  Mindful Workspace
                </p>
                <h2 className="text-5xl md:text-6xl font-extralight tracking-[0.3em] text-white">
                  Momentum
                </h2>
                <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto font-light">
                  Um espaço imersivo para foco, produtividade e bem-estar
                  mental.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="h-full w-full">{children}</div>
      </div>
    </div>
  );
};
