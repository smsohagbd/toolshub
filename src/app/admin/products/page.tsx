"use client";

import { useEffect, useState } from "react";
import {
  Package,
  PlusCircle,
  Trash2,
  ExternalLink,
  Upload,
  Check,
  Loader2,
  X,
  FileText,
  ImageIcon,
  Sparkles,
  Link as LinkIcon,
  HardDrive,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Eye
} from "lucide-react";
import { compressImageUnder100KB } from "@/lib/image-compressor";

const CATEGORIES = [
  { id: "cat_automation", name: "Social Automation (সোশ্যাল অটোমেশন)" },
  { id: "cat_seo", name: "SEO & Marketing (এসইও ও মার্কেটিং)" },
  { id: "cat_dev", name: "Web & App Scripts (ওয়েব ও অ্যাপ স্ক্রিপ্ট)" },
  { id: "cat_ai", name: "AI Tools & Prompts (এআই টুলস ও প্রম্পটস)" },
  { id: "cat_course", name: "কোর্স ও মাস্টারক্লাস (Courses & Masterclass)" }
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [categoryId, setCategoryId] = useState("cat_automation");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [version, setVersion] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileName, setFileName] = useState("");
  const [productType, setProductType] = useState<"file" | "link">("file");
  const [billingType, setBillingType] = useState<"one_time" | "subscription">("one_time");
  const [subscriptionPeriod, setSubscriptionPeriod] = useState("1_month");
  const [externalAccessUrl, setExternalAccessUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Product Generator & Live Preview States
  const [aiKeyword, setAiKeyword] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Upload status
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbStatus, setThumbStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  // Media Library Picker Modal State
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Notifications
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Helper to generate clean slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugManual && !editingProductId) {
      setSlug(generateSlug(val));
    }
  };

  // Open modal in CREATE mode
  const openCreateModal = () => {
    setEditingProductId(null);
    setTitle("");
    setSlug("");
    setIsSlugManual(false);
    setCategoryId("cat_automation");
    setPrice("");
    setSalePrice("");
    setShortDesc("");
    setDesc("");
    setVersion("");
    setFileSize("");
    setFileName("");
    setProductType("file");
    setBillingType("one_time");
    setSubscriptionPeriod("1_month");
    setExternalAccessUrl("");
    setThumbnailUrl("");
    setThumbnailPreview("");
    setShowManualUrlInput(false);
    setFeaturesText("");
    setIsFeatured(false);
    setThumbStatus("");
    setShowModal(true);
  };

  // Open modal in EDIT mode
  const openEditModal = (p: any) => {
    setEditingProductId(p.id);
    setTitle(p.title || "");
    setSlug(p.slug || "");
    setIsSlugManual(true);
    setCategoryId(p.category_id || "cat_automation");
    setPrice(p.price ? String(p.price) : "");
    setSalePrice(p.sale_price ? String(p.sale_price) : "");
    setShortDesc(p.short_description || "");
    setDesc(p.description || "");
    setVersion(p.version || "");
    setFileSize(p.file_size || "");
    setFileName(p.file_name || "");
    setProductType(p.product_type || (p.external_access_url ? "link" : "file"));
    setBillingType(p.billing_type || "one_time");
    setSubscriptionPeriod(p.subscription_period || "1_month");
    setExternalAccessUrl(p.external_access_url || "");
    setThumbnailUrl(p.thumbnail_url || "");
    setThumbnailPreview(p.thumbnail_url || "");
    setShowManualUrlInput(false);

    let feats = "";
    if (p.features_json) {
      try {
        const arr = JSON.parse(p.features_json);
        if (Array.isArray(arr)) feats = arr.join("\n");
      } catch (e) {
        feats = p.features_json;
      }
    }
    setFeaturesText(feats);
    setIsFeatured(Boolean(p.is_featured));
    setThumbStatus("");
    setShowModal(true);
  };

  // AI Product Details Generator using OpenRouter / Gemini
  const handleGenerateWithAI = async () => {
    if (!aiKeyword.trim()) {
      alert("দয়া করে প্রোডাক্টের মূল কিওয়ার্ড বা নাম লিখুন (যেমন: Facebook Lead Scraper বা Canva Pro)");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/admin/products/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: aiKeyword.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const d = data.data;
        if (d.title) setTitle(d.title);
        if (d.slug) {
          setSlug(d.slug);
          setIsSlugManual(true);
        }
        if (d.short_description) setShortDesc(d.short_description);
        if (d.description) setDesc(d.description);
        if (d.suggested_price) setPrice(String(d.suggested_price));
        if (d.suggested_sale_price) setSalePrice(String(d.suggested_sale_price));
        if (Array.isArray(d.features)) setFeaturesText(d.features.join("\n"));
        if (d.category) setCategoryId(d.category);
        setSuccessToast("AI দিয়ে প্রোডাক্টের সকল বিবরণ সফলভাবে তৈরি হয়েছে!");
        setTimeout(() => setSuccessToast(""), 4000);
      } else {
        alert(data.error || "AI জেনারেশন সম্পন্ন করা যায়নি।");
      }
    } catch(err) {
      alert("AI প্রোডাক্ট জেনারেশন রিকোয়েস্টে সমস্যা হয়েছে।");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 1. Direct Image Upload with Auto-Compression (<100KB) and AUTO-SETUP (no URL typing needed)
  const handleDirectThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    setThumbStatus("ছবিটি অটো কম্প্রেস হচ্ছে (< ১০০ KB)...");

    try {
      const compressed = await compressImageUnder100KB(file);
      setThumbnailPreview(compressed.dataUrl);
      setThumbStatus(`কম্প্রেসড (${compressed.originalSizeKB} KB → ${compressed.sizeKB} KB)! ক্লাউডে সেভ হচ্ছে...`);

      const formData = new FormData();
      formData.append("file", compressed.file);

      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.media?.url) {
        // Automatically set the thumbnail without showing raw URL
        setThumbnailUrl(data.media.url);
        setThumbStatus(`ছবি সফলভাবে যুক্ত হয়েছে! (${compressed.sizeKB} KB)`);
        setTimeout(() => setThumbStatus(""), 4000);
      } else {
        alert("ছবি আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
      }
    } catch (err) {
      console.error(err);
      alert("ছবি প্রসেসিংয়ে সমস্যা হয়েছে।");
    } finally {
      setUploadingThumb(false);
      e.target.value = "";
    }
  };

  // 2. Open Media Picker to select previously uploaded images
  const openMediaPicker = async () => {
    setShowMediaPicker(true);
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setMediaItems(data.media || []);
    } catch (e) {
      console.error("Failed to load media items:", e);
    } finally {
      setLoadingMedia(false);
    }
  };

  const selectMediaItem = (item: any) => {
    setThumbnailUrl(item.url);
    setThumbnailPreview(item.url);
    setShowMediaPicker(false);
  };

  // 3. Digital ZIP File Upload to Cloudflare R2
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "tools");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFileName(data.file_name);
        if (!fileSize) setFileSize(data.file_size);
        alert(`ডিজিটাল ফাইল (${data.file_name}) সফলভাবে ক্লাউডফ্লেয়ার R2 তে আপলোড হয়েছে!`);
      } else {
        alert(data.error || "ফাইল আপলোড ব্যর্থ হয়েছে");
      }
    } catch (err) {
      alert("ফাইল আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploadProgress(false);
    }
  };

  // Submit Product (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !price) {
      alert("দয়া করে নাম, স্লাগ এবং মূল মূল্য পূরণ করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload = {
        id: editingProductId || undefined,
        title,
        slug: slug.toLowerCase().trim(),
        category_id: categoryId,
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        short_description: shortDesc,
        description: desc,
        version: version.trim(), // Optional
        file_size: fileSize.trim(), // Optional
        file_name: fileName,
        product_type: productType,
        billing_type: billingType,
        subscription_period: billingType === "subscription" ? subscriptionPeriod : null,
        external_access_url: productType === "link" ? externalAccessUrl.trim() : null,
        thumbnail_url: thumbnailUrl || "/placeholder.svg",
        features,
        is_featured: isFeatured ? 1 : 0,
        status: "published"
      };

      const url = "/api/admin/products";
      const method = editingProductId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setSuccessToast(
          editingProductId
            ? "প্রোডাক্ট সফলভাবে আপডেট করা হয়েছে!"
            : "নতুন প্রোডাক্ট সফলভাবে হোমপেজ ও স্টোরে যুক্ত হয়েছে!"
        );
        setTimeout(() => setSuccessToast(""), 4000);
        loadProducts();
      } else {
        alert(data.error || "সংরক্ষণ করতে ব্যর্থ হয়েছে");
      }
    } catch (err) {
      alert("সার্ভার সমস্যা হয়েছে");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, prodTitle: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${prodTitle}" মুছে ফেলতে চান?`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadProducts();
      }
    } catch (e) {
      alert("মুছে ফেলতে ব্যর্থ হয়েছে");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            ডিজিটাল প্রোডাক্ট ও টুলস ম্যানেজমেন্ট
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            আপনার স্টোরের সমস্ত ডিজিটাল সফটওয়্যার, স্ক্রিপ্ট ও কোর্স যুক্ত ও সম্পাদন করুন। নতুন প্রোডাক্ট যুক্ত করার সাথে সাথে তা হোমপেজের টুলস সেকশনে প্রদর্শিত হবে।
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          নতুন প্রোডাক্ট যোগ করুন
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Products Table Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="pb-3">ছবি</th>
                  <th className="pb-3">টুলস এর নাম ও স্লাগ</th>
                  <th className="pb-3">ক্যাটাগরি</th>
                  <th className="pb-3">মূল্য</th>
                  <th className="pb-3">ডেলিভারি ধরন</th>
                  <th className="pb-3">সাইজ / ভার্সন</th>
                  <th className="pb-3">স্ট্যাটাস</th>
                  <th className="pb-3 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {products.map((p) => {
                  const cat = CATEGORIES.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3">
                        <img
                          src={p.thumbnail_url || "/placeholder.svg"}
                          alt={p.title}
                          className="w-12 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          /{p.slug}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          {cat ? cat.name.split(" ")[0] : "General"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ৳{p.sale_price || p.price}
                        </div>
                        {p.sale_price && (
                          <div className="line-through text-[10px] text-slate-400">
                            ৳{p.price}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {p.product_type === "link" || p.external_access_url ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                            <ExternalLink className="w-3 h-3" />
                            Access Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <HardDrive className="w-3 h-3" />
                            R2 ডাউনলোড
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[11px] text-slate-500 font-mono">
                        {p.version ? `v${p.version}` : "-"} {p.file_size ? `(${p.file_size})` : ""}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {p.status || "published"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold transition-colors"
                            title="সম্পাদন করুন (Edit)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/tools/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="লাইভ প্রিভিউ"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-xs text-slate-500">কোনো প্রোডাক্ট পাওয়া যায়নি। উপরের বাটন দিয়ে নতুন প্রোডাক্ট যুক্ত করুন।</p>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* REDESIGNED PRODUCT ADD / EDIT MODAL                           */}
      {/* ============================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  {editingProductId ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {editingProductId ? "প্রোডাক্ট সম্পাদন করুন" : "নতুন ডিজিটাল প্রোডাক্ট / টুলস যুক্ত করুন"}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    সংরক্ষণ করার সাথে সাথে ওয়েবসাইট এবং ক্যাটাগরিতে আপডেট হবে
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* ⚡ AI Product Details Generator Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/60 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border-2 border-indigo-200/80 dark:border-indigo-800/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                        AI প্রোডাক্ট ডিটেইলস জেনারেটর (OpenRouter Powered)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        শুধু কিওয়ার্ড লিখুন — এআই নিজে থেকেই আকর্ষনীয় টাইটেল, বিবরণ, ফিচার ও দাম লিখে দিবে!
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                    অটোমেটেড
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={aiKeyword}
                    onChange={(e) => setAiKeyword(e.target.value)}
                    placeholder="মূল কিওয়ার্ড লিখুন (e.g. Facebook Lead Scraper, Canva Pro Lifetime, SEO Booster...)"
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI || !aiKeyword.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all shrink-0 hover:scale-[1.02] active:scale-95"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI জেনারেট করছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>বিবরণ জেনারেট করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  ১. মৌলিক তথ্য
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      টুলস / কোর্সের নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Facebook Lead Scraper Pro"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Slug (URL) *
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setIsSlugManual(true);
                      }}
                      placeholder="e.g. facebook-lead-scraper-pro"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ক্যাটাগরি নির্বাচন *
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      মূল মূল্য (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      অফার / ডিসকাউন্ট মূল্য (৳)
                    </label>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="e.g. 1200"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 font-bold"
                    />
                  </div>
                </div>

                {/* Billing Type & Subscription Period */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    বিলিং ধরন (Billing Type) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setBillingType("one_time")}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        billingType === "one_time"
                          ? "bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingType"
                        checked={billingType === "one_time"}
                        onChange={() => setBillingType("one_time")}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="block text-xs">এককালীন লাইফটাইম (One-Time)</span>
                        <span className="text-[10px] text-slate-500 font-normal">একবার কিনলে আজীবন অ্যাক্সেস</span>
                      </div>
                    </label>

                    <label
                      onClick={() => setBillingType("subscription")}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        billingType === "subscription"
                          ? "bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingType"
                        checked={billingType === "subscription"}
                        onChange={() => setBillingType("subscription")}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="block text-xs">মেয়াদভিত্তিক সাবস্ক্রিপশন (Subscription)</span>
                        <span className="text-[10px] text-slate-500 font-normal">মাসিক, ত্রৈমাসিক বা বাৎসরিক মেয়াদ</span>
                      </div>
                    </label>
                  </div>

                  {billingType === "subscription" && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        সাবস্ক্রিপশনের মেয়াদ নির্বাচন করুন *
                      </label>
                      <select
                        value={subscriptionPeriod}
                        onChange={(e) => setSubscriptionPeriod(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      >
                        <option value="1_month">১ মাস (Monthly - 30 Days)</option>
                        <option value="2_months">২ মাস (2 Months - 60 Days)</option>
                        <option value="3_months">৩ মাস (Quarterly - 90 Days)</option>
                        <option value="6_months">৬ মাস (Half-Yearly - 180 Days)</option>
                        <option value="1_year">১ বছর (Yearly - 365 Days)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        অর্ডার অনুমোদিত হলে স্বয়ংক্রিয়ভাবে গ্রাহকের সাবস্ক্রিপশন ক্যালকুলেট হয়ে অ্যাডমিন ও ইউজার ড্যাশবোর্ডে যুক্ত হবে।
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Version and Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      সফটওয়্যার ভার্সন (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="e.g. 1.0.0 (না দিলে ফাঁকা রাখুন)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ফাইল সাইজ (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={fileSize}
                      onChange={(e) => setFileSize(e.target.value)}
                      placeholder="e.g. 15 MB (না দিলে ফাঁকা রাখুন)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DYNAMIC DELIVERY METHOD */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  ২. ডেলিভারি ধরন ও এক্সেস
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProductType("file")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      productType === "file"
                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40"
                    }`}
                  >
                    <HardDrive className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        সরাসরি ফাইল ডাউনলোড (Cloudflare R2)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        গ্রাহক পেমেন্ট শেষে এক ক্লিকে হাই-স্পিড সিকিউর জিপ ফাইল ডাউনলোড করবে।
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductType("link")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      productType === "link"
                        ? "border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40"
                    }`}
                  >
                    <ExternalLink className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        ৩য়-পক্ষ সাইট / গুগল ড্রাইভ লিংক (Access Now)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        কোর্স বা ড্রাইভ লিংকের ক্ষেত্রে গ্রাহক 'Access Now' বাটনে ক্লিক করে সরাসরি এক্সেস পাবে।
                      </span>
                    </div>
                  </button>
                </div>

                {productType === "link" ? (
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
                    <label className="block text-xs font-bold text-purple-950 dark:text-purple-200">
                      ৩য়-পক্ষ ওয়েবসাইট বা Google Drive এক্সেস লিংক *
                    </label>
                    <input
                      type="url"
                      required
                      value={externalAccessUrl}
                      onChange={(e) => setExternalAccessUrl(e.target.value)}
                      placeholder="https://drive.google.com/... বা https://course.example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      গ্রাহকের পেমেন্ট অ্যাপ্রুভ হলে ট্র্যাকিং পেজ ও ড্যাশবোর্ডে এই লিংকটি দিয়ে 'Access Now' বাটন শো করবে।
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cloudflare R2 তে ডিজিটাল ফাইল আপলোড (Zip / Installer)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                      />
                      {uploadProgress && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                    </div>
                    {fileName && (
                      <span className="text-[11px] font-mono font-bold text-emerald-600 block">
                        বর্তমান ফাইল: {fileName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: THUMBNAIL IMAGE (WITH AUTO-COMPRESS & MEDIA LIBRARY SELECTOR) */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  ৩. থাম্বনেইল ছবি (অটো কম্প্রেস & মিডিয়া লাইব্রেরি)
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  {/* Live Thumbnail Preview */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-24 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 flex items-center justify-center relative shadow-sm">
                      {thumbnailPreview || thumbnailUrl ? (
                        <img
                          src={thumbnailPreview || thumbnailUrl}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct Upload Button (Auto Compresses < 100KB & auto-sets thumbnail) */}
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95">
                          {uploadingThumb ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              কম্প্রেস ও সেট হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              সরাসরি ছবি আপলোড করুন
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingThumb}
                            onChange={handleDirectThumbnailUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Pick from Media Library Button */}
                        <button
                          type="button"
                          onClick={openMediaPicker}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          মিডিয়া লাইব্রেরি থেকে সিলেক্ট করুন
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        ⚡ সরাসরি আপলোড করলে ছবি অটোমেটিক <span className="font-bold text-emerald-600">&lt; ১০০ KB</span> সাইজে অপ্টিমাইজ হয়ে থাম্বনেইল হিসেবে সেট হয়ে যাবে। কোনো URL টাইপ করার প্রয়োজন নেই।
                      </p>

                      {thumbStatus && (
                        <span className="text-[11px] font-bold text-emerald-600 block animate-in fade-in">
                          {thumbStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Manual URL toggle if someone wants external link */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setShowManualUrlInput(!showManualUrlInput)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {showManualUrlInput ? "▲ ম্যানুয়াল ইমেজ URL লুকান" : "▼ ম্যানুয়াল ইমেজ URL বসাতে চান?"}
                    </button>

                    {showManualUrlInput && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={thumbnailUrl}
                          onChange={(e) => {
                            setThumbnailUrl(e.target.value);
                            setThumbnailPreview(e.target.value);
                          }}
                          placeholder="https://example.com/image.jpg"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: DESCRIPTIONS & FEATURES */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  ৪. বর্ণনা ও ফিচার তালিকা
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    সংক্ষিপ্ত বর্ণনা (Short Description - ১/২ লাইনে)
                  </label>
                  <input
                    type="text"
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    placeholder="e.g. ফেসবুক গ্রুপ থেকে টার্গেটেড লিড স্ক্র্যাপ করার সুপারফাস্ট স্ক্রিপ্ট।"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    বিস্তারিত বিবরণ (Full Description)
                  </label>
                  <textarea
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="প্রোডাক্ট বা কোর্স সম্পর্কে বিস্তারিত লিখুন..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ফিচারসমূহ (প্রতি লাইনে একটি করে ফিচার লিখুন)
                  </label>
                  <textarea
                    rows={4}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="100% Anti-Ban Algorithm&#10;CSV/Excel Export&#10;Lifetime Support"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_featured" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    হোমপেজে ফিচার্ড প্রোডাক্ট হিসেবে হাইলাইট করুন
                  </label>
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreview(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800/80 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>লাইভ প্রিভিউ দেখুন</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    বাতিল
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        সংরক্ষণ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {editingProductId ? "পরিবর্তনসমূহ সংরক্ষণ করুন" : "প্রোডাক্ট প্রকাশ করুন"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MEDIA LIBRARY PICKER POPUP MODAL                               */}
      {/* ============================================================== */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  মিডিয়া লাইব্রেরি থেকে ছবি সিলেক্ট করুন
                </h3>
                <span className="text-[11px] text-slate-500">
                  যেকোনো ছবির উপর ক্লিক করলেই তা প্রোডাক্টের থাম্বনেইল হিসেবে যুক্ত হবে
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingMedia ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => selectMediaItem(item)}
                      className="group cursor-pointer rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.03]"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                        <img
                          src={item.url}
                          alt={item.file_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          {item.file_size || "< 100 KB"}
                        </div>
                      </div>
                      <div className="p-2 text-center bg-white dark:bg-slate-900">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block group-hover:underline truncate">
                          সিলেক্ট করুন ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-slate-500 space-y-2">
                  <p>মিডিয়া লাইব্রেরিতে কোনো ছবি নেই।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. INTERACTIVE LIVE PREVIEW MODAL                              */}
      {/* ============================================================== */}
      {showLivePreview && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    প্রোডাক্ট লাইভ প্রিভিউ (Live Preview)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    পোস্ট বা সেভ করার আগে দেখুন ভিজিটররা এই প্রোডাক্টটি কেমন দেখতে পাবে
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreview(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Preview Content Grid */}
            <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-slate-50/50 dark:bg-slate-950/40">
              {/* Preview Notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  এটি একটি রিয়েল-টাইম প্রিভিউ। যেকোনো পরিবর্তন সাথে সাথে আপডেট হবে।
                </span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  /tools/{slug || "preview-slug"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 1. Homepage Card Preview (5 Cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    ১. হোমপেজ স্টোর কার্ড প্রিভিউ:
                  </span>
                  <div className="max-w-sm mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                    <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={thumbnailUrl || "/placeholder.svg"}
                        alt={title || "Product Title"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        {isFeatured && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
                            ★ FEATURED
                          </span>
                        )}
                        <span className="bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md">
                          {billingType === "subscription" ? "সাবস্ক্রিপশন" : "লাইফটাইম"}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
                        {productType === "link" ? "কোর্স / এক্সেস" : "ডিজিটাল টুলস"}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2">
                          {title || "আপনার প্রোডাক্টের আকর্ষণীয় নাম এখানে আসবে"}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                          {shortDesc || "প্রোডাক্টের সংক্ষিপ্ত ১/২ লাইনের বিবরণ এখানে সুন্দরভাবে দেখাবে।"}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                              ৳{salePrice || price || "৫০০"}
                            </span>
                            {salePrice && price && Number(price) > Number(salePrice) && (
                              <span className="text-xs text-slate-400 line-through">
                                ৳{price}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md">
                          অর্ডার করুন →
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Detail Page Overview (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    ২. ডিটেইলস পেজ প্রিভিউ:
                  </span>
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {title || "প্রোডাক্টের শিরোনাম"}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {shortDesc || "সংক্ষিপ্ত বিবরণ"}
                      </p>
                    </div>

                    {/* Price & CTA */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500 block">মূল্য:</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            ৳{salePrice || price || "৫০০"}
                          </span>
                          {salePrice && price && Number(price) > Number(salePrice) && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{price}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {billingType === "subscription" ? "সাবস্ক্রিপশন প্ল্যান" : "লাইফটাইম অ্যাক্সেস"}
                      </span>
                    </div>

                    {/* Features List */}
                    {featuresText.trim() && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          ফিচারসমূহ:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {featuresText
                            .split("\n")
                            .map((f) => f.trim())
                            .filter((f) => f.length > 0)
                            .map((f, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                              >
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span>{f}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Description */}
                    {desc.trim() && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          বিস্তারিত বিবরণ:
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          {desc}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                সবকিছু ঠিক থাকলে সরাসরি 'প্রোডাক্ট প্রকাশ করুন' বাটনে ক্লিক করে সেভ করুন।
              </span>
              <button
                type="button"
                onClick={() => setShowLivePreview(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
              >
                প্রিভিউ বন্ধ করুন ও সেভ করুন ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
