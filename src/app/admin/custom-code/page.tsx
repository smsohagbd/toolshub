"use client";

import { useEffect, useState } from "react";
import {
  Code,
  Save,
  Check,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Info
} from "lucide-react";

export default function AdminCustomCodePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [headerCode, setHeaderCode] = useState("");
  const [footerCode, setFooterCode] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [fbAccessToken, setFbAccessToken] = useState("");
  const [fbTestCode, setFbTestCode] = useState("");
  const [fbEnabled, setFbEnabled] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        const s = data.settings || {};
        setHeaderCode(s.header_code || "");
        setFooterCode(s.footer_code || "");
        setFbPixelId(s.facebook_pixel_id || "");
        setFbAccessToken(s.facebook_access_token || "");
        setFbTestCode(s.facebook_test_event_code || "");
        setFbEnabled(Boolean(s.facebook_tracking_enabled));
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header_code: headerCode,
          footer_code: footerCode,
          facebook_pixel_id: fbPixelId,
          facebook_access_token: fbAccessToken,
          facebook_test_event_code: fbTestCode,
          facebook_tracking_enabled: fbEnabled ? 1 : 0
        })
      });

      if (res.ok) {
        setSuccessMsg("হেডার কোড ও ট্র্যাকিং সেটিংস সফলভাবে সেভ হয়েছে!");
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      alert("সংরক্ষণ করতে ব্যর্থ হয়েছে");
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          কাস্টম কোড ও ফেসবুক পিক্সেল (CAPI) ট্র্যাকিং
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ওয়েবসাইটের হেডারে স্ক্রিপ্ট যোগ করুন এবং ফেসবুক কনভার্সন এপিআই (CAPI) কনফিগার করে ১০০% সঠিক সেলস ট্র্যাক করুন।
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Facebook Pixel & CAPI Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                Facebook Pixel & Conversion API (CAPI) সেটিংস
              </h2>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={fbEnabled}
                onChange={(e) => setFbEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>ট্র্যাকিং চালু রাখুন</span>
            </label>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-indigo-600" />
              কেন সাধারণ পিক্সেলের সাথে Conversion API (CAPI) জরুরি?
            </div>
            <p className="leading-relaxed text-[11px] text-indigo-800/80 dark:text-indigo-300">
              ব্রাউজারে থাকা AdBlocker এবং iOS 14+ এর কারণে ৪০% ট্র্যাকিং মিস হয়ে যায়। এই প্ল্যাটফর্মে ব্রাউজার পিক্সেলের সাথে Cloudflare Edge থেকে সরাসরি সার্ভার CAPI পাঠানো হয় (উইথ Deduplication Event ID), যার ফলে আপনার অ্যাডস ম্যানেজার ১০০% নির্ভুল ডেটা ক্লেইম করতে পারে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Facebook Pixel ID
              </label>
              <input
                type="text"
                value={fbPixelId}
                onChange={(e) => setFbPixelId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Test Event Code (Meta Events Manager)
              </label>
              <input
                type="text"
                value={fbTestCode}
                onChange={(e) => setFbTestCode(e.target.value)}
                placeholder="e.g. TEST12345"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-xs text-slate-700 dark:text-slate-300">
              Meta CAPI Access Token (Graph API System User Token)
            </label>
            <input
              type="password"
              value={fbAccessToken}
              onChange={(e) => setFbAccessToken(e.target.value)}
              placeholder="EAA..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
        </div>

        {/* Custom Header Code Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Code className="w-5 h-5 text-indigo-500" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              Header Code Injection (&lt;head&gt;)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Google Tag Manager (GTM), Google Analytics 4, TikTok Pixel বা কাস্টম CSS কোড সরাসরি এখানে দিন।
          </p>
          <textarea
            rows={5}
            value={headerCode}
            onChange={(e) => setHeaderCode(e.target.value)}
            placeholder="<!-- <script async src='https://www.googletagmanager.com/gtag/js?id=G-XXXXX'></script> -->"
            className="w-full p-3.5 text-xs font-mono rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Custom Footer Code Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Code className="w-5 h-5 text-purple-500" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              Footer Code Injection (&lt;body&gt;)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            বডি ট্যাগের শেষে কাস্টম লাইভ চ্যাট উইজেট, Hotjar বা অন্যান্য ট্র্যাকিং স্ক্রিপ্ট।
          </p>
          <textarea
            rows={4}
            value={footerCode}
            onChange={(e) => setFooterCode(e.target.value)}
            placeholder="<!-- Custom JavaScript before closing body -->"
            className="w-full p-3.5 text-xs font-mono rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            সেটিংস সেভ করুন
          </button>
        </div>
      </form>
    </div>
  );
}
