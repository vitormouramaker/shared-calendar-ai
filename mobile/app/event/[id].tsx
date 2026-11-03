import React from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bell, CalendarDays, ChevronLeft, Clock3, FileText, Pencil, Tag, Trash2 } from "lucide-react-native";
import { useDeleteEvent, useEventById } from "../../src/hooks/useEvents";
import { formatAppDate } from "../../src/lib/app-time";
import { formatReminderSummary } from "../../src/lib/event-reminders";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

function DetailLine({
  label,
  value,
  icon,
  valueColor = "#111827",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <View className="py-4">
      <View className="flex-row items-center">
        {icon}
        <Text className="ml-3 text-xs font-bold uppercase tracking-[2px] text-gray-400">{label}</Text>
      </View>
      <Text className="mt-3 text-lg font-semibold leading-7" style={{ color: valueColor }}>
        {value}
      </Text>
    </View>
  );
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const params = useLocalSearchParams<{ id?: string; ownerUsername?: string }>();
  const rawId = params.id ? Number(params.id) : null;
  const eventId = rawId !== null && Number.isFinite(rawId) ? rawId : null;
  const ownerUsername = params.ownerUsername ? String(params.ownerUsername).replace(/^@/, "") : null;
  const { data: event, isLoading } = useEventById(eventId, ownerUsername);
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent(ownerUsername);

  const handleDelete = () => {
    if (!eventId || isDeleting) {
      return;
    }

    showDialog({
      title: "Apagar evento",
      message: "Deseja remover este evento da sua agenda?",
      confirmText: "Apagar",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: () => {
        deleteEvent(eventId, {
          onSuccess: () => {
            router.replace(ownerUsername ? `/agenda/${ownerUsername}` : "/(tabs)");
          },
        });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>

        <Text className="text-xl font-bold text-gray-900">Detalhes do evento</Text>

        <View className="h-6 w-6" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#7C3AED" />
        </View>
      ) : event ? (
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          <View className="mt-2 px-1 pb-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                  Compromisso
                </Text>
                <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                  {event.title}
                </Text>
                <Text className="mt-3 text-sm leading-6 text-gray-500">
                  {formatAppDate(event.start_time, "dd/MM HH:mm")} - {formatAppDate(event.end_time, "dd/MM HH:mm")}
                </Text>
              </View>

              <CalendarDays size={22} color="#7C3AED" />
            </View>

            <View className="mt-5 flex-row flex-wrap gap-2">
              <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                  {event.category}
                </Text>
              </View>
              <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                  {event.remind_me
                    ? formatReminderSummary(event.remind_before_minutes ?? 15)
                    : "Sem lembrete"}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={() =>
                router.push(
                  ownerUsername
                    ? `/event/create?id=${event.id}&ownerUsername=${ownerUsername}`
                    : `/event/create?id=${event.id}`
                )
              }
              activeOpacity={0.88}
              className="flex-1 flex-row items-center justify-center rounded-full border border-violet-700 bg-violet-700 px-4 py-4"
            >
              <Pencil size={16} color="#FFFFFF" />
              <Text className="ml-2 text-sm font-bold text-white">Editar evento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              activeOpacity={0.88}
              className="flex-1 flex-row items-center justify-center rounded-full border border-red-600 bg-red-600 px-4 py-4"
            >
              <Trash2 size={16} color="#FFFFFF" />
              <Text className="ml-2 text-sm font-bold text-white">
                {isDeleting ? "Apagando..." : "Apagar"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-6">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-400">
              Informacoes
            </Text>

            <DetailLine
              icon={<CalendarDays size={18} color="#7C3AED" />}
              label="Inicio"
              value={`${formatAppDate(event.start_time, "EEEE, d 'de' MMMM")} as ${formatAppDate(event.start_time, "HH:mm")}`}
            />

            <View className="border-b border-gray-100" />

            <DetailLine
              icon={<Clock3 size={18} color="#7C3AED" />}
              label="Fim"
              value={`${formatAppDate(event.end_time, "EEEE, d 'de' MMMM")} as ${formatAppDate(event.end_time, "HH:mm")}`}
            />

            <View className="border-b border-gray-100" />

            <DetailLine
              icon={<Tag size={18} color={event.category_color} />}
              label="Categoria"
              value={event.category}
            />

            <View className="border-b border-gray-100" />

            <DetailLine
              icon={<Bell size={18} color={event.remind_me ? "#7C3AED" : "#9CA3AF"} />}
              label="Lembrete"
              value={
                event.remind_me
                  ? formatReminderSummary(event.remind_before_minutes ?? 15)
                  : "Sem lembrete configurado"
              }
              valueColor={event.remind_me ? "#6D28D9" : "#374151"}
            />
          </View>

          <View className="mt-6">
            <View className="flex-row items-center">
              <FileText size={18} color="#7C3AED" />
              <Text className="ml-3 text-xs font-bold uppercase tracking-[2px] text-gray-400">
                Descricao
              </Text>
            </View>
            <Text className="mt-4 text-base leading-8 text-gray-700">
              {event.description?.trim() || "Nenhuma anotacao adicional para este evento."}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base font-medium text-gray-500">
            Nao foi possivel carregar os detalhes deste evento.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
