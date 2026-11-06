import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Assistant } from '@/lib/types';
import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  MessageSquare,
  BookOpen,
  Settings,
  LogOut,
  Trash2,
  ExternalLink,
  Settings2,
  BarChart3,
  Menu,
  X,
  Shield,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<Record<string, { conversations: number; sources: number }>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAssistants(data);
      // Load stats for each assistant
      const statsMap: Record<string, { conversations: number; sources: number }> = {};
      for (const a of data) {
        const [{ count: convCount }, { count: srcCount }] = await Promise.all([
          supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('assistant_id', a.id),
          supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }).eq('assistant_id', a.id),
        ]);
        statsMap[a.id] = { conversations: convCount ?? 0, sources: srcCount ?? 0 };
      }
      setStats(statsMap);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('assistants')
      .insert({ name: newName.trim() })
      .select()
      .single();

    if (!error && data) {
      navigate(`/assistant/${data.id}`);
    } else {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المساعد؟ سيتم حذف جميع المحادثات ومصادر المعرفة المرتبطة به.')) return;
    await supabase.from('assistants').delete().eq('id', id);
    setAssistants(assistants.filter((a) => a.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">مَجيب AI</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-slate-100 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">مَجيب AI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <div className="px-3 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" />
            المساعدون
          </div>
          <Link
            to="/settings"
            className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            إعدادات الحساب
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-2 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Shield className="w-4 h-4" />
              لوحة المدير
            </Link>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:mr-64 p-4 md:p-8">
        <div className="max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-900 mb-1">مساعدوك</h1>
              <p className="text-slate-500">إدارة مساعديك الذكيين ومتابعة أدائهم</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              مساعد جديد
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-sky-500" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 mb-2">لا يوجد مساعدون بعد</h3>
              <p className="text-slate-500 mb-6">أنشئ مساعدك الأول لتبدأ</p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                إنشاء مساعد
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {assistants.map((a) => {
                const s = stats[a.id] ?? { conversations: 0, sources: 0 };
                return (
                  <div
                    key={a.id}
                    className="group bg-white rounded-2xl border border-slate-100 p-6 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: a.primary_color + '20' }}
                        >
                          <Bot className="w-6 h-6" style={{ color: a.primary_color }} />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-bold text-slate-900">{a.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {a.is_active ? 'مفعّل' : 'متوقف'}
                            </span>
                            <span className="text-xs text-slate-400">{a.language === 'ar' ? 'عربي' : 'English'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-600">{s.conversations} محادثة</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-600">{s.sources} مصدر</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/assistant/${a.id}`}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-4 h-4" />
                        إدارة
                      </Link>
                      <Link
                        to={`/assistant/${a.id}/conversations`}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        المحادثات
                      </Link>
                      <Link
                        to={`/assistant/${a.id}/analytics`}
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        title="تحليلات"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/demo/${a.id}`}
                        className="px-3 py-2 bg-sky-50 text-sky-600 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors"
                        title="معاينة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">مساعد جديد</h2>
            <p className="text-slate-500 text-sm mb-6">اختر اسمًا لمساعدك. يمكنك تخصيص كل التفاصيل لاحقًا.</p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: مساعد المتجر"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {creating ? 'جارٍ الإنشاء...' : 'إنشاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
