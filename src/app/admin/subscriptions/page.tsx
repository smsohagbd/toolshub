"use client";

import { useState, useEffect } from "react";
import {
  CalendarClock,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  RefreshCw,
  Loader2,
  Trash2,
  ShieldCheck,
  User,
  Package
} from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (e) {
      console.error("Failed to load subscriptions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleExtend = async (id: string, days = 30) => {
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "extend", extend_days: days })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: data.message });
        await fetchSubscriptions();
      } else {
        setMessage({ type: "error", text: data.error || "মেয়াদ বাড়ানো সম্ভব হয়নি" });
      }
    } catch {
      setMessage({ type: "error", text: "সার্ভারে সমস্যা হয়েছে" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই সাবস্ক্রিপশনটি বাতিল করতে চান?")) return;
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "সাবস্ক্রিপশন বাতিল করা হয়েছে" });
        await fetchSubscriptions();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "সার্ভারে সমস্যা হয়েছে" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই রেকর্ডটি ডিলিট করতে চান?")) return;
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "সাবস্ক্রিপশন ডিলিট করা হয়েছে" });
        setSubscriptions(subscriptions.filter((s) => s.id !== id));
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "সার্ভারে সমস্যা হয়েছে" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (s.user_name || "").toLowerCase().includes(q) ||
      (s.user_email || "").toLowerCase().includes(q) ||
      (s.product_title || "").toLowerCase().includes(q);

    if (filterStatus === "all") return matchSearch;
    return matchSearch && s.status === filterStatus;
  });

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const expiredCount = subscriptions.filter((s) => s.status === "expired").length;
  const expiringSoonCount = subscriptions.filter(
    (s) => s.status === "active" && s.days_remaining <= 7 && s.days_remaining > 0
  ).length;

  const [cronLoading, setCronLoading] = useState(false);

  const handleTriggerCron = async () => {
    setCronLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscriptions/trigger-cron", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: data.message || `ক্রন সফলভাবে সম্পন্ন হয়েছে! ${data.notifications_sent || 0} টি ইমেইল রিমাইন্ডার পাঠানো হয়েছে।`
        });
        await fetchSubscriptions();
      } else {
        setMessage({ type: "error", text: data.error || "ক্রন চালাতে সমস্যা হয়েছে।" });
      }
    } catch {
      setMessage({ type: "error", text: "সার্ভারে সংযোগ ব্যর্থ হয়েছে।" });
    } finally {
      setCronLoading(false);
    }
  };

  const getCycleBadge = (cycle: string) => {
    switch (cycle) {
      case "1_month":
        return "১ মাস (Monthly)";
      case "2_months":
        return "২ মাস (2 Months)";
      case "3_months":
        return "৩ মাস (Quarterly)";
      case "6_months":
        return "৬ মাস (Half-Yearly)";
      case "1_year":
        return "১ বছর (Yearly)";
      default:
        return cycle || "মেয়াদভিত্তিক";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-indigo-600" />
            <span>সাবস্ক্রিপশন ম্যানেজমেন্ট</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            মাসিক, ২-৩ মাস ও বাৎসরিক প্রোডাক্ট নেওয়া গ্রাহকদের তালিকা ও লাইভ মেয়াদ ট্র্যাকিং
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerCron}
            disabled={cronLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            title="প্রতিদিনের মতো আজ সাবস্ক্রিপশন রিমাইন্ডার ও মেয়াদোত্তীর্ণ ইমেইল পাঠান"
          >
            {cronLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>⚡</span>}
            <span>{cronLoading ? "ক্রন চলছে..." : "রিমাইন্ডার ক্রন রান করুন"}</span>
          </button>

          <button
            onClick={fetchSubscriptions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">সক্রিয় সাবস্ক্রিপশন</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeCount} টি
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">৭ দিনের মধ্যে মেয়াদ শেষ</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {expiringSoonCount} টি
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">মেয়াদোত্তীর্ণ (Expired)</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {expiredCount} টি
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "সকল সাবস্ক্রিপশন", count: subscriptions.length },
            { id: "active", label: "সক্রিয়", count: activeCount },
            { id: "expired", label: "মেয়াদোত্তীর্ণ", count: expiredCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                filterStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইউজার বা প্রোডাক্ট সার্চ..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs">সাবস্ক্রিপশন তথ্য লোড হচ্ছে...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">কোনো সাবস্ক্রিপশন রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500 mt-1">
              গ্রাহক সাবস্ক্রিপশন প্রোডাক্ট অর্ডার করলে এবং অর্ডার অ্যাপ্রুভ হলে এখানে স্বয়ংক্রিয়ভাবে তালিকা তৈরি হবে।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">গ্রাহকের নাম ও ইমেইল</th>
                  <th className="py-3.5 px-4">প্রোডাক্ট ও প্ল্যান</th>
                  <th className="py-3.5 px-4">শুরু ও সমাপ্তির তারিখ</th>
                  <th className="py-3.5 px-4">অবশিষ্ট দিন</th>
                  <th className="py-3.5 px-4">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((s) => {
                  const days = s.days_remaining;
                  const isExp = s.status === "expired" || days <= 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.user_name ? s.user_name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {s.user_name || "গ্রাহক"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {s.user_email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {s.product_title}
                        </span>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {getCycleBadge(s.billing_cycle)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        <div>শুরু: {new Date(s.start_date).toLocaleDateString("bn-BD")}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          মেয়াদ: {new Date(s.expiry_date).toLocaleDateString("bn-BD")}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isExp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300">
                            <XCircle className="w-3 h-3" />
                            মেয়াদ শেষ
                          </span>
                        ) : days <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 animate-pulse">
                            <Clock className="w-3 h-3" />
                            {days} দিন বাকি
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            {days} দিন বাকি
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            s.status === "active"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : s.status === "cancelled"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {s.status === "active" ? "সক্রিয়" : s.status === "cancelled" ? "বাতিল" : "মেয়াদোত্তীর্ণ"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleExtend(s.id, 30)}
                            disabled={actionLoading === s.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[10px] transition-colors"
                            title="মেয়াদ আরও ৩০ দিন বৃদ্ধি করুন"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>+৩০ দিন</span>
                          </button>

                          {s.status === "active" && (
                            <button
                              onClick={() => handleCancel(s.id)}
                              disabled={actionLoading === s.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="সাবস্ক্রিপশন বাতিল করুন"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={actionLoading === s.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
