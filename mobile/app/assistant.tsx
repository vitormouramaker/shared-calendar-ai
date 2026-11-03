import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Clock3,
  Plus,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react-native";
import {
  useAiAssistantChat,
  useAiConversation,
  useAiInsights,
  useCancelAiAction,
  useConfirmAiAction,
  useCurrentAiConversation,
  useRecentAiConversations,
  useStartNewAiConversation,
  type AiConversationMessage,
  type PendingAiAction,
} from "../src/hooks/useAiAssistant";
import { formatAppDate } from "../src/lib/app-time";
import { Input } from "../src/components/ui/input";
import { useAppDialogStore } from "../src/store/app-dialog-store";

const QUICK_PROMPTS = [
  "Quero criar um agendamento novo",
  "Analise minha agenda da semana",
  "Tenho conflitos na agenda?",
  "Remarque minha reuniao de orcamento para as 15h",
];

const DRAFT_FIELD_LABELS: Record<string, string> = {
  title: "Titulo",
  description: "Descricao",
  category: "Categoria",
  start_date: "Data de inicio",
  start_time: "Horario de inicio",
  end_date: "Data de termino",
  end_time: "Horario de termino",
  remind_me: "Lembrete",
  remind_before_minutes: "Antecedencia do lembrete",
};

function InsightCard({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}) {
  const tone =
    severity === "high"
      ? { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" }
      : severity === "medium"
        ? { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" }
        : { bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" };

  return (
    <View
      className="rounded-2xl border px-4 py-4"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <Text className="text-sm font-bold" style={{ color: tone.text }}>
        {title}
      </Text>
      <Text className="mt-2 text-sm leading-6 text-gray-700">{description}</Text>
    </View>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
      <Text className="text-[11px] font-bold uppercase tracking-[1px] text-violet-500">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-bold text-gray-900">{value}</Text>
    </View>
  );
}

function MessageBubble({
  role,
  content,
  createdAt,
}: {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}) {
  const isUser = role === "user";

  return (
    <View className={isUser ? "items-end" : "items-start"}>
      <View
        className={`max-w-[88%] rounded-3xl px-4 py-3 ${
          isUser ? "bg-violet-600" : "border border-gray-100 bg-white"
        }`}
      >
        <Text className={`text-sm leading-6 ${isUser ? "text-white" : "text-gray-700"}`}>
          {content}
        </Text>
        <Text
          className={`mt-2 text-[11px] ${
            isUser ? "text-violet-100" : "text-gray-400"
          }`}
        >
          {formatAppDate(createdAt, "dd/MM HH:mm")}
        </Text>
      </View>
    </View>
  );
}

function PendingActionCard({
  action,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  action: PendingAiAction;
  onConfirm: (actionId: number) => void;
  onCancel: (actionId: number) => void;
  isConfirming: boolean;
  isCancelling: boolean;
}) {
  const conflictCount = action.preview.conflicts?.length ?? 0;
  const isUpdate = action.preview.action_type === "update_event";

  return (
    <View className="rounded-3xl border border-violet-200 bg-violet-50 px-5 py-5">
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color="#7C3AED" />
        <Text className="text-sm font-bold text-violet-700">
          {isUpdate ? "Atualizacao pronta para confirmar" : "Sugestao pronta para confirmar"}
        </Text>
      </View>

      <Text className="mt-4 text-lg font-bold text-gray-900">{action.preview.title}</Text>
      <Text className="mt-1 text-sm text-gray-500">
        {formatAppDate(action.preview.start_time, "dd/MM 'as' HH:mm")} ate{" "}
        {formatAppDate(action.preview.end_time, "HH:mm")}
      </Text>

      {isUpdate && action.preview.original_event ? (
        <View className="mt-4 rounded-2xl border border-white/80 bg-white px-4 py-4">
          <Text className="text-xs font-bold uppercase tracking-[1px] text-gray-400">Antes</Text>
          <Text className="mt-2 text-sm font-semibold text-gray-800">
            {action.preview.original_event.title}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {formatAppDate(action.preview.original_event.start_time, "dd/MM HH:mm")} ate{" "}
            {formatAppDate(action.preview.original_event.end_time, "HH:mm")}
          </Text>
        </View>
      ) : null}

      <Text className="mt-3 text-sm text-gray-600">Categoria: {action.preview.category}</Text>
      {action.preview.description ? (
        <Text className="mt-2 text-sm leading-6 text-gray-600">{action.preview.description}</Text>
      ) : null}

      {conflictCount > 0 ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <TriangleAlert size={16} color="#D97706" />
            <Text className="text-sm font-bold text-amber-700">
              {conflictCount} conflito(s) encontrado(s)
            </Text>
          </View>
          {action.preview.conflicts?.map((conflict) => (
            <Text key={conflict.id} className="mt-2 text-sm text-amber-800">
              {conflict.title} em {formatAppDate(conflict.start_time, "dd/MM HH:mm")}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-full bg-violet-600 py-4"
          activeOpacity={0.88}
          disabled={isConfirming}
          onPress={() => onConfirm(action.id)}
          style={{ opacity: isConfirming ? 0.7 : 1 }}
        >
          {isConfirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-bold text-white">
              {isUpdate ? "Confirmar alteracao" : "Confirmar evento"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-full border border-gray-200 bg-white py-4"
          activeOpacity={0.88}
          disabled={isCancelling}
          onPress={() => onCancel(action.id)}
          style={{ opacity: isCancelling ? 0.7 : 1 }}
        >
          {isCancelling ? (
            <ActivityIndicator color="#7C3AED" />
          ) : (
            <Text className="text-sm font-bold text-gray-700">Descartar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className={`flex-1 items-center rounded-full px-4 py-3 ${
        active ? "bg-violet-600" : "border border-gray-200 bg-white"
      }`}
    >
      <Text className={`text-sm font-bold ${active ? "text-white" : "text-gray-600"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DraftStatusCard({ draft }: { draft: Record<string, any> }) {
  const filledCount = Object.values(draft?.fields ?? {}).filter(
    (value) => value !== null && value !== "",
  ).length;
  const askedField = draft?.asked_field ? DRAFT_FIELD_LABELS[draft.asked_field] : null;

  return (
    <View className="rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4">
      <Text className="text-sm font-bold text-sky-800">Agendamento em montagem</Text>
      <Text className="mt-2 text-sm leading-6 text-sky-900">
        A IA esta coletando os dados do novo agendamento em formato de chat.
      </Text>
      <Text className="mt-2 text-sm text-sky-700">Campos preenchidos: {filledCount}/9</Text>
      {askedField ? (
        <Text className="mt-1 text-sm text-sky-700">Proximo passo: {askedField}</Text>
      ) : null}
    </View>
  );
}

function EmptyConversationState({ text }: { text: string }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
      <Text className="text-sm leading-6 text-gray-500">{text}</Text>
    </View>
  );
}

function RecentConversationCard({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className={`rounded-3xl border px-4 py-4 ${
        active ? "border-violet-300 bg-violet-50" : "border-gray-100 bg-white"
      }`}
    >
      <Text className={`text-sm font-bold ${active ? "text-violet-700" : "text-gray-900"}`}>
        {title}
      </Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</Text>
    </TouchableOpacity>
  );
}

function SuggestionChip({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      className="rounded-full border border-violet-200 bg-violet-50 px-4 py-3"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Text className="text-sm font-semibold text-violet-700">{label}</Text>
    </TouchableOpacity>
  );
}

function ConversationThread({
  title,
  messages,
  emptyText,
  scrollToLatest = false,
}: {
  title: string;
  messages: AiConversationMessage[];
  emptyText: string;
  scrollToLatest?: boolean;
}) {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!scrollToLatest || messages.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timer);
  }, [messages, scrollToLatest]);

  return (
    <View>
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      {messages.length > 0 ? (
        <View className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
          <ScrollView
            ref={scrollRef}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            className="max-h-[380px]"
            contentContainerStyle={{ padding: 16, gap: 12 }}
            onContentSizeChange={() => {
              if (scrollToLatest) {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
          >
            {messages.map((messageItem) => (
              <MessageBubble
                key={messageItem.id}
                role={messageItem.role}
                content={messageItem.content}
                createdAt={messageItem.created_at}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View className="mt-4">
          <EmptyConversationState text={emptyText} />
        </View>
      )}
    </View>
  );
}

function buildRecentConversationTitle(
  lastMessageContent: string | null,
  createdAt: string | null,
  index: number,
) {
  if (lastMessageContent) {
    return lastMessageContent.length > 44
      ? `${lastMessageContent.slice(0, 44).trim()}...`
      : lastMessageContent;
  }

  if (createdAt) {
    return `Conversa ${formatAppDate(createdAt, "dd/MM HH:mm")}`;
  }

  return `Conversa ${index + 1}`;
}

export default function AssistantScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const pageScrollRef = useRef<ScrollView | null>(null);
  const { data: insights, isLoading: isLoadingInsights } = useAiInsights();
  const { data: currentConversationState, isLoading: isLoadingCurrentConversation } =
    useCurrentAiConversation();
  const { data: recentConversations = [], isLoading: isLoadingRecentConversations } =
    useRecentAiConversations();
  const [activeTab, setActiveTab] = useState<"current" | "recent">("current");
  const [selectedRecentConversationId, setSelectedRecentConversationId] = useState<number | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const chatMutation = useAiAssistantChat();
  const confirmMutation = useConfirmAiAction();
  const cancelMutation = useCancelAiAction();
  const newConversationMutation = useStartNewAiConversation();

  const { data: selectedRecentConversationState, isLoading: isLoadingSelectedConversation } =
    useAiConversation(selectedRecentConversationId);

  const topInsights = useMemo(() => insights?.insights.slice(0, 3) ?? [], [insights?.insights]);
  const currentMessages = currentConversationState?.messages ?? [];
  const currentPendingAction = currentConversationState?.pending_action ?? null;
  const selectedRecentPendingAction = selectedRecentConversationState?.pending_action ?? null;
  const currentDraft = currentConversationState?.conversation?.metadata?.draft ?? null;
  const hasCurrentConversationStarted = currentMessages.length > 0;
  const currentSuggestedReplies = useMemo(() => {
    for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
      const messageItem = currentMessages[index];
      const suggestions = messageItem?.metadata?.suggestions;

      if (messageItem?.role === "assistant" && Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions.filter((value) => typeof value === "string" && value.trim().length > 0);
      }
    }

    return [];
  }, [currentMessages]);

  useEffect(() => {
    if (recentConversations.length === 0) {
      if (selectedRecentConversationId !== null) {
        setSelectedRecentConversationId(null);
      }
      return;
    }

    const stillExists = recentConversations.some(
      (conversation) => conversation.id === selectedRecentConversationId,
    );

    if (!stillExists) {
      setSelectedRecentConversationId(recentConversations[0].id);
    }
  }, [recentConversations, selectedRecentConversationId]);

  const handleSend = (prompt?: string) => {
    const nextMessage = String(prompt ?? message).trim();

    if (!nextMessage) {
      return;
    }

    setActiveTab("current");

    chatMutation.mutate(nextMessage, {
      onSuccess: () => {
        setMessage("");
      },
      onError: (error: any) => {
        showDialog({
          title: "Assistente indisponivel",
          message: error?.message ?? "Nao foi possivel processar sua mensagem agora.",
          tone: "danger",
        });
      },
    });
  };

  const handleStartNewConversation = () => {
    newConversationMutation.mutate(undefined, {
      onSuccess: () => {
        setActiveTab("current");
        setMessage("");
      },
      onError: (error: any) => {
        showDialog({
          title: "Nao foi possivel iniciar",
          message: error?.message ?? "Tente novamente daqui a pouco.",
          tone: "danger",
        });
      },
    });
  };

  const handleConfirm = (actionId: number) => {
    confirmMutation.mutate(actionId, {
      onSuccess: ({ event }) => {
        showDialog({
          title: "Evento salvo",
          message: `${event.title} foi salvo na sua agenda.`,
          tone: "success",
        });
      },
      onError: (error: any) => {
        showDialog({
          title: "Nao foi possivel confirmar",
          message: error?.message ?? "Tente novamente daqui a pouco.",
          tone: "danger",
        });
      },
    });
  };

  const handleCancel = (actionId: number) => {
    cancelMutation.mutate(actionId, {
      onError: (error: any) => {
        showDialog({
          title: "Nao foi possivel descartar",
          message: error?.message ?? "Tente novamente daqui a pouco.",
          tone: "danger",
        });
      },
    });
  };

  const scrollToComposer = () => {
    const timer = setTimeout(() => {
      pageScrollRef.current?.scrollToEnd({ animated: true });
    }, 180);

    return () => clearTimeout(timer);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <ChevronLeft size={22} color="#000000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Assistente IA</Text>
          <View className="h-6 w-6" />
        </View>

        <ScrollView
          ref={pageScrollRef}
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{ paddingBottom: 40, gap: 20 }}
        >
          <View>
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color="#7C3AED" />
            <Text className="text-sm font-bold uppercase tracking-[1.5px] text-violet-600">
              Assistente IA
            </Text>
          </View>
          <Text className="mt-2 text-2xl font-bold text-gray-900">Crie reunioes</Text>
          {insights?.summary.next_free_slot ? (
            <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
              <Clock3 size={16} color="#7C3AED" />
              <Text className="text-sm text-violet-700">
                Proxima janela livre:{" "}
                {formatAppDate(insights.summary.next_free_slot.start, "dd/MM 'as' HH:mm")}
              </Text>
            </View>
          ) : null}
        </View>

          <View>
          <Text className="text-base font-bold text-gray-900">Chat com o assistente</Text>
          <Text className="mt-1 text-sm text-gray-500">Responda e confirme.</Text>

          <View className="mt-4 flex-row gap-3">
            <TabButton
              label="Conversa atual"
              active={activeTab === "current"}
              onPress={() => setActiveTab("current")}
            />
            <TabButton
              label="Conversas recentes"
              active={activeTab === "recent"}
              onPress={() => setActiveTab("recent")}
            />
          </View>

          <TouchableOpacity
            onPress={handleStartNewConversation}
            disabled={newConversationMutation.isPending}
            activeOpacity={0.88}
            className="mt-3 flex-row items-center justify-center rounded-full border border-violet-200 bg-violet-50 py-4"
            style={{ opacity: newConversationMutation.isPending ? 0.7 : 1 }}
          >
            {newConversationMutation.isPending ? (
              <ActivityIndicator color="#7C3AED" />
            ) : (
              <>
                <Plus size={16} color="#7C3AED" />
                <Text className="ml-2 text-sm font-bold text-violet-700">
                  Iniciar nova conversa
                </Text>
              </>
            )}
          </TouchableOpacity>

          {activeTab === "current" ? (
            <View className="mt-4 gap-4">
              {isLoadingCurrentConversation ? (
                <View className="items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-8">
                  <ActivityIndicator color="#7C3AED" />
                </View>
              ) : (
                <>
                  {currentDraft ? <DraftStatusCard draft={currentDraft} /> : null}
                  <ConversationThread
                    title="Conversa atual"
                    messages={currentMessages}
                    emptyText="Sua conversa ativa com a IA aparece aqui. Quando voce iniciar um novo chat, a conversa anterior vai para a aba de recentes."
                    scrollToLatest
                  />
                  {currentPendingAction ? (
                    <PendingActionCard
                      action={currentPendingAction}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      isConfirming={confirmMutation.isPending}
                      isCancelling={cancelMutation.isPending}
                    />
                  ) : null}
                </>
              )}
            </View>
          ) : (
            <View className="mt-4 gap-4">
              <View>
                <Text className="text-base font-bold text-gray-900">Conversas recentes</Text>
                {isLoadingRecentConversations ? (
                  <View className="mt-4 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-8">
                    <ActivityIndicator color="#7C3AED" />
                  </View>
                ) : recentConversations.length > 0 ? (
                  <View className="mt-4 gap-3">
                    {recentConversations.map((conversation, index) => (
                      <RecentConversationCard
                        key={conversation.id}
                        active={conversation.id === selectedRecentConversationId}
                        onPress={() => setSelectedRecentConversationId(conversation.id)}
                        title={buildRecentConversationTitle(
                          conversation.last_message_content,
                          conversation.last_message_created_at,
                          index,
                        )}
                        subtitle={`${formatAppDate(conversation.last_message_at, "dd/MM HH:mm")} - ${
                          conversation.last_message_role === "assistant"
                            ? "Ultima resposta da IA"
                            : "Ultima mensagem do usuario"
                        }`}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="mt-4">
                    <EmptyConversationState text="Quando voce iniciar uma nova conversa, a conversa anterior vai aparecer aqui para consulta." />
                  </View>
                )}
              </View>

              {selectedRecentConversationId ? (
                isLoadingSelectedConversation ? (
                  <View className="items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-8">
                    <ActivityIndicator color="#7C3AED" />
                  </View>
                ) : (
                  <>
                    <ConversationThread
                      title="Detalhe da conversa"
                      messages={selectedRecentConversationState?.messages ?? []}
                      emptyText="Esta conversa ainda nao possui mensagens salvas."
                    />
                    {selectedRecentPendingAction ? (
                      <PendingActionCard
                        action={selectedRecentPendingAction}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        isConfirming={confirmMutation.isPending}
                        isCancelling={cancelMutation.isPending}
                      />
                    ) : null}
                  </>
                )
              ) : null}
            </View>
          )}

          {!hasCurrentConversationStarted ? (
            <View className="mt-5 gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <SuggestionChip
                  key={prompt}
                  label={prompt}
                  onPress={() => handleSend(prompt)}
                  disabled={chatMutation.isPending}
                />
              ))}
            </View>
          ) : currentSuggestedReplies.length > 0 && activeTab === "current" ? (
            <View className="mt-5">
              <Text className="text-sm font-bold text-gray-900">Sugestoes da IA</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Toque em uma opcao para responder mais rapido.
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {currentSuggestedReplies.map((suggestion) => (
                  <SuggestionChip
                    key={suggestion}
                    label={suggestion}
                    onPress={() => handleSend(suggestion)}
                    disabled={chatMutation.isPending}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Input
            value={message}
            onChangeText={setMessage}
            onFocus={scrollToComposer}
            multiline
            textAlignVertical="top"
            placeholder="Descreva o que voce precisa..."
            className="mt-4 h-32 rounded-2xl border-gray-200 bg-gray-50 px-4 py-4"
            containerClassName="mt-2"
          />

          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={chatMutation.isPending}
            className="mt-4 flex-row items-center justify-center rounded-full bg-violet-600 py-4"
            activeOpacity={0.88}
            style={{ opacity: chatMutation.isPending ? 0.7 : 1 }}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-bold text-white">Enviar para a IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

          <View className="flex-row gap-3">
          <SummaryPill
            label="Conflitos"
            value={String(insights?.summary.conflict_count ?? 0)}
          />
          <SummaryPill
            label="Sem contexto"
            value={String(insights?.summary.missing_description_count ?? 0)}
          />
          <SummaryPill
            label="Sem lembrete"
            value={String(insights?.summary.reminders_disabled_count ?? 0)}
          />
        </View>

          <View>
          <Text className="text-base font-bold text-gray-900">Principais sinais da agenda</Text>
          {isLoadingInsights ? (
            <View className="mt-4 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-8">
              <ActivityIndicator color="#7C3AED" />
            </View>
          ) : topInsights.length > 0 ? (
            <View className="mt-4 gap-3">
              {topInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  title={insight.title}
                  description={insight.description}
                  severity={insight.severity}
                />
              ))}
            </View>
          ) : (
            <View className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <Text className="text-sm text-gray-500">
                Nenhum ponto urgente encontrado na sua agenda agora.
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
