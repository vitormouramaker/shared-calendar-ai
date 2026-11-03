import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  History,
  KeyRound,
  LogOut,
  Mail,
  Search,
  Tag,
  UserRound,
  Users,
  CalendarDays,
} from "lucide-react-native";
import { useProfile } from "../../src/hooks/useProfile";
import { useReceivedInvites } from "../../src/hooks/useAccess";
import { queryClient } from "../../src/lib/query-client";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import { useAuthStore } from "../../src/store/auth-store";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-400">
      {children}
    </Text>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast = false,
  badgeCount = 0,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
  badgeCount?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className={`flex-row items-center bg-white py-4 ${isLast ? "" : "border-b border-gray-100"}`}
    >
      <View className="w-7 items-start">{icon}</View>
      <View className="ml-2 flex-1 pr-4">
        <Text className="text-base font-bold text-gray-900">{title}</Text>
        <Text className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</Text>
      </View>
      {badgeCount > 0 ? (
        <View className="mr-3 rounded-full bg-red-600 px-2 py-1">
          <Text className="text-[10px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      ) : null}
      <ChevronRight size={20} color="#7C3AED" />
    </TouchableOpacity>
  );
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: receivedInvites } = useReceivedInvites();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const pendingInvitesCount = receivedInvites?.length ?? 0;

  const handleLogout = () => {
    showDialog({
      title: "Sair da conta",
      message: "Voce quer sair para testar o login novamente?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: () => {
        queryClient.clear();
        clearAuth();
        router.replace("/auth/login");
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Configurações</Text>
        <View className="h-6 w-6" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-1 pb-1 pt-2">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
            Calendo
          </Text>
          <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Ajuste o app do seu jeito
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500">
            Organize conta, agenda, compartilhamento, categorias e lembretes em
            um único lugar.
          </Text>
        </View>

        <View className="mt-6">
          <SectionTitle>Conta</SectionTitle>
          <View className="mt-3">
            <SettingRow
              icon={<UserRound size={20} color="#7C3AED" />}
              title="Perfil e privacidade"
              subtitle="Atualize foto, nome, username, e-mail e privacidade da agenda."
              onPress={() => router.push("/profile/edit")}
            />
            <SettingRow
              icon={<KeyRound size={20} color="#7C3AED" />}
              title="Recuperar senha"
              subtitle="Abra o fluxo de redefinição de senha do aplicativo."
              onPress={() => router.push("/auth/forgot-password")}
              isLast
            />
          </View>
        </View>

        <View className="mt-6">
          <SectionTitle>Agenda e lembretes</SectionTitle>
          <View className="mt-3">
            <SettingRow
              icon={<Bell size={20} color="#7C3AED" />}
              title="Lembretes e notificações"
              subtitle="Entenda como funcionam os avisos locais e as notificações push do app."
              onPress={() => router.push("/profile/notifications")}
            />
            <SettingRow
              icon={<History size={20} color="#7C3AED" />}
              title="Logs da agenda"
              subtitle="Veja o histórico de criação, edição, exclusão e compartilhamento da agenda."
              onPress={() => router.push("/agenda/logs")}
            />
            <SettingRow
              icon={<Tag size={20} color="#7C3AED" />}
              title="Categorias"
              subtitle="Cadastre as categorias personalizadas usadas nos seus eventos."
              onPress={() => router.push("/profile/categories")}
              isLast
            />
          </View>
        </View>

        <View className="mt-6">
          <SectionTitle>Compartilhamento</SectionTitle>
          <View className="mt-3">
            <SettingRow
              icon={<Search size={20} color="#7C3AED" />}
              title="Buscar agenda por username"
              subtitle="Abra agendas públicas ou agendas já compartilhadas com você."
              onPress={() => router.push("/agenda/open")}
            />
            <SettingRow
              icon={<Users size={20} color="#7C3AED" />}
              title="Usuários convidados"
              subtitle="Gerencie acessos ativos e convites enviados."
              onPress={() => router.push("/profile/access")}
            />
            <SettingRow
              icon={<Mail size={20} color="#7C3AED" />}
              title="Convites recebidos"
              subtitle="Aceite ou recuse pedidos de compartilhamento."
              onPress={() => router.push("/profile/received")}
              badgeCount={pendingInvitesCount}
            />
            <SettingRow
              icon={<CalendarDays size={20} color="#7C3AED" />}
              title="Compartilhadas comigo"
              subtitle="Acesse rapidamente as agendas que você pode acompanhar."
              onPress={() => router.push("/profile/shared")}
              isLast
            />
          </View>
        </View>

        <View className="mt-6">
          <SectionTitle>Sessão</SectionTitle>
          <View className="mt-3">
            <SettingRow
              icon={<LogOut size={20} color="#DC2626" />}
              title="Sair da conta"
              subtitle="Encerre sua sessão atual neste aparelho."
              onPress={handleLogout}
              isLast
            />
          </View>
        </View>

        {/* <View className="mt-6 border-t border-gray-100 pt-4">
          <Text className="text-sm leading-6 text-gray-500">
            Algumas configurações, como notificações push, dependem de build
            nativo instalado no aparelho.
          </Text>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}
