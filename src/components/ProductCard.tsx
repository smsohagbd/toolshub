"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import { Download, Zap, Star, ShieldCheck, ArrowRight } from "lucide-react";
import { trackCustomEvent } from "./MetaPixel";

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
}

export function ProductCard({ product, currencySymbol = "৳" }: ProductCardProps) {
  const discountPercent = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  const handleBuyClick = () => {
    trackCustomEvent("InitiateCheckout", {
      currency: "BDT",
      value: product.sale_price || product.price,
      content_name: product.title,
      content_ids: [product.id]
    });
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between">
      {/* Top Media / Thumbnail */}
      <Link
        href={`/tools/${product.slug}`}
        className="block relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
      >
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.title}
            loading="lazy"
            decoding="async"
            width={400}
            height={225}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <Zap className="w-12 h-12 text-indigo-500/40" />
          </div>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md">
            {discountPercent}% OFF
          </div>
        )}

        {/* Version Badge */}
        <div className="absolute top-3 right-3 bg-slate-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
          v{product.version}
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Rating & Sales */}
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">5.0</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">({product.sales_count || 45}+ বিক্রীত)</span>
            </div>
            {product.file_size && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded text-[11px]">
                {product.file_size}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            <Link href={`/tools/${product.slug}`}>
              {product.title}
            </Link>
          </h3>

          {/* Short Description */}
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block leading-tight">মূল্য:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">
                {currencySymbol}
                {product.sale_price || product.price}
              </span>
              {product.sale_price && (
                <span className="text-xs line-through text-slate-600 dark:text-slate-400 font-semibold">
                  {currencySymbol}
                  {product.price}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/checkout/${product.slug}`}
              onClick={handleBuyClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
            >
              কিনুন
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
