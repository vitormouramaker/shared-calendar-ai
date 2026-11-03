import { Tabs, useRouter } from "expo-router";
import { Calendar, User, Plus, LayoutDashboard, Sparkles } from "lucide-react-native";
import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReceivedInvites } from "../../src/hooks/useAccess";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: receivedInvites } = useReceivedInvites();
  const pendingInvitesCount = receivedInvites?.length ?? 0;

  const TAB_HEIGHT = 75;
  const TAB_PADDING_BOTTOM = 18;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#ECE7F6",
          height: TAB_HEIGHT + insets.bottom,
          paddingBottom: TAB_PADDING_BOTTOM + insets.bottom,
          paddingTop: 10,
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <LayoutDashboard color={color} size={26} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color }) => <Calendar color={color} size={26} />,
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ color }) => <Plus color={color} size={26} strokeWidth={2.5} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push({
              pathname: "/event/create",
              params: { fresh: String(Date.now()) },
            });
          },
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ color }) => <Sparkles color={color} size={26} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => (
            <View>
              <User color={color} size={26} />
              {pendingInvitesCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -8,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: "#DC2626",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {pendingInvitesCount > 9 ? "9+" : pendingInvitesCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
