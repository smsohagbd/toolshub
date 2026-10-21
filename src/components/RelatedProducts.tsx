"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";

interface RelatedProductsProps {
  currentProductId: string;
  currencySymbol: string;
}

export function RelatedProducts({ currentProductId, currencySymbol }: RelatedProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRelated() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products)) {
            // Filter out current product and ensure only published products are shown
            const filtered = data.products.filter(
              (p: any) => p.id !== currentProductId && p.status === "published"
            );
            if (isMounted) {
              setProducts(filtered.slice(0, 4));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load related products:", e);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadRelated();
    return () => {
      isMounted = false;
    };
  }, [currentProductId]);

  // If no other products exist in the store, do not render this section at all!
  if (!isLoaded || products.length === 0) {
    return null;
  }

  return (
    <section className="pt-12 border-t border-slate-200 dark:border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            সম্পর্কিত টুলস ও কালেকশন
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            আরও কিছু জনপ্রিয় টুলস ও কোর্স
          </h2>
        </div>
        <Link
          href="/#tools"
          className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          সব টুলস দেখুন →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((rel: any) => (
          <ProductCard key={rel.id} product={rel} currencySymbol={currencySymbol} />
        ))}
      </div>
    </section>
  );
}
