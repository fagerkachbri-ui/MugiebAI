import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import {
  Bot,
  MessageSquare,
  BookOpen,
  Settings,
  Shield,
  Globe,
  Zap,
  BarChart3,
  Check,
  ArrowLeft,
  Sparkles,
  Code2,
  Lock,
  Languages,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">مَجيب AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">المزايا</a>
            <a href="#how" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">كيف يعمل</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">الخطط</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="px-5 py-2 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all"
              >
                لوحة التحكم
              </Link>
            ) : (
              <>
                <Link to="/signin" className="text-slate-700 text-sm font-medium hover:text-slate-900 transition-colors">
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all"
                >
                  ابدأ مجانًا
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-white" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-50 border border-sky-200 rounded-full text-sky-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              مساعد ذكي عربي لموقعك
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
              حوّل زوار موقعك إلى عملاء
              <br />
              <span className="bg-gradient-to-r from-sky-500 to-cyan-600 bg-clip-text text-transparent">بمساعد ذكي يجيب فورًا</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
              أنشئ مساعدًا ذكيًا يفهم محتوى موقعك ويجيب عن أسئلة زوارك بالعربية تلقائيًا.
              أضف نافذة دردشة إلى موقعك في دقائق، ووفّر وقت خدمة العملاء.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-sky-500/30 transition-all"
              >
                ابدأ مجانًا
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-slate-300 transition-all"
              >
                كيف يعمل؟
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> بدون بطاقة ائتمان</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> دعم العربية وRTL</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> تضمين سهل</span>
            </div>
          </div>

          {/* Hero preview */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400 mr-2">لوحة تحكم مَجيب</span>
              </div>
              <div className="grid grid-cols-3 gap-0 h-80">
                <div className="col-span-1 bg-slate-50 p-4 border-l border-slate-100">
                  <div className="space-y-2">
                    <div className="h-8 bg-sky-100 rounded-lg" />
                    <div className="h-6 bg-slate-100 rounded-lg" />
                    <div className="h-6 bg-slate-100 rounded-lg" />
                    <div className="h-6 bg-slate-100 rounded-lg opacity-50" />
                  </div>
                </div>
                <div className="col-span-2 p-6">
                  <div className="space-y-4">
                    <div className="flex justify-start">
                      <div className="max-w-[70%] bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-slate-700">
                        مرحبًا! كيف يمكنني مساعدتك اليوم؟
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[70%] bg-sky-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                        ما هي مواعيد العمل؟
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[70%] bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-slate-700">
                        مواعيد العمل من السبت إلى الخميس، من 9 صباحًا حتى 6 مساءً.
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[60%] bg-sky-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                        هل توجد توصيل؟
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[75%] bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-slate-700">
                        نعم، نوفر خدمة توصيل لجميع مناطق المدينة خلال 24 ساعة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">كل ما تحتاجه لمساعد ذكي</h2>
            <p className="text-lg text-slate-600">مزايا قوية وبسيطة في نفس الوقت</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'مصادر المعرفة', desc: 'أضف نصوصًا وأسئلة وأجوبة يعتمد عليها المساعد. مصادرك منظمة وسهلة الإدارة.' },
              { icon: MessageSquare, title: 'دردشة فورية', desc: 'نافذة دردشة قابلة للتضمين في أي موقع. إجابات فورية لزوارك على مدار الساعة.' },
              { icon: Settings, title: 'تخصيص كامل', desc: 'اختر اسم المساعد ولونه ورسالة الترحيب وتعليماته. التحكم الكامل بين يديك.' },
              { icon: Shield, title: 'أمان وحماية', desc: 'بياناتك معزولة ومحمية. مفتاح الذكاء الاصطناعي على الخادم فقط، لا يصل للزوار.' },
              { icon: Languages, title: 'عربية وإنجليزية', desc: 'دعم كامل للغة العربية واتجاه RTL، مع إمكانية التبديل للإنجليزية وLTR.' },
              { icon: BarChart3, title: 'تتبع المحادثات', desc: 'راجع جميع المحادثات من لوحة التحكم. اعرف ما يسأل عنه زوارك وحسّن إجاباتك.' },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-8 bg-white border border-slate-100 rounded-2xl hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100/50 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">ثلاث خطوات للبدء</h2>
            <p className="text-lg text-slate-600">من إنشاء المساعد إلى تضمينه في موقعك</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Bot, step: '١', title: 'أنشئ المساعد', desc: 'سجّل حسابًا، أنشئ مساعدًا جديدًا، وخصّص اسمه ولونه ورسالة الترحيب.' },
              { icon: BookOpen, step: '٢', title: 'أضف المعرفة', desc: 'أدخل المعلومات التي تريد أن يعرفها المساعد: نصوص، أسئلة شائعة، تفاصيل المنتجات.' },
              { icon: Code2, step: '٣', title: 'اضفه لموقعك', desc: 'انسخ كود التضمين وألصقه في موقعك. ستظهر نافذة الدردشة فورًا لزوارك.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-sky-600" />
                    </div>
                    <span className="font-display text-5xl font-bold text-slate-100">{s.step}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">خطط بسيطة وشفافة</h2>
            <p className="text-lg text-slate-600">ابدأ مجانًا وترقّ عند الحاجة</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'تجريبي', price: 'مجانًا', features: ['مساعد واحد', '50 رسالة شهريًا', 'مصادر معرفة غير محدودة', 'دعم العربية وRTL'], cta: 'ابدأ مجانًا', highlight: false },
              { name: 'احترافي', price: '٩٩ ر.س', period: '/ شهريًا', features: ['٣ مساعدين', '٢٬٠٠٠ رسالة شهريًا', 'تتبع المحادثات', 'تخصيص كامل', 'دعم فني'], cta: 'اشترك الآن', highlight: true },
              { name: 'الأعمال', price: '٢٩٩ ر.س', period: '/ شهريًا', features: ['مساعدين غير محدودين', '١٠٬٠٠٠ رسالة شهريًا', 'إحصاءات متقدمة', 'إدارة وكالات', 'دعم مخصص'], cta: 'تواصل معنا', highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative p-8 rounded-2xl border-2 transition-all ${
                  p.highlight
                    ? 'border-sky-500 bg-gradient-to-b from-sky-50/50 to-white shadow-xl shadow-sky-100/50 scale-105'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 bg-sky-500 text-white text-xs font-medium rounded-full">
                    الأكثر شيوعًا
                  </div>
                )}
                <h3 className="font-display text-xl font-bold text-slate-900 mb-2">{p.name}</h3>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-slate-900">{p.price}</span>
                  {p.period && <span className="text-slate-500 text-sm">{p.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-700 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block w-full py-3 rounded-xl text-center font-medium text-sm transition-all ${
                    p.highlight
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:shadow-lg hover:shadow-sky-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-sky-500 to-cyan-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">جاهز لتبدأ؟</h2>
          <p className="text-sky-50 text-lg mb-8">أنشئ مساعدك الذكي اليوم ووفّر وقتك ووقت فريقك</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-sky-600 rounded-xl font-bold hover:shadow-2xl transition-all"
          >
            أنشئ حسابك مجانًا
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">مَجيب AI</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> عربي عالمي</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> آمن ومحمي</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> سريع وموثوق</span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-slate-500 text-sm">
            © ٢٠٢٦ مَجيب AI — منصة عربية لمساعدي الذكاء الاصطناعي
          </div>
        </div>
      </footer>
    </div>
  );
}
