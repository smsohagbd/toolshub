import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getSiteSettings, getProducts } from "@/lib/db";
import { RelatedProducts } from "@/components/RelatedProducts";
import {
  ShieldCheck,
  Zap,
  Download,
  Star,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import type { Metadata } from "next";

export const runtime = "edge";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "টুলস পাওয়া যায়নি" };

  return {
    title: `${product.title} - ToolsHub BD`,
    description: product.short_description || product.description,
    openGraph: {
      title: product.title,
      description: product.short_description,
      images: product.thumbnail_url ? [product.thumbnail_url] : []
    }
  };
}

export default async function ToolDetailPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const settings = await getSiteSettings();

  if (!product) {
    notFound();
  }


  let features: string[] = [];
  try {
    if (product.features_json) {
      features = JSON.parse(product.features_json);
    }
  } catch (e) {}

  const discountPercent = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  const currencySymbol = settings?.currency_symbol || "৳";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-24 sm:pb-12">
      {/* 1. Primary Page Header with H1 for SEO & Accessibility */}
      <header className="space-y-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/#tools"
            className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            সকল টুলস ও কোর্স
          </Link>
          <span className="text-slate-400">/</span>
          <span className="font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            ডিজিটাল টুলস
          </span>
          <span className="text-slate-400">•</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
            v{product.version}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
          {product.title}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Product Media & Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-md">
            {product.thumbnail_url ? (
              <img
                src={product.thumbnail_url}
                alt={product.title}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                width={800}
                height={500}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500/20 to-purple-500/20">
                <Zap className="w-16 h-16 text-indigo-500" />
              </div>
            )}
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-sm px-3 py-1 rounded-full shadow-lg">
                {discountPercent}% OFF
              </div>
            )}
          </div>

          {/* Description Section with H2 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              টুলসটির বিবরণ ও কার্যপদ্ধতি
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description || product.short_description}
            </p>
          </div>

          {/* Features Checklist Section with H2 */}
          {features.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                প্রধান সুবিধাসমূহ (Key Features)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing & Purchase Card (Sticky) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                অনলাইন এক্টিভেশন ও লাইসেন্স
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                তাত্ক্ষণিক ডেলিভারি সুবিধা
              </div>
            </div>

            {/* Ratings & Sales count */}
            <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">5.0</span>
                <span>(সন্তুষ্ট ক্লায়েন্ট)</span>
              </div>
              <span>•</span>
              <span className="font-medium text-slate-600 dark:text-slate-400">{product.sales_count || 50}+ কপি বিক্রি হয়েছে</span>
            </div>

            {/* Price section */}
            <div className="space-y-1">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">অফার মূল্য:</span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-400">
                  {currencySymbol}
                  {product.sale_price || product.price}
                </span>
                {product.sale_price && (
                  <span className="text-base line-through text-slate-500 dark:text-slate-400 font-medium">
                    {currencySymbol}
                    {product.price}
                  </span>
                )}
              </div>
            </div>

            {/* CTA Buy Button */}
            <div className="space-y-3 pt-2">
              <Link
                href={`/checkout/${product.slug}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                এখনই কিনুন (বিকাশ / নগদ / ক্রিপ্টো)
                <ArrowRight className="w-5 h-5" />
              </Link>

              {product.preview_url && (
                <a
                  href={product.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  লাইভ প্রিভিউ / ডেমো দেখুন
                </a>
              )}
            </div>

            {/* Delivery Details */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>ফাইল সাইজ: {product.file_size || "15 MB"} (ইনস্ট্যান্ট ডাউনলোড)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>১০০% সেফ কোড ও লাইফটাইম ফ্রি আপডেট</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>হাই-স্পিড সিকিউর ডিরেক্ট ডাউনলোড লিংক</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Related Products */}
      <RelatedProducts currentProductId={product.id} currencySymbol={currencySymbol} />

      {/* Mobile Sticky Buy Now CTA Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-3 shadow-[0_-8px_25px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">অফার মূল্য:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {currencySymbol}{product.sale_price || product.price}
            </span>
            {product.sale_price && (
              <span className="text-xs text-slate-400 line-through">
                {currencySymbol}{product.price}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/checkout/${product.slug}`}
          className="flex-1 py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm text-center shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
        >
          <span>এখনই কিনুন</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
