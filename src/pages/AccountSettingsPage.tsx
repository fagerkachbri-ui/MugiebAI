import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Bot, Mail, Lock, LogOut, ChevronRight, Check, AlertCircle, User } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Email change
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSaving(true);

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setEmailError(error.message);
    } else {
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    }
    setEmailSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');

    if (newPassword.length < 6) {
      setPwdError('كلمة المرور يجب أن تكون ٦ أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('كلمتا المرور غير متطابقتين');
      return;
    }

    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPwdError(error.message);
    } else {
      setPwdSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSaved(false), 2500);
    }
    setPwdSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm min-w-0">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700 flex-shrink-0">لوحة التحكم</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate">إعدادات الحساب</span>
          </div>
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900 hidden sm:inline">مَجيب AI</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">إعدادات الحساب</h1>
        <p className="text-slate-500 mb-8">إدارة بريدك الإلكتروني وكلمة المرور</p>

        {/* Current account info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{user?.email}</p>
              <p className="text-sm text-slate-400">حساب مفعّل</p>
            </div>
          </div>
        </div>

        {/* Email change */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">تغيير البريد الإلكتروني</h2>
          <p className="text-slate-500 text-sm mb-6">سيتم استخدام البريد الجديد لتسجيل الدخول</p>

          {emailError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {emailError}
            </div>
          )}

          <form onSubmit={handleEmailChange}>
            <div className="relative mb-4">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={emailSaving || newEmail === user?.email}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
            >
              {emailSaved ? <Check className="w-4 h-4" /> : null}
              {emailSaved ? 'تم التحديث' : emailSaving ? 'جارٍ التحديث...' : 'تحديث البريد'}
            </button>
          </form>
        </div>

        {/* Password change */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">تغيير كلمة المرور</h2>
          <p className="text-slate-500 text-sm mb-6">اختر كلمة مرور قوية (٦ أحرف على الأقل)</p>

          {pwdError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {pwdError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pwdSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
            >
              {pwdSaved ? <Check className="w-4 h-4" /> : null}
              {pwdSaved ? 'تم التحديث' : pwdSaving ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">تسجيل الخروج</h2>
          <p className="text-slate-500 text-sm mb-4">سيتم إنهاء جلستك والعودة للصفحة الرئيسية</p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
