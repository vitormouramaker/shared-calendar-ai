import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Plus,
  UserX,
  Clock,
  Calendar as CalendarIcon,
  MailX,
  Users,
  Send,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useGuests,
  useRemoveGuest,
  useRevokeInvite,
  useSentInviteHistory,
  useSentInvites,
} from "../../src/hooks/useAccess";
import { getAppNow, toAppTime } from "../../src/lib/app-time";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import type { AccessInviteStatus, SentInvite } from "../../src/hooks/useAccess";
import { Avatar } from "../../src/components/ui/avatar";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <View className="flex-1 rounded-[24px] border border-violet-100 bg-violet-50/60 p-4">
      {icon}
      <Text className="mt-3 text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="mt-1 text-sm font-medium text-gray-500">{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <View className="mb-4 flex-row items-end justify-between">
      <View className="flex-1 pr-4">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        <Text className="mt-1 text-sm text-gray-500">{subtitle}</Text>
      </View>
      <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
        <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
          {count}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="mb-8 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        {description}
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

function getSentHistorySummary(invite: SentInvite) {
  if (invite.status === "accepted") {
    return invite.is_permanent
      ? `@${invite.username} aceitou o convite e continua com acesso liberado.`
      : invite.expires_at
        ? `@${invite.username} aceitou o convite e o acesso vale ate ${formatDistance(
            toAppTime(invite.expires_at),
            getAppNow(),
            { addSuffix: true, locale: ptBR }
          )}.`
        : `@${invite.username} aceitou o convite.`;
  }

  if (invite.status === "declined") {
    return `@${invite.username} recusou o seu convite.`;
  }

  if (invite.status === "revoked") {
    return `Você cancelou o convite enviado para @${invite.username}.`;
  }

  return `O convite para @${invite.username} expirou antes de receber resposta.`;
}

