"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  Check,
  Loader2,
  Link as LinkIcon
} from "lucide-react";
import { NavItem } from "@/lib/types";

export default function AdminHeaderFooterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [siteTitle, setSiteTitle] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Footer fields
  const [copyright, setCopyright] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [facebookLink, setFacebookLink] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        const s = data.settings || {};
        setSiteTitle(s.site_title || "");
        setSiteTagline(s.site_tagline || "");
        setLogoUrl(s.logo_url || "");

        try {
          if (s.header_nav_json) {
            const parsed = JSON.parse(s.header_nav_json);
            if (Array.isArray(parsed)) {
              setNavItems(
                parsed.map((item: any) => ({
                  ...item,
                  url:
                    item.url === "/#contact" ||
                    item.url === "#contact" ||
                    item.url === "/#contack" ||
                    item.url === "#contack"
                      ? "/contact"
                      : item.url
                }))
              );
            }
          }
        } catch (e) {}

        try {
          if (s.footer_nav_json) {
            const f = JSON.parse(s.footer_nav_json);
            setCopyright(f.copyright || "");
            setSupportEmail(f.support_email || "");
            setSupportPhone(f.support_phone || "");
            setTelegramLink(f.telegram_link || "");
            setFacebookLink(f.facebook_link || "");
          }
        } catch (e) {}
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const addNavItem = () => {
    setNavItems([...navItems, { label: "নতুন মেনু", url: "/#link" }]);
  };

  const removeNavItem = (idx: number) => {
    setNavItems(navItems.filter((_, i) => i !== idx));
  };

  const updateNavItem = (idx: number, field: "label" | "url", val: string) => {
    const updated = [...navItems];
    updated[idx][field] = val;
    setNavItems(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    const footerConfig = {
      copyright,
      support_email: supportEmail,
      support_phone: supportPhone,
      telegram_link: telegramLink,
      facebook_link: facebookLink
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_title: siteTitle,
          site_tagline: siteTagline,
          logo_url: logoUrl,
          header_nav_json: navItems,
          footer_nav_json: footerConfig
        })
      });

      if (res.ok) {
        setSuccessMsg("হেডার ও ফুটার কনফিগারেশন সংরক্ষিত হয়েছে!");
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
          হেডার ও ফুটার বিল্ডার
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          সাইটের নেভিগেশন মেনু আইটেম, ব্র্যান্ডিং ও ফুটার টেক্সট ডাইনামিকালি পরিচালনা করুন।
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding Info */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            ব্র্যান্ডিং ও সাইট টাইটেল
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                সাইটের নাম (Site Title)
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                লোগো ইমেজ URL (ঐচ্ছিক)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
              সাইট ট্যাগলাইন (Hero Title Subtitle)
            </label>
            <input
              type="text"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Dynamic Header Navigation Links */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              হেডার নেভিগেশন মেনু আইটেম
            </h2>
            <button
              type="button"
              onClick={addNavItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              মেনু লিংক যোগ করুন
            </button>
          </div>

          <div className="space-y-3">
            {navItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">মেনু লেবেল:</span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateNavItem(idx, "label", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">URL / Link:</span>
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => updateNavItem(idx, "url", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeNavItem(idx)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors self-end"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Details */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            ফুটার সেটিংস ও কন্ট্যাক্ট তথ্য
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                সাপোর্ট ইমেইল
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                সাপোর্ট ফোন নম্বর
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Telegram চ্যানেল / সাপোর্ট লিংক
              </label>
              <input
                type="url"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                placeholder="https://t.me/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Facebook পেজ লিংক
              </label>
              <input
                type="url"
                value={facebookLink}
                onChange={(e) => setFacebookLink(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
              কপিরাইট টেক্সট
            </label>
            <input
              type="text"
              value={copyright}
              onChange={(e) => setCopyright(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

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
