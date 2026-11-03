const models = require("../models/models");
const { postgres } = require("../server/connect");

const DEFAULT_USER_CATEGORIES = [
  { name: "Brainstorm", color: "#7C3AED" },
  { name: "Design", color: "#10B981" },
  { name: "Treino", color: "#3B82F6" },
];

const execute = {
  find_by_email: async (email) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_by_email(), [email]);
      return ret.rows;
    } catch (error) {
      console.error("[execute.find_by_email] query failed", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    } finally {
      client.release();
    }
  },

  find_by_username: async (username) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_by_username(), [username]);
      return ret.rows;
    } catch (error) {
      console.error("[execute.find_by_username] query failed", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    } finally {
      client.release();
    }
  },

  find_user_id_by_email: async (email) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_user_id_by_email(), [email]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  register: async (name, username, email, passwordHash) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.register(), [name, username, email, passwordHash]);
      return ret.rows[0];
    } catch (error) {
      console.error("[execute.register] insert failed", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
      });
      throw error;
    } finally {
      client.release();
    }
  },

  get_events_by_date: async (userId, date) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_events_by_date(), [userId, date]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_events_by_month: async (userId, year, month) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_events_by_month(), [userId, year, month]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_event_by_id: async (id, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_event_by_id(), [id, userId]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_events_between: async (userId, startTime, endTime) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_events_between(), [userId, startTime, endTime]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  create_event: async (
    userId,
    title,
    description,
    category,
    categoryColor,
    startTime,
    endTime,
    remindMe,
    remindBeforeMinutes
  ) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.create_event(), [
        userId,
        title,
        description,
        category,
        categoryColor,
        startTime,
        endTime,
        remindMe,
        remindBeforeMinutes,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  update_event: async (
    id,
    title,
    description,
    category,
    categoryColor,
    startTime,
    endTime,
    remindMe,
    remindBeforeMinutes,
    userId
  ) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.update_event(), [
        id,
        title,
        description,
        category,
        categoryColor,
        startTime,
        endTime,
        remindMe,
        remindBeforeMinutes,
        userId,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  delete_event: async (id, userId) => {
    const client = await postgres.connect();
    try {
      await client.query(models.delete_event(), [id, userId]);
    } finally {
      client.release();
    }
  },

  get_profile: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_profile(), [userId]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  create_agenda_log: async ({
    ownerId,
    actorUserId,
    actorName,
    actorUsername,
    actionType,
    targetType,
    targetId = null,
    targetTitle = null,
    metadata = {},
  }) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.insert_agenda_log(), [
        ownerId,
        actorUserId,
        actorName,
        actorUsername,
        actionType,
        targetType,
        targetId,
        targetTitle,
        JSON.stringify(metadata ?? {}),
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_agenda_logs: async (ownerId, limit = 100) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_agenda_logs(), [ownerId, limit]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_current_ai_conversation: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_current_ai_conversation(), [userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  get_ai_conversation_by_id: async (conversationId, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_ai_conversation_by_id(), [conversationId, userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  list_recent_ai_conversations: async (userId, limit = 12) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.list_recent_ai_conversations(), [userId, limit]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  create_ai_conversation: async ({
    userId,
    title = "Assistente IA",
    isCurrent = true,
    status = "active",
    metadata = {},
  }) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.create_ai_conversation(), [
        userId,
        title,
        isCurrent,
        status,
        JSON.stringify(metadata ?? {}),
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  archive_current_ai_conversations: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.archive_current_ai_conversations(), [userId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  touch_ai_conversation: async (conversationId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.touch_ai_conversation(), [conversationId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  update_ai_conversation_metadata: async (conversationId, metadata) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.update_ai_conversation_metadata(), [
        conversationId,
        JSON.stringify(metadata ?? {}),
      ]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  create_ai_message: async ({
    conversationId,
    role,
    messageType = "text",
    content,
    metadata = {},
  }) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.insert_ai_message(), [
        conversationId,
        role,
        messageType,
        content,
        JSON.stringify(metadata ?? {}),
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_ai_messages_by_conversation: async (conversationId, limit = 40) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_ai_messages_by_conversation(), [conversationId, limit]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  create_ai_action_run: async ({
    userId,
    conversationId = null,
    actionType,
    status = "pending",
    source = "assistant",
    userPrompt,
    assistantMessage = null,
    preview = {},
    provider = null,
    modelName = null,
    expiresAt,
  }) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.insert_ai_action_run(), [
        userId,
        conversationId,
        actionType,
        status,
        source,
        userPrompt,
        assistantMessage,
        JSON.stringify(preview ?? {}),
        provider,
        modelName,
        expiresAt,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_ai_action_run_by_id: async (id, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_ai_action_run_by_id(), [id, userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  get_latest_pending_ai_action_by_conversation: async (userId, conversationId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_latest_pending_ai_action_by_conversation(), [
        userId,
        conversationId,
      ]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  update_ai_action_status: async ({
    id,
    userId,
    status,
    confirmedAt = null,
    executedAt = null,
    result = null,
    errorMessage = null,
  }) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.update_ai_action_status(), [
        id,
        userId,
        status,
        confirmedAt,
        executedAt,
        result ? JSON.stringify(result) : null,
        errorMessage,
      ]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  update_profile: async (
    userId,
    name,
    username,
    email,
    isPrivate,
    avatarUrl,
    notifyEventReminders,
    notifyShareUpdates,
    notifyPushEnabled
  ) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.update_profile(), [
        userId,
        name,
        username,
        email,
        isPrivate,
        avatarUrl,
        notifyEventReminders,
        notifyShareUpdates,
        notifyPushEnabled,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_user_categories: async (userId) => {
    const client = await postgres.connect();
    try {
      let ret = await client.query(models.get_user_categories(), [userId]);

      if (ret.rows.length === 0) {
        for (const category of DEFAULT_USER_CATEGORIES) {
          await client.query(models.insert_user_category(), [userId, category.name, category.color]);
        }
        ret = await client.query(models.get_user_categories(), [userId]);
      }

      return ret.rows;
    } finally {
      client.release();
    }
  },

  find_user_category_by_name: async (userId, name) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_user_category_by_name(), [userId, name]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  find_user_category_by_id: async (id, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_user_category_by_id(), [id, userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  create_user_category: async (userId, name, color) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.insert_user_category(), [userId, name, color]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  update_user_category: async (id, userId, name, color) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.update_user_category(), [id, userId, name, color]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  delete_user_category: async (id, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.delete_user_category(), [id, userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  upsert_user_push_token: async (userId, expoPushToken, platform, deviceName) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.upsert_user_push_token(), [
        userId,
        expoPushToken,
        platform,
        deviceName,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  delete_user_push_token: async (userId, expoPushToken) => {
    const client = await postgres.connect();
    try {
      await client.query(models.delete_user_push_token(), [userId, expoPushToken]);
    } finally {
      client.release();
    }
  },

  get_user_push_tokens: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_user_push_tokens(), [userId]);
      return ret.rows.map((row) => row.expo_push_token);
    } finally {
      client.release();
    }
  },

  delete_push_tokens: async (tokens) => {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return;
    }

    const client = await postgres.connect();
    try {
      await client.query(models.delete_push_tokens(), [tokens]);
    } finally {
      client.release();
    }
  },

  create_password_reset_token: async (userId, codeHash, expiresAt) => {
    const client = await postgres.connect();
    try {
      await client.query(models.clear_active_password_reset_tokens(), [userId]);
      const ret = await client.query(models.create_password_reset_token(), [
        userId,
        codeHash,
        expiresAt,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_active_password_reset_token: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_active_password_reset_token(), [userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  register_failed_password_reset_attempt: async (tokenId, maxAttempts) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.register_failed_password_reset_attempt(), [
        tokenId,
        maxAttempts,
      ]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  reset_password: async (userId, passwordHash, tokenId) => {
    const client = await postgres.connect();
    try {
      await client.query("BEGIN");
      await client.query(models.update_password_by_user_id(), [userId, passwordHash]);
      await client.query(models.mark_password_reset_token_used(), [tokenId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  get_guests: async (ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_guests(), [ownerId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_sent_invites: async (ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_sent_invites(), [ownerId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_sent_invites_history: async (ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_sent_invites_history(), [ownerId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_received_invites: async (guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_received_invites(), [guestId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_received_invites_history: async (guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_received_invites_history(), [guestId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_shared_with_me: async (guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_shared_with_me(), [guestId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  find_user_for_grant: async (username) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_user_for_grant(), [username]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  add_guest: async (ownerId, guestId, permissionLevel, isPermanent, expiresAt) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.add_guest(), [
        ownerId,
        guestId,
        permissionLevel,
        isPermanent,
        expiresAt,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  create_invite: async (ownerId, guestId, permissionLevel, isPermanent, expiresAt) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.create_invite(), [
        ownerId,
        guestId,
        permissionLevel,
        isPermanent,
        expiresAt,
      ]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  expire_stale_invites: async () => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.expire_stale_invites());
      return ret.rows.length;
    } finally {
      client.release();
    }
  },

  has_pending_invite: async (ownerId, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.has_pending_invite(), [ownerId, guestId]);
      return Boolean(ret.rows[0]);
    } finally {
      client.release();
    }
  },

  has_active_grant: async (ownerId, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.has_active_grant(), [ownerId, guestId]);
      return Boolean(ret.rows[0]);
    } finally {
      client.release();
    }
  },

  revoke_sent_invite: async (id, ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.revoke_sent_invite(), [id, ownerId]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  accept_invite: async (inviteId, guestId) => {
    const client = await postgres.connect();
    try {
      await client.query("BEGIN");

      const inviteRet = await client.query(models.get_invite_for_guest_action(), [inviteId, guestId]);
      const invite = inviteRet.rows[0];

      if (!invite) {
        await client.query("ROLLBACK");
        return null;
      }

      const grantRet = await client.query(models.accept_invite_grant(), [
        invite.owner_id,
        invite.guest_id,
        invite.permission_level,
        invite.is_permanent,
        invite.expires_at,
      ]);

      await client.query(models.mark_invite_accepted(), [inviteId]);
      await client.query("COMMIT");

      return {
        inviteId,
        grantId: grantRet.rows[0]?.id ?? null,
        ownerId: invite.owner_id,
        guestId: invite.guest_id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  find_valid_grant: async (ownerId, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.find_valid_grant(), [ownerId, guestId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  decline_invite: async (inviteId, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.decline_invite(), [inviteId, guestId]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  remove_guest: async (id, ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.remove_guest(), [id, ownerId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  check_access: async (ownerId, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.check_access(), [ownerId, guestId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_public_agenda: async (username, date) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_public_agenda(), [username, date]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_public_agenda_by_month: async (username, year, month) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_public_agenda_by_month(), [username, year, month]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_granted_agenda: async (username, date, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_granted_agenda(), [username, date, guestId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  get_granted_agenda_by_month: async (username, year, month, guestId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_granted_agenda_by_month(), [
        username,
        year,
        month,
        guestId,
      ]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  dashboard_home: async (userId) => {
    async function q(sql, params) {
      const client = await postgres.connect();
      try {
        return (await client.query(sql, params)).rows;
      } finally {
        client.release();
      }
    }

    const [
      profileRows,
      summaryRows,
      nextEventRows,
      todayEventsRows,
      pendingInvitesRows,
      sharedAgendasRows,
      recentActivityRows,
      expiringAccessRows,
      sharedActivityRows,
      unreadNotificationsRows,
    ] = await Promise.all([
      q(models.get_profile(), [userId]),
      q(models.dashboard_today_summary(), [userId]),
      q(models.dashboard_next_event(), [userId]),
      q(models.dashboard_today_events(), [userId]),
      q(models.dashboard_pending_invites_count(), [userId]),
      q(models.dashboard_shared_agendas(), [userId]),
      q(models.dashboard_recent_activity(), [userId]),
      q(models.dashboard_expiring_access(), [userId]),
      q(models.dashboard_shared_activity(), [userId]),
      q(models.get_unread_notifications_count(), [userId]),
    ]);

    return {
      me: profileRows[0] ?? null,
      today_summary: summaryRows[0] ?? { today_count: 0, week_count: 0, active_reminders_count: 0 },
      next_event: nextEventRows[0] ?? null,
      today_events: todayEventsRows,
      pending_invites_count: pendingInvitesRows[0]?.count ?? 0,
      shared_agendas: sharedAgendasRows,
      recent_activity: recentActivityRows,
      expiring_access: expiringAccessRows,
      shared_activity: sharedActivityRows,
      unread_notifications_count: unreadNotificationsRows[0]?.count ?? 0,
    };
  },

  get_active_guest_ids: async (ownerId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_active_guest_ids(), [ownerId]);
      return ret.rows.map((r) => r.guest_id);
    } finally {
      client.release();
    }
  },

  create_notification: async (userId, title, body, type, route = null) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.insert_notification(), [userId, title, body, type, route]);
      return ret.rows[0];
    } finally {
      client.release();
    }
  },

  get_notifications: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.get_notifications(), [userId]);
      return ret.rows;
    } finally {
      client.release();
    }
  },

  mark_notification_read: async (id, userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.mark_notification_read(), [id, userId]);
      return ret.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  mark_all_notifications_read: async (userId) => {
    const client = await postgres.connect();
    try {
      const ret = await client.query(models.mark_all_notifications_read(), [userId]);
      return ret.rows.length;
    } finally {
      client.release();
    }
  },
};

module.exports = execute;
