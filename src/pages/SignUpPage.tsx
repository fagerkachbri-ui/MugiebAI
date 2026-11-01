import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Bot, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'هذا البريد مسجّل بالفعل. سجّل دخولك.'
          : error.message
      );
      setSubmitting(false);
    } else if (data.session) {
      // Hard navigation — full page reload, same bulletproof approach as sign-in.
      window.location.href = '/dashboard';
    } else {
      // signUp succeeded but no session (email confirmation required)
      navigate('/signin');
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">مَجيب AI</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">أنشئ حسابك</h1>
          <p className="text-slate-500 mb-8">ابدأ مجانًا، بدون بطاقة ائتمان</p>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="٦ أحرف على الأقل"
                  dir="ltr"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جارٍ الإنشاء...
                </>
              ) : (
                'إنشاء الحساب'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            لديك حساب بالفعل؟{' '}
            <Link to="/signin" className="text-sky-600 font-medium hover:text-sky-700">
              سجّل دخولك
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-sky-500 to-cyan-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-16 text-white">
          <h2 className="font-display text-4xl font-bold mb-4 leading-tight">ابدأ رحلتك<br />مع مَجيب</h2>
          <p className="text-sky-50 text-lg leading-relaxed">أنشئ مساعدًا ذكيًا لموقعك في دقائق. أضف معرفتك، خصّص مظهره، واضمنه في موقعك.</p>
          <div className="mt-8 space-y-3">
            {['مساعد واحد مجانًا', 'دعم كامل للعربية', 'تضمين في أي موقع'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sky-50">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
