"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ChevronDown, Sparkles, Filter, Loader2 } from "lucide-react";

interface ProductShowcaseProps {
  products: any[];
  currencySymbol: string;
  categories?: any[];
}

export function ProductShowcase({
  products: initialProducts,
  currencySymbol,
  categories = []
}: ProductShowcaseProps) {
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live products from API on mount to ensure newly added D1 products are always visible
  useEffect(() => {
    let isMounted = true;
    async function fetchLiveProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            if (isMounted) {
              setProducts(data.products);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch live products:", e);
      }
    }

    fetchLiveProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by selected category
  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category_id === selectedCategory);

  // Show first 8 products initially (per requirement)
  const displayedProducts = showAll ? filteredProducts : filteredProducts.slice(0, 8);
  const remainingCount = filteredProducts.length - 8;

  // Build category list with "all"
  const defaultCategories = [
    { id: "all", name: "সব টুলস" },
    { id: "cat_automation", name: "Social Automation" },
    { id: "cat_seo", name: "SEO & Marketing" },
    { id: "cat_dev", name: "Web & App Scripts" },
    { id: "cat_ai", name: "AI Tools & Prompts" },
    { id: "cat_course", name: "Courses & Tutorials" }
  ];

  const availableCategories = categories.length > 0
    ? [{ id: "all", name: "সব টুলস" }, ...categories]
    : defaultCategories;

  return (
    <div className="space-y-8">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mr-2 shrink-0 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          ক্যাটাগরি:
        </span>
        {availableCategories.map((cat: any) => {
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === "all" 
            ? products.length 
            : products.filter((p) => p.category_id === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setShowAll(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                  : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            এই ক্যাটাগরিতে এখনও কোনো প্রোডাক্ট পাওয়া যায়নি।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      )}

      {/* "আরও প্রোডাক্ট দেখুন" Button if more than 8 products */}
      {filteredProducts.length > 8 && !showAll && (
        <div className="text-center pt-4">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm border-2 border-indigo-200 dark:border-indigo-800/80 shadow-lg shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95"
          >
            <span>আরও প্রোডাক্ট দেখুন ({remainingCount} টি বাকি)</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      )}
    </div>
  );
}
