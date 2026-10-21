import Link from "next/link";
import { getDB, getProducts, getSiteSettings } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { ProductShowcase } from "@/components/ProductShowcase";
import {
  Wrench,
  ShieldCheck,
  Zap,
  Download,
  CreditCard,
  Bot,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const db = getDB();

  const products = await getProducts();
  const categoriesRes = await db.prepare("SELECT * FROM categories ORDER BY sort_order ASC").all();
  const categories = categoriesRes.results || [];

  // Parse custom homepage settings from admin CMS if configured
  let cms: any = null;
  if ((settings as any)?.homepage_json) {
    try {
      cms = typeof (settings as any).homepage_json === "string" 
        ? JSON.parse((settings as any).homepage_json)
        : (settings as any).homepage_json;
    } catch (e) {
      console.error("Failed to parse homepage_json in page.tsx:", e);
    }
  }

  // Hero Texts
  const heroBadge = cms?.hero?.badge_text || "১০০% অথেনটিক টুলস ও সফটওয়্যার | ইনস্ট্যান্ট ডাউনলোড";
  const heroTitleMain = cms?.hero?.title_main || "প্রিমিয়াম ডিজিটাল টুলস ও স্ক্রিপ্ট কিনুন";
  const heroTitleGradient = cms?.hero?.title_gradient || "বিকাশ, নগদ ও ক্রিপ্টোতে";
  const heroSubtitle = cms?.hero?.subtitle || settings?.site_tagline || "আপনার অনলাইন বিজনেস ও মার্কেটিংয়ের গতি বাড়াতে ১০০% ভেরিফাইড অটোমেশন টুলস, এসইও সফটওয়্যার এবং রেডিমেড সোর্স কোড। ইনস্ট্যান্ট ডেলিভারি ও ফুল সাপোর্ট।";
  const heroBtn1Text = cms?.hero?.btn1_text || "টুলস এক্সপ্লোর করুন";
  const heroBtn1Link = cms?.hero?.btn1_link || "#tools";
  const heroBtn2Text = cms?.hero?.btn2_text || "অর্ডার ট্র্যাক ও ডাউনলোড";
  const heroBtn2Link = cms?.hero?.btn2_link || "/track-order";

  // Value Props
  const valueProps = cms?.value_props || [
    { title: "ইনস্ট্যান্ট ডেলিভারি", desc: "স্বয়ংক্রিয় ডাউনলোড লিংক" },
    { title: "বিকাশ ও নগদ", desc: "Send Money পেমেন্ট" },
    { title: "USDT ক্রিপ্টো", desc: "TRC20 / BEP20 সাপোর্ট" },
    { title: "এআই হেল্প ডেস্ক", desc: "২৪/৭ স্মার্ট কাস্টমার সাপোর্ট" }
  ];

  // Products Section Heading
  const prodBadge = cms?.products_section?.badge || "প্রিমিয়াম কালেকশন";
  const prodTitle = cms?.products_section?.title || "ডিজিটাল টুলস ও সফটওয়্যার";
  const prodSubtitle = cms?.products_section?.subtitle || "পেমেন্ট সম্পন্ন হওয়ার সাথে সাথেই পাবেন হাই-স্পিড ইনস্ট্যান্ট ডাউনলোড লিংক এবং লাইসেন্স কী ডেলিভারি।";

  // Features Section
  const featTitle = cms?.features_section?.title || "কেন ToolsHub BD সেরা পছন্দ?";
  const featSubtitle = cms?.features_section?.subtitle || "আমাদের সকল সফটওয়্যার এবং স্ক্রিপ্ট সম্পূর্ণ ট্রায়াল টেস্টেড, ১০০% বাগ-ফ্রি এবং লাইফটাইম আপডেট সাপোর্ট সহ আসে।";
  const featItems = cms?.features_section?.items || [
    {
      title: "আল্ট্রা-ফাস্ট ইনস্ট্যান্ট ডেলিভারি",
      desc: "অর্ডার অনুমোদনের সাথে সাথেই কোনো অপেক্ষা ছাড়াই হাই-স্পিড সিকিউর ক্লাউড সার্ভার থেকে ফাইল ডাউনলোড ও লাইসেন্স কি পেয়ে যাবেন।"
    },
    {
      title: "সহজ পেমেন্ট (বিকাশ, নগদ, ক্রিপ্টো)",
      desc: "আন্তর্জাতিক ক্রেডিট কার্ড ছাড়াই আপনার পার্সোনাল বিকাশ বা নগদ থেকে সেন্ড মানি করে অথবা ক্রিপ্টো USDT দিয়ে সহজে পেমেন্ট করুন।"
    },
    {
      title: "স্মার্ট AI চ্যাটবট সাপোর্ট",
      desc: "টুলস ব্যবহারের নিয়ম বা যেকোনো প্রয়োজনে আমাদের ইন্টিগ্রেটেড Gemini / OpenRouter চালিত এআই বট আপনাকে সরাসরি সমাধান দিবে।"
    }
  ];

  // FAQ Section
  const faqTitle = cms?.faq_section?.title || "সাধারণ কিছু প্রশ্নোত্তর (FAQ)";
  const faqSubtitle = cms?.faq_section?.subtitle || "পেমেন্ট ও ডাউনলোড সংক্রান্ত সচরাচর জিজ্ঞাসিত প্রশ্ন";
  const faqItems = cms?.faq_section?.items || [
    {
      q: "পেমেন্ট করার কতক্ষণ পর ডাউনলোড লিংক পাব?",
      a: "আপনি বিকাশ, নগদ বা ক্রিপ্টোতে TrxID সাবমিট করার পর আমাদের অ্যাডমিন টিম ৫ থেকে ১৫ মিনিটের মধ্যে ট্রানজেকশন ভেরিফাই করে অ্যাপ্রুভ করে দেয়। অ্যাপ্রুভ হওয়ার সাথে সাথেই আপনি ডাউনলোড পেজ এবং ইমেইল থেকে ফাইলটি পেয়ে যাবেন।"
    },
    {
      q: "যদি কোনো কারণে ব্রাউজার কেটে যায় তাহলে কিভাবে ডাউনলোড করব?",
      a: "চিন্তার কোনো কারণ নেই! আমাদের ওয়েবসাইটের মেনু থেকে ট্র্যাক অর্ডার পেজে যান। আপনার অর্ডার নম্বর এবং ইমেইল অ্যাড্রেস লিখলেই আপনার ফাইল ডাউনলোড করার বাটনটি প্রদর্শিত হবে।"
    },
    {
      q: "ভবিষ্যতে নতুন আপডেট আসলে কিভাবে পাব?",
      a: "প্রতিটি টুলস এর জন্য লাইফটাইম ফ্রি আপডেট দেওয়া হয়। আপনার একই অর্ডার লিংক থেকে যেকোনো সময় লেটেস্ট ভার্সন ডাউনলোড করে নিতে পারবেন।"
    }
  ];

  // CTA Section
  const ctaTitle = cms?.cta_section?.title || "আজই আপনার পছন্দের টুলস কিনুন";
  const ctaSubtitle = cms?.cta_section?.subtitle || "নিরাপদ লেনদেন, বিকাশ ও নগদে ইনস্ট্যান্ট ক্যাশ আউট সাপোর্ট এবং সার্বক্ষণিক এআই অ্যাসিস্ট্যান্ট।";
  const ctaBtnText = cms?.cta_section?.btn_text || "এখনই ব্রাউজ করুন";
  const ctaBtnLink = cms?.cta_section?.btn_link || "#tools";

  const propIcons = [
    <Zap key="1" className="w-5 h-5 text-indigo-500 shrink-0" />,
    <CreditCard key="2" className="w-5 h-5 text-pink-500 shrink-0" />,
    <ShieldCheck key="3" className="w-5 h-5 text-emerald-500 shrink-0" />,
    <Bot key="4" className="w-5 h-5 text-purple-500 shrink-0" />
  ];

  const featIcons = [
    <Zap key="f1" className="w-5 h-5" />,
    <CreditCard key="f2" className="w-5 h-5" />,
    <Bot key="f3" className="w-5 h-5" />
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-b from-indigo-50/50 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{heroBadge}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            {heroTitleMain}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              {heroTitleGradient}
            </span>
          </h1>

          {/* Tagline / Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4">
            <a
              href={heroBtn1Link}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95"
            >
              {heroBtn1Text}
              <ArrowRight className="w-4 h-4" />
            </a>

            <Link
              href={heroBtn2Link}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-indigo-500" />
              {heroBtn2Text}
            </Link>
          </div>

          {/* Value Props Row */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            {valueProps.slice(0, 4).map((prop: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm flex items-center gap-3"
              >
                {propIcons[idx] || propIcons[0]}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{prop.title}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{prop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. FEATURED TOOLS SHOWCASE */}
      <section id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              {prodBadge}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              {prodTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-md">
            {prodSubtitle}
          </p>
        </div>

        {/* Dynamic Interactive Product Showcase with Live API Sync & Category Filtering */}
        <ProductShowcase
          products={products}
          categories={categories}
          currencySymbol={settings?.currency_symbol || "৳"}
        />
      </section>

      {/* 4. WHY CHOOSE US / FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {featTitle}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {featSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                  {featIcons[idx] || featIcons[0]}
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {faqTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
            {faqSubtitle}
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {item.q}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-8 sm:p-12 text-white text-center space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {ctaTitle}
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto">
            {ctaSubtitle}
          </p>
          <div className="pt-2">
            <a
              href={ctaBtnLink}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {ctaBtnText}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
