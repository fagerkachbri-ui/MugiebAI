
BEGIN;

-- Account-wide shared knowledge: NULL assistant_id means visible to all
-- assistants owned by the same user. Existing assistant-specific rows stay scoped.
ALTER TABLE public.knowledge_sources ALTER COLUMN assistant_id DROP NOT NULL;
ALTER TABLE public.knowledge_embeddings ALTER COLUMN assistant_id DROP NOT NULL;

ALTER TABLE public.knowledge_sources
  DROP CONSTRAINT IF EXISTS knowledge_sources_assistant_id_fkey;
ALTER TABLE public.knowledge_sources
  ADD CONSTRAINT knowledge_sources_assistant_id_fkey
  FOREIGN KEY (assistant_id) REFERENCES public.assistants(id) ON DELETE SET NULL;

ALTER TABLE public.knowledge_embeddings
  DROP CONSTRAINT IF EXISTS knowledge_embeddings_assistant_id_fkey;
ALTER TABLE public.knowledge_embeddings
  ADD CONSTRAINT knowledge_embeddings_assistant_id_fkey
  FOREIGN KEY (assistant_id) REFERENCES public.assistants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_user_scope
  ON public.knowledge_sources (user_id, assistant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_user_scope
  ON public.knowledge_embeddings (user_id, assistant_id);

CREATE OR REPLACE FUNCTION public.save_knowledge_source_with_chunks(
  p_source_id uuid,
  p_assistant_id uuid,
  p_user_id uuid,
  p_title text,
  p_content text,
  p_source_type text,
  p_question text,
  p_chunks jsonb,
  p_is_shared boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_source_id uuid;
  v_target_assistant_id uuid;
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

  SELECT count(*)::integer,
         count(DISTINCT x.chunk_index)::integer,
         min(x.chunk_index),
         max(x.chunk_index)
    INTO v_chunk_rows, v_distinct_chunk_indexes,
         v_min_chunk_index, v_max_chunk_index
  FROM jsonb_to_recordset(p_chunks) AS x(
    chunk_index integer, chunk_text text, embedding text
  );

  IF v_chunk_rows <> v_chunk_count
     OR v_distinct_chunk_indexes <> v_chunk_count
     OR v_min_chunk_index <> 0
     OR v_max_chunk_index <> v_chunk_count - 1
     OR EXISTS (
       SELECT 1
       FROM jsonb_to_recordset(p_chunks) AS x(
         chunk_index integer, chunk_text text, embedding text
       )
       WHERE x.chunk_index IS NULL
          OR length(btrim(coalesce(x.chunk_text, ''))) < 1
          OR length(x.chunk_text) > 5000
          OR nullif(btrim(coalesce(x.embedding, '')), '') IS NULL
     ) THEN
    RAISE EXCEPTION 'Invalid knowledge chunk data';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.assistants a
    WHERE a.id = p_assistant_id AND a.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Assistant ownership check failed';
  END IF;

  v_target_assistant_id := CASE WHEN coalesce(p_is_shared, false)
    THEN NULL ELSE p_assistant_id END;

  IF p_source_id IS NULL THEN
    INSERT INTO public.knowledge_sources (
      assistant_id, user_id, title, content, source_type, question
    )
    VALUES (
      v_target_assistant_id, p_user_id, btrim(p_title), p_content,
      p_source_type, NULLIF(btrim(coalesce(p_question, '')), '')
    )
    RETURNING id INTO v_source_id;
  ELSE
    UPDATE public.knowledge_sources
    SET assistant_id = v_target_assistant_id,
        title = btrim(p_title),
        content = p_content,
        source_type = p_source_type,
        question = NULLIF(btrim(coalesce(p_question, '')), '')
    WHERE id = p_source_id
      AND user_id = p_user_id
      AND (assistant_id = p_assistant_id OR assistant_id IS NULL)
    RETURNING id INTO v_source_id;

    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'Knowledge source not found or not owned';
    END IF;
  END IF;

  DELETE FROM public.knowledge_embeddings
  WHERE source_id = v_source_id;

  INSERT INTO public.knowledge_embeddings (
    source_id, assistant_id, user_id, chunk_index, chunk_text, embedding
  )
  SELECT
    v_source_id, v_target_assistant_id, p_user_id,
    x.chunk_index, x.chunk_text,
    x.embedding::extensions.vector(1536)
  FROM jsonb_to_recordset(p_chunks) AS x(
    chunk_index integer, chunk_text text, embedding text
  )
  ORDER BY x.chunk_index;

  RETURN v_source_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_knowledge_source_with_chunks(
  uuid, uuid, uuid, text, text, text, text, jsonb, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_knowledge_source_with_chunks(
  uuid, uuid, uuid, text, text, text, text, jsonb, boolean
) TO service_role;

CREATE OR REPLACE FUNCTION public.match_knowledge_hybrid(
  p_assistant_id uuid,
  p_user_id uuid,
  p_query_text text,
  p_query_embedding extensions.vector(1536) DEFAULT NULL,
  p_match_count integer DEFAULT 8,
  p_match_threshold double precision DEFAULT 0.35
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  question text,
  source_type text,
  lexical_score real,
  semantic_score real,
  combined_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET hnsw.ef_search = 100
AS $function$
  WITH authorized_assistant AS (
    SELECT a.id, a.user_id
    FROM public.assistants a
    WHERE a.id = p_assistant_id
      AND a.user_id = p_user_id
      AND a.is_active = true
  ),
  query_terms AS (
    SELECT CASE
      WHEN nullif(trim(coalesce(p_query_text, '')), '') IS NULL THEN NULL
      ELSE websearch_to_tsquery('simple', p_query_text)
    END AS tsq
  ),
  lexical_candidates AS (
    SELECT k.id, ts_rank_cd(k.search_document, q.tsq)::real AS score
    FROM public.knowledge_sources k
    JOIN authorized_assistant a ON a.user_id = k.user_id
    CROSS JOIN query_terms q
    WHERE (k.assistant_id = p_assistant_id OR k.assistant_id IS NULL)
      AND q.tsq IS NOT NULL
      AND k.search_document @@ q.tsq
    ORDER BY score DESC
    LIMIT 30
  ),
  lexical AS (
    SELECT id, score,
      row_number() OVER (ORDER BY score DESC, id)::integer AS search_rank
    FROM lexical_candidates
  ),
  semantic_candidates AS (
    SELECT ke.source_id, ke.chunk_text,
      (1 - (ke.embedding OPERATOR(extensions.<=>) p_query_embedding))::real AS score
    FROM public.knowledge_embeddings ke
    JOIN public.knowledge_sources k
      ON k.id = ke.source_id
     AND k.user_id = ke.user_id
     AND k.assistant_id IS NOT DISTINCT FROM ke.assistant_id
    JOIN authorized_assistant a ON a.user_id = ke.user_id
    WHERE (ke.assistant_id = p_assistant_id OR ke.assistant_id IS NULL)
      AND p_query_embedding IS NOT NULL
    ORDER BY ke.embedding OPERATOR(extensions.<=>) p_query_embedding
    LIMIT 200
  ),
  semantic_best AS (
    SELECT DISTINCT ON (source_id)
      source_id AS id, chunk_text, score
    FROM semantic_candidates
    WHERE score >= greatest(0, least(coalesce(p_match_threshold, 0.35), 1))
    ORDER BY source_id, score DESC
  ),
  semantic AS (
    SELECT id, chunk_text, score,
      row_number() OVER (ORDER BY score DESC, id)::integer AS search_rank
    FROM semantic_best
    ORDER BY score DESC
    LIMIT 30
  ),
  fused AS (
    SELECT coalesce(l.id, s.id) AS id,
      coalesce(l.score, 0)::real AS lexical_score,
      coalesce(s.score, 0)::real AS semantic_score,
      s.chunk_text,
      (coalesce(1.0 / (60 + l.search_rank), 0) +
       coalesce(1.0 / (60 + s.search_rank), 0))::real AS combined_score
    FROM lexical l
    FULL OUTER JOIN semantic s ON s.id = l.id
  )
  SELECT k.id, k.title, coalesce(f.chunk_text, k.content) AS content,
    k.question, k.source_type,
    f.lexical_score, f.semantic_score, f.combined_score
  FROM fused f
  JOIN public.knowledge_sources k ON k.id = f.id
  JOIN authorized_assistant a ON a.user_id = k.user_id
  WHERE (k.assistant_id = p_assistant_id OR k.assistant_id IS NULL)
  ORDER BY f.combined_score DESC, k.created_at DESC
  LIMIT greatest(1, least(coalesce(p_match_count, 8), 20));
$function$;

REVOKE ALL ON FUNCTION public.match_knowledge_hybrid(
  uuid, uuid, text, extensions.vector, integer, double precision
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_knowledge_hybrid(
  uuid, uuid, text, extensions.vector, integer, double precision
) TO service_role;

COMMIT;
