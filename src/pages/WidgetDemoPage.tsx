import { useParams, Link } from 'react-router-dom';
import ChatWidget from '@/components/ChatWidget';
import { ArrowRight, Bot, ExternalLink } from 'lucide-react';

export default function WidgetDemoPage() {
  const { assistantId } = useParams<{ assistantId: string }>();

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Simple header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">مَجيب AI</span>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            لوحة التحكم
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">معاينة المساعد</h1>
          <p className="text-slate-500">هذه صفحة تجريبية تعرض شكل المساعد على موقعك. جرّب طرح سؤال!</p>
        </div>

        {/* Demo website mockup */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="flex-1 mx-4">
              <div className="px-3 py-1 bg-white rounded-md border border-slate-200 text-xs text-slate-400 text-left" dir="ltr">
                https://your-website.com
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-300" />
          </div>
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="h-8 w-48 bg-slate-100 rounded-lg mx-auto mb-3" />
              <div className="h-4 w-64 bg-slate-50 rounded-lg mx-auto" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="h-20 bg-slate-100 rounded-lg mb-3" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-50 rounded" />
                </div>
              ))}
            </div>

            {/* Embedded chat widget */}
            <div className="max-w-md mx-auto">
              <ChatWidget assistantId={assistantId!} embedded />
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          هذا مثال لكيفية ظهور المساعد داخل موقعك. عند التضمين الفعلي، ستظهر الدردشة كنافذة عائمة في الزاوية.
        </p>
      </div>
    </div>
  );
}
