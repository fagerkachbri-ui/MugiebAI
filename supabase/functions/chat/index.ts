import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Rate limit & usage limits
const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_PER_VISITOR = 10;
const MONTHLY_MESSAGE_LIMIT = 200;

interface ChatRequest {
  assistant_id: string;
  message: string;
  visitor_id: string;
  conversation_id?: string;
  visitor_name?: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function findRelevantSources(
  query: string,
  sources: {
    title: string;
    content: string;
    question: string | null;
    source_type: string;
  }[],
  limit = 5,
): { title: string; content: string }[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = sources.map((s) => {
    const text = (
      (s.question ?? '') + ' ' + s.content + ' ' + s.title
    ).toLowerCase();

    let score = 0;

    for (const word of queryWords) {
      if (text.includes(word)) score += 1;
    }

    if (s.question && s.question.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    return { ...s, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      title: s.title,
      content: s.content,
    }));
}

async function callOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<{ reply: string; tokens: number }> {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  const reply =
    data.choices?.[0]?.message?.content ??
    'عذرًا، لم أتمكن من توليد إجابة.';

  const tokens =
    data.usage?.total_tokens ??
    estimateTokens(systemPrompt + JSON.stringify(messages) + reply);

  return { reply, tokens };
}

async function checkRateLimit(
  visitorId: string,
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', windowStart);

  // This is a global message count, not a true per-visitor limit.
  // The actual visitor check below uses usage_logs.
  return (count ?? 0) < 10000;
}

async function checkVisitorRateLimit(
  visitorId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('visitor_id', visitorId)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Visitor rate-limit check failed:', error.message);

    return {
      allowed: false,
      reason: 'تعذر التحقق من حدود الاستخدام. يرجى المحاولة لاحقًا.',
    };
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_VISITOR) {
    return {
      allowed: false,
      reason:
        'تم إرسال عدد كبير من الرسائل في وقت قصير. يرجى الانتظار قليلاً ثم المحاولة.',
    };
  }

  return { allowed: true };
}

async function checkMonthlyLimit(
  assistantId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('assistant_id', assistantId)
    .gte('created_at', monthStart.toISOString());

  if (error) {
    console.error('Monthly usage check failed:', error.message);

    return {
      allowed: false,
      reason: 'تعذر التحقق من حدود الاستخدام. يرجى المحاولة لاحقًا.',
    };
  }

  if ((count ?? 0) >= MONTHLY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      reason:
        'تم الوصول إلى الحد الشهري للرسائل. يرجى الترقية للمتابعة.',
    };
  }

