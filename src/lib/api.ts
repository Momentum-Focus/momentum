import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o erro for 401 (não autorizado), verifica se é um erro de autenticação real
    // ou apenas um token inválido/expirado
    if (error.response?.status === 401) {
      const token = localStorage.getItem("authToken");

      // Só remove o token se ele existir (evita remover em requisições sem token)
      // E só remove se não for uma requisição de login (para evitar loops)
      if (token && !error.config?.url?.includes("/auth/login")) {
        // Verifica se o erro é realmente de token inválido/expirado
        // Se for, remove o token apenas uma vez
        const wasTokenRemoved = sessionStorage.getItem("tokenRemoved");
        if (!wasTokenRemoved) {
          localStorage.removeItem("authToken");
          sessionStorage.setItem("tokenRemoved", "true");

          // Limpa o flag após 1 segundo para permitir novo login
          setTimeout(() => {
            sessionStorage.removeItem("tokenRemoved");
          }, 1000);
        }
      }
    }
    return Promise.reject(error);
  }
);
