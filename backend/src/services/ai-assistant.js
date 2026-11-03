const { createStructuredResponse, getOpenAIConfig } = require("./openai");
const { buildAgendaInsights } = require("./ai-insights");

const DEFAULT_CATEGORY = { name: "Brainstorm", color: "#7c3aed" };
const ACTION_TTL_MINUTES = 30;
const CREATE_DRAFT_FIELD_ORDER = [
  "title",
  "description",
  "category",
  "start_date",
  "start_time",
  "end_date",
  "end_time",
  "remind_me",
  "remind_before_minutes",
];

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeComparisonText(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(value) {
  return normalizeComparisonText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function isCancelCommand(message) {
  return /^(cancelar|parar|desistir|encerrar)\b/.test(normalizeComparisonText(message));
}

function wantsNoDescription(message) {
  return /(sem descricao|sem descrição|pode ficar sem descricao|pode ficar sem descrição)/.test(
    normalizeComparisonText(message),
  );
}

function findCategory(categories, preferredName) {
  const normalizedName = normalizeComparisonText(preferredName);

  if (!normalizedName) {
    return categories[0] ?? DEFAULT_CATEGORY;
  }

  const exactMatch = categories.find(
    (category) => normalizeComparisonText(category.name) === normalizedName,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const includesMatch = categories.find((category) =>
    normalizedName.includes(normalizeComparisonText(category.name)),
  );

  return includesMatch ?? categories[0] ?? DEFAULT_CATEGORY;
}

function detectCreateIntent(message) {
  // "remarcar" e "reagendar" são remarcação, não criação.
  return /((?<!re)agend|(?<!re)marc|cadast|cria|criar|novo evento|novo agendamento|quero marcar|quero agendar)/.test(
    normalizeComparisonText(message),
  );
}

function detectUpdateIntent(message) {
  return /(remarc|reagend|adi|muda|mover|alter|editar|atualiz)/.test(
    normalizeComparisonText(message),
  );
}

function detectAnalysisIntent(message) {
  return /(analis|resum|minha semana|meu dia|conflit|agenda|insight|lotad|livre)/.test(
    normalizeComparisonText(message),
  );
}

function parseDateFromMessage(message, now) {
  const lower = normalizeComparisonText(message);
  const explicitDate = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (explicitDate) {
    const day = Number(explicitDate[1]);
    const monthIndex = Number(explicitDate[2]) - 1;
    const year = explicitDate[3]
      ? Number(explicitDate[3].length === 2 ? `20${explicitDate[3]}` : explicitDate[3])
      : now.getFullYear();
    return { year, monthIndex, day };
  }

  if (lower.includes("depois de amanha")) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    return { year: date.getFullYear(), monthIndex: date.getMonth(), day: date.getDate() };
  }

  if (lower.includes("amanha")) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { year: date.getFullYear(), monthIndex: date.getMonth(), day: date.getDate() };
  }

  if (lower.includes("hoje")) {
    return { year: now.getFullYear(), monthIndex: now.getMonth(), day: now.getDate() };
  }

  return null;
}

function parseTimeFromMessage(message) {
  const match = message.match(/(?:\b(?:as|às)\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*h?\b/i);

  if (!match) {
    return null;
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2] ?? 0),
  };
}

function parseDurationFromMessage(message) {
  const hoursMatch = message.match(/(\d{1,2})\s*h(?:ora)?s?/i);
  const minutesMatch = message.match(/(\d{1,3})\s*min/i);

  if (hoursMatch && minutesMatch) {
    return Number(hoursMatch[1]) * 60 + Number(minutesMatch[1]);
  }

  if (hoursMatch) {
    return Number(hoursMatch[1]) * 60;
  }

  if (minutesMatch) {
    return Number(minutesMatch[1]);
  }

  return 60;
}

