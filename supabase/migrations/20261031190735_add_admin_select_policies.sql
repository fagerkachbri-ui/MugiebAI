/*
# Admin access policies — platform-wide read for admins

## Purpose
Allows admin users to view ALL assistants, conversations, messages, knowledge_sources,
and usage_logs across the platform (not just their own). Regular users are unaffected.

## Changes
- Adds SELECT policies for admins on: assistants, conversations, messages, knowledge_sources, usage_logs
- Uses the is_admin() SECURITY DEFINER function to check role
- No new tables or columns

## Security
- Admin-only SELECT policies added alongside existing owner-scoped policies
- No INSERT/UPDATE/DELETE changes — admins still only modify their own data directly
- The admin dashboard will use these policies for platform-wide visibility
*/

-- Admins can view all assistants
DROP POLICY IF EXISTS "select_admin_all_assistants" ON assistants;
CREATE POLICY "select_admin_all_assistants" ON assistants FOR SELECT
  TO authenticated USING (is_admin());

-- Admins can view all conversations
DROP POLICY IF EXISTS "select_admin_all_conversations" ON conversations;
CREATE POLICY "select_admin_all_conversations" ON conversations FOR SELECT
  TO authenticated USING (is_admin());

-- Admins can view all messages
DROP POLICY IF EXISTS "select_admin_all_messages" ON messages;
CREATE POLICY "select_admin_all_messages" ON messages FOR SELECT
  TO authenticated USING (is_admin());

-- Admins can view all knowledge_sources
DROP POLICY IF EXISTS "select_admin_all_knowledge" ON knowledge_sources;
CREATE POLICY "select_admin_all_knowledge" ON knowledge_sources FOR SELECT
  TO authenticated USING (is_admin());

-- Admins can view all usage_logs
DROP POLICY IF EXISTS "select_admin_all_usage" ON usage_logs;
CREATE POLICY "select_admin_all_usage" ON usage_logs FOR SELECT
  TO authenticated USING (is_admin());
