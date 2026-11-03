import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Link2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSharedWithMe } from "../../src/hooks/useAccess";
import { getAppNow, toAppTime } from "../../src/lib/app-time";
import { Avatar } from "../../src/components/ui/avatar";

function EmptyState() {
  return (
    <View className="mt-6 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
      <Text className="text-base font-bold text-gray-900">Nada compartilhado ainda</Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500">
        Assim que algum convite for aceito, a agenda da pessoa vai aparecer aqui para voce abrir direto.
      </Text>
    </View>
  );
}

export default function SharedWithMeScreen() {
  const router = useRouter();
  const { data: owners, isLoading } = useSharedWithMe();
  const sharedOwners = owners ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Compartilhadas comigo</Text>
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
                Compartilhamento
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
                Agendas que voce pode acompanhar
              </Text>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                Abra rapidamente as agendas liberadas para voce e acompanhe os compromissos de cada pessoa.
              </Text>
            </View>

            <Link2 size={22} color="#7C3AED" />
          </View>
          <View className="mt-5 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
              {sharedOwners.length} acesso{sharedOwners.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" className="mt-10" />
        ) : sharedOwners.length > 0 ? (
          <View className="mt-6">
            {sharedOwners.map((owner) => (
              <TouchableOpacity
                key={owner.id}
                activeOpacity={0.88}
                onPress={() => router.push(`/agenda/${owner.username}`)}
                className="mb-3 rounded-[28px] border border-violet-100 bg-violet-50/55 p-5"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <View className="flex-row items-center">
                      <Avatar
                        name={owner.name}
                        avatarUrl={owner.avatar_url}
                        size={48}
                        backgroundColor="#FFFFFF"
                        textColor="#7C3AED"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-lg font-bold text-gray-900">{owner.name}</Text>
                        <Text className="mt-1 text-sm font-medium text-gray-500">@{owner.username}</Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <View className="flex-row items-center rounded-full border border-violet-200 bg-white px-3 py-2">
                        <CalendarDays size={14} color="#7C3AED" />
                        <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                          Abrir agenda
                        </Text>
                      </View>
                      <View className="rounded-full border border-violet-200 bg-white px-3 py-2">
                        <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                          {owner.permission_level === "edit" ? "Pode editar" : "Apenas ver"}
                        </Text>
                      </View>

                      <View className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-2">
                        <Clock size={12} color={owner.is_permanent ? "#10B981" : "#F59E0B"} />
                        <Text className={`ml-2 text-xs font-semibold ${owner.is_permanent ? "text-emerald-600" : "text-amber-600"}`}>
                          {owner.is_permanent
                            ? "Permanente"
                            : owner.expires_at
                              ? `Expira ${formatDistance(toAppTime(owner.expires_at), getAppNow(), { addSuffix: true, locale: ptBR })}`
                              : "Temporario"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <ChevronRight size={18} color="#7C3AED" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
