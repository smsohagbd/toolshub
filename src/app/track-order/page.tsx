"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  Key,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Send,
  RefreshCw
} from "lucide-react";

function OrderTrackChat({ orderNumber, customerName }: { orderNumber: string; customerName: string }) {
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
    fetchMessages();
  }, [orderNumber]);

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
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>অর্ডার মেসেজ ও সহায়তা চ্যাট ({messages.length})</span>
        </span>
        <button
          type="button"
          onClick={fetchMessages}
          disabled={loading}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          রিফ্রেশ
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
        {loading && messages.length === 0 ? (
          <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>মেসেজ লোড হচ্ছে...</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 p-2">
            অর্ডারে কোনো সমস্যা বা তথ্য জানানোর থাকলে নিচে মেসেজ লিখে পাঠান।
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
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isAdmin ? "🛡️ " + (m.sender_name || "অ্যাডমিন সাপোর্ট") : "👤 আপনি"}
                  </span>
                  {m.created_at && (
                    <span>• {new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
                <div
                  className={`p-2.5 rounded-2xl text-xs leading-relaxed max-w-[88%] shadow-sm ${
                    isAdmin
                      ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm"
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

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="অর্ডার সমস্যা বা রিপ্লাই লিখুন..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center shadow-sm"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  // Logged-in user state & order list
  const [user, setUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showLookup, setShowLookup] = useState(false);
  const [collapsedChats, setCollapsedChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function initUserOrders() {
      setLoadingOrders(true);
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        if (authData.authenticated && authData.user) {
          setUser(authData.user);
          const ordersRes = await fetch("/api/user/purchases");
          const ordersData = await ordersRes.json();
          setUserOrders(ordersData.purchases || []);
        }
      } catch (err) {
        console.error("Failed to load user orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    }
    initUserOrders();
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setOrder(null);

    if (!orderNumber || !email) {
      setErrorMsg("অর্ডার নম্বর এবং ইমেইল উভয়ই প্রদান করুন।");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber.trim(),
          customer_email: email.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.order);
      } else {
        setErrorMsg(data.error || "অর্ডারটি খুঁজে পাওয়া যায়নি। তথ্য সঠিক কিনা যাচাই করুন।");
      }
    } catch (err) {
      setErrorMsg("সার্ভার ত্রুটি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLicense = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          অর্ডার ট্র্যাকিং ও ফাইল ডাউনলোড
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          আপনার কেনা ডিজিটাল টুলস ডাউনলোড করতে এবং পেমেন্ট ভেরিফিকেশন স্ট্যাটাস জানতে নিচে দেখুন।
        </p>
      </div>

      {/* 1. Logged-in Customer View: Direct All Orders List */}
      {user ? (
        <div className="space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">লগইন একাউন্ট:</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{user.name}</span>
                  <span className="text-xs text-slate-500 font-normal">({user.email})</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLookup(!showLookup)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-auto"
            >
              {showLookup ? "← আমার অর্ডার লিস্টে ফিরুন" : "অন্য কোনো অর্ডার নম্বর দিয়ে ট্র্যাক করুন 🔍"}
            </button>
          </div>

          {!showLookup && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>আপনার সকল অর্ডার ও ডাউনলোড</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {userOrders.length}
                  </span>
                </h2>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs">আপনার অর্ডার তালিকা লোড হচ্ছে...</p>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <p className="text-sm text-slate-500">আপনার এই একাউন্টে এখনও কোনো অর্ডার রেকর্ড নেই।</p>
                  <a
                    href="/#tools"
                    className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    ডিজিটাল টুলস ও স্ক্রিপ্ট ব্রাউজ করুন →
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((ord: any) => {
                    const isApproved = ord.payment_status === "approved";
                    const isRejected = ord.payment_status === "rejected";
                    return (
                      <div
                        key={ord.order_id || ord.order_number}
                        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            {ord.thumbnail_url ? (
                              <img
                                src={ord.thumbnail_url}
                                alt={ord.product_title}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                📦
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                {ord.product_title}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  #{ord.order_number}
                                </span>
                                {ord.created_at && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(ord.created_at).toLocaleDateString("bn-BD")}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40"
                                  : isRejected
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300/40"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40"
                              }`}
                            >
                              {isApproved ? "Approved / Paid ✓" : isRejected ? "Rejected" : "Pending Verification ⏳"}
                            </span>
                          </div>
                        </div>

                        {/* Status Message & Action Buttons */}
                        {isApproved ? (
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                                ✓ পেমেন্ট সফলভাবে অনুমোদিত হয়েছে। আপনার ফাইল বা অ্যাক্সেস রেডি!
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {ord.product_type === "link" || ord.external_access_url ? (
                                  <a
                                    href={ord.download_token ? `/download/${ord.download_token}` : (ord.external_access_url || "#")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md transition-transform hover:scale-105"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Access Now (ড্রাইভ লিংক)
                                  </a>
                                ) : (
                                  <a
                                    href={`/download/${ord.download_token}`}
                                    download
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-transform hover:scale-105"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    ডাউনলোড ফাইল
                                  </a>
                                )}
                              </div>
                            </div>

                            {ord.delivered_license_key && (
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                                <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">
                                  কী: {ord.delivered_license_key}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyLicense(ord.delivered_license_key)}
                                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  {copiedKey ? "কপি হয়েছে ✓" : "কপি করুন"}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : isRejected ? (
                          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                            পেমেন্ট তথ্য যাচাইয়ের পর বাতিল হয়েছে। সঠিক TrxID সহ নিচে মেসেজ দিন।
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0 text-amber-500 animate-spin" />
                            <span>আপনার TrxID অ্যাডমিন টিম পর্যালোচনা করছে। সাধারণত ৫-১৫ মিনিটের মধ্যে সক্রিয় হয়।</span>
                          </div>
                        )}

                        {/* Order Chat (Auto Open by Default) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between pb-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedChats((prev) => ({
                                  ...prev,
                                  [ord.order_number]: !prev[ord.order_number]
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                              <span>
                                {collapsedChats[ord.order_number]
                                  ? "অর্ডার চ্যাট ও সহায়তা মেসেজ খুলুন ▼"
                                  : "অর্ডার চ্যাট ও সহায়তা মেসেজ (সক্রিয়) ▲"}
                              </span>
                            </button>
                          </div>

                          {!collapsedChats[ord.order_number] && (
                            <div className="mt-2">
                              <OrderTrackChat
                                orderNumber={ord.order_number}
                                customerName={user.name || "গ্রাহক"}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* 2. Guest View or Show Lookup Form */}
      {(!user || showLookup) && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {!user && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between flex-wrap gap-2">
              <span>💡 পূর্বে অ্যাকাউন্ট তৈরি করেছেন? অর্ডার আইডি ছাড়া সরাসরি সকল অর্ডার দেখতে:</span>
              <a href="/login" className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
                লগইন করুন →
              </a>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অর্ডার নম্বর * (e.g. ORD-88214)
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-XXXXX"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অর্ডারে ব্যবহৃত ইমেইল *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              অর্ডার সার্চ করুন
            </button>
          </form>
        </div>
      )}

      {/* Result Display */}
      {order && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <span className="text-xs text-slate-500 block">অর্ডার আইটেম:</span>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {order.product_title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">
                #{order.order_number}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.payment_status === "approved"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {order.payment_status === "approved" ? "Approved / Paid" : "Pending Verification"}
              </span>
            </div>
          </div>

          {/* Admin Notes Notice if present */}
          {order.admin_notes && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                অ্যাডমিন নোট / বিশেষ বার্তা:
              </div>
              <p className="leading-relaxed whitespace-pre-line pl-5">{order.admin_notes}</p>
            </div>
          )}

          {/* 2-Way Order Messages & Problem Resolution */}
          <OrderTrackChat
            orderNumber={order.order_number}
            customerName={order.customer_name || "গ্রাহক"}
          />

          {/* If Approved: Show R2 Download Button & License Key */}
          {order.payment_status === "approved" ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  পেমেন্ট সফলভাবে অনুমোদিত হয়েছে!
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                  {order.product_type === "link" || order.external_access_url
                    ? "আপনার ড্রাইভ বা ৩য়-পক্ষ অ্যাক্সেস লিংক প্রস্তুত। 'Access Now' বাটনে ক্লিক করে সরাসরি অ্যাক্সেস করুন।"
                    : "আপনার ডিজিটাল ফাইলটি নিরাপদ ক্লাউড সার্ভার থেকে সরাসরি ডাউনলোড করার জন্য প্রস্তুত।"}
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  {order.product_type === "link" || order.external_access_url ? (
                    <a
                      href={order.download_token ? `/download/${order.download_token}` : (order.external_access_url || "#")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Access Now (এখনই অ্যাক্সেস করুন)
                    </a>
                  ) : (
                    <a
                      href={`/download/${order.download_token}`}
                      download
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      ফাইল ডাউনলোড করুন (ইনস্ট্যান্ট ডাউনলোড)
                    </a>
                  )}
                </div>
                <span className="block text-[11px] text-slate-500 mt-1">
                  অ্যাক্সেস/ডাউনলোড সংখ্যা: {order.download_count} / {order.max_downloads} বার সর্বোচ্চ
                </span>
              </div>

              {/* License Key if delivered */}
              {order.delivered_license_key && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-500" />
                    আপনার সফটওয়্যার লাইসেন্স কী (License Key):
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    <span>{order.delivered_license_key}</span>
                    <button
                      onClick={() => copyLicense(order.delivered_license_key)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Copy Key"
                    >
                      {copiedKey ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <Clock className="w-5 h-5 text-amber-500 animate-spin" />
                আপনার TrxID যাচাইকরণ চলছে
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                আপনার প্রদত্ত পেমেন্ট তথ্য অ্যাডমিন টিম পর্যালোচনা করছে। সাধারণত ৫-১৫ মিনিটের মধ্যে ভেরিফিকেশন সম্পন্ন হয়। সম্পন্ন হলে এই পেজেই ডাউনলোড বাটন দৃশ্যমান হবে।
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
