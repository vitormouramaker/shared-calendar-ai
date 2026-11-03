const express = require("express");
const rota = express.Router();
const authMidd = require("../middleware/auth");
const execute = require("../services/execute");
const utils = require("../utils/templates");
const { buildEventUpdateMetadata } = require("../utils/agenda-log");
const {
  resolveAssistantResponse,
  buildActionExpirationDate,
  buildAgendaInsights,
} = require("../services/ai-assistant");

async function getAssistantContext(userId, lookaheadDays = 14) {
  const start = new Date();
  const end = new Date(start.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);
  const [events, categories] = await Promise.all([
    execute.get_events_between(userId, start.toISOString(), end.toISOString()),
    execute.get_user_categories(userId),
  ]);

  return { events, categories };
}

function serializePendingAction(actionRun) {
  if (!actionRun) {
    return null;
  }

  return {
    id: actionRun.id,
    status: actionRun.status,
    expires_at: actionRun.expires_at,
    preview: actionRun.preview,
  };
}

function hasConversationDraft(conversation) {
  return Boolean(conversation?.metadata?.draft);
}

async function ensureCurrentConversation(userId) {
  const existingConversation = await execute.get_current_ai_conversation(userId);
  if (existingConversation) {
    return existingConversation;
  }
  return execute.create_ai_conversation({ userId });
}

async function buildConversationState(userId, conversation) {
  if (!conversation) {
    return {
      conversation: null,
      messages: [],
      pending_action: null,
    };
  }

  const [messages, pendingAction] = await Promise.all([
    execute.get_ai_messages_by_conversation(conversation.id, 40),
    execute.get_latest_pending_ai_action_by_conversation(userId, conversation.id),
  ]);

  return {
    conversation,
    messages,
    pending_action: serializePendingAction(pendingAction),
  };
}

async function resolveConversationForAction(userId, actionRun) {
  if (actionRun.conversation_id) {
    const actionConversation = await execute.get_ai_conversation_by_id(actionRun.conversation_id, userId);
    if (actionConversation) {
      return actionConversation;
    }
  }

  return ensureCurrentConversation(userId);
}

async function startNewConversation(userId) {
  const currentConversation = await execute.get_current_ai_conversation(userId);

  if (!currentConversation) {
    return execute.create_ai_conversation({ userId });
  }

  const latestMessages = await execute.get_ai_messages_by_conversation(currentConversation.id, 1);
  const shouldArchive = latestMessages.length > 0 || hasConversationDraft(currentConversation);

  if (!shouldArchive) {
    return currentConversation;
  }

  await execute.archive_current_ai_conversations(userId);
  return execute.create_ai_conversation({ userId });
}

async function appendConversationMessage({
  conversationId,
  role,
  content,
  messageType = "text",
  metadata = {},
}) {
  const message = await execute.create_ai_message({
    conversationId,
    role,
    messageType,
    content,
    metadata,
  });
  await execute.touch_ai_conversation(conversationId);
  return message;
}

async function logAiAgendaAction({
  ownerId,
  actionRunId,
  userPrompt,
  event,
  actionType,
  metadata = {},
}) {
  await execute.create_agenda_log({
    ownerId,
    actorUserId: null,
    actorName: "Assistente IA",
    actorUsername: null,
    actionType,
    targetType: "event",
    targetId: event.id,
    targetTitle: event.title,
    metadata: {
      source: "assistant_ai",
      action_run_id: actionRunId,
      user_prompt: userPrompt,
      start_time: event.start_time,
      end_time: event.end_time,
      category: event.category,
      ...metadata,
    },
  });
}

rota.use(authMidd);

rota.get("/conversation/current", async (req, res) => {
  try {
    const conversation = await ensureCurrentConversation(req.userId);
    const state = await buildConversationState(req.userId, conversation);
    return res.json(utils.ok(state));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /ai/conversation/current"));
  }
});

rota.get("/conversations/recent", async (req, res) => {
  try {
    const conversations = await execute.list_recent_ai_conversations(req.userId, 12);
    return res.json(utils.ok({ conversations }));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /ai/conversations/recent"));
  }
});

rota.get("/conversations/:id", async (req, res) => {
  try {
    const conversationId = Number(req.params.id);

    if (!Number.isFinite(conversationId)) {
      return res.status(400).json(utils.fail("Conversa invalida."));
    }

    const conversation = await execute.get_ai_conversation_by_id(conversationId, req.userId);

    if (!conversation) {
      return res.status(404).json(utils.fail("Conversa nao encontrada."));
    }

    const state = await buildConversationState(req.userId, conversation);
    return res.json(utils.ok(state));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /ai/conversations/:id"));
  }
});

