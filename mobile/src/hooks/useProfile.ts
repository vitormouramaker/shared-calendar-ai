import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/auth-store";

export interface Profile {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_private: boolean;
  notify_event_reminders: boolean;
  notify_share_updates: boolean;
  notify_push_enabled: boolean;
  created_at: string;
}

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      return data.data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      username?: string;
      email?: string;
      avatar_url?: string | null;
      is_private?: boolean;
      notify_event_reminders?: boolean;
      notify_share_updates?: boolean;
      notify_push_enabled?: boolean;
    }) => {
      const { data } = await api.put("/users/me", payload);
      return data.data as Profile;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      updateUser(updated);
    },
  });
}
