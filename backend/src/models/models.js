const models = {
  find_by_email: () => `
    SELECT id, name, username, email, avatar_url, password_hash, is_private,
           notify_event_reminders, notify_share_updates, notify_push_enabled
    FROM users WHERE LOWER(email) = LOWER($1)
  `,

  find_user_id_by_email: () => `
    SELECT id, email
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `,

  find_by_username: () => `
    SELECT id FROM users WHERE username = $1
  `,

  register: () => `
    INSERT INTO users (name, username, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, username, email, avatar_url, is_private,
              notify_event_reminders, notify_share_updates, notify_push_enabled, created_at
  `,

  get_events_by_date: () => `
    SELECT id, title, description, category, category_color, start_time, end_time, remind_me, remind_before_minutes
    FROM events
    WHERE user_id = $1
      AND start_time < ($2::date + INTERVAL '1 day')
      AND end_time >= $2::date
    ORDER BY start_time ASC
  `,

  get_events_by_month: () => `
    SELECT id, title, category_color, start_time, end_time
    FROM events
    WHERE user_id = $1
      AND start_time < (MAKE_DATE($2, $3, 1) + INTERVAL '1 month')
      AND end_time >= MAKE_DATE($2, $3, 1)
    ORDER BY start_time ASC
  `,

  get_event_by_id: () => `
    SELECT id, title, description, category, category_color, start_time, end_time, remind_me, remind_before_minutes
    FROM events
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `,

  get_events_between: () => `
    SELECT id, title, description, category, category_color, start_time, end_time, remind_me, remind_before_minutes
    FROM events
    WHERE user_id = $1
      AND start_time < $3::timestamptz
      AND end_time > $2::timestamptz
    ORDER BY start_time ASC, id ASC
  `,

  create_event: () => `
    INSERT INTO events
      (user_id, title, description, category, category_color, start_time, end_time, remind_me, remind_before_minutes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,

  update_event: () => `
    UPDATE events
    SET title = $2, description = $3, category = $4, category_color = $5,
        start_time = $6, end_time = $7, remind_me = $8, remind_before_minutes = $9
    WHERE id = $1 AND user_id = $10
    RETURNING *
  `,

  delete_event: () => `
    DELETE FROM events WHERE id = $1 AND user_id = $2
  `,

  get_profile: () => `
    SELECT id, name, username, email, avatar_url, is_private,
           notify_event_reminders, notify_share_updates, notify_push_enabled, created_at
    FROM users WHERE id = $1
  `,

  insert_agenda_log: () => `
    INSERT INTO agenda_logs (
      owner_id,
      actor_user_id,
      actor_name,
      actor_username,
      action_type,
      target_type,
      target_id,
      target_title,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    RETURNING id, created_at
  `,

  get_agenda_logs: () => `
    SELECT
      id,
      owner_id,
      actor_user_id,
      actor_name,
      actor_username,
      action_type,
      target_type,
      target_id,
      target_title,
      metadata,
      created_at
    FROM agenda_logs
    WHERE owner_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
  `,

  get_current_ai_conversation: () => `
    SELECT *
    FROM ai_conversations
    WHERE user_id = $1 AND is_current = true
    ORDER BY last_message_at DESC, id DESC
    LIMIT 1
  `,

  get_ai_conversation_by_id: () => `
    SELECT *
    FROM ai_conversations
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `,

  list_recent_ai_conversations: () => `
    SELECT
      c.*,
      m.content AS last_message_content,
      m.role AS last_message_role,
      m.created_at AS last_message_created_at
    FROM ai_conversations c
    LEFT JOIN LATERAL (
      SELECT content, role, created_at
      FROM ai_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) m ON true
    WHERE c.user_id = $1
      AND c.is_current = false
    ORDER BY c.last_message_at DESC, c.id DESC
    LIMIT $2
  `,

  create_ai_conversation: () => `
    INSERT INTO ai_conversations (user_id, title, is_current, status, metadata, last_message_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    RETURNING *
  `,

  archive_current_ai_conversations: () => `
    UPDATE ai_conversations
    SET is_current = false,
        status = 'archived'
    WHERE user_id = $1
      AND is_current = true
    RETURNING id
  `,

  touch_ai_conversation: () => `
    UPDATE ai_conversations
    SET last_message_at = NOW()
    WHERE id = $1
    RETURNING *
  `,

  update_ai_conversation_metadata: () => `
    UPDATE ai_conversations
    SET metadata = $2::jsonb,
        last_message_at = NOW()
    WHERE id = $1
    RETURNING *
  `,

  insert_ai_message: () => `
    INSERT INTO ai_messages (conversation_id, role, message_type, content, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING *
  `,

  get_ai_messages_by_conversation: () => `
    SELECT id, conversation_id, role, message_type, content, metadata, created_at
    FROM (
      SELECT id, conversation_id, role, message_type, content, metadata, created_at
      FROM ai_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    ) AS recent_messages
    ORDER BY created_at ASC, id ASC
  `,

  insert_ai_action_run: () => `
    INSERT INTO ai_action_runs (
      user_id,
      conversation_id,
      action_type,
      status,
      source,
      user_prompt,
      assistant_message,
      preview,
      provider,
      model_name,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
    RETURNING *
  `,

  get_ai_action_run_by_id: () => `
    SELECT *
    FROM ai_action_runs
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `,

  get_latest_pending_ai_action_by_conversation: () => `
    SELECT *
    FROM ai_action_runs
    WHERE user_id = $1
      AND conversation_id = $2
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `,

  update_ai_action_status: () => `
    UPDATE ai_action_runs
    SET status = $3,
        confirmed_at = COALESCE($4, confirmed_at),
        executed_at = COALESCE($5, executed_at),
        result = COALESCE($6::jsonb, result),
        error_message = COALESCE($7, error_message)
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `,

  update_profile: () => `
    UPDATE users
    SET name = $2,
        username = $3,
        email = $4,
        is_private = $5,
        avatar_url = $6,
        notify_event_reminders = $7,
        notify_share_updates = $8,
        notify_push_enabled = $9
    WHERE id = $1
    RETURNING id, name, username, email, avatar_url, is_private,
              notify_event_reminders, notify_share_updates, notify_push_enabled, created_at
  `,

  get_user_categories: () => `
    SELECT id, name, color, created_at, updated_at
    FROM user_categories
    WHERE user_id = $1
    ORDER BY created_at ASC, id ASC
  `,

  insert_user_category: () => `
    INSERT INTO user_categories (user_id, name, color, updated_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, name, color, created_at, updated_at
  `,

  find_user_category_by_name: () => `
    SELECT id, name, color, created_at, updated_at
    FROM user_categories
    WHERE user_id = $1
      AND LOWER(name) = LOWER($2)
    LIMIT 1
  `,

  find_user_category_by_id: () => `
    SELECT id, name, color, created_at, updated_at
    FROM user_categories
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `,

  update_user_category: () => `
    UPDATE user_categories
    SET name = $3,
        color = $4,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, name, color, created_at, updated_at
  `,

  delete_user_category: () => `
    DELETE FROM user_categories
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `,

  upsert_user_push_token: () => `
    INSERT INTO user_push_tokens (user_id, expo_push_token, platform, device_name, last_seen_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (expo_push_token)
    DO UPDATE
      SET user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          device_name = EXCLUDED.device_name,
          last_seen_at = NOW(),
          updated_at = NOW()
    RETURNING id, user_id, expo_push_token, platform, device_name, created_at, updated_at, last_seen_at
  `,

  delete_user_push_token: () => `
    DELETE FROM user_push_tokens
    WHERE user_id = $1 AND expo_push_token = $2
  `,

  get_user_push_tokens: () => `
    SELECT expo_push_token
    FROM user_push_tokens
    WHERE user_id = $1
    ORDER BY updated_at DESC
  `,

  delete_push_tokens: () => `
    DELETE FROM user_push_tokens
    WHERE expo_push_token = ANY($1::text[])
  `,

  clear_active_password_reset_tokens: () => `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = $1 AND used_at IS NULL
  `,

  create_password_reset_token: () => `
    INSERT INTO password_reset_tokens (user_id, code_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, expires_at, created_at
  `,

  get_active_password_reset_token: () => `
    SELECT id, user_id, code_hash, expires_at, attempts
    FROM password_reset_tokens
    WHERE user_id = $1
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `,

  // Conta uma tentativa errada; ao atingir o limite ($2) o código é invalidado.
  register_failed_password_reset_attempt: () => `
    UPDATE password_reset_tokens
    SET attempts = attempts + 1,
        used_at = CASE WHEN attempts + 1 >= $2 THEN NOW() ELSE used_at END
    WHERE id = $1
    RETURNING attempts
  `,

  update_password_by_user_id: () => `
    UPDATE users
    SET password_hash = $2
    WHERE id = $1
    RETURNING id
  `,

  mark_password_reset_token_used: () => `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = $1
    RETURNING id
  `,

  get_guests: () => `
    SELECT
      ag.id,
      u.id AS guest_user_id,
      u.name,
      u.username,
      u.avatar_url,
      ag.permission_level,
      ag.is_permanent,
      ag.expires_at,
      ag.created_at
    FROM access_grants ag
    JOIN users u ON u.id = ag.guest_id
    WHERE ag.owner_id = $1
    ORDER BY ag.created_at DESC
  `,

  get_sent_invites: () => `
    SELECT
      ai.id,
      ai.status,
      ai.permission_level,
      ai.is_permanent,
      ai.expires_at,
      ai.created_at,
      ai.responded_at,
      u.id AS guest_user_id,
      u.name,
      u.username,
      u.avatar_url
    FROM access_invites ai
    JOIN users u ON u.id = ai.guest_id
    WHERE ai.owner_id = $1
      AND ai.status = 'pending'
    ORDER BY ai.created_at DESC
  `,

  get_sent_invites_history: () => `
    SELECT
      ai.id,
      ai.status,
      ai.permission_level,
      ai.is_permanent,
      ai.expires_at,
      ai.created_at,
      ai.responded_at,
      u.id AS guest_user_id,
      u.name,
      u.username,
      u.avatar_url
    FROM access_invites ai
    JOIN users u ON u.id = ai.guest_id
    WHERE ai.owner_id = $1
      AND ai.status <> 'pending'
    ORDER BY COALESCE(ai.responded_at, ai.created_at) DESC
  `,

  get_received_invites: () => `
    SELECT
      ai.id,
      ai.status,
      ai.permission_level,
      ai.is_permanent,
      ai.expires_at,
      ai.created_at,
      ai.responded_at,
      u.id AS owner_user_id,
      u.name,
      u.username,
      u.avatar_url
    FROM access_invites ai
    JOIN users u ON u.id = ai.owner_id
    WHERE ai.guest_id = $1
      AND ai.status = 'pending'
    ORDER BY ai.created_at DESC
  `,

  get_received_invites_history: () => `
    SELECT
      ai.id,
      ai.status,
      ai.permission_level,
      ai.is_permanent,
      ai.expires_at,
      ai.created_at,
      ai.responded_at,
      u.id AS owner_user_id,
      u.name,
      u.username,
      u.avatar_url
    FROM access_invites ai
    JOIN users u ON u.id = ai.owner_id
    WHERE ai.guest_id = $1
      AND ai.status <> 'pending'
    ORDER BY COALESCE(ai.responded_at, ai.created_at) DESC
  `,

  get_shared_with_me: () => `
    SELECT
      ag.id,
      ag.permission_level,
      ag.is_permanent,
      ag.expires_at,
      ag.created_at,
      u.id AS owner_user_id,
      u.name,
      u.username,
      u.avatar_url
    FROM access_grants ag
    JOIN users u ON u.id = ag.owner_id
    WHERE ag.guest_id = $1
      AND (ag.is_permanent = true OR ag.expires_at > NOW())
    ORDER BY ag.created_at DESC
  `,

  find_user_for_grant: () => `
    SELECT id, name, username, avatar_url, is_private FROM users WHERE username = $1
  `,

  add_guest: () => `
    INSERT INTO access_grants (owner_id, guest_id, permission_level, is_permanent, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `,

  create_invite: () => `
    INSERT INTO access_invites (owner_id, guest_id, permission_level, is_permanent, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, owner_id, guest_id, status, permission_level, is_permanent, expires_at, created_at, responded_at
  `,

  expire_stale_invites: () => `
    UPDATE access_invites
    SET status = 'expired',
        responded_at = COALESCE(responded_at, NOW())
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    RETURNING id
  `,

  remove_guest: () => `
    DELETE FROM access_grants
    WHERE id = $1 AND owner_id = $2
    RETURNING id, guest_id
  `,

  revoke_sent_invite: () => `
    UPDATE access_invites
    SET status = 'revoked', responded_at = NOW()
    WHERE id = $1 AND owner_id = $2 AND status = 'pending'
    RETURNING id, owner_id, guest_id
  `,

  get_invite_for_guest_action: () => `
    SELECT id, owner_id, guest_id, permission_level, is_permanent, expires_at, status
    FROM access_invites
    WHERE id = $1 AND guest_id = $2 AND status = 'pending'
    LIMIT 1
  `,

  accept_invite_grant: () => `
    INSERT INTO access_grants (owner_id, guest_id, permission_level, is_permanent, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (owner_id, guest_id)
    DO UPDATE
      SET permission_level = EXCLUDED.permission_level,
          is_permanent = EXCLUDED.is_permanent,
          expires_at = EXCLUDED.expires_at
    RETURNING id
  `,

  mark_invite_accepted: () => `
    UPDATE access_invites
    SET status = 'accepted', responded_at = NOW()
    WHERE id = $1
    RETURNING id
  `,

  decline_invite: () => `
    UPDATE access_invites
    SET status = 'declined', responded_at = NOW()
    WHERE id = $1 AND guest_id = $2 AND status = 'pending'
    RETURNING id, owner_id, guest_id
  `,

  check_access: () => `
    SELECT id, permission_level FROM access_grants
    WHERE owner_id = $1 AND guest_id = $2
      AND (is_permanent = true OR expires_at > NOW())
  `,

  find_valid_grant: () => `
    SELECT id, owner_id, guest_id, permission_level, is_permanent, expires_at, created_at
    FROM access_grants
    WHERE owner_id = $1
      AND guest_id = $2
      AND (is_permanent = true OR expires_at > NOW())
    LIMIT 1
  `,

  has_pending_invite: () => `
    SELECT id
    FROM access_invites
    WHERE owner_id = $1 AND guest_id = $2 AND status = 'pending'
    LIMIT 1
  `,

  has_active_grant: () => `
    SELECT id
    FROM access_grants
    WHERE owner_id = $1 AND guest_id = $2
      AND (is_permanent = true OR expires_at > NOW())
    LIMIT 1
  `,

  get_public_agenda: () => `
    SELECT e.id, e.title, e.description, e.category, e.category_color, e.start_time, e.end_time
    FROM events e
    JOIN users u ON u.id = e.user_id
    WHERE u.username = $1 AND u.is_private = false
      AND e.start_time < ($2::date + INTERVAL '1 day')
      AND e.end_time >= $2::date
    ORDER BY e.start_time ASC
  `,

  get_public_agenda_by_month: () => `
    SELECT e.id, e.title, e.category_color, e.start_time, e.end_time
    FROM events e
    JOIN users u ON u.id = e.user_id
    WHERE u.username = $1
      AND u.is_private = false
      AND e.start_time < (MAKE_DATE($2, $3, 1) + INTERVAL '1 month')
      AND e.end_time >= MAKE_DATE($2, $3, 1)
    ORDER BY e.start_time ASC
  `,

  get_granted_agenda: () => `
    SELECT e.id, e.title, e.description, e.category, e.category_color, e.start_time, e.end_time
    FROM events e
    JOIN users u ON u.id = e.user_id
    JOIN access_grants ag ON ag.owner_id = u.id AND ag.guest_id = $3
    WHERE u.username = $1
      AND (ag.is_permanent = true OR ag.expires_at > NOW())
      AND e.start_time < ($2::date + INTERVAL '1 day')
      AND e.end_time >= $2::date
    ORDER BY e.start_time ASC
  `,

  get_granted_agenda_by_month: () => `
    SELECT e.id, e.title, e.category_color, e.start_time, e.end_time
    FROM events e
    JOIN users u ON u.id = e.user_id
    JOIN access_grants ag ON ag.owner_id = u.id AND ag.guest_id = $4
    WHERE u.username = $1
      AND (ag.is_permanent = true OR ag.expires_at > NOW())
      AND e.start_time < (MAKE_DATE($2, $3, 1) + INTERVAL '1 month')
      AND e.end_time >= MAKE_DATE($2, $3, 1)
    ORDER BY e.start_time ASC
  `,

  // ── Dashboard Home ────────────────────────────────────────────────────────

  dashboard_today_summary: () => `
    SELECT
      COUNT(*) FILTER (
        WHERE start_time < (CURRENT_DATE + INTERVAL '1 day')
          AND end_time >= CURRENT_DATE
      )::int AS today_count,
      COUNT(*) FILTER (
        WHERE start_time >= date_trunc('week', NOW())
          AND start_time < date_trunc('week', NOW()) + INTERVAL '7 days'
      )::int AS week_count,
      COUNT(*) FILTER (
        WHERE remind_me = true
          AND start_time > NOW()
      )::int AS active_reminders_count
    FROM events
    WHERE user_id = $1
  `,

  dashboard_next_event: () => `
    SELECT id, title, category, category_color, start_time, end_time
    FROM events
    WHERE user_id = $1
      AND start_time > NOW()
    ORDER BY start_time ASC
    LIMIT 1
  `,

  dashboard_today_events: () => `
    SELECT id, title, category, category_color, start_time, end_time,
           remind_me, remind_before_minutes
    FROM events
    WHERE user_id = $1
      AND start_time < (CURRENT_DATE + INTERVAL '1 day')
      AND end_time >= CURRENT_DATE
    ORDER BY start_time ASC
    LIMIT 5
  `,

  dashboard_pending_invites_count: () => `
    SELECT COUNT(*)::int AS count
    FROM access_invites
    WHERE guest_id = $1
      AND status = 'pending'
  `,

  dashboard_shared_agendas: () => `
    SELECT
      ag.id,
      ag.permission_level,
      ag.is_permanent,
      ag.expires_at,
      u.id   AS owner_user_id,
      u.name AS owner_name,
      u.username AS owner_username,
      u.avatar_url AS owner_avatar_url,
      ne.title           AS next_event_title,
      ne.start_time      AS next_event_start,
      ne.end_time        AS next_event_end,
      ne.category_color  AS next_event_color
    FROM access_grants ag
    JOIN users u ON u.id = ag.owner_id
    LEFT JOIN LATERAL (
      SELECT title, start_time, end_time, category_color
      FROM events
      WHERE user_id = ag.owner_id
        AND start_time > NOW()
      ORDER BY start_time ASC
      LIMIT 1
    ) ne ON true
    WHERE ag.guest_id = $1
      AND (ag.is_permanent = true OR ag.expires_at > NOW())
    ORDER BY ag.created_at DESC
    LIMIT 5
  `,

  dashboard_recent_activity: () => `
    SELECT id, action_type, target_type, target_id, target_title,
           actor_name, actor_username, metadata, created_at
    FROM agenda_logs
    WHERE owner_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 5
  `,

  dashboard_expiring_access: () => `
    SELECT
      ag.id,
      ag.expires_at,
      u.name       AS owner_name,
      u.username   AS owner_username,
      u.avatar_url AS owner_avatar_url
    FROM access_grants ag
    JOIN users u ON u.id = ag.owner_id
    WHERE ag.guest_id = $1
      AND ag.is_permanent = false
      AND ag.expires_at > NOW()
      AND ag.expires_at <= NOW() + INTERVAL '7 days'
    ORDER BY ag.expires_at ASC
  `,

  dashboard_shared_activity: () => `
    SELECT
      al.id,
      al.action_type,
      al.target_type,
      al.target_id,
      al.target_title,
      al.actor_name,
      al.actor_username,
      al.metadata,
      al.created_at,
      u.name     AS owner_name,
      u.username AS owner_username
    FROM agenda_logs al
    JOIN users u ON u.id = al.owner_id
    JOIN access_grants ag ON ag.owner_id = al.owner_id AND ag.guest_id = $1
    WHERE (ag.is_permanent = true OR ag.expires_at > NOW())
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 10
  `,

  get_active_guest_ids: () => `
    SELECT guest_id
    FROM access_grants
    WHERE owner_id = $1
      AND (is_permanent = true OR expires_at > NOW())
  `,

  // ── Notifications ─────────────────────────────────────────────────────────

  insert_notification: () => `
    INSERT INTO notifications (user_id, title, body, type, route)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, title, body, type, route, read_at, created_at
  `,

  get_notifications: () => `
    SELECT id, title, body, type, route, read_at, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 50
  `,

  get_unread_notifications_count: () => `
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE user_id = $1 AND read_at IS NULL
  `,

  mark_notification_read: () => `
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = $1 AND user_id = $2 AND read_at IS NULL
    RETURNING id, read_at
  `,

  mark_all_notifications_read: () => `
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = $1 AND read_at IS NULL
    RETURNING id
  `,
};

module.exports = models;
