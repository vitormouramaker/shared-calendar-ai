import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search, Clock, Infinity, Send, UserRoundPlus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { addDays } from "date-fns";
import { fromAppTime, getAppNow } from "../../src/lib/app-time";
import { useSendInvite } from "../../src/hooks/useAccess";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

type TemporaryDuration = "1d" | "7d" | "30d";

const TEMP_DURATION_DAYS: Record<TemporaryDuration, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

function RuleCard({
  title,
  description,
  icon,
  active,
  onPress,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  badge: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      className={`rounded-[28px] border p-5 ${
        active ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          {icon}
          <Text className={`mt-4 text-lg font-bold ${active ? "text-primary" : "text-gray-900"}`}>
            {title}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-gray-500">{description}</Text>
        </View>

        <View
          className={`rounded-full border px-3 py-1.5 ${
            active ? "border-primary/20 bg-primary/10" : "border-gray-200 bg-gray-50"
          }`}
        >
          <Text
            className={`text-xs font-bold uppercase tracking-[1px] ${active ? "text-primary" : "text-gray-500"}`}
          >
            {badge}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InviteScreen() {
  const router = useRouter();
  const { mutate: sendInvite, isPending } = useSendInvite();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const [search, setSearch] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"view" | "edit">("view");
  const [accessType, setAccessType] = useState<"permanent" | "temporary">("temporary");
  const [tempDuration, setTempDuration] = useState<TemporaryDuration>("7d");

  const normalizedUsername = search.trim().replace(/^@/, "").toLowerCase();

  const expiresAt = useMemo(() => {
    if (accessType === "permanent") {
      return null;
    }

    const expirationDate = addDays(getAppNow(), TEMP_DURATION_DAYS[tempDuration]);
    return fromAppTime(expirationDate).toISOString();
  }, [accessType, tempDuration]);

  const summaryLabel =
    accessType === "permanent"
      ? "Acesso permanente ate voce revogar."
      : tempDuration === "1d"
        ? "Acesso por 1 dia."
        : tempDuration === "7d"
          ? "Acesso por 7 dias."
          : "Acesso por 30 dias.";

  const handleSubmit = () => {
    if (!normalizedUsername) {
      showDialog({
        title: "Atencao",
        message: "Informe o username de quem voce quer convidar.",
      });
      return;
    }

    sendInvite(
      {
        username: normalizedUsername,
        permission_level: permissionLevel,
        is_permanent: accessType === "permanent",
        expires_at: expiresAt,
      },
      {
        onSuccess: () => {
          showDialog({
            title: "Convite enviado",
            message: `@${normalizedUsername} recebeu seu convite de acesso.`,
            confirmText: "Voltar",
            tone: "success",
            onConfirm: () => router.back(),
          });
        },
        onError: (error: any) => {
          showDialog({
            title: "Erro ao convidar",
            message: error?.message ?? "Nao foi possivel enviar o convite.",
            tone: "danger",
          });
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-gray-900">Enviar convite</Text>
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
          contentContainerStyle={{ paddingBottom: 220 }}
        >
          <View className="mt-2 px-1 pb-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                Compartilhamento
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                Compartilhe sua agenda com a pessoa certa
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Envie um convite por username e defina se o acesso sera permanente ou temporario.
              </Text>
            </View>

            <UserRoundPlus size={22} color="#7C3AED" />
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-gray-400">Quem recebera</Text>
          <View className="mt-4 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <Search size={20} color="#7C3AED" />
            <TextInput
              placeholder="Digite @username"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              className="ml-3 flex-1 text-base font-medium text-gray-900"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="mt-4 px-1">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-600">Resumo</Text>
            <Text className="mt-2 text-base font-bold text-gray-900">
              {normalizedUsername ? `Convite para @${normalizedUsername}` : "Aguardando username"}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600">{summaryLabel}</Text>
          </View>
        </View>

        <View className="mt-6">
          <Text className="mb-4 text-lg font-bold text-gray-900">Permissoes</Text>

          <View className="flex-row gap-3">
            {[
              {
                value: "view" as const,
                title: "Apenas ver",
                description: "A pessoa acompanha a agenda, mas nao altera eventos.",
              },
              {
                value: "edit" as const,
                title: "Ver e editar",
                description: "A pessoa pode criar, editar e apagar eventos dessa agenda.",
              },
            ].map((option) => {
              const isSelected = permissionLevel === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPermissionLevel(option.value)}
                  activeOpacity={0.84}
                  className={`flex-1 rounded-[24px] border p-4 ${
                    isSelected ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className={`text-base font-bold ${isSelected ? "text-primary" : "text-gray-900"}`}>
                    {option.title}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-gray-500">{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="mt-6">
          <Text className="mb-4 text-lg font-bold text-gray-900">Regra de acesso</Text>

          <View className="gap-3">
            <RuleCard
              title="Acesso permanente"
              description="A agenda continua liberada ate voce decidir revogar esse acesso."
              icon={<Infinity size={22} color="#7C3AED" />}
              active={accessType === "permanent"}
              onPress={() => setAccessType("permanent")}
              badge="Livre"
            />

            <RuleCard
              title="Acesso temporario"
              description="Ideal para colaboracoes, eventos pontuais ou acompanhamentos por prazo limitado."
              icon={<Clock size={22} color="#7C3AED" />}
              active={accessType === "temporary"}
              onPress={() => setAccessType("temporary")}
              badge="Limitado"
            />
          </View>

          {accessType === "temporary" ? (
            <View className="mt-4">
              <Text className="text-xs font-bold uppercase tracking-[1.5px] text-violet-600">Duracao</Text>
              <Text className="mt-2 text-lg font-bold text-gray-900">Escolha por quanto tempo</Text>
              <View className="mt-4 flex-row gap-3">
                {(["1d", "7d", "30d"] as TemporaryDuration[]).map((option) => {
                  const isSelected = tempDuration === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setTempDuration(option)}
                      className={`flex-1 rounded-2xl border py-4 ${
                        isSelected ? "border-primary bg-primary" : "border-gray-200 bg-white"
                      }`}
                      activeOpacity={0.84}
                    >
                      <Text
                        className={`text-center text-sm font-bold ${
                          isSelected ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {option === "1d" ? "1 dia" : option === "7d" ? "7 dias" : "30 dias"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          </View>
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-50 bg-white px-6 py-6">
          <TouchableOpacity
            className="w-full flex-row items-center justify-center gap-2 rounded-full py-4 disabled:opacity-50"
            style={{ backgroundColor: "#7C3AED" }}
            activeOpacity={0.9}
            disabled={!search.trim() || isPending}
            onPress={handleSubmit}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text className="text-lg font-bold text-white">Enviar convite</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
