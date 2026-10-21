"use client";

import { useEffect, useState } from "react";
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  Edit3
} from "lucide-react";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [statusInput, setStatusInput] = useState<string>("open");
  const [adminReplyInput, setAdminReplyInput] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicketModal = (t: any) => {
    setSelectedTicket(t);
    setStatusInput(t.status || "open");
    setAdminReplyInput(t.admin_reply || "");
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          status: statusInput,
          admin_reply: adminReplyInput
        })
      });

      if (res.ok) {
        setSelectedTicket(null);
        loadTickets();
      } else {
        alert("টিকিট আপডেট করতে ব্যর্থ হয়েছে");
      }
    } catch (e) {
      alert("টিকিট আপডেট করতে ব্যর্থ হয়েছে");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            কাস্টমার সাপোর্ট টিকিটস
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            লগইনকৃত কাস্টমারদের পাঠানো সাপোর্ট টিকিট পর্যালোচনা ও রিপ্লাই প্রদান করুন।
          </p>
        </div>
        <button
          onClick={loadTickets}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          রিফ্রেশ
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="pb-3">টিকিট #</th>
                  <th className="pb-3">কাস্টমার</th>
                  <th className="pb-3">বিষয়</th>
                  <th className="pb-3">অর্ডার #</th>
                  <th className="pb-3">স্ট্যাটাস</th>
                  <th className="pb-3">রিপ্লাই স্ট্যাটাস</th>
                  <th className="pb-3 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{t.ticket_number}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{t.user_name}</div>
                      <div className="text-[10px] text-slate-400">{t.user_email}</div>
                    </td>
                    <td className="py-3 font-medium max-w-[200px] line-clamp-1">
                      {t.subject}
                    </td>
                    <td className="py-3 font-mono text-slate-500">
                      {t.order_number ? `#${t.order_number}` : "-"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === "resolved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : t.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {t.admin_reply ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          রিপ্লাই দেওয়া হয়েছে
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">উত্তরের অপেক্ষায়</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openTicketModal(t)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] flex items-center gap-1 ml-auto"
                      >
                        <Edit3 className="w-3 h-3" />
                        রিপ্লাই ও স্ট্যাটাস
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-8">কোনো সাপোর্ট টিকিট নেই।</p>
        )}
      </div>

      {/* Ticket Response Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-600" />
                টিকিট #{selectedTicket.ticket_number}
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Customer Inquiry Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">কাস্টমার:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTicket.user_name} ({selectedTicket.user_email})
                </span>
              </div>
              {selectedTicket.order_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">অর্ডার নম্বর:</span>
                  <span className="font-mono font-bold text-indigo-600">
                    #{selectedTicket.order_number}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block mb-1">বিষয়:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTicket.subject}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">গ্রাহকের বার্তা:</span>
                <p className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedTicket.message}
                </p>
              </div>
            </div>

            {/* Status Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                টিকিট স্ট্যাটাস
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusInput("open")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                    statusInput === "open"
                      ? "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  উন্মুক্ত (Open)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusInput("in_progress")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                    statusInput === "in_progress"
                      ? "bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  প্রক্রিয়াধীন
                </button>
                <button
                  type="button"
                  onClick={() => setStatusInput("resolved")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                    statusInput === "resolved"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  সমাধানকৃত (Resolved)
                </button>
              </div>
            </div>

            {/* Admin Reply Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                অ্যাডমিন উত্তর (গ্রাহক তার টিকিট পেজে দেখতে পাবে)
              </label>
              <textarea
                rows={4}
                value={adminReplyInput}
                onChange={(e) => setAdminReplyInput(e.target.value)}
                placeholder="গ্রাহকের সমস্যার সমাধান বা নির্দেশনা এখানে লিখুন..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleUpdateTicket}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                রিপ্লাই ও স্ট্যাটাস সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
