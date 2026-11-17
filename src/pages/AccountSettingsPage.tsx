<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>صفحة AssistantPage.tsx الكاملة</title>
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
        <h2>src/pages/AssistantPage.tsx</h2>
        <button id="copyBtn" class="copy-btn" onclick="copyContent()">نسخ الكود كاملاً</button>
    </div>
    <pre id="fileContent">import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { 
  Bot, ArrowRight, Settings, Database, MessageSquare, 
  Send, Plus, Trash2, Upload, FileText, HelpCircle, 
  Check, AlertCircle, Loader2, Sparkles, Copy, RefreshCw 
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  title: string;
  content: string;
  source_type: 'text' | 'qa';
  question?: string;
  created_at: string;
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  temperature: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'settings'>('chat');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Knowledge base state
  const [showAddSource, setShowAddSource] = useState(false);
  const [srcType, setSrcType] = useState<'text' | 'qa'>('text');
  const [srcTitle, setSrcTitle] = useState('');
  const [srcContent, setSrcContent] = useState('');
  const [srcQuestion, setSrcQuestion] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Settings state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsPrompt, setSettingsPrompt] = useState('');
  const [settingsTemp, setSettingsTemp] = useState(0.7);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAssistantData();
    }
  }, [id]);

  const fetchAssistantData = async () => {
    setLoading(true);
    try {
      const { data: assistantData, error: assistantError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', id)
        .single();

      if (assistantError) throw assistantError;
      setAssistant(assistantData);
      setSettingsName(assistantData.name);
      setSettingsDesc(assistantData.description || '');
      setSettingsPrompt(assistantData.system_prompt || '');
      setSettingsTemp(assistantData.temperature ?? 0.7);

      const { data: sourcesData, error: sourcesError } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('assistant_id', id)
        .order('created_at', { ascending: false });

      if (sourcesError) throw sourcesError;
      setSources(sourcesData || []);

    } catch (error) {
      console.error('Error fetching assistant:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading || !assistant) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          assistantId: assistant.id,
          message: userMsg,
          history: messages,
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || 'لم يتم استلام رد من المساعد.' },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'حدث خطأ أثناء الاتصال بالمساعد. يرجى المحاولة مرة أخرى.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant) return;
    setSavingSettings(true);

    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          name: settingsName.trim(),
          description: settingsDesc.trim(),
          system_prompt: settingsPrompt.trim(),
          temperature: settingsTemp,
        })
        .eq('id', assistant.id);

      if (error) throw error;

      setAssistant({
        ...assistant,
        name: settingsName.trim(),
        description: settingsDesc.trim(),
        system_prompt: settingsPrompt.trim(),
        temperature: settingsTemp,
      });

      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('تعذر حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  // 1) استبدل handleAddSource بالكامل
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant || !srcTitle.trim() || !srcContent.trim()) return;
    setAddingSource(true);

    try {
      const { data, error } = await supabase.functions.invoke('knowledge-ingest', {
        body: {
          action: 'save',
          assistantId: assistant.id,
          title: srcTitle.trim(),
          content: srcContent.trim(),
          sourceType: srcType,
          question: srcType === 'qa' ? srcQuestion.trim() : null,
        },
      });

      if (error) throw error;
      if (!data?.source) throw new Error(data?.error || 'لم يرجع الخادم مصدر المعرفة المحفوظ');

      setSources((current) => [data.source, ...current.filter((s) => s.id !== data.source.id)]);
      setSrcTitle('');
      setSrcContent('');
      setSrcQuestion('');
      setShowAddSource(false);
      alert(`تم حفظ مصدر المعرفة وفهرسة ${data.chunk_count} مقطعًا.`);
    } catch (error) {
      console.error('Knowledge save failed:', error);
      alert(error instanceof Error ? error.message : 'تعذر حفظ مصدر المعرفة');
    } finally {
      setAddingSource(false);
    }
  };

  // 2) استبدل handleDeleteSource بالكامل
  const handleDeleteSource = async (sid: string) => {
    if (!assistant) return;
    if (!window.confirm('هل تريد حذف مصدر المعرفة وجميع مقاطعه؟')) return;

    const { data, error } = await supabase.functions.invoke('knowledge-ingest', {
      body: { action: 'delete', assistantId: assistant.id, sourceId: sid },
    });

    if (error || !data?.success) {
      console.error('Knowledge deletion failed:', error);
      alert(data?.error || error?.message || 'تعذر حذف مصدر المعرفة');
      return;
    }

    setSources((current) => current.filter((source) => source.id !== sid));
  };

  // 3) استبدل handleFileUpload بالكامل
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!assistant) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const allowed = ['.txt', '.md', '.markdown'];
    const valid = files.filter((file) =>
      allowed.some((ext) => file.name.toLowerCase().endsWith(ext))
    );

    if (valid.length === 0) {
      alert('فقط ملفات .txt و .md مدعومة');
      e.target.value = '';
      return;
    }

    setUploadingFiles(true);
    const newSources: KnowledgeSource[] = [];
    const failures: string[] = [];

    try {
      for (const file of valid) {
        try {
          if (file.size > 500_000) {
            failures.push(`${file.name}: أكبر من 500 كيلوبايت`);
            continue;
          }

          const content = (await file.text()).trim();
          if (!content) {
            failures.push(`${file.name}: الملف فارغ`);
            continue;
          }

          const { data, error } = await supabase.functions.invoke('knowledge-ingest', {
            body: {
              action: 'save',
              assistantId: assistant.id,
              title: file.name.replace(/\\.[^.]+$/, ''),
              content,
              sourceType: 'text',
              question: null,
            },
          });

          if (error || !data?.source) {
            failures.push(`${file.name}: ${data?.error || error?.message || 'فشل الحفظ'}`);
            continue;
          }

          newSources.push(data.source);
        } catch (fileError) {
          failures.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'فشل غير متوقع'}`);
        }
      }

      if (newSources.length) {
        setSources((current) => [...newSources, ...current]);
      }

      if (failures.length) {
        alert(`تم حفظ ${newSources.length} ملفًا.\\nتعذر حفظ:\\n${failures.join('\\n')}`);
      } else {
        alert(`تم حفظ وفهرسة ${newSources.length} ملفًا بنجاح.`);
      }
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <span>جاري تحميل المساعد الذكي...</span>
        </div>
      </div>
    );
  }

  if (!assistant) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-bold text-slate-900 leading-tight">{assistant.name}</h1>
                <p className="text-xs text-slate-500 truncate max-w-xs">{assistant.description || 'مساعد ذكي مخصص'}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              المحادثة
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'knowledge' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4" />
              قاعدة المعرفة ({sources.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              الإعدادات
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-1">ابدأ المحادثة مع {assistant.name}</h3>
                  <p className="text-slate-500 max-w-md text-sm">
                    هذا المساعد مدعوم بقاعدة المعرفة الخاصة به. اطرح أي سؤال أو استفسار للحصول على إجابات دقيقة.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0 font-bold text-xs">
                        أنت
                      </div>
                    )}
                    <div
                      className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-100 text-slate-900 rounded-tr-none'
                          : 'bg-sky-500 text-white rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex gap-3 justify-end">
                  <div className="bg-sky-50 text-sky-700 px-4 py-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري صياغة الإجابة...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="font-display font-bold text-slate-900 text-lg">قاعدة المعرفة والمصادر</h2>
                <p className="text-sm text-slate-500">أضف نصوصاً أو ملفات لتعزيز معرفة المساعد وإجاباته.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all ${uploadingFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{uploadingFiles ? 'جاري الرفع...' : 'رفع ملفات (.txt, .md)'}</span>
                  <input type="file" multiple accept=".txt,.md,.markdown" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={() => setShowAddSource(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مصدر جديد</span>
                </button>
              </div>
            </div>

            {/* Add Source Modal */}
            {showAddSource && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-slate-900 text-lg">إضافة مصدر معرفة</h3>
                    <button onClick={() => setShowAddSource(false)} className="text-slate-400 hover:text-slate-600">إلغاء</button>
                  </div>
                  <form onSubmit={handleAddSource} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">نوع المصدر</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSrcType('text')}
                          className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${srcType === 'text' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          نص حر
                        </button>
                        <button
                          type="button"
                          onClick={() => setSrcType('qa')}
                          className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${srcType === 'qa' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          سؤال وجواب
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">العنوان</label>
                      <input
                        type="text"
                        required
                        value={srcTitle}
                        onChange={(e) => setSrcTitle(e.target.value)}
                        placeholder="عنوان المصدر أو الملف"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {srcType === 'qa' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">السؤال المتوقع</label>
                        <input
                          type="text"
                          required
                          value={srcQuestion}
                          onChange={(e) => setSrcQuestion(e.target.value)}
                          placeholder="السؤال الذي سيجيب عليه هذا المصدر"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">المحتوى</label>
                      <textarea
                        required
                        rows={6}
                        value={srcContent}
                        onChange={(e) => setSrcContent(e.target.value)}
                        placeholder="محتوى المعرفة..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSource(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={addingSource}
                        className="px-5 py-2 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-50 flex items-center gap-2"
                      >
                        {addingSource && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>حفظ وفهرسة</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Sources List */}
            <div className="grid gap-4">
              {sources.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">لا توجد مصادر معرفة مضافة بعد</p>
                  <p className="text-sm text-slate-400 mt-1">قم بإضافة نصوص أو ملفات لمساعدة المساعد في الإجابة بدقة.</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div key={source.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between gap-4 shadow-sm">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${source.source_type === 'qa' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                          {source.source_type === 'qa' ? 'سؤال وجواب' : 'نص حر'}
                        </span>
                        <h4 className="font-display font-bold text-slate-900 truncate">{source.title}</h4>
                      </div>
                      {source.question && (
                        <p className="text-xs text-slate-600 font-medium">س: {source.question}</p>
                      )}
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{source.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                      title="حذف المصدر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm max-w-2xl">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-1">إعدادات المساعد</h2>
            <p className="text-sm text-slate-500 mb-6">قم بتعديل خصائص وسلوك المساعد الذكي.</p>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">اسم المساعد</label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">الوصف</label>
                <input
                  type="text"
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">التوجيه النظامي (System Prompt)</label>
                <textarea
                  rows={5}
                  value={settingsPrompt}
                  onChange={(e) => setSettingsPrompt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">درجة الإبداع (Temperature): {settingsTemp}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settingsTemp}
                  onChange={(e) => setSettingsTemp(parseFloat(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
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
