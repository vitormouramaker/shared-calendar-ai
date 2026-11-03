import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, Smartphone, Sparkles } from "lucide-react-native";
import {
  formatReminderSummary,
  REMINDER_OPTIONS,
} from "../../src/lib/event-reminders";
import { cancelAllEventRemindersAsync } from "../../src/lib/local-notifications";
import { useProfile, useUpdateProfile } from "../../src/hooks/useProfile";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

function ToggleRow({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="border-b border-gray-100 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center pr-4">
          <View className="w-7 items-start">{icon}</View>
          <Text className="ml-2 text-base font-bold text-gray-900">
            {title}
          </Text>
        </View>
        <Switch
          trackColor={{ false: "#D1D5DB", true: "#C4B5FD" }}
          thumbColor={value ? "#7C3AED" : "#FFFFFF"}
          value={value}
          onValueChange={onValueChange}
        />
      </View>
      <Text className="mt-3 text-sm leading-6 text-gray-500">
        {description}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [notifyEventReminders, setNotifyEventReminders] = useState(true);
  const [notifyShareUpdates, setNotifyShareUpdates] = useState(true);
  const [notifyPushEnabled, setNotifyPushEnabled] = useState(true);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setNotifyEventReminders(profile.notify_event_reminders);
    setNotifyShareUpdates(profile.notify_share_updates);
    setNotifyPushEnabled(profile.notify_push_enabled);
  }, [profile]);

  const handleSave = () => {
    updateProfile(
      {
        notify_event_reminders: notifyEventReminders,
        notify_share_updates: notifyShareUpdates,
        notify_push_enabled: notifyPushEnabled,
      },
      {
        onSuccess: async () => {
          if (!notifyEventReminders) {
            await cancelAllEventRemindersAsync();
          }

          showDialog({
            title: "Preferencias salvas",
            message: "Suas notificacoes foram atualizadas.",
            tone: "success",
          });
        },
        onError: (error: any) => {
          showDialog({
            title: "Erro",
            message:
              error?.message ??
              "Nao foi possivel salvar as preferencias agora.",
            tone: "danger",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Lembretes e notificações
        </Text>
        <View className="h-6 w-6" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-1 pb-1 pt-2">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
            Avisos
          </Text>
          <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Escolha o que você quer receber
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500">
            Controle lembretes locais de eventos e os avisos de compartilhamento
            da sua agenda.
          </Text>
        </View>

        <View className="mt-6">
          <ToggleRow
            icon={<Bell size={20} color="#7C3AED" />}
            title="Lembretes por evento"
            description={`Ao criar ou editar um evento, você pode escolher entre ${REMINDER_OPTIONS.map((option) => formatReminderSummary(option.value)).join(", ")}.`}
            value={notifyEventReminders}
            onValueChange={setNotifyEventReminders}
          />
          <ToggleRow
            icon={<Smartphone size={20} color="#7C3AED" />}
            title="Atualizações de compartilhamento"
            description="Receba avisos quando enviarem, aceitarem, recusarem ou revogarem convites da agenda."
            value={notifyShareUpdates}
            onValueChange={setNotifyShareUpdates}
          />
          <ToggleRow
            icon={<Sparkles size={20} color="#7C3AED" />}
            title="Push do aplicativo"
            description="Habilita o registro do aparelho para push em builds nativos com Firebase/APNs configurados."
            value={notifyPushEnabled}
            onValueChange={setNotifyPushEnabled}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          className="mt-8 items-center justify-center rounded-full py-4"
          style={{ backgroundColor: "#7C3AED", opacity: isPending ? 0.7 : 1 }}
          activeOpacity={0.88}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-bold text-white">
              Salvar preferências
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
