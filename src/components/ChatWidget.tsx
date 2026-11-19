
import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorSession, setVisitorSession] = useState<VisitorSession | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const createSession = async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
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

    const initialize = async () => {
      try {
        const stored = localStorage.getItem('majib_visitor_session');

        if (stored) {
          const parsed = JSON.parse(stored) as VisitorSession;

          if (
            parsed.visitor_id &&
            parsed.visitor_token &&
            (!parsed.expires_at || parsed.expires_at > Date.now())
          ) {
            if (!cancelled) setVisitorSession(parsed);
            return;
          }

          localStorage.removeItem('majib_visitor_session');
        }

        const created = await createSession();

        if (!cancelled) {
          setVisitorSession(created);
        }
      } catch (error) {
        console.error('Visitor session initialization failed:', error);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()
      .then(({ data }) => {
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

    return () => {
      cancelled = true;
    };
  }, [assistantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const msgText = input.trim();

    if (!msgText || loading || !visitorSession) return;

    const userMsg: WidgetMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: msgText
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiUrl =
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          message: msgText,
          visitor_id: visitorSession.visitor_id,
          visitor_token: visitorSession.visitor_token,
          conversation_id: conversationId
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'فشل الاتصال بالخادم');
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: String(data.reply || '')
        }
      ]);

    } catch (error) {
      console.error('Chat request failed:', error);

      setMessages(prev => [
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
      <div
        dir={dir}
        className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        <div
          className="px-5 py-4 flex items-center gap-3 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-medium">
              {assistant?.name ?? 'مَجيب'}
            </h3>
            <p className="text-xs opacity-80">مساعد ذكي</p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50"
        >
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex ${
                m.role === 'user'
                  ? 'justify-end'
                  : 'justify-start'
              } animate-fade-in`}
            >
              <div
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
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 flex gap-1.5">
                <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="اكتب رسالتك..."
              disabled={loading || !visitorSession}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              style={{
                textAlign: dir === 'rtl' ? 'right' : 'left'
              }}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !visitorSession}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Send
                className="w-4 h-4"
                style={{
                  transform: dir === 'rtl' ? 'scaleX(-1)' : ''
                }}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className="fixed bottom-6 left-6 z-50"
      style={{ fontFamily: 'inherit' }}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white pulse-ring transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div
          className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up flex flex-col"
          style={{ maxHeight: '500px' }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>

              <span className="font-medium text-sm">
                {assistant?.name ?? 'مَجيب'}
              </span>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50"
          >
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                } animate-fade-in`}
              >
                <div
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
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tr-sm px-3 py-2.5 flex gap-1.5">
                  <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-slate-300 rounded-full" />
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="اكتب رسالتك..."
                disabled={loading || !visitorSession}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                style={{
                  textAlign: dir === 'rtl' ? 'right' : 'left'
                }}
              />

              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !visitorSession}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Send
                  className="w-4 h-4"
                  style={{
                    transform: dir === 'rtl' ? 'scaleX(-1)' : ''
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
