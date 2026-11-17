import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAiKey = Deno.env.get('OPENAI_API_KEY');

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitIntoChunks(input: string, maxChars = 1200, overlap = 160): string[] {
  const text = input.replace(/\r\n/g, '\n').trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      const newlineBoundary = text.lastIndexOf('\n', end);
      const bestBoundary = Math.max(boundary, newlineBoundary);
      if (bestBoundary > start + Math.floor(maxChars * 0.65)) {
        end = bestBoundary;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;

    const nextStart = Math.max(start + 1, end - overlap);
    start = nextStart;
  }

  return chunks;
}

async function createEmbeddings(chunks: string[]): Promise<number[][]> {
  if (!openAiKey) throw new Error('OPENAI_API_KEY is not configured');

  const all: number[][] = [];
  const batchSize = 64;

  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const batch = chunks.slice(offset, offset + batchSize);
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        dimensions: 1536,
        input: batch,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Embedding provider error:', response.status, detail.slice(0, 500));
      throw new Error('تعذر إنشاء التضمينات. تحقق من إعداد مفتاح OpenAI ثم أعد المحاولة.');
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.data) ? payload.data : [];
    if (rows.length !== batch.length) {
      throw new Error('Embedding provider returned an unexpected number of vectors');
    }

    const ordered = [...rows].sort((a, b) => Number(a.index) - Number(b.index));
    for (const row of ordered) {
      const vector = row.embedding;
      if (!Array.isArray(vector) || vector.length !== 1536 ||
          vector.some((n: unknown) => typeof n !== 'number' || !Number.isFinite(n))) {
        throw new Error('Embedding vector has an invalid shape');
      }
      all.push(vector as number[]);
    }
  }

  return all;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'طريقة الطلب غير مدعومة' }, 405);

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ error: 'يلزم تسجيل الدخول' }, 401);

    // Verify the caller's JWT with Supabase Auth; never trust a user_id from the browser.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${tokenMatch[1]}` } },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(tokenMatch[1]);
    if (authError || !authData.user) return json({ error: 'جلسة الدخول غير صالحة أو منتهية' }, 401);
    const userId = authData.user.id;

    const body = await req.json();
    const action = body?.action;

    if (action === 'delete') {
      const { sourceId, assistantId } = body;
      if (!isUuid(sourceId) || !isUuid(assistantId)) {
        return json({ error: 'معرّفات غير صحيحة' }, 400);
      }

      const { data: deleted, error } = await service
        .from('knowledge_sources')
        .delete()
        .eq('id', sourceId)
        .eq('assistant_id', assistantId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Knowledge deletion failed:', error.message);
        return json({ error: 'تعذر حذف مصدر المعرفة' }, 500);
      }
      if (!deleted) return json({ error: 'المصدر غير موجود أو لا تملك صلاحية حذفه' }, 404);
      return json({ success: true, id: deleted.id });
    }

    if (action !== 'save') return json({ error: 'إجراء غير معروف' }, 400);

    const assistantId = body?.assistantId;
    const sourceId = body?.sourceId ?? null;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const sourceType = body?.sourceType === 'qa' ? 'qa' : 'text';
    const question = typeof body?.question === 'string' ? body.question.trim() : null;

    if (!isUuid(assistantId) || (sourceId !== null && !isUuid(sourceId))) {
      return json({ error: 'معرّف المساعد أو المصدر غير صحيح' }, 400);
    }
    if (!title || title.length > 200 || !content || content.length > 500000 ||
        (question && question.length > 2000)) {
      return json({ error: 'العنوان أو المحتوى غير صالح. الحد الأقصى للمحتوى 500 ألف حرف.' }, 400);
    }
    if (sourceType === 'qa' && !question) {
      return json({ error: 'أدخل السؤال المرتبط بهذا الجواب' }, 400);
    }

    const { data: assistant, error: assistantError } = await service
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistantId)
      .eq('user_id', userId)
      .maybeSingle();

    if (assistantError || !assistant) {
      return json({ error: 'المساعد غير موجود أو لا تملك صلاحية إدارته' }, 403);
    }

    if (sourceId) {
      const { data: existing, error: existingError } = await service
        .from('knowledge_sources')
        .select('id')
        .eq('id', sourceId)
        .eq('assistant_id', assistantId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError || !existing) {
        return json({ error: 'مصدر المعرفة غير موجود أو لا تملك صلاحية تعديله' }, 403);
      }
    }

    const chunks = splitIntoChunks(content);
    if (chunks.length < 1 || chunks.length > 600) {
      return json({ error: 'حجم المحتوى ينتج عدداً غير مدعوم من المقاطع' }, 400);
    }

    const vectors = await createEmbeddings(chunks);
    const chunkPayload = chunks.map((chunk, index) => ({
      chunk_index: index,
      chunk_text: chunk,
      // pgvector accepts its canonical textual array representation.
      embedding: `[${vectors[index].join(',')}]`,
    }));

    const { data: savedId, error: saveError } = await service.rpc(
      'save_knowledge_source_with_chunks',
      {
        p_source_id: sourceId,
        p_assistant_id: assistantId,
        p_user_id: userId,
        p_title: title,
        p_content: content,
        p_source_type: sourceType,
        p_question: question,
        p_chunks: chunkPayload,
      },
    );

    if (saveError || !savedId) {
      console.error('Atomic knowledge save failed:', saveError?.message);
      return json({ error: 'تعذر حفظ مصدر المعرفة ومقاطع البحث. لم يتم اعتماد التغيير.' }, 500);
    }

    const { data: savedSource, error: readError } = await service
      .from('knowledge_sources')
      .select('*')
      .eq('id', savedId)
      .eq('assistant_id', assistantId)
      .eq('user_id', userId)
      .single();

    if (readError || !savedSource) {
      console.error('Saved source read-back failed:', readError?.message);
      return json({ error: 'تم الحفظ لكن تعذر تحميل بيانات المصدر. أعد تحميل الصفحة.' }, 500);
    }

    return json({
      success: true,
      source: savedSource,
      chunk_count: chunks.length,
      embedding_model: 'text-embedding-3-small',
      dimensions: 1536,
    });
  } catch (error) {
    console.error('Knowledge ingest error:', error);
    return json({
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء معالجة المعرفة',
    }, 500);
  }
});
