import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Globe2, Lock, Search, UserRoundSearch } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../src/lib/axios";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

type AgendaSummary = {
  name: string;
  username: string;
  is_private: boolean;
  can_view: boolean;
  relationship: "public" | "granted" | "private" | "owner";
};

export default function OpenAgendaScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<AgendaSummary | null>(null);

  const { mutate: searchAgenda, isPending } = useMutation({
    mutationFn: async (normalizedUsername: string) => {
      const { data } = await api.get(`/users/${normalizedUsername}/summary`);
      return data.data as AgendaSummary;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: any) => {
      setResult(null);
      showDialog({
        title: "Busca indisponivel",
        message: error?.response?.data?.message ?? error?.message ?? "Nao foi possivel localizar essa agenda.",
        tone: "danger",
      });
    },
  });

  const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();

  const handleSearch = () => {
    if (!normalizedUsername) {
      showDialog({
        title: "Atencao",
        message: "Informe o username que voce quer abrir.",
      });
      return;
    }

    searchAgenda(normalizedUsername);
  };

  const canOpen = Boolean(result?.can_view);
  const statusLabel =
    result?.relationship === "public"
      ? "Agenda publica"
      : result?.relationship === "granted"
        ? "Compartilhada com voce"
        : result?.relationship === "owner"
          ? "Sua agenda"
          : "Agenda privada";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-gray-900">Abrir agenda</Text>
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
          <View className="mt-2 px-1 pb-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
                Agenda
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                Busque uma agenda por username
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Abra agendas publicas ou agendas que ja foram compartilhadas com voce.
              </Text>
            </View>

            <UserRoundSearch size={20} color="#7C3AED" />
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-gray-400">Username</Text>
          <View className="mt-4 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <Search size={20} color="#7C3AED" />
            <TextInput
              placeholder="Digite @username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              className="ml-3 flex-1 text-base font-medium text-gray-900"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            onPress={handleSearch}
            disabled={isPending}
            activeOpacity={0.88}
            className="mt-4 w-full items-center justify-center rounded-full py-4"
            style={{ backgroundColor: "#7C3AED", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-lg font-bold text-white">Buscar agenda</Text>
            )}
          </TouchableOpacity>
        </View>

          {result ? (
            <View className="mt-6 rounded-[28px] border border-violet-100 bg-violet-50/45 p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-600">Resultado</Text>
                <Text className="mt-3 text-2xl font-bold text-gray-900">{result.name}</Text>
                <Text className="mt-2 text-base font-medium text-gray-500">@{result.username}</Text>
              </View>

              {result.can_view ? (
                <Globe2 size={22} color="#7C3AED" />
              ) : (
                <Lock size={22} color="#6B7280" />
              )}
            </View>

            <View className="mt-4 self-start rounded-full border border-violet-200 bg-white px-3 py-2">
              <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {statusLabel}
              </Text>
            </View>

            <Text className="mt-4 text-sm leading-6 text-gray-600">
              {canOpen
                ? "Essa agenda pode ser aberta agora."
                : "Essa agenda nao esta disponivel para voce no momento."}
            </Text>

            <TouchableOpacity
              onPress={() => router.push(`/agenda/${result.username}`)}
              disabled={!canOpen}
              activeOpacity={0.88}
              className="mt-5 w-full items-center justify-center rounded-full py-4"
              style={{ backgroundColor: canOpen ? "#7C3AED" : "#E5E7EB" }}
            >
              <Text className="text-lg font-bold" style={{ color: canOpen ? "#FFFFFF" : "#6B7280" }}>
                Abrir agenda
              </Text>
            </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
