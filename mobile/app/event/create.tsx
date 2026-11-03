import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, ChevronLeft, Clock3, FileText, Plus, Tag } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { differenceInMinutes, format, isAfter, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreateEvent, useEventById, useUpdateEvent } from "../../src/hooks/useEvents";
import { fromAppTime, toAppTime } from "../../src/lib/app-time";
import { REMINDER_OPTIONS, formatReminderSummary } from "../../src/lib/event-reminders";
import { useEventDraftStore } from "../../src/store/event-draft-store";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import { CATEGORY_COLOR_OPTIONS } from "../../src/lib/category-colors";
import { useCategories, useCreateCategory } from "../../src/hooks/useCategories";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-gray-400">{children}</Text>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const params = useLocalSearchParams<{ fresh?: string; id?: string; ownerUsername?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null && Number.isFinite(editingId);
  const ownerUsername = params.ownerUsername ? String(params.ownerUsername) : null;
  const hydratedEventIdRef = useRef<number | null>(null);
  const { mutate: createEvent, isPending: isCreating } = useCreateEvent(ownerUsername);
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent(ownerUsername);
  const { mutate: createCategory, isPending: isCreatingCategory } = useCreateCategory();
  const { data: editingEvent, isLoading: isLoadingEvent } = useEventById(
    isEditing ? editingId : null,
    ownerUsername
  );
  const { data: categories, isLoading: isLoadingCategories } = useCategories(ownerUsername);
  const {
    initialized,
    title,
    description,
    selectedStart,
    selectedEnd,
    remindMe,
    remindBeforeMinutes,
    selectedCategory,
    initializeDraft,
    resetDraft,
    hydrateDraft,
    setTitle,
    setDescription,
    setRemindMe,
    setRemindBeforeMinutes,
    setSelectedCategory,
  } = useEventDraftStore();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    initializeDraft();
    hydratedEventIdRef.current = null;
  }, [initializeDraft, isEditing, params.fresh]);

  useEffect(() => {
    if (!isEditing || !editingEvent) {
      return;
    }

    if (hydratedEventIdRef.current === editingEvent.id) {
      return;
    }

    hydrateDraft({
      title: editingEvent.title,
      description: editingEvent.description,
      selectedStart: toAppTime(editingEvent.start_time),
      selectedEnd: toAppTime(editingEvent.end_time),
      remindMe: editingEvent.remind_me,
      remindBeforeMinutes: editingEvent.remind_before_minutes ?? 15,
      selectedCategory: editingEvent.category,
    });
    hydratedEventIdRef.current = editingEvent.id;
  }, [editingEvent, hydrateDraft, isEditing]);

  const resolvedCategories = useMemo(() => {
    const baseCategories = categories ?? [];

    if (!selectedCategory || baseCategories.some((item) => item.name === selectedCategory)) {
      return baseCategories;
    }

    return [
      ...baseCategories,
      {
        id: -1,
        name: selectedCategory,
        color: editingEvent?.category_color ?? "#7C3AED",
        created_at: "",
        updated_at: "",
      },
    ];
  }, [categories, editingEvent?.category_color, selectedCategory]);

  useEffect(() => {
    if (!resolvedCategories.length) {
      return;
    }

    if (!selectedCategory || !resolvedCategories.some((item) => item.name === selectedCategory)) {
      setSelectedCategory(resolvedCategories[0].name);
    }
  }, [resolvedCategories, selectedCategory, setSelectedCategory]);

  const isPending = isCreating || isUpdating;
  const submitLabel = isEditing ? "Salvar alteracoes" : "Criar Evento";
  const heroTitle = isEditing
    ? ownerUsername
      ? "Ajuste um compromisso na agenda compartilhada"
      : "Ajuste um compromisso existente"
    : ownerUsername
      ? "Adicione um compromisso na agenda compartilhada"
      : "Organize o seu proximo bloco da agenda";
  const heroEyebrow = isEditing ? "Editar compromisso" : "Novo compromisso";
  const screenTitle = isEditing ? "Editar Evento" : "Novo Evento";

  const selectedCategoryEntry = useMemo(
    () => resolvedCategories.find((item) => item.name === selectedCategory) ?? null,
    [resolvedCategories, selectedCategory]
  );

  const handleBack = () => {
    resetDraft();
    router.back();
  };

  const handleCreateCategoryInline = () => {
    const normalizedName = newCategoryName.trim();

    if (!normalizedName) {
      showDialog({
        title: "Atencao",
        message: "Informe o nome da nova categoria.",
      });
      return;
    }

    createCategory(
      { name: normalizedName, color: newCategoryColor },
      {
        onSuccess: (createdCategory) => {
          setSelectedCategory(createdCategory.name);
          setNewCategoryName("");
          setNewCategoryColor(CATEGORY_COLOR_OPTIONS[0]);
          setIsAddingCategory(false);
        },
        onError: (error: any) => {
          showDialog({
            title: "Erro",
            message: error?.message ?? "Nao foi possivel criar a categoria.",
            tone: "danger",
          });
        },
      }
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showDialog({
        title: "Atencao",
        message: "O nome do evento e obrigatorio.",
      });
      return;
    }

    if (!isAfter(selectedEnd, selectedStart)) {
      showDialog({
        title: "Atencao",
        message: "O horario de termino precisa ser depois do inicio.",
      });
      return;
    }

    const category = selectedCategoryEntry ?? {
      name: selectedCategory || "Sem categoria",
      color: "#7C3AED",
    };

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.name,
      category_color: category.color,
      start_time: fromAppTime(selectedStart).toISOString(),
      end_time: fromAppTime(selectedEnd).toISOString(),
      remind_me: remindMe,
      remind_before_minutes: remindBeforeMinutes,
    };

    if (isEditing && editingId !== null) {
      updateEvent(
        { id: editingId, payload },
        {
          onSuccess: (updatedEvent) => {
            resetDraft();
            if (ownerUsername) {
              router.replace(`/agenda/${ownerUsername}`);
              return;
            }
            router.replace(`/event/${updatedEvent.id}`);
          },
          onError: (error: any) => {
            showDialog({
              title: "Erro",
              message: error?.message ?? "Nao foi possivel atualizar o evento.",
              tone: "danger",
            });
          },
        }
      );
      return;
    }

    createEvent(payload, {
      onSuccess: () => {
        resetDraft();
        if (ownerUsername) {
          router.replace(`/agenda/${ownerUsername}`);
          return;
        }
        router.back();
      },
      onError: (error: any) => {
        showDialog({
          title: "Erro",
          message: error?.message ?? "Nao foi possivel criar o evento.",
          tone: "danger",
        });
      },
    });
  };

  if ((isEditing && isLoadingEvent) || !initialized) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (isEditing && !editingEvent) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base font-medium text-gray-500">
          Nao foi possivel carregar o evento para edicao.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-5 pb-4">
        <TouchableOpacity onPress={handleBack} className="p-1">
          <ChevronLeft size={20} color="#000000" />
        </TouchableOpacity>

        <Text className="text-xl font-bold text-gray-900">{screenTitle}</Text>

        <View className="h-6 w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{ paddingBottom: 180 }}
        >
          <View className="px-1 pb-1 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                {heroEyebrow}
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">{heroTitle}</Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Defina titulo, horario, lembrete e categoria em um fluxo unico e direto.
              </Text>
            </View>

            <CalendarDays size={22} color="#7C3AED" />
          </View>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {selectedCategoryEntry?.name ?? "Sem categoria"}
              </Text>
            </View>
            <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {remindMe ? formatReminderSummary(remindBeforeMinutes) : "Sem lembrete"}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <SectionLabel>Conteudo</SectionLabel>

          <View className="gap-4">
            <View>
              <View className="mb-3 flex-row items-center">
                <Tag size={18} color="#7C3AED" />
                <Text className="ml-3 text-xs font-bold uppercase tracking-[2px] text-violet-700/80">
                  Titulo
                </Text>
              </View>
              <TextInput
                placeholder="Nome do evento*"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                className="rounded-2xl border border-violet-100 bg-white px-4 py-4 text-base font-medium text-gray-900"
              />
            </View>

            <View>
              <View className="mb-3 flex-row items-center">
                <FileText size={18} color="#7C3AED" />
                <Text className="ml-3 text-xs font-bold uppercase tracking-[2px] text-violet-700/80">
                  Descricao
                </Text>
              </View>
              <TextInput
                placeholder="Anotacoes (opcional)..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                className="min-h-[116px] rounded-2xl border border-violet-100 bg-white px-4 py-4 text-base font-medium text-gray-900"
              />
            </View>
          </View>
        </View>

        <View className="mt-6">
          <SectionLabel>Quando</SectionLabel>

          <TouchableOpacity
            onPress={() => router.push("/event/schedule")}
            activeOpacity={0.92}
            className="rounded-[30px] p-5"
            style={{ backgroundColor: "#6D28D9" }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-100">
                  Selecao atual
                </Text>
                <Text className="mt-2 text-3xl font-bold leading-tight text-white">
                  {format(selectedStart, "EEEE, d 'de' MMM", { locale: ptBR })}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-violet-100">
                  {isSameDay(selectedStart, selectedEnd)
                    ? "Escolha data e horario em uma tela dedicada."
                    : `Vai ate ${format(selectedEnd, "EEEE, d 'de' MMM", { locale: ptBR })}`}
                </Text>
              </View>

              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <CalendarDays size={24} color="#F5F3FF" />
              </View>
            </View>

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1 flex-row items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <Clock3 size={18} color="#F5F3FF" />
                <Text className="ml-2 text-base font-semibold text-white">
                  {format(selectedStart, "dd/MM HH:mm")} - {format(selectedEnd, "dd/MM HH:mm")}
                </Text>
              </View>

              <View className="items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <Text className="text-sm font-semibold text-violet-50">
                  {differenceInMinutes(selectedEnd, selectedStart)} min
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <SectionLabel>Lembrete</SectionLabel>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-bold text-gray-900">Lembrar deste evento</Text>
              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Ative um aviso local para nao perder o horario.
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
              thumbColor={remindMe ? "#7C3AED" : "#F4F3F4"}
              onValueChange={setRemindMe}
              value={remindMe}
            />
          </View>

          {remindMe ? (
            <>
              <View className="mt-4 flex-row flex-wrap gap-3">
                {REMINDER_OPTIONS.map((option) => {
                  const isSelected = remindBeforeMinutes === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setRemindBeforeMinutes(option.value)}
                      activeOpacity={0.9}
                      className="rounded-2xl px-4 py-3"
                      style={{
                        backgroundColor: isSelected ? "#7C3AED" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: isSelected ? "#7C3AED" : "#DDD6FE",
                        minWidth: "30%",
                      }}
                    >
                      <Text
                        className="text-center text-sm font-bold"
                        style={{ color: isSelected ? "#FFFFFF" : "#5B21B6" }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text className="mt-4 text-sm leading-6 text-violet-900/75">
                {formatReminderSummary(remindBeforeMinutes)}.
              </Text>
            </>
          ) : null}
        </View>

        <View className="mt-6">
          <SectionLabel>Categoria</SectionLabel>

          {isLoadingCategories ? (
            <ActivityIndicator color="#7C3AED" />
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                {resolvedCategories.map((category) => {
                  const isSelected = selectedCategory === category.name;

                  return (
                    <TouchableOpacity
                      key={`${category.id}-${category.name}`}
                      onPress={() => setSelectedCategory(category.name)}
                      activeOpacity={0.9}
                      className="w-[31%] rounded-2xl border px-3 py-4"
                      style={{
                        backgroundColor: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.65)",
                        borderColor: isSelected ? category.color : "#E9D5FF",
                        borderWidth: isSelected ? 2 : 1,
                      }}
                    >
                      <View className="flex-row items-center">
                        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <Text
                          numberOfLines={1}
                          className="ml-2 text-sm font-bold"
                          style={{ color: isSelected ? "#111827" : "#6B7280" }}
                        >
                          {category.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!ownerUsername ? (
                <TouchableOpacity
                  onPress={() => setIsAddingCategory((current) => !current)}
                  activeOpacity={0.88}
                  className="mt-4 flex-row items-center self-start rounded-full border border-violet-200 bg-violet-50 px-4 py-3"
                >
                  <Plus size={16} color="#7C3AED" />
                  <Text className="ml-2 text-sm font-bold text-violet-700">
                    {isAddingCategory ? "Fechar nova categoria" : "Nova categoria"}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!ownerUsername && isAddingCategory ? (
                <View className="mt-4 rounded-[28px] border border-violet-100 bg-violet-50/55 p-5">
                  <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-600">
                    Adicionar categoria
                  </Text>

                  <TextInput
                    placeholder="Nome da categoria"
                    placeholderTextColor="#9CA3AF"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    className="mt-4 rounded-2xl border border-violet-100 bg-white px-4 py-4 text-base font-medium text-gray-900"
                  />

                  <View className="mt-4 flex-row flex-wrap gap-3">
                    {CATEGORY_COLOR_OPTIONS.map((color) => {
                      const isSelected = newCategoryColor === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setNewCategoryColor(color)}
                          activeOpacity={0.88}
                          className="h-12 w-12 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: isSelected ? "#111827" : "#DDD6FE",
                            backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                          }}
                        >
                          <View className="h-7 w-7 rounded-full" style={{ backgroundColor: color }} />
                          {isSelected ? (
                            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-gray-900">
                              <Plus size={12} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    onPress={handleCreateCategoryInline}
                    disabled={isCreatingCategory}
                    activeOpacity={0.88}
                    className="mt-5 flex-row items-center justify-center rounded-full py-4"
                    style={{ backgroundColor: "#7C3AED", opacity: isCreatingCategory ? 0.7 : 1 }}
                  >
                    {isCreatingCategory ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Plus size={18} color="#FFFFFF" />
                        <Text className="ml-2 text-base font-bold text-white">Salvar categoria</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}
        </View>
        </ScrollView>

        <View className="border-t border-violet-100 bg-white px-6 pb-12 pt-4">
          <TouchableOpacity
            className="w-full items-center justify-center rounded-full py-4 active:opacity-90"
            style={{ backgroundColor: "#7C3AED", opacity: isPending ? 0.7 : 1 }}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-lg font-bold text-white">{submitLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
