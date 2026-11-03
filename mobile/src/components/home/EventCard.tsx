import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  Bell,
  CalendarDays,
  Clock3,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { getAppNow, toAppTime } from "../../lib/app-time";

const DESCRIPTION_LIMIT = 110;

function truncateDescription(description?: string) {
  if (!description?.trim()) {
    return null;
  }

  const normalized = description.trim();
  if (normalized.length <= DESCRIPTION_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, DESCRIPTION_LIMIT).trimEnd()}...`;
}

function formatRemainingLabel(startTime: string, now: number) {
  const diffMs = toAppTime(startTime).getTime() - now;

  if (Number.isNaN(diffMs)) {
    return null;
  }

  if (diffMs <= 0) {
    return "Agora";
  }

  let totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return `Em ${parts.join(" ")}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

interface EventCardProps {
  title: string;
  time: string;
  dateRange?: string;
  startTime: string;
  categoryLineColor: string;
  description?: string;
  category?: string;
  reminderText?: string | null;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  variant?: "card" | "list";
  isLast?: boolean;
}

export function EventCard({
  title,
  time,
  dateRange,
  startTime,
  categoryLineColor,
  description,
  category,
  reminderText,
  onPress,
  onEdit,
  onDelete,
  variant = "card",
  isLast = false,
}: EventCardProps) {
  const [now, setNow] = useState(getAppNow().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getAppNow().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const truncatedDescription = useMemo(
    () => truncateDescription(description),
    [description]
  );
  const remainingLabel = useMemo(
    () => formatRemainingLabel(startTime, now),
    [startTime, now]
  );
  const hasActions = Boolean(onEdit || onDelete);
  const isList = variant === "list";
  const reminderLabel = reminderText ?? "Sem lembrete";
  const containerClassName = isList
    ? `mb-3 overflow-hidden rounded-[28px] border border-gray-200 bg-white ${isLast ? "" : ""}`
    : "mb-4 overflow-hidden rounded-[28px] border border-gray-200 bg-white";
  const sectionPadding = isList ? "px-5" : "px-5";
  const headerTint = useMemo(
    () => hexToRgba(categoryLineColor, 0.13),
    [categoryLineColor]
  );

  return (
    <View className={containerClassName}>
      <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
        <View
          className={`${sectionPadding} py-5`}
          style={{ backgroundColor: headerTint }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold leading-tight text-gray-900">
                {title}
              </Text>
            </View>

            <View className="items-end gap-2">
              {category ? (
                <View className="rounded-full bg-white px-3 py-2">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-gray-700">
                    {category}
                  </Text>
                </View>
              ) : null}

              {remainingLabel ? (
                <View className="rounded-full bg-white px-3 py-2">
                  <Text
                    className="text-xs font-bold uppercase tracking-[1px]"
                    style={{ color: categoryLineColor }}
                  >
                    {remainingLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="border-t border-gray-100" />

        <View className={`${sectionPadding} py-4`}>
          {dateRange ? (
            <View className="flex-row items-center py-1.5">
              <CalendarDays size={16} color="#7C3AED" />
              <Text className="ml-3 text-sm font-semibold text-gray-700">
                {dateRange}
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center py-1.5">
            <Clock3 size={16} color="#7C3AED" />
            <Text className="ml-3 text-sm font-semibold text-gray-700">
              {time}
            </Text>
          </View>

          {truncatedDescription ? (
            <Text className="mt-3 text-sm leading-6 text-gray-500">
              {truncatedDescription}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View className="border-t border-gray-100" />

      <View className={`${sectionPadding} py-4`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center pr-4">
            <Bell size={16} color="#7C3AED" />
            <Text className="ml-3 text-sm font-semibold text-gray-600">
              {reminderLabel}
            </Text>
          </View>
        </View>

        {hasActions ? (
          <View className="mt-4 flex-row gap-3">
            {onEdit ? (
              <TouchableOpacity
                onPress={onEdit}
                activeOpacity={0.88}
                className="flex-1 flex-row items-center justify-center rounded-full border border-violet-700 bg-violet-700 px-4 py-3"
              >
                <Pencil size={15} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Editar
                </Text>
              </TouchableOpacity>
            ) : null}

            {onDelete ? (
              <TouchableOpacity
                onPress={onDelete}
                activeOpacity={0.88}
                className="flex-1 flex-row items-center justify-center rounded-full border border-red-600 bg-red-600 px-4 py-3"
              >
                <Trash2 size={15} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Apagar
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
