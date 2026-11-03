import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  route: string | null;
  read_at: string | null;
  created_at: string;
}

const QUERY_KEY = ["notifications"];

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get("/notifications");
      return data.data as AppNotification[];
    },
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] });
    },
  });
}
