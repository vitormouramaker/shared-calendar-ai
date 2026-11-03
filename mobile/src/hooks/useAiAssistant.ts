import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { Event } from "./useEvents";
import { syncReminderForEvent } from "./useEvents";

export type AiInsight = {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
  event_ids: number[];
};

export type AiInsightSummary = {
  upcoming_count: number;
  conflict_count: number;
  missing_description_count: number;
  reminders_disabled_count: number;
  next_free_slot: {
    start: string;
    end: string;
  } | null;
};

export type AiInsightsPayload = {
  generated_at: string;
  summary: AiInsightSummary;
  insights: AiInsight[];
};

export type PendingAiAction = {
  id: number;
  status: string;
  expires_at: string;
  preview: {
    action_type: "create_event" | "update_event";
    event_id: number | null;
    title: string;
    description: string | null;
    category: string;
    category_color: string;
    start_time: string;
    end_time: string;
    remind_me: boolean;
    remind_before_minutes: number;
    original_event?: {
      id: number;
      title: string;
      start_time: string;
      end_time: string;
      category: string;
    } | null;
    conflicts?: {
      id: number;
      title: string;
      start_time: string;
      end_time: string;
    }[];
  };
};

export type AiConversationMessage = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  message_type: "text" | "action_preview" | "action_result";
  content: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type AiConversation = {
  id: number;
  title: string;
  status: string;
  is_current: boolean;
  metadata: Record<string, any>;
  last_message_at: string;
  created_at: string;
};

export type AiRecentConversation = AiConversation & {
  last_message_content: string | null;
  last_message_role: "user" | "assistant" | null;
  last_message_created_at: string | null;
};

export type AiConversationState = {
  conversation: AiConversation | null;
  messages: AiConversationMessage[];
  pending_action: PendingAiAction | null;
};

export type AiChatResponse = {
  conversation_id?: number;
  reply: string;
  insights: AiInsightsPayload;
  pending_action: PendingAiAction | null;
};

function invalidateAiAssistantQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["ai", "conversation"] });
  queryClient.invalidateQueries({ queryKey: ["ai", "insights"] });
}

export function useCurrentAiConversation() {
  return useQuery<AiConversationState>({
    queryKey: ["ai", "conversation", "current"],
    queryFn: async () => {
      const { data } = await api.get("/ai/conversation/current");
      return data.data as AiConversationState;
    },
  });
}

export function useRecentAiConversations() {
  return useQuery<AiRecentConversation[]>({
    queryKey: ["ai", "conversation", "recent"],
    queryFn: async () => {
      const { data } = await api.get("/ai/conversations/recent");
      return (data.data?.conversations ?? []) as AiRecentConversation[];
    },
  });
}

export function useAiConversation(conversationId?: number | null) {
  return useQuery<AiConversationState>({
    queryKey: ["ai", "conversation", "detail", conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/ai/conversations/${conversationId}`);
      return data.data as AiConversationState;
    },
    enabled: Boolean(conversationId),
  });
}

export function useStartNewAiConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/ai/conversation/new");
      return data.data as AiConversationState;
    },
    onSuccess: () => {
      invalidateAiAssistantQueries(queryClient);
    },
  });
}

export function useAiInsights(days = 14) {
  return useQuery<AiInsightsPayload>({
    queryKey: ["ai", "insights", days],
    queryFn: async () => {
      const { data } = await api.get("/ai/insights", { params: { days } });
      return data.data as AiInsightsPayload;
    },
    staleTime: 60 * 1000,
  });
}

export function useAiAssistantChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post("/ai/chat", { message });
      return data.data as AiChatResponse;
    },
    onSuccess: () => {
      invalidateAiAssistantQueries(queryClient);
    },
  });
}

export function useConfirmAiAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: number) => {
      const { data } = await api.post(`/ai/actions/${actionId}/confirm`);
      return data.data as { event: Event };
    },
    onSuccess: async ({ event }) => {
      await syncReminderForEvent(event);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] });
      invalidateAiAssistantQueries(queryClient);
    },
  });
}

export function useCancelAiAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: number) => {
      const { data } = await api.post(`/ai/actions/${actionId}/cancel`);
      return data.data;
    },
    onSuccess: () => {
      invalidateAiAssistantQueries(queryClient);
    },
  });
}