function datePartsToKey(parts) {
  if (!parts) {
    return null;
  }

  const month = String(parts.monthIndex + 1).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function buildLocalTitle(message) {
  const participantMatch = message.match(
    /\bcom\s+(.+?)(?=\s+(?:sobre|para|amanha|hoje|depois|dia|as|às)\b|$)/i,
  );
  const topicMatch = message.match(
    /\b(?:sobre|para)\s+(.+?)(?=\s+(?:amanha|hoje|depois|dia|as|às)\b|$)/i,
  );

  if (topicMatch?.[1]) {
    const topic = normalizeText(topicMatch[1]);
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  if (participantMatch?.[1]) {
    return `Reuniao com ${normalizeText(participantMatch[1])}`;
  }

  return "";
}

function buildLocalDescription(message) {
  const topicMatch = message.match(
    /\b(?:sobre|para)\s+(.+?)(?=\s+(?:amanha|hoje|depois|dia|as|às)\b|$)/i,
  );
  if (topicMatch?.[1]) {
    return `Contexto: ${normalizeText(topicMatch[1])}`;
  }
  return "";
}

function createEmptyDraft() {
  return {
    mode: "create_event",
    asked_field: null,
    fields: {
      title: null,
      description: null,
      category: null,
      start_date: null,
      start_time: null,
      end_date: null,
      end_time: null,
      remind_me: null,
      remind_before_minutes: null,
    },
  };
}

function ensureDraftShape(draft) {
  const base = createEmptyDraft();
  return {
    ...base,
    ...(draft ?? {}),
    fields: {
      ...base.fields,
      ...(draft?.fields ?? {}),
    },
  };
}

function getConversationDraft(metadata) {
  return metadata?.draft ? ensureDraftShape(metadata.draft) : null;
}

function clearConversationDraft(metadata = {}) {
  return {
    ...metadata,
    draft: null,
  };
}

function getMissingDraftFields(draft) {
  const normalizedDraft = ensureDraftShape(draft);

  return CREATE_DRAFT_FIELD_ORDER.filter((fieldKey) => {
    if (fieldKey === "remind_before_minutes" && normalizedDraft.fields.remind_me === false) {
      return false;
    }
    return normalizedDraft.fields[fieldKey] === null || normalizedDraft.fields[fieldKey] === undefined;
  });
}

function buildDraftQuestion(fieldKey, categories, draft) {
  switch (fieldKey) {
    case "title":
      return "Qual o titulo do agendamento?";
    case "description":
      return "Qual a descricao ou contexto do agendamento? Se nao quiser adicionar, responda 'sem descricao'.";
    case "category":
      return `Qual categoria devo usar? Opcoes atuais: ${categories.map((category) => category.name).join(", ")}.`;
    case "start_date":
      return "Qual a data de inicio? Pode responder, por exemplo, 'amanha' ou '18/04'.";
    case "start_time":
      return "Qual o horario de inicio?";
    case "end_date":
      return draft.fields.start_date
        ? "Qual a data de termino? Se for no mesmo dia, responda 'mesmo dia'."
        : "Qual a data de termino?";
    case "end_time":
      return "Qual o horario de termino?";
    case "remind_me":
      return "Deseja ativar lembrete? Responda 'sim' ou 'nao'.";
    case "remind_before_minutes":
      return "Com quantos minutos de antecedencia devo lembrar? Exemplo: 15, 30 ou 60.";
    default:
      return "Pode me passar o proximo dado do agendamento?";
  }
}

function formatDateSuggestion(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatTimeSuggestion(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildTitleSuggestions(draft) {
  const descriptionSeed = normalizeText(draft?.fields?.description ?? "").replace(/^Contexto:\s*/i, "");

  if (descriptionSeed) {
    return [
      `Reuniao sobre ${descriptionSeed}`,
      `Alinhamento de ${descriptionSeed}`,
      `Planejamento de ${descriptionSeed}`,
    ];
  }

  return ["Reuniao de alinhamento", "Check-in rapido", "Planejamento semanal"];
}

function buildDescriptionSuggestions(draft) {
  const titleSeed = normalizeText(draft?.fields?.title ?? "");

  if (titleSeed) {
    return [
      `Alinhamento sobre ${titleSeed}`,
      `Revisar pauta e proximos passos de ${titleSeed}`,
      "Sem descricao",
    ];
  }

  return ["Sem descricao", "Alinhamento geral da reuniao", "Definir pauta e responsaveis"];
}

function buildCategorySuggestions(categories) {
  const categoryNames = categories
    .map((category) => normalizeText(category.name))
    .filter(Boolean);

  const uniqueSuggestions = [...new Set([...categoryNames, "Categoria padrao", "Sem preferencia"])];
  return uniqueSuggestions.slice(0, 3);
}

function buildStartDateSuggestions(now) {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  return ["Hoje", "Amanha", formatDateSuggestion(dayAfterTomorrow)].map((value, index) =>
    index === 2 ? value : [value, formatDateSuggestion(index === 0 ? now : tomorrow)].join(" "),
  );
}

function buildEndDateSuggestions(draft, now) {
  const startDate = draft?.fields?.start_date ? new Date(`${draft.fields.start_date}T09:00:00`) : null;
  const nextDay = startDate
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const twoDaysAhead = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate() + 1);

  return ["Mesmo dia", formatDateSuggestion(nextDay), formatDateSuggestion(twoDaysAhead)];
}

function buildStartTimeSuggestions(draft, now) {
  const suggestions = [];
  const currentHour = Math.max(now.getHours() + 1, 9);
  const baseTimes = [currentHour, 14, 16];

  for (const hour of baseTimes) {
    suggestions.push(`${String(Math.min(hour, 22)).padStart(2, "0")}:00`);
  }

  return [...new Set(suggestions)].slice(0, 3);
}

function buildEndTimeSuggestions(draft) {
  const startTime = normalizeText(draft?.fields?.start_time);

  if (!startTime) {
    return ["10:00", "11:00", "12:00"];
  }

  const [hours, minutes] = startTime.split(":").map(Number);
  const baseDate = new Date(2026, 0, 1, hours || 9, minutes || 0, 0, 0);

  return [30, 60, 90].map((duration) => formatTimeSuggestion(addMinutes(baseDate, duration)));
}

function buildReminderPreferenceSuggestions() {
  return ["Sim", "Nao", "Sim, 30 min antes"];
}

function buildReminderMinutesSuggestions() {
  return ["15 min antes", "30 min antes", "60 min antes"];
}

function buildDraftSuggestions(fieldKey, draft, categories, now) {
  switch (fieldKey) {
    case "title":
      return buildTitleSuggestions(draft);
    case "description":
      return buildDescriptionSuggestions(draft);
    case "category":
      return buildCategorySuggestions(categories);
    case "start_date":
      return buildStartDateSuggestions(now);
    case "start_time":
      return buildStartTimeSuggestions(draft, now);
    case "end_date":
      return buildEndDateSuggestions(draft, now);
    case "end_time":
      return buildEndTimeSuggestions(draft);
    case "remind_me":
      return buildReminderPreferenceSuggestions();
    case "remind_before_minutes":
      return buildReminderMinutesSuggestions();
    default:
      return [];
  }
}

function parseReminderPreferenceLocally(message) {
  const normalized = normalizeComparisonText(message);
  if (/\b(sim|quero|ativar|com lembrete)\b/.test(normalized)) {
    return true;
  }
  if (/\b(nao|não|sem lembrete|desativar)\b/.test(normalized)) {
    return false;
  }
  return null;
}

function extractDraftFieldsLocally({ message, draft, categories, now }) {
  const fields = {};
  const askedField = draft?.asked_field ?? null;
  const normalizedMessage = normalizeComparisonText(message);

  if (!draft?.fields.title && (askedField === "title" || detectCreateIntent(message))) {
    const localTitle = buildLocalTitle(message) || normalizeText(message);
    if (localTitle) {
      fields.title = localTitle;
    }
  }

  if (!draft?.fields.description && (askedField === "description" || /sobre|para/i.test(message))) {
    fields.description = wantsNoDescription(message) ? "" : buildLocalDescription(message) || normalizeText(message);
  }

  if (!draft?.fields.category && (normalizedMessage.includes("sem preferencia") || normalizedMessage.includes("categoria padrao"))) {
    fields.category = categories[0]?.name ?? DEFAULT_CATEGORY.name;
  }

  const category = findCategory(categories, message);
  if (!draft?.fields.category && category?.name && normalizedMessage.includes(normalizeComparisonText(category.name))) {
    fields.category = category.name;
  }

  const parsedDate = parseDateFromMessage(message, now);
  if (parsedDate) {
    const dateKey = datePartsToKey(parsedDate);
    if (!draft?.fields.start_date && (askedField === "start_date" || !draft?.fields.start_date)) {
      fields.start_date = dateKey;
    } else if (!draft?.fields.end_date) {
      fields.end_date = dateKey;
    }
  }

  if (/\bmesmo dia\b/i.test(message) && !draft?.fields.end_date) {
    fields.end_date = "same_day";
  }

  const parsedTime = parseTimeFromMessage(message);
  if (parsedTime) {
    const timeKey = `${String(parsedTime.hours).padStart(2, "0")}:${String(parsedTime.minutes).padStart(2, "0")}`;
    if (!draft?.fields.start_time && (askedField === "start_time" || !draft?.fields.start_time)) {
      fields.start_time = timeKey;
    } else if (!draft?.fields.end_time) {
      fields.end_time = timeKey;
    }
  }

  const remindMe = parseReminderPreferenceLocally(message);
  if (remindMe !== null) {
    fields.remind_me = remindMe;
    if (remindMe === false) {
      fields.remind_before_minutes = null;
    }
  }

  const reminderMinutes = message.match(/(\d{1,3})\s*min/i);
  if (reminderMinutes) {
    fields.remind_before_minutes = Number(reminderMinutes[1]);
  }

  return fields;
}

async function extractDraftFieldsWithOpenAI({ message, draft, categories, now }) {
  const categoryOptions = categories.map((category) => `${category.name} (${category.color})`).join(", ");
  const systemPrompt = [
    "Voce ajuda a preencher um rascunho de agendamento em portugues brasileiro.",
    "Extraia apenas os campos que o usuario informou claramente na mensagem atual.",
    "Nao invente dados ausentes.",
    "Para descricao vazia por escolha do usuario, retorne description como string vazia.",
    "Para termino no mesmo dia, retorne end_date como 'same_day'.",
    "Datas devem vir como YYYY-MM-DD e horarios como HH:mm.",
    `Agora: ${now.toISOString()}.`,
    `Categorias disponiveis: ${categoryOptions || "Brainstorm (#7c3aed)"}.`,
    `Rascunho atual: ${JSON.stringify(draft.fields)}.`,
  ].join(" ");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { anyOf: [{ type: "string" }, { type: "null" }] },
      description: { anyOf: [{ type: "string" }, { type: "null" }] },
      category: { anyOf: [{ type: "string" }, { type: "null" }] },
      start_date: { anyOf: [{ type: "string" }, { type: "null" }] },
      start_time: { anyOf: [{ type: "string" }, { type: "null" }] },
      end_date: { anyOf: [{ type: "string" }, { type: "null" }] },
      end_time: { anyOf: [{ type: "string" }, { type: "null" }] },
      remind_me: { anyOf: [{ type: "boolean" }, { type: "null" }] },
      remind_before_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    },
    required: [
      "title",
      "description",
      "category",
      "start_date",
      "start_time",
      "end_date",
      "end_time",
      "remind_me",
      "remind_before_minutes",
    ],
  };

  return createStructuredResponse({
    systemPrompt,
    userPrompt: message,
    schemaName: "assistant_schedule_draft_fields",
    schema,
  });
}

function mergeDraftFields(draft, nextFields, categories) {
  const normalizedDraft = ensureDraftShape(draft);
  const mergedFields = {
    ...normalizedDraft.fields,
  };

  for (const [fieldKey, fieldValue] of Object.entries(nextFields ?? {})) {
    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }

    if (fieldKey === "category") {
      mergedFields.category = findCategory(categories, fieldValue).name;
      continue;
    }

    mergedFields[fieldKey] = fieldValue;
  }

  if (mergedFields.description === null && wantsNoDescription(String(nextFields?.description ?? ""))) {
    mergedFields.description = "";
  }

  if (mergedFields.end_date === "same_day" && mergedFields.start_date) {
    mergedFields.end_date = mergedFields.start_date;
  }

  if (mergedFields.remind_me === false) {
    mergedFields.remind_before_minutes = null;
  }

  return {
    ...normalizedDraft,
    fields: mergedFields,
  };
}

