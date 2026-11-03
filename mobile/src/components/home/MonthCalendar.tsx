import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getMonth,
  getYear,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEventsByMonth } from "../../hooks/useEvents";
import { createAppDate, toAppDateKey } from "../../lib/app-time";

const MAX_EVENT_LANES = 3;

type MonthEventMarker = {
  id: number;
  title?: string;
  category_color: string;
  start_time: string;
  end_time: string;
};

type NormalizedMonthEvent = MonthEventMarker & {
  startDayKey: string;
  endDayKey: string;
  durationDays: number;
};

type WeekLaneData = {
  weekEvents: NormalizedMonthEvent[];
  laneAssignments: Record<number, number>;
  overflowByDayKey: Record<string, number>;
};

interface MonthCalendarProps {
  currentDate: Date;
  onDayPress?: (date: Date) => void;
  monthEvents?: MonthEventMarker[];
}

function splitIntoWeeks(days: Date[]) {
  const weeks: Date[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

function dayDiffInclusive(startDayKey: string, endDayKey: string) {
  const start = new Date(`${startDayKey}T00:00:00`);
  const end = new Date(`${endDayKey}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function normalizeMonthEvents(monthEvents: MonthEventMarker[]) {
  return monthEvents.map((event) => {
    const startDayKey = toAppDateKey(event.start_time);
    const endDayKey = toAppDateKey(event.end_time || event.start_time);

    return {
      ...event,
      startDayKey,
      endDayKey: endDayKey >= startDayKey ? endDayKey : startDayKey,
      durationDays: dayDiffInclusive(startDayKey, endDayKey >= startDayKey ? endDayKey : startDayKey),
    };
  });
}

function buildWeekLaneData(week: Date[], monthEvents: NormalizedMonthEvent[]): WeekLaneData {
  const weekStartKey = format(week[0], "yyyy-MM-dd");
  const weekEndKey = format(week[week.length - 1], "yyyy-MM-dd");
  const weekEvents = monthEvents
    .filter((event) => event.endDayKey >= weekStartKey && event.startDayKey <= weekEndKey)
    .sort((first, second) => {
      if (first.startDayKey !== second.startDayKey) {
        return first.startDayKey.localeCompare(second.startDayKey);
      }

      if (first.durationDays !== second.durationDays) {
        return second.durationDays - first.durationDays;
      }

      return first.id - second.id;
    });

  const laneAssignments: Record<number, number> = {};
  const laneEnds = Array(MAX_EVENT_LANES).fill("");

  for (const event of weekEvents) {
    const segmentStartKey = event.startDayKey > weekStartKey ? event.startDayKey : weekStartKey;
    const segmentEndKey = event.endDayKey < weekEndKey ? event.endDayKey : weekEndKey;

    for (let laneIndex = 0; laneIndex < MAX_EVENT_LANES; laneIndex += 1) {
      if (!laneEnds[laneIndex] || laneEnds[laneIndex] < segmentStartKey) {
        laneAssignments[event.id] = laneIndex;
        laneEnds[laneIndex] = segmentEndKey;
        break;
      }
    }
  }

  const overflowByDayKey: Record<string, number> = {};

  for (const day of week) {
    const dayKey = format(day, "yyyy-MM-dd");
    const total = weekEvents.filter(
      (event) => event.startDayKey <= dayKey && event.endDayKey >= dayKey
    ).length;
    const visible = weekEvents.filter(
      (event) => laneAssignments[event.id] !== undefined && event.startDayKey <= dayKey && event.endDayKey >= dayKey
    ).length;

    overflowByDayKey[dayKey] = Math.max(0, total - visible);
  }

  return {
    weekEvents,
    laneAssignments,
    overflowByDayKey,
  };
}

export function MonthCalendar({ currentDate, onDayPress, monthEvents: externalMonthEvents }: MonthCalendarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarOpacity = useRef(new Animated.Value(1)).current;
  const calendarTranslateX = useRef(new Animated.Value(0)).current;
  const previousMonthKeyRef = useRef(`${getYear(currentDate)}-${getMonth(currentDate)}`);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });
  const weeks = splitIntoWeeks(calendarDays);

  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const { data: queriedMonthEvents = [] } = useEventsByMonth(
    getYear(currentDate),
    getMonth(currentDate) + 1
  );
  const monthEvents = externalMonthEvents ?? queriedMonthEvents;

  const normalizedMonthEvents = useMemo(
    () => normalizeMonthEvents(monthEvents as MonthEventMarker[]),
    [monthEvents]
  );
  const weekLaneData = useMemo(
    () => weeks.map((week) => buildWeekLaneData(week, normalizedMonthEvents)),
    [weeks, normalizedMonthEvents]
  );

  useEffect(() => {
    const monthKey = `${getYear(currentDate)}-${getMonth(currentDate)}`;
    if (previousMonthKeyRef.current === monthKey) {
      return;
    }

    const [previousYearRaw, previousMonthRaw] = previousMonthKeyRef.current.split("-");
    const previousMonthIndex = Number(previousYearRaw) * 12 + Number(previousMonthRaw);
    const currentMonthIndex = getYear(currentDate) * 12 + getMonth(currentDate);
    const direction = currentMonthIndex >= previousMonthIndex ? 18 : -18;

    previousMonthKeyRef.current = monthKey;
    calendarOpacity.setValue(0.35);
    calendarTranslateX.setValue(direction);

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
  }, [calendarOpacity, calendarTranslateX, currentDate]);

  return (
    <View className="px-6 py-2">
      <View className="mb-4 flex-row">
        {weekDays.map((day, index) => (
          <Text key={`${day}-${index}`} className="w-[14.28%] text-center text-xs font-bold text-gray-400">
            {day}
          </Text>
        ))}
      </View>

      <Animated.View style={{ opacity: calendarOpacity, transform: [{ translateX: calendarTranslateX }] }}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} className="mb-1 flex-row">
            {week.map((day, dayIndex) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const laneData = weekLaneData[weekIndex];
              const isSelected = isSameDay(day, currentDate);
              const isCurrentMonth = getMonth(day) === getMonth(currentDate);
              const overflowCount = laneData.overflowByDayKey[dayKey] ?? 0;

              return (
                <TouchableOpacity
                  key={`${day.toISOString()}-${dayIndex}`}
                  className="h-[86px] w-[14.28%] items-center justify-start pt-1"
                  onPress={() => onDayPress?.(createAppDate(getYear(day), getMonth(day), getDate(day)))}
                >
                  <View
                    className="h-8 w-8 items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? "#7C3AED" : "transparent",
                      borderRadius: 999,
                      opacity: isCurrentMonth ? 1 : 0.35,
                    }}
                  >
                    <Text className={`text-base font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {format(day, "d")}
                    </Text>
                  </View>

                  <View className="mt-2 h-10 w-full px-[2px]">
                    {Array.from({ length: MAX_EVENT_LANES }).map((_, laneIndex) => {
                      const event = laneData.weekEvents.find(
                        (item) =>
                          laneData.laneAssignments[item.id] === laneIndex &&
                          item.startDayKey <= dayKey &&
                          item.endDayKey >= dayKey
                      );

                      if (!event) {
                        return null;
                      }

                      const isSegmentStart = event.startDayKey === dayKey;
                      const isSegmentEnd = event.endDayKey === dayKey;
                      const isSingleDay = isSegmentStart && isSegmentEnd;

                      return (
                        <View
                          key={`${dayKey}-${event.id}-${laneIndex}`}
                          className="absolute h-[6px]"
                          style={{
                            top: laneIndex * 10,
                            left: isSingleDay || isSegmentStart ? "50%" : 0,
                            right: isSingleDay || isSegmentEnd ? "50%" : 0,
                            marginLeft: isSingleDay ? -8 : 0,
                            marginRight: isSingleDay ? -8 : 0,
                            backgroundColor: event.category_color,
                            borderTopLeftRadius: isSegmentStart ? 999 : 2,
                            borderBottomLeftRadius: isSegmentStart ? 999 : 2,
                            borderTopRightRadius: isSegmentEnd ? 999 : 2,
                            borderBottomRightRadius: isSegmentEnd ? 999 : 2,
                            opacity: isCurrentMonth ? 0.95 : 0.3,
                          }}
                        />
                      );
                    })}

                    {overflowCount > 0 ? (
                      <Text
                        className="absolute right-0 text-[10px] font-bold text-gray-400"
                        style={{ top: MAX_EVENT_LANES * 10 }}
                      >
                        +{overflowCount}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
