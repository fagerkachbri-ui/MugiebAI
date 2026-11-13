
-- Secure owner bootstrap: public signups never receive admin automatically.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a regular user profile on signup. Platform admin assignment is a separate, verified owner-only bootstrap operation.';

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;

-- Backfill missing profiles as regular users.
-- Existing roles are preserved.
INSERT INTO public.profiles (id, email, role)
SELECT u.id, COALESCE(u.email, ''), 'user'
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles AS p
  WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
