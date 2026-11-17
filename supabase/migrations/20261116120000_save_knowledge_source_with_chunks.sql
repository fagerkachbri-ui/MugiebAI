<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>محتوى ملف قاعدة البيانات</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f4f6f8;
            color: #333;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
        }
        .container {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            position: relative;
        }
        .header {
            background: #1e293b;
            color: #fff;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h2 {
            margin: 0;
            font-size: 1.1rem;
        }
        button {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        button:hover {
            background-color: #2563eb;
        }
        pre {
            background-color: #0f172a;
            color: #e2e8f0;
            padding: 20px;
            margin: 0;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            direction: ltr;
            text-align: left;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h2>محتوى الملف البرمجي (SQL Migration)[span_0](start_span)[span_0](end_span)</h2>
        <button id="copyBtn" onclick="copyContent()">نسخ المحتوى</button>
    </div>
    <pre id="fileContent">-- MugiebAI: atomic knowledge source + embedding replacement.[span_1](start_span)[span_1](end_span)
-- Apply only after reviewing the matching Edge Function deployment.[span_2](start_span)[span_2](end_span)
-- This migration adds one service-role-only RPC; it does not recreate existing tables or search functions.[span_3](start_span)[span_3](end_span)

BEGIN;[span_4](start_span)[span_4](end_span)

CREATE OR REPLACE FUNCTION public.save_knowledge_source_with_chunks([span_5](start_span)[span_5](end_span)
  p_source_id uuid,[span_6](start_span)[span_6](end_span)
  p_assistant_id uuid,[span_7](start_span)[span_7](end_span)
  p_user_id uuid,[span_8](start_span)[span_8](end_span)
  p_title text,[span_9](start_span)[span_9](end_span)
  p_content text,[span_10](start_span)[span_10](end_span)
  p_source_type text,[span_11](start_span)[span_11](end_span)
  p_question text,[span_12](start_span)[span_12](end_span)
  p_chunks jsonb[span_13](start_span)[span_13](end_span)
)[span_14](start_span)[span_14](end_span)
RETURNS uuid[span_15](start_span)[span_15](end_span)
LANGUAGE plpgsql[span_16](start_span)[span_16](end_span)
SECURITY DEFINER[span_17](start_span)[span_17](end_span)
SET search_path = pg_catalog, public, extensions[span_18](start_span)[span_18](end_span)
AS $function$[span_19](start_span)[span_19](end_span)
DECLARE[span_20](start_span)[span_20](end_span)
  v_source_id uuid;[span_21](start_span)[span_21](end_span)
  v_chunk_count integer;[span_22](start_span)[span_22](end_span)
BEGIN[span_23](start_span)[span_23](end_span)
  IF p_assistant_id IS NULL OR p_user_id IS NULL THEN[span_24](start_span)[span_24](end_span)
    RAISE EXCEPTION 'Missing ownership identifiers';[span_25](start_span)[span_25](end_span)
  END IF;[span_26](start_span)[span_26](end_span)

  IF length(trim(coalesce(p_title, ''))) < 1[span_27](start_span)[span_27](end_span)
     OR length(p_title) > 200[span_28](start_span)[span_28](end_span)
     OR length(coalesce(p_content, '')) < 1[span_29](start_span)[span_29](end_span)
     OR length(p_content) > 500000[span_30](start_span)[span_30](end_span)
     OR p_source_type NOT IN ('text', 'qa') THEN[span_31](start_span)[span_31](end_span)
    RAISE EXCEPTION 'Invalid knowledge source data';[span_32](start_span)[span_32](end_span)
  END IF;[span_33](start_span)[span_33](end_span)

  IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' THEN[span_34](start_span)[span_34](end_span)
    RAISE EXCEPTION 'Chunks must be a JSON array';[span_35](start_span)[span_35](end_span)
  END IF;[span_36](start_span)[span_36](end_span)

  v_chunk_count := jsonb_array_length(p_chunks);[span_37](start_span)[span_37](end_span)
  IF v_chunk_count < 1 OR v_chunk_count > 600 THEN[span_38](start_span)[span_38](end_span)
    RAISE EXCEPTION 'Invalid chunk count';[span_39](start_span)[span_39](end_span)
  END IF;[span_40](start_span)[span_40](end_span)

  IF NOT EXISTS ([span_41](start_span)[span_41](end_span)
    SELECT 1[span_42](start_span)[span_42](end_span)
    FROM public.assistants a[span_43](start_span)[span_43](end_span)
    WHERE a.id = p_assistant_id[span_44](start_span)[span_44](end_span)
      AND a.user_id = p_user_id[span_45](start_span)[span_45](end_span)
  ) THEN[span_46](start_span)[span_46](end_span)
    RAISE EXCEPTION 'Assistant ownership check failed';[span_47](start_span)[span_47](end_span)
  END IF;[span_48](start_span)[span_48](end_span)

  IF p_source_id IS NULL THEN[span_49](start_span)[span_49](end_span)
    INSERT INTO public.knowledge_sources ([span_50](start_span)[span_50](end_span)
      assistant_id, user_id, title, content, source_type, question[span_51](start_span)[span_51](end_span)
    )[span_52](start_span)[span_52](end_span)
    VALUES ([span_53](start_span)[span_53](end_span)
      p_assistant_id, p_user_id, trim(p_title), p_content,[span_54](start_span)[span_54](end_span)
      p_source_type, NULLIF(trim(coalesce(p_question, '')), '')[span_55](start_span)[span_55](end_span)
    )[span_56](start_span)[span_56](end_span)
    RETURNING id INTO v_source_id;[span_57](start_span)[span_57](end_span)
  ELSE[span_58](start_span)[span_58](end_span)
    UPDATE public.knowledge_sources[span_59](start_span)[span_59](end_span)
    SET title = trim(p_title),[span_60](start_span)[span_60](end_span)
        content = p_content,[span_61](start_span)[span_61](end_span)
        source_type = p_source_type,[span_62](start_span)[span_62](end_span)
        question = NULLIF(trim(coalesce(p_question, '')), '')[span_63](start_span)[span_63](end_span)
    WHERE id = p_source_id[span_64](start_span)[span_64](end_span)
      AND assistant_id = p_assistant_id[span_65](start_span)[span_65](end_span)
      AND user_id = p_user_id[span_66](start_span)[span_66](end_span)
    RETURNING id INTO v_source_id;[span_67](start_span)[span_67](end_span)

    IF v_source_id IS NULL THEN[span_68](start_span)[span_68](end_span)
      RAISE EXCEPTION 'Knowledge source not found or not owned';[span_69](start_span)[span_69](end_span)
    END IF;[span_70](start_span)[span_70](end_span)
  END IF;[span_71](start_span)[span_71](end_span)

  -- Delete + insert occur in the same transaction as the source update.[span_72](start_span)[span_72](end_span)
  DELETE FROM public.knowledge_embeddings[span_73](start_span)[span_73](end_span)
  WHERE source_id = v_source_id[span_74](start_span)[span_74](end_span)
    AND assistant_id = p_assistant_id[span_75](start_span)[span_75](end_span)
    AND user_id = p_user_id;[span_76](start_span)[span_76](end_span)

  INSERT INTO public.knowledge_embeddings ([span_77](start_span)[span_77](end_span)
    source_id, assistant_id, user_id, chunk_index, chunk_text, embedding[span_78](start_span)[span_78](end_span)
  )[span_79](start_span)[span_79](end_span)
  SELECT[span_80](start_span)[span_80](end_span)
    v_source_id,[span_81](start_span)[span_81](end_span)
    p_assistant_id,[span_82](start_span)[span_82](end_span)
    p_user_id,[span_83](start_span)[span_83](end_span)
    x.chunk_index,[span_84](start_span)[span_84](end_span)
    x.chunk_text,[span_85](start_span)[span_85](end_span)
    x.embedding::extensions.vector(1536)[span_86](start_span)[span_86](end_span)
  FROM jsonb_to_recordset(p_chunks) AS x([span_87](start_span)[span_87](end_span)
    chunk_index integer,[span_88](start_span)[span_88](end_span)
    chunk_text text,[span_89](start_span)[span_89](end_span)
    embedding text[span_90](start_span)[span_90](end_span)
  )[span_91](start_span)[span_91](end_span)
  ORDER BY x.chunk_index;[span_92](start_span)[span_92](end_span)

  RETURN v_source_id;[span_93](start_span)[span_93](end_span)
END;[span_94](start_span)[span_94](end_span)
$function$;[span_95](start_span)[span_95](end_span)

REVOKE ALL ON FUNCTION public.save_knowledge_source_with_chunks([span_96](start_span)[span_96](end_span)
  uuid, uuid, uuid, text, text, text, text, jsonb[span_97](start_span)[span_97](end_span)
) FROM PUBLIC, anon, authenticated;[span_98](start_span)[span_98](end_span)

GRANT EXECUTE ON FUNCTION public.save_knowledge_source_with_chunks([span_99](start_span)[span_99](end_span)
  uuid, uuid, uuid, text, text, text, text, jsonb[span_100](start_span)[span_100](end_span)
) TO service_role;[span_101](start_span)[span_101](end_span)

-- Update the token count for the usage reservation created by reserve_chat_usage.[span_102](start_span)[span_102](end_span)
-- This avoids granting broad UPDATE access on usage_logs to the Edge Function role.[span_103](start_span)[span_103](end_span)
CREATE OR REPLACE FUNCTION public.complete_chat_usage([span_104](start_span)[span_104](end_span)
  p_usage_log_id uuid,[span_105](start_span)[span_105](end_span)
  p_tokens_used integer[span_106](start_span)[span_106](end_span)
)[span_107](start_span)[span_107](end_span)
RETURNS boolean[span_108](start_span)[span_108](end_span)
LANGUAGE plpgsql[span_109](start_span)[span_109](end_span)
SECURITY DEFINER[span_110](start_span)[span_110](end_span)
SET search_path = pg_catalog, public[span_111](start_span)[span_111](end_span)
AS $function$[span_112](start_span)[span_112](end_span)
BEGIN[span_113](start_span)[span_113](end_span)
  IF p_usage_log_id IS NULL OR p_tokens_used IS NULL OR p_tokens_used < 0 THEN[span_114](start_span)[span_114](end_span)
    RETURN false;[span_115](start_span)[span_115](end_span)
  END IF;[span_116](start_span)[span_116](end_span)

  UPDATE public.usage_logs[span_117](start_span)[span_117](end_span)
  SET tokens_used = p_tokens_used[span_118](start_span)[span_118](end_span)
  WHERE id = p_usage_log_id;[span_119](start_span)[span_119](end_span)

  RETURN FOUND;[span_120](start_span)[span_120](end_span)
END;[span_121](start_span)[span_121](end_span)
$function$;[span_122](start_span)[span_122](end_span)

REVOKE ALL ON FUNCTION public.complete_chat_usage(uuid, integer)[span_123](start_span)[span_123](end_span)
FROM PUBLIC, anon, authenticated;[span_124](start_span)[span_124](end_span)

GRANT EXECUTE ON FUNCTION public.complete_chat_usage(uuid, integer)[span_125](start_span)[span_125](end_span)
TO service_role;[span_126](start_span)[span_126](end_span)

COMMIT;[span_127](start_span)[span_127](end_span)</pre>
</div>

<script>
    function copyContent() {
        const textToCopy = document.getElementById('fileContent').innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = 'تم النسخ بنجاح!';
            btn.style.backgroundColor = '#10b981';
            setTimeout(() => {
                btn.textContent = 'نسخ المحتوى';
                btn.style.backgroundColor = '#3b82f6';
            }, 2000);
        }).catch(err => {
            console.error('فشل في نسخ المحتوى: ', err);
        });
    }
</script>

</body>
</html>