function buildCreateDraftFromMessage({ message, categories, now }) {
  const emptyDraft = createEmptyDraft();
  const seededFields = extractDraftFieldsLocally({ message, draft: emptyDraft, categories, now });

  if (!seededFields.title && detectCreateIntent(message)) {
    const quickTitle = buildLocalTitle(message);
    if (quickTitle) {
      seededFields.title = quickTitle;
    }
  }

  return mergeDraftFields(emptyDraft, seededFields, categories);
}

function buildDraftPreview(draft, categories, existingEvents) {
  const normalizedDraft = ensureDraftShape(draft);
  const category = findCategory(categories, normalizedDraft.fields.category);
  const startDate = normalizedDraft.fields.start_date;
  const endDate = normalizedDraft.fields.end_date;
  const startTime = normalizedDraft.fields.start_time;
  const endTime = normalizedDraft.fields.end_time;

  const startAt = new Date(`${startDate}T${startTime}:00`);
  const endAt = new Date(`${endDate}T${endTime}:00`);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return {
      preview: null,
      validationMessage: "Os horarios informados nao puderam ser entendidos. Vamos revisar data e horario.",
      invalidField: "start_date",
    };
  }

  if (endAt <= startAt) {
    return {
      preview: null,
      validationMessage: "O horario de termino precisa ser depois do inicio. Me diga uma nova data ou horario de termino.",
      invalidField: "end_time",
    };
  }

  const preview = {
    action_type: "create_event",
    event_id: null,
    title: normalizedDraft.fields.title,
    description: normalizedDraft.fields.description || null,
    category: category.name,
    category_color: category.color,
    start_time: startAt.toISOString(),
    end_time: endAt.toISOString(),
    remind_me: normalizedDraft.fields.remind_me,
    remind_before_minutes: normalizedDraft.fields.remind_me
      ? normalizedDraft.fields.remind_before_minutes ?? 15
      : 15,
    conflicts: [],
    original_event: null,
  };

  preview.conflicts = existingEvents
    .filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < endAt && eventEnd > startAt;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
    }));

  return { preview, validationMessage: null, invalidField: null };
}

