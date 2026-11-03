import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const APP_UTC_OFFSET_MINUTES = -3 * 60;
const MINUTE_IN_MS = 60 * 1000;

type DateInput = Date | string | number;

function toDate(value: DateInput) {
  return value instanceof Date ? new Date(value) : new Date(value);
}

function getShiftMs(date: Date) {
  const localUtcOffsetMinutes = -date.getTimezoneOffset();
  return (APP_UTC_OFFSET_MINUTES - localUtcOffsetMinutes) * MINUTE_IN_MS;
}

export function toAppTime(value: DateInput) {
  const date = toDate(value);
  return new Date(date.getTime() + getShiftMs(date));
}

export function fromAppTime(value: DateInput) {
  const date = toDate(value);
  return new Date(date.getTime() - getShiftMs(date));
}

export function getAppNow() {
  return toAppTime(new Date());
}

export function startOfAppToday() {
  return startOfDay(getAppNow());
}

export function createAppDate(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  hours = 12,
  minutes = 0
) {
  return new Date(year, monthIndex, dayOfMonth, hours, minutes, 0, 0);
}

export function formatAppDate(
  value: DateInput,
  pattern: string,
  options?: Parameters<typeof format>[2]
) {
  return format(toAppTime(value), pattern, {
    locale: ptBR,
    ...(options ?? {}),
  });
}

export function toAppDateKey(value: DateInput) {
  return formatAppDate(value, "yyyy-MM-dd");
}
