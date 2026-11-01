/*
# مَجيب AI — Core Database Schema

## Purpose
Creates the foundational tables for a SaaS platform that lets website owners build
AI assistants trained on their own knowledge sources and embed a chat widget on their site.

## New Tables

### 1. assistants
- id, user_id, name, welcome_message, instructions, primary_color, language, direction, is_active, created_at, updated_at

### 2. knowledge_sources
- id, assistant_id, user_id, title, content, source_type ('text'|'qa'), question, created_at

### 3. conversations
- id, assistant_id, visitor_id, visitor_name, created_at, updated_at

### 4. messages
- id, conversation_id, role ('user'|'assistant'), content, created_at

### 5. usage_logs
- id, assistant_id, user_id, conversation_id, tokens_used, created_at

## Security
- RLS enabled on all tables.
- Owner-scoped via user_id (assistants, knowledge_sources, usage_logs) or via
  EXISTS subquery through assistants (conversations, messages).
- service_role granted on conversations, messages, knowledge_sources, usage_logs
  for the chat edge function.
- authenticated-only grants (sign-in required app).
*/

-- ===== assistants =====
CREATE TABLE IF NOT EXISTS assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  welcome_message text NOT NULL DEFAULT 'مرحبًا! كيف يمكنني مساعدتك اليوم؟',
  instructions text NOT NULL DEFAULT 'أنت مساعد ذكي. أجب عن أسئلة الزوار بناءً على المعلومات المتوفرة فقط. إذا لم تكن تعرف الإجابة، قل ذلك بوضوح ولا تخترع معلومات.',
  primary_color text NOT NULL DEFAULT '#0EA5E9',
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  direction text NOT NULL DEFAULT 'rtl' CHECK (direction IN ('rtl', 'ltr')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON assistants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assistants TO service_role;

DROP POLICY IF EXISTS "select_own_assistants" ON assistants;
CREATE POLICY "select_own_assistants" ON assistants FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_assistants" ON assistants;
CREATE POLICY "insert_own_assistants" ON assistants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_assistants" ON assistants;
CREATE POLICY "update_own_assistants" ON assistants FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_assistants" ON assistants;
CREATE POLICY "delete_own_assistants" ON assistants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== knowledge_sources =====
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source_type text NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'qa')),
  question text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_sources TO authenticated;
GRANT SELECT ON knowledge_sources TO service_role;

DROP POLICY IF EXISTS "select_own_knowledge" ON knowledge_sources;
CREATE POLICY "select_own_knowledge" ON knowledge_sources FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_knowledge" ON knowledge_sources;
CREATE POLICY "insert_own_knowledge" ON knowledge_sources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_knowledge" ON knowledge_sources;
CREATE POLICY "update_own_knowledge" ON knowledge_sources FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_knowledge" ON knowledge_sources;
CREATE POLICY "delete_own_knowledge" ON knowledge_sources FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== conversations =====
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  visitor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversations TO service_role;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM assistants WHERE assistants.id = conversations.assistant_id AND assistants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_conversations" ON conversations;
CREATE POLICY "delete_own_conversations" ON conversations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM assistants WHERE assistants.id = conversations.assistant_id AND assistants.user_id = auth.uid())
  );

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT ON messages TO service_role;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN assistants ON assistants.id = conversations.assistant_id
      WHERE conversations.id = messages.conversation_id
      AND assistants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN assistants ON assistants.id = conversations.assistant_id
      WHERE conversations.id = messages.conversation_id
      AND assistants.user_id = auth.uid()
    )
  );

-- ===== usage_logs =====
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON usage_logs TO authenticated;
GRANT SELECT, INSERT ON usage_logs TO service_role;

DROP POLICY IF EXISTS "select_own_usage" ON usage_logs;
CREATE POLICY "select_own_usage" ON usage_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_usage" ON usage_logs;
CREATE POLICY "insert_own_usage" ON usage_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_assistant_id ON knowledge_sources(assistant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assistant_id ON conversations(assistant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_assistant_id ON usage_logs(assistant_id);