function buildCollectingReply(draft, categories, now = new Date()) {
  const missingFields = getMissingDraftFields(draft);
  const nextField = missingFields[0] ?? null;
  const nextDraft = {
    ...draft,
    asked_field: nextField,
  };

  return {
    draft: nextDraft,
    suggestions: nextField ? buildDraftSuggestions(nextField, nextDraft, categories, now) : [],
    reply: nextField
      ? buildDraftQuestion(nextField, categories, nextDraft)
      : "Tenho todos os dados do agendamento.",
  };
}

function buildInsightsReply(insightsPayload) {
  const { summary, insights } = insightsPayload;

  if (insights.length === 0) {
    return `Sua agenda esta sob controle. Ha ${summary.upcoming_count} evento(s) futuro(s) e nenhum sinal forte de conflito nos proximos dias.`;
  }

  const highlights = insights
    .slice(0, 3)
    .map((insight) => `- ${insight.title}: ${insight.description}`)
    .join("\n");

  return `Encontrei ${insights.length} ponto(s) de atencao na sua agenda.\n${highlights}`;
}

function formatConversationHistory(messages) {
  return messages
    .slice(-8)
    .map((message) => {
      const prefix = message.role === "assistant" ? "Assistente" : "Usuario";
      return `${prefix}: ${message.content}`;
    })
    .join("\n");
}

