import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const PUSH_CHANNEL_ID = "social-updates-v1";
const PUSH_REGISTRATION_STORAGE_KEY = "@calendo/push_registration";

type StoredPushRegistration = {
  expo_push_token: string;
  user_id: number;
};

export async function ensurePushNotificationsSetupAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: "Atualizacoes da agenda",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: "#7C3AED",
  });
}

function resolveProjectId() {
  const easProjectId =
    Constants.easConfig?.projectId ??
    ((Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      null);

  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID || easProjectId;
}

export async function registerDevicePushTokenAsync() {
  await ensurePushNotificationsSetupAsync();

  if (!Device.isDevice) {
    console.warn("[push] push notifications require a physical device");
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    console.warn("[push] notification permission denied");
    return null;
  }

  const projectId = resolveProjectId();

  if (!projectId) {
    console.warn("[push] missing EAS project id for Expo push token registration");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  return {
    expo_push_token: token.data,
    platform: Platform.OS,
    device_name: Device.modelName ?? "Dispositivo",
  };
}

export async function readStoredPushRegistrationAsync(): Promise<StoredPushRegistration | null> {
  const rawValue = await AsyncStorage.getItem(PUSH_REGISTRATION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredPushRegistration;
  } catch {
    return null;
  }
}

export async function saveStoredPushRegistrationAsync(registration: StoredPushRegistration) {
  await AsyncStorage.setItem(PUSH_REGISTRATION_STORAGE_KEY, JSON.stringify(registration));
}

export async function clearStoredPushRegistrationAsync() {
  await AsyncStorage.removeItem(PUSH_REGISTRATION_STORAGE_KEY);
}
