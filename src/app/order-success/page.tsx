"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Download, Search, ShieldCheck, UserCheck, Sparkles, ArrowRight, LayoutDashboard } from "lucide-react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const order_number = searchParams.get("order_number") || "ORD-XXXXX";
  const token = searchParams.get("token") || "";
  const newAccount = searchParams.get("new_account") === "1";
  const userEmail = searchParams.get("email") || "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-8">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in-50 duration-300">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          আপনার পেমেন্ট ট্রানজেকশন তথ্য আমাদের সিস্টেমে রেকর্ড করা হয়েছে। অ্যাডমিন টিম অবিলম্বে এটি যাচাই করে ফাইল ডেলিভারি নিশ্চিত করবে।
        </p>
      </div>

      {/* New Account Creation Celebration Card */}
      {newAccount && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 text-left space-y-4 shadow-md animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-extrabold text-base">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>অভিনন্দন! আপনার কাস্টমার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            আপনার অ্যাকাউন্টটি স্বয়ংক্রিয়ভাবে সিস্টেমে লগইন করা হয়েছে। এখন থেকে আপনি যেকোনো সময় আপনার ড্যাশবোর্ডে লগইন করে আপনার সব অর্ডার, লাইসেন্স কী ও কোর্স এক্সেস করতে পারবেন।
          </p>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">লগইন ইমেইল:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{userEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">পাসওয়ার্ড:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">অর্ডারে প্রদত্ত আপনার পাসওয়ার্ড</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">বর্তমান স্ট্যাটাস:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                সরাসরি লগইন করা আছে
              </span>
            </div>
          </div>

          <div className="pt-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all hover:scale-105"
            >
              <LayoutDashboard className="w-4 h-4" />
              আপনার ড্যাশবোর্ডে প্রবেশ করুন
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Order Info Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">অর্ডার নম্বর:</span>
          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
            #{order_number}
          </span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">স্ট্যাটাস:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            যাচাইকরণ প্রক্রিয়াধীন (Pending)
          </span>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
          💡 <strong>পরামর্শ:</strong> অর্ডার অ্যাপ্রুভ হওয়ার সাথে সাথেই আপনি এই অর্ডার নম্বর দিয়ে{" "}
          <Link href="/track-order" className="text-indigo-600 font-semibold underline">
            ট্র্যাক অর্ডার
          </Link>{" "}
          পেজ থেকে যেকোনো সময় ফাইল বা লাইসেন্স কী ডাউনলোড করে নিতে পারবেন।
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/track-order?order_number=${order_number}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all"
        >
          <Search className="w-4 h-4" />
          অর্ডার স্ট্যাটাস চেক করুন
        </Link>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all"
        >
          হোম পেজে ফিরে যান
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">অর্ডার লোড হচ্ছে...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
