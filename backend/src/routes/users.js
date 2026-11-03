const express = require("express");
const rota = express.Router();
const execute = require("../services/execute");
const authMidd = require("../middleware/auth");
const { verifyToken } = require("../security/auth");
const utils = require("../utils/templates");
const { buildEventUpdateMetadata } = require("../utils/agenda-log");

function resolveOptionalUserId(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    return decoded.id ?? null;
  } catch {
    return null;
  }
}

function buildAgendaVisibilitySummary(owner, viewerUserId, accessGrant) {
  if (!owner.is_private) {
    return {
      name: owner.name,
      username: owner.username,
      is_private: false,
      can_view: true,
      can_edit: false,
      permission_level: "view",
      relationship: "public",
    };
  }

  if (viewerUserId === owner.id) {
    return {
      name: owner.name,
      username: owner.username,
      is_private: true,
      can_view: true,
      can_edit: true,
      permission_level: "edit",
      relationship: "owner",
    };
  }

  return {
    name: owner.name,
    username: owner.username,
    is_private: true,
    can_view: Boolean(accessGrant),
    can_edit: accessGrant?.permission_level === "edit",
    permission_level: accessGrant?.permission_level ?? "view",
    relationship: accessGrant ? "granted" : "private",
  };
}

// GET /users/:username/summary
rota.get("/:username/summary", async (req, res) => {
  try {
    const normalizedUsername = String(req.params.username)
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const viewerUserId = resolveOptionalUserId(req);
    const owner = await execute.find_user_for_grant(normalizedUsername);

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    const accessGrant =
      viewerUserId && viewerUserId !== owner.id
        ? await execute.find_valid_grant(owner.id, viewerUserId)
        : null;

    return res.json(
      utils.ok(buildAgendaVisibilitySummary(owner, viewerUserId, accessGrant)),
    );
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /users/:username/summary"));
  }
});

// GET /users/:username/agenda?date=YYYY-MM-DD
// Retorna agenda publica sem login e agenda privada somente quando houver grant valido
rota.get("/:username/agenda", async (req, res) => {
  try {
    const { username } = req.params;
    const { date, year, month } = req.query;

    if (!date && !(year && month)) {
      return res.status(400).json(utils.fail("Informe a data ou year+month."));
    }

    const normalizedUsername = String(username)
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const viewerUserId = resolveOptionalUserId(req);
    const owner = await execute.find_user_for_grant(normalizedUsername);

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!owner.is_private) {
      const publicEvents =
        date != null
          ? await execute.get_public_agenda(normalizedUsername, date)
          : await execute.get_public_agenda_by_month(
              normalizedUsername,
              Number(year),
              Number(month),
            );
      return res.json(utils.ok(publicEvents));
    }

    if (viewerUserId === owner.id) {
      const ownEvents =
        date != null
          ? await execute.get_events_by_date(owner.id, date)
          : await execute.get_events_by_month(
              owner.id,
              Number(year),
              Number(month),
            );
      return res.json(utils.ok(ownEvents));
    }

    if (!viewerUserId) {
      return res.status(403).json(utils.fail("Esta agenda é privada."));
    }

    const hasAccess = await execute.check_access(owner.id, viewerUserId);

    if (!hasAccess.length) {
      return res.status(403).json(utils.fail("Esta agenda é privada."));
    }

    const grantedEvents =
      date != null
        ? await execute.get_granted_agenda(
            normalizedUsername,
            date,
            viewerUserId,
          )
        : await execute.get_granted_agenda_by_month(
            normalizedUsername,
            Number(year),
            Number(month),
            viewerUserId,
          );
    return res.json(utils.ok(grantedEvents));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /users/:username/agenda"));
  }
});

rota.use(authMidd);

