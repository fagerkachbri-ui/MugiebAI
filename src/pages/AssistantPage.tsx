import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Assistant, KnowledgeSource } from '@/lib/types';
import {
  Bot,
  Settings,
  BookOpen,
  Code2,
  Plus,
  Trash2,
  ChevronRight,
  Save,
  Check,
  MessageSquare,
  ExternalLink,
  FileText,
  HelpCircle,
  BarChart3,
  Upload,
  Loader2,
} from 'lucide-react';

type Tab = 'settings' | 'knowledge' | 'embed';

export default function AssistantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0EA5E9');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [isActive, setIsActive] = useState(true);

  // New source form
  const [srcTitle, setSrcTitle] = useState('');
  const [srcContent, setSrcContent] = useState('');
  const [srcType, setSrcType] = useState<'text' | 'qa'>('text');
  const [srcQuestion, setSrcQuestion] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) loadAssistant(id);
  }, [id]);

  const loadAssistant = async (aid: string) => {
    const { data: a, error: aErr } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', aid)
      .maybeSingle();

    if (!aErr && a) {
      setAssistant(a);
      setName(a.name);
      setWelcomeMessage(a.welcome_message);
      setInstructions(a.instructions);
      setPrimaryColor(a.primary_color);
      setLanguage(a.language);
      setDirection(a.direction);
      setIsActive(a.is_active);

      const { data: srcs } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('assistant_id', aid)
        .order('created_at', { ascending: false });
      setSources(srcs ?? []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!assistant) return;
      const normalizedColor = primaryColor.trim();

if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
  alert('الرجاء إدخال لون صالح بصيغة #RRGGBB، مثل #0EA5E9');
  return;
}
    
    setSaving(true);
    const { error } = await supabase
      .from('assistants')
      .update({
        name,
        welcome_message: welcomeMessage,
        instructions,
        primary_color: primaryColor,
        language,
        direction,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assistant.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant || !srcTitle.trim() || !srcContent.trim()) return;
    setAddingSource(true);

    const { data, error } = await supabase
      .from('knowledge_sources')
      .insert({
        assistant_id: assistant.id,
        title: srcTitle.trim(),
        content: srcContent.trim(),
        source_type: srcType,
        question: srcType === 'qa' ? srcQuestion.trim() : null,
      })
      .select()
      .single();

    if (!error && data) {
      setSources([data, ...sources]);
      setSrcTitle('');
      setSrcContent('');
      setSrcQuestion('');
      setShowAddSource(false);
    }
    setAddingSource(false);
  };

  const handleDeleteSource = async (sid: string) => {
    await supabase.from('knowledge_sources').delete().eq('id', sid);
    setSources(sources.filter((s) => s.id !== sid));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!assistant) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const allowed = ['.txt', '.md', '.markdown'];
    const valid = files.filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)));
    if (valid.length === 0) {
      alert('فقط ملفات .txt و .md مدعومة');
      e.target.value = '';
      return;
    }

    setUploadingFiles(true);
    const newSources: KnowledgeSource[] = [];

    for (const file of valid) {
      if (file.size > 500_000) continue;
      const text = await file.text();
      if (!text.trim()) continue;
      const title = file.name.replace(/\.[^.]+$/, '');
      const { data, error } = await supabase
        .from('knowledge_sources')
        .insert({
          assistant_id: assistant.id,
          title,
          content: text.trim(),
          source_type: 'text',
        })
        .select()
        .single();
      if (!error && data) newSources.push(data);
    }

    if (newSources.length > 0) setSources([...newSources, ...sources]);
    setUploadingFiles(false);
    e.target.value = '';
  };

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const embedCode = assistant
    ? `<script\n  src="${window.location.origin}/widget.js"\n  data-assistant="${assistant.id}"\n  data-anon-key="${anonKey}"\n></script>`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm min-w-0">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700 flex-shrink-0">لوحة التحكم</Link>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate">{assistant.name}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Link
              to={`/demo/${assistant.id}`}
              className="px-3 md:px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">معاينة</span>
            </Link>
            <Link
              to={`/assistant/${assistant.id}/analytics`}
              className="px-3 md:px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">التحليلات</span>
            </Link>
            <Link
              to={`/assistant/${assistant.id}/conversations`}
              className="px-3 md:px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">المحادثات</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            <Bot className="w-6 h-6 md:w-7 md:h-7" style={{ color: primaryColor }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900 truncate">{assistant.name}</h1>
            <p className="text-slate-500 text-sm">إدارة المساعد والإعدادات</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-xl border border-slate-100 overflow-x-auto">
          {[
            { key: 'settings' as Tab, label: 'الإعدادات', icon: Settings },
            { key: 'knowledge' as Tab, label: 'مصادر المعرفة', icon: BookOpen },
            { key: 'embed' as Tab, label: 'كود التضمين', icon: Code2 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 md:px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-8 space-y-6 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">اسم المساعد</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">اللون الأساسي</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">رسالة الترحيب</label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تعليمات المساعد</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-slate-400 mt-1.5">توجيهات تُملى على المساعد حول كيفية الإجابة والتصرف</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">اللغة</label>
                <select
                  value={language}
                  onChange={(e) => {
                    const lang = e.target.value as 'ar' | 'en';
                    setLanguage(lang);
                    setDirection(lang === 'ar' ? 'rtl' : 'ltr');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الاتجاه</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as 'rtl' | 'ltr')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                >
                  <option value="rtl">RTL (يمين ليسار)</option>
                  <option value="ltr">LTR (يسار ليمين)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الحالة</label>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isActive ? 'مفعّل' : 'متوقف'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all disabled:opacity-60"
              >
                {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saved ? 'تم الحفظ' : saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        )}

        {/* Knowledge tab */}
        {tab === 'knowledge' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <p className="text-slate-600">{sources.length} مصدر معرفة</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all disabled:opacity-60"
                >
                  {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingFiles ? 'جارٍ الرفع...' : 'رفع ملفات'}
                </button>
                <button
                  onClick={() => setShowAddSource(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مصدر
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-700 flex items-center gap-2">
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span>يدعم ملفات نصية (.txt, .md) حتى ٥٠٠ كيلوبايت لكل ملف</span>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-sky-500" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mb-2">لا توجد مصادر معرفة بعد</h3>
                <p className="text-slate-500 mb-6 text-sm max-w-md mx-auto">أضف نصوصًا أو أسئلة وأجوبة ليستند إليها المساعد عند الإجابة على زوارك</p>
                <button
                  onClick={() => setShowAddSource(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة أول مصدر
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((s) => (
                  <div
                    key={s.id}
                    className="group bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {s.source_type === 'qa' ? (
                            <HelpCircle className="w-5 h-5 text-sky-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 mb-1">{s.title}</h4>
                          {s.question && (
                            <p className="text-sm text-sky-600 mb-1 font-medium">س: {s.question}</p>
                          )}
                          <p className="text-sm text-slate-500 line-clamp-2">{s.content}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSource(s.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add source modal */}
            {showAddSource && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowAddSource(false)}>
                <div className="bg-white rounded-2xl p-8 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-2">إضافة مصدر معرفة</h2>
                  <p className="text-slate-500 text-sm mb-6">أضف معلومات سيستند إليها المساعد عند الإجابة</p>
                  <form onSubmit={handleAddSource} className="space-y-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSrcType('text')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          srcType === 'text' ? 'bg-sky-50 text-sky-600 border border-sky-300' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        نص
                      </button>
                      <button
                        type="button"
                        onClick={() => setSrcType('qa')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          srcType === 'qa' ? 'bg-sky-50 text-sky-600 border border-sky-300' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        سؤال وجواب
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">العنوان</label>
                      <input
                        type="text"
                        required
                        value={srcTitle}
                        onChange={(e) => setSrcTitle(e.target.value)}
                        placeholder="مثال: مواعيد العمل"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                    {srcType === 'qa' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">السؤال</label>
                        <input
                          type="text"
                          required
                          value={srcQuestion}
                          onChange={(e) => setSrcQuestion(e.target.value)}
                          placeholder="مثال: ما هي مواعيد العمل؟"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{srcType === 'qa' ? 'الجواب' : 'المحتوى'}</label>
                      <textarea
                        required
                        value={srcContent}
                        onChange={(e) => setSrcContent(e.target.value)}
                        rows={5}
                        placeholder="اكتب المعلومات هنا..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSource(false)}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={addingSource}
                        className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60"
                      >
                        {addingSource ? 'جارٍ الإضافة...' : 'إضافة'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Embed tab */}
        {tab === 'embed' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 animate-fade-in">
            <h3 className="font-display text-xl font-bold text-slate-900 mb-2">كود التضمين</h3>
            <p className="text-slate-500 text-sm mb-6">انسخ هذا الكود وألصقه في صفحات موقعك قبل وسم <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">&lt;/body&gt;</code></p>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-5 pr-14 overflow-x-auto text-sm font-mono" dir="ltr">
                {embedCode}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                title="نسخ"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Code2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-8 p-5 bg-sky-50 border border-sky-200 rounded-xl">
              <h4 className="font-medium text-sky-900 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                صفحة المعاينة
              </h4>
              <p className="text-sm text-sky-700 mb-3">جرّب المساعد على صفحة معاينة قبل النشر:</p>
              <Link
                to={`/demo/${assistant.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-sky-600 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors"
              >
                فتح صفحة المعاينة
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {[
                { step: '١', text: 'انسخ الكود' },
                { step: '٢', text: 'ألصقه في موقعك' },
                { step: '٣', text: 'ستظهر الدردشة لزوارك' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <span className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-400 text-sm">{s.step}</span>
                  <span className="text-sm text-slate-600">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
