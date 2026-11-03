import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AtSign, ChevronLeft, Mail, UserRound } from "lucide-react-native";
import { useProfile } from "../../src/hooks/useProfile";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="border-b border-gray-100 py-4">
      <View className="flex-row items-center">
        <View className="w-7 items-start">{icon}</View>
        <Text className="ml-2 text-xs font-bold uppercase tracking-[1.5px] text-gray-400">
          {label}
        </Text>
      </View>
      <Text className="mt-3 text-base font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

export default function ContactScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Contato da conta</Text>
        <View className="h-6 w-6" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-1 pb-1 pt-2">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
            Conta
          </Text>
          <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Seus dados de contato
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500">
            Consulte o e-mail principal e o username usados para acesso e compartilhamento.
          </Text>
        </View>

        <View className="mt-6">
          <InfoRow
            icon={<UserRound size={20} color="#7C3AED" />}
            label="Nome"
            value={profile?.name ?? "Nao disponivel"}
          />
          <InfoRow
            icon={<AtSign size={20} color="#7C3AED" />}
            label="Username"
            value={profile?.username ? `@${profile.username}` : "Nao disponivel"}
          />
          <InfoRow
            icon={<Mail size={20} color="#7C3AED" />}
            label="E-mail"
            value={profile?.email ?? "Nao disponivel"}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/profile/edit")}
          className="mt-8 items-center justify-center rounded-full py-4"
          style={{ backgroundColor: "#7C3AED" }}
          activeOpacity={0.88}
        >
          <Text className="text-base font-bold text-white">Editar dados da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