async function resolveAgendaAccess(username, viewerUserId) {
  const normalizedUsername = String(username)
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const owner = await execute.find_user_for_grant(normalizedUsername);

  if (!owner) {
    return { owner: null, grant: null, isOwner: false };
  }

  const isOwner = owner.id === viewerUserId;
  const grant = isOwner
    ? null
    : await execute.find_valid_grant(owner.id, viewerUserId);

  return { owner, grant, isOwner };
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

  await execute.create_agenda_log({
    ownerId,
    actorUserId: actorId,
    actorName: actorProfile?.name ?? "Usuario",
    actorUsername: actorProfile?.username ?? null,
    actionType,
    targetType,
    targetId,
    targetTitle,
    metadata,
  });
}

// GET /users/me
rota.get("/me", async (req, res) => {
  try {
    const profile = await execute.get_profile(req.userId);
    if (!profile) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }
    return res.json(utils.ok(profile));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /users/me"));
  }
});

rota.get("/me/logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query?.limit ?? 100) || 100, 200);
    const logs = await execute.get_agenda_logs(req.userId, limit);
    return res.json(utils.ok(logs));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /users/me/logs"));
  }
});

rota.get("/:username/events/:id", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && !grant) {
      return res
        .status(403)
        .json(utils.fail("Você não possui acesso a esta agenda."));
    }

    const event = await execute.get_event_by_id(req.params.id, owner.id);

    if (!event) {
      return res.status(404).json(utils.fail("Evento não encontrado."));
    }

    return res.json(utils.ok(event));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /users/:username/events/:id"));
  }
});

rota.get("/:username/categories", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && !grant) {
      return res
        .status(403)
        .json(utils.fail("Você não possui acesso a esta agenda."));
    }

    const categories = await execute.get_user_categories(owner.id);
    return res.json(utils.ok(categories));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /users/:username/categories"));
  }
});

rota.get("/:username/logs", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && !grant) {
      return res
        .status(403)
        .json(utils.fail("Você não possui acesso a esta agenda."));
    }

    const limit = Math.min(Number(req.query?.limit ?? 100) || 100, 200);
    const logs = await execute.get_agenda_logs(owner.id, limit);
    return res.json(utils.ok(logs));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /users/:username/logs"));
  }
});

rota.post("/:username/events", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && grant?.permission_level !== "edit") {
      return res
        .status(403)
        .json(utils.fail("Você não possui permissão para editar esta agenda."));
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

    if (!title || !start_time || !end_time) {
      return res
        .status(400)
        .json(utils.fail("Título, início e fim são obrigatórios."));
    }

    const event = await execute.create_event(
      owner.id,
      title,
      description || null,
      category || "Brainstorm",
      category_color || "#7c3aed",
      start_time,
      end_time,
      remind_me || false,
      remind_before_minutes ?? 15,
    );

    await logAgendaAction({
      ownerId: owner.id,
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
    return res
      .status(500)
      .json(utils.errorHandle(error, "POST /users/:username/events"));
  }
});

rota.put("/:username/events/:id", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && grant?.permission_level !== "edit") {
      return res
        .status(403)
        .json(utils.fail("Você não possui permissão para editar esta agenda."));
    }

    const previousEvent = await execute.get_event_by_id(
      req.params.id,
      owner.id,
    );

    if (!previousEvent) {
      return res.status(404).json(utils.fail("Evento não encontrado."));
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
      owner.id,
    );

    if (!event) {
      return res.status(404).json(utils.fail("Evento não encontrado."));
    }

    const metadata = buildEventUpdateMetadata(previousEvent, event);

    if (metadata.changed_fields.length > 0) {
      await logAgendaAction({
        ownerId: owner.id,
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
    return res
      .status(500)
      .json(utils.errorHandle(error, "PUT /users/:username/events/:id"));
  }
});

