"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Server,
  Lock,
  User,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle
} from "lucide-react";

export default function AdminEmailSettingsPage() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromName, setFromName] = useState("ToolsHub BD");
  const [fromEmail, setFromEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings/email");
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSmtpHost(s.smtp_host || "");
        setSmtpPort(String(s.smtp_port || "587"));
        setSmtpSecure(Boolean(s.smtp_secure));
        setSmtpUser(s.smtp_user || "");
        setSmtpPass(s.smtp_pass || "");
        setFromName(s.email_from_name || "ToolsHub BD");
        setFromEmail(s.email_from_address || "");
        setNotificationsEnabled(s.email_notifications_enabled !== 0);
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort,
          smtp_secure: smtpSecure,
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass,
          email_from_name: fromName.trim(),
          email_from_address: fromEmail.trim(),
          email_notifications_enabled: notificationsEnabled
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(data.error || "সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    } catch {
      setErrorMessage("সার্ভারে সমস্যা হয়েছে।");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      alert("দয়া করে টেস্ট ইমেইল এড্রেস লিখুন।");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_test: true,
          test_recipient: testEmailRecipient.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort,
          smtp_secure: smtpSecure,
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass,
          email_from_name: fromName.trim(),
          email_from_address: fromEmail.trim()
        })
      });

      const data = await res.json();
      setTestResult(data);
      // Refresh logs
      fetchSettings();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "টেস্ট ইমেইল প্রেরণে ত্রুটি ঘটেছে।" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Mail className="w-6 h-6 text-indigo-600" />
          <span>ইমেইল ও SMTP সেটিংস</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          কাস্টমার সাইনআপ, নতুন অর্ডার, অর্ডার অনুমোদন ও অ্যাডমিন নোটের স্বয়ংক্রিয় ইমেইল পাঠানোর SMTP সার্ভার কনফিগারেশন
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>ইমেইল ও SMTP সেটিংস সফলভাবে সংরক্ষিত হয়েছে!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Sender Profile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <span>১. প্রেরকের তথ্য (Sender Information)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রেরকের নাম (From Name) *
              </label>
              <input
                type="text"
                required
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="e.g. ToolsHub BD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                গ্রাহক যে নামে ইমেইল রিসিভ করবে (যেমন: ToolsHub BD)
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রেরকের ইমেইল এড্রেস (From Email) *
              </label>
              <input
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="e.g. support@toolshub.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                যে ইমেইল থেকে নোটিফিকেশন পাঠানো হবে
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: SMTP Server Credentials */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>২. কাস্টম SMTP সার্ভার সেটিংস</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Host Server *
              </label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="e.g. smtp.hostinger.com, smtp.gmail.com, mail.domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Port *
              </label>
              <input
                type="text"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587 or 465"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Username / Email *
              </label>
              <input
                type="text"
                required
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="e.g. support@domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Password / App Password *
              </label>
              <input
                type="password"
                required
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Encryption & Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>SSL / TLS Encryption সক্রিয় করুন (Port 465 এর জন্য)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>অটোমেটিক ইমেইল নোটিফিকেশন অন রাখুন</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SMTP সেটিংস সেভ করুন</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Section 3: Live Test Email Sender */}
      <div className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>৩. টেস্ট ইমেইল ভেরিফিকেশন</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            আপনার কনফিগার করা SMTP সার্ভার সঠিকভাবে কাজ করছে কিনা দেখতে একটি টেস্ট ইমেইল পাঠান।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            placeholder="আপনার পার্সোনাল ইমেইল এড্রেস লিখুন..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={isTesting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 shrink-0"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>পাঠানো হচ্ছে...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>টেস্ট ইমেইল পাঠান</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
              testResult.success
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Section 4: Email Logs History */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>সাম্প্রতিক ইমেইল অ্যাক্টিভিটি লগ (সর্বশেষ ২০টি)</span>
          </h3>
          <button
            onClick={fetchSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="লগ রিফ্রেশ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            এখনও কোনো ইমেইল পাঠানো হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">প্রাপক</th>
                  <th className="py-2.5 px-3">বিষয় (Subject)</th>
                  <th className="py-2.5 px-3">ইভেন্ট</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3">তারিখ ও সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-bold">{log.recipient}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">{log.subject}</td>
                    <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">{log.event_type}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "sent"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : log.status === "skipped"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                      {new Date(log.created_at).toLocaleString("bn-BD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
