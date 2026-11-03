import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addDays,
  addMinutes,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceStrict,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
} from "lucide-react-native";
import { getAppNow, startOfAppToday } from "../../src/lib/app-time";
import { useEventDraftStore } from "../../src/store/event-draft-store";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 15, 30, 45];
const DURATION_PRESETS = [30, 60, 90, 120];
const DOUBLE_TAP_DELAY_MS = 160;

function buildMonthDays(monthCursor: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 0 }),
  });
}

function formatNumber(value: number) {
  return String(value).padStart(2, "0");
}

function setDateTimeParts(baseDate: Date, referenceDate: Date) {
  const next = new Date(baseDate);
  next.setHours(referenceDate.getHours(), referenceDate.getMinutes(), 0, 0);
  return next;
}

function updateTime(baseDate: Date, unit: "hour" | "minute", value: number) {
  const next = new Date(baseDate);
  if (unit === "hour") next.setHours(value, next.getMinutes(), 0, 0);
  else next.setMinutes(value, 0, 0);
  return next;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${formatNumber(rest)}`;
}

function getRangePreview(start: Date, end: Date) {
  const today = startOfAppToday();
  const tomorrow = addDays(today, 1);
  const appNow = getAppNow();

  const startPrefix = isSameDay(start, today)
    ? `Começa hoje às ${format(start, "HH:mm")}`
    : isSameDay(start, tomorrow)
      ? `Começa amanhã às ${format(start, "HH:mm")}`
      : `Começa em ${formatDistanceStrict(start, appNow, { locale: ptBR })}`;

  const endPrefix = isSameDay(end, today)
    ? `termina hoje às ${format(end, "HH:mm")}`
    : isSameDay(end, tomorrow)
      ? `termina amanhã às ${format(end, "HH:mm")}`
      : `termina em ${formatDistanceStrict(end, appNow, { locale: ptBR })}`;

  return `${startPrefix} • ${endPrefix}`;
}

async function triggerHaptic(style: "soft" | "selection" | "success") {
  try {
    if (style === "soft") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (style === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    await Haptics.selectionAsync();
  } catch {
    // Ignore haptic failures on unsupported devices.
  }
}

function roundUpToQuarter(date: Date) {
  const next = new Date(date);
  const remainder = next.getMinutes() % 15;

  next.setSeconds(0, 0);

  if (remainder !== 0) {
    next.setMinutes(next.getMinutes() + (15 - remainder));
  }

  return next;
}

function getMinimumSelectableMoment() {
  return roundUpToQuarter(getAppNow());
}

function isDaySelectable(day: Date) {
  const minimumMoment = getMinimumSelectableMoment();
  return startOfDay(day).getTime() >= startOfDay(minimumMoment).getTime();
}

function clampToMinimumMoment(candidate: Date) {
  const minimumMoment = getMinimumSelectableMoment();

  if (!isSameDay(candidate, minimumMoment)) {
    return candidate;
  }

  if (isBefore(candidate, minimumMoment)) {
    return minimumMoment;
  }

  return candidate;
}

function ensureEndAfterStart(candidateEnd: Date, start: Date) {
  if (isAfter(candidateEnd, start)) {
    return candidateEnd;
  }

  return addMinutes(start, 15);
}

function getLaterDate(first: Date, second: Date) {
  return isAfter(first, second) ? first : second;
}

interface ChipButtonProps {
  active?: boolean;
  label: string;
  onPress: () => void;
}

function ChipButton({ active = false, label, onPress }: ChipButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: active ? "#6D28D9" : "#F3F4F6" }}
    >
      <Text
        className={`font-semibold ${active ? "text-white" : "text-gray-700"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface TimeCardProps {
  accentColor: string;
  label: string;
  value: Date;
  active?: boolean;
  isHourDisabled?: (hour: number) => boolean;
  isMinuteDisabled?: (minute: number) => boolean;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

function TimeCard({
  accentColor,
  label,
  value,
  active = false,
  isHourDisabled,
  isMinuteDisabled,
  onHourChange,
  onMinuteChange,
}: TimeCardProps) {
  return (
    <View
      className="rounded-[24px] border bg-[#F8FAFC] p-4"
      style={{
        borderColor: active ? accentColor : "#F3F4F6",
        borderWidth: active ? 2 : 1,
      }}
    >
      <View className="flex-row items-center">
        <Clock3 size={18} color={accentColor} />
        <View className="ml-3">
          <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-gray-400">
            {label}
          </Text>
          <Text className="text-2xl font-bold text-gray-900">
            {format(value, "HH:mm")}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
          Hora
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View className="flex-row gap-2">
            {HOURS.map((hour) => {
              const isActive = value.getHours() === hour;
              const disabled = isHourDisabled?.(hour) ?? false;
              return (
                <TouchableOpacity
                  key={`${label}-hour-${hour}`}
                  onPress={() => {
                    if (!disabled) {
                      onHourChange(hour);
                    }
                  }}
                  disabled={disabled}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: isActive ? accentColor : "#FFFFFF",
                    opacity: disabled && !isActive ? 0.35 : 1,
                  }}
                >
                  <Text
                    className={`font-semibold ${isActive ? "text-white" : "text-gray-700"}`}
                  >
                    {formatNumber(hour)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
          Minutos
        </Text>
        <View className="flex-row gap-2">
          {MINUTES.map((minute) => {
            const isActive = value.getMinutes() === minute;
            const disabled = isMinuteDisabled?.(minute) ?? false;
            return (
              <TouchableOpacity
                key={`${label}-minute-${minute}`}
                onPress={() => {
                  if (!disabled) {
                    onMinuteChange(minute);
                  }
                }}
                disabled={disabled}
                className="flex-1 items-center rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: isActive ? accentColor : "#FFFFFF",
                  opacity: disabled && !isActive ? 0.35 : 1,
                }}
              >
                <Text
                  className={`font-semibold ${isActive ? "text-white" : "text-gray-700"}`}
                >
                  {formatNumber(minute)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function ScheduleEventScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const {
    initialized,
    selectedStart,
    selectedEnd,
    setSchedule,
    initializeDraft,
  } = useEventDraftStore();
  const [draftStart, setDraftStart] = useState(selectedStart);
  const [draftEnd, setDraftEnd] = useState(selectedEnd);
  const [monthCursor, setMonthCursor] = useState(selectedStart);
  const [editingBoundary, setEditingBoundary] = useState<"start" | "end">(
    "start"
  );
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragBoundary, setDragBoundary] = useState<"start" | "end" | null>(
    null
  );
  const calendarOpacity = useRef(new Animated.Value(1)).current;
  const calendarTranslateX = useRef(new Animated.Value(0)).current;
  const startHandleScale = useRef(new Animated.Value(1)).current;
  const endHandleScale = useRef(new Animated.Value(1)).current;
  const startLabelOpacity = useRef(new Animated.Value(1)).current;
  const endLabelOpacity = useRef(new Animated.Value(1)).current;
  const startLabelTranslateY = useRef(new Animated.Value(0)).current;
  const endLabelTranslateY = useRef(new Animated.Value(0)).current;
  const previousStartRef = useRef(startOfDay(selectedStart).getTime());
  const previousEndRef = useRef(startOfDay(selectedEnd).getTime());
  const previousStartDateTimeRef = useRef(selectedStart.getTime());
  const previousEndDateTimeRef = useRef(selectedEnd.getTime());
  const calendarGridLayoutRef = useRef({ width: 0, height: 0 });
  const dragAnchorRef = useRef<Date | null>(null);
  const dragLastDayKeyRef = useRef<string | null>(null);
  const ignoreNextTapRef = useRef(false);
  const lastTapRef = useRef<{ dayKey: string; at: number } | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationMinutes = Math.max(
    15,
    differenceInMinutes(draftEnd, draftStart)
  );

  useEffect(() => {
    if (!initialized) {
      initializeDraft();
      return;
    }

    setDraftStart(selectedStart);
    setDraftEnd(selectedEnd);
    setMonthCursor(selectedStart);
  }, [initialized, initializeDraft, selectedStart, selectedEnd]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const normalizedStart = applyStartCandidate(draftStart);
    const normalizedEnd = normalizedStart
      ? applyEndCandidate(draftEnd, normalizedStart)
      : null;

    if (
      normalizedStart &&
      normalizedEnd &&
      (normalizedStart.getTime() !== draftStart.getTime() ||
        normalizedEnd.getTime() !== draftEnd.getTime())
    ) {
      setDraftStart(normalizedStart);
      setDraftEnd(normalizedEnd);
    }
  }, [draftEnd, draftStart, initialized]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const animateCalendarMonth = (direction: "previous" | "next") => {
    calendarOpacity.setValue(0.35);
    calendarTranslateX.setValue(direction === "next" ? 18 : -18);

    Animated.parallel([
      Animated.timing(calendarOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(calendarTranslateX, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pulseHandle = (animatedValue: Animated.Value) => {
    animatedValue.setValue(1);
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.16,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        damping: 8,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateLabel = (
    opacity: Animated.Value,
    translateY: Animated.Value
  ) => {
    opacity.setValue(0);
    translateY.setValue(6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMonthChange = async (direction: "previous" | "next") => {
    setMonthCursor((current) =>
      direction === "next" ? addMonths(current, 1) : subMonths(current, 1)
    );
    animateCalendarMonth(direction);
    await triggerHaptic("soft");
  };

  const monthDays = buildMonthDays(monthCursor);
  const startDay = startOfDay(draftStart);
  const endDay = startOfDay(draftEnd);

  const applyStartCandidate = (candidate: Date) => {
    if (!isDaySelectable(candidate)) {
      return null;
    }

    return clampToMinimumMoment(candidate);
  };

  const applyEndCandidate = (candidate: Date, nextStart: Date) => {
    if (!isDaySelectable(candidate)) {
      return null;
    }

    const clamped = clampToMinimumMoment(candidate);
    return ensureEndAfterStart(clamped, nextStart);
  };

  const getMinimumStartMoment = () => getMinimumSelectableMoment();

  const getMinimumEndMoment = () =>
    getLaterDate(getMinimumSelectableMoment(), addMinutes(draftStart, 15));

  const resolveDayFromGesture = (locationX: number, locationY: number) => {
    const { width, height } = calendarGridLayoutRef.current;

    if (!width || !height) {
      return null;
    }

    const column = Math.max(
      0,
      Math.min(6, Math.floor((locationX / width) * 7))
    );
    const weeksCount = Math.max(1, Math.ceil(monthDays.length / 7));
    const row = Math.max(
      0,
      Math.min(weeksCount - 1, Math.floor((locationY / height) * weeksCount))
    );
    const dayIndex = row * 7 + column;
    const day = monthDays[dayIndex];

    return day ?? null;
  };

  const applyDoubleTapStart = async (day: Date) => {
    const nextStart = applyStartCandidate(setDateTimeParts(day, draftStart));

    if (!nextStart) {
      return;
    }

    const nextEnd = isAfter(nextStart, draftEnd)
      ? ensureEndAfterStart(addMinutes(nextStart, durationMinutes), nextStart)
      : draftEnd;

    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setMonthCursor(day);
    setEditingBoundary("end");
    await triggerHaptic("selection");
  };

  const stopDragSelection = () => {
    dragAnchorRef.current = null;
    dragLastDayKeyRef.current = null;
    setDragBoundary(null);
    setIsDraggingRange(false);
  };

  const resolveDragBoundary = (day: Date) => {
    const isDayStart = isSameDay(day, startDay);
    const isDayEnd = isSameDay(day, endDay);

    if (isDayStart && isDayEnd) {
      return editingBoundary;
    }

    if (isDayStart) {
      return "start" as const;
    }

    if (isDayEnd) {
      return "end" as const;
    }

    return null;
  };

  const updateBoundaryFromDrag = (
    targetDay: Date,
    boundary: "start" | "end"
  ) => {
    if (boundary === "start") {
      const clampedTargetDay = isAfter(targetDay, endDay) ? endDay : targetDay;
      const nextStart = applyStartCandidate(
        setDateTimeParts(clampedTargetDay, draftStart)
      );

      if (!nextStart) {
        return;
      }

      const nextEnd = applyEndCandidate(draftEnd, nextStart);

      if (!nextEnd) {
        return;
      }

      setDraftStart(nextStart);
      setDraftEnd(nextEnd);
      setMonthCursor(clampedTargetDay);
      return;
    }

    const clampedTargetDay = isBefore(targetDay, startDay)
      ? startDay
      : targetDay;
    const nextEnd = applyEndCandidate(
      setDateTimeParts(clampedTargetDay, draftEnd),
      draftStart
    );

    if (!nextEnd) {
      return;
    }

    setDraftEnd(nextEnd);
    setMonthCursor(clampedTargetDay);
  };

  const startDragSelection = async (
    anchorDay: Date,
    boundary: "start" | "end"
  ) => {
    if (!isDaySelectable(anchorDay)) {
      return;
    }

    ignoreNextTapRef.current = true;
    lastTapRef.current = null;
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }
    dragAnchorRef.current = anchorDay;
    dragLastDayKeyRef.current = format(anchorDay, "yyyy-MM-dd");
    setDragBoundary(boundary);
    setEditingBoundary(boundary);
    setIsDraggingRange(true);
    await triggerHaptic("selection");
  };

  useEffect(() => {
    const currentStart = startDay.getTime();
    if (previousStartRef.current !== currentStart) {
      previousStartRef.current = currentStart;
      pulseHandle(startHandleScale);
    }
  }, [startDay, startHandleScale]);

  useEffect(() => {
    const currentEnd = endDay.getTime();
    if (previousEndRef.current !== currentEnd) {
      previousEndRef.current = currentEnd;
      pulseHandle(endHandleScale);
    }
  }, [endDay, endHandleScale]);

  useEffect(() => {
    if (previousStartDateTimeRef.current !== draftStart.getTime()) {
      previousStartDateTimeRef.current = draftStart.getTime();
      animateLabel(startLabelOpacity, startLabelTranslateY);
    }
  }, [draftStart, startLabelOpacity, startLabelTranslateY]);

  useEffect(() => {
    if (previousEndDateTimeRef.current !== draftEnd.getTime()) {
      previousEndDateTimeRef.current = draftEnd.getTime();
      animateLabel(endLabelOpacity, endLabelTranslateY);
    }
  }, [draftEnd, endLabelOpacity, endLabelTranslateY]);

  const handleCalendarPress = async (day: Date) => {
    if (!isDaySelectable(day)) {
      return;
    }

    if (editingBoundary === "start") {
      const nextStart = applyStartCandidate(setDateTimeParts(day, draftStart));

      if (!nextStart) {
        return;
      }

      const nextEnd = isAfter(nextStart, draftEnd)
        ? ensureEndAfterStart(addMinutes(nextStart, durationMinutes), nextStart)
        : draftEnd;
      setDraftStart(nextStart);
      setDraftEnd(nextEnd);
      setMonthCursor(day);
      setEditingBoundary("end");
      await triggerHaptic("selection");
      return;
    }

    if (isBefore(day, startDay)) {
      const nextStart = applyStartCandidate(setDateTimeParts(day, draftStart));

      if (!nextStart) {
        return;
      }

      setDraftStart(nextStart);
      setMonthCursor(day);
      setEditingBoundary("end");
      await triggerHaptic("selection");
      return;
    }

    const nextEnd = applyEndCandidate(
      setDateTimeParts(day, draftEnd),
      draftStart
    );

    if (!nextEnd) {
      return;
    }

    if (!isAfter(nextEnd, draftStart)) {
      setDraftEnd(
        ensureEndAfterStart(addMinutes(draftStart, durationMinutes), draftStart)
      );
      setMonthCursor(day);
      await triggerHaptic("selection");
      return;
    }

    setDraftEnd(nextEnd);
    setMonthCursor(day);
    await triggerHaptic("selection");
  };

  const handleDayTap = async (day: Date) => {
    if (!isDaySelectable(day)) {
      return;
    }

    if (ignoreNextTapRef.current) {
      ignoreNextTapRef.current = false;
      return;
    }

    const dayKey = format(day, "yyyy-MM-dd");
    const now = Date.now();
    const previousTap = lastTapRef.current;

    if (
      previousTap &&
      previousTap.dayKey === dayKey &&
      now - previousTap.at < DOUBLE_TAP_DELAY_MS
    ) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = null;
      await applyDoubleTapStart(day);
      return;
    }

    lastTapRef.current = { dayKey, at: now };
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null;
      lastTapRef.current = null;
      void handleCalendarPress(day);
    }, DOUBLE_TAP_DELAY_MS);
  };

  const applyShortcut = async (mode: "today" | "tomorrow" | "plus30") => {
    if (mode === "plus30") {
      setDraftEnd((current) => addMinutes(current, 30));
      await triggerHaptic("selection");
      return;
    }

    const appToday = startOfAppToday();
    const target = mode === "today" ? appToday : addDays(appToday, 1);

    if (editingBoundary === "start") {
      const nextStart = applyStartCandidate(
        setDateTimeParts(target, draftStart)
      );

      if (!nextStart) {
        return;
      }

      const nextEnd = isAfter(nextStart, draftEnd)
        ? ensureEndAfterStart(addMinutes(nextStart, durationMinutes), nextStart)
        : draftEnd;
      setDraftStart(nextStart);
      setDraftEnd(nextEnd);
    } else {
      if (isBefore(target, startDay)) {
        showDialog({
          title: "Data invalida",
          message: "A data final nao pode ser anterior a data inicial.",
          confirmText: "Entendi",
        });
        return;
      }
      const nextEnd = applyEndCandidate(
        setDateTimeParts(target, draftEnd),
        draftStart
      );

      if (!nextEnd) {
        return;
      }

      setDraftEnd(nextEnd);
    }

    setMonthCursor(target);
    await triggerHaptic("selection");
  };

  const applyDuration = async (minutes: number) => {
    setDraftEnd(addMinutes(draftStart, minutes));
    await triggerHaptic("selection");
  };

  const handleStartTimeChange = async (
    unit: "hour" | "minute",
    value: number
  ) => {
    const nextStart = applyStartCandidate(updateTime(draftStart, unit, value));

    if (!nextStart) {
      return;
    }

    setDraftStart(nextStart);
    setDraftEnd(
      ensureEndAfterStart(
        getLaterDate(
          addMinutes(nextStart, durationMinutes),
          getMinimumEndMoment()
        ),
        nextStart
      )
    );
    await triggerHaptic("selection");
  };

  const handleEndTimeChange = async (
    unit: "hour" | "minute",
    value: number
  ) => {
    const nextEnd = applyEndCandidate(
      updateTime(draftEnd, unit, value),
      draftStart
    );

    if (!nextEnd) {
      return;
    }

    setDraftEnd(nextEnd);
    await triggerHaptic("selection");
  };

  const handleConfirm = async () => {
    if (!isAfter(draftEnd, draftStart)) {
      showDialog({
        title: "Horario invalido",
        message: "O termino do evento precisa acontecer depois do inicio.",
        confirmText: "Entendi",
      });
      return;
    }

    setSchedule(draftStart, draftEnd);
    await triggerHaptic("success");
    router.back();
  };

  const isStartHourDisabled = (hour: number) =>
    isSameDay(draftStart, getMinimumStartMoment()) &&
    hour < getMinimumStartMoment().getHours();

  const isStartMinuteDisabled = (minute: number) =>
    isSameDay(draftStart, getMinimumStartMoment()) &&
    draftStart.getHours() === getMinimumStartMoment().getHours() &&
    minute < getMinimumStartMoment().getMinutes();

  const isEndHourDisabled = (hour: number) =>
    isSameDay(draftEnd, getMinimumEndMoment()) &&
    hour < getMinimumEndMoment().getHours();

  const isEndMinuteDisabled = (minute: number) =>
    isSameDay(draftEnd, getMinimumEndMoment()) &&
    draftEnd.getHours() === getMinimumEndMoment().getHours() &&
    minute < getMinimumEndMoment().getMinutes();

  if (!initialized) return null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pt-5 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <ChevronLeft size={20} color="#111827" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="mt-1 text-xl font-bold text-gray-900">
              Escolha data e hora
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => void handleConfirm()}
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#7C3AED" }}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDraggingRange}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 72 }}
      >
        <View className="px-6 pb-4">
          <View className="px-1 pb-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-violet-500">
                  Seleção atual
                </Text>
                <Text className="mt-2 text-3xl font-bold leading-tight text-gray-900">
                  {format(draftStart, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </Text>
                <Text className="mt-2 text-base text-gray-600">
                  {format(draftStart, "dd/MM HH:mm")} -{" "}
                  {format(draftEnd, "dd/MM HH:mm")}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-500">
                  {getRangePreview(draftStart, draftEnd)}
                </Text>
              </View>

              <CalendarDays size={24} color="#7C3AED" />
            </View>
          </View>
        </View>

        <View className="px-6">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
              Editar
            </Text>
            <View className="mt-3 flex-row gap-2">
              <ChipButton
                active={editingBoundary === "start"}
                label="Início"
                onPress={() => {
                  setEditingBoundary("start");
                  void triggerHaptic("selection");
                }}
              />
              <ChipButton
                active={editingBoundary === "end"}
                label="Fim"
                onPress={() => {
                  setEditingBoundary("end");
                  void triggerHaptic("selection");
                }}
              />
            </View>
            <Text className="mt-3 text-sm text-gray-500">
              O primeiro toque define o inicio. O proximo toque define o fim.
              Tambem e possivel segurar e arrastar para ajustar o intervalo.
            </Text>
          </View>

          <View className="mt-5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
              Atalhos
            </Text>
            <View className="mt-3 flex-row gap-2">
              <ChipButton
                active={isSameDay(
                  editingBoundary === "start" ? draftStart : draftEnd,
                  startOfAppToday()
                )}
                label="Hoje"
                onPress={() => void applyShortcut("today")}
              />
              <ChipButton
                active={isSameDay(
                  editingBoundary === "start" ? draftStart : draftEnd,
                  addDays(startOfAppToday(), 1)
                )}
                label="Amanhã"
                onPress={() => void applyShortcut("tomorrow")}
              />
              <ChipButton
                label="+30 min"
                onPress={() => void applyShortcut("plus30")}
              />
            </View>
          </View>

          <View className="mt-5 rounded-[28px] border border-gray-100 bg-[#F8FAFC] p-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => void handleMonthChange("previous")}
                className="p-1"
              >
                <ChevronLeft size={20} color="#111827" />
              </TouchableOpacity>

              <Text className="text-lg font-bold text-gray-900">
                {format(monthCursor, "MMMM yyyy", { locale: ptBR })}
              </Text>

              <TouchableOpacity
                onPress={() => void handleMonthChange("next")}
                className="p-1"
              >
                <ChevronRight size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row">
              {WEEK_DAYS.map((label, index) => (
                <View key={`${label}-${index}`} className="flex-1 items-center">
                  <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <Animated.View
              className="mt-3"
              style={{
                opacity: calendarOpacity,
                transform: [{ translateX: calendarTranslateX }],
              }}
            >
              <View
                className="flex-row flex-wrap"
                onLayout={(event) => {
                  calendarGridLayoutRef.current = {
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                  };
                }}
                onMoveShouldSetResponderCapture={() =>
                  Boolean(dragAnchorRef.current)
                }
                onMoveShouldSetResponder={() => Boolean(dragAnchorRef.current)}
                onResponderTerminationRequest={() => false}
                onResponderMove={(event) => {
                  if (!dragAnchorRef.current || !dragBoundary) {
                    return;
                  }

                  const day = resolveDayFromGesture(
                    event.nativeEvent.locationX,
                    event.nativeEvent.locationY
                  );

                  if (!day || !isDaySelectable(day)) {
                    return;
                  }

                  const dayKey = format(day, "yyyy-MM-dd");
                  if (dragLastDayKeyRef.current === dayKey) {
                    return;
                  }

                  dragLastDayKeyRef.current = dayKey;
                  updateBoundaryFromDrag(day, dragBoundary);
                  void triggerHaptic("soft");
                }}
                onResponderRelease={() => {
                  stopDragSelection();
                }}
                onTouchEnd={() => {
                  if (dragAnchorRef.current) {
                    stopDragSelection();
                  }
                }}
              >
                {monthDays.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const isStart = isSameDay(day, startDay);
                  const isEnd = isSameDay(day, endDay);
                  const isRange = isWithinInterval(day, {
                    start: startDay,
                    end: endDay,
                  });
                  const isCurrentMonth = isSameMonth(day, monthCursor);
                  const isFocusedBoundary = isSameDay(
                    day,
                    editingBoundary === "start" ? startDay : endDay
                  );
                  const isSelectable = isDaySelectable(day);
                  const draggableBoundary = resolveDragBoundary(day);
                  const isDraggingHandle =
                    dragBoundary === "start"
                      ? isStart
                      : dragBoundary === "end"
                        ? isEnd
                        : false;
                  const dayHandleScale =
                    isStart && !isEnd
                      ? startHandleScale
                      : isEnd && !isStart
                        ? endHandleScale
                        : isStart && isEnd
                          ? dragBoundary === "end"
                            ? endHandleScale
                            : startHandleScale
                          : 1;
                  const hasTimeLabel = isFocusedBoundary || isStart || isEnd;
                  const isStartLabel = isSameDay(day, startDay);
                  const isEndLabel = isSameDay(day, endDay);
                  const timeLabel =
                    isSameDay(day, startDay) && isSameDay(day, endDay)
                      ? `${format(draftStart, "HH:mm")} • ${format(draftEnd, "HH:mm")}`
                      : isSameDay(day, startDay)
                        ? `Início ${format(draftStart, "HH:mm")}`
                        : isSameDay(day, endDay)
                          ? `Fim ${format(draftEnd, "HH:mm")}`
                          : "";

                  return (
                    <View
                      key={day.toISOString()}
                      className="w-[14.285%] items-center py-1"
                    >
                      <TouchableOpacity
                        onPress={() => void handleDayTap(day)}
                        onLongPress={() => {
                          if (draggableBoundary) {
                            void startDragSelection(day, draggableBoundary);
                          }
                        }}
                        delayLongPress={140}
                        disabled={!isSelectable}
                        className="h-[78px] w-full items-center justify-start"
                      >
                        <View
                          className="absolute top-[22px] h-2 rounded-full"
                          style={{
                            left: isStart ? "50%" : 0,
                            right: isEnd ? "50%" : 0,
                            backgroundColor: isRange
                              ? "#A855F7"
                              : "transparent",
                            opacity: !isSelectable
                              ? 0.12
                              : isCurrentMonth
                                ? 0.28
                                : 0.14,
                          }}
                        />

                        <Animated.View
                          className="mt-1 h-11 w-11 items-center justify-center rounded-2xl"
                          style={{
                            backgroundColor:
                              isStart || isEnd
                                ? "#7C3AED"
                                : isFocusedBoundary
                                  ? "#F5F3FF"
                                  : "transparent",
                            borderWidth: isFocusedBoundary ? 2 : 0,
                            borderColor: isFocusedBoundary
                              ? "#8B5CF6"
                              : "transparent",
                            opacity: !isSelectable
                              ? 0.28
                              : isCurrentMonth
                                ? 1
                                : 0.35,
                            transform: [
                              {
                                scale: dayHandleScale,
                              },
                              { scale: isDraggingHandle ? 1.1 : 1 },
                            ],
                          }}
                        >
                          <Text
                            className={`font-semibold ${
                              isStart || isEnd
                                ? "text-white"
                                : !isSelectable
                                  ? "text-gray-300"
                                  : "text-gray-700"
                            }`}
                          >
                            {format(day, "d")}
                          </Text>
                        </Animated.View>

                        {isStart && !isEnd ? (
                          <Animated.View
                            className="absolute top-[24px] right-[2px] h-4 w-4 rounded-full border-2 bg-white"
                            style={{
                              borderColor: "#7C3AED",
                              opacity: !isSelectable
                                ? 0.2
                                : isCurrentMonth
                                  ? 1
                                  : 0.35,
                              transform: [{ scale: startHandleScale }],
                            }}
                          />
                        ) : null}

                        {isEnd && !isStart ? (
                          <Animated.View
                            className="absolute top-[24px] left-[2px] h-4 w-4 rounded-full border-2 bg-white"
                            style={{
                              borderColor: "#7C3AED",
                              opacity: !isSelectable
                                ? 0.2
                                : isCurrentMonth
                                  ? 1
                                  : 0.35,
                              transform: [{ scale: endHandleScale }],
                            }}
                          />
                        ) : null}

                        {hasTimeLabel ? (
                          <Animated.View
                            className="mt-1 rounded-full px-2 py-1"
                            style={{
                              backgroundColor: isFocusedBoundary
                                ? "#6D28D9"
                                : "#FFFFFF",
                              opacity: !isSelectable
                                ? 0.2
                                : isCurrentMonth
                                  ? 1
                                  : 0.35,
                              transform: [
                                {
                                  translateY:
                                    isStartLabel && isEndLabel
                                      ? Animated.add(
                                          startLabelTranslateY,
                                          endLabelTranslateY
                                        ).interpolate({
                                          inputRange: [0, 12],
                                          outputRange: [0, 6],
                                        })
                                      : isStartLabel
                                        ? startLabelTranslateY
                                        : isEndLabel
                                          ? endLabelTranslateY
                                          : 0,
                                },
                              ],
                            }}
                          >
                            <Animated.Text
                              numberOfLines={1}
                              className={`text-[10px] font-semibold ${isFocusedBoundary ? "text-white" : "text-gray-700"}`}
                              style={{
                                opacity:
                                  isStartLabel && isEndLabel
                                    ? Animated.multiply(
                                        startLabelOpacity,
                                        endLabelOpacity
                                      )
                                    : isStartLabel
                                      ? startLabelOpacity
                                      : isEndLabel
                                        ? endLabelOpacity
                                        : 1,
                              }}
                            >
                              {timeLabel}
                            </Animated.Text>
                          </Animated.View>
                        ) : null}

                        {isDraggingRange &&
                        dragLastDayKeyRef.current === dayKey ? (
                          <View className="absolute bottom-0 h-1.5 w-8 rounded-full bg-violet-400" />
                        ) : null}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            <View className="mt-4 flex-row gap-3">
              <View
                className="flex-1 rounded-2xl px-4 py-3"
                style={{
                  backgroundColor:
                    editingBoundary === "start" ? "#F3E8FF" : "#FFFFFF",
                }}
              >
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-gray-400">
                  Ativo no calendário
                </Text>
                <Text className="mt-1 text-base font-bold text-gray-900">
                  {editingBoundary === "start"
                    ? "Editando início"
                    : "Editando fim"}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {editingBoundary === "start"
                    ? format(draftStart, "dd/MM • HH:mm")
                    : format(draftEnd, "dd/MM • HH:mm")}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl bg-white px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-gray-400">
                  Intervalo
                </Text>
                <Text className="mt-1 text-base font-bold text-gray-900">
                  {formatDuration(durationMinutes)}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {getRangePreview(draftStart, draftEnd)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-[24px] border border-violet-100 bg-violet-50/70 p-4">
            <View className="flex-row items-center">
              <Sparkles size={18} color="#7C3AED" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-violet-500">
                  Duração sugerida
                </Text>
                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {formatDuration(durationMinutes)}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              {DURATION_PRESETS.map((minutes) => (
                <ChipButton
                  key={`duration-${minutes}`}
                  active={durationMinutes === minutes}
                  label={formatDuration(minutes)}
                  onPress={() => void applyDuration(minutes)}
                />
              ))}
            </View>
          </View>

          <View className="mt-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-400">
                  Horários
                </Text>
                <Text className="mt-1 text-xl font-bold text-gray-900">
                  {format(draftStart, "HH:mm")} - {format(draftEnd, "HH:mm")}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-gray-500">
                Ajuste contínuo
              </Text>
            </View>

            <View className="mt-4 gap-4">
              <TimeCard
                accentColor="#7C3AED"
                label="Início"
                value={draftStart}
                active={editingBoundary === "start"}
                isHourDisabled={isStartHourDisabled}
                isMinuteDisabled={isStartMinuteDisabled}
                onHourChange={(hour) =>
                  void handleStartTimeChange("hour", hour)
                }
                onMinuteChange={(minute) =>
                  void handleStartTimeChange("minute", minute)
                }
              />

              <TimeCard
                accentColor="#2563EB"
                label="Fim"
                value={draftEnd}
                active={editingBoundary === "end"}
                isHourDisabled={isEndHourDisabled}
                isMinuteDisabled={isEndMinuteDisabled}
                onHourChange={(hour) => void handleEndTimeChange("hour", hour)}
                onMinuteChange={(minute) =>
                  void handleEndTimeChange("minute", minute)
                }
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => void handleConfirm()}
            activeOpacity={0.9}
            className="mt-6 mb-2 w-full items-center justify-center rounded-full py-4"
            style={{ backgroundColor: "#7C3AED" }}
          >
            <Text className="text-lg font-bold text-white">
              Definir data e hora
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
