<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatWidget.tsx</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
        }
        .container {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            background: #0f172a;
            color: #fff;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h2 {
            margin: 0;
            font-size: 1.1rem;
        }
        button.copy-btn {
            background-color: #0ea5e9;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            transition: background-color 0.2s;
        }
        button.copy-btn:hover {
            background-color: #0284c7;
        }
        pre {
            background-color: #090d16;
            color: #e2e8f0;
            padding: 24px;
            margin: 0;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85rem;
            line-height: 1.6;
            direction: ltr;
            text-align: left;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h2>src/components/ChatWidget.tsx</h2>
        <button id="copyBtn" class="copy-btn" onclick="copyContent()">نسخ الكود كاملاً</button>
    </div>
    <pre id="fileContent">import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Assistant } from '@/lib/types';
import { Bot, Send, X, MessageCircle } from 'lucide-react';

interface ChatWidgetProps {
  assistantId: string;
  embedded?: boolean;
}

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface VisitorSession {
  visitor_id: string;
  visitor_token: string;
  expires_at?: number;
}

const DEFAULT_COLOR = '#0EA5E9';

function getSafeColor(value: unknown): string {
  if (
    typeof value === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return value;
  }

  return DEFAULT_COLOR;
}

export default function ChatWidget({
  assistantId,
  embedded = false
}: ChatWidgetProps) {
  const [assistant, setAssistant] = useState&lt;Assistant | null&gt;(null);
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState&lt;WidgetMessage[]&gt;([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState&lt;string | null&gt;(null);

  const [visitorSession, setVisitorSession] = useState&lt;VisitorSession | null&gt;(null);

  const scrollRef = useRef&lt;HTMLDivElement&gt;(null);
  const inputRef = useRef&lt;HTMLInputElement&gt;(null);

  useEffect(() =&gt; {
    let cancelled = false;

    const createSession = async () =&gt; {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'create_visitor_session' }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data?.visitor_id || !data?.visitor_token) {
        throw new Error(data?.error || 'تعذر بدء جلسة الزائر');
      }

      const session: VisitorSession = {
        visitor_id: data.visitor_id,
        visitor_token: data.visitor_token,
        expires_at: data.expires_at,
      };

      localStorage.setItem('majib_visitor_session', JSON.stringify(session));
      return session;
    };

    const initialize = async () =&gt; {
      try {
        const stored = localStorage.getItem('majib_visitor_session');
        if (stored) {
          const parsed = JSON.parse(stored) as VisitorSession;
          if (parsed.visitor_id && parsed.visitor_token &&
              (!parsed.expires_at || parsed.expires_at &gt; Date.now())) {
            if (!cancelled) setVisitorSession(parsed);
            return;
          }
        }

        const created = await createSession();
        if (!cancelled) setVisitorSession(created);
      } catch (error) {
        console.error('Visitor session initialization failed:', error);
      }
    };

    initialize();
    return () =&gt; { cancelled = true; };
  }, []);

  useEffect(() =&gt; {
    let cancelled = false;

    supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()
      .then(({ data }) =&gt; {
        if (cancelled || !data) return;

        setAssistant(data);

        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: data.welcome_message
          }
        ]);
      });

    return () =&gt; {
      cancelled = true;
    };
  }, [assistantId]);

  useEffect(() =&gt; {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() =&gt; {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () =&gt; {
    const msgText = input.trim();

    if (!msgText || loading || !visitorSession) return;

    const userMsg: WidgetMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: msgText
    };

    setMessages(prev =&gt; [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiUrl =
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          message: msgText,
          visitor_id: visitorSession.visitor_id,
          visitor_token: visitorSession.visitor_token,
          conversation_id: conversationId
        })
      });

      if (!response.ok) {
        throw new Error('فشل الاتصال');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages(prev =&gt; [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: String(data.reply || '')
        }
      ]);

    } catch {
      setMessages(prev =&gt; [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.'
        }
      ]);

    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    assistantId,
    visitorSession,
    conversationId
  ]);

  const dir = assistant?.direction ?? 'rtl';
  const primaryColor = getSafeColor(assistant?.primary_color);

  if (embedded) {
    return (
      &lt;div
        dir={dir}
        className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ minHeight: '500px' }}
      &gt;
        &lt;div
          className="px-5 py-4 flex items-center gap-3 text-white"
          style={{ backgroundColor: primaryColor }}
        &gt;
          &lt;div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"&gt;
            &lt;Bot className="w-5 h-5" /&gt;
          &lt;/div&gt;

          &lt;div&gt;
            &lt;h3 className="font-medium"&gt;
              {assistant?.name ?? 'مَجيب'}
            &lt;/h3&gt;
            &lt;p className="text-xs opacity-80"&gt;مساعد ذكي&lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        &lt;div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50"
        &gt;
          {messages.map(m =&gt; (
            &lt;div
              key={m.id}
              className={`flex ${
                m.role === 'user'
                  ? 'justify-end'
                  : 'justify-start'
              } animate-fade-in`}
            &gt;
              &lt;div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'text-white rounded-tl-sm'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tr-sm'
                }`}
                style={
                  m.role === 'user'
                    ? { backgroundColor: primaryColor }
                    : {}
                }
              &gt;
                {m.content}
              &lt;/div&gt;
            &lt;/div&gt;
          ))}

          {loading && (
            &lt;div className="flex justify-start animate-fade-in"&gt;
              &lt;div className="bg-white border border-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 flex gap-1.5"&gt;
                &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
                &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
                &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          )}
        &lt;/div&gt;

        &lt;div className="p-3 border-t border-slate-100 bg-white"&gt;
          &lt;div className="flex items-center gap-2"&gt;
            &lt;input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e =&gt; setInput(e.target.value)}
              onKeyDown={e =&gt; {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="اكتب رسالتك..."
              disabled={loading || !visitorSession}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              style={{
                textAlign: dir === 'rtl' ? 'right' : 'left'
              }}
            /&gt;

            &lt;button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !visitorSession}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            &gt;
              &lt;Send
                className="w-4 h-4"
                style={{
                  transform: dir === 'rtl'
                    ? 'scaleX(-1)'
                    : ''
                }}
              /&gt;
            &lt;/button&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    );
  }

  return (
    &lt;div
      dir={dir}
      className="fixed bottom-6 left-6 z-50"
      style={{ fontFamily: 'inherit' }}
    &gt;
      {!open && (
        &lt;button
          onClick={() =&gt; setOpen(true)}
          className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white pulse-ring transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        &gt;
          &lt;MessageCircle className="w-6 h-6" /&gt;
        &lt;/button&gt;
      )}

      {open && (
        &lt;div
          className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up flex flex-col"
          style={{ maxHeight: '500px' }}
        &gt;
          &lt;div
            className="px-4 py-3 flex items-center justify-between text-white"
            style={{ backgroundColor: primaryColor }}
          &gt;
            &lt;div className="flex items-center gap-2"&gt;
              &lt;div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"&gt;
                &lt;Bot className="w-4 h-4" /&gt;
              &lt;/div&gt;

              &lt;span className="font-medium text-sm"&gt;
                {assistant?.name ?? 'مَجيب'}
              &lt;/span&gt;
            &lt;/div&gt;

            &lt;button
              onClick={() =&gt; setOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            &gt;
              &lt;X className="w-4 h-4" /&gt;
            &lt;/button&gt;
          &lt;/div&gt;

          &lt;div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50"
          &gt;
            {messages.map(m =&gt; (
              &lt;div
                key={m.id}
                className={`flex ${
                  m.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                } animate-fade-in`}
              &gt;
                &lt;div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'text-white rounded-tl-sm'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tr-sm'
                  }`}
                  style={
                    m.role === 'user'
                      ? { backgroundColor: primaryColor }
                      : {}
                  }
                &gt;
                  {m.content}
                &lt;/div&gt;
              &lt;/div&gt;
            ))}

            {loading && (
              &lt;div className="flex justify-start animate-fade-in"&gt;
                &lt;div className="bg-white border border-slate-100 rounded-2xl rounded-tr-sm px-3 py-2.5 flex gap-1.5"&gt;
                  &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
                  &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
                  &lt;span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" /&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}
          &lt;/div&gt;

          &lt;div className="p-2.5 border-t border-slate-100 bg-white"&gt;
            &lt;div className="flex items-center gap-2"&gt;
              &lt;input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e =&gt; setInput(e.target.value)}
                onKeyDown={e =&gt; {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="اكتب رسالتك..."
                disabled={loading || !visitorSession}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                style={{
                  textAlign: dir === 'rtl' ? 'right' : 'left'
                }}
              /&gt;

              &lt;button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !visitorSession}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              &gt;
                &lt;Send
                  className="w-4 h-4"
                  style={{
                    transform: dir === 'rtl'
                      ? 'scaleX(-1)'
                      : ''
                  }}
                /&gt;
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}</pre>
</div>

<script>
    function copyContent() {
        const textToCopy = document.getElementById('fileContent').innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = 'تم النسخ بنجاح!';
            btn.style.backgroundColor = '#10b981';
            setTimeout(() => {
                btn.textContent = 'نسخ الكود كاملاً';
                btn.style.backgroundColor = '#0ea5e9';
            }, 2000);
        }).catch(err => {
            console.error('فشل في نسخ المحتوى: ', err);
        });
    }
</script>

</body>
</html>
