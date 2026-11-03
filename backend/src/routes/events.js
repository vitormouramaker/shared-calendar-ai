const express = require("express");
const rota = express.Router();
const execute = require("../services/execute");
const authMidd = require("../middleware/auth");
const utils = require("../utils/templates");
const { buildEventUpdateMetadata } = require("../utils/agenda-log");

function describeActionNotification(actionType, targetTitle, actorName) {
  const t = targetTitle ? `"${targetTitle}"` : "";
  switch (actionType) {
    case "event_created":
      return `${actorName} criou o evento ${t}`;
    case "event_updated":
      return `${actorName} atualizou o evento ${t}`;
    case "event_deleted":
      return `${actorName} removeu o evento ${t}`;
    default:
      return `${actorName} realizou uma acao na agenda`;
  }
}

async function logAgendaAction({
  ownerId,
  actorId,
  actionType,
  targetType,
  targetId = null,
  targetTitle = null,
  metadata = {},
}) {
  const actorProfile = await execute.get_profile(actorId);
  const actorName = actorProfile?.name ?? "Usuario";

  await execute.create_agenda_log({
    ownerId,
    actorUserId: actorId,
    actorName,
    actorUsername: actorProfile?.username ?? null,
    actionType,
    targetType,
    targetId,
    targetTitle,
    metadata,
  });

  // Notificar guests ativos da agenda do owner sobre a atividade
  try {
    const guestIds = await execute.get_active_guest_ids(ownerId);
    if (guestIds.length > 0) {
      const ownerProfile = ownerId !== actorId ? await execute.get_profile(ownerId) : actorProfile;
      const body = describeActionNotification(actionType, targetTitle, actorName);
      const title = `Atividade na agenda de ${ownerProfile?.name ?? "usuario"}`;
      await Promise.all(
        guestIds.map((guestId) =>
          execute.create_notification(guestId, title, body, actionType, "/agenda/logs")
        )
      );
    }
  } catch (err) {
    console.error("[events] failed to notify guests of agenda activity", { message: err.message });
  }
}

rota.use(authMidd);

rota.get("/", async (req, res) => {
  try {
    const { date, year, month } = req.query;

    if (date) {
      const events = await execute.get_events_by_date(req.userId, date);
      return res.json(utils.ok(events));
    }

    if (year && month) {
      const events = await execute.get_events_by_month(req.userId, Number(year), Number(month));
      return res.json(utils.ok(events));
    }

    return res.status(400).json(utils.fail("Informe date ou year+month."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /events"));
  }
});

rota.get("/:id", async (req, res) => {
  try {
    const event = await execute.get_event_by_id(req.params.id, req.userId);

    if (!event) {
      return res.status(404).json(utils.fail("Evento nao encontrado."));
    }

    return res.json(utils.ok(event));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /events/:id"));
  }
});

rota.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      category_color,
      start_time,
      end_time,
      remind_me,
      remind_before_minutes,
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json(utils.fail("Titulo, inicio e fim sao obrigatorios."));
    }

    const event = await execute.create_event(
      req.userId,
      title,
      description || null,
      category || "Brainstorm",
      category_color || "#7c3aed",
      start_time,
      end_time,
      remind_me || false,
      remind_before_minutes ?? 15
    );

    await logAgendaAction({
      ownerId: req.userId,
      actorId: req.userId,
      actionType: "event_created",
      targetType: "event",
      targetId: event.id,
      targetTitle: event.title,
      metadata: {
        start_time: event.start_time,
        end_time: event.end_time,
        category: event.category,
      },
    });

    return res.status(201).json(utils.ok(event, "Evento criado com sucesso!"));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /events"));
  }
});

rota.put("/:id", async (req, res) => {
  try {
    const previousEvent = await execute.get_event_by_id(req.params.id, req.userId);

    if (!previousEvent) {
      return res.status(404).json(utils.fail("Evento nao encontrado."));
    }

    const {
      title,
      description,
      category,
      category_color,
      start_time,
      end_time,
      remind_me,
      remind_before_minutes,
    } = req.body;

    const event = await execute.update_event(
      req.params.id,
      title,
      description,
      category,
      category_color,
      start_time,
      end_time,
      remind_me,
      remind_before_minutes ?? 15,
      req.userId
    );

    if (!event) {
      return res.status(404).json(utils.fail("Evento nao encontrado."));
    }

    const metadata = buildEventUpdateMetadata(previousEvent, event);

    if (metadata.changed_fields.length > 0) {
      await logAgendaAction({
        ownerId: req.userId,
        actorId: req.userId,
        actionType: "event_updated",
        targetType: "event",
        targetId: event.id,
        targetTitle: event.title,
        metadata,
      });
    }

    return res.json(utils.ok(event, "Evento atualizado."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "PUT /events/:id"));
  }
});

rota.delete("/:id", async (req, res) => {
  try {
    const previousEvent = await execute.get_event_by_id(req.params.id, req.userId);

    if (!previousEvent) {
      return res.status(404).json(utils.fail("Evento nao encontrado."));
    }

    await execute.delete_event(req.params.id, req.userId);

    await logAgendaAction({
      ownerId: req.userId,
      actorId: req.userId,
      actionType: "event_deleted",
      targetType: "event",
      targetId: previousEvent.id,
      targetTitle: previousEvent.title,
      metadata: {
        start_time: previousEvent.start_time,
        end_time: previousEvent.end_time,
      },
    });

    return res.json(utils.ok(null, "Evento excluido."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "DELETE /events/:id"));
  }
});

module.exports = rota;
