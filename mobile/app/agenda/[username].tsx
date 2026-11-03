import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Info, Calendar as CalendarIcon, CalendarDays, Eye, Lock } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarHeader } from "../../src/components/home/CalendarHeader";
import { MonthCalendar } from "../../src/components/home/MonthCalendar";
import { EventCard } from "../../src/components/home/EventCard";
import { addMonths, getMonth, getYear, subMonths } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/axios";
import type { Event } from "../../src/hooks/useEvents";
import { useDeleteEvent } from "../../src/hooks/useEvents";
import { formatAppDate, getAppNow, toAppDateKey } from "../../src/lib/app-time";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

type AgendaSummary = {
  name: string;
  username: string;
  is_private: boolean;
  can_view: boolean;
  can_edit: boolean;
  permission_level: "view" | "edit";
  relationship: "public" | "granted" | "private" | "owner";
};

function EmptyState({ username }: { username: string }) {
  return (
    <View className="mt-2 rounded-[28px] border border-gray-200 bg-gray-50/70 px-5 py-8">
      <CalendarIcon size={22} color="#7C3AED" />
      <Text className="mt-4 text-lg font-bold text-gray-900">Nenhum evento neste dia</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        A agenda compartilhada de @{username} nao possui compromissos para a data selecionada.
      </Text>
    </View>
  );
}

function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View className="mt-2 rounded-[28px] border border-gray-200 bg-gray-50/70 px-5 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
        <Lock size={22} color="#9CA3AF" />
      </View>
      <Text className="mt-4 text-lg font-bold text-gray-900">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">{message}</Text>
    </View>
  );
}

