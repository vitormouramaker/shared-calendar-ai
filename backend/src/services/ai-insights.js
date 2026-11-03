const DEFAULT_LOOKAHEAD_DAYS = 14;
const WORKDAY_START_HOUR = 8;
const WORKDAY_END_HOUR = 18;
const SLOT_MINUTES = 60;

function toDate(value) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function diffMinutes(start, end) {
  return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function groupByDate(events) {
  const byDate = new Map();

  for (const event of events) {
    const key = toDateKey(toDate(event.start_time));
    const current = byDate.get(key) ?? [];
    current.push(event);
    byDate.set(key, current);
  }

  return byDate;
}

function buildConflictInsights(events) {
  const insights = [];

  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const next = events[index + 1];
    const currentEnd = toDate(current.end_time);
    const nextStart = toDate(next.start_time);

    if (nextStart < currentEnd) {
      insights.push({
        type: "conflict",
        severity: "high",
        title: "Conflito entre eventos",
        description: `${current.title} sobrepoe ${next.title}.`,
        event_ids: [current.id, next.id],
        recommendation: "Revise os horarios antes que a agenda fique inconsistente.",
      });
      continue;
    }

    const gapMinutes = diffMinutes(currentEnd, nextStart);

    if (gapMinutes >= 0 && gapMinutes < 15) {
      insights.push({
        type: "tight_turnaround",
        severity: "medium",
        title: "Troca muito curta entre compromissos",
        description: `Ha apenas ${gapMinutes} minuto${gapMinutes === 1 ? "" : "s"} entre ${current.title} e ${next.title}.`,
        event_ids: [current.id, next.id],
        recommendation: "Considere abrir uma janela de respiro ou deslocamento.",
      });
    }
  }

  return insights;
}

function buildMissingDescriptionInsight(events) {
  const missing = events.filter((event) => !String(event.description ?? "").trim()).slice(0, 3);

  if (missing.length === 0) {
    return null;
  }

  return {
    type: "missing_context",
    severity: "low",
    title: "Eventos sem contexto suficiente",
    description: `${missing.length} evento${missing.length > 1 ? "s" : ""} proximo${missing.length > 1 ? "s" : ""} nao ${missing.length > 1 ? "tem" : "tem"} descricao.`,
    event_ids: missing.map((event) => event.id),
    recommendation: "Adicionar objetivo ou pauta ajuda a IA a gerar resumos melhores.",
  };
}

function buildReminderInsight(events) {
  const missingReminder = events.filter((event) => !event.remind_me).slice(0, 3);

  if (missingReminder.length === 0) {
    return null;
  }

  return {
    type: "missing_reminder",
    severity: "medium",
    title: "Eventos proximos sem lembrete",
    description: `${missingReminder.length} evento${missingReminder.length > 1 ? "s" : ""} nas proximas 72h est${missingReminder.length > 1 ? "ao" : "a"} sem lembrete ativo.`,
    event_ids: missingReminder.map((event) => event.id),
    recommendation: "Ative lembretes para reduzir esquecimentos.",
  };
}

function buildBusyDayInsight(events) {
  const byDate = groupByDate(events);

  for (const [dateKey, dateEvents] of byDate.entries()) {
    const totalMinutes = dateEvents.reduce(
      (sum, event) => sum + Math.max(diffMinutes(toDate(event.start_time), toDate(event.end_time)), 0),
      0,
    );

    if (dateEvents.length >= 5 || totalMinutes >= 240) {
      return {
        type: "busy_day",
        severity: "medium",
        title: "Dia com agenda carregada",
        description: `${dateKey} tem ${dateEvents.length} evento(s) e cerca de ${(totalMinutes / 60).toFixed(1)}h bloqueadas.`,
        event_ids: dateEvents.map((event) => event.id),
        recommendation: "Vale agrupar temas ou remover reunioes desnecessarias.",
      };
    }
  }

  return null;
}

function findNextFreeSlot(events, now) {
  const eventsByDate = groupByDate(events);

  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WORKDAY_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WORKDAY_END_HOUR, 0, 0, 0);
    const eventsForDay = (eventsByDate.get(toDateKey(day)) ?? [])
      .map((event) => ({
        start: toDate(event.start_time),
        end: toDate(event.end_time),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = offset === 0 && now > dayStart ? new Date(now.getTime()) : dayStart;

    for (const event of eventsForDay) {
      if (diffMinutes(cursor, event.start) >= SLOT_MINUTES) {
        return {
          start: cursor.toISOString(),
          end: addMinutes(cursor, SLOT_MINUTES).toISOString(),
        };
      }

      if (event.end > cursor) {
        cursor = new Date(event.end.getTime());
      }
    }

    if (diffMinutes(cursor, dayEnd) >= SLOT_MINUTES) {
      return {
        start: cursor.toISOString(),
        end: addMinutes(cursor, SLOT_MINUTES).toISOString(),
      };
    }
  }

  return null;
}

function buildAgendaInsights(events, options = {}) {
  const now = options.now ? toDate(options.now) : new Date();
  const lookaheadDays = Number(options.lookaheadDays ?? DEFAULT_LOOKAHEAD_DAYS);
  const futureEvents = events
    .filter((event) => toDate(event.end_time) > now)
    .sort((a, b) => toDate(a.start_time) - toDate(b.start_time));
  const horizonDate = addMinutes(now, lookaheadDays * 24 * 60);
  const horizonEvents = futureEvents.filter((event) => toDate(event.start_time) <= horizonDate);
  const next72hEvents = futureEvents.filter((event) => toDate(event.start_time) <= addMinutes(now, 72 * 60));
  const insights = [];

  insights.push(...buildConflictInsights(horizonEvents));

  const missingDescriptionInsight = buildMissingDescriptionInsight(
    horizonEvents.filter((event) => toDate(event.start_time) <= addMinutes(now, 7 * 24 * 60)),
  );
  if (missingDescriptionInsight) {
    insights.push(missingDescriptionInsight);
  }

  const reminderInsight = buildReminderInsight(next72hEvents);
  if (reminderInsight) {
    insights.push(reminderInsight);
  }

  const busyDayInsight = buildBusyDayInsight(horizonEvents);
  if (busyDayInsight) {
    insights.push(busyDayInsight);
  }

  const nextFreeSlot = findNextFreeSlot(horizonEvents, now);

  return {
    generated_at: now.toISOString(),
    summary: {
      upcoming_count: futureEvents.length,
      conflict_count: insights.filter((insight) => insight.type === "conflict").length,
      missing_description_count: horizonEvents.filter((event) => !String(event.description ?? "").trim()).length,
      reminders_disabled_count: next72hEvents.filter((event) => !event.remind_me).length,
      next_free_slot: nextFreeSlot,
    },
    insights: insights.slice(0, 8).map((insight, index) => ({
      id: `${insight.type}-${index + 1}`,
      ...insight,
    })),
  };
}

module.exports = {
  buildAgendaInsights,
};
