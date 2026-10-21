"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Copy,
  Check,
  Loader2,
  Send,
  ExternalLink,
  MessageSquare,
  Edit3,
  AlertCircle
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [statusInput, setStatusInput] = useState<"pending" | "approved" | "rejected">("pending");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  // 2-Way Order Messages State
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [adminReplyInput, setAdminReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderMessages = async (orderNum: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/orders/messages?order_number=${encodeURIComponent(orderNum)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setOrderMessages(data.messages);
      } else {
        setOrderMessages([]);
      }
    } catch (err) {
      console.error("Load order messages error:", err);
      setOrderMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openOrderModal = (ord: any) => {
    setSelectedOrder(ord);
    setLicenseKeyInput(ord.delivered_license_key || "");
    setAdminNotesInput(ord.admin_notes || "");
    setStatusInput(ord.payment_status || "pending");
    setAdminReplyInput("");
    loadOrderMessages(ord.order_number || ord.id);
  };

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOrder || !adminReplyInput.trim() || sendingReply) return;

    setSendingReply(true);
    const replyText = adminReplyInput.trim();
    try {
      const res = await fetch("/api/orders/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_number: selectedOrder.order_number,
          sender_role: "admin",
          sender_name: "অ্যাডমিন সাপোর্ট",
          message: replyText
        })
      });

      const data = await res.json();
      if (data.success && data.message) {
        setOrderMessages((prev) => [...prev, data.message]);
        setAdminNotesInput(replyText);
        setAdminReplyInput("");
      } else {
        alert("মেসেজ পাঠাতে ত্রুটি হয়েছে");
      }
    } catch (err) {
      alert("মেসেজ পাঠাতে ত্রুটি হয়েছে");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          payment_status: statusInput,
          admin_notes: adminNotesInput,
          delivered_license_key: licenseKeyInput || null
        })
      });

      if (res.ok) {
        setSelectedOrder(null);
        setLicenseKeyInput("");
        setAdminNotesInput("");
        loadOrders();
      } else {
        alert("স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে");
      }
    } catch (err) {
      alert("স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrx(id);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          অর্ডার ও পেমেন্ট ভেরিফিকেশন
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          গ্রাহকের পাঠানো TrxID যাচাই করুন, অনুমোদন দিন অথবা যেকোনো সমস্যা হলে অর্ডার নোট লিখে গ্রাহককে অবগত করুন।
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="pb-3">অর্ডার #</th>
                  <th className="pb-3">গ্রাহক</th>
                  <th className="pb-3">প্রোডাক্ট</th>
                  <th className="pb-3">টাকা</th>
                  <th className="pb-3">মেথড</th>
                  <th className="pb-3">TrxID / প্রেরক</th>
                  <th className="pb-3">স্ট্যাটাস</th>
                  <th className="pb-3">অ্যাডমিন নোট</th>
                  <th className="pb-3 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{ord.order_number}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {ord.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{ord.customer_email}</div>
                      {ord.customer_phone && (
                        <div className="text-[10px] text-slate-400">{ord.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3 font-medium max-w-[160px] line-clamp-1">
                      {ord.product_title}
                    </td>
                    <td className="py-3">
                      <div className="font-bold">৳{ord.amount}</div>
                      {ord.coupon_code && (
                        <div className="text-[10px] text-pink-600 dark:text-pink-400 font-semibold flex items-center gap-1 mt-0.5">
                          <span>🎟 {ord.coupon_code}</span>
                          {ord.discount_amount > 0 && <span>(-৳{ord.discount_amount})</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-slate-100 dark:bg-slate-800">
                        {ord.payment_method}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white">
                        <span>{ord.transaction_id}</span>
                        <button
                          onClick={() => copyToClipboard(ord.transaction_id, ord.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy"
                        >
                          {copiedTrx === ord.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {ord.sender_number && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Sender: {ord.sender_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.payment_status === "approved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : ord.payment_status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-3 max-w-[150px]">
                      {ord.admin_notes ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate block">
                          {ord.admin_notes}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openOrderModal(ord)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] shadow-sm flex items-center gap-1 ml-auto"
                      >
                        <Edit3 className="w-3 h-3" />
                        ম্যানেজ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-8">কোনো অর্ডার পাওয়া যায়নি।</p>
        )}
      </div>

      {/* Order Management Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                অর্ডার #{selectedOrder.order_number} ম্যানেজমেন্ট
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Order Details Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">গ্রাহক:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ইমেইল:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedOrder.customer_email}</span>
              </div>
              {selectedOrder.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ফোন:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedOrder.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">টুলস:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.product_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মূল্য:</span>
                <span className="font-bold text-emerald-600">৳{selectedOrder.amount}</span>
              </div>
              {selectedOrder.coupon_code && (
                <div className="flex justify-between text-pink-600 dark:text-pink-400">
                  <span>ব্যবহৃত প্রমো কোড:</span>
                  <span className="font-mono font-bold">
                    {selectedOrder.coupon_code} (-৳{selectedOrder.discount_amount || 0})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">পেমেন্ট মেথড:</span>
                <span className="font-mono font-bold uppercase">{selectedOrder.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TrxID:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedOrder.transaction_id}
                </span>
              </div>
              {selectedOrder.sender_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">প্রেরক নম্বর:</span>
                  <span className="font-mono">{selectedOrder.sender_number}</span>
                </div>
              )}
            </div>

            {/* Status Change Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                অর্ডার স্ট্যাটাস
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusInput("pending")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    statusInput === "pending"
                      ? "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  পেন্ডিং (Pending)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusInput("approved")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    statusInput === "approved"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  অ্যাপ্রুভ (Approved)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusInput("rejected")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    statusInput === "rejected"
                      ? "bg-red-100 text-red-800 border-red-400 dark:bg-red-950 dark:text-red-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  বাতিল (Rejected)
                </button>
              </div>
            </div>

            {/* Admin Notes Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  অ্যাডমিন নোট / কাস্টমার বার্তা (Admin Notes)
                </label>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  কাস্টমার দেখতে পাবে
                </span>
              </div>
              <textarea
                rows={3}
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder="যেকোনো বার্তা লিখুন, যেমন: আপনার TrxID খুঁজে পাওয়া যায়নি, অনুগ্রহ করে সঠিক TrxID দিয়ে হোয়াটসঅ্যাপে যোগাযোগ করুন..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 block">
                এই নোটটি কাস্টমার তার ট্র্যাকিং পেজ ও ইউজার ড্যাশবোর্ডে দেখতে পাবে।
              </span>
            </div>

            {/* Software License Key (Optional) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                সফটওয়্যার লাইসেন্স কী (ঐচ্ছিক - License Key)
              </label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="e.g. FB-SCRAPER-XXXX-XXXX"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            {/* 2-Way Order Messages Thread */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>গ্রাহক সহায়তা ও মেসেজ থ্রেড ({orderMessages.length})</span>
                </label>
                <button
                  type="button"
                  onClick={() => loadOrderMessages(selectedOrder.order_number || selectedOrder.id)}
                  disabled={messagesLoading}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {messagesLoading ? "লোড হচ্ছে..." : "রিফ্রেশ"}
                </button>
              </div>

              {/* Chat messages */}
              <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                {messagesLoading && orderMessages.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>মেসেজ লোড হচ্ছে...</span>
                  </div>
                ) : orderMessages.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">
                    এই অর্ডারে এখনও কোনো মেসেজ নেই। নিচে লিখে সরাসরি কাস্টমারকে উত্তর দিন।
                  </p>
                ) : (
                  orderMessages.map((m: any, idx: number) => {
                    const isAdmin = m.sender_role === "admin";
                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {isAdmin ? "🛡️ আপনি (Admin)" : "👤 " + (m.sender_name || "গ্রাহক")}
                          </span>
                          {m.created_at && (
                            <span>• {new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                        <div
                          className={`p-2.5 rounded-2xl text-[11px] leading-relaxed max-w-[88%] shadow-sm ${
                            isAdmin
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Form */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={adminReplyInput}
                  onChange={(e) => setAdminReplyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAdminReply();
                    }
                  }}
                  placeholder="গ্রাহকের উদ্দেশে সরাসরি রিপ্লাই লিখুন (Enter চাপুন)..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={sendingReply || !adminReplyInput.trim()}
                  onClick={() => handleSendAdminReply()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-sm shrink-0"
                >
                  {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>রিপ্লাই</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveOrder}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                সংরক্ষণ ও আপডেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
