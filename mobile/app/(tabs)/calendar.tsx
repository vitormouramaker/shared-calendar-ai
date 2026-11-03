import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { addMonths, subMonths } from "date-fns";
import { CalendarDays } from "lucide-react-native";
import { CalendarHeader } from "../../src/components/home/CalendarHeader";
import { MonthCalendar } from "../../src/components/home/MonthCalendar";
import { EventCard } from "../../src/components/home/EventCard";
import { useDeleteEvent, useEventsByDate } from "../../src/hooks/useEvents";
import { useProfile } from "../../src/hooks/useProfile";
import { formatAppDate, getAppNow } from "../../src/lib/app-time";
import { formatReminderSummary } from "../../src/lib/event-reminders";

function EmptyState() {
  return (
    <View className="mt-2 rounded-[28px] border border-gray-200 bg-gray-50/70 px-5 py-8">
      <CalendarDays size={22} color="#7C3AED" />
      <Text className="mt-4 text-lg font-bold text-gray-900">
        Dia livre por aqui
      </Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        Nenhum evento agendado para a data selecionada. Use o botão + para criar
        um novo compromisso.
      </Text>
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { mutate: deleteEvent, isPending: isDeletingEvent } = useDeleteEvent();
  const [currentDate, setCurrentDate] = useState(getAppNow());

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const { data: events, isLoading } = useEventsByDate(currentDate);
  const firstName = useMemo(
    () => profile?.name?.trim().split(" ")[0] ?? "você",
    [profile?.name]
  );

  const handleDeleteEvent = (eventId: number) => {
    if (isDeletingEvent) {
      return;
    }

    Alert.alert("Apagar evento", "Deseja remover este evento da sua agenda?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          deleteEvent(eventId);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="relative flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="pt-6">
          <View className="px-1 pb-1">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
              Sua agenda
            </Text>
            <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
              Organize seu dia, {firstName}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-gray-500">
              Veja rapidamente seus compromissos, navegue pelo calendário e
              mantenha tudo em ordem.
            </Text>

            <View className="mt-5 flex-row flex-wrap gap-2">
              <View className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                <CalendarDays size={13} color="#7C3AED" />
                <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                  {formatAppDate(currentDate, "dd/MM")}
                </Text>
              </View>
              <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                  {events?.length ?? 0} evento
                  {(events?.length ?? 0) === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-[30px] border border-violet-100 bg-violet-50/45 pb-4 pt-2">
          <CalendarHeader
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <MonthCalendar
            currentDate={currentDate}
            onDayPress={setCurrentDate}
          />
        </View>

        <View className="mb-4 mt-6 flex-row items-end justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-bold text-gray-900">
              Eventos do dia
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              Compromissos agendados para{" "}
              {formatAppDate(currentDate, "EEEE, d 'de' MMMM")}
            </Text>
          </View>
          <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
              {events?.length ?? 0}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" className="mt-8" />
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
                reminderText={
                  event.remind_me
                    ? formatReminderSummary(event.remind_before_minutes ?? 15)
                    : null
                }
                onPress={() => router.push(`/event/${event.id}`)}
                onEdit={() => router.push(`/event/create?id=${event.id}`)}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