rota.post("/conversation/new", async (req, res) => {
  try {
    const conversation = await startNewConversation(req.userId);
    const state = await buildConversationState(req.userId, conversation);
    return res.json(utils.ok(state, "Nova conversa iniciada."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /ai/conversation/new"));
  }
});

rota.get("/insights", async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query?.days ?? 14) || 14, 1), 30);
    const { events } = await getAssistantContext(req.userId, days);
    const insights = buildAgendaInsights(events, { now: new Date(), lookaheadDays: days });
    return res.json(utils.ok(insights));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /ai/insights"));
  }
});

rota.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();

    if (!message) {
      return res.status(400).json(utils.fail("Informe uma mensagem para o assistente."));
    }

    const conversation = await ensureCurrentConversation(req.userId);
    const conversationMessages = await execute.get_ai_messages_by_conversation(conversation.id, 20);
    await appendConversationMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
    });

    const { events, categories } = await getAssistantContext(req.userId, 30);
    const assistantResponse = await resolveAssistantResponse({
      message,
      categories,
      existingEvents: events,
      conversationMessages,
      conversationMetadata: conversation.metadata ?? {},
    });

    await execute.update_ai_conversation_metadata(
      conversation.id,
      assistantResponse.conversationMetadata ?? {},
    );

    if (assistantResponse.type !== "action_preview") {
      const assistantMetadata = {
        response_type: assistantResponse.type,
        insight_count: assistantResponse.insights?.insights?.length ?? 0,
      };

      if (assistantResponse.conversationMetadata?.draft) {
        assistantMetadata.draft = assistantResponse.conversationMetadata.draft;
      }

      if (Array.isArray(assistantResponse.suggestions) && assistantResponse.suggestions.length > 0) {
        assistantMetadata.suggestions = assistantResponse.suggestions;
      }

      await appendConversationMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: assistantResponse.reply,
        metadata: assistantMetadata,
      });

      return res.json(
        utils.ok({
          conversation_id: conversation.id,
          reply: assistantResponse.reply,
          insights: assistantResponse.insights,
          pending_action: null,
        }),
      );
    }

    const actionRun = await execute.create_ai_action_run({
      userId: req.userId,
      conversationId: conversation.id,
      actionType: assistantResponse.actionType,
      status: "pending",
      source: "assistant",
      userPrompt: message,
      assistantMessage: assistantResponse.reply,
      preview: assistantResponse.preview,
      provider: assistantResponse.provider,
      modelName: assistantResponse.model,
      expiresAt: buildActionExpirationDate().toISOString(),
    });

    await appendConversationMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: assistantResponse.reply,
      messageType: "action_preview",
      metadata: {
        action_run_id: actionRun.id,
        pending_action: {
          id: actionRun.id,
          status: actionRun.status,
          expires_at: actionRun.expires_at,
          preview: actionRun.preview,
        },
      },
    });

    return res.json(
      utils.ok({
        conversation_id: conversation.id,
        reply: assistantResponse.reply,
        insights: assistantResponse.insights,
        pending_action: {
          id: actionRun.id,
          status: actionRun.status,
          expires_at: actionRun.expires_at,
          preview: actionRun.preview,
        },
      }),
    );
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /ai/chat"));
  }
});

