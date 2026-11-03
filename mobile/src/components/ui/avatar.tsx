import React from "react";
import { Image, Text, View } from "react-native";

interface AvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export function Avatar({
  name,
  avatarUrl,
  size = 56,
  backgroundColor = "rgba(255,255,255,0.15)",
  textColor = "#FFFFFF",
}: AvatarProps) {
  const initials = name?.trim().charAt(0).toUpperCase() ?? "?";

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor }}
    >
      <Text className="font-bold" style={{ color: textColor, fontSize: size * 0.42 }}>
        {initials}
      </Text>
    </View>
  );
}
