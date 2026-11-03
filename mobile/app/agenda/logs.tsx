import React, { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronUp, History, Info } from "lucide-react-native";
import {
  useAgendaLogs,
  type AgendaLog,
  type AgendaLogChangeDetail,
} from "../../src/hooks/useAgendaLogs";
import { useAuthStore } from "../../src/store/auth-store";
import { formatAppDate, getAppNow, toAppTime } from "../../src/lib/app-time";

function resolveActorLabel(log: AgendaLog, currentUserId?: number | null) {
  if (currentUserId && log.actor_user_id === currentUserId) {
    return "Voce";
  }

  if (log.actor_name?.trim()) {
    return log.actor_name.trim();
  }

  if (log.actor_username?.trim()) {
    return `@${log.actor_username.trim()}`;
  }

  return "Um usuario";
}

function getChangeDetails(log: AgendaLog) {
  return Array.isArray(log.metadata?.change_details) ? log.metadata.change_details : [];
}

function formatReminderMinutes(value: number | null) {
  if (value == null) {
    return "padrao";
  }

  if (value === 0) {
    return "na hora";
  }

  if (value % 1440 === 0) {
    return `${value / 1440} ${value === 1440 ? "dia" : "dias"}`;
  }

  if (value % 60 === 0) {
    return `${value / 60}h`;
  }

  return `${value} min`;
}

function formatChangeValue(detail: AgendaLogChangeDetail, value: AgendaLogChangeDetail["previous_value"]) {
  if (detail.type === "date" && value) {
    return formatAppDate(String(value), "dd/MM/yyyy");
  }

  if (detail.type === "time" && value) {
    return formatAppDate(String(value), "HH:mm");
  }

  if (detail.type === "boolean") {
    return value ? "com lembrete" : "sem lembrete";
  }

  if (detail.type === "minutes") {
    return formatReminderMinutes(typeof value === "number" ? value : value ? Number(value) : null);
  }

  const text = String(value ?? "").trim();
  return text.length > 0 ? `"${text}"` : "vazio";
}

function buildChangeDetailText(detail: AgendaLogChangeDetail) {
  const previousValue = formatChangeValue(detail, detail.previous_value);
  const nextValue = formatChangeValue(detail, detail.next_value);

  switch (detail.key) {
    case "title":
      return `Titulo: ${previousValue} -> ${nextValue}`;
    case "description":
      return `Descricao: ${previousValue} -> ${nextValue}`;
    case "category":
      return `Categoria: ${previousValue} -> ${nextValue}`;
    case "start_date":
      return `Data de inicio: ${previousValue} -> ${nextValue}`;
    case "start_time":
      return `Horario de inicio: ${previousValue} -> ${nextValue}`;
    case "end_date":
      return `Data de termino: ${previousValue} -> ${nextValue}`;
    case "end_time":
      return `Horario de termino: ${previousValue} -> ${nextValue}`;
    case "remind_me":
      return `Lembrete: ${previousValue} -> ${nextValue}`;
    case "remind_before_minutes":
      return `Antecedencia do lembrete: ${previousValue} -> ${nextValue}`;
    default:
      return `${detail.label}: ${previousValue} -> ${nextValue}`;
  }
}

function buildSingleUpdateMessage(
  detail: AgendaLogChangeDetail,
  actor: string,
  eventTitle: string
) {
  switch (detail.key) {
    case "title":
      return `${actor} alterou o titulo do evento ${eventTitle}.`;
    case "description":
      return `${actor} alterou a descricao do evento ${eventTitle}.`;
    case "category":
      return `${actor} alterou a categoria do evento ${eventTitle}.`;
    case "start_date":
      return `${actor} alterou a data de inicio do evento ${eventTitle}.`;
    case "start_time":
      return `${actor} alterou o horario de inicio do evento ${eventTitle}.`;
    case "end_date":
      return `${actor} alterou a data de termino do evento ${eventTitle}.`;
    case "end_time":
      return `${actor} alterou o horario de termino do evento ${eventTitle}.`;
    case "remind_me":
      return `${actor} alterou o lembrete do evento ${eventTitle}.`;
    case "remind_before_minutes":
      return `${actor} alterou a antecedencia do lembrete do evento ${eventTitle}.`;
    default:
      return `${actor} atualizou o evento ${eventTitle}.`;
  }
}

function buildLogMessage(log: AgendaLog, currentUserId?: number | null) {
  const actor = resolveActorLabel(log, currentUserId);
  const eventTitle = log.target_title ? `"${log.target_title}"` : "um evento";
  const changeDetails = getChangeDetails(log);

  switch (log.action_type) {
    case "event_created":
      return `${actor} criou o evento ${eventTitle}.`;
    case "event_updated":
      if (changeDetails.length === 1) {
        return buildSingleUpdateMessage(changeDetails[0], actor, eventTitle);
      }
      if (changeDetails.length > 1) {
        return `${actor} atualizou ${changeDetails.length} informacoes do evento ${eventTitle}.`;
      }
      return `${actor} atualizou o evento ${eventTitle}.`;
    case "event_deleted":
      return `${actor} apagou o evento ${eventTitle}.`;
    case "invite_sent":
      return `${actor} enviou um convite para @${log.metadata?.guest_username ?? "usuario"}.`;
    case "invite_accepted":
      return `${actor} aceitou um convite para acessar a agenda.`;
    case "invite_declined":
      return `${actor} recusou um convite da agenda.`;
    case "invite_revoked":
      return `${actor} cancelou um convite pendente da agenda.`;
    case "access_revoked":
      return `${actor} revogou o acesso de um usuario a esta agenda.`;
    default:
      return `${actor} realizou uma acao na agenda.`;
  }
}

