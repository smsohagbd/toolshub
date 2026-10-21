"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  PlusCircle,
  Smartphone,
  Bitcoin,
  Check,
  Save,
  Loader2,
  X,
  AlertCircle
} from "lucide-react";

export default function AdminPaymentMethodsPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // New gateway form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("send_money");
  const [newAccount, setNewAccount] = useState("");
  const [newAccountType, setNewAccountType] = useState("Personal");
  const [newInstructions, setNewInstructions] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadGateways = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      setGateways(data.gateways || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateways();
  }, []);

  const handleUpdate = async (gw: any) => {
    setSavingId(gw.id);
    setSaveSuccessMsg("");

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gw)
      });
      if (res.ok) {
        setSaveSuccessMsg(`'${gw.title}' সফলভাবে আপডেট করা হয়েছে!`);
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert("আপডেট করতে ব্যর্থ হয়েছে");
    } finally {
      setSavingId(null);
    }
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const handleAddGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          account_number: newAccount,
          account_type: newAccountType,
          instructions: newInstructions
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle("");
        setNewAccount("");
        setNewInstructions("");
        loadGateways();
      }
    } catch (err) {
      alert("পেমেন্ট মেথড যোগ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            পেমেন্ট মেথড সেটিংস
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            বিকাশ, নগদ, ক্রিপ্টো সহ আপনার পছন্দমতো পেমেন্ট মেথড সক্রিয় বা পরিবর্তন করুন। চেকআউট পেজে এগুলো প্রদর্শিত হবে।
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          নতুন পেমেন্ট মেথড যোগ করুন
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {gateways.map((gw) => (
            <div
              key={gw.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {gw.type === "crypto" ? (
                      <Bitcoin className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-pink-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {gw.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">
                      ID: {gw.id} • {gw.type}
                    </span>
                  </div>
                </div>

                {/* Enable / Disable Toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(gw.is_enabled)}
                      onChange={(e) =>
                        handleFieldChange(gw.id, "is_enabled", e.target.checked ? 1 : 0)
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {gw.is_enabled ? "চালু আছে (Active)" : "বন্ধ আছে (Disabled)"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    নম্বর / ওয়ালেট এড্রেস
                  </label>
                  <input
                    type="text"
                    value={gw.account_number}
                    onChange={(e) =>
                      handleFieldChange(gw.id, "account_number", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    অ্যাকাউন্ট টাইপ (Personal / Agent / TRC20 / BEP20)
                  </label>
                  <input
                    type="text"
                    value={gw.account_type}
                    onChange={(e) =>
                      handleFieldChange(gw.id, "account_type", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs text-slate-700 dark:text-slate-300">
                  গ্রাহকদের জন্য পেমেন্ট নির্দেশনা (Instructions shown on checkout)
                </label>
                <textarea
                  rows={3}
                  value={gw.instructions}
                  onChange={(e) =>
                    handleFieldChange(gw.id, "instructions", e.target.value)
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={savingId === gw.id}
                  onClick={() => handleUpdate(gw)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                >
                  {savingId === gw.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  পরিবর্তন সেভ করুন
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                নতুন পেমেন্ট মেথড যুক্ত করুন
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGateway} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">পেমেন্ট মেথড নাম *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Rocket Send Money বা Binance Pay"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">টাইপ</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="send_money">Send Money</option>
                    <option value="crypto">Crypto Wallet</option>
                    <option value="gateway">Automatic Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">অ্যাকাউন্ট টাইপ</label>
                  <input
                    type="text"
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value)}
                    placeholder="Personal / Merchant"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">নম্বর বা এড্রেস *</label>
                <input
                  type="text"
                  required
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  placeholder="01xxxxxxxxx বা Crypto Address"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">পেমেন্ট নির্দেশনা</label>
                <textarea
                  rows={3}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="গ্রাহক কীভাবে টাকা পাঠাবে তার ধাপ..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-md"
                >
                  {isAdding ? "যুক্ত হচ্ছে..." : "যুক্ত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
