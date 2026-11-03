import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Check, X, Clock, Mail } from "lucide-react-native";
import { useRouter } from "expo-router";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useAcceptInvite,
  useDeclineInvite,
  useReceivedInviteHistory,
  useReceivedInvites,
} from "../../src/hooks/useAccess";
import { getAppNow, toAppTime } from "../../src/lib/app-time";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import type { AccessInviteStatus, ReceivedInvite } from "../../src/hooks/useAccess";

function EmptyState() {
  return (
    <View className="mt-6 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
      <Text className="text-base font-bold text-gray-900">Nenhum convite recebido</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        Quando alguem compartilhar a agenda com voce, o convite vai aparecer aqui para aceitar ou recusar.
      </Text>
    </View>
  );
}

function getInviteStatusMeta(status: AccessInviteStatus) {
  if (status === "accepted") {
    return {
      label: "Aceito",
      chipClassName: "border-emerald-200 bg-emerald-50",
      textClassName: "text-emerald-700",
    };
  }

  if (status === "declined") {
    return {
      label: "Recusado",
      chipClassName: "border-rose-200 bg-rose-50",
      textClassName: "text-rose-700",
    };
  }

  if (status === "revoked") {
    return {
      label: "Cancelado",
      chipClassName: "border-gray-200 bg-gray-100",
      textClassName: "text-gray-700",
    };
  }

  return {
    label: "Expirado",
    chipClassName: "border-amber-200 bg-amber-50",
    textClassName: "text-amber-700",
  };
}

function getReceivedHistorySummary(invite: ReceivedInvite) {
  if (invite.status === "accepted") {
    return invite.is_permanent
      ? `Voce aceitou o convite de @${invite.username} e a agenda continua liberada.`
      : invite.expires_at
        ? `Voce aceitou o convite de @${invite.username} e o acesso vale ate ${formatDistance(
            toAppTime(invite.expires_at),
            getAppNow(),
            { addSuffix: true, locale: ptBR }
          )}.`
        : `Voce aceitou o convite de @${invite.username}.`;
  }

  if (invite.status === "declined") {
    return `Voce recusou o convite enviado por @${invite.username}.`;
  }

  if (invite.status === "revoked") {
    return `@${invite.username} cancelou esse convite antes da sua resposta.`;
  }

  return `O convite de @${invite.username} expirou antes da sua resposta.`;
}

