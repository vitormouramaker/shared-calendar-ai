// Testes do assistente sem banco e sem chave da OpenAI (caminho local).
//   npm test
delete process.env.OPENAI_API_KEY;

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAgendaInsights } = require("../src/services/ai-insights");
const { resolveAssistantResponse } = require("../src/services/ai-assistant");

const categories = [
  { id: 1, name: "Trabalho", color: "#7C3AED" },
  { id: 2, name: "Pessoal", color: "#10B981" },
];

function at(hoursFromNow, minutes = 60) {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return {
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + minutes * 60 * 1000).toISOString(),
  };
}

test("insights apontam conflito entre eventos sobrepostos", () => {
  const events = [
    { id: 1, title: "Reunião A", description: "x", remind_me: true, ...at(24, 90) },
    { id: 2, title: "Reunião B", description: "y", remind_me: true, ...at(25, 60) },
  ];

  const result = buildAgendaInsights(events, { now: new Date() });

  assert.equal(result.summary.conflict_count, 1);
  assert.ok(result.insights.some((insight) => insight.type === "conflict"));
});

test("agenda vazia não gera alerta", () => {
  const result = buildAgendaInsights([], { now: new Date() });
  assert.equal(result.insights.length, 0);
});

test("pedido de análise responde com o resumo local", async () => {
  const response = await resolveAssistantResponse({
    message: "analise minha semana",
    categories,
    existingEvents: [],
  });

  assert.equal(response.type, "reply");
  assert.match(response.reply, /agenda/i);
});

test("pedido de agendamento abre um rascunho e pergunta o que falta", async () => {
  const response = await resolveAssistantResponse({
    message: "agendar reuniao com Paulo amanha as 15h sobre orcamento",
    categories,
    existingEvents: [],
  });

  assert.equal(response.type, "collecting");
  const draft = response.conversationMetadata.draft;
  assert.equal(draft.mode, "create_event");
  assert.equal(draft.fields.start_time, "15:00");
  assert.ok(draft.fields.start_date, "a data de início deveria ter sido entendida");
  assert.ok(Array.isArray(response.suggestions));
});

test("remarcar um evento existente gera prévia de atualização", async () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const existing = {
    id: 42,
    title: "Retrospectiva da sprint",
    description: "x",
    category: "Trabalho",
    category_color: "#7C3AED",
    remind_me: true,
    remind_before_minutes: 15,
    start_time: tomorrow.toISOString(),
    end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
  };

  const response = await resolveAssistantResponse({
    message: "remarcar a retrospectiva para as 17h",
    categories,
    existingEvents: [existing],
  });

  assert.equal(response.type, "action_preview");
  assert.equal(response.actionType, "update_event");
  assert.equal(response.preview.event_id, 42);
  assert.equal(new Date(response.preview.start_time).getHours(), 17);
});

test("cancelar descarta o rascunho em andamento", async () => {
  const first = await resolveAssistantResponse({
    message: "quero agendar treino amanha as 7h",
    categories,
    existingEvents: [],
  });

  const second = await resolveAssistantResponse({
    message: "cancelar",
    categories,
    existingEvents: [],
    conversationMetadata: first.conversationMetadata,
  });

  assert.equal(second.type, "reply");
  assert.equal(second.conversationMetadata.draft, null);
});