export default function GuestAgendaScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const { username } = useLocalSearchParams<{ username: string }>();
  const [currentDate, setCurrentDate] = useState(getAppNow());
  const normalizedUsername = useMemo(() => String(username ?? "").replace(/^@/, ""), [username]);
  const { mutate: deleteEvent } = useDeleteEvent(normalizedUsername);

  const { data: summary } = useQuery<AgendaSummary>({
    queryKey: ["agenda", "summary", normalizedUsername],
    queryFn: async () => {
      const { data } = await api.get(`/users/${normalizedUsername}/summary`);
      return data.data as AgendaSummary;
    },
    enabled: Boolean(normalizedUsername),
  });

  const {
    data: events,
    isLoading,
    error,
    isError,
  } = useQuery<Event[]>({
    queryKey: ["agenda", normalizedUsername, toAppDateKey(currentDate)],
    queryFn: async () => {
      const { data } = await api.get(`/users/${normalizedUsername}/agenda`, {
        params: { date: toAppDateKey(currentDate) },
      });
      return data.data ?? [];
    },
    enabled: Boolean(normalizedUsername),
  });

  const { data: monthEvents = [] } = useQuery<
    Pick<Event, "id" | "title" | "category_color" | "start_time" | "end_time">[]
  >({
    queryKey: ["agenda", normalizedUsername, "month", getYear(currentDate), getMonth(currentDate) + 1],
    queryFn: async () => {
      const { data } = await api.get(`/users/${normalizedUsername}/agenda`, {
        params: { year: getYear(currentDate), month: getMonth(currentDate) + 1 },
      });
      return data.data ?? [];
    },
    enabled: Boolean(normalizedUsername),
  });

  const dayLabel = formatAppDate(currentDate, "dd/MM");
  const errorMessage =
    (error as any)?.response?.data?.message ??
    (error as Error | undefined)?.message ??
    "Nao foi possivel carregar esta agenda.";
  const isPrivateAgendaError = isError && /privada/i.test(errorMessage);
  const isNotFoundError = isError && /nao encontrado/i.test(errorMessage);
  const canEdit = summary?.can_edit ?? false;

  const handleDeleteEvent = (eventId: number) => {
    showDialog({
      title: "Apagar evento",
      message: "Deseja remover este evento da agenda compartilhada?",
      confirmText: "Apagar",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: () => deleteEvent(eventId),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Agenda compartilhada</Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-1 pb-1 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                {canEdit ? "Edicao compartilhada" : "Leitura compartilhada"}
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                Agenda de @{normalizedUsername}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                {canEdit
                  ? "Visualize e edite os compromissos liberados para voce nesta agenda."
                  : "Visualize os compromissos liberados para voce e acompanhe a agenda por dia."}
              </Text>
            </View>

            <Eye size={22} color="#7C3AED" />
          </View>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <View className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <Info size={13} color="#7C3AED" />
              <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {isPrivateAgendaError ? "Agenda privada" : "Visualizacao por dia"}
              </Text>
            </View>

            <View className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <Info size={13} color="#7C3AED" />
              <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {canEdit ? "Pode editar" : "Apenas ver"}
              </Text>
            </View>

            <View className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <CalendarDays size={13} color="#7C3AED" />
              <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                Dia {dayLabel}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-[30px] border border-violet-100 bg-violet-50/45 pb-4 pt-2">
          <CalendarHeader
            currentDate={currentDate}
            onPrevMonth={() => setCurrentDate((d) => subMonths(d, 1))}
            onNextMonth={() => setCurrentDate((d) => addMonths(d, 1))}
          />
          <MonthCalendar
            currentDate={currentDate}
            onDayPress={setCurrentDate}
            monthEvents={monthEvents}
          />
        </View>

        <View className="mb-4 mt-6 flex-row items-end justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-bold text-gray-900">Eventos do dia</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Compromissos visiveis para {formatAppDate(currentDate, "EEEE, d 'de' MMMM")}
            </Text>
          </View>
          <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
              {events?.length ?? 0}
            </Text>
          </View>
        </View>

        {canEdit ? (
          <View className="mb-4 flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push(`/event/create?ownerUsername=${normalizedUsername}`)}
              activeOpacity={0.88}
              className="flex-1 items-center justify-center rounded-full py-4"
              style={{ backgroundColor: "#7C3AED" }}
            >
              <Text className="text-base font-bold text-white">Novo evento nesta agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/agenda/logs?ownerUsername=${normalizedUsername}`)}
              activeOpacity={0.88}
              className="items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-5 py-4"
            >
              <Text className="text-sm font-bold text-violet-700">Logs</Text>
            </TouchableOpacity>
          </View>
        ) : summary?.can_view ? (
          <TouchableOpacity
            onPress={() => router.push(`/agenda/logs?ownerUsername=${normalizedUsername}`)}
            activeOpacity={0.88}
            className="mb-4 self-start rounded-full border border-violet-200 bg-violet-50 px-5 py-3"
          >
            <Text className="text-sm font-bold text-violet-700">Ver logs da agenda</Text>
          </TouchableOpacity>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" className="mt-8" />
        ) : isPrivateAgendaError ? (
          <ErrorState
            title="Agenda privada"
            message="Esta pessoa nao liberou a agenda para voce. Se precisar, solicite um convite."
          />
        ) : isNotFoundError ? (
          <ErrorState
            title="Usuario nao encontrado"
            message="Nao encontramos uma agenda com esse nome de usuario."
          />
        ) : isError ? (
          <ErrorState
            title="Falha ao abrir agenda"
            message="Nao foi possivel carregar esta agenda agora. Tente novamente em instantes."
          />
        ) : events && events.length > 0 ? (
          <View className="mt-1">
            {events.map((event, index) => (
              <EventCard
                key={event.id}
                variant="list"
                isLast={index === events.length - 1}
                time={`${formatAppDate(event.start_time, "HH:mm")} - ${formatAppDate(event.end_time, "HH:mm")}`}
                dateRange={`${formatAppDate(event.start_time, "dd/MM")} - ${formatAppDate(event.end_time, "dd/MM")}`}
                title={event.title}
                startTime={event.start_time}
                categoryLineColor={event.category_color}
                category={event.category}
                description={event.description}
                onPress={() => router.push(`/event/${event.id}?ownerUsername=${normalizedUsername}`)}
                onEdit={
                  canEdit
                    ? () => router.push(`/event/create?id=${event.id}&ownerUsername=${normalizedUsername}`)
                    : undefined
                }
                onDelete={canEdit ? () => handleDeleteEvent(event.id) : undefined}
              />
            ))}
          </View>
        ) : (
          <EmptyState username={normalizedUsername} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
