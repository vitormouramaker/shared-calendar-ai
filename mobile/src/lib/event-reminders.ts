export const REMINDER_OPTIONS = [
  { label: "Na hora", value: 0 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "1 dia", value: 1440 },
];

export function formatReminderSummary(minutes: number) {
  if (minutes <= 0) {
    return "Lembrete na hora";
  }

  if (minutes < 60) {
    return `Lembrete ${minutes} min antes`;
  }

  if (minutes === 60) {
    return "Lembrete 1h antes";
  }

  if (minutes < 1440) {
    const hours = minutes / 60;
    return `Lembrete ${hours}h antes`;
  }

  if (minutes === 1440) {
    return "Lembrete 1 dia antes";
  }

  const days = minutes / 1440;
  return `Lembrete ${days} dias antes`;
}
