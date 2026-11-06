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

export default function ChatWidget({ assistantId, embedded = false }: ChatWidgetProps) {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId] = useState(() => {
    const stored = localStorage.getItem('majib_visitor_id');
    if (stored) return stored;
    const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('majib_visitor_id', id);
    return id;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAssistant(data);
          setMessages([{ id: 'welcome', role: 'assistant', content: data.welcome_message }]);
        }
      });
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
    if (!input.trim() || loading) return;

    const userMsg: WidgetMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const msgText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          message: msgText,
          visitor_id: visitorId,
          conversation_id: conversationId,
        }),
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

      setMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, role: 'assistant', content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e_${Date.now()}`, role: 'assistant', content: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, assistantId, visitorId, conversationId]);

  const dir = assistant?.direction ?? 'rtl';

  if (embedded) {
    // Full embedded chat (demo page style)
    return (
      <div
        dir={dir}
        className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        <div
          className="px-5 py-4 flex items-center gap-3 text-white"
          style={{ backgroundColor: assistant?.primary_color ?? '#0EA5E9' }}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium">{assistant?.name ?? 'مَجيب'}</h3>
            <p className="text-xs opacity-80">مساعد ذكي</p>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'text-white rounded-tl-sm'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tr-sm'
                }`}
                style={m.role === 'user' ? { backgroundColor: assistant?.primary_color ?? '#0EA5E9' } : {}}
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالتك..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: assistant?.primary_color ?? '#0EA5E9' }}
            >
              <Send className="w-4 h-4" style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : '' }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating bubble widget
  return (
    <div dir={dir} className="fixed bottom-6 left-6 z-50" style={{ fontFamily: 'inherit' }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white pulse-ring transition-transform hover:scale-110"
          style={{ backgroundColor: assistant?.primary_color ?? '#0EA5E9' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up flex flex-col" style={{ maxHeight: '500px' }}>
          <div
            className="px-4 py-3 flex items-center justify-between text-white"
            style={{ backgroundColor: assistant?.primary_color ?? '#0EA5E9' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">{assistant?.name ?? 'مَجيب'}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'text-white rounded-tl-sm'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tr-sm'
                  }`}
                  style={m.role === 'user' ? { backgroundColor: assistant?.primary_color ?? '#0EA5E9' } : {}}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="اكتب رسالتك..."
                disabled={loading}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: assistant?.primary_color ?? '#0EA5E9' }}
              >
                <Send className="w-4 h-4" style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : '' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
