import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Copy, Mail, CalendarDays, Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useProfile } from "../../src/hooks/useProfile";
import { useReceivedInvites } from "../../src/hooks/useAccess";
import { formatAppDate } from "../../src/lib/app-time";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import { Avatar } from "../../src/components/ui/avatar";

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-start py-4 ${isLast ? "" : "border-b border-gray-100"}`}
    >
      <View className="w-7 items-start pt-0.5">{icon}</View>
      <View className="ml-2 flex-1">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-400">
          {label}
        </Text>
        <Text className="mt-2 text-sm font-semibold leading-6 text-gray-800">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: receivedInvites } = useReceivedInvites();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const pendingInvitesCount = receivedInvites?.length ?? 0;
  const [copyToastVisible, setCopyToastVisible] = React.useState(false);
  const copyToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  const handleCopyUsername = async () => {
    if (!profile?.username) return;

    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(profile.username);
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
      }
      setCopyToastVisible(true);
      copyToastTimerRef.current = setTimeout(() => {
        setCopyToastVisible(false);
      }, 1600);
    } catch {
      showDialog({
        title: "Rebuild necessario",
        message:
          "Atualize o development build para habilitar a copia do nome de usuario.",
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const agendaVisibility = profile?.is_private
    ? "Agenda privada"
    : "Agenda publica";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-end px-6 pt-6 pb-4">
        <TouchableOpacity
          onPress={() => router.push("/profile/settings")}
          activeOpacity={0.88}
          className="p-1"
        >
          <View>
            <Settings size={22} color="#7C3AED" />
            {pendingInvitesCount > 0 ? (
              <View className="absolute -right-2 -top-2 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1">
                <Text className="text-[10px] font-bold text-white">
                  {pendingInvitesCount > 9 ? "9+" : pendingInvitesCount}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-1 pb-1 pt-2">
          <View className="mt-3 flex-row items-center">
            <Avatar
              name={profile?.name}
              avatarUrl={profile?.avatar_url}
              size={56}
              backgroundColor="#F3E8FF"
              textColor="#7C3AED"
            />
            <View className="ml-4 flex-1">
              <Text className="text-3xl font-bold leading-tight text-gray-900">
                {profile?.name}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-500">
                @{profile?.username}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => void handleCopyUsername()}
              activeOpacity={0.88}
              className="flex-row items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2"
            >
              <Copy size={13} color="#7C3AED" />
              <Text className="ml-2 text-xs font-bold uppercase tracking-[1px] text-violet-700">
                @{profile?.username}
              </Text>
            </TouchableOpacity>

            <View className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2">
              <Text className="text-xs font-bold uppercase tracking-[1px] text-violet-700">
                {agendaVisibility}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <InfoRow
            icon={<Mail size={19} color="#7C3AED" />}
            label="Contato"
            value={profile?.email ?? "-"}
          />
          <InfoRow
            icon={<CalendarDays size={19} color="#7C3AED" />}
            label="Desde"
            value={
              profile?.created_at
                ? formatAppDate(profile.created_at, "MMMM yyyy")
                : "Conta ativa"
            }
            isLast
          />
        </View>
      </ScrollView>

      {copyToastVisible ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-20 z-50 items-center px-6"
        >
          <View className="rounded-full bg-gray-900 px-4 py-2">
            <Text className="text-xs font-bold text-white">Username copiado</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
