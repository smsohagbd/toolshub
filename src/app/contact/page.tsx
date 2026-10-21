"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  LifeBuoy,
  ShieldCheck,
  LogIn,
  Ticket
} from "lucide-react";

export default function ContactPage() {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Settings state (WhatsApp, Telegram, etc.)
  const [settings, setSettings] = useState<any>({
    whatsapp_number: "+8801700000000",
    telegram_channel: "toolshubbd",
    support_phone: "+880 1700-000000",
    support_email: "support@sohag.com.bd"
  });

  // Ticket Form State
  const [subject, setSubject] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState("");
  const [ticketError, setTicketError] = useState("");

  // User's tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // 1. Check Auth
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        if (authData.authenticated && authData.user) {
          setUser(authData.user);
          loadUserTickets();
        }
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setAuthLoading(false);
      }

      // 2. Load Settings for WhatsApp / Telegram
      try {
        const sRes = await fetch("/api/admin/settings");
        const sData = await sRes.json();
        if (sData.settings) {
          setSettings(sData.settings);
        }
      } catch (e) {
        console.error("Settings load error:", e);
      }
    }
    init();
  }, []);

  const loadUserTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (res.ok && data.tickets) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error("Load tickets error:", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError("");
    setTicketSuccess("");

    if (!subject || !message) {
      setTicketError("অনুগ্রহ করে বিষয় এবং বার্তা উভয়ই লিখুন।");
      return;
    }

    setTicketSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          order_number: orderNumber,
          message
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTicketSuccess(`আপনার টিকিট #${data.ticket_number} সফলভাবে জমা দেওয়া হয়েছে!`);
        setSubject("");
        setOrderNumber("");
        setMessage("");
        loadUserTickets();
      } else {
        setTicketError(data.error || "টিকিট জমা দিতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setTicketError("সার্ভার ত্রুটি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Clean WhatsApp number for wa.me link
  const rawWa = (settings.whatsapp_number || "8801700000000").replace(/[^0-9]/g, "");
  const waUrl = `https://wa.me/${rawWa.startsWith("88") ? rawWa : "88" + rawWa}`;
  const tgHandle = (settings.telegram_channel || "toolshubbd").replace("@", "");
  const tgUrl = `https://t.me/${tgHandle}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Page Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          <LifeBuoy className="w-3.5 h-3.5" />
          ২৪/৭ কাস্টমার সাপোর্ট
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          যোগাযোগ ও হেল্প ডেস্ক
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          যেকোনো প্রোডাক্ট সম্পর্কিত জিজ্ঞাসা, পেমেন্ট ভেরিফিকেশন বা টেকনিক্যাল সমস্যার তাৎক্ষণিক সমাধানের জন্য আমাদের সাথে যোগাযোগ করুন।
        </p>
      </div>

      {authLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : user ? (
        /* ============================================================== */
        /* LOGGED-IN CUSTOMER: TICKET SYSTEM + PREVIOUS TICKETS HISTORY   */
        /* ============================================================== */
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create Ticket Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      নতুন সাপোর্ট টিকিট খুলুন
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                    লগইন ইউজার: {user.name}
                  </span>
                </div>

                {ticketSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{ticketSuccess}</span>
                  </div>
                )}

                {ticketError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ticketError}</span>
                  </div>
                )}

                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      টিকিটের বিষয় *
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. ডাউনলোড লিংক কাজ করছে না / লাইসেন্স কী সমস্যা"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      অর্ডার নম্বর (যদি নির্দিষ্ট কোনো অর্ডার সংক্রান্ত হয়)
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="ORD-XXXXX (ঐচ্ছিক)"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      সমস্যার বিস্তারিত বিবরণ *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="আপনার সমস্যাটি বিস্তারিত লিখুন যাতে অ্যাডমিন টিম দ্রুত সমাধান দিতে পারে..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {ticketSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        টিকিট জমা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        টিকিট সাবমিট করুন
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Quick Contact & Info Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  জরুরী সরাসরি যোগাযোগ
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  যদি আপনার সমস্যার তাৎক্ষণিক সমাধান প্রয়োজন হয়, সরাসরি আমাদের অফিশিয়াল চ্যানেলে যুক্ত হতে পারেন:
                </p>

                <div className="space-y-3 pt-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                        WA
                      </div>
                      <div>
                        <div className="text-xs font-bold">WhatsApp চ্যাট</div>
                        <div className="text-[11px] font-mono">{settings.whatsapp_number || "+8801700000000"}</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                        TG
                      </div>
                      <div>
                        <div className="text-xs font-bold">টেলিগ্রাম চ্যানেল</div>
                        <div className="text-[11px] font-mono">@{tgHandle}</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* User's Previous Tickets List */}
          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              আপনার পূর্ববর্তী সাপোর্ট টিকিটসমূহ ({tickets.length})
            </h3>

            {loadingTickets ? (
              <div className="py-8 text-center text-xs text-slate-500">টিকিট লোড হচ্ছে...</div>
            ) : tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          #{t.ticket_number}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {t.subject}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.order_number && (
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            অর্ডার: #{t.order_number}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : t.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {t.status === "resolved"
                            ? "সমাধানকৃত"
                            : t.status === "in_progress"
                            ? "প্রক্রিয়াকরণ চলছে"
                            : "উন্মুক্ত (Open)"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {t.message}
                    </p>

                    {/* Admin Reply if present */}
                    {t.admin_reply && (
                      <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs space-y-1">
                        <div className="font-bold text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          অ্যাডমিন টিম থেকে উত্তর:
                        </div>
                        <p className="whitespace-pre-line pl-5 text-slate-700 dark:text-slate-300">
                          {t.admin_reply}
                        </p>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      তারিখ: {new Date(t.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                আপনার কোনো পূর্ববর্তী সাপোর্ট টিকিট নেই।
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* GUEST / NORMAL USER: WHATSAPP + TELEGRAM DIRECT CARDS          */
        /* ============================================================== */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/20">
                  WA
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    হোয়াটসঅ্যাপ সাপোর্ট
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    যেকোনো প্রোডাক্টের লাইভ ডেমো, অর্ডার তথ্য বা দ্রুত সহায়তার জন্য সরাসরি WhatsApp-এ বার্তা পাঠান।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                  {settings.whatsapp_number || "+880 1700-000000"}
                </div>
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>সরাসরি WhatsApp-এ চ্যাট করুন</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Telegram Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-sky-500/20">
                  TG
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    টেলিগ্রাম সাপোর্ট ও চ্যানেল
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    আমাদের টেলিগ্রাম চ্যানেলে যুক্ত হয়ে নতুন সব টুলসের আপডেট, অফার এবং সাপোর্ট এজেন্টের সাথে কথা বলুন।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                  @{tgHandle}
                </div>
              </div>

              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>টেলিগ্রামে মেসেজ দিন</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Prompt card for existing customers to login for ticket support */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-600" />
                ইতিমধ্যে ক্রয় করেছেন? টিকিট সাপোর্ট পান
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                লগইন করা গ্রাহকরা সরাসরি আমাদের টিকিট সিস্টেমের মাধ্যমে দ্রুত সমাধান ও হিস্টোরি ট্র্যাকিং সুবিধা পান।
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all shrink-0 hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              লগইন করে টিকিট খুলুন
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
