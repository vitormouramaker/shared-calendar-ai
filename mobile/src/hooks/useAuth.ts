import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/auth-store";

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: number;
      name: string;
      username: string;
      email: string;
      avatar_url?: string | null;
      is_private: boolean;
      notify_event_reminders?: boolean;
      notify_share_updates?: boolean;
      notify_push_enabled?: boolean;
    };
  };
  message: string;
}

function extractError(error: any): string {
  if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
    return "A conexao com o servidor expirou. Verifique a API e tente novamente.";
  }

  if (axios.isAxiosError(error) && !error.response) {
    return "Nao foi possivel conectar com o servidor. Verifique a URL da API.";
  }

  return error?.response?.data?.message || error?.message || "Tente novamente mais tarde.";
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      console.log("[useLogin] request start", {
        baseURL: api.defaults.baseURL,
        email: payload.email,
        passwordLength: payload.password.length,
      });

      try {
        const { data } = await api.post<AuthResponse>("/auth/login", payload);
        console.log("[useLogin] response success", {
          success: data.success,
          message: data.message,
          userId: data.data?.user?.id,
        });
        if (!data.success) throw new Error(data.message);
        return data.data;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.log("[useLogin] axios error", {
            message: error.message,
            code: error.code,
            baseURL: error.config?.baseURL ?? api.defaults.baseURL,
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            responseData: error.response?.data,
          });
        } else {
          console.log("[useLogin] unexpected error", {
            message: error?.message,
            name: error?.name,
          });
        }
        throw new Error(extractError(error));
      }
    },
    onSuccess: ({ token, user }) => {
      console.log("[useLogin] storing auth", {
        userId: user.id,
        username: user.username,
      });
      setAuth(token, user);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      username: string;
      email: string;
      password: string;
    }) => {
      console.log("[useRegister] request start", {
        baseURL: api.defaults.baseURL,
        nameLength: payload.name.length,
        username: payload.username,
        email: payload.email,
        passwordLength: payload.password.length,
      });

      try {
        const { data } = await api.post<AuthResponse>("/auth/register", payload);
        console.log("[useRegister] response success", {
          success: data.success,
          message: data.message,
          userId: data.data?.user?.id,
        });
        if (!data.success) throw new Error(data.message);
        return data.data;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.log("[useRegister] axios error", {
            message: error.message,
            code: error.code,
            baseURL: error.config?.baseURL ?? api.defaults.baseURL,
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            responseData: error.response?.data,
          });
        } else {
          console.log("[useRegister] unexpected error", {
            message: error?.message,
            name: error?.name,
          });
        }
        throw new Error(extractError(error));
      }
    },
    onSuccess: ({ token, user }) => {
      console.log("[useRegister] storing auth", {
        userId: user.id,
        username: user.username,
      });
      setAuth(token, user);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await api.post<{ success: boolean; message: string; data?: { expires_at?: string } }>(
        "/auth/forgot-password",
        payload
      );

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { email: string; code: string; password: string }) => {
      const { data } = await api.post<{ success: boolean; message: string }>(
        "/auth/reset-password",
        payload
      );

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    },
  });
}
