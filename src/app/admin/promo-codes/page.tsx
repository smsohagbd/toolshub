"use client";

import { useEffect, useState } from "react";
import {
  Tag,
  Percent,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  Sparkles,
  TrendingUp,
  Hash
} from "lucide-react";
import { PromoCode } from "@/lib/types";

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      if (data.success) {
        setPromoCodes(data.promo_codes || []);
      }
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const openCreateModal = () => {
    setEditingPromo(null);
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderAmount("");
    setMaxDiscountAmount("");
    setUsageLimit("");
    setExpiryDate("");
    setIsActive(true);
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setCode(promo.code);
    setDiscountType(promo.discount_type);
    setDiscountValue(String(promo.discount_value));
    setMinOrderAmount(promo.min_order_amount ? String(promo.min_order_amount) : "");
    setMaxDiscountAmount(promo.max_discount_amount ? String(promo.max_discount_amount) : "");
    setUsageLimit(promo.usage_limit ? String(promo.usage_limit) : "");
    setExpiryDate(promo.expiry_date ? promo.expiry_date.split("T")[0] : "");
    setIsActive(promo.is_active === 1);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!code.trim() || !discountValue) {
      setErrorMsg("প্রমো কোড এবং ডিসকাউন্টের মান প্রদান করুন।");
      return;
    }

    setActionLoading(true);

    const payload = {
      id: editingPromo ? editingPromo.id : undefined,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: minOrderAmount ? Number(minOrderAmount) : 0,
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      usage_limit: usageLimit ? Number(usageLimit) : 0,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: isActive ? 1 : 0
    };

    try {
      const method = editingPromo ? "PUT" : "POST";
      const res = await fetch("/api/admin/promo-codes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || "প্রমো কোড সফলভাবে সংরক্ষণ করা হয়েছে!");
        setModalOpen(false);
        fetchPromoCodes();
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg(data.error || "সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setErrorMsg("সার্ভারে সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (promo: PromoCode) => {
    try {
      const updatedStatus = promo.is_active === 1 ? 0 : 1;
      const res = await fetch("/api/admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promo,
          is_active: updatedStatus
        })
      });
      if (res.ok) {
        setPromoCodes((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, is_active: updatedStatus } : p))
        );
      }
    } catch (err) {
      alert("স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে");
    }
  };

  const handleDeletePromo = async (promo: PromoCode) => {
    if (!confirm(`আপনি কি নিশ্চিত যে '${promo.code}' প্রমো কোডটি স্থায়ীভাবে মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/promo-codes?id=${promo.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setPromoCodes((prev) => prev.filter((p) => p.id !== promo.id));
        setSuccessMsg(`'${promo.code}' প্রমো কোডটি মুছে ফেলা হয়েছে।`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert("মুছতে ব্যর্থ হয়েছে");
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics
  const totalCodes = promoCodes.length;
  const activeCodes = promoCodes.filter((p) => p.is_active === 1).length;
  const totalUsage = promoCodes.reduce((sum, p) => sum + (p.used_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>ডিসকাউন্ট ও প্রমো কোড</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            গ্রাহকদের জন্য আকর্ষণীয় ডিসকাউন্ট ভাউচার তৈরি করুন। চেকআউট পেজে গ্রাহকরা এই কোড দিয়ে ছাড় পাবেন।
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্রমো কোড তৈরি করুন</span>
        </button>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">মোট প্রমো কোড</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCodes} টি</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Hash className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">সক্রিয় প্রমো কোড</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCodes} টি</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">মোট বার ব্যবহৃত</span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalUsage} বার</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">প্রমো কোড লোড হচ্ছে...</p>
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Tag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              এখনও কোনো প্রমো কোড তৈরি করা হয়নি।
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              প্রথম প্রমো কোড যোগ করুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">প্রমো কোড</th>
                  <th className="py-3.5 px-5">ডিসকাউন্ট মান</th>
                  <th className="py-3.5 px-5">শর্ত ও সীমা</th>
                  <th className="py-3.5 px-5">ব্যবহার সংখ্যা</th>
                  <th className="py-3.5 px-5">মেয়াদ</th>
                  <th className="py-3.5 px-5">স্ট্যাটাস</th>
                  <th className="py-3.5 px-5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {promoCodes.map((promo) => {
                  const isExpired = promo.expiry_date && new Date(promo.expiry_date).getTime() < Date.now();

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCodeToClipboard(promo.code)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="কপি করুন"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-sm">
                          {promo.discount_type === "percentage" ? (
                            <span className="text-pink-600 dark:text-pink-400">
                              {promo.discount_value}% ছাড়
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ৳{promo.discount_value} ফ্ল্যাট
                            </span>
                          )}
                        </div>
                        {promo.discount_type === "percentage" && promo.max_discount_amount && promo.max_discount_amount > 0 ? (
                          <div className="text-[10px] text-slate-400">
                            সর্বোচ্চ ৳{promo.max_discount_amount}
                          </div>
                        ) : null}
                      </td>

                      {/* Minimum Order */}
                      <td className="py-4 px-5 space-y-0.5">
                        <div className="text-slate-900 dark:text-slate-100 font-medium">
                          {promo.min_order_amount && promo.min_order_amount > 0 ? (
                            <span>ন্যূনতম ৳{promo.min_order_amount} অর্ডার</span>
                          ) : (
                            <span className="text-slate-400">যেকোনো অর্ডার</span>
                          )}
                        </div>
                        {promo.usage_limit && promo.usage_limit > 0 ? (
                          <div className="text-[10px] text-slate-400">
                            সীমা: {promo.usage_limit} বার
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">সীমা: আনলিমিটেড</div>
                        )}
                      </td>

                      {/* Used Count */}
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {promo.used_count || 0} বার
                        </div>
                        {promo.usage_limit && promo.usage_limit > 0 ? (
                          <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((promo.used_count || 0) / promo.usage_limit) * 100
                                )}%`
                              }}
                            />
                          </div>
                        ) : null}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-4 px-5">
                        {promo.expiry_date ? (
                          <div className={`space-y-0.5 ${isExpired ? "text-red-500 font-semibold" : ""}`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 opacity-70" />
                              <span>{new Date(promo.expiry_date).toLocaleDateString("bn-BD")}</span>
                            </div>
                            {isExpired && (
                              <span className="text-[10px] text-red-500 font-bold block">
                                মেয়াদোত্তীর্ণ
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">আজীবন (No Expiry)</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(promo)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            promo.is_active === 1 && !isExpired
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              promo.is_active === 1 && !isExpired ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{promo.is_active === 1 && !isExpired ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Off)"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(promo)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(promo)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 transition-colors"
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

      {/* Create / Edit Promo Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-extrabold text-base text-slate-900 dark:text-white">
                <Tag className="w-5 h-5 text-indigo-600" />
                <span>{editingPromo ? "প্রমো কোড এডিট করুন" : "নতুন প্রমো কোড তৈরি করুন"}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePromo} className="space-y-4 text-xs">
              {/* Promo Code Input */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  প্রমো কোড নাম * (স্বয়ংক্রিয় বড় হাতের হবে)
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10, SAVE200, EID50"
                  className="w-full px-3.5 py-2.5 rounded-xl uppercase font-mono font-bold tracking-wider bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    ডিসকাউন্ট টাইপ *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">শতাংশ (%) ডিসকাউন্ট</option>
                    <option value="fixed">নির্দিষ্ট টাকা (৳) ফ্ল্যাট ছাড়</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {discountType === "percentage" ? "শতকরা মান (%) *" : "টাকার পরিমাণ (৳) *"}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "e.g. 15 (15% ছাড়)" : "e.g. 200 (৳২০০ ছাড়)"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    ন্যূনতম অর্ডার মূল্য (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0 = কোনো বাধ্যবাধকতা নেই"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    সর্বোচ্চ ছাড়ের সীমা (টাকা)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="খালি রাখলে আনলিমিটেড"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Usage Limit & Expiry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    মোট ব্যবহারের সীমা
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="0 = আনলিমিটেড ব্যবহার"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    মেয়াদ শেষ হওয়ার তারিখ
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status Switch */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    প্রমো কোডটি সক্রিয় (Active) রাখুন
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : editingPromo ? (
                    "আপডেট করুন"
                  ) : (
                    "যুক্ত করুন"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