async function extractActionWithOpenAI({ message, categories, now, conversationMessages }) {
  const historyText = formatConversationHistory(conversationMessages);
  const categoryOptions = categories.map((category) => `${category.name} (${category.color})`).join(", ");
  const systemPrompt = [
    "Voce interpreta pedidos de agenda em portugues brasileiro.",
    "Responda apenas no schema solicitado.",
    "Classifique como create_event, update_event, ask_insights ou other.",
    "Ao atualizar um evento, use target_title e target_start_hint para identificar o evento atual.",
    "Quando o usuario informar nova data/horario, preencha start_at e end_at completos em ISO.",
    "Se nao houver duracao, use 60 minutos somente para criacao ou quando houver remarcacao de horario sem duracao explicita.",
    `Agora: ${now.toISOString()}.`,
    `Categorias disponiveis: ${categoryOptions || "Brainstorm (#7c3aed)"}.`,
  ].join(" ");

  const userPrompt = [
    historyText ? `Historico recente:\n${historyText}` : null,
    `Mensagem atual:\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: {
        type: "string",
        enum: ["create_event", "update_event", "ask_insights", "other"],
      },
      reply: { type: "string" },
      action: {
        type: "object",
        additionalProperties: false,
        properties: {
          target_title: { type: "string" },
          target_start_hint: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          start_at: { type: "string" },
          end_at: { type: "string" },
          remind_me: { type: "boolean" },
          remind_before_minutes: { type: "integer" },
        },
        required: [
          "target_title",
          "target_start_hint",
          "title",
          "description",
          "category",
          "start_at",
          "end_at",
          "remind_me",
          "remind_before_minutes",
        ],
      },
    },
    required: ["intent", "reply", "action"],
  };

  return createStructuredResponse({
    systemPrompt,
    userPrompt,
    schemaName: "assistant_schedule_action",
    schema,
  });
}

function scoreEventMatch(event, targetTitle, targetStartHint) {
  let score = 0;
  const titleText = normalizeComparisonText(event.title);
  const tokens = tokenize(targetTitle);

  if (tokens.length > 0) {
    const matchedTokens = tokens.filter((token) => titleText.includes(token)).length;
    score += matchedTokens * 3;
  }

  if (targetTitle && titleText.includes(normalizeComparisonText(targetTitle))) {
    score += 4;
  }

  if (targetStartHint) {
    const eventStart = new Date(event.start_time).toISOString().slice(0, 16);
    if (eventStart.startsWith(String(targetStartHint).slice(0, 10))) {
      score += 2;
    }
  }

  return score;
}

function resolveTargetEvent(existingEvents, actionData, conversationMessages) {
  const targetTitle = normalizeText(actionData.target_title);
  const targetStartHint = normalizeText(actionData.target_start_hint);

  if (!targetTitle && !targetStartHint) {
    const referencedEventId = [...conversationMessages]
      .reverse()
      .map((message) => message.metadata?.event_id)
      .find((eventId) => Number.isFinite(Number(eventId)));

    if (referencedEventId) {
      return existingEvents.find((event) => event.id === Number(referencedEventId)) ?? null;
    }

    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const event of existingEvents) {
    const score = scoreEventMatch(event, targetTitle, targetStartHint);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = event;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

function extractUpdateLocally({ message, categories, existingEvents, conversationMessages }) {
  if (!detectUpdateIntent(message)) {
    return null;
  }

  const targetEvent = resolveTargetEvent(
    existingEvents,
    {
      target_title: message,
      target_start_hint: "",
    },
    conversationMessages,
  );

  const timeInfo = parseTimeFromMessage(message);

  if (!targetEvent || !timeInfo) {
    return null;
  }

  const currentStart = new Date(targetEvent.start_time);
  const currentEnd = new Date(targetEvent.end_time);
  const nextStart = new Date(
    currentStart.getFullYear(),
    currentStart.getMonth(),
    currentStart.getDate(),
    timeInfo.hours,
    timeInfo.minutes,
    0,
    0,
  );
  const durationMinutes = Math.max(
    Math.round((currentEnd.getTime() - currentStart.getTime()) / (60 * 1000)),
    15,
  );
  const nextEnd = addMinutes(nextStart, durationMinutes);
  const category = findCategory(categories, targetEvent.category);

  return {
    intent: "update_event",
    reply: `Preparei uma nova versao de ${targetEvent.title} para voce confirmar.`,
    action: {
      target_title: targetEvent.title,
      target_start_hint: targetEvent.start_time,
      title: targetEvent.title,
      description: targetEvent.description ?? "",
      category: category.name,
      start_at: nextStart.toISOString(),
      end_at: nextEnd.toISOString(),
      remind_me: Boolean(targetEvent.remind_me),
      remind_before_minutes: targetEvent.remind_before_minutes ?? 15,
    },
    provider: "local_fallback",
    model: null,
  };
}

function buildUpdatePreview(actionData, categories, existingEvents, conversationMessages) {
  const targetEvent = resolveTargetEvent(existingEvents, actionData, conversationMessages);

  if (!targetEvent) {
    return null;
  }

  const category = findCategory(categories, actionData.category || targetEvent.category);
  const preview = {
    action_type: "update_event",
    event_id: targetEvent.id,
    title: actionData.title || targetEvent.title,
    description:
      actionData.description !== ""
        ? actionData.description
        : targetEvent.description ?? "",
    category: category.name,
    category_color: category.color,
    start_time: actionData.start_at
      ? new Date(actionData.start_at).toISOString()
      : new Date(targetEvent.start_time).toISOString(),
    end_time: actionData.end_at
      ? new Date(actionData.end_at).toISOString()
      : new Date(targetEvent.end_time).toISOString(),
    remind_me:
      typeof actionData.remind_me === "boolean" ? actionData.remind_me : Boolean(targetEvent.remind_me),
    remind_before_minutes:
      Number.isFinite(Number(actionData.remind_before_minutes))
        ? Number(actionData.remind_before_minutes)
        : targetEvent.remind_before_minutes ?? 15,
    original_event: {
      id: targetEvent.id,
      title: targetEvent.title,
      description: targetEvent.description ?? null,
      category: targetEvent.category,
      category_color: targetEvent.category_color,
      start_time: targetEvent.start_time,
      end_time: targetEvent.end_time,
      remind_me: Boolean(targetEvent.remind_me),
      remind_before_minutes: targetEvent.remind_before_minutes ?? 15,
    },
    conflicts: [],
  };

  const previewStart = new Date(preview.start_time);
  const previewEnd = new Date(preview.end_time);
  preview.conflicts = existingEvents
    .filter((event) => event.id !== targetEvent.id)
    .filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < previewEnd && eventEnd > previewStart;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
    }));

  return preview;
}

async function advanceCreateDraftFlow({
  message,
  categories,
  existingEvents,
  conversationMetadata,
}) {
  const now = new Date();
  let draft = getConversationDraft(conversationMetadata) ?? createEmptyDraft();

  let extractedFields = extractDraftFieldsLocally({ message, draft, categories, now });

  try {
    const openAIExtraction = await extractDraftFieldsWithOpenAI({
      message,
      draft,
      categories,
      now,
    });
    extractedFields = {
      ...extractedFields,
      ...(openAIExtraction?.data ?? {}),
    };
  } catch (error) {
    if (error.code !== "missing_openai_key" && error.code !== "openai_request_failed") {
      throw error;
    }
  }

  if (wantsNoDescription(message)) {
    extractedFields.description = "";
  }

  draft = mergeDraftFields(draft, extractedFields, categories);

  const missingFields = getMissingDraftFields(draft);

  if (missingFields.length > 0) {
    const collecting = buildCollectingReply(draft, categories, now);
    return {
      type: "collecting",
      reply: collecting.reply,
      suggestions: collecting.suggestions,
      conversationMetadata: {
        ...conversationMetadata,
        draft: collecting.draft,
      },
    };
  }

  const { preview, validationMessage, invalidField } = buildDraftPreview(
    draft,
    categories,
    existingEvents,
  );

  if (!preview) {
    const invalidDraft = {
      ...draft,
      asked_field: invalidField,
    };
    if (invalidField) {
      invalidDraft.fields[invalidField] = null;
    }

      return {
        type: "collecting",
        reply: validationMessage,
        suggestions: buildDraftSuggestions(invalidField, invalidDraft, categories, now),
        conversationMetadata: {
          ...conversationMetadata,
          draft: invalidDraft,
      },
    };
  }

  return {
    type: "action_preview",
    actionType: "create_event",
    reply: `Fechei o agendamento com todos os dados. Revise e confirme quando estiver certo.`,
    preview,
    conversationMetadata: clearConversationDraft(conversationMetadata),
    provider: getOpenAIConfig().apiKey ? "openai" : "local_fallback",
    model: getOpenAIConfig().apiKey ? getOpenAIConfig().model : null,
  };
}

async function resolveAssistantResponse({
  message,
  categories,
  existingEvents,
  conversationMessages = [],
  conversationMetadata = {},
}) {
  const normalizedMessage = normalizeText(message);
  const now = new Date();
  const insights = buildAgendaInsights(existingEvents, { now });
  const activeDraft = getConversationDraft(conversationMetadata);

  if (!normalizedMessage) {
    return {
      type: "reply",
      reply: "Escreva o que voce quer que eu faca com a sua agenda.",
      insights,
      conversationMetadata,
      provider: "local",
      model: null,
    };
  }

  if (activeDraft) {
    if (isCancelCommand(normalizedMessage)) {
      return {
        type: "reply",
        reply: "Rascunho cancelado. Quando quiser, podemos comecar um novo agendamento.",
        insights,
        conversationMetadata: clearConversationDraft(conversationMetadata),
        provider: "local",
        model: null,
      };
    }

    const collectingResponse = await advanceCreateDraftFlow({
      message: normalizedMessage,
      categories,
      existingEvents,
      conversationMetadata,
    });

    return {
      ...collectingResponse,
      insights,
    };
  }

  if (
    detectAnalysisIntent(normalizedMessage) &&
    !detectCreateIntent(normalizedMessage) &&
    !detectUpdateIntent(normalizedMessage)
  ) {
    return {
      type: "reply",
      reply: buildInsightsReply(insights),
      insights,
      conversationMetadata,
      provider: "local",
      model: null,
    };
  }

  const maybeCreateDraft = buildCreateDraftFromMessage({
    message: normalizedMessage,
    categories,
    now,
  });

  if (detectCreateIntent(normalizedMessage)) {
    const draftConversationMetadata = {
      ...conversationMetadata,
      draft: maybeCreateDraft,
    };

    const collectingResponse = await advanceCreateDraftFlow({
      message: normalizedMessage,
      categories,
      existingEvents,
      conversationMetadata: draftConversationMetadata,
    });

    return {
      ...collectingResponse,
      insights,
    };
  }

  let extraction = null;

  try {
    extraction = await extractActionWithOpenAI({
      message: normalizedMessage,
      categories,
      now,
      conversationMessages,
    });
  } catch (error) {
    if (error.code !== "missing_openai_key" && error.code !== "openai_request_failed") {
      throw error;
    }
  }

  const extractedAction = extraction?.data?.action;

  if (extraction?.data?.intent === "update_event" && extractedAction) {
    const preview = buildUpdatePreview(
      extractedAction,
      categories,
      existingEvents,
      conversationMessages,
    );

    if (preview) {
      return {
        type: "action_preview",
        actionType: "update_event",
        reply: extraction.data.reply || `Preparei uma atualizacao para ${preview.title}.`,
        preview,
        insights,
        conversationMetadata,
        provider: extraction.provider,
        model: extraction.model,
      };
    }
  }

  const localUpdate = extractUpdateLocally({
    message: normalizedMessage,
    categories,
    existingEvents,
    conversationMessages,
  });

  if (localUpdate?.intent === "update_event" && localUpdate.action) {
    const preview = buildUpdatePreview(
      localUpdate.action,
      categories,
      existingEvents,
      conversationMessages,
    );

    if (preview) {
      return {
        type: "action_preview",
        actionType: "update_event",
        reply: localUpdate.reply,
        preview,
        insights,
        conversationMetadata,
        provider: localUpdate.provider,
        model: localUpdate.model,
      };
    }
  }

  return {
    type: "reply",
    reply: buildInsightsReply(insights),
    insights,
    conversationMetadata,
    provider: getOpenAIConfig().apiKey ? "openai_fallback" : "local",
    model: getOpenAIConfig().apiKey ? getOpenAIConfig().model : null,
  };
}

function buildActionExpirationDate() {
  return addMinutes(new Date(), ACTION_TTL_MINUTES);
}

module.exports = {
  buildActionExpirationDate,
  resolveAssistantResponse,
  buildAgendaInsights,
};
