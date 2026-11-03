const express = require("express");
const rota = express.Router();
const execute = require("../services/execute");
const authMidd = require("../middleware/auth");
const { sendPushNotifications } = require("../server/push");
const utils = require("../utils/templates");

rota.use(authMidd);

async function syncExpiredInvites() {
  try {
    await execute.expire_stale_invites();
  } catch (error) {
    console.error("[access] failed to sync expired invites", {
      message: error.message,
      code: error.code,
    });
  }
}

async function notifyUser(userId, payload) {
  try {
    const profile = await execute.get_profile(userId);

    if (!profile?.notify_push_enabled || !profile?.notify_share_updates) {
      return;
    }

    const tokens = await execute.get_user_push_tokens(userId);
    const result = await sendPushNotifications(tokens, payload);

    if (result.invalidTokens.length > 0) {
      await execute.delete_push_tokens(result.invalidTokens);
    }
  } catch (error) {
    console.error("[access] failed to send push notification", {
      userId,
      message: error.message,
    });
  }
}

async function saveNotification(userId, title, body, type, route) {
  try {
    await execute.create_notification(userId, title, body, type, route);
  } catch (error) {
    console.error("[access] failed to save notification", {
      userId,
      message: error.message,
    });
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

rota.get("/guests", async (req, res) => {
  try {
    await syncExpiredInvites();
    const guests = await execute.get_guests(req.userId);
    return res.json(utils.ok(guests));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /access/guests"));
  }
});

rota.get("/invites/sent", async (req, res) => {
  try {
    await syncExpiredInvites();
    const invites = await execute.get_sent_invites(req.userId);
    return res.json(utils.ok(invites));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /access/invites/sent"));
  }
});

rota.get("/invites/sent/history", async (req, res) => {
  try {
    await syncExpiredInvites();
    const invites = await execute.get_sent_invites_history(req.userId);
    return res.json(utils.ok(invites));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /access/invites/sent/history"));
  }
});

rota.get("/invites/received", async (req, res) => {
  try {
    await syncExpiredInvites();
    const invites = await execute.get_received_invites(req.userId);
    return res.json(utils.ok(invites));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /access/invites/received"));
  }
});

rota.get("/invites/received/history", async (req, res) => {
  try {
    await syncExpiredInvites();
    const invites = await execute.get_received_invites_history(req.userId);
    return res.json(utils.ok(invites));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /access/invites/received/history"));
  }
});

rota.get("/shared-with-me", async (req, res) => {
  try {
    await syncExpiredInvites();
    const owners = await execute.get_shared_with_me(req.userId);
    return res.json(utils.ok(owners));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "GET /access/shared-with-me"));
  }
});

rota.post("/invites", async (req, res) => {
  try {
    await syncExpiredInvites();
    const {
      username,
      permission_level = "view",
      is_permanent = false,
      expires_at = null,
    } = req.body;

    if (!username) {
      return res.status(400).json(utils.fail("Informe o username."));
    }

    if (!["view", "edit"].includes(String(permission_level))) {
      return res
        .status(400)
        .json(utils.fail("Informe um nivel de permissao valido."));
    }

    const normalizedUsername = String(username)
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const guestUser = await execute.find_user_for_grant(normalizedUsername);

    if (!guestUser) {
      return res.status(404).json(utils.fail("Usuario nao encontrado."));
    }

    if (guestUser.id === req.userId) {
      return res
        .status(400)
        .json(utils.fail("Você não pode convidar a si mesmo."));
    }

    const [alreadyGranted, alreadyPending] = await Promise.all([
      execute.has_active_grant(req.userId, guestUser.id),
      execute.has_pending_invite(req.userId, guestUser.id),
    ]);

    if (alreadyGranted) {
      return res.status(409).json(utils.fail("Este usuário já possui acesso."));
    }

    if (alreadyPending) {
      return res
        .status(409)
        .json(utils.fail("Já existe um convite pendente para este usuário."));
    }

    const invite = await execute.create_invite(
      req.userId,
      guestUser.id,
      String(permission_level),
      is_permanent,
      expires_at,
    );
    const ownerProfile = await execute.get_profile(req.userId);

    await notifyUser(guestUser.id, {
      title: "Novo convite de agenda",
      body: `${ownerProfile?.name ?? "Alguém"} compartilhou a agenda com você.`,
      data: {
        type: "invite_received",
        inviteId: invite.id,
        ownerUsername: ownerProfile?.username ?? null,
      },
    });

    await saveNotification(
      guestUser.id,
      "Novo convite de agenda",
      `${ownerProfile?.name ?? "Alguém"} compartilhou a agenda com você.`,
      "invite_received",
      "/profile/received",
    );

    await logAgendaAction({
      ownerId: req.userId,
      actorId: req.userId,
      actionType: "invite_sent",
      targetType: "access_invite",
      targetId: invite.id,
      targetTitle: guestUser.name,
      metadata: {
        guest_username: guestUser.username,
        permission_level: invite.permission_level,
        is_permanent: invite.is_permanent,
        expires_at: invite.expires_at,
      },
    });

    return res.status(201).json(
      utils.ok(
        {
          ...invite,
          guest: guestUser,
        },
        "Convite enviado com sucesso.",
      ),
    );
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json(utils.fail("Já existe um convite pendente para este usuário."));
    }
    return res
      .status(500)
      .json(utils.errorHandle(error, "POST /access/invites"));
  }
});