export default function AccessManagementScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const { data: guests, isLoading: isLoadingGuests } = useGuests();
  const { data: sentInvites, isLoading: isLoadingInvites } = useSentInvites();
  const { data: inviteHistory, isLoading: isLoadingHistory } =
    useSentInviteHistory();
  const { mutate: removeGuest, isPending: isRemovingGuest } = useRemoveGuest();
  const { mutate: revokeInvite, isPending: isRevokingInvite } =
    useRevokeInvite();

  const activeGuests = guests ?? [];
  const pendingInvites = sentInvites ?? [];
  const sentHistory = inviteHistory ?? [];
  const isLoading = isLoadingGuests || isLoadingInvites || isLoadingHistory;

  const confirmRemoveGuest = (id: number, username: string) => {
    showDialog({
      title: "Revogar acesso",
      message: `@${username} perdera o acesso a sua agenda.`,
      confirmText: "Revogar",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: () => removeGuest(id),
    });
  };

  const confirmRevokeInvite = (id: number, username: string) => {
    showDialog({
      title: "Cancelar convite",
      message: `O convite pendente para @${username} sera cancelado.`,
      confirmText: "Cancelar convite",
      cancelText: "Voltar",
      tone: "danger",
      onConfirm: () => revokeInvite(id),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Usuarios convidados
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/profile/invite")}
          className="p-2 -mr-2"
        >
          <Plus size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="mt-2 px-1 pb-1">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
            Acessos
          </Text>
          <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Controle quem pode ver sua agenda
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500">
            Convide pessoas, acompanhe respostas pendentes e revogue o acesso
            quando precisar.
          </Text>
        </View>

        <View className="mt-4 flex-row gap-3">
          <StatCard
            label="Com acesso"
            value={activeGuests.length}
            icon={<Users size={18} color="#7C3AED" />}
          />
          <StatCard
            label="Pendentes"
            value={pendingInvites.length}
            icon={<Send size={18} color="#7C3AED" />}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" className="mt-10" />
        ) : (
          <>
            <View className="mt-8">
              <SectionHeader
                title="Com acesso ativo"
                subtitle="Pessoas que ja podem ver sua agenda agora."
                count={activeGuests.length}
              />

              {activeGuests.length > 0 ? (
                activeGuests.map((guest) => (
                  <View
                    key={`guest-${guest.id}`}
                    className="mb-3 rounded-[28px] border border-violet-100 bg-violet-50/55 p-5"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <View className="flex-row items-center">
                          <Avatar
                            name={guest.name}
                            avatarUrl={guest.avatar_url}
                            size={48}
                            backgroundColor="#FFFFFF"
                            textColor="#7C3AED"
                          />
                          <View className="ml-3 flex-1">
                            <Text className="text-lg font-bold text-gray-900">
                              {guest.name}
                            </Text>
                            <Text className="mt-1 text-sm font-medium text-gray-500">
                              @{guest.username}
                            </Text>
                          </View>
                        </View>

                        <View className="mt-4 flex-row flex-wrap gap-2">
                          <View className="rounded-full border border-violet-200 bg-white px-3 py-2">
                            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                              {guest.is_permanent ? "Permanente" : "Temporario"}
                            </Text>
                          </View>
                          <View className="rounded-full border border-violet-200 bg-white px-3 py-2">
                            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                              {guest.permission_level === "edit"
                                ? "Pode editar"
                                : "Apenas ver"}
                            </Text>
                          </View>
                          <View className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-2">
                            <Clock
                              size={12}
                              color={guest.is_permanent ? "#10B981" : "#F59E0B"}
                            />
                            <Text
                              className={`ml-2 text-xs font-semibold ${guest.is_permanent ? "text-emerald-600" : "text-amber-600"}`}
                            >
                              {guest.is_permanent
                                ? "Sem expiracao"
                                : guest.expires_at
                                  ? `Expira ${formatDistance(
                                      toAppTime(guest.expires_at),
                                      getAppNow(),
                                      {
                                        addSuffix: true,
                                        locale: ptBR,
                                      }
                                    )}`
                                  : "Temporario"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="gap-4 pt-1">
                        <TouchableOpacity
                          onPress={() =>
                            router.push(`/agenda/${guest.username}`)
                          }
                          className="p-1"
                          activeOpacity={0.82}
                        >
                          <CalendarIcon size={18} color="#7C3AED" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={isRemovingGuest}
                          onPress={() =>
                            confirmRemoveGuest(guest.id, guest.username)
                          }
                          className="p-1"
                          activeOpacity={0.82}
                        >
                          <UserX size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="Nenhum acesso ativo"
                  description="Quando alguem aceitar seu convite, a pessoa vai aparecer aqui para voce acompanhar e revogar quando quiser."
                />
              )}
            </View>

            <View className="mt-3">
              <SectionHeader
                title="Convites pendentes"
                subtitle="Usuarios que ainda nao responderam."
                count={pendingInvites.length}
              />

              {pendingInvites.length > 0 ? (
                pendingInvites.map((invite) => (
                  <View
                    key={`invite-${invite.id}`}
                    className="mb-3 rounded-[28px] border border-gray-200 bg-white p-5"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-500">
                          Convite enviado
                        </Text>
                        <Text className="mt-3 text-lg font-bold text-gray-900">
                          {invite.name}
                        </Text>
                        <Text className="mt-1 text-sm font-medium text-gray-500">
                          @{invite.username}
                        </Text>

                        <View className="mt-4 flex-row flex-wrap gap-2">
                          <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                              {invite.is_permanent
                                ? "Permanente"
                                : "Temporario"}
                            </Text>
                          </View>
                          <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
                            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                              {invite.permission_level === "edit"
                                ? "Pode editar"
                                : "Apenas ver"}
                            </Text>
                          </View>
                          <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
                            <Clock
                              size={12}
                              color={
                                invite.is_permanent ? "#10B981" : "#F59E0B"
                              }
                            />
                            <Text
                              className={`ml-2 text-xs font-semibold ${invite.is_permanent ? "text-emerald-600" : "text-amber-600"}`}
                            >
                              {invite.is_permanent
                                ? "Acesso liberado ao aceitar"
                                : invite.expires_at
                                  ? `Valido ate ${formatDistance(
                                      toAppTime(invite.expires_at),
                                      getAppNow(),
                                      {
                                        addSuffix: true,
                                        locale: ptBR,
                                      }
                                    )}`
                                  : "Acesso temporario"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        disabled={isRevokingInvite}
                        onPress={() =>
                          confirmRevokeInvite(invite.id, invite.username)
                        }
                        className="p-1"
                        activeOpacity={0.82}
                      >
                        <MailX size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="Nenhum convite pendente"
                  description="Os convites enviados que ainda estiverem aguardando resposta vao aparecer nesta secao."
                />
              )}
            </View>

            <View className="mt-3">
              <SectionHeader
                title="Historico recente"
                subtitle="Status finais dos convites que ja sairam do fluxo pendente."
                count={sentHistory.length}
              />

              {sentHistory.length > 0 ? (
                sentHistory.map((invite) => {
                  const statusMeta = getInviteStatusMeta(invite.status);
                  const timelineDate = invite.responded_at ?? invite.created_at;

                  return (
                    <View
                      key={`history-${invite.id}`}
                      className="mb-3 rounded-[28px] border border-gray-200 bg-white p-5"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-4">
                          <View
                            className={`self-start rounded-full border px-3 py-2 ${statusMeta.chipClassName}`}
                          >
                            <Text
                              className={`text-xs font-bold uppercase tracking-[1px] ${statusMeta.textClassName}`}
                            >
                              {statusMeta.label}
                            </Text>
                          </View>

                          <Text className="mt-3 text-lg font-bold text-gray-900">
                            {invite.name}
                          </Text>
                          <Text className="mt-1 text-sm font-medium text-gray-500">
                            @{invite.username}
                          </Text>
                          <Text className="mt-3 text-sm leading-6 text-gray-600">
                            {getSentHistorySummary(invite)}
                          </Text>
                        </View>

                        <View className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
                          <Text className="text-xs font-semibold text-gray-600">
                            {formatDistance(
                              toAppTime(timelineDate),
                              getAppNow(),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              }
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  title="Sem historico ainda"
                  description="Aceites, recusas, cancelamentos e expiracoes vao aparecer aqui para voce acompanhar o ciclo completo dos convites."
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-8 left-0 right-0 px-6">
        <TouchableOpacity
          className="w-full flex-row items-center justify-center gap-2 rounded-full py-4"
          style={{ backgroundColor: "#7C3AED" }}
          activeOpacity={0.9}
          onPress={() => router.push("/profile/invite")}
        >
          <Plus color="#FFFFFF" size={20} />
          <Text className="text-lg font-bold text-white">Convidar usuario</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
