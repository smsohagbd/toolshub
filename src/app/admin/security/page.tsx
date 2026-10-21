"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Mail, Key, Check, Loader2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [targetEmail, setTargetEmail] = useState("sohagbdmt@gmail.com");
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword) {
      setErrorMsg("বর্তমান পাসওয়ার্ডটি লিখুন।");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("নতুন পাসওয়ার্ড দুটি মিলছে না।");
      return;
    }

    setLoadingOtp(true);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          current_password: currentPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "ওটিপি পাঠাতে ব্যর্থ হয়েছে। বর্তমান পাসওয়ার্ড যাচাই করুন।");
        return;
      }

      setOtpSent(true);
      if (data.target_email) setTargetEmail(data.target_email);
      setSuccessMsg(data.message || `৬-সংখ্যার কোডটি ${targetEmail} এ পাঠানো হয়েছে।`);
    } catch (err) {
      setErrorMsg("সার্ভারে সংযোগ ব্যর্থ হয়েছে।");
    } finally {
      setLoadingOtp(false);
    }
  };

  // Step 2: Verify OTP and Change Password
  const handleConfirmChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg("অনুগ্রহ করে আপনার ইমেইলে প্রাপ্ত ৬-সংখ্যার কোডটি লিখুন।");
      return;
    }

    setChangingPass(true);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_change",
          current_password: currentPassword,
          new_password: newPassword,
          otp_code: otpCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।");
        return;
      }

      setSuccessMsg("আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! পরবর্তী লগইনে নতুন পাসওয়ার্ড ব্যবহার করুন।");
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setOtpSent(false);
    } catch (err) {
      setErrorMsg("সার্ভারে ত্রুটি হয়েছে।");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          অ্যাডমিন সিকিউরিটি ও পাসওয়ার্ড পরিবর্তন
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          অ্যাডমিন অ্যাকাউন্টের সুরক্ষা এবং ইমেইল ওটিপি (OTP) ভেরিফিকেশন দিয়ে পাসওয়ার্ড আপডেট করুন
        </p>
      </div>

      {/* Admin Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              অ্যাডমিন অ্যাকাউন্ট ডিটেইলস
            </h3>
            <span className="text-xs text-slate-500">সুরক্ষিত সুপার-অ্যাডমিন অ্যাক্সেস</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block">ইউজারনেম</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white mt-1 block tracking-wider">
              •••••••• (গোপনীয়)
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block">নিরাপত্তা ইমেইল (OTP Destination)</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
              sohagbdmt@gmail.com
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block">ওটিপি অথেনটিকেশন</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              ✓ সক্রিয় (Email Verified)
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Form Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Key className="w-4 h-4 text-indigo-600" />
          <span>পাসওয়ার্ড পরিবর্তন প্রক্রিয়া (২-ধাপ ভেরিফিকেশন)</span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!otpSent ? (
          /* Step 1 Form */
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                বর্তমান পাসওয়ার্ড *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="আপনার বর্তমান পাসওয়ার্ড দিন"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  নতুন পাসওয়ার্ড *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  নতুন পাসওয়ার্ড পুনরায় লিখুন *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড কনফার্ম করুন"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
              💡 <strong>নিরাপত্তা নিয়ম:</strong> পাসওয়ার্ড পরিবর্তনের জন্য আপনার সিকিউরিটি ইমেইল (<code>{targetEmail}</code>) এ একটি ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।
            </div>

            <button
              type="submit"
              disabled={loadingOtp}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              {loadingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ওটিপি পাঠানো হচ্ছে...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  ইমেইলে ভেরিফিকেশন কোড পাঠান
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2 Form (Enter OTP) */
          <form onSubmit={handleConfirmChange} className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-600" />
                ইমেইল চেক করুন
              </span>
              <p className="text-[11px] leading-relaxed">
                আপনার <strong>{targetEmail}</strong> ঠিকানায় ৬-সংখ্যার ওটিপি কোড পাঠানো হয়েছে। অনুগ্রহ করে নিচের বক্সে কোডটি লিখুন।
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                ৬-সংখ্যার ওটিপি কোড (OTP) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="যেমন: 849201"
                className="w-full max-w-xs px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xl tracking-widest text-center font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {changingPass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    যাচাই করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    কোড যাচাই ও পাসওয়ার্ড পরিবর্তন সম্পন্ন করুন
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                তথ্য পরিবর্তন / পুনরায় শুরু করুন
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
