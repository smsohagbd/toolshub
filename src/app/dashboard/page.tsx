"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Key,
  Check,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  BookOpen,
  LogOut,
  User,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CalendarClock,
  MessageSquare,
  Send,
  Loader2
} from "lucide-react";

function OrderChatSection({ orderNumber, customerName }: { orderNumber: string; customerName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/messages?order_number=${encodeURIComponent(orderNumber)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, orderNumber]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/orders/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber,
          sender_role: "customer",
          sender_name: customerName,
          message: newMessage.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>অর্ডার মেসেজ ও সহায়তা {messages.length > 0 ? `(${messages.length})` : ""}</span>
        </span>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
          {isOpen ? "বন্ধ করুন ▲" : "মেসেজ লিখুন / চ্যাট ▼"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/40">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              💬 সমস্যা বা প্রশ্নের সমাধান চ্যাট
            </span>
            <button
              type="button"
              onClick={fetchMessages}
              disabled={loading}
              title="মেসেজ রিফ্রেশ করুন"
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Messages list */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
            {loading && messages.length === 0 ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1 text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>মেসেজ লোড হচ্ছে...</span>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 p-2">
                অর্ডার সংক্রান্ত কোনো সমস্যা বা তথ্য জানার থাকলে নিচে লিখে মেসেজ পাঠান। অ্যাডমিন সরাসরি উত্তর দিবে।
              </p>
            ) : (
              messages.map((m: any, idx: number) => {
                const isAdmin = m.sender_role === "admin";
                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-400">
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        {isAdmin ? "🛡️ " + (m.sender_name || "অ্যাডমিন সাপোর্ট") : "👤 আপনি"}
                      </span>
                      {m.created_at && (
                        <span>• {new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                    <div
                      className={`p-2.5 rounded-2xl text-[11px] leading-relaxed max-w-[90%] shadow-sm ${
                        isAdmin
                          ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                          : "bg-indigo-600 text-white rounded-tr-sm"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input box */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="আপনার বার্তা বা সমস্যা লিখুন..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center shadow-sm"
              title="মেসেজ পাঠান"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
import { UserPurchase } from "@/lib/types";

export default function UserDashboardPage() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Verify User Session
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.authenticated || !meData.user) {
        window.location.href = "/login";
        return;
      }
      setUser(meData.user);

      // 2. Fetch User Purchases and Subscriptions in Parallel
      const [pRes, subRes] = await Promise.all([
        fetch("/api/user/purchases"),
        fetch("/api/user/subscriptions")
      ]);

      const pData = await pRes.json();
      if (pRes.ok && pData.purchases) {
        setPurchases(pData.purchases);
      }

      const subData = await subRes.json();
      if (subRes.ok && subData.subscriptions) {
        setSubscriptions(subData.subscriptions);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const copyLicense = (key?: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          আপনার ড্যাশবোর্ড ও কোর্স লোড হচ্ছে...
        </p>
      </div>
    );
  }

  const approvedCount = purchases.filter((p) => p.payment_status === "approved").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* 1. Header Profile Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/80 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white shadow-lg border border-indigo-100/80 dark:border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white shadow-lg text-2xl font-extrabold uppercase">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  স্বাগতম, {user?.name}!
                </h1>
                <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                  সদস্য
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              title="রিফ্রেশ করুন"
              className="p-2.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-600/20 dark:hover:bg-red-600/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-xs font-bold transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              লগআউট
            </button>
          </div>
        </div>

        {/* Quick Stats Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">মোট ক্রয়কৃত আইটেম</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">{purchases.length} টি</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">সক্রিয় ও অনুমোদিত</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{approvedCount} টি</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">অনলাইন এক্সেস</span>
            <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">লাইফটাইম</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">সহায়তা ডেস্ক</span>
            <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-0.5 block">২৪/৭ এক্টিভ</span>
          </div>
        </div>
      </div>

      {/* 2. My Active Subscriptions Section */}
      {subscriptions.length > 0 && (
        <div className="space-y-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-200/80 dark:border-indigo-800/60 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <CalendarClock className="w-4 h-4" />
                আমার সক্রিয় সাবস্ক্রিপশনসমূহ
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                মেয়াদভিত্তিক প্রোডাক্ট ও সার্ভিস
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
              {subscriptions.length} টি প্ল্যান
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {subscriptions.map((sub: any) => {
              const isExp = sub.status === "expired" || sub.days_remaining <= 0;
              return (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {sub.product_title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                        sub.status === "active"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {sub.status === "active" ? "সক্রিয়" : "মেয়াদ শেষ"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 font-mono">
                    <div className="flex justify-between">
                      <span>প্ল্যান সাইকেল:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {sub.billing_cycle === "1_month" ? "১ মাস (Monthly)" : sub.billing_cycle === "1_year" ? "১ বছর (Yearly)" : sub.billing_cycle}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>মেয়াদ শেষ হবে:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {new Date(sub.expiry_date).toLocaleDateString("bn-BD")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {isExp ? "মেয়াদ শেষ" : `${sub.days_remaining} দিন বাকি`}
                    </span>
                    <Link
                      href={`/tools/${sub.product_id ? sub.product_id : ""}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <span>এক্সেস করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Purchased Items & Courses Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
              আপনার ডিজিটাল লাইব্রেরি
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              আমার কোর্স ও সফটওয়্যারসমূহ
            </h2>
          </div>

          <Link
            href="/#tools"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            নতুন কোর্স বা টুলস কিনুন
          </Link>
        </div>

        {/* If user has no orders yet */}
        {purchases.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-md">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                এখনও কোনো কোর্স বা টুলস যুক্ত হয়নি
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                আমাদের প্রিমিয়াম সোশ্যাল অটোমেশন, এসইও টুলস ও মাস্টারক্লাস কোর্সগুলো দেখে নিতে পারেন।
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/#tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all"
              >
                টুলস ও কোর্স এক্সপ্লোর করুন
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((item) => {
              const isApproved = item.payment_status === "approved";
              const isCourseOrExternal = item.product_type === "link" || Boolean(item.external_access_url);

              return (
                <div
                  key={item.order_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Card Header Media */}
                  <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={
                        item.thumbnail_url ||
                        "/placeholder.svg"
                      }
                      alt={item.product_title}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md">
                          <CheckCircle2 className="w-3 h-3" />
                          সক্রিয় (Active)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-md">
                          <Clock className="w-3 h-3" />
                          যাচাই প্রক্রিয়াধীন
                        </span>
                      )}
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-lg">
                      {isCourseOrExternal ? "কোর্স / ওয়েব এক্সেস" : "ডিজিটাল সফটওয়্যার"}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                        <span>অর্ডার: #{item.order_number}</span>
                        <span>{new Date(item.purchase_date).toLocaleDateString("bn-BD")}</span>
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2">
                        {item.product_title}
                      </h3>

                      {item.file_size && (
                        <span className="inline-block text-[11px] text-slate-500">
                          সাইজ: {item.file_size}
                        </span>
                      )}
                    </div>

                    {/* License Key Box if delivered */}
                    {item.delivered_license_key && (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Key className="w-3 h-3 text-indigo-500" />
                          আপনার লাইসেন্স কী:
                        </span>
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <span className="truncate pr-2">{item.delivered_license_key}</span>
                          <button
                            onClick={() => copyLicense(item.delivered_license_key)}
                            title="কপি করুন"
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0"
                          >
                            {copiedKey === item.delivered_license_key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin Notes Notice if present */}
                    {item.admin_notes && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                        <span className="font-bold flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          অ্যাডমিন মেসেজ / নোট:
                        </span>
                        <p className="whitespace-pre-line leading-relaxed text-[11px]">{item.admin_notes}</p>
                      </div>
                    )}

                    {/* Interactive 2-Way Order Messaging */}
                    <OrderChatSection
                      orderNumber={item.order_number}
                      customerName={user?.name || "গ্রাহক"}
                    />

                    {/* Action Buttons: DOWNLOAD or 3RD-PARTY ACCESS */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      {isApproved ? (
                        <>
                          {/* If 3rd-Party Website Course Access: Show prominent ACCESS button ONLY */}
                          {isCourseOrExternal ? (
                            <a
                              href={item.external_access_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>কোর্স অ্যাক্সেস করুন (Access Now)</span>
                            </a>
                          ) : item.download_token ? (
                            /* If Downloadable File: Show DOWNLOAD button ONLY */
                            <a
                              href={`/download/${item.download_token}`}
                              download
                              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <Download className="w-4 h-4" />
                              <span>সরাসরি ফাইল ডাউনলোড করুন</span>
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>আপনার পেমেন্ট যাচাই করা হচ্ছে। অনুমোদিত হলেই বাটন চালু হবে।</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
