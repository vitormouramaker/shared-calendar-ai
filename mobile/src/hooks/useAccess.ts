import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface Guest {
  id: number;
  guest_user_id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  permission_level: "view" | "edit";
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
}

export type AccessInviteStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

export interface SentInvite {
  id: number;
  status: AccessInviteStatus;
  guest_user_id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  permission_level: "view" | "edit";
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ReceivedInvite {
  id: number;
  status: AccessInviteStatus;
  owner_user_id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  permission_level: "view" | "edit";
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface SharedOwner {
  id: number;
  owner_user_id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  permission_level: "view" | "edit";
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useGuests() {
  return useQuery<Guest[]>({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data } = await api.get("/access/guests");
      return data.data ?? [];
    },
  });
}

export function useSentInvites() {
  return useQuery<SentInvite[]>({
    queryKey: ["access", "invites", "sent"],
    queryFn: async () => {
      const { data } = await api.get("/access/invites/sent");
      return data.data ?? [];
    },
  });
}

export function useReceivedInvites() {
  return useQuery<ReceivedInvite[]>({
    queryKey: ["access", "invites", "received"],
    queryFn: async () => {
      const { data } = await api.get("/access/invites/received");
      return data.data ?? [];
    },
  });
}

export function useSentInviteHistory() {
  return useQuery<SentInvite[]>({
    queryKey: ["access", "invites", "sent", "history"],
    queryFn: async () => {
      const { data } = await api.get("/access/invites/sent/history");
      return data.data ?? [];
    },
  });
}

export function useReceivedInviteHistory() {
  return useQuery<ReceivedInvite[]>({
    queryKey: ["access", "invites", "received", "history"],
    queryFn: async () => {
      const { data } = await api.get("/access/invites/received/history");
      return data.data ?? [];
    },
  });
}

export function useSharedWithMe() {
  return useQuery<SharedOwner[]>({
    queryKey: ["access", "shared-with-me"],
    queryFn: async () => {
      const { data } = await api.get("/access/shared-with-me");
      return data.data ?? [];
    },
  });
}

function invalidateAccessQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["guests"] });
  queryClient.invalidateQueries({ queryKey: ["access"] });
}

export function useSendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      username: string;
      permission_level: "view" | "edit";
      is_permanent?: boolean;
      expires_at?: string | null;
    }) => {
      const { data } = await api.post("/access/invites", payload);
      return data.data;
    },
    onSuccess: () => {
      invalidateAccessQueries(queryClient);
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/access/invites/${id}`);
    },
    onSuccess: () => {
      invalidateAccessQueries(queryClient);
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/access/invites/${id}/accept`);
    },
    onSuccess: () => {
      invalidateAccessQueries(queryClient);
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/access/invites/${id}/decline`);
    },
    onSuccess: () => {
      invalidateAccessQueries(queryClient);
    },
  });
}

export function useRemoveGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/access/guests/${id}`);
    },
    onSuccess: () => {
      invalidateAccessQueries(queryClient);
    },
  });
}
