import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Bell, CheckCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "../src/hooks/useNotifications";

type Tab = "unread" | "read";

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const isUnread = !item.read_at;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: isUnread ? "#FAF8FF" : "#fff",
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          backgroundColor: isUnread ? "#EDE9FE" : "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        <Bell size={18} color={isUnread ? "#7C3AED" : "#9CA3AF"} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: isUnread ? "700" : "500",
            color: "#111827",
            marginBottom: 2,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          style={{ fontSize: 13, color: "#6B7280", lineHeight: 18 }}
          numberOfLines={3}
        >
          {item.body}
        </Text>
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          {formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </Text>
      </View>

      {isUnread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: "#7C3AED",
            marginTop: 6,
            marginLeft: 8,
            flexShrink: 0,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
        {tab === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação lida"}
      </Text>
      <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 6, lineHeight: 20 }}>
        {tab === "unread"
          ? "Você está em dia! Novas notificações aparecerão aqui."
          : "As notificações que você visualizou aparecem aqui."}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("unread");
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = (notifications ?? []).filter((n) => !n.read_at);
  const read = (notifications ?? []).filter((n) => !!n.read_at);
  const displayed = activeTab === "unread" ? unread : read;

  function handlePress(item: AppNotification) {
    if (!item.read_at) {
      markRead.mutate(item.id);
    }
    if (item.route) {
      router.push(item.route as never);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
          Notificações
        </Text>

        {unread.length > 0 ? (
          <TouchableOpacity
            onPress={() => markAllRead.mutate()}
            activeOpacity={0.7}
            disabled={markAllRead.isPending}
          >
            <CheckCheck size={22} color="#7C3AED" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
          backgroundColor: "#fff",
        }}
      >
        {(["unread", "read"] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "unread" ? "Não lidas" : "Lidas";
          const count = tab === "unread" ? unread.length : read.length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: isActive ? "#7C3AED" : "transparent",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#7C3AED" : "#6B7280",
                  }}
                >
                  {label}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: isActive ? "#7C3AED" : "#E5E7EB",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: isActive ? "#fff" : "#6B7280",
                      }}
                    >
                      {count > 99 ? "99+" : count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {displayed.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            displayed.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onPress={() => handlePress(item)}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
