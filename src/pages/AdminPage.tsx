import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile, Assistant } from '@/lib/types';
import {
  Bot,
  Users,
  MessageSquare,
  Activity,
  LogOut,
  Settings2,
  Shield,
  ChevronLeft,
  Trash2,
  Bot as BotIcon,
} from 'lucide-react';

interface UserWithStats extends Profile {
  assistant_count: number;
  conversation_count: number;
}

export default function AdminPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'assistants'>('users');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [profilesRes, assistantsRes, convRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('assistants').select('*').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

    const allProfiles = (profilesRes.data as Profile[]) ?? [];
    const allAssistants = (assistantsRes.data as Assistant[]) ?? [];
    setAssistants(allAssistants);
    setTotalConversations(convRes.count ?? 0);
    setTotalMessages(msgRes.count ?? 0);

    const userStats: UserWithStats[] = await Promise.all(
      allProfiles.map(async (p) => {
        const [aCount, cCount] = await Promise.all([
          supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
          supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .in(
              'assistant_id',
              allAssistants.filter((a) => a.user_id === p.id).map((a) => a.id)
            ),
        ]);
        return {
          ...p,
          assistant_count: aCount.count ?? 0,
          conversation_count: cCount.count ?? 0,
        };
      })
    );
    setUsers(userStats);
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u)));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 right-0 w-64 bg-white border-l border-slate-100 flex flex-col z-30">
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">مَجيب AI</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <div className="px-3 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            لوحة المدير
          </div>
          <Link
            to="/dashboard"
            className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <BotIcon className="w-4 h-4" />
            مساعدون
          </Link>
          <Link
            to="/settings"
            className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            إعدادات الحساب
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-sky-600 font-medium">
              <Shield className="w-3 h-3" />
              مدير المنصة
            </span>
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
        <div className="max-w-6xl">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-sky-600" />
            <h1 className="font-display text-3xl font-bold text-slate-900">لوحة المدير</h1>
          </div>
          <p className="text-slate-500 mb-8">إدارة مستخدمي المنصة والمساعدين والنشاط الكلي</p>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="المستخدمون" value={users.length} color="sky" />
            <StatCard icon={Bot} label="المساعدون" value={assistants.length} color="cyan" />
            <StatCard icon={MessageSquare} label="المحادثات" value={totalConversations} color="emerald" />
            <StatCard icon={Activity} label="الرسائل" value={totalMessages} color="amber" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl border border-slate-100 w-fit">
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === 'users' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              المستخدمون
            </button>
            <button
              onClick={() => setTab('assistants')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === 'assistants' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4" />
              المساعدون
            </button>
          </div>

          {/* Users table */}
          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">المستخدم</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">الدور</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">المساعدون</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">المحادثات</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">تاريخ التسجيل</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-slate-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-900" dir="ltr">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                              u.role === 'admin'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3" />}
                            {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.assistant_count}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.conversation_count}</td>
                        <td className="px-6 py-4 text-sm text-slate-400" dir="ltr">
                          {new Date(u.created_at).toLocaleDateString('ar')}
                        </td>
                        <td className="px-6 py-4">
                          {u.id !== profile?.id && (
                            <button
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                              {u.role === 'admin' ? 'إزالة المدير' : 'جعل مدير'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assistants table */}
          {tab === 'assistants' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">المساعد</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">المالك</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">الحالة</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">اللغة</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistants.map((a) => {
                      const owner = users.find((u) => u.id === a.user_id);
                      return (
                        <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: a.primary_color + '20' }}
                              >
                                <Bot className="w-4 h-4" style={{ color: a.primary_color }} />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-slate-900 block">{a.name}</span>
                                <Link
                                  to={`/assistant/${a.id}`}
                                  className="text-xs text-sky-600 hover:text-sky-700"
                                >
                                  عرض التفاصيل
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600" dir="ltr">{owner?.email ?? '—'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                a.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {a.is_active ? 'مفعّل' : 'متوقف'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {a.language === 'ar' ? 'عربي' : 'English'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400" dir="ltr">
                            {new Date(a.created_at).toLocaleDateString('ar')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: 'sky' | 'cyan' | 'emerald' | 'amber';
}) {
  const colorMap = {
    sky: 'bg-sky-50 text-sky-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 font-display">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
