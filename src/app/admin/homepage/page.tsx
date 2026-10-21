"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  LayoutTemplate,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface HomepageData {
  hero: {
    badge_text: string;
    title_main: string;
    title_gradient: string;
    subtitle: string;
    btn1_text: string;
    btn1_link: string;
    btn2_text: string;
    btn2_link: string;
  };
  value_props: Array<{ title: string; desc: string }>;
  products_section: {
    badge: string;
    title: string;
    subtitle: string;
  };
  features_section: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; desc: string }>;
  };
  faq_section: {
    title: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  cta_section: {
    title: string;
    subtitle: string;
    btn_text: string;
    btn_link: string;
  };
}

const defaultHomepageData: HomepageData = {
  hero: {
    badge_text: "১০০% অথেনটিক টুলস ও সফটওয়্যার | ইনস্ট্যান্ট ডাউনলোড",
    title_main: "প্রিমিয়াম ডিজিটাল টুলস ও স্ক্রিপ্ট কিনুন",
    title_gradient: "বিকাশ, নগদ ও ক্রিপ্টোতে",
    subtitle:
      "আপনার অনলাইন বিজনেস ও মার্কেটিংয়ের গতি বাড়াতে ১০০% ভেরিফাইড অটোমেশন টুলস, এসইও সফটওয়্যার এবং রেডিমেড সোর্স কোড। ইনস্ট্যান্ট ডেলিভারি ও ফুল সাপোর্ট।",
    btn1_text: "টুলস এক্সপ্লোর করুন",
    btn1_link: "#tools",
    btn2_text: "অর্ডার ট্র্যাক ও ডাউনলোড",
    btn2_link: "/track-order"
  },
  value_props: [
    { title: "ইনস্ট্যান্ট ডেলিভারি", desc: "স্বয়ংক্রিয় ডাউনলোড লিংক" },
    { title: "বিকাশ ও নগদ", desc: "Send Money পেমেন্ট" },
    { title: "USDT ক্রিপ্টো", desc: "TRC20 / BEP20 সাপোর্ট" },
    { title: "এআই হেল্প ডেস্ক", desc: "২৪/৭ স্মার্ট কাস্টমার সাপোর্ট" }
  ],
  products_section: {
    badge: "প্রিমিয়াম কালেকশন",
    title: "ডিজিটাল টুলস ও সফটওয়্যার",
    subtitle: "পেমেন্ট সম্পন্ন হওয়ার সাথে সাথেই পাবেন হাই-স্পিড ইনস্ট্যান্ট ডাউনলোড লিংক এবং লাইসেন্স কী ডেলিভারি।"
  },
  features_section: {
    title: "কেন ToolsHub BD সেরা পছন্দ?",
    subtitle: "আমাদের সকল সফটওয়্যার এবং স্ক্রিপ্ট সম্পূর্ণ ট্রায়াল টেস্টেড, ১০০% বাগ-ফ্রি এবং লাইফটাইম আপডেট সাপোর্ট সহ আসে।",
    items: [
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
    ]
  },
  faq_section: {
    title: "সাধারণ কিছু প্রশ্নোত্তর (FAQ)",
    subtitle: "পেমেন্ট ও ডাউনলোড সংক্রান্ত সচরাচর জিজ্ঞাসিত প্রশ্ন",
    items: [
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
    ]
  },
  cta_section: {
    title: "আজই আপনার পছন্দের টুলস কিনুন",
    subtitle: "নিরাপদ লেনদেন, বিকাশ ও নগদে ইনস্ট্যান্ট ক্যাশ আউট সাপোর্ট এবং সার্বক্ষণিক এআই অ্যাসিস্ট্যান্ট।",
    btn_text: "এখনই ব্রাউজ করুন",
    btn_link: "#tools"
  }
};

export default function AdminHomepageCMS() {
  const [data, setData] = useState<HomepageData>(defaultHomepageData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"hero" | "props" | "products" | "features" | "faq" | "cta">("hero");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.settings && json.settings.homepage_json) {
          try {
            const parsed = JSON.parse(json.settings.homepage_json);
            setData({
              hero: { ...defaultHomepageData.hero, ...(parsed.hero || {}) },
              value_props: Array.isArray(parsed.value_props) && parsed.value_props.length > 0 ? parsed.value_props : defaultHomepageData.value_props,
              products_section: { ...defaultHomepageData.products_section, ...(parsed.products_section || {}) },
              features_section: {
                ...defaultHomepageData.features_section,
                ...(parsed.features_section || {}),
                items: Array.isArray(parsed.features_section?.items) ? parsed.features_section.items : defaultHomepageData.features_section.items
              },
              faq_section: {
                ...defaultHomepageData.faq_section,
                ...(parsed.faq_section || {}),
                items: Array.isArray(parsed.faq_section?.items) ? parsed.faq_section.items : defaultHomepageData.faq_section.items
              },
              cta_section: { ...defaultHomepageData.cta_section, ...(parsed.cta_section || {}) }
            });
          } catch (e) {
            console.error("Parse homepage_json error:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homepage_json: JSON.stringify(data)
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSuccessMsg("হোমপেজের সকল টেক্সট ও বাটন সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(resData.error || "সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setErrorMsg("সার্ভারে ত্রুটি দেখা দিয়েছে।");
    } finally {
      setSaving(false);
    }
  };

  const addFaqItem = () => {
    setData((prev) => ({
      ...prev,
      faq_section: {
        ...prev.faq_section,
        items: [
          ...prev.faq_section.items,
          { q: "নতুন প্রশ্নের শিরোনাম এখানে লিখুন", a: "এখানে প্রশ্নের উত্তর লিখুন..." }
        ]
      }
    }));
  };

  const removeFaqItem = (index: number) => {
    setData((prev) => ({
      ...prev,
      faq_section: {
        ...prev.faq_section,
        items: prev.faq_section.items.filter((_, i) => i !== index)
      }
    }));
  };

  const updateFaqItem = (index: number, field: "q" | "a", value: string) => {
    setData((prev) => {
      const updated = [...prev.faq_section.items];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        faq_section: {
          ...prev.faq_section,
          items: updated
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Title & Save Sticky Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-600" />
            হোমপেজ ফুল কন্টেন্ট কাস্টমাইজার
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            হোমপেজের প্রতিটি সেকশনের শিরোনাম, সাবটাইটেল, বাটন টেক্সট, ফিচারস ও FAQ সরাসরি এখান থেকে পরিবর্তন করুন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span>লাইভ প্রিভিউ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            পরিবর্তন সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: "hero", label: "১. হিরো সেকশন ও বাটন" },
          { id: "props", label: "২. ভ্যালু প্রপস (৪টি ফিচার)" },
          { id: "products", label: "৩. প্রোডাক্টস সেকশন হেডিং" },
          { id: "features", label: "৪. কেন সেরা পছন্দ (Features)" },
          { id: "faq", label: "৫. সাধারণ প্রশ্নোত্তর (FAQ)" },
          { id: "cta", label: "৬. নিচের CTA ব্যানার" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Hero Section */}
      {activeTab === "hero" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            হিরো সেকশন কাস্টমাইজেশন
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                টপ ব্যাজ টেক্সট (Top Badge)
              </label>
              <input
                type="text"
                value={data.hero.badge_text}
                onChange={(e) =>
                  setData({ ...data, hero: { ...data.hero, badge_text: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  প্রধান শিরোনাম (Title Line 1)
                </label>
                <input
                  type="text"
                  value={data.hero.title_main}
                  onChange={(e) =>
                    setData({ ...data, hero: { ...data.hero, title_main: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  গ্রেডিয়েন্ট রঙিন শিরোনাম (Title Line 2 - Highlight)
                </label>
                <input
                  type="text"
                  value={data.hero.title_gradient}
                  onChange={(e) =>
                    setData({ ...data, hero: { ...data.hero, title_gradient: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                সাবটাইটেল / বিবরণ (Subtitle Description)
              </label>
              <textarea
                rows={3}
                value={data.hero.subtitle}
                onChange={(e) =>
                  setData({ ...data, hero: { ...data.hero, subtitle: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">
                  প্রাথমিক বাটন (Primary Button)
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    বাটন টেক্সট
                  </label>
                  <input
                    type="text"
                    value={data.hero.btn1_text}
                    onChange={(e) =>
                      setData({ ...data, hero: { ...data.hero, btn1_text: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    বাটন লিংক (URL)
                  </label>
                  <input
                    type="text"
                    value={data.hero.btn1_link}
                    onChange={(e) =>
                      setData({ ...data, hero: { ...data.hero, btn1_link: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">
                  দ্বিতীয় বাটন (Secondary Button)
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    বাটন টেক্সট
                  </label>
                  <input
                    type="text"
                    value={data.hero.btn2_text}
                    onChange={(e) =>
                      setData({ ...data, hero: { ...data.hero, btn2_text: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    বাটন লিংক (URL)
                  </label>
                  <input
                    type="text"
                    value={data.hero.btn2_link}
                    onChange={(e) =>
                      setData({ ...data, hero: { ...data.hero, btn2_link: e.target.value } })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Value Props (4 Cards under Hero) */}
      {activeTab === "props" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            ভ্যালু প্রপস (হিরোর নিচের ৪টি ফিচার বক্স)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.value_props.map((prop, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                  কার্ড #{idx + 1}
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    শিরোনাম (Title)
                  </label>
                  <input
                    type="text"
                    value={prop.title}
                    onChange={(e) => {
                      const updated = [...data.value_props];
                      updated[idx].title = e.target.value;
                      setData({ ...data, value_props: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    সংক্ষিপ্ত বিবরণ (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={prop.desc}
                    onChange={(e) => {
                      const updated = [...data.value_props];
                      updated[idx].desc = e.target.value;
                      setData({ ...data, value_props: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Products Section Heading */}
      {activeTab === "products" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            প্রোডাক্টস সেকশন হেডিং সেটিংস
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ছোট ব্যাজ টেক্সট (Small Badge)
              </label>
              <input
                type="text"
                value={data.products_section.badge}
                onChange={(e) =>
                  setData({
                    ...data,
                    products_section: { ...data.products_section, badge: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রধান সেকশন শিরোনাম (Section Title)
              </label>
              <input
                type="text"
                value={data.products_section.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    products_section: { ...data.products_section, title: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                সাবটাইটেল / বর্ণনা (Right Side Subtitle)
              </label>
              <textarea
                rows={2}
                value={data.products_section.subtitle}
                onChange={(e) =>
                  setData({
                    ...data,
                    products_section: { ...data.products_section, subtitle: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Why Choose Us (Features) */}
      {activeTab === "features" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            কেন আমাদের পছন্দ করবেন (Why Choose Us)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                সেকশন শিরোনাম (Title)
              </label>
              <input
                type="text"
                value={data.features_section.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    features_section: { ...data.features_section, title: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                সেকশন সাবটাইটেল (Subtitle)
              </label>
              <input
                type="text"
                value={data.features_section.subtitle}
                onChange={(e) =>
                  setData({
                    ...data,
                    features_section: { ...data.features_section, subtitle: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ৩টি প্রধান ফিচার কার্ড:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.features_section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <span className="font-mono text-xs font-bold text-indigo-600 block">
                    ফিচার #{idx + 1}
                  </span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      কার্ড শিরোনাম
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...data.features_section.items];
                        updated[idx].title = e.target.value;
                        setData({
                          ...data,
                          features_section: { ...data.features_section, items: updated }
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      কার্ড বিস্তারিত বিবরণ
                    </label>
                    <textarea
                      rows={3}
                      value={item.desc}
                      onChange={(e) => {
                        const updated = [...data.features_section.items];
                        updated[idx].desc = e.target.value;
                        setData({
                          ...data,
                          features_section: { ...data.features_section, items: updated }
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: FAQ Section Builder */}
      {activeTab === "faq" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                সাধারণ প্রশ্নোত্তর (FAQ) বিল্ডার
              </h3>
              <p className="text-xs text-slate-500">
                হোমপেজে প্রদর্শিত প্রশ্ন ও উত্তরের তালিকা তৈরি ও সম্পাদনা করুন।
              </p>
            </div>
            <button
              onClick={addFaqItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন প্রশ্ন যুক্ত করুন
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                FAQ সেকশন শিরোনাম
              </label>
              <input
                type="text"
                value={data.faq_section.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    faq_section: { ...data.faq_section, title: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                FAQ সেকশন সাবটাইটেল
              </label>
              <input
                type="text"
                value={data.faq_section.subtitle}
                onChange={(e) =>
                  setData({
                    ...data,
                    faq_section: { ...data.faq_section, subtitle: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {data.faq_section.items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    প্রশ্ন #{idx + 1}
                  </span>
                  {data.faq_section.items.length > 1 && (
                    <button
                      onClick={() => removeFaqItem(idx)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    প্রশ্ন (Question)
                  </label>
                  <input
                    type="text"
                    value={item.q}
                    onChange={(e) => updateFaqItem(idx, "q", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    উত্তর (Answer)
                  </label>
                  <textarea
                    rows={2}
                    value={item.a}
                    onChange={(e) => updateFaqItem(idx, "a", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: CTA Section Banner */}
      {activeTab === "cta" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            নিচের কল-টু-অ্যাকশন ব্যানার (CTA Banner)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ব্যানার শিরোনাম (Title)
              </label>
              <input
                type="text"
                value={data.cta_section.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    cta_section: { ...data.cta_section, title: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ব্যানার সাবটাইটেল (Subtitle)
              </label>
              <textarea
                rows={2}
                value={data.cta_section.subtitle}
                onChange={(e) =>
                  setData({
                    ...data,
                    cta_section: { ...data.cta_section, subtitle: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বাটন টেক্সট
                </label>
                <input
                  type="text"
                  value={data.cta_section.btn_text}
                  onChange={(e) =>
                    setData({
                      ...data,
                      cta_section: { ...data.cta_section, btn_text: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বাটন লিংক (URL)
                </label>
                <input
                  type="text"
                  value={data.cta_section.btn_link}
                  onChange={(e) =>
                    setData({
                      ...data,
                      cta_section: { ...data.cta_section, btn_link: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Action */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          সকল পরিবর্তন সংরক্ষণ করুন
        </button>
      </div>
    </div>
  );
}
