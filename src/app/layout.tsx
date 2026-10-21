import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AIChatWidget } from "@/components/AIChatWidget";
import { MetaPixel } from "@/components/MetaPixel";
import { CodeInjector } from "@/components/CodeInjector";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings?.site_title || "ToolsHub BD"} - ${settings?.site_tagline || "প্রিমিয়াম ডিজিটাল টুলস ও স্ক্রিপ্ট"}`,
    description: settings?.site_description || "বিকাশ, নগদ ও ক্রিপ্টোতে প্রিমিয়াম ডিজিটাল সফটওয়্যার ও টুলস কিনুন।",
    metadataBase: new URL(settings?.site_url || "https://sohag.com.bd"),
    icons: {
      icon: settings?.favicon_url || "/favicon.ico"
    }
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  let navItems = [];
  try {
    if (settings?.header_nav_json) {
      navItems = JSON.parse(settings.header_nav_json);
    }
  } catch (e) {}

  let footerConfig = undefined;
  try {
    if (settings?.footer_nav_json) {
      footerConfig = JSON.parse(settings.footer_nav_json);
    }
  } catch (e) {}

  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        {/* Admin Injected Header Code (GTM, Scripts, Meta) */}
        {settings?.header_code && (
          <CodeInjector code={settings.header_code} location="header" />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        {/* Meta Pixel & Conversion API client tracker */}
        <MetaPixel
          pixelId={settings?.facebook_pixel_id}
          enabled={Boolean(settings?.facebook_tracking_enabled)}
        />

        {/* Global Navigation Bar */}
        <Navbar
          siteTitle={settings?.site_title}
          logoUrl={settings?.logo_url}
          navItems={navItems}
        />

        {/* Main Content Area */}
        <main className="flex-1">{children}</main>

        {/* Floating AI Chatbot (Gemini / OpenRouter) */}
        {Boolean(settings?.ai_enabled ?? 1) && <AIChatWidget />}

        {/* Global Footer */}
        <Footer
          siteTitle={settings?.site_title}
          config={footerConfig}
        />

        {/* Admin Injected Footer Code (Widgets, Custom scripts) */}
        {settings?.footer_code && (
          <CodeInjector code={settings.footer_code} location="footer" />
        )}
      </body>
    </html>
  );
}
