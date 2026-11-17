
-- MugiebAI: atomically save a knowledge source and replace its embedding chunks.
-- This migration is intentionally service-role-only. It does not recreate tables,
-- alter the existing hybrid-search RPC, or change the existing embedding schema.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_knowledge_source_with_chunks(
  p_source_id uuid,
  p_assistant_id uuid,
  p_user_id uuid,
  p_title text,
  p_content text,
  p_source_type text,
  p_question text,
  p_chunks jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_source_id uuid;
  v_chunk_count integer;
  v_chunk_rows integer;
  v_distinct_chunk_indexes integer;
  v_min_chunk_index integer;
  v_max_chunk_index integer;
BEGIN
  IF p_assistant_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing ownership identifiers';
  END IF;

  IF length(btrim(coalesce(p_title, ''))) < 1
     OR length(p_title) > 200
     OR length(coalesce(p_content, '')) < 1
     OR length(p_content) > 500000
     OR (p_source_type IS DISTINCT FROM 'text'
         AND p_source_type IS DISTINCT FROM 'qa')
     OR length(coalesce(p_question, '')) > 2000
     OR (p_source_type = 'qa'
         AND length(btrim(coalesce(p_question, ''))) < 1) THEN
    RAISE EXCEPTION 'Invalid knowledge source data';
  END IF;

  IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Chunks must be a JSON array';
  END IF;

  v_chunk_count := jsonb_array_length(p_chunks);
  IF v_chunk_count < 1 OR v_chunk_count > 600 THEN
    RAISE EXCEPTION 'Invalid chunk count';
  END IF;

  -- Require a complete, unique, zero-based sequence of non-empty chunks.
  SELECT
    count(*)::integer,
    count(DISTINCT x.chunk_index)::integer,
    min(x.chunk_index),
    max(x.chunk_index)
  INTO
    v_chunk_rows,
    v_distinct_chunk_indexes,
    v_min_chunk_index,
    v_max_chunk_index
  FROM jsonb_to_recordset(p_chunks) AS x(
    chunk_index integer,
    chunk_text text,
    embedding text
  );

  IF v_chunk_rows <> v_chunk_count
     OR v_distinct_chunk_indexes <> v_chunk_count
     OR v_min_chunk_index <> 0
     OR v_max_chunk_index <> v_chunk_count - 1
     OR EXISTS (
       SELECT 1
       FROM jsonb_to_recordset(p_chunks) AS x(
         chunk_index integer,
         chunk_text text,
         embedding text
       )
       WHERE x.chunk_index IS NULL
          OR length(btrim(coalesce(x.chunk_text, ''))) < 1
          OR length(x.chunk_text) > 5000
          OR nullif(btrim(coalesce(x.embedding, '')), '') IS NULL
     ) THEN
    RAISE EXCEPTION 'Invalid knowledge chunk data';
  END IF;

  -- The caller must pass the authenticated user's ID, and that user must own
  -- the assistant. Never trust ownership fields without this database check.
  IF NOT EXISTS (
    SELECT 1
    FROM public.assistants AS a
    WHERE a.id = p_assistant_id
      AND a.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Assistant ownership check failed';
  END IF;

  IF p_source_id IS NULL THEN
    INSERT INTO public.knowledge_sources (
      assistant_id,
      user_id,
      title,
      content,
      source_type,
      question
    )
    VALUES (
      p_assistant_id,
      p_user_id,
      btrim(p_title),
      p_content,
      p_source_type,
      NULLIF(btrim(coalesce(p_question, '')), '')
    )
    RETURNING id INTO v_source_id;
  ELSE
    UPDATE public.knowledge_sources
    SET title = btrim(p_title),
        content = p_content,
        source_type = p_source_type,
        question = NULLIF(btrim(coalesce(p_question, '')), '')
    WHERE id = p_source_id
      AND assistant_id = p_assistant_id
      AND user_id = p_user_id
    RETURNING id INTO v_source_id;

    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'Knowledge source not found or not owned';
    END IF;
  END IF;

  -- Remove every old chunk for this already-verified source. The delete and
  -- insert share this transaction, so a failed insert restores the old chunks.
  DELETE FROM public.knowledge_embeddings
  WHERE source_id = v_source_id;

  INSERT INTO public.knowledge_embeddings (
    source_id,
    assistant_id,
    user_id,
    chunk_index,
    chunk_text,
    embedding
  )
  SELECT
    v_source_id,
    p_assistant_id,
    p_user_id,
    x.chunk_index,
    x.chunk_text,
    x.embedding::extensions.vector(1536)
  FROM jsonb_to_recordset(p_chunks) AS x(
    chunk_index integer,
    chunk_text text,
    embedding text
  )
  ORDER BY x.chunk_index;

  RETURN v_source_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_knowledge_source_with_chunks(
  uuid, uuid, uuid, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_knowledge_source_with_chunks(
  uuid, uuid, uuid, text, text, text, text, jsonb
) TO service_role;

-- Complete the usage reservation without granting broad UPDATE access to
-- usage_logs from the Edge Function.
CREATE OR REPLACE FUNCTION public.complete_chat_usage(
  p_usage_log_id uuid,
  p_tokens_used integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_usage_log_id IS NULL
     OR p_tokens_used IS NULL
     OR p_tokens_used < 0 THEN
    RETURN false;
  END IF;

  UPDATE public.usage_logs
  SET tokens_used = p_tokens_used
  WHERE id = p_usage_log_id;

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_chat_usage(uuid, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_chat_usage(uuid, integer)
TO service_role;

COMMIT;
