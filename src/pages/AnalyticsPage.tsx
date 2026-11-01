import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Assistant, Conversation, Message, UsageLog } from '@/lib/types';
import {
  ChevronRight,
  BarChart3,
  MessageSquare,
  Hash,
  Zap,
  Clock,
  TrendingUp,
  Users,
  Bot,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';

interface DayData {
  date: string;
  label: string;
  conversations: number;
  messages: number;
  tokens: number;
}

interface HourData {
  hour: number;
  label: string;
  count: number;
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (aid: string) => {
    const { data: a } = await supabase.from('assistants').select('*').eq('id', aid).maybeSingle();
    if (a) setAssistant(a);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const iso = sevenDaysAgo.toISOString();

    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .eq('assistant_id', aid)
      .gte('created_at', iso)
      .order('created_at', { ascending: false });

    const convIds = (convs ?? []).map((c) => c.id);

    const [msgsResult, logsResult] = await Promise.all([
      convIds.length > 0
        ? supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as Message[] | null, error: null }),
      supabase.from('usage_logs').select('*').eq('assistant_id', aid).gte('created_at', iso).order('created_at', { ascending: false }),
    ]);

    setConversations(convs ?? []);
    setMessages((msgsResult.data ?? []) as Message[]);
    setUsageLogs((logsResult.data ?? []) as UsageLog[]);
    setLoading(false);
  };

  // Build last 7 days data
  const dailyData: DayData[] = useMemo(() => {
    const days: DayData[] = [];
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        label: dayNames[d.getDay()],
        conversations: conversations.filter((c) => {
          const cd = new Date(c.created_at);
          return cd >= d && cd < next;
        }).length,
        messages: messages.filter((m) => {
          const md = new Date(m.created_at);
          return md >= d && md < next;
        }).length,
        tokens: usageLogs.filter((u) => {
          const ud = new Date(u.created_at);
          return ud >= d && ud < next;
        }).reduce((sum, u) => sum + u.tokens_used, 0),
      });
    }
    return days;
  }, [conversations, messages, usageLogs]);

  // Hourly distribution (peak times)
  const hourlyData: HourData[] = useMemo(() => {
    const buckets: HourData[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, count: 0 }));
    for (const m of messages) {
      const h = new Date(m.created_at).getHours();
      buckets[h].count++;
    }
    return buckets;
  }, [messages]);

  const maxHourCount = Math.max(...hourlyData.map((h) => h.count), 1);

  // Top visitor questions
  const topQuestions = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === 'user');
    const normalized = userMsgs.map((m) => m.content.trim().toLowerCase());
    const freq: Record<string, { text: string; count: number }> = {};
    for (const text of normalized) {
      const key = text.slice(0, 80);
      if (!freq[key]) freq[key] = { text, count: 0 };
      freq[key].count++;
    }
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [messages]);

  // Totals
  const totals = useMemo(() => {
    return {
      conversations: conversations.length,
      messages: messages.length,
      tokens: usageLogs.reduce((s, u) => s + u.tokens_used, 0),
      avgMessages: conversations.length > 0 ? Math.round(messages.length / conversations.length) : 0,
    };
  }, [conversations, messages, usageLogs]);

  const maxDailyMessages = Math.max(...dailyData.map((d) => d.messages), 1);
  const peakHour = hourlyData.reduce((max, h) => (h.count > max.count ? h : max), hourlyData[0]);

  // Recent conversations
  const recentConversations = conversations.slice(0, 6);
  const messageCountByConv = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      map[m.conversation_id] = (map[m.conversation_id] ?? 0) + 1;
    }
    return map;
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-slate-500 mb-4">المساعد غير موجود</p>
          <Link to="/dashboard" className="text-sky-600 font-medium">العودة للوحة التحكم</Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'محادثات (٧ أيام)', value: totals.conversations, icon: MessageSquare, bg: 'bg-sky-50', text: 'text-sky-600' },
    { label: 'رسائل (٧ أيام)', value: totals.messages, icon: Hash, bg: 'bg-cyan-50', text: 'text-cyan-600' },
    { label: 'رموز مستهلكة', value: totals.tokens.toLocaleString('ar'), icon: Zap, bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'متوسط الرسائل/محادثة', value: totals.avgMessages, icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm min-w-0">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700 flex-shrink-0">لوحة التحكم</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <Link to={`/assistant/${assistant.id}`} className="text-slate-500 hover:text-slate-700 truncate flex-shrink-0">{assistant.name}</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate">التحليلات</span>
          </div>
          <Link
            to={`/assistant/${assistant.id}/conversations`}
            className="px-3 md:px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">المحادثات</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: assistant.primary_color + '20' }}>
            <BarChart3 className="w-6 h-6 md:w-7 md:h-7" style={{ color: assistant.primary_color }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900 truncate">تحليلات {assistant.name}</h1>
            <p className="text-slate-500 text-sm">أداء المساعد خلال آخر ٧ أيام</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <p className="font-display text-xl md:text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {totals.conversations === 0 && totals.messages === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-sky-500" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">لا توجد بيانات بعد</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">ستظهر التحليلات هنا بعد أن يبدأ زوارك بالتفاعل مع المساعد. أضف مصادر معرفة وضعه في موقعك لتبدأ.</p>
            <Link
              to={`/assistant/${assistant.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all mt-6"
            >
              إدارة المساعد
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Daily messages chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-6">
                <CalendarDays className="w-5 h-5 text-slate-400" />
                <h2 className="font-display text-lg font-bold text-slate-900">الرسائل خلال آخر ٧ أيام</h2>
              </div>
              <div className="flex items-end justify-between gap-3 h-48">
                {dailyData.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{d.messages}</span>
                    <div className="w-full flex flex-col justify-end h-32 bg-slate-50 rounded-lg overflow-hidden relative">
                      <div
                        className="w-full bg-gradient-to-t from-sky-500 to-cyan-400 rounded-lg transition-all duration-500 hover:from-sky-600 hover:to-cyan-500"
                        style={{ height: `${(d.messages / maxDailyMessages) * 100}%`, minHeight: d.messages > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Peak hours */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <h2 className="font-display text-lg font-bold text-slate-900">أوقات الذروة</h2>
                </div>
                {peakHour.count > 0 ? (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <p className="text-sm text-amber-800">
                      أكثر نشاط عند الساعة <span className="font-bold">{peakHour.label}</span> ({peakHour.count} رسالة)
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-12 gap-1">
                  {hourlyData.map((h) => (
                    <div key={h.hour} className="flex flex-col items-center gap-1" title={`${h.label}: ${h.count} رسالة`}>
                      <div className="w-full h-20 flex items-end">
                        <div
                          className={`w-full rounded-sm transition-all ${h.count > 0 ? 'bg-sky-400 hover:bg-sky-500' : 'bg-slate-100'}`}
                          style={{ height: `${(h.count / maxHourCount) * 100}%`, minHeight: '2px' }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">{h.hour}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top questions */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-slate-400" />
                  <h2 className="font-display text-lg font-bold text-slate-900">أكثر الأسئلة تكرارًا</h2>
                </div>
                {topQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {topQuestions.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-700 flex-1 line-clamp-2">{q.text}</p>
                        <span className="text-xs text-slate-400 flex-shrink-0">{q.count}×</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">لا توجد أسئلة بعد</p>
                )}
              </div>
            </div>

            {/* Recent conversations */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <h2 className="font-display text-lg font-bold text-slate-900">أحدث المحادثات</h2>
                </div>
                <Link
                  to={`/assistant/${assistant.id}/conversations`}
                  className="text-sm text-sky-600 font-medium hover:text-sky-700 flex items-center gap-1"
                >
                  عرض الكل
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {recentConversations.length > 0 ? (
                <div className="space-y-2">
                  {recentConversations.map((c) => (
                    <Link
                      key={c.id}
                      to={`/assistant/${assistant.id}/conversations`}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                          <Bot className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.visitor_name ?? 'زائر'}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(c.created_at).toLocaleDateString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                          {messageCountByConv[c.id] ?? 0} رسالة
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">لا توجد محادثات بعد</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