function buildSecondaryLine(log: AgendaLog) {
  if (log.action_type === "event_updated") {
    const changeDetails = getChangeDetails(log);

    if (changeDetails.length === 1) {
      return buildChangeDetailText(changeDetails[0]);
    }

    if (changeDetails.length > 1) {
      return `${changeDetails.length} alteracoes registradas neste evento.`;
    }
  }

  if (log.action_type === "event_created" || log.action_type === "event_deleted") {
    const startTime = log.metadata?.start_time;
    const endTime = log.metadata?.end_time;

    if (startTime && endTime) {
      return `${formatAppDate(startTime, "dd/MM HH:mm")} - ${formatAppDate(endTime, "dd/MM HH:mm")}`;
    }
  }

  if (log.action_type === "invite_sent") {
    return log.metadata?.permission_level === "edit" ? "Permissao: ver e editar" : "Permissao: apenas ver";
  }

  return null;
}

function EmptyState() {
  return (
    <View className="mt-6 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
      <Text className="text-base font-bold text-gray-900">Nenhum log ainda</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        Quando eventos e compartilhamentos acontecerem, o historico da agenda vai aparecer aqui.
      </Text>
    </View>
  );
}

export default function AgendaLogsScreen() {
  const router = useRouter();
  const { ownerUsername } = useLocalSearchParams<{ ownerUsername?: string }>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<number, boolean>>({});
  const normalizedOwnerUsername = ownerUsername ? String(ownerUsername).replace(/^@/, "") : null;
  const { data: logs, isLoading, isError } = useAgendaLogs(normalizedOwnerUsername);

  function toggleExpanded(logId: number) {
    setExpandedLogIds((current) => ({
      ...current,
      [logId]: !current[logId],
    }));
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Logs da agenda</Text>
        <View className="h-6 w-6" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-1 pb-1 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                Historico
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                {normalizedOwnerUsername ? `Agenda de @${normalizedOwnerUsername}` : "Sua agenda"}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Acompanhe quem criou, editou, apagou eventos e alterou acessos desta agenda.
              </Text>
            </View>

            <History size={22} color="#7C3AED" />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" className="mt-10" />
        ) : isError ? (
          <View className="mt-6 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
            <Text className="text-base font-bold text-gray-900">Falha ao carregar os logs</Text>
            <Text className="mt-2 text-sm leading-6 text-gray-500">
              Nao foi possivel carregar o historico da agenda agora.
            </Text>
          </View>
        ) : logs && logs.length > 0 ? (
          <View className="mt-6 overflow-hidden rounded-[28px] border border-gray-100 bg-white px-4">
            {logs.map((log, index) => {
              const secondaryLine = buildSecondaryLine(log);
              const changeDetails = getChangeDetails(log);
              const isExpandable = log.action_type === "event_updated" && changeDetails.length > 1;
              const isExpanded = Boolean(expandedLogIds[log.id]);

              return (
                <View
                  key={log.id}
                  className={`py-5 ${index === logs.length - 1 ? "" : "border-b border-gray-100"}`}
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-base font-bold leading-7 text-gray-900">
                        {buildLogMessage(log, currentUserId)}
                      </Text>

                      {secondaryLine ? (
                        <Text className="mt-2 text-sm font-medium text-violet-700">{secondaryLine}</Text>
                      ) : null}

                      {isExpandable ? (
                        <TouchableOpacity
                          onPress={() => toggleExpanded(log.id)}
                          className="mt-3 flex-row items-center self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-2"
                        >
                          <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                            {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                          </Text>
                          {isExpanded ? (
                            <ChevronUp size={14} color="#6D28D9" />
                          ) : (
                            <ChevronDown size={14} color="#6D28D9" />
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {isExpandable && isExpanded ? (
                        <View className="mt-4 rounded-[20px] border border-violet-100 bg-violet-50/60 px-4 py-3">
                          {changeDetails.map((detail, detailIndex) => (
                            <Text
                              key={`${log.id}-${detail.key}-${detailIndex}`}
                              className={`text-sm leading-6 text-gray-700 ${
                                detailIndex === changeDetails.length - 1 ? "" : "mb-2"
                              }`}
                            >
                              {buildChangeDetailText(detail)}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      <Text className="mt-2 text-sm leading-6 text-gray-500">
                        {formatDistance(toAppTime(log.created_at), getAppNow(), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </Text>
                    </View>

                    <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                      <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                        {formatAppDate(log.created_at, "dd/MM")}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState />
        )}

        <View className="mt-6 flex-row rounded-[22px] border border-violet-100 bg-violet-50/50 px-4 py-4">
          <Info size={18} color="#7C3AED" />
          <Text className="ml-3 flex-1 text-sm leading-6 text-gray-600">
            Os logs destacam autoria real. Quando a acao foi sua, o texto aparece como "Voce".
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
