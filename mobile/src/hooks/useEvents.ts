import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import {
  cancelEventReminderAsync,
  scheduleEventReminderAsync,
} from "../lib/local-notifications";
import { toAppDateKey } from "../lib/app-time";
import { useAuthStore } from "../store/auth-store";

export interface Event {
  id: number;
  title: string;
  description?: string;
  category: string;
  category_color: string;
  start_time: string;
  end_time: string;
  remind_me: boolean;
  remind_before_minutes?: number;
}

type EventPayload = {
  title: string;
  description?: string;
  category: string;
  category_color: string;
  start_time: string;
  end_time: string;
  remind_me: boolean;
  remind_before_minutes?: number;
};

export async function syncReminderForEvent(event: Event) {
  const notificationsEnabled = useAuthStore.getState().user?.notify_event_reminders !== false;

  if (event.remind_me && notificationsEnabled) {
    try {
      await scheduleEventReminderAsync(event);
    } catch (error) {
      console.warn("[events] failed to schedule local reminder", {
        eventId: event.id,
        error,
      });
    }
    return;
  }

  try {
    await cancelEventReminderAsync(event.id);
  } catch (error) {
    console.warn("[events] failed to cancel local reminder", {
      eventId: event.id,
      error,
    });
  }
}

export function useEventsByDate(date: Date) {
  return useQuery<Event[]>({
    queryKey: ["events", "date", toAppDateKey(date)],
    queryFn: async () => {
      const { data } = await api.get("/events", {
        params: { date: toAppDateKey(date) },
      });
      return data.data ?? [];
    },
  });
}

export function useEventsByMonth(year: number, month: number) {
  return useQuery<Pick<Event, "id" | "title" | "category_color" | "start_time" | "end_time">[]>({
    queryKey: ["events", "month", year, month],
    queryFn: async () => {
      const { data } = await api.get("/events", { params: { year, month } });
      return data.data ?? [];
    },
  });
}

export function useEventById(id: number | null, ownerUsername?: string | null) {
  return useQuery<Event>({
    queryKey: ["events", "detail", ownerUsername ?? "me", id],
    enabled: id !== null,
    queryFn: async () => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/events/${id}` : `/events/${id}`;
      const { data } = await api.get(endpoint);
      return data.data as Event;
    },
  });
}

export function useCreateEvent(ownerUsername?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EventPayload) => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/events` : "/events";
      const { data } = await api.post(endpoint, payload);
      return data.data as Event;
    },
    onSuccess: async (createdEvent) => {
      if (!ownerUsername) {
        await syncReminderForEvent(createdEvent);
        queryClient.invalidateQueries({ queryKey: ["events"] });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["agenda", ownerUsername] });
    },
  });
}

export function useUpdateEvent(ownerUsername?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EventPayload }) => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/events/${id}` : `/events/${id}`;
      const { data } = await api.put(endpoint, payload);
      return data.data as Event;
    },
    onSuccess: async (updatedEvent) => {
      if (!ownerUsername) {
        await syncReminderForEvent(updatedEvent);
        queryClient.setQueryData(["events", "detail", "me", updatedEvent.id], updatedEvent);
        queryClient.invalidateQueries({ queryKey: ["events"] });
        return;
      }

      queryClient.setQueryData(["events", "detail", ownerUsername, updatedEvent.id], updatedEvent);
      queryClient.invalidateQueries({ queryKey: ["agenda", ownerUsername] });
    },
  });
}

export function useDeleteEvent(ownerUsername?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/events/${id}` : `/events/${id}`;
      await api.delete(endpoint);
      return id;
    },
    onSuccess: async (deletedEventId) => {
      if (!ownerUsername) {
        try {
          await cancelEventReminderAsync(deletedEventId);
        } catch (error) {
          console.warn("[events] failed to cancel local reminder", {
            eventId: deletedEventId,
            error,
          });
        }

        queryClient.removeQueries({ queryKey: ["events", "detail", "me", deletedEventId] });
        queryClient.invalidateQueries({ queryKey: ["events"] });
        return;
      }

      queryClient.removeQueries({ queryKey: ["events", "detail", ownerUsername, deletedEventId] });
      queryClient.invalidateQueries({ queryKey: ["agenda", ownerUsername] });
    },
  });
}
