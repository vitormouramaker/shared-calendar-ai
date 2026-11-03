const APP_TIME_ZONE = process.env.DB_TIMEZONE || "America/Sao_Paulo";

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatParts(date, options) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
}

function getDateKey(value) {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  const parts = formatParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTimeKey(value) {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  const parts = formatParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${parts.hour}:${parts.minute}`;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeReminderMinutes(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 15;
}

function pushChange(changeDetails, detail) {
  changeDetails.push(detail);
}

function buildEventUpdateMetadata(previousEvent, nextEvent) {
  const changeDetails = [];

  if (normalizeText(previousEvent.title) !== normalizeText(nextEvent.title)) {
    pushChange(changeDetails, {
      key: "title",
      label: "Titulo",
      type: "text",
      previous_value: previousEvent.title ?? null,
      next_value: nextEvent.title ?? null,
    });
  }

  if (normalizeText(previousEvent.description) !== normalizeText(nextEvent.description)) {
    pushChange(changeDetails, {
      key: "description",
      label: "Descricao",
      type: "text",
      previous_value: previousEvent.description ?? null,
      next_value: nextEvent.description ?? null,
    });
  }

  if (normalizeText(previousEvent.category) !== normalizeText(nextEvent.category)) {
    pushChange(changeDetails, {
      key: "category",
      label: "Categoria",
      type: "text",
      previous_value: previousEvent.category ?? null,
      next_value: nextEvent.category ?? null,
    });
  }

  if (getDateKey(previousEvent.start_time) !== getDateKey(nextEvent.start_time)) {
    pushChange(changeDetails, {
      key: "start_date",
      label: "Data de inicio",
      type: "date",
      previous_value: previousEvent.start_time ?? null,
      next_value: nextEvent.start_time ?? null,
    });
  }

  if (getTimeKey(previousEvent.start_time) !== getTimeKey(nextEvent.start_time)) {
    pushChange(changeDetails, {
      key: "start_time",
      label: "Horario de inicio",
      type: "time",
      previous_value: previousEvent.start_time ?? null,
      next_value: nextEvent.start_time ?? null,
    });
  }

  if (getDateKey(previousEvent.end_time) !== getDateKey(nextEvent.end_time)) {
    pushChange(changeDetails, {
      key: "end_date",
      label: "Data de termino",
      type: "date",
      previous_value: previousEvent.end_time ?? null,
      next_value: nextEvent.end_time ?? null,
    });
  }

  if (getTimeKey(previousEvent.end_time) !== getTimeKey(nextEvent.end_time)) {
    pushChange(changeDetails, {
      key: "end_time",
      label: "Horario de termino",
      type: "time",
      previous_value: previousEvent.end_time ?? null,
      next_value: nextEvent.end_time ?? null,
    });
  }

  if (Boolean(previousEvent.remind_me) !== Boolean(nextEvent.remind_me)) {
    pushChange(changeDetails, {
      key: "remind_me",
      label: "Lembrete",
      type: "boolean",
      previous_value: Boolean(previousEvent.remind_me),
      next_value: Boolean(nextEvent.remind_me),
    });
  }

  if (
    normalizeReminderMinutes(previousEvent.remind_before_minutes) !==
    normalizeReminderMinutes(nextEvent.remind_before_minutes)
  ) {
    pushChange(changeDetails, {
      key: "remind_before_minutes",
      label: "Antecedencia do lembrete",
      type: "minutes",
      previous_value: normalizeReminderMinutes(previousEvent.remind_before_minutes),
      next_value: normalizeReminderMinutes(nextEvent.remind_before_minutes),
    });
  }

  return {
    changed_fields: changeDetails.map((detail) => detail.key),
    change_count: changeDetails.length,
    change_details: changeDetails,
    previous_start_time: previousEvent.start_time,
    previous_end_time: previousEvent.end_time,
    next_start_time: nextEvent.start_time,
    next_end_time: nextEvent.end_time,
  };
}

module.exports = {
  buildEventUpdateMetadata,
};
