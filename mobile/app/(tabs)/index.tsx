import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Plus,
  Search,
  Users,
  Bell,
  ClipboardList,
  ChevronRight,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Sparkles,
} from "lucide-react-native";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "../../src/components/ui/avatar";
import {
  useHomeDashboard,
  useRefreshHomeDashboard,
  type HomeDashboard,
  type DashboardSharedAgenda,
  type DashboardActivityLog,
} from "../../src/hooks/useHomeDashboard";
import { useAiInsights } from "../../src/hooks/useAiAssistant";
import { formatAppDate, getAppNow, toAppTime } from "../../src/lib/app-time";

// ── Helpers ───────────────────────────────────────────────────────────────────

function greet(firstName: string) {
  const h = getAppNow().getHours();
  if (h < 12) return `Bom dia, ${firstName}`;
  if (h < 18) return `Boa tarde, ${firstName}`;
  return `Boa noite, ${firstName}`;
}

function timeUntil(isoStart: string) {
  const diff = differenceInMinutes(toAppTime(isoStart), getAppNow());
  if (diff <= 0) return "Em andamento";
  if (diff < 60) return `em ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `em ${h}h` : `em ${h}h ${m}min`;
}

function formatRemainingLabel(startTime: string, now: number) {
  const diffMs = toAppTime(startTime).getTime() - now;

  if (Number.isNaN(diffMs)) {
    return null;
  }

  if (diffMs <= 0) {
    return "Agora";
  }

  let totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return `Em ${parts.join(" ")}`;
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function SkeletonBox({
  h = 16,
  w,
  rounded = "rounded-xl",
}: {
  h?: number;
  w?: number | `${number}%`;
  rounded?: string;
}) {
  return (
    <View
      className={`bg-gray-100 ${rounded}`}
      style={{ height: h, width: w ?? "100%" }}
    />
  );
}

function DashboardSkeleton() {
  return (
    <View className="flex-1 px-6 pt-6">
      <View className="flex-row items-center gap-4">
        <SkeletonBox h={52} w={52} rounded="rounded-full" />
        <View className="flex-1 gap-2">
          <SkeletonBox h={12} w="55%" />
          <SkeletonBox h={22} w="75%" />
          <SkeletonBox h={12} w="35%" />
        </View>
      </View>
      <View className="mt-7 flex-row gap-3">
        <SkeletonBox h={76} w="47%" rounded="rounded-2xl" />
        <SkeletonBox h={76} w="47%" rounded="rounded-2xl" />
      </View>
      <View className="mt-3 flex-row gap-3">
        <SkeletonBox h={76} w="47%" rounded="rounded-2xl" />
        <SkeletonBox h={76} w="47%" rounded="rounded-2xl" />
      </View>
      <View className="mt-7 gap-3">
        <SkeletonBox h={16} w="40%" rounded="rounded-lg" />
        <SkeletonBox h={80} rounded="rounded-2xl" />
        <SkeletonBox h={100} rounded="rounded-2xl" />
      </View>
      <View className="mt-7 gap-3">
        <SkeletonBox h={16} w="50%" rounded="rounded-lg" />
        <SkeletonBox h={64} rounded="rounded-2xl" />
        <SkeletonBox h={64} rounded="rounded-2xl" />
      </View>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  onAction,
  actionLabel = "Ver tudo",
}: {
  title: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      {onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.8}>
          <Text className="text-sm font-semibold text-violet-600">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      className="rounded-2xl px-3 pt-3 pb-4 justify-between"
      style={{ backgroundColor: "#7C3AED", width: 90, height: 100 }}
    >
      <View className="flex-row items-start justify-between">
        <View
          className="items-center justify-center rounded-full p-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
        >
          {icon}
        </View>
        <View className="flex-row items-center gap-1">
          {badge != null && badge > 0 ? (
            <View className="min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
              <Text className="text-[9px] font-bold text-white">
                {badge > 9 ? "9+" : badge}
              </Text>
            </View>
          ) : null}
          <ChevronRight size={13} color="rgba(255,255,255,0.5)" />
        </View>
      </View>
      <Text className="text-xs font-bold text-white" numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── My Agenda Summary ─────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3">
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      <Text className="mt-0.5 text-center text-[11px] leading-tight text-gray-500">
        {label}
      </Text>
    </View>
  );
}

function MyAgendaSummary({
  dashboard,
  onOpen,
}: {
  dashboard: HomeDashboard;
  onOpen: () => void;
}) {
  const { today_summary, next_event } = dashboard;
  const [now, setNow] = useState(getAppNow().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getAppNow().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const nextEventRemainingLabel = useMemo(() => {
    if (!next_event?.start_time) {
      return null;
    }

    return formatRemainingLabel(next_event.start_time, now);
  }, [next_event?.start_time, now]);

  return (
    <View>
      <SectionHeader
        title="Minha agenda"
        onAction={onOpen}
        actionLabel="Abrir"
      />

      <View className="mb-4 flex-row gap-3">
        <StatPill value={today_summary.today_count} label="Hoje" />
        <StatPill value={today_summary.week_count} label="Semana" />
        <StatPill
          value={today_summary.active_reminders_count}
          label="Lembretes"
        />
      </View>

      {next_event ? (
        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.85}
          className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-500">
              Próximo evento
            </Text>
            <Text className="text-xs font-semibold text-violet-500">
              {nextEventRemainingLabel}
            </Text>
          </View>
          <Text
            className="mt-2 text-[15px] font-bold text-gray-900"
            numberOfLines={1}
          >
            {next_event.title}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: next_event.category_color }}
              />
              <Text className="text-xs text-gray-500">
                {formatAppDate(next_event.start_time, "HH:mm")} –{" "}
                {formatAppDate(next_event.end_time, "HH:mm")}
              </Text>
              <Text className="text-xs text-gray-300">·</Text>
              <Text className="text-xs text-gray-500">
                {next_event.category}
              </Text>
            </View>
            <ChevronRight size={14} color="#7C3AED" />
          </View>
        </TouchableOpacity>
      ) : (
        <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color="#D1D5DB" />
            <Text className="text-sm text-gray-400">
              Nenhum evento futuro agendado.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Shared Agendas ────────────────────────────────────────────────────────────

function SharedAgendaCard({
  item,
  onPress,
}: {
  item: DashboardSharedAgenda;
  onPress: () => void;
}) {
  const isEdit = item.permission_level === "edit";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mb-2 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5"
    >
      <Avatar
        name={item.owner_name}
        avatarUrl={item.owner_avatar_url}
        size={40}
        backgroundColor="#F3E8FF"
        textColor="#7C3AED"
      />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="shrink text-sm font-bold text-gray-900"
            numberOfLines={1}
          >
            {item.owner_name}
          </Text>
          <View
            className={`rounded-full px-2 py-0.5 ${isEdit ? "bg-violet-100" : "bg-gray-100"}`}
          >
            <Text
              className={`text-[10px] font-bold ${isEdit ? "text-violet-700" : "text-gray-500"}`}
            >
              {isEdit ? "Pode editar" : "Apenas ver"}
            </Text>
          </View>
        </View>

        {item.next_event_title ? (
          <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>
            {item.next_event_title} ·{" "}
            {formatAppDate(item.next_event_start!, "dd/MM HH:mm")}
          </Text>
        ) : (
          <Text className="mt-0.5 text-xs text-gray-400">
            Sem eventos futuros
          </Text>
        )}
      </View>
      <ChevronRight size={16} color="#D1D5DB" className="ml-2" />
    </TouchableOpacity>
  );
}

function SharedAgendasSection({
  dashboard,
  onOpen,
}: {
  dashboard: HomeDashboard;
  onOpen: (username: string) => void;
}) {
  const { shared_agendas } = dashboard;

  return (
    <View>
      <SectionHeader title="Agendas compartilhadas" />
      {shared_agendas.length === 0 ? (
        <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
          <View className="flex-row items-center gap-2">
            <Users size={16} color="#D1D5DB" />
            <Text className="text-sm text-gray-400">
              Nenhuma agenda compartilhada com voce ainda.
            </Text>
          </View>
        </View>
      ) : (
        shared_agendas.map((item) => (
          <SharedAgendaCard
            key={item.id}
            item={item}
            onPress={() => onOpen(item.owner_username)}
          />
        ))
      )}
    </View>
  );
}

// ── Pendências ────────────────────────────────────────────────────────────────

function PendingSection({
  dashboard,
  onInvites,
  onEventPress,
  onAccessPress,
}: {
  dashboard: HomeDashboard;
  onInvites: () => void;
  onEventPress: (id: number) => void;
  onAccessPress: () => void;
}) {
  const { pending_invites_count, expiring_access, today_events } = dashboard;

  const startingSoon = useMemo(() => {
    const now = getAppNow();
    return today_events.filter((e) => {
      const diff = differenceInMinutes(toAppTime(e.start_time), now);
      return diff >= 0 && diff <= 60;
    });
  }, [today_events]);

  const hasAny =
    pending_invites_count > 0 ||
    expiring_access.length > 0 ||
    startingSoon.length > 0;

  return (
    <View>
      <SectionHeader title="Pendências" />

      {!hasAny ? (
        <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
          <CheckCircle size={18} color="#10B981" />
          <Text className="text-sm font-semibold text-gray-500">
            Tudo em ordem por aqui.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {pending_invites_count > 0 ? (
            <TouchableOpacity
              onPress={onInvites}
              activeOpacity={0.85}
              className="flex-row items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-5"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <Users size={16} color="#D97706" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-gray-900">
                    {pending_invites_count} convite
                    {pending_invites_count > 1 ? "s" : ""} pendente
                    {pending_invites_count > 1 ? "s" : ""}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Toque para responder
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#D97706" />
            </TouchableOpacity>
          ) : null}

          {startingSoon.map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => onEventPress(e.id)}
              activeOpacity={0.85}
              className="flex-row items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-5"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                <Bell size={16} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {e.title}
                </Text>
                <Text className="text-xs text-violet-600">
                  Começa {timeUntil(e.start_time)}
                </Text>
              </View>
              <ChevronRight size={16} color="#7C3AED" />
            </TouchableOpacity>
          ))}

          {expiring_access.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={onAccessPress}
              activeOpacity={0.85}
              className="flex-row items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-5"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle size={16} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-bold text-gray-900"
                  numberOfLines={1}
                >
                  Acesso a @{a.owner_username}
                </Text>
                <Text className="text-xs text-orange-600">
                  Expira em {formatAppDate(a.expires_at, "dd/MM")}
                </Text>
              </View>
              <ChevronRight size={16} color="#EA580C" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Atividade Recente ─────────────────────────────────────────────────────────

type ActivityFilter = "mine" | "shared";

function describeAction(log: DashboardActivityLog): string {
  const title = log.target_title ? `"${log.target_title}"` : "";
  switch (log.action_type) {
    case "event_created":
      return `criou ${title}`;
    case "event_updated":
      return `atualizou ${title}`;
    case "event_deleted":
      return `removeu ${title}`;
    case "invite_sent":
      return `enviou convite para ${log.target_title ?? "usuario"}`;
    case "invite_accepted":
      return "aceitou o convite";
    case "invite_declined":
      return "recusou o convite";
    case "invite_revoked":
      return "cancelou o convite";
    case "access_revoked":
      return "revogou um acesso";
    default:
      return log.action_type;
  }
}

function relativeTime(isoDate: string): string {
  return formatDistanceToNow(toAppTime(isoDate), {
    addSuffix: true,
    locale: ptBR,
  });
}

function ActivityRow({
  log,
  showOwner,
  onPress,
}: {
  log: DashboardActivityLog;
  showOwner?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center gap-3 border-b border-gray-100 py-3 last:border-0"
    >
      <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-100">
        <ClipboardList size={14} color="#6B7280" />
      </View>
      <View className="flex-1">
        {showOwner && log.owner_name ? (
          <Text className="mb-0.5 text-[11px] font-bold uppercase tracking-[1px] text-violet-500">
            @{log.owner_username}
          </Text>
        ) : null}
        <Text className="text-sm text-gray-800" numberOfLines={2}>
          <Text className="font-bold">{log.actor_name}</Text>{" "}
          {describeAction(log)}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-400">
          {relativeTime(log.created_at)}
        </Text>
      </View>
      <ChevronRight size={14} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function RecentActivitySection({
  dashboard,
  onLogsPress,
}: {
  dashboard: HomeDashboard;
  onLogsPress: () => void;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("mine");

  const logs =
    filter === "mine" ? dashboard.recent_activity : dashboard.shared_activity;
  const hasShared = dashboard.shared_agendas.length > 0;

  return (
    <View>
      <SectionHeader title="Atividade recente" />

      {hasShared ? (
        <View className="mb-3 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setFilter("mine")}
            activeOpacity={0.8}
            className={`rounded-full border px-3 py-1.5 ${
              filter === "mine"
                ? "border-violet-300 bg-violet-100"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filter === "mine" ? "text-violet-700" : "text-gray-500"
              }`}
            >
              Minha agenda
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("shared")}
            activeOpacity={0.8}
            className={`rounded-full border px-3 py-1.5 ${
              filter === "shared"
                ? "border-violet-300 bg-violet-100"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filter === "shared" ? "text-violet-700" : "text-gray-500"
              }`}
            >
              Compartilhadas
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {logs.length === 0 ? (
        <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
          <Text className="text-sm text-gray-400">
            Nenhuma atividade recente.
          </Text>
        </View>
      ) : (
        <View>
          {logs.map((log) => (
            <ActivityRow
              key={log.id}
              log={log}
              showOwner={filter === "shared"}
              onPress={onLogsPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <AlertCircle size={32} color="#9CA3AF" />
      <Text className="text-center text-base font-semibold text-gray-600">
        Nao foi possivel carregar o dashboard.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.85}
        className="rounded-full bg-violet-600 px-6 py-3"
      >
        <Text className="text-sm font-bold text-white">Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

function AssistantPreviewSection({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading } = useAiInsights(14);

  return (
    <View>
      <SectionHeader title="Assistente IA" onAction={onOpen} actionLabel="Abrir" />

      {isLoading ? (
        <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
          <Text className="text-sm text-gray-400">Analisando sua agenda...</Text>
        </View>
      ) : data ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-violet-500">
                Conflitos
              </Text>
              <Text className="mt-1 text-lg font-bold text-gray-900">
                {data.summary.conflict_count}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-violet-500">
                Sem lembrete
              </Text>
              <Text className="mt-1 text-lg font-bold text-gray-900">
                {data.summary.reminders_disabled_count}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-violet-500">
                Sem descricao
              </Text>
              <Text className="mt-1 text-lg font-bold text-gray-900">
                {data.summary.missing_description_count}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onOpen}
            activeOpacity={0.85}
            className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Sparkles size={16} color="#7C3AED" />
                <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-600">
                  {data.summary.conflict_count > 0 ? "Conflitos detectados" : "Sugestoes inteligentes"}
                </Text>
              </View>
              <ChevronRight size={16} color="#7C3AED" />
            </View>
            <Text className="mt-3 text-sm font-bold text-gray-900">
              {data.insights[0]?.title ?? "Agenda sob controle"}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-gray-600">
              {data.insights[0]?.description ??
                "Use o assistente para revisar sua semana e montar novos eventos por texto."}
            </Text>
            {data.summary.next_free_slot ? (
              <Text className="mt-3 text-xs font-semibold text-violet-600">
                Janela livre: {formatAppDate(data.summary.next_free_slot.start, "dd/MM HH:mm")}
              </Text>
            ) : (
              <Text className="mt-3 text-xs font-semibold text-violet-600">
                Ver analise completa e pedir novas reunioes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.85}
          className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-gray-900">Agenda sob controle</Text>
            <ChevronRight size={16} color="#7C3AED" />
          </View>
          <Text className="mt-1 text-sm leading-6 text-gray-500">
            O assistente nao encontrou alertas fortes agora. Use-o para montar um novo evento por texto.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const {
    data: dashboard,
    isLoading,
    isError,
    isRefetching,
  } = useHomeDashboard();
  const refresh = useRefreshHomeDashboard();

  const firstName = useMemo(
    () => dashboard?.me?.name?.trim().split(" ")[0] ?? "voce",
    [dashboard?.me?.name]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !dashboard) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ErrorState onRetry={refresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 120,
          gap: 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            tintColor="#7C3AED"
          />
        }
      >
        {/* ── 1. Header pessoal ── */}
        <View>
          <View className="flex-row items-center gap-4">
            <Avatar
              name={dashboard.me?.name}
              avatarUrl={dashboard.me?.avatar_url}
              size={52}
              backgroundColor="#F3E8FF"
              textColor="#7C3AED"
            />
            <View className="flex-1">
              <Text className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                {greet(firstName)}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-400">
                @{dashboard.me?.username}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              activeOpacity={0.8}
              style={{ position: "relative", padding: 4 }}
            >
              <Bell size={24} color="#374151" />
              {dashboard.unread_notifications_count > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    minWidth: 17,
                    height: 17,
                    borderRadius: 999,
                    backgroundColor: "#DC2626",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}
                  >
                    {dashboard.unread_notifications_count > 99
                      ? "99+"
                      : dashboard.unread_notifications_count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
              <CalendarDays size={12} color="#7C3AED" />
              <Text className="ml-1.5 text-xs font-bold text-violet-700">
                {dashboard.today_summary.today_count} evento
                {dashboard.today_summary.today_count !== 1 ? "s" : ""} hoje
              </Text>
            </View>

            {dashboard.pending_invites_count > 0 ? (
              <View className="flex-row items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
                <Users size={12} color="#D97706" />
                <Text className="ml-1.5 text-xs font-bold text-amber-700">
                  {dashboard.pending_invites_count} convite
                  {dashboard.pending_invites_count > 1 ? "s" : ""}
                </Text>
              </View>
            ) : null}

            {dashboard.shared_agendas.length > 0 ? (
              <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                <Users size={12} color="#6B7280" />
                <Text className="ml-1.5 text-xs font-bold text-gray-600">
                  {dashboard.shared_agendas.length} agenda
                  {dashboard.shared_agendas.length > 1 ? "s" : ""} compartilhada
                  {dashboard.shared_agendas.length > 1 ? "s" : ""}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 2. Ações rápidas ── */}
        <View>
          <SectionHeader title="Ações rápidas" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <QuickAction
              icon={<Plus size={18} color="#fff" />}
              label={"Novo evento"}
              onPress={() => router.push("/event/create")}
            />
            <QuickAction
              icon={<Search size={18} color="#fff" />}
              label="Agenda"
              onPress={() => router.push("/agenda/open")}
            />
            <QuickAction
              icon={<Users size={18} color="#fff" />}
              label="Convites"
              badge={dashboard.pending_invites_count}
              onPress={() => router.push("/profile/received")}
            />
            <QuickAction
              icon={<Sparkles size={18} color="#fff" />}
              label={"Assistente"}
              onPress={() => router.push("/ai")}
            />
            <QuickAction
              icon={<ClipboardList size={18} color="#fff" />}
              label="Logs"
              onPress={() => router.push("/agenda/logs")}
            />
          </ScrollView>
        </View>

        {/* ── 3. Resumo da minha agenda ── */}
        <MyAgendaSummary
          dashboard={dashboard}
          onOpen={() => router.push("/calendar")}
        />

        <AssistantPreviewSection onOpen={() => router.push("/ai")} />

        {/* ── 4. Agendas compartilhadas ── */}
        <SharedAgendasSection
          dashboard={dashboard}
          onOpen={(username) => router.push(`/agenda/${username}`)}
        />

        {/* ── 5. Pendências ── */}
        <PendingSection
          dashboard={dashboard}
          onInvites={() => router.push("/profile/received")}
          onEventPress={(id) => router.push(`/event/${id}`)}
          onAccessPress={() => router.push("/profile/access")}
        />

        {/* ── 6. Atividade recente ── */}
        <RecentActivitySection
          dashboard={dashboard}
          onLogsPress={() => router.push("/agenda/logs")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
