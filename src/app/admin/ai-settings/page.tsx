"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Save,
  Check,
  Loader2,
  Sparkles,
  Key,
  Play,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
  MessageSquare
} from "lucide-react";

interface ChatbotFaq {
  question: string;
  answer: string;
}

export default function AdminAISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openrouter">("openrouter");
  const [aiModel, setAiModel] = useState("minimax/minimax-m3.1-flash:free");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");

  // Preset chatbot quick questions and instant answers
  const [chatbotFaqs, setChatbotFaqs] = useState<ChatbotFaq[]>([
    {
      question: "টুলস কীভাবে ডাউনলোড করব?",
      answer: "পেমেন্ট সম্পন্ন করে TrxID সাবমিট করার ৫-১৫ মিনিটের মধ্যে অ্যাডমিন ভেরিফাই করে ডাউনলোড লিংক সক্রিয় করে দেয়। এছাড়াও 'ট্র্যাক অর্ডার' পেজে অর্ডার নম্বর দিয়ে যেকোনো সময় ডাউনলোড করতে পারবেন।"
    },
    {
      question: "বিকাশ বা নগদে কীভাবে কিনব?",
      answer: "পছন্দের টুলস বা কোর্সের 'কিনুন' বাটনে ক্লিক করে বিকাশ বা নগদ পার্সোনাল নম্বরে Send Money করুন এবং TrxID ফর্মটিতে লিখে সাবমিট করুন।"
    },
    {
      question: "৩য়-পক্ষ কোর্স বা ড্রাইভ লিংক কীভাবে পাব?",
      answer: "যেসব প্রডাক্টে গুগল ড্রাইভ বা ৩য়-পক্ষ অ্যাক্সেস রয়েছে, সেগুলোতে পেমেন্ট অ্যাপ্রুভ হওয়ার পর ট্র্যাকিং পেজ ও ইউজার ড্যাশবোর্ডে সরাসরি 'Access Now' বাটন দৃশ্যমান হবে।"
    },
    {
      question: "সফটওয়্যারে কোনো সমস্যা হলে সাপোর্ট কোথায় পাব?",
      answer: "লগইন করা থাকলে আমাদের 'যোগাযোগ' পেজ থেকে সরাসরি সাপোর্ট টিকিট খুলতে পারেন। অথবা আমাদের অফিসিয়াল হোয়াটসঅ্যাপ বা টেলিগ্রামে সরাসরি মেসেজ দিতে পারেন।"
    }
  ]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        const s = data.settings || {};
        setAiEnabled(Boolean(s.ai_enabled ?? 1));
        setAiProvider(s.ai_provider || "openrouter");
        setAiModel(s.ai_model || "minimax/minimax-m3.1-flash:free");
        setAiApiKey(s.ai_api_key || "");
        setAiSystemPrompt(
          s.ai_system_prompt ||
            "আপনি ToolsHub BD এর একজন দক্ষ এআই হেল্প ডেস্ক সহকারী। গ্রাহকদের আমাদের ওয়েবসাইটের ডিজিটাল টুলস সম্পর্কে তথ্য দিন, পেমেন্ট পদ্ধতি (বিকাশ, নগদ, ক্রিপ্টো) বুঝিয়ে বলুন এবং বিনম্রভাবে সহায়তা করুন।"
        );

        if (s.chatbot_faqs_json) {
          try {
            const parsed = JSON.parse(s.chatbot_faqs_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setChatbotFaqs(parsed);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleProviderChange = (provider: "gemini" | "openrouter") => {
    setAiProvider(provider);
    if (provider === "gemini") {
      setAiModel("gemini-1.5-flash");
    } else {
      setAiModel("minimax/minimax-m3.1-flash:free");
    }
  };

  const addFaq = () => {
    setChatbotFaqs([
      ...chatbotFaqs,
      { question: "নতুন প্রশ্ন...", answer: "এই প্রশ্নের বিস্তারিত উত্তর..." }
    ]);
  };

  const updateFaq = (idx: number, field: "question" | "answer", val: string) => {
    const updated = [...chatbotFaqs];
    updated[idx][field] = val;
    setChatbotFaqs(updated);
  };

  const removeFaq = (idx: number) => {
    setChatbotFaqs(chatbotFaqs.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_enabled: aiEnabled ? 1 : 0,
          ai_provider: aiProvider,
          ai_model: aiModel,
          ai_api_key: aiApiKey,
          ai_system_prompt: aiSystemPrompt,
          chatbot_faqs_json: chatbotFaqs
        })
      });

      if (res.ok) {
        setSuccessMsg("এআই চ্যাটবট সেটিংস ও প্রিসেট প্রশ্নাবলী সফলভাবে সেভ হয়েছে!");
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      alert("সংরক্ষণ করতে ব্যর্থ হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleTestChat = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "হ্যালো! আপনাদের এখানে কি কি ডিজিটাল টুলস আছে?"
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setTestResult(data.reply);
      } else {
        setTestResult(data.error || "এআই সার্ভিস থেকে কোনো উত্তর পাওয়া যায়নি। API কী ও মডেল চেক করুন।");
      }
    } catch (err) {
      setTestResult("সার্ভারে সংযোগ ব্যর্থ হয়েছে।");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-600" />
          এআই হেল্প ডেস্ক ও চ্যাটবট সেটিংস
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ক্লাউডফ্লেয়ার ও ওপেনরাউটার / জেমিনাই চালিত সার্বক্ষণিক স্মার্ট চ্যাটবট এবং কাস্টম প্রশ্ন-উত্তর কনফিগারেশন।
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle & Provider */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                চ্যাটবট সক্রিয়করণ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ওয়েবসাইটের নিচে ডানে ভাসমান চ্যাট উইজেট চালু বা বন্ধ রাখুন
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              AI মডেল প্রোভাইডার নির্বাচন
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => handleProviderChange("openrouter")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  aiProvider === "openrouter"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    OpenRouter AI (সক্রিয়)
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                    ফ্রি ও আনলিমিটেড
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Llama 3.1, Minimax Flash, Gemma 4 সহ সকল শীর্ষ মডেল এক API দিয়ে পরিচালনা করুন।
                </p>
              </div>

              <div
                onClick={() => handleProviderChange("gemini")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  aiProvider === "gemini"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Google Gemini AI
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                    Flash 1.5
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Google AI Studio এর অফিসিয়াল ফ্রি এপিআই দিয়ে দ্রুততম বাংলায় রেসপন্স।
                </p>
              </div>
            </div>
          </div>

          {/* Model Name & API Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মডেল নাম (AI Model ID)
              </label>
              {aiProvider === "openrouter" ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={[
                        "minimax/minimax-m3.1-flash:free",
                        "google/gemini-2.0-flash-exp:free",
                        "meta-llama/llama-3.3-70b-instruct:free",
                        "deepseek/deepseek-chat",
                        "openai/gpt-4o-mini",
                        "anthropic/claude-3.5-sonnet",
                        "qwen/qwen-2.5-72b-instruct"
                      ].includes(aiModel) ? aiModel : "custom"}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setAiModel(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="google/gemini-3.8-flash">Google Gemini 3.8 Flash (সুপার ফাস্ট ও অ্যাকুরেট)</option>
                      <option value="minimax/minimax-m3.1-flash:free">Minimax M3.1 Flash (ফ্রি ও সুপারফাস্ট)</option>
                      <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (ফ্রি এক্সপেরিমেন্টাল)</option>
                      <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct (ফ্রি ও বুদ্ধিমান)</option>
                      <option value="deepseek/deepseek-chat">DeepSeek V3 (সুপার পাওয়ারফুল ও কম খরচে)</option>
                      <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B Instruct</option>
                      <option value="custom">কাস্টম মডেল নাম নিজে লিখুন ✎</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="যেকোনো OpenRouter মডেল ID লিখুন (e.g. google/gemini-3.8-flash)"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">ক্লিক করে সিলেক্ট করুন:</span>
                    {[
                      { name: "Gemini 3.8 Flash", id: "google/gemini-3.8-flash" },
                      { name: "Minimax Free", id: "minimax/minimax-m3.1-flash:free" },
                      { name: "Gemini 2.0 Free", id: "google/gemini-2.0-flash-exp:free" },
                      { name: "Llama 3.3 Free", id: "meta-llama/llama-3.3-70b-instruct:free" },
                      { name: "DeepSeek V3", id: "deepseek/deepseek-chat" },
                      { name: "GPT-4o Mini", id: "openai/gpt-4o-mini" }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAiModel(m.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                          aiModel === m.id
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Super Fast)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API কী (Secret Key)
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiProvider === "gemini" ? "AIzaSy..." : "sk-or-v1-..."}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              সিস্টেম প্রম্পট ও অ্যাসিস্ট্যান্ট ভূমিকা
            </label>
            <textarea
              rows={4}
              value={aiSystemPrompt}
              onChange={(e) => setAiSystemPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Chatbot Preset FAQs / Quick Questions Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                চ্যাটবটের ডিফল্ট প্রশ্ন ও ইনস্ট্যান্ট উত্তর (Preset FAQs)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                চ্যাট উইজেটের নিচে যে সাজেস্টেড প্রশ্নগুলো থাকে, সেগুলো এখানে এডিট ও কাস্টমাইজ করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              প্রশ্ন যোগ করুন
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {chatbotFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    প্রশ্ন #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    কাস্টমার যা দেখবে (প্রশ্ন):
                  </label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, "question", e.target.value)}
                    placeholder="e.g. কীভাবে ডাউনলোড করব?"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    স্বয়ংক্রিয় উত্তর (ইনস্ট্যান্ট রেসপন্স):
                  </label>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                    placeholder="এই প্রশ্নের জন্য তাৎক্ষণিক উত্তর..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Test Console */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-4 shadow-lg border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm">লাইভ এআই রেসপন্স টেস্ট</h3>
            </div>
            <button
              type="button"
              disabled={testing}
              onClick={handleTestChat}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md disabled:opacity-50 transition-all"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  সংযোগ পরীক্ষা হচ্ছে...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  টেস্ট মেসেজ পাঠান
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
            <div className="text-slate-400">
              User: <span className="text-slate-200">হ্যালো! আপনাদের এখানে কি কি ডিজিটাল টুলস আছে?</span>
            </div>
            {testResult && (
              <div className="text-emerald-400 pt-2 border-t border-slate-800/80 leading-relaxed font-sans text-xs">
                AI Bot: {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                সংরক্ষণ হচ্ছে...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                সমস্ত সেটিংস সংরক্ষণ করুন
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
