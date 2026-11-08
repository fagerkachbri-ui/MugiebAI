-- ============================================================
-- MugiebAI Security Hardening
-- Knowledge ownership + primary color validation
-- ============================================================

-- 1. Protect knowledge source INSERT ownership
DROP POLICY IF EXISTS "insert_own_knowledge"
ON public.knowledge_sources;

CREATE POLICY "insert_own_knowledge"
ON public.knowledge_sources
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.assistants AS a
    WHERE a.id = knowledge_sources.assistant_id
      AND a.user_id = auth.uid()
  )
);

-- 2. Protect knowledge source UPDATE ownership
DROP POLICY IF EXISTS "update_own_knowledge"
ON public.knowledge_sources;

CREATE POLICY "update_own_knowledge"
ON public.knowledge_sources
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.assistants AS a
    WHERE a.id = knowledge_sources.assistant_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.assistants AS a
    WHERE a.id = knowledge_sources.assistant_id
      AND a.user_id = auth.uid()
  )
);

-- 3. Normalize invalid legacy colors
UPDATE public.assistants
SET primary_color = '#0EA5E9'
WHERE primary_color IS NULL
   OR primary_color !~ '^#[0-9A-Fa-f]{6}$';

-- 4. Enforce strict hexadecimal color format
ALTER TABLE public.assistants
DROP CONSTRAINT IF EXISTS assistants_primary_color_hex_check;

ALTER TABLE public.assistants
ADD CONSTRAINT assistants_primary_color_hex_check
CHECK (
  primary_color ~ '^#[0-9A-Fa-f]{6}$'
);