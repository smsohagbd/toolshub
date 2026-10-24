"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Headphones,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
  Send,
  Clock,
  MapPin,
  Eye,
  MessageSquare,
  Ticket,
  HelpCircle,
  Sparkles,
  Info,
  ShieldCheck
} from "lucide-react";
import { ContactPageData } from "@/lib/types";

const defaultContactData: ContactPageData = {
  badge_text: "২৪/৭ কাস্টমার সাপোর্ট",
  title: "যোগাযোগ ও হেল্প ডেস্ক",
  subtitle:
    "যেকোনো প্রোডাক্ট সম্পর্কিত জিজ্ঞাসা, পেমেন্ট ভেরিফিকেশন বা টেকনিক্যাল সমস্যার তাৎক্ষণিক সমাধানের জন্য আমাদের সাথে যোগাযোগ করুন।",
  notice_banner: {
    enabled: false,
    text: "জরুরী প্রয়োজনে সরাসরি আমাদের WhatsApp বা হটলাইনে যোগাযোগ করার অনুরোধ করা হচ্ছে।",
    type: "info"
  },
  whatsapp: {
    enabled: true,
    title: "হোয়াটসঅ্যাপ সাপোর্ট",
    description:
      "যেকোনো প্রোডাক্টের লাইভ ডেমো, অর্ডার তথ্য বা দ্রুত সহায়তার জন্য সরাসরি WhatsApp-এ বার্তা পাঠান।",
    number: "+8801700000000",
    button_text: "সরাসরি WhatsApp-এ চ্যাট করুন",
    prefill_text: "Hello ToolsHub BD support, I have an inquiry."
  },
  telegram: {
    enabled: true,
    title: "টেলিগ্রাম সাপোর্ট ও চ্যানেল",
    description:
      "আমাদের টেলিগ্রাম চ্যানেলে যুক্ত হয়ে নতুন সব টুলসের আপডেট, অফার এবং সাপোর্ট এজেন্টের সাথে কথা বলুন।",
    channel: "toolshubbd",
    button_text: "টেলিগ্রামে মেসেজ দিন"
  },
  support_info: {
    email: "support@sohag.com.bd",
    phone: "+880 1700-000000",
    hours: "প্রতিদিন সকাল ১০:০০ - রাত ১২:০০",
    address: "ঢাকা, বাংলাদেশ"
  },
  ticket_section: {
    guest_title: "ইতিমধ্যে ক্রয় করেছেন? টিকিট সাপোর্ট পান",
    guest_desc:
      "লগইন করা গ্রাহকরা সরাসরি আমাদের টিকিট সিস্টেমের মাধ্যমে দ্রুত সমাধান ও হিস্টোরি ট্র্যাকিং সুবিধা পান।",
    guest_btn_text: "লগইন করে টিকিট খুলুন",
    user_title: "নতুন সাপোর্ট টিকিট খুলুন",
    response_guarantee: "গড়ে ৩০ মিনিটের মধ্যে রিপ্লাই"
  },
  faqs: [
    {
      q: "পেমেন্ট করার পর টুলস পেতে কতক্ষণ সময় লাগে?",
      a: "বিকাশ বা নগদ দিয়ে ট্রানজেকশন আইডি দিয়ে অর্ডার প্লেস করার পর অ্যাডমিন ভেরিফাই করতেই (সাধারণত ৫-১৫ মিনিটের মধ্যে) ডাউনলোড লিংক সক্রিয় হয়ে যায়।"
    },
    {
      q: "সাপোর্ট টিকিট কিভাবে কাজ করে?",
      a: "আমাদের ওয়েবসাইটে একাউন্ট থাকলে সরাসরি কন্টাক্ট পেজ থেকে টিকিট খুলতে পারেন। অ্যাডমিন রিপ্লাই দিলে আপনার টিকিটে সরাসরি দেখতে পাবেন।"
    },
    {
      q: "সরাসরি ফোন বা হোয়াটসঅ্যাপে কথা বলা যাবে?",
      a: "হ্যাঁ, উল্লেখিত কাজের সময় আমাদের অফিসিয়াল হোয়াটসঅ্যাপ বা হেল্পলাইন নম্বরে সরাসরি যোগাযোগ করতে পারেন।"
    }
  ]
};

