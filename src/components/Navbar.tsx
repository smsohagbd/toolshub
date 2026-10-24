"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Wrench, Menu, X, Search, User, LogIn, UserPlus, LayoutDashboard, LogOut } from "lucide-react";
import { NavItem } from "@/lib/types";

interface NavbarProps {
  siteTitle?: string;
  logoUrl?: string;
  navItems?: NavItem[];
}

export function Navbar({ siteTitle = "ToolsHub BD", logoUrl, navItems = [] }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const defaultNav: NavItem[] = [
    { label: "হোম", url: "/" },
    { label: "টুলস ও কোর্স", url: "/#tools" },
    { label: "ফিচারসমূহ", url: "/#features" },
    { label: "অর্ডার ট্র্যাক", url: "/track-order" },
    { label: "যোগাযোগ", url: "/contact" }
  ];

  const rawLinks = navItems.length > 0 ? navItems : defaultNav;
  const links = rawLinks.map((item) => {
    const isContact =
      item.url === "/#contact" ||
      item.url === "#contact" ||
      item.url === "/#contack" ||
      item.url === "#contack";
    return isContact ? { ...item, url: "/contact" } : item;
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (e) {
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img src={logoUrl} alt={siteTitle} className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                {siteTitle}
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  PRO
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {links.map((item, idx) => (
              <Link
                key={idx}
                href={item.url}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Icons & User Authentication */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/track-order"
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              অর্ডার ট্র্যাক
            </Link>

            {/* User Logged In state */}
            {!loadingUser && user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ড্যাশবোর্ড</span>
                </Link>

                <button
                  onClick={handleLogout}
                  title="লগআউট"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !loadingUser ? (
              /* User Guest state */
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  লগইন
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  রেজিস্টার
                </Link>
              </div>
            ) : null}

            <ThemeToggle />

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-2 pb-5 space-y-2">
          {links.map((item, idx) => (
            <Link
              key={idx}
              href={item.url}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  আমার ড্যাশবোর্ড ({user.name.split(" ")[0]})
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  লগআউট করুন
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  লগইন
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                >
                  রেজিস্টার
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
