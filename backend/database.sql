-- Schema base do Calendo (o boot da API também aplica este arquivo)
-- Execute este arquivo no seu banco PostgreSQL antes de iniciar o servidor

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT true,
  notify_event_reminders BOOLEAN DEFAULT true,
  notify_share_updates BOOLEAN DEFAULT true,
  notify_push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'Brainstorm',
  category_color VARCHAR(10) DEFAULT '#7c3aed',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  remind_me BOOLEAN DEFAULT false,
  remind_before_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de acesso (quem pode ver a agenda de quem)
CREATE TABLE IF NOT EXISTS access_grants (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view'
    CHECK (permission_level IN ('view', 'edit')),
  is_permanent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, guest_id)
);

-- Tabela de convites de acesso pendentes/respondidos
CREATE TABLE IF NOT EXISTS access_invites (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view'
    CHECK (permission_level IN ('view', 'edit')),
  is_permanent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Tokens de recuperacao de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tokens de push por dispositivo
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token VARCHAR(255) UNIQUE NOT NULL,
  platform VARCHAR(20),
  device_name VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorias por usuario
CREATE TABLE IF NOT EXISTS user_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de auditoria da agenda
CREATE TABLE IF NOT EXISTS agenda_logs (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  actor_username VARCHAR(100),
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id INTEGER,
  target_title VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'Assistente IA',
  is_current BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  message_type VARCHAR(30) NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'action_preview', 'action_result')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Acoes pendentes/executadas pela IA do assistente
CREATE TABLE IF NOT EXISTS ai_action_runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES ai_conversations(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'executed', 'cancelled', 'expired', 'failed')),
  source VARCHAR(30) NOT NULL DEFAULT 'assistant',
  user_prompt TEXT NOT NULL,
  assistant_message TEXT,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider VARCHAR(30),
  model_name VARCHAR(80),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_access_grants_owner ON access_grants(owner_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_guest ON access_grants(guest_id);
CREATE INDEX IF NOT EXISTS idx_access_invites_owner ON access_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_access_invites_guest ON access_invites(guest_id);
CREATE INDEX IF NOT EXISTS idx_access_invites_status ON access_invites(status);
CREATE INDEX IF NOT EXISTS idx_access_invites_responded_at ON access_invites(responded_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_last_seen_at ON user_push_tokens(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_logs_owner_id ON agenda_logs(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_logs_actor_user_id ON agenda_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_current ON ai_conversations(user_id, is_current, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_action_runs_user_id ON ai_action_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_runs_conversation_id ON ai_action_runs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_runs_status ON ai_action_runs(status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_invites_owner_guest_pending
ON access_invites(owner_id, guest_id)
WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_categories_user_name_lower
ON user_categories(user_id, LOWER(name));
