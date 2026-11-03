import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/store/auth-store";
import { hasSeenOnboarding } from "../src/lib/onboarding";

export default function InitialRoute() {
  const token = useAuthStore((s) => s.token);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {
    hasSeenOnboarding()
      .then((seen) => {
        setSeenOnboarding(seen);
      })
      .finally(() => {
        setCheckedOnboarding(true);
      });
  }, []);

  if (!checkedOnboarding) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7C3AED" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={seenOnboarding ? "/auth/login" : "/onboarding"} />;
}
