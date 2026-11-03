import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { ptBR } from "date-fns/locale";
import { Platform } from "react-native";
import { formatAppDate } from "./app-time";
import { formatReminderSummary } from "./event-reminders";

const ANDROID_CHANNEL_ID = "event-reminders-v2";
const EVENT_REMINDER_STORAGE_KEY = "@calendo/event_reminders";
const MINIMUM_TRIGGER_DELAY_MS = 5_000;

type ReminderMap = Record<string, string>;

type ReminderEvent = {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  remind_me: boolean;
  remind_before_minutes?: number;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureLocalNotificationsSetupAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Lembretes de eventos",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: "#7C3AED",
  });
}

export async function ensureLocalNotificationPermissionsAsync() {
  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;

  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  return finalStatus === "granted";
}

export async function scheduleEventReminderAsync(event: ReminderEvent) {
  if (!event.remind_me) {
    return null;
  }

  const startDate = new Date(event.start_time);

  if (Number.isNaN(startDate.getTime())) {
    console.warn("[notifications] invalid event start time", {
      eventId: event.id,
      start_time: event.start_time,
    });
    return null;
  }

  await ensureLocalNotificationsSetupAsync();

  const hasPermission = await ensureLocalNotificationPermissionsAsync();

  if (!hasPermission) {
    console.warn("[notifications] local notification permission denied", {
      eventId: event.id,
    });
    return null;
  }

  await cancelEventReminderAsync(event.id);

  const now = Date.now();
  const eventStartMs = startDate.getTime();
  const reminderOffsetMinutes = event.remind_before_minutes ?? 15;

  if (eventStartMs <= now + MINIMUM_TRIGGER_DELAY_MS) {
    console.warn("[notifications] event starts too soon for reminder", {
      eventId: event.id,
      start_time: event.start_time,
    });
    return null;
  }

  const desiredTriggerMs = eventStartMs - reminderOffsetMinutes * 60 * 1000;
  const triggerDate = new Date(
    desiredTriggerMs > now ? desiredTriggerMs : now + MINIMUM_TRIGGER_DELAY_MS
  );

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Lembrete: ${event.title}`,
      body:
        event.description?.trim() ||
        `${formatReminderSummary(reminderOffsetMinutes)}. Seu evento comeca ${formatAppDate(startDate, "EEEE 'as' HH:mm", { locale: ptBR })}.`,
      sound: true,
      data: {
        eventId: event.id,
        startTime: event.start_time,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  await saveReminderIdentifierAsync(event.id, identifier);

  console.log("[notifications] event reminder scheduled", {
    eventId: event.id,
    identifier,
    triggerAt: triggerDate.toISOString(),
    remindBeforeMinutes: reminderOffsetMinutes,
  });

  return identifier;
}

export async function cancelEventReminderAsync(eventId: number) {
  const reminders = await readReminderMapAsync();
  const storedIdentifier = reminders[String(eventId)];

  if (!storedIdentifier) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(storedIdentifier);
  delete reminders[String(eventId)];
  await AsyncStorage.setItem(EVENT_REMINDER_STORAGE_KEY, JSON.stringify(reminders));

  console.log("[notifications] event reminder cancelled", {
    eventId,
    identifier: storedIdentifier,
  });
}

export async function cancelAllEventRemindersAsync() {
  const reminders = await readReminderMapAsync();
  const identifiers = Object.values(reminders);

  await Promise.all(
    identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier))
  );

  await AsyncStorage.removeItem(EVENT_REMINDER_STORAGE_KEY);

  console.log("[notifications] all event reminders cancelled", {
    count: identifiers.length,
  });
}

async function saveReminderIdentifierAsync(eventId: number, identifier: string) {
  const reminders = await readReminderMapAsync();
  reminders[String(eventId)] = identifier;
  await AsyncStorage.setItem(EVENT_REMINDER_STORAGE_KEY, JSON.stringify(reminders));
}

async function readReminderMapAsync(): Promise<ReminderMap> {
  const rawValue = await AsyncStorage.getItem(EVENT_REMINDER_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ReminderMap;
    return parsedValue ?? {};
  } catch {
    return {};
  }
}
