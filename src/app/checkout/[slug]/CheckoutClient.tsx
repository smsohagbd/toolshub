"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Check,
  Copy,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Smartphone,
  Bitcoin,
  Tag,
  X
} from "lucide-react";

export function CheckoutClient({ slug }: { slug: string }) {
  const router = useRouter();

  // Dynamically determine the active slug from the browser URL (or prop fallback)
  // This solves the issue where static prerendering or worker fallbacks baked a fixed slug
  const getActiveSlug = () => {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/checkout\/([^/?#]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return decodeURIComponent(slug || "");
  };

  const [activeSlug, setActiveSlug] = useState<string>(() => getActiveSlug());
  const [product, setProduct] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Promo Code State
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    discount_amount: number;
    message?: string;
  } | null>(null);

  // Load product and active payment gateways
  useEffect(() => {
    const currentSlug = getActiveSlug();
    setActiveSlug(currentSlug);

    async function loadData() {
      try {
        const [prodRes, gwRes] = await Promise.all([
          fetch(`/api/products`),
          fetch(`/api/payment-methods`)
        ]);
        const prodData = await prodRes.json();
        const gwData = await gwRes.json();

        const allProds = prodData.products || [];
        // Match by slug, decoded slug, or product ID
        let matched = allProds.find(
          (p: any) =>
            p.slug === currentSlug ||
            p.id === currentSlug ||
            decodeURIComponent(p.slug) === currentSlug ||
            p.slug?.toLowerCase().trim() === currentSlug?.toLowerCase().trim()
        );

        if (!matched && currentSlug) {
          const decoded = decodeURIComponent(currentSlug).toLowerCase().trim();
          matched = allProds.find((p: any) => p.slug?.toLowerCase().trim() === decoded);
        }

        setProduct(matched || null);

        const activeGws = (gwData.gateways || []).filter((g: any) => g.is_enabled === 1);
        setGateways(activeGws);
        if (activeGws.length > 0) {
          setSelectedGateway(activeGws[0]);
        }

        // Check if user is logged in
        try {
          const authRes = await fetch("/api/auth/me");
          const authData = await authRes.json();
          if (authData.authenticated && authData.user) {
            setCustomerName(authData.user.name || "");
            setCustomerEmail(authData.user.email || "");
            setIsLoggedIn(true);
          }
        } catch (err) {}
      } catch (e) {
        console.error("Failed to load checkout data:", e);
      }
    }
    loadData();
  }, [slug]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Base and Final Price calculations
  const basePrice = product?.sale_price || product?.price || 0;
  const originalPrice = product?.price || basePrice;
  const promoDiscount = appliedPromo ? appliedPromo.discount_amount : 0;
  const finalPayable = Math.max(0, basePrice - promoDiscount);

  // Apply Promo Code
  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError("অনুগ্রহ করে একটি প্রমো কোড লিখুন।");
      return;
    }
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          amount: basePrice,
          product_id: product?.id,
          product_slug: product?.slug || activeSlug
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo({
          code: data.code,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: data.discount_amount,
          message: data.message
        });
        setCouponCode("");
        setCouponError("");
      } else {
        setCouponError(data.error || "প্রমো কোডটি সঠিক নয় বা প্রযোজ্য নয়।");
      }
    } catch (err) {
      setCouponError("প্রমো কোড যাচাই করতে সমস্যা হয়েছে।");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setCouponError("");
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!customerName || !customerEmail || !transactionId) {
      setErrorMsg("অনুগ্রহ করে আপনার নাম, ইমেইল এবং Transaction ID প্রদান করুন।");
      return;
    }

    if (!isLoggedIn && (!customerPassword || customerPassword.length < 6)) {
      setErrorMsg("অ্যাকাউন্ট তৈরির জন্য অনুগ্রহ করে কমপক্ষে ৬ অক্ষরের একটি পাসওয়ার্ড দিন।");
      return;
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          product_slug: product?.slug || activeSlug,
          product_id: product?.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          password: customerPassword,
          payment_method: selectedGateway?.id || "bkash",
          sender_number: senderNumber,
          transaction_id: transactionId,
          coupon_code: appliedPromo ? appliedPromo.code : null
        })
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = `/order-success?order_number=${data.order_number}&token=${data.download_token}&new_account=${data.new_account_created ? "1" : "0"}&email=${encodeURIComponent(customerEmail)}`;
        return;
      } else {
        setErrorMsg(data.error || "অর্ডার সম্পন্ন হতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMsg("অনুরোধের সময় শেষ হয়ে গিয়েছে। আপনার ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।");
      } else {
        setErrorMsg("সার্ভারে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।");
      }
      setIsLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">প্রোডাক্ট ও পেমেন্ট তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href={`/tools/${product?.slug || activeSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          টুলস বিবরণে ফিরে যান
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              অর্ডার কনফার্মেশন ও পেমেন্ট
            </h1>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleOrderSubmit} className="space-y-6">
              {/* Step 1: Customer Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ১. আপনার যোগাযোগের তথ্য
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      আপনার পুরো নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. হাসান মাহমুদ"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ইমেইল অ্যাড্রেস * (ফাইল যাবে)
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    মোবাইল / WhatsApp নম্বর
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Password field for guest auto-account creation */}
                {!isLoggedIn ? (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        অ্যাকাউন্টের জন্য একটি পাসওয়ার্ড তৈরি করুন *
                      </label>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        অটো অ্যাকাউন্ট সৃষ্টি
                      </span>
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      💡 <strong>সুবিধা:</strong> এই ইমেইল ও পাসওয়ার্ড দিয়ে অবিলম্বে একটি কাস্টমার অ্যাকাউন্ট তৈরি হবে, যাতে পরবর্তীতে ড্যাশবোর্ডে লগইন করে আপনার সব কোর্স ও ডাউনলোড সহজেই এক্সেস করতে পারেন।
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>লগইন একাউন্ট: <strong>{customerEmail}</strong></span>
                    <span className="font-semibold text-[11px]">সক্রিয় সদস্য ✓</span>
                  </div>
                )}
              </div>

              {/* Step 2: Payment Method Selection */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ২. পেমেন্ট মেথড নির্বাচন করুন
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {gateways.map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setSelectedGateway(gw)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedGateway?.id === gw.id
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {gw.type === "crypto" ? (
                          <Bitcoin className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-pink-500" />
                        )}
                        {selectedGateway?.id === gw.id && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {gw.title}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase mt-0.5">
                        {gw.account_type}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Gateway Payment Instructions Box */}
                {selectedGateway && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {selectedGateway.title} নম্বর / অ্যাড্রেস ({selectedGateway.account_type}):
                      </span>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span>{selectedGateway.account_number}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedGateway.account_number)}
                          className="hover:opacity-75 transition-opacity ml-1"
                          title="Copy"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      {selectedGateway.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Transaction ID Submission */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ৩. ট্রানজেকশন তথ্য দিন
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      যে নম্বর বা ওয়ালেট থেকে পাঠিয়েছেন
                    </label>
                    <input
                      type="text"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="e.g. 017xxxxxxxx বা Wallet"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction ID (TrxID / Hash) *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 9K8J7H6G5F বা TxHash"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      অর্ডার প্রসেস হচ্ছে...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      অর্ডার কনফার্ম করুন (৳{finalPayable})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Order Summary Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              অর্ডার সারাংশ
            </h3>

            {product ? (
              <div className="flex gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <img
                  src={
                    product.thumbnail_url ||
                    "/placeholder.svg"
                  }
                  alt={product.title}
                  className="w-20 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {product.title}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ভার্সন: v{product.version || "1.0.0"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                প্রোডাক্টের তথ্য লোড হচ্ছে...
              </div>
            )}

            {/* Promo Code Input / Applied Badge Box */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>ডিসকাউন্ট বা প্রমো কোড</span>
              </label>

              {appliedPromo ? (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-mono font-extrabold text-xs text-emerald-800 dark:text-emerald-200">
                        {appliedPromo.code}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {appliedPromo.discount_type === "percentage"
                          ? `${appliedPromo.discount_value}% ছাড় (-৳${appliedPromo.discount_amount})`
                          : `৳${appliedPromo.discount_amount} ফ্ল্যাট ছাড়`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="প্রমো কোড মুছুন"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                      placeholder="কোড লিখুন (e.g. WELCOME10)"
                      className="flex-1 px-3 py-2 text-xs uppercase font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponCode.trim()}
                      onClick={() => handleApplyPromo()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5 active:scale-95"
                    >
                      {couponLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "প্রয়োগ"
                      )}
                    </button>
                  </div>

                  {couponError && (
                    <div className="text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price Calculation Summary */}
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span>মূল মূল্য:</span>
                <span className="line-through text-slate-400">৳{originalPrice}</span>
              </div>
              {product?.sale_price && product.sale_price < product.price && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>প্রোডাক্ট ছাড়:</span>
                  <span>-৳{product.price - product.sale_price}</span>
                </div>
              )}
              {appliedPromo && (
                <div className="flex justify-between text-pink-600 dark:text-pink-400 font-bold animate-in fade-in">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>প্রমো কোড ({appliedPromo.code}):</span>
                  </span>
                  <span>-৳{appliedPromo.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>সর্বমোট প্রদেয়:</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black">
                  ৳{finalPayable}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                নিরাপদ ডিজিটাল ট্রানজেকশন
              </div>
              <p className="leading-relaxed">
                পেমেন্ট সম্পন্ন হওয়ার পর TrxID সাবমিট করুন। অ্যাডমিন অবিলম্বে ভেরিফাই করে আপনার ডাউনলোড এক্টিভ করে দিবে।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