export default function ReceivedInvitesScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const { data: invites, isLoading } = useReceivedInvites();
  const { data: historyInvites, isLoading: isLoadingHistory } = useReceivedInviteHistory();
  const { mutate: acceptInvite, isPending: isAccepting } = useAcceptInvite();
  const { mutate: declineInvite, isPending: isDeclining } = useDeclineInvite();

  const pendingInvites = invites ?? [];
  const receivedHistory = historyInvites ?? [];

  const handleAccept = (id: number, username: string) => {
    acceptInvite(id, {
      onSuccess: () => {
        showDialog({
          title: "Convite aceito",
          message: `A agenda de @${username} ja esta disponivel para voce em Compartilhadas comigo.`,
          tone: "success",
        });
      },
    });
  };

  const handleDecline = (id: number, username: string) => {
    showDialog({
      title: "Recusar convite",
      message: `Voce nao vera mais o convite de @${username}.`,
      confirmText: "Recusar",
      cancelText: "Voltar",
      tone: "danger",
      onConfirm: () => declineInvite(id),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Convites recebidos</Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="mt-2 px-1 pb-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                Convites
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                Convites aguardando sua resposta
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Aceite para liberar a agenda no seu app ou recuse para descartar o acesso.
              </Text>
            </View>

            <Mail size={22} color="#7C3AED" />
          </View>
          <View className="mt-5 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
              {pendingInvites.length} pendente{pendingInvites.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {isLoading || isLoadingHistory ? (
          <ActivityIndicator color="#7C3AED" className="mt-10" />
        ) : (
          <>
            {pendingInvites.length > 0 ? (
              <View className="mt-6">
                {pendingInvites.map((invite) => (
                  <View key={invite.id} className="mb-3 rounded-[28px] border border-violet-100 bg-violet-50/55 p-5">
                    <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-500">Convite pendente</Text>
                    <Text className="mt-3 text-lg font-bold text-gray-900">{invite.name}</Text>
                    <Text className="mt-1 text-sm font-medium text-gray-500">@{invite.username}</Text>

                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <View className="rounded-full border border-violet-200 bg-white px-3 py-2">
                        <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                          {invite.is_permanent ? "Permanente" : "Temporario"}
                        </Text>
                      </View>
                      <View className="rounded-full border border-violet-200 bg-white px-3 py-2">
                        <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                          {invite.permission_level === "edit" ? "Pode editar" : "Apenas ver"}
                        </Text>
                      </View>

                      <View className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-2">
                        <Clock size={12} color={invite.is_permanent ? "#10B981" : "#F59E0B"} />
                        <Text className={`ml-2 text-xs font-semibold ${invite.is_permanent ? "text-emerald-600" : "text-amber-600"}`}>
                          {invite.is_permanent
                            ? "Sem expiracao"
                            : invite.expires_at
                              ? `Expira ${formatDistance(toAppTime(invite.expires_at), getAppNow(), { addSuffix: true, locale: ptBR })}`
                              : "Acesso temporario"}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-5 flex-row gap-3">
                      <TouchableOpacity
                        disabled={isAccepting || isDeclining}
                        onPress={() => handleAccept(invite.id, invite.username)}
                        className="flex-1 flex-row items-center justify-center rounded-full bg-primary py-4"
                        activeOpacity={0.88}
                      >
                        <Check size={18} color="#FFFFFF" />
                        <Text className="ml-2 text-base font-bold text-white">Aceitar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={isAccepting || isDeclining}
                        onPress={() => handleDecline(invite.id, invite.username)}
                        className="flex-1 flex-row items-center justify-center rounded-full border border-gray-200 bg-white py-4"
                        activeOpacity={0.88}
                      >
                        <X size={18} color="#6B7280" />
                        <Text className="ml-2 text-base font-bold text-gray-700">Recusar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState />
            )}

            <View className="mt-6">
              <View className="mb-4 flex-row items-end justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-bold text-gray-900">Historico recente</Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    Convites que ja foram aceitos, recusados, cancelados ou expiraram.
                  </Text>
                </View>
                <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                    {receivedHistory.length}
                  </Text>
                </View>
              </View>

              {receivedHistory.length > 0 ? (
                receivedHistory.map((invite) => {
                  const statusMeta = getInviteStatusMeta(invite.status);
                  const timelineDate = invite.responded_at ?? invite.created_at;

                  return (
                    <View key={`history-${invite.id}`} className="mb-3 rounded-[28px] border border-gray-200 bg-white p-5">
                      <View
                        className={`self-start rounded-full border px-3 py-2 ${statusMeta.chipClassName}`}
                      >
                        <Text className={`text-xs font-bold uppercase tracking-[1px] ${statusMeta.textClassName}`}>
                          {statusMeta.label}
                        </Text>
                      </View>

                      <Text className="mt-3 text-lg font-bold text-gray-900">{invite.name}</Text>
                      <Text className="mt-1 text-sm font-medium text-gray-500">@{invite.username}</Text>
                      <Text className="mt-3 text-sm leading-6 text-gray-600">
                        {getReceivedHistorySummary(invite)}
                      </Text>

                      <View className="mt-4 self-start rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
                        <Text className="text-xs font-semibold text-gray-600">
                          {formatDistance(toAppTime(timelineDate), getAppNow(), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
                  <Text className="text-base font-bold text-gray-900">Sem historico ainda</Text>
                  <Text className="mt-2 text-sm leading-6 text-gray-500">
                    Assim que algum convite sair do estado pendente, ele aparecera aqui com o status final.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
