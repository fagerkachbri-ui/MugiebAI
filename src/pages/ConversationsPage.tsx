import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Conversation, Message, Assistant } from '@/lib/types';
import {
  MessageSquare,
  ChevronRight,
  Trash2,
  User,
  Bot,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';

export default function ConversationsPage() {
  const { id } = useParams<{ id: string }>();
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [conversations, setConversations] = useState<(Conversation & { messages: Message[]; last_message?: string })[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (aid: string) => {
    const { data: a } = await supabase.from('assistants').select('*').eq('id', aid).maybeSingle();
    if (a) setAssistant(a);

    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .eq('assistant_id', aid)
      .order('updated_at', { ascending: false });

    if (convs && convs.length > 0) {
      const convsWithMsgs = await Promise.all(
        convs.map(async (c) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: true });
          return { ...c, messages: msgs ?? [], last_message: msgs?.[msgs.length - 1]?.content ?? '' };
        }),
      );
      setConversations(convsWithMsgs);
    }
    setLoading(false);
  };

  const exportConversation = (conv: Conversation & { messages: Message[] }, format: 'csv' | 'json') => {
    const fname = `${conv.visitor_name ?? 'visitor'}-${conv.id.slice(0, 8)}.${format}`;
    let blob: Blob;

    if (format === 'json') {
      const payload = {
        visitor_name: conv.visitor_name,
        visitor_id: conv.visitor_id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        messages: conv.messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })),
      };
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    } else {
      const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
      const rows = [['الدور', 'المحتوى', 'التاريخ']];
      for (const m of conv.messages) {
        rows.push([
          m.role === 'user' ? 'زائر' : 'مساعد',
          m.content.replace(/\n/g, ' '),
          new Date(m.created_at).toLocaleString('ar'),
        ].map(esc));
      }
      const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = (format: 'csv' | 'json') => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const payload = conversations.map((c) => ({
        visitor_name: c.visitor_name,
        visitor_id: c.visitor_id,
        created_at: c.created_at,
        messages: c.messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })),
      }));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
      const rows = [['المحادثة', 'الزائر', 'الدور', 'المحتوى', 'التاريخ']];
      for (const c of conversations) {
        for (const m of c.messages) {
          rows.push([
            c.id.slice(0, 8),
            c.visitor_name ?? 'زائر',
            m.role === 'user' ? 'زائر' : 'مساعد',
            m.content.replace(/\n/g, ' '),
            new Date(m.created_at).toLocaleString('ar'),
          ].map(esc));
        }
      }
      const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteConversation = async (cid: string) => {
    if (!confirm('حذف هذه المحادثة؟')) return;
    await supabase.from('conversations').delete().eq('id', cid);
    setConversations(conversations.filter((c) => c.id !== cid));
    if (selected === cid) setSelected(null);
  };

  const selectedConv = conversations.find((c) => c.id === selected);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm min-w-0">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700 flex-shrink-0">لوحة التحكم</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <Link to={`/assistant/${id}`} className="text-slate-500 hover:text-slate-700 truncate flex-shrink-0">{assistant?.name ?? 'المساعد'}</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate">المحادثات</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900 mb-1">محادثات الزوار</h1>
            <p className="text-slate-500 text-sm">{conversations.length} محادثة</p>
          </div>
          {conversations.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportAll('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => exportAll('json')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </div>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-sky-500" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">لا توجد محادثات بعد</h3>
            <p className="text-slate-500 text-sm">ستظهر هنا محادثات زوارك مع المساعد بعد تضمينه في موقعك</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Conversation list */}
            <div className="space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`group w-full text-right p-4 rounded-xl border transition-all ${
                    selected === c.id
                      ? 'bg-white border-sky-300 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">{c.visitor_name ?? 'زائر'}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(c.updated_at).toLocaleDateString('ar', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.last_message || 'لا رسائل'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{c.messages.length} رسالة</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(c.id);
                      }}
                      className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {/* Conversation detail */}
            <div className="md:col-span-2">
              {selectedConv ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-medium text-slate-900">{selectedConv.visitor_name ?? 'زائر'}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(selectedConv.created_at).toLocaleString('ar')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportConversation(selectedConv, 'csv')}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="تصدير CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportConversation(selectedConv, 'json')}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="تصدير JSON"
                        >
                          <FileJson className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400">{selectedConv.messages.length} رسالة</span>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {selectedConv.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          m.role === 'user' ? 'bg-slate-100' : 'bg-sky-50'
                        }`}>
                          {m.role === 'user' ? (
                            <User className="w-4 h-4 text-slate-500" />
                          ) : (
                            <Bot className="w-4 h-4 text-sky-500" />
                          )}
                        </div>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          m.role === 'user'
                            ? 'bg-slate-100 text-slate-700 rounded-tr-sm'
                            : 'bg-sky-50 text-slate-700 rounded-tl-sm'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">اختر محادثة لعرضها</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