  return { allowed: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'طريقة الطلب غير مدعومة' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const body: ChatRequest = await req.json();

    const {
      assistant_id,
      message,
      visitor_id,
      conversation_id,
      visitor_name,
    } = body;

    if (
      typeof assistant_id !== 'string' ||
      !assistant_id.trim() ||
      typeof message !== 'string' ||
      !message.trim() ||
      typeof visitor_id !== 'string' ||
      !visitor_id.trim()
    ) {
      return new Response(
        JSON.stringify({ error: 'بيانات غير مكتملة أو غير صحيحة' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Fetch assistant
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistant_id)
      .single();

    if (assistantError || !assistant) {
      return new Response(
        JSON.stringify({ error: 'المساعد غير موجود' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    if (!assistant.is_active) {
      return new Response(
        JSON.stringify({
          error: 'هذا المساعد غير مفعّل حاليًا',
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Check monthly usage limit
    const monthlyCheck = await checkMonthlyLimit(assistant_id);

    if (!monthlyCheck.allowed) {
      return new Response(
        JSON.stringify({ error: monthlyCheck.reason }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Check visitor rate limit
    const rateCheck = await checkVisitorRateLimit(visitor_id);

    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateCheck.reason }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Fetch knowledge sources
    const { data: sources, error: sourcesError } = await supabase
      .from('knowledge_sources')
      .select('title, content, question, source_type')
      .eq('assistant_id', assistant_id);

    if (sourcesError) {
      console.error('Knowledge sources fetch failed:', sourcesError.message);

      return new Response(
        JSON.stringify({
          error: 'تعذر تحميل قاعدة المعرفة. يرجى المحاولة لاحقًا.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const relevant = findRelevantSources(message, sources ?? []);

    // Build knowledge context
    let knowledgeContext = '';

    if (relevant.length > 0) {
      knowledgeContext =
        '\n\nالمعلومات المتوفرة لديك:\n' +
        relevant
          .map((s, i) => `[${i + 1}] ${s.title}:\n${s.content}`)
          .join('\n\n');
    }

    const systemPrompt =
      assistant.instructions +
      '\n\nيجب أن تجيب باللغة ' +
      (assistant.language === 'ar' ? 'العربية' : 'الإنجليزية') +
      (relevant.length === 0
        ? '\n\nلا توجد معلومات كافية في قاعدة المعرفة للإجابة على هذا السؤال. اعتذر بوضوح واطلب من الزائر التواصل مع إدارة الموقع.'
        : knowledgeContext);

    // Get or create conversation
    let convId = conversation_id;

    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          assistant_id,
          visitor_id,
          visitor_name: visitor_name ?? null,
        })
        .select('id')
        .single();

      if (convError || !conv) {
        console.error(
          'Conversation creation failed:',
          convError?.message,
        );

        return new Response(
          JSON.stringify({ error: 'فشل إنشاء المحادثة' }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }

      convId = conv.id;
    }

    // SECURITY FIX:
    // Verify that an existing conversation belongs to this visitor
    // and the requested assistant before reading or writing messages.
    if (conversation_id) {
      const { data: existingConversation, error: conversationCheckError } =
        await supabase
          .from('conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('assistant_id', assistant_id)
          .eq('visitor_id', visitor_id)
          .maybeSingle();

      if (conversationCheckError) {
        console.error(
          'Conversation ownership check failed:',
          conversationCheckError.message,
        );

        return new Response(
          JSON.stringify({
            error: 'تعذر التحقق من المحادثة. يرجى المحاولة لاحقًا.',
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }

      if (!existingConversation) {
        return new Response(
          JSON.stringify({
            error:
              'المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها',
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }

    // Save user message
    const { error: userMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });

    if (userMessageError) {
      console.error(
        'Saving user message failed:',
        userMessageError.message,
      );

      return new Response(
        JSON.stringify({ error: 'تعذر حفظ الرسالة' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Fetch recent conversation history
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error(
        'Conversation history fetch failed:',
        historyError.message,
      );

      return new Response(
        JSON.stringify({
          error: 'تعذر تحميل سجل المحادثة',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const conversationMessages = (history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Generate reply
    let reply: string;
    let tokensUsed = 0;

    if (openaiApiKey) {
      const result = await callOpenAI(
        systemPrompt,
        conversationMessages,
      );

      reply = result.reply;
      tokensUsed = result.tokens;
    } else {
      // Fallback: knowledge-based answer without AI
      if (relevant.length > 0) {
        reply = relevant[0].content;

        if (relevant.length > 1) {
          reply +=
            '\n\nمعلومات إضافية قد تهمك:\n' +
            relevant
              .slice(1)
              .map(
                (s) =>
                  `• ${s.title}: ${s.content.substring(0, 150)}...`,
              )
              .join('\n');
        }
      } else {
        reply =
          'عذرًا، لا أملك معلومات كافية للإجابة على هذا السؤال. يرجى التواصل مع إدارة الموقع للحصول على مساعدة.';
      }

      tokensUsed = estimateTokens(
        systemPrompt + message + reply,
      );
    }

    // Save assistant reply
    const { error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: reply,
      });

    if (assistantMessageError) {
      console.error(
        'Saving assistant reply failed:',
        assistantMessageError.message,
      );

      return new Response(
        JSON.stringify({
          error: 'تعذر حفظ إجابة المساعد',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Update conversation timestamp
    const { error: conversationUpdateError } = await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', convId)
      .eq('assistant_id', assistant_id)
      .eq('visitor_id', visitor_id);

    if (conversationUpdateError) {
      console.error(
        'Conversation timestamp update failed:',
        conversationUpdateError.message,
      );
    }

    // Log usage
    const { error: usageLogError } = await supabase
      .from('usage_logs')
      .insert({
        assistant_id,
        user_id: assistant.user_id,
        conversation_id: convId,
        visitor_id,
        tokens_used: tokensUsed,
      });

    if (usageLogError) {
      console.error(
        'Usage logging failed:',
        usageLogError.message,
      );
    }

    return new Response(
      JSON.stringify({
        reply,
        conversation_id: convId,
        sources_used: relevant.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    console.error('Chat function error:', err);

    return new Response(
      JSON.stringify({
        error: 'حدث خطأ أثناء معالجة الرسالة. يرجى المحاولة لاحقًا.',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
