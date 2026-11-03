import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DashboardMe {
  id: number;
  name: string;
  username: string;
  avatar_url: string | null;
  is_private: boolean;
}

export interface DashboardTodaySummary {
  today_count: number;
  week_count: number;
  active_reminders_count: number;
}

export interface DashboardEvent {
  id: number;
  title: string;
  category: string;
  category_color: string;
  start_time: string;
  end_time: string;
  remind_me: boolean;
  remind_before_minutes?: number;
}

export interface DashboardSharedAgenda {
  id: number;
  permission_level: "view" | "edit";
  is_permanent: boolean;
  expires_at: string | null;
  owner_user_id: number;
  owner_name: string;
  owner_username: string;
  owner_avatar_url: string | null;
  next_event_title: string | null;
  next_event_start: string | null;
  next_event_end: string | null;
  next_event_color: string | null;
}

export interface DashboardActivityLog {
  id: number;
  action_type: string;
  target_type: string;
  target_id: number | null;
  target_title: string | null;
  actor_name: string;
  actor_username: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // presente apenas nos logs de agendas compartilhadas
  owner_name?: string;
  owner_username?: string;
}

export interface DashboardExpiringAccess {
  id: number;
  expires_at: string;
  owner_name: string;
  owner_username: string;
  owner_avatar_url: string | null;
}

export interface HomeDashboard {
  me: DashboardMe | null;
  today_summary: DashboardTodaySummary;
  next_event: DashboardEvent | null;
  today_events: DashboardEvent[];
  pending_invites_count: number;
  shared_agendas: DashboardSharedAgenda[];
  recent_activity: DashboardActivityLog[];
  shared_activity: DashboardActivityLog[];
  expiring_access: DashboardExpiringAccess[];
  unread_notifications_count: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHomeDashboard() {
  return useQuery<HomeDashboard>({
    queryKey: ["dashboard", "home"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/home");
      return data.data as HomeDashboard;
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

export function useRefreshHomeDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] });
}
