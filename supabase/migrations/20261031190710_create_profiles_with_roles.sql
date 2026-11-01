/*
# Create profiles table with role-based access control

## Purpose
Adds a `profiles` table that mirrors `auth.users` with a `role` column (`user` or `admin`).
The first user to sign up automatically becomes admin; all subsequent users get the `user` role.
An `is_admin()` helper function lets RLS policies check admin status without recursion.

## New Tables
### profiles
- id (uuid, PK, references auth.users) — matches the auth user
- email (text) — cached email from auth
- role (text, 'user' | 'admin', default 'user') — access level
- created_at (timestamptz)

## New Functions
### handle_new_user()
- Trigger function on auth.users INSERT.
- Inserts a profile row for the new user.
- If no profiles exist yet, assigns 'admin' (first user = platform owner).
- Otherwise assigns 'user'.

### is_admin()
- SECURITY DEFINER function returning boolean.
- Checks if auth.uid() has role = 'admin' in profiles.
- Used in RLS policies to avoid self-referential recursion.

## Security
- RLS enabled on profiles.
- SELECT: users can read their own profile; admins can read all.
- UPDATE: only admins can update profiles (e.g., change someone's role).
- is_admin() revoke from PUBLIC/anon, grant to authenticated.
- handle_new_user() is SECURITY DEFINER so the trigger can write to profiles.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO service_role;

-- is_admin helper — SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Trigger: auto-create profile on signup, first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON profiles;
CREATE POLICY "select_own_or_admin_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_admin_only_profiles" ON profiles;
CREATE POLICY "update_admin_only_profiles" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Backfill profiles for any existing auth users
INSERT INTO public.profiles (id, email, role)
SELECT a.id, a.email,
  CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'user' END
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.id);
