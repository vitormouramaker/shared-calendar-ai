import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_SEEN_KEY = "@calendo/onboarding_seen";

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}

export async function hasSeenOnboarding() {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return value === "true";
}
