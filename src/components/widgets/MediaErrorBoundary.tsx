import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MediaErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado pelo MediaErrorBoundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-black/40 backdrop-blur-xl rounded-3xl min-h-[400px] border border-white/10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-white/90 font-semibold mb-2">
            Erro ao carregar player
          </h3>
          <p className="text-white/60 text-sm text-center max-w-xs mb-4">
            {this.state.error?.message || "Ocorreu um erro inesperado"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-sm transition-all"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
