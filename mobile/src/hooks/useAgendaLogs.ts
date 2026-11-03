import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface AgendaLogChangeDetail {
  key:
    | "title"
    | "description"
    | "category"
    | "start_date"
    | "start_time"
    | "end_date"
    | "end_time"
    | "remind_me"
    | "remind_before_minutes";
  label: string;
  type: "text" | "date" | "time" | "boolean" | "minutes";
  previous_value: string | number | boolean | null;
  next_value: string | number | boolean | null;
}

export interface AgendaLogMetadata {
  changed_fields?: string[];
  change_count?: number;
  change_details?: AgendaLogChangeDetail[];
  start_time?: string | null;
  end_time?: string | null;
  previous_start_time?: string | null;
  previous_end_time?: string | null;
  next_start_time?: string | null;
  next_end_time?: string | null;
  category?: string | null;
  guest_username?: string | null;
  permission_level?: "view" | "edit" | null;
  [key: string]: unknown;
}

export interface AgendaLog {
  id: number;
  owner_id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_username: string | null;
  action_type:
    | "event_created"
    | "event_updated"
    | "event_deleted"
    | "invite_sent"
    | "invite_accepted"
    | "invite_declined"
    | "invite_revoked"
    | "access_revoked";
  target_type: string;
  target_id: number | null;
  target_title: string | null;
  metadata: AgendaLogMetadata;
  created_at: string;
}

export function useAgendaLogs(ownerUsername?: string | null) {
  return useQuery<AgendaLog[]>({
    queryKey: ["agenda", "logs", ownerUsername ?? "me"],
    queryFn: async () => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/logs` : "/users/me/logs";
      const { data } = await api.get(endpoint);
      return data.data ?? [];
    },
  });
}
