"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CreditCard,
  Code,
  Sliders,
  Bot,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Wrench,
  ShieldAlert,
  ImageIcon,
  Loader2,
  Ticket,
  Users,
  CalendarClock,
  Mail,
  Tag,
  Headphones
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(pathname !== "/admin/login");

  // Authentication guard: Protect all admin pages
  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthChecking(false);
      return;
    }

    let isMounted = true;
    async function verifyAdminAuth() {
      try {
        const res = await fetch("/api/admin/auth");
        const data = await res.json();
        if (!data.authenticated) {
          router.replace("/admin/login");
        } else {
          if (isMounted) setAuthChecking(false);
        }
      } catch (err) {
        router.replace("/admin/login");
      }
    }

    verifyAdminAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  // If on login page, don't show admin sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Show secure loader while verifying admin credentials
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white tracking-tight">অ্যাডমিন সিকিউরিটি যাচাই হচ্ছে...</p>
          <p className="text-xs text-slate-400">অননুমোদিত অ্যাক্সেস সুরক্ষিত করা হচ্ছে</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "ড্যাশবোর্ড", href: "/admin", icon: LayoutDashboard },
    { label: "হোমপেজ ও কন্টেন্ট", href: "/admin/homepage", icon: Sliders },
    { label: "যোগাযোগ পেজ", href: "/admin/contact", icon: Headphones },
    { label: "প্রোডাক্টস / টুলস", href: "/admin/products", icon: Package },
    { label: "মিডিয়া লাইব্রেরি", href: "/admin/media", icon: ImageIcon },
    { label: "অর্ডার ও ডেলিভারি", href: "/admin/orders", icon: ShoppingBag },
    { label: "ডিসকাউন্ট ও প্রমো কোড", href: "/admin/promo-codes", icon: Tag },
    { label: "ইউজার তালিকা", href: "/admin/users", icon: Users },
    { label: "সাবস্ক্রিপশন", href: "/admin/subscriptions", icon: CalendarClock },
    { label: "ইমেইল ও SMTP সেটিংস", href: "/admin/email-settings", icon: Mail },
    { label: "সাপোর্ট টিকিটস", href: "/admin/tickets", icon: Ticket },
    { label: "পেমেন্ট মেথড সেটিংস", href: "/admin/payment-methods", icon: CreditCard },
    { label: "হেডার ও ফুটার বিল্ডার", href: "/admin/header-footer", icon: Code },
    { label: "কোড ও ফেসবুক পিক্সেল", href: "/admin/custom-code", icon: Code },
    { label: "এআই চ্যাটবট সেটিংস", href: "/admin/ai-settings", icon: Bot },
    { label: "সিকিউরিটি ও পাসওয়ার্ড", href: "/admin/security", icon: ShieldAlert },
  ];

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop & Mobile) */}
      <aside
        className={`${
          mobileSidebarOpen ? "block" : "hidden"
        } lg:block w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 lg:min-h-screen p-5 flex flex-col justify-between`}
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
                  Admin Panel
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                  ToolsHub BD
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>লাইভ সাইট দেখুন</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট করুন</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
