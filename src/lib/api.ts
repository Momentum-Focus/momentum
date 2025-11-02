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
    // Se o erro for 401 (não autorizado), remove o token e redireciona para login
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      // Não redireciona automaticamente para evitar loops, deixa o componente decidir
    }
    return Promise.reject(error);
  }
);
