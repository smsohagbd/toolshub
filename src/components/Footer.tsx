import Link from "next/link";
import { Wrench, Mail, Phone, Send, ShieldCheck, Zap } from "lucide-react";
import { FooterConfig } from "@/lib/types";

interface FooterProps {
  siteTitle?: string;
  config?: FooterConfig;
}

export function Footer({ siteTitle = "ToolsHub BD", config }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const copyright = config?.copyright || `© ${currentYear} ${siteTitle}. সর্বস্বত্ব সংরক্ষিত।`;
  const email = config?.support_email || "support@sohag.com.bd";
  const phone = config?.support_phone || "+880 1700-000000";

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                {siteTitle}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              আপনার ব্যবসার প্রসারে সবচেয়ে শক্তিশালী ডিজিটাল স্ক্রিপ্ট, এসইও ব্যাকলিংক টুলস, সোশ্যাল মিডিয়া অটোমেশন এবং প্রিমিয়াম সোর্স কোড। নিমেষেই বিকাশ, নগদ ও ক্রিপ্টোতে ইনস্ট্যান্ট ডেলিভারি।
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Zap className="w-3.5 h-3.5 fill-emerald-500" />
              ১০০% নিরাপদ লেনদেন ও ইনস্ট্যান্ট অটোমেটেড ডেলিভারি
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              দ্রুত লিংক
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/#tools" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  সব ডিজিটাল টুলস
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  অর্ডার স্ট্যাটাস ও ডাউনলোড
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  কেন আমাদের থেকে নিবেন?
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  যোগাযোগ ও হেল্পডেস্ক
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              সাপোর্ট ও যোগাযোগ
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                <a href={`mailto:${email}`} className="hover:underline">
                  {email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>{phone}</span>
              </li>
              {config?.telegram_link && (
                <li className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-500" />
                  <a href={config.telegram_link} target="_blank" rel="noreferrer" className="hover:underline">
                    Telegram Support
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>{copyright}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ১০০% ভেরিফাইড ডিজিটাল অ্যাসেট
            </span>
            <span>সুরক্ষিত ও বিশ্বস্ত প্ল্যাটফর্ম</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