export default function AdminContactPage() {
  const [data, setData] = useState<ContactPageData>(defaultContactData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "header" | "whatsapp" | "telegram" | "support_info" | "ticket" | "faqs" | "preview"
  >("header");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.settings) {
          const s = json.settings;
          let parsedContact: any = null;
          if (s.contact_page_json) {
            try {
              parsedContact =
                typeof s.contact_page_json === "string"
                  ? JSON.parse(s.contact_page_json)
                  : s.contact_page_json;
            } catch (e) {
              console.error("Failed to parse contact_page_json", e);
            }
          }

          if (parsedContact) {
            setData({
              ...defaultContactData,
              ...parsedContact,
              whatsapp: {
                ...defaultContactData.whatsapp,
                number: s.whatsapp_number || parsedContact.whatsapp?.number || defaultContactData.whatsapp.number,
                ...(parsedContact.whatsapp || {})
              },
              telegram: {
                ...defaultContactData.telegram,
                channel: s.telegram_channel || parsedContact.telegram?.channel || defaultContactData.telegram.channel,
                ...(parsedContact.telegram || {})
              },
              support_info: {
                ...defaultContactData.support_info,
                ...(parsedContact.support_info || {})
              },
              ticket_section: {
                ...defaultContactData.ticket_section,
                ...(parsedContact.ticket_section || {})
              },
              notice_banner: {
                ...defaultContactData.notice_banner,
                ...(parsedContact.notice_banner || {})
              },
              faqs: Array.isArray(parsedContact.faqs) ? parsedContact.faqs : defaultContactData.faqs
            });
          } else {
            setData((prev) => ({
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                number: s.whatsapp_number || prev.whatsapp.number
              },
              telegram: {
                ...prev.telegram,
                channel: s.telegram_channel || prev.telegram.channel
              }
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load contact settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
          contact_page_json: JSON.stringify(data),
          whatsapp_number: data.whatsapp.number,
          telegram_channel: data.telegram.channel
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSuccessMsg("যোগাযোগ পেজের সকল তথ্য ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
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

  const handleResetToDefault = () => {
    if (confirm("আপনি কি নিশ্চিত যে সকল ফিল্ড ডিফল্ট মানে রিসেট করতে চান?")) {
      setData(defaultContactData);
    }
  };

  const addFaqItem = () => {
    setData((prev) => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        { q: "নতুন প্রশ্নের শিরোনাম এখানে লিখুন", a: "এখানে প্রশ্নের উত্তর লিখুন..." }
      ]
    }));
  };

  const removeFaqItem = (index: number) => {
    setData((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  const updateFaqItem = (index: number, field: "q" | "a", value: string) => {
    setData((prev) => {
      const updated = [...(prev.faqs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        faqs: updated
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

  // Prepared links for preview
  const rawWa = (data.whatsapp.number || "8801700000000").replace(/[^0-9]/g, "");
  const waUrl = `https://wa.me/${rawWa.startsWith("88") ? rawWa : "88" + rawWa}${
    data.whatsapp.prefill_text ? `?text=${encodeURIComponent(data.whatsapp.prefill_text)}` : ""
  }`;
  const tgHandle = (data.telegram.channel || "toolshubbd").replace("@", "");
  const tgUrl = `https://t.me/${tgHandle}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header & Save Button Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Headphones className="w-6 h-6 text-indigo-600" />
            যোগাযোগ পেজ কন্টেন্ট ও হেল্পডেস্ক এডিটর
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            কন্টাক্ট পেজের শিরোনাম, সাবটাইটেল, WhatsApp, Telegram, হটলাইন ও টিকিট সেটিংস সহজে পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/contact"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span>লাইভ পেজ দেখুন</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="ডিফল্ট মানে ফিরিয়ে নিন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">রিসেট</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            সেটিংস সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {/* Success & Error alerts */}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold scrollbar-none">
        {[
          { id: "header", label: "১. হেডার ও ব্যানার", icon: Sparkles },
          { id: "whatsapp", label: "২. হোয়াটসঅ্যাপ সাপোর্ট", icon: MessageSquare },
          { id: "telegram", label: "৩. টেলিগ্রাম চ্যানেল", icon: Send },
          { id: "support_info", label: "৪. হটলাইন ও অফিস", icon: Phone },
          { id: "ticket", label: "৫. সাপোর্ট টিকিট", icon: Ticket },
          { id: "faqs", label: "৬. সাধারণ প্রশ্নোত্তর", icon: HelpCircle },
          { id: "preview", label: "৭. লাইভ প্রিভিউ", icon: Eye }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Header & Notice Banner */}
      {activeTab === "header" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              কন্টাক্ট পেজের হেডার ও নোটিশ ব্যানার
            </h2>
            <p className="text-xs text-slate-500">
              পেজের মূল শিরোনাম, সাবটাইটেল এবং জরুরী নোটিশ বা এনাউন্সমেন্ট ব্যানার কনফিগার করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                টপ ব্যাজ টেক্সট (Top Badge)
              </label>
              <input
                type="text"
                value={data.badge_text}
                onChange={(e) => setData({ ...data, badge_text: e.target.value })}
                placeholder="e.g. ২৪/৭ কাস্টমার সাপোর্ট"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মূল শিরোনাম (Page Title)
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="e.g. যোগাযোগ ও হেল্প ডেস্ক"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              সাবটাইটেল / সংক্ষিপ্ত বিবরণ (Subtitle)
            </label>
            <textarea
              rows={3}
              value={data.subtitle}
              onChange={(e) => setData({ ...data, subtitle: e.target.value })}
              placeholder="কন্টাক্ট পেজের ভূমিকা টেক্সট লিখুন..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notice Banner */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                জরুরী নোটিশ ব্যানার (Notice Banner)
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.notice_banner?.enabled || false}
                  onChange={(e) =>
                    setData({
                      ...data,
                      notice_banner: {
                        ...(data.notice_banner || { text: "", type: "info" }),
                        enabled: e.target.checked
                      }
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                  {data.notice_banner?.enabled ? "সক্রিয়" : "বন্ধ"}
                </span>
              </label>
            </div>

            {data.notice_banner?.enabled && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ব্যানারের ধরন
                    </label>
                    <select
                      value={data.notice_banner?.type || "info"}
                      onChange={(e) =>
                        setData({
                          ...data,
                          notice_banner: {
                            ...(data.notice_banner || { enabled: true, text: "" }),
                            type: e.target.value as any
                          }
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="info">তথ্য (Blue Info)</option>
                      <option value="warning">সতর্কবার্তা (Amber Warning)</option>
                      <option value="success">সুসংবাদ (Emerald Success)</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ব্যানার নোটিশ মেসেজ
                    </label>
                    <input
                      type="text"
                      value={data.notice_banner?.text || ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          notice_banner: {
                            ...(data.notice_banner || { enabled: true, type: "info" }),
                            text: e.target.value
                          }
                        })
                      }
                      placeholder="e.g. জরুরী প্রয়োজনে সরাসরি আমাদের WhatsApp বা হটলাইনে যোগাযোগ করার অনুরোধ করা হচ্ছে।"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Support */}
      {activeTab === "whatsapp" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                হোয়াটসঅ্যাপ সাপোর্ট কার্ড সেটিংস
              </h2>
              <p className="text-xs text-slate-500">
                গ্রাহকদের সাথে সরাসরি হোয়াটসঅ্যাপে যোগাযোগের জন্য নম্বর ও কার্ড কন্টেন্ট সেট করুন।
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.whatsapp.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    whatsapp: { ...data.whatsapp, enabled: e.target.checked }
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                {data.whatsapp.enabled ? "সক্রিয়" : "লুকানো"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                হোয়াটসঅ্যাপ নম্বর (কান্ট্রি কোড সহ) *
              </label>
              <input
                type="text"
                value={data.whatsapp.number}
                onChange={(e) =>
                  setData({
                    ...data,
                    whatsapp: { ...data.whatsapp, number: e.target.value }
                  })
                }
                placeholder="+8801700000000"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                উদাহরণ: +8801700000000 (বাংলাদেশি নম্বরের জন্য +880 সহ লিখুন)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                কার্ড শিরোনাম (Card Title)
              </label>
              <input
                type="text"
                value={data.whatsapp.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    whatsapp: { ...data.whatsapp, title: e.target.value }
                  })
                }
                placeholder="হোয়াটসঅ্যাপ সাপোর্ট"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              কার্ড বিবরণ (Description)
            </label>
            <textarea
              rows={2}
              value={data.whatsapp.description}
              onChange={(e) =>
                setData({
                  ...data,
                  whatsapp: { ...data.whatsapp, description: e.target.value }
                })
              }
              placeholder="হোয়াটসঅ্যাপ সাপোর্টের সংক্ষিপ্ত বিবরণ..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বাটন টেক্সট (Button Text)
              </label>
              <input
                type="text"
                value={data.whatsapp.button_text}
                onChange={(e) =>
                  setData({
                    ...data,
                    whatsapp: { ...data.whatsapp, button_text: e.target.value }
                  })
                }
                placeholder="সরাসরি WhatsApp-এ চ্যাট করুন"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                অটো মেসেজ প্রি-ফিল (Prefill Message - ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={data.whatsapp.prefill_text || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    whatsapp: { ...data.whatsapp, prefill_text: e.target.value }
                  })
                }
                placeholder="Hello ToolsHub BD support, I need help..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Telegram Support */}
      {activeTab === "telegram" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-500" />
                টেলিগ্রাম সাপোর্ট ও চ্যানেল সেটিংস
              </h2>
              <p className="text-xs text-slate-500">
                গ্রাহকদের জন্য টেলিগ্রাম সাপোর্ট বা অফিশিয়াল চ্যানেল হ্যান্ডেল কনফিগার করুন।
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.telegram.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    telegram: { ...data.telegram, enabled: e.target.checked }
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-sky-500"></div>
              <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                {data.telegram.enabled ? "সক্রিয়" : "লুকানো"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                টেলিগ্রাম ইউজারনেম / চ্যানেল হ্যান্ডেল (@ ছাড়া বা সহ) *
              </label>
              <input
                type="text"
                value={data.telegram.channel}
                onChange={(e) =>
                  setData({
                    ...data,
                    telegram: { ...data.telegram, channel: e.target.value }
                  })
                }
                placeholder="toolshubbd"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                লিংক হবে: https://t.me/{tgHandle}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                কার্ড শিরোনাম (Card Title)
              </label>
              <input
                type="text"
                value={data.telegram.title}
                onChange={(e) =>
                  setData({
                    ...data,
                    telegram: { ...data.telegram, title: e.target.value }
                  })
                }
                placeholder="টেলিগ্রাম সাপোর্ট ও চ্যানেল"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              কার্ড বিবরণ (Description)
            </label>
            <textarea
              rows={2}
              value={data.telegram.description}
              onChange={(e) =>
                setData({
                  ...data,
                  telegram: { ...data.telegram, description: e.target.value }
                })
              }
              placeholder="টেলিগ্রাম চ্যানেলের বিবরণ..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              বাটন টেক্সট (Button Text)
            </label>
            <input
              type="text"
              value={data.telegram.button_text}
              onChange={(e) =>
                setData({
                  ...data,
                  telegram: { ...data.telegram, button_text: e.target.value }
                })
              }
              placeholder="টেলিগ্রামে মেসেজ দিন"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Direct Support Info & Office */}
      {activeTab === "support_info" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              সরাসরি সাপোর্ট ও অফিস তথ্য
            </h2>
            <p className="text-xs text-slate-500">
              ইমেইল, হেল্পলাইন ফোন নম্বর, সার্ভিস কার্যসময় এবং অফিসের ঠিকানা পরিচালনা করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                সাপোর্ট ইমেইল এড্রেস
              </label>
              <input
                type="email"
                value={data.support_info.email}
                onChange={(e) =>
                  setData({
                    ...data,
                    support_info: { ...data.support_info, email: e.target.value }
                  })
                }
                placeholder="support@sohag.com.bd"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                হটলাইন ফোন নম্বর
              </label>
              <input
                type="text"
                value={data.support_info.phone}
                onChange={(e) =>
                  setData({
                    ...data,
                    support_info: { ...data.support_info, phone: e.target.value }
                  })
                }
                placeholder="+880 1700-000000"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                কাজের সময় ও সাপোর্ট শিডিউল
              </label>
              <input
                type="text"
                value={data.support_info.hours}
                onChange={(e) =>
                  setData({
                    ...data,
                    support_info: { ...data.support_info, hours: e.target.value }
                  })
                }
                placeholder="প্রতিদিন সকাল ১০:০০ - রাত ১২:০০"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                অফিস / লোকেশন
              </label>
              <input
                type="text"
                value={data.support_info.address}
                onChange={(e) =>
                  setData({
                    ...data,
                    support_info: { ...data.support_info, address: e.target.value }
                  })
                }
                placeholder="ঢাকা, বাংলাদেশ"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Ticket Section Settings */}
      {activeTab === "ticket" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-600" />
              সাপোর্ট টিকিট সেকশন সেটিংস
            </h2>
            <p className="text-xs text-slate-500">
              গেস্ট ইউজারদের লগইন প্রম্পট এবং টিকিট ফর্মের টেক্সট কনফিগার করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                গেস্ট ইউজার কার্ড টাইটেল
              </label>
              <input
                type="text"
                value={data.ticket_section.guest_title}
                onChange={(e) =>
                  setData({
                    ...data,
                    ticket_section: { ...data.ticket_section, guest_title: e.target.value }
                  })
                }
                placeholder="ইতিমধ্যে ক্রয় করেছেন? টিকিট সাপোর্ট পান"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                গেস্ট বাটন টেক্সট
              </label>
              <input
                type="text"
                value={data.ticket_section.guest_btn_text}
                onChange={(e) =>
                  setData({
                    ...data,
                    ticket_section: { ...data.ticket_section, guest_btn_text: e.target.value }
                  })
                }
                placeholder="লগইন করে টিকিট খুলুন"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              গেস্ট কার্ড বিবরণ
            </label>
            <textarea
              rows={2}
              value={data.ticket_section.guest_desc}
              onChange={(e) =>
                setData({
                  ...data,
                  ticket_section: { ...data.ticket_section, guest_desc: e.target.value }
                })
              }
              placeholder="লগইন করা গ্রাহকদের সুবিধার বিবরণ..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                লগইন টিকিট ফর্ম হেডিং
              </label>
              <input
                type="text"
                value={data.ticket_section.user_title}
                onChange={(e) =>
                  setData({
                    ...data,
                    ticket_section: { ...data.ticket_section, user_title: e.target.value }
                  })
                }
                placeholder="নতুন সাপোর্ট টিকিট খুলুন"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                রিপ্লাই গ্যারান্টি ব্যাজ (Response Time)
              </label>
              <input
                type="text"
                value={data.ticket_section.response_guarantee}
                onChange={(e) =>
                  setData({
                    ...data,
                    ticket_section: { ...data.ticket_section, response_guarantee: e.target.value }
                  })
                }
                placeholder="গড়ে ৩০ মিনিটের মধ্যে রিপ্লাই"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: FAQs */}
      {activeTab === "faqs" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                কন্টাক্ট পেজের সাধারণ প্রশ্নোত্তর (FAQs)
              </h2>
              <p className="text-xs text-slate-500">
                গ্রাহকদের সুবিধার্থে কন্টাক্ট পেজে সাধারণ কিছু প্রশ্নোত্তর যুক্ত করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={addFaqItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন প্রশ্ন যোগ করুন
            </button>
          </div>

          <div className="space-y-4">
            {(data.faqs || []).map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    প্রশ্ন #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFaqItem(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="প্রশ্নটি মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    value={faq.q}
                    onChange={(e) => updateFaqItem(idx, "q", e.target.value)}
                    placeholder="প্রশ্নের শিরোনাম লিখুন..."
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={faq.a}
                    onChange={(e) => updateFaqItem(idx, "a", e.target.value)}
                    placeholder="প্রশ্নের উত্তর বিস্তারিত লিখুন..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}

            {(data.faqs || []).length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                কোনো FAQ যোগ করা হয়নি। উপরে "নতুন প্রশ্ন যোগ করুন" বাটনে ক্লিক করুন।
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Real-time Live Preview */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
              এটি আপনার বর্তমান কনফিগারেশনের তাৎক্ষণিক প্রিভিউ।
            </span>
            <Link
              href="/contact"
              target="_blank"
              className="font-bold underline flex items-center gap-1 hover:text-indigo-600"
            >
              আসল পেজ দেখুন <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-8">
            {/* Header Preview */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Headphones className="w-3.5 h-3.5" />
                {data.badge_text || "২৪/৭ কাস্টমার সাপোর্ট"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {data.title || "যোগাযোগ ও হেল্প ডেস্ক"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                {data.subtitle}
              </p>
            </div>

            {/* Notice banner if active */}
            {data.notice_banner?.enabled && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 border ${
                  data.notice_banner.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    : data.notice_banner.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>{data.notice_banner.text}</span>
              </div>
            )}

            {/* Support Cards Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WA */}
              {data.whatsapp.enabled && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                    WA
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {data.whatsapp.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{data.whatsapp.description}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs font-bold">
                    {data.whatsapp.number}
                  </div>
                  <div className="py-2.5 text-center rounded-xl bg-emerald-600 text-white font-bold text-xs">
                    {data.whatsapp.button_text}
                  </div>
                </div>
              )}

              {/* TG */}
              {data.telegram.enabled && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-lg font-bold">
                    TG
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {data.telegram.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{data.telegram.description}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs font-bold">
                    @{tgHandle}
                  </div>
                  <div className="py-2.5 text-center rounded-xl bg-sky-600 text-white font-bold text-xs">
                    {data.telegram.button_text}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Support Details */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">ইমেইল</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {data.support_info.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">হটলাইন</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {data.support_info.phone}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">কাজের সময়</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {data.support_info.hours}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">অফিস</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {data.support_info.address}
                </span>
              </div>
            </div>

            {/* Ticket Prompt Preview */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {data.ticket_section.guest_title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {data.ticket_section.guest_desc}
                </p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs whitespace-nowrap">
                {data.ticket_section.guest_btn_text}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