rota.post("/invites/:id/accept", async (req, res) => {
  try {
    await syncExpiredInvites();
    const result = await execute.accept_invite(req.params.id, req.userId);
    if (!result) {
      return res
        .status(404)
        .json(utils.fail("Convite não encontrado, expirado ou já respondido."));
    }

    const guestProfile = await execute.get_profile(req.userId);

    await notifyUser(result.ownerId, {
      title: "Convite aceito",
      body: `${guestProfile?.name ?? "Alguém"} aceitou o seu convite de agenda.`,
      data: {
        type: "invite_accepted",
        inviteId: result.inviteId,
        guestUsername: guestProfile?.username ?? null,
      },
    });

    await saveNotification(
      result.ownerId,
      "Convite aceito",
      `${guestProfile?.name ?? "Alguém"} aceitou o seu convite de agenda.`,
      "invite_accepted",
      "/profile/access",
    );

    await logAgendaAction({
      ownerId: result.ownerId,
      actorId: req.userId,
      actionType: "invite_accepted",
      targetType: "access_invite",
      targetId: result.inviteId,
      metadata: {
        guest_username: guestProfile?.username ?? null,
      },
    });

    return res.json(utils.ok(result, "Convite aceito."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "POST /access/invites/:id/accept"));
  }
});

rota.post("/invites/:id/decline", async (req, res) => {
  try {
    await syncExpiredInvites();
    const result = await execute.decline_invite(req.params.id, req.userId);
    if (!result) {
      return res
        .status(404)
        .json(utils.fail("Convite não encontrado, expirado ou já respondido."));
    }

    const guestProfile = await execute.get_profile(req.userId);

    await notifyUser(result.owner_id, {
      title: "Convite recusado",
      body: `${guestProfile?.name ?? "Alguém"} recusou o seu convite de agenda.`,
      data: {
        type: "invite_declined",
        inviteId: result.id,
        guestUsername: guestProfile?.username ?? null,
      },
    });

    await saveNotification(
      result.owner_id,
      "Convite recusado",
      `${guestProfile?.name ?? "Alguém"} recusou o seu convite de agenda.`,
      "invite_declined",
      "/profile/invite",
    );

    await logAgendaAction({
      ownerId: result.owner_id,
      actorId: req.userId,
      actionType: "invite_declined",
      targetType: "access_invite",
      targetId: result.id,
      metadata: {
        guest_username: guestProfile?.username ?? null,
      },
    });

    return res.json(utils.ok(result, "Convite recusado."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "POST /access/invites/:id/decline"));
  }
});

rota.delete("/invites/:id", async (req, res) => {
  try {
    await syncExpiredInvites();
    const result = await execute.revoke_sent_invite(req.params.id, req.userId);
    if (!result) {
      return res
        .status(404)
        .json(utils.fail("Convite nao encontrado, expirado ou ja respondido."));
    }

    const ownerProfile = await execute.get_profile(req.userId);

    await notifyUser(result.guest_id, {
      title: "Convite cancelado",
      body: `${ownerProfile?.name ?? "Alguém"} cancelou um convite de agenda.`,
      data: {
        type: "invite_revoked",
        inviteId: result.id,
        ownerUsername: ownerProfile?.username ?? null,
      },
    });

    await saveNotification(
      result.guest_id,
      "Convite cancelado",
      `${ownerProfile?.name ?? "Alguém"} cancelou um convite de agenda.`,
      "invite_revoked",
      "/profile/received",
    );

    await logAgendaAction({
      ownerId: req.userId,
      actorId: req.userId,
      actionType: "invite_revoked",
      targetType: "access_invite",
      targetId: result.id,
      metadata: {
        guest_id: result.guest_id,
      },
    });

    return res.json(utils.ok(null, "Convite cancelado."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "DELETE /access/invites/:id"));
  }
});

rota.delete("/guests/:id", async (req, res) => {
  try {
    await syncExpiredInvites();
    const removedGuest = await execute.remove_guest(req.params.id, req.userId);
    const ownerProfile = await execute.get_profile(req.userId);

    if (removedGuest?.guest_id) {
      await notifyUser(removedGuest.guest_id, {
        title: "Acesso revogado",
        body: `${ownerProfile?.name ?? "Alguém"} removeu o seu acesso à agenda.`,
        data: {
          type: "grant_removed",
          ownerUsername: ownerProfile?.username ?? null,
        },
      });

      await saveNotification(
        removedGuest.guest_id,
        "Acesso revogado",
        `${ownerProfile?.name ?? "Alguém"} removeu o seu acesso à agenda.`,
        "grant_removed",
        "/profile/access",
      );

      await logAgendaAction({
        ownerId: req.userId,
        actorId: req.userId,
        actionType: "access_revoked",
        targetType: "access_grant",
        targetId: removedGuest.id,
        metadata: {
          guest_id: removedGuest.guest_id,
        },
      });
    }

    return res.json(utils.ok(null, "Acesso revogado."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "DELETE /access/guests/:id"));
  }
});

module.exports = rota;
