import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_private: boolean;
  notify_event_reminders?: boolean;
  notify_share_updates?: boolean;
  notify_push_enabled?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  logoutReason: string | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: (reason?: string | null) => void;
  clearLogoutReason: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      logoutReason: null,
      setAuth: (token, user) => set({ token, user, logoutReason: null }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      clearAuth: (reason = null) => set({ token: null, user: null, logoutReason: reason }),
      clearLogoutReason: () => set({ logoutReason: null }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
