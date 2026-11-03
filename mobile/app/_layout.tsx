import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Alert, useColorScheme } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/query-client";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";
import { AppDialog } from "../src/components/ui/app-dialog";
import { ensureLocalNotificationsSetupAsync } from "../src/lib/local-notifications";
import {
  clearStoredPushRegistrationAsync,
  ensurePushNotificationsSetupAsync,
  readStoredPushRegistrationAsync,
  registerDevicePushTokenAsync,
  saveStoredPushRegistrationAsync,
} from "../src/lib/push-notifications";
import { useAppDialogStore } from "../src/store/app-dialog-store";
import { useAuthStore } from "../src/store/auth-store";
import { api } from "../src/lib/axios";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logoutReason = useAuthStore((state) => state.logoutReason);
  const clearLogoutReason = useAuthStore((state) => state.clearLogoutReason);
  const previousAuthRef = useRef<{ token: string | null; userId: number | null }>({
    token: null,
    userId: null,
  });

  const [loaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (loaded || fontError) {
      if (fontError) {
        console.warn("[fonts] failed to load custom fonts, continuing with fallback fonts", {
          message: fontError.message,
        });
      }

      SplashScreen.hideAsync();
    }
  }, [fontError, loaded]);

  useEffect(() => {
    ensureLocalNotificationsSetupAsync().catch((error) => {
      console.warn("[notifications] failed to initialize local notifications", error);
    });
    ensurePushNotificationsSetupAsync().catch((error) => {
      console.warn("[push] failed to initialize push notifications", error);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncPushRegistration() {
      const previousToken = previousAuthRef.current.token;
      const previousUserId = previousAuthRef.current.userId;

      if (token && user?.id && user.notify_push_enabled !== false) {
        try {
          const registration = await registerDevicePushTokenAsync();

          if (!registration || !isMounted) {
            previousAuthRef.current = { token, userId: user.id };
            return;
          }

          await api.post("/users/me/push-tokens", registration);
          await saveStoredPushRegistrationAsync({
            expo_push_token: registration.expo_push_token,
            user_id: user.id,
          });
        } catch (error) {
          console.warn("[push] failed to sync device push token", error);
        }

        previousAuthRef.current = { token, userId: user.id };
        return;
      }

      if ((!token || user?.notify_push_enabled === false) && previousToken && previousUserId) {
        try {
          const storedRegistration = await readStoredPushRegistrationAsync();

          if (storedRegistration?.expo_push_token) {
            await api.delete("/users/me/push-tokens", {
              data: {
                expo_push_token: storedRegistration.expo_push_token,
              },
              headers: {
                Authorization: `Bearer ${previousToken}`,
              },
            });
          }
        } catch (error) {
          console.warn("[push] failed to unregister device push token", error);
        } finally {
          await clearStoredPushRegistrationAsync();
        }
      }

      previousAuthRef.current = { token: null, userId: null };
    }

    syncPushRegistration();

    return () => {
      isMounted = false;
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!loaded && !fontError) {
      return;
    }

    const normalizedSegments = [...segments] as string[];
    const firstSegment = normalizedSegments[0];
    const secondSegment = normalizedSegments[1];
    const isProtectedRoute =
      firstSegment === "(tabs)" ||
      firstSegment === "event" ||
      firstSegment === "profile" ||
      firstSegment === "assistant";

    if (!token && isProtectedRoute) {
      router.replace("/auth/login");
      return;
    }

    if (token && firstSegment === "auth" && secondSegment !== "forgot-password") {
      router.replace("/(tabs)");
      return;
    }

    if (token && (firstSegment === "onboarding" || normalizedSegments.length === 0)) {
      router.replace("/(tabs)");
    }
  }, [loaded, router, segments, token]);

  useEffect(() => {
    if (!logoutReason) {
      return;
    }

    showDialog({
      title: "Sessao encerrada",
      message: logoutReason,
      confirmText: "Entrar novamente",
      onConfirm: () => {
        clearLogoutReason();
        router.replace("/auth/login");
      },
    });
  }, [clearLogoutReason, logoutReason, router, showDialog]);

  useEffect(() => {
    const originalAlert = Alert.alert;
    const originalGlobalAlert = globalThis.alert;

    Alert.alert = (title, message, buttons) => {
      const normalizedButtons = buttons?.length ? buttons : [{ text: "OK" }];
      const cancelButton = normalizedButtons.find((button) => button.style === "cancel");
      const confirmButton =
        [...normalizedButtons].reverse().find((button) => button.style !== "cancel") ??
        normalizedButtons[0];

      showDialog({
        title: title ?? "Aviso",
        message: message ?? "",
        confirmText: confirmButton?.text ?? "OK",
        cancelText: cancelButton?.text,
        tone: confirmButton?.style === "destructive" ? "danger" : "primary",
        onConfirm: () => {
          confirmButton?.onPress?.();
        },
        onCancel: () => {
          cancelButton?.onPress?.();
        },
      });
    };

    globalThis.alert = (message?: string) => {
      showDialog({
        title: "Aviso",
        message: message ?? "",
      });
    };

    return () => {
      Alert.alert = originalAlert;
      globalThis.alert = originalGlobalAlert;
    };
  }, [showDialog]);

  if (!loaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen
              name="auth/forgot-password"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="auth/register"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen
              name="event/create"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="event/schedule"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="event/[id]"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen name="profile/access" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile/edit"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/settings"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/contact"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/notifications"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/categories"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/received"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/shared"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="profile/invite"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="agenda/open"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="agenda/logs"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="agenda/[username]"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="assistant"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
          </Stack>
          <AppDialog />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