rota.delete("/:username/events/:id", async (req, res) => {
  try {
    const { owner, grant, isOwner } = await resolveAgendaAccess(
      req.params.username,
      req.userId,
    );

    if (!owner) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    if (!isOwner && grant?.permission_level !== "edit") {
      return res
        .status(403)
        .json(utils.fail("Você não possui permissão para editar esta agenda."));
    }

    const previousEvent = await execute.get_event_by_id(
      req.params.id,
      owner.id,
    );

    if (!previousEvent) {
      return res.status(404).json(utils.fail("Evento não encontrado."));
    }

    await execute.delete_event(req.params.id, owner.id);

    await logAgendaAction({
      ownerId: owner.id,
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

    return res.json(utils.ok(null, "Evento excluído."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "DELETE /users/:username/events/:id"));
  }
});

// PUT /users/me
rota.put("/me", async (req, res) => {
  try {
    const currentProfile = await execute.get_profile(req.userId);

    if (!currentProfile) {
      return res.status(404).json(utils.fail("Usuário não encontrado."));
    }

    const nextName = String(req.body?.name ?? currentProfile.name).trim();
    const nextUsername = String(req.body?.username ?? currentProfile.username)
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const nextEmail = String(req.body?.email ?? currentProfile.email)
      .trim()
      .toLowerCase();
    const nextIsPrivate =
      typeof req.body?.is_private === "boolean"
        ? req.body.is_private
        : currentProfile.is_private;
    const nextAvatarUrl =
      typeof req.body?.avatar_url === "string"
        ? String(req.body.avatar_url).trim() || null
        : (currentProfile.avatar_url ?? null);
    const nextNotifyEventReminders =
      typeof req.body?.notify_event_reminders === "boolean"
        ? req.body.notify_event_reminders
        : currentProfile.notify_event_reminders;
    const nextNotifyShareUpdates =
      typeof req.body?.notify_share_updates === "boolean"
        ? req.body.notify_share_updates
        : currentProfile.notify_share_updates;
    const nextNotifyPushEnabled =
      typeof req.body?.notify_push_enabled === "boolean"
        ? req.body.notify_push_enabled
        : currentProfile.notify_push_enabled;

    if (!nextName || !nextUsername || !nextEmail) {
      return res
        .status(400)
        .json(utils.fail("Nome, username e e-mail são obrigatórios."));
    }

    const [existingEmailRows, existingUsernameRows] = await Promise.all([
      execute.find_by_email(nextEmail),
      execute.find_by_username(nextUsername),
    ]);

    const emailBelongsToAnotherUser =
      existingEmailRows.length > 0 && existingEmailRows[0].id !== req.userId;
    const usernameBelongsToAnotherUser =
      existingUsernameRows.length > 0 &&
      existingUsernameRows[0].id !== req.userId;

    if (emailBelongsToAnotherUser) {
      return res.status(409).json(utils.fail("Esse e-mail já está em uso."));
    }

    if (usernameBelongsToAnotherUser) {
      return res.status(409).json(utils.fail("Esse username já está em uso."));
    }

    const profile = await execute.update_profile(
      req.userId,
      nextName,
      nextUsername,
      nextEmail,
      nextIsPrivate,
      nextAvatarUrl,
      nextNotifyEventReminders,
      nextNotifyShareUpdates,
      nextNotifyPushEnabled,
    );
    return res.json(utils.ok(profile, "Perfil atualizado."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "PUT /users/me"));
  }
});

// POST /users/me/push-tokens
rota.post("/me/push-tokens", async (req, res) => {
  try {
    const expoPushToken = String(req.body?.expo_push_token ?? "").trim();
    const platform =
      String(req.body?.platform ?? "")
        .trim()
        .toLowerCase() || null;
    const deviceName = String(req.body?.device_name ?? "").trim() || null;

    if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(expoPushToken)) {
      return res.status(400).json(utils.fail("Token push invalido."));
    }

    const pushToken = await execute.upsert_user_push_token(
      req.userId,
      expoPushToken,
      platform,
      deviceName,
    );

    return res.json(utils.ok(pushToken, "Dispositivo registrado para push."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "POST /users/me/push-tokens"));
  }
});

// DELETE /users/me/push-tokens
rota.delete("/me/push-tokens", async (req, res) => {
  try {
    const expoPushToken = String(req.body?.expo_push_token ?? "").trim();

    if (!expoPushToken) {
      return res.status(400).json(utils.fail("Informe o token push."));
    }

    await execute.delete_user_push_token(req.userId, expoPushToken);
    return res.json(utils.ok(null, "Dispositivo removido do push."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "DELETE /users/me/push-tokens"));
  }
});

module.exports = rota;
