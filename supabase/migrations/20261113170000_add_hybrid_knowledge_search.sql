
-- MugiebAI: Hybrid knowledge search foundation
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.knowledge_sources
ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

ALTER TABLE public.knowledge_sources
ADD COLUMN IF NOT EXISTS search_document tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(question, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_search_document
ON public.knowledge_sources USING gin (search_document);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_embedding
ON public.knowledge_sources
USING hnsw (embedding extensions.vector_cosine_ops)
WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_knowledge_hybrid(
  p_assistant_id uuid,
  p_query_text text,
  p_query_embedding extensions.vector(1536) DEFAULT NULL,
  p_match_count integer DEFAULT 8
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
AS $function$
  WITH lexical AS (
    SELECT k.id,
      ts_rank_cd(
        k.search_document,
        websearch_to_tsquery('simple', coalesce(p_query_text, ''))
      )::real AS score
    FROM public.knowledge_sources k
    WHERE k.assistant_id = p_assistant_id
      AND k.search_document @@
        websearch_to_tsquery('simple', coalesce(p_query_text, ''))
    ORDER BY score DESC
    LIMIT 30
  ),
  semantic AS (
    SELECT k.id,
      greatest(
        0,
        1 - (k.embedding OPERATOR(extensions.<=>) p_query_embedding)
      )::real AS score
    FROM public.knowledge_sources k
    WHERE k.assistant_id = p_assistant_id
      AND p_query_embedding IS NOT NULL
      AND k.embedding IS NOT NULL
    ORDER BY k.embedding OPERATOR(extensions.<=>) p_query_embedding
    LIMIT 30
  ),
  fused AS (
    SELECT
      coalesce(l.id, s.id) AS id,
      coalesce(l.score, 0)::real AS lexical_score,
      coalesce(s.score, 0)::real AS semantic_score,
      (
        coalesce(l.score, 0) * 0.10 +
        coalesce(s.score, 0) * 0.90
      )::real AS combined_score
    FROM lexical l
    FULL OUTER JOIN semantic s ON s.id = l.id
  )
  SELECT
    k.id, k.title, k.content, k.question, k.source_type,
    f.lexical_score, f.semantic_score, f.combined_score
  FROM fused f
  JOIN public.knowledge_sources k ON k.id = f.id
  ORDER BY f.combined_score DESC
  LIMIT greatest(1, least(coalesce(p_match_count, 8), 20));
$function$;

REVOKE ALL ON FUNCTION public.match_knowledge_hybrid(
  uuid, text, extensions.vector, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_knowledge_hybrid(
  uuid, text, extensions.vector, integer
) TO service_role;

COMMIT;
  