rota.post("/actions/:id/confirm", async (req, res) => {
  try {
    const actionId = Number(req.params.id);

    if (!Number.isFinite(actionId)) {
      return res.status(400).json(utils.fail("Acao da IA invalida."));
    }

    const actionRun = await execute.get_ai_action_run_by_id(actionId, req.userId);

    if (!actionRun) {
      return res.status(404).json(utils.fail("Acao da IA nao encontrada."));
    }

    if (actionRun.status !== "pending") {
      return res.status(409).json(utils.fail("Esta acao da IA nao esta mais pendente."));
    }

    if (new Date(actionRun.expires_at) <= new Date()) {
      await execute.update_ai_action_status({
        id: actionRun.id,
        userId: req.userId,
        status: "expired",
        errorMessage: "Prazo de confirmacao expirado.",
      });
      return res.status(409).json(utils.fail("A confirmacao expirou. Gere uma nova sugestao."));
    }

    const preview = actionRun.preview ?? {};

    if (!preview.title || !preview.start_time || !preview.end_time) {
      return res.status(422).json(utils.fail("A sugestao da IA esta incompleta."));
    }

    const conversation = await resolveConversationForAction(req.userId, actionRun);

    await execute.update_ai_action_status({
      id: actionRun.id,
      userId: req.userId,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    });

    let resultEvent;
    let resultMessage;
    let agendaActionType;
    let agendaMetadata = {};

    try {
      if (preview.action_type === "update_event" && preview.event_id) {
        const previousEvent = await execute.get_event_by_id(preview.event_id, req.userId);

        if (!previousEvent) {
          await execute.update_ai_action_status({
            id: actionRun.id,
            userId: req.userId,
            status: "failed",
            errorMessage: "O evento original nao foi encontrado.",
          });
          return res.status(404).json(utils.fail("O evento original nao foi encontrado."));
        }

        resultEvent = await execute.update_event(
          preview.event_id,
          preview.title,
          preview.description,
          preview.category || "Brainstorm",
          preview.category_color || "#7c3aed",
          preview.start_time,
          preview.end_time,
          preview.remind_me ?? true,
          preview.remind_before_minutes ?? 15,
          req.userId,
        );

        if (!resultEvent) {
          await execute.update_ai_action_status({
            id: actionRun.id,
            userId: req.userId,
            status: "failed",
            errorMessage: "Nao foi possivel atualizar o evento original.",
          });
          return res.status(404).json(utils.fail("Nao foi possivel atualizar o evento original."));
        }

        agendaActionType = "event_updated";
        agendaMetadata = buildEventUpdateMetadata(previousEvent, resultEvent);
        resultMessage = `${resultEvent.title} foi atualizado pela confirmacao da IA.`;
      } else {
        resultEvent = await execute.create_event(
          req.userId,
          preview.title,
          preview.description,
          preview.category || "Brainstorm",
          preview.category_color || "#7c3aed",
          preview.start_time,
          preview.end_time,
          preview.remind_me ?? true,
          preview.remind_before_minutes ?? 15,
        );

        agendaActionType = "event_created";
        resultMessage = `${resultEvent.title} foi criado pela confirmacao da IA.`;
      }

      await logAiAgendaAction({
        ownerId: req.userId,
        actionRunId: actionRun.id,
        userPrompt: actionRun.user_prompt,
        event: resultEvent,
        actionType: agendaActionType,
        metadata: agendaMetadata,
      });
    } catch (error) {
      await execute.update_ai_action_status({
        id: actionRun.id,
        userId: req.userId,
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    }

    const updatedAction = await execute.update_ai_action_status({
      id: actionRun.id,
      userId: req.userId,
      status: "executed",
      executedAt: new Date().toISOString(),
      result: {
        event_id: resultEvent.id,
        start_time: resultEvent.start_time,
        end_time: resultEvent.end_time,
        action_type: preview.action_type,
      },
    });

    if (conversation) {
      await appendConversationMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: resultMessage,
        messageType: "action_result",
        metadata: {
          action_run_id: actionRun.id,
          action_type: preview.action_type,
          event_id: resultEvent.id,
        },
      });
    }

    return res.json(
      utils.ok(
        {
          action: updatedAction,
          event: resultEvent,
        },
        preview.action_type === "update_event"
          ? "Evento atualizado a partir da confirmacao da IA."
          : "Evento criado a partir da confirmacao da IA.",
      ),
    );
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /ai/actions/:id/confirm"));
  }
});

rota.post("/actions/:id/cancel", async (req, res) => {
  try {
    const actionId = Number(req.params.id);

    if (!Number.isFinite(actionId)) {
      return res.status(400).json(utils.fail("Acao da IA invalida."));
    }

    const actionRun = await execute.get_ai_action_run_by_id(actionId, req.userId);

    if (!actionRun) {
      return res.status(404).json(utils.fail("Acao da IA nao encontrada."));
    }

    if (actionRun.status !== "pending") {
      return res.status(409).json(utils.fail("Esta acao da IA nao pode mais ser cancelada."));
    }

    const conversation = await resolveConversationForAction(req.userId, actionRun);

    const updated = await execute.update_ai_action_status({
      id: actionRun.id,
      userId: req.userId,
      status: "cancelled",
      errorMessage: "Sugestao cancelada pelo usuario.",
    });

    if (conversation) {
      await appendConversationMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "Sugestao descartada. Se quiser, eu monto outra alternativa.",
        messageType: "action_result",
        metadata: {
          action_run_id: actionRun.id,
          action_type: actionRun.action_type,
        },
      });
    }

    return res.json(utils.ok(updated, "Sugestao cancelada."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /ai/actions/:id/cancel"));
  }
});

module.exports = rota;
