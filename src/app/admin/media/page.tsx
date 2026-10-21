"use client";

import { useEffect, useState } from "react";
import {
  ImageIcon,
  Upload,
  Copy,
  Check,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { compressImageUnder100KB } from "@/lib/image-compressor";

export default function AdminMediaPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setMediaList(data.media || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      // 1. Auto-compress to strictly under 100 KB
      setStatusMsg("ছবিটি অটো কম্প্রেস করা হচ্ছে (টার্গেট: < ১০০ KB)...");
      const compressed = await compressImageUnder100KB(file);
      setStatusMsg(
        `কম্প্রেস সম্পন্ন (${compressed.originalSizeKB} KB → ${compressed.sizeKB} KB)! ক্লাউডে আপলোড হচ্ছে...`
      );

      // 2. Upload to Cloudflare / server
      const formData = new FormData();
      formData.append("file", compressed.file);

      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg(`সফলভাবে আপলোড সম্পন্ন হয়েছে! (${compressed.sizeKB} KB)`);
        loadMedia();
        setTimeout(() => setStatusMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "আপলোড করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("আপলোড প্রক্রিয়ায় সমস্যা হয়েছে।");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ছবিটি মুছে ফেলতে চান?")) return;
    try {
      const res = await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadMedia();
      }
    } catch (e) {
      alert("মুছতে ব্যর্থ হয়েছে");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-indigo-600" />
            মিডিয়া লাইব্রেরি (Media Library)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            যেকোনো সাইজের ছবি আপলোড করার সাথে সাথেই অটো-কম্প্রেস হয়ে ১০০ KB এর নিচে নেমে আসবে। সর্বশেষ আপলোডকৃত ছবি সবার প্রথমে থাকবে।
          </p>
        </div>

        <button
          onClick={loadMedia}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          রিফ্রেশ
        </button>
      </div>

      {/* Upload Zone Card with Auto-Compression notice */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              স্মার্ট অটো-কম্প্রেস ছবি আপলোড
            </h3>
            <p className="text-xs text-slate-500">
              JPEG, PNG বা WebP যেকোনো হাই-রেজুলেশন ছবি নির্বাচন করুন। সিস্টেম অটোমেটিক <span className="font-bold text-emerald-600">&lt; 100 KB</span> করে অপ্টিমাইজ করবে।
            </p>
          </div>

          <label className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                কম্প্রেস ও আপলোড হচ্ছে...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                নতুন ছবি আপলোড করুন
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Media Grid (Latest First) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            সংরক্ষিত ছবিসমূহ ({mediaList.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">সর্বশেষ আপলোড প্রথমে</span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : mediaList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaList.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all"
              >
                {/* Image Preview Box */}
                <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                  <img
                    src={item.url}
                    alt={item.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Size Badge */}
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                    {item.file_size || "< 100 KB"}
                  </div>
                </div>

                {/* Bottom Bar Info & Actions */}
                <div className="p-2.5 space-y-2 bg-white dark:bg-slate-900">
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate" title={item.file_name}>
                    {item.file_name}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => copyUrl(item.url, item.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80"
                      title="URL কপি করুন"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          কপি হয়েছে
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          কপি URL
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500">এখনও কোনো ছবি আপলোড করা হয়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}
