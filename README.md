# 🚀 ToolsHub BD - Cloudflare Edge Digital Products & Tools Platform

একটি অত্যাধুনিক, আল্ট্রা-ফাস্ট ডিজিটাল প্রোডাক্ট ও টুলস সেলিং প্ল্যাটফর্ম যা **Next.js 15 (Edge Runtime)**, **Cloudflare D1 (SQL with High-Speed Indexes)** এবং **Cloudflare R2 (Object Storage)** এর উপর নির্মিত।

---

## 🌟 প্রধান ফিচারসমূহ (Features)

1. **ডিজিটাল প্রোডাক্ট ও টুলস স্টোর:**
   - সফটওয়্যার স্ক্রিপ্ট, এসইও টুলস, বট, সোর্স কোড বিক্রি।
   - ইনস্ট্যান্ট সিকিউর ডাউনলোড লিংক ও লাইসেন্স কী ডেলিভারি।
   - ক্লাউডফ্লেয়ার R2 থেকে প্রি-সাইনড/সিকিউর ফাইল স্ট্রিমিং (পাইরেসি রোধে ডাউনলোড লিমিট ও টোকেন সিস্টেম)।

2. **পাওয়ারফুল অ্যাডমিন প্যানেল:**
   - **ড্যাশবোর্ড ওভারভিউ:** রেভিনিউ, সেলস চার্ট, পেন্ডিং অর্ডার ও সাম্প্রতিক অর্ডার মনিটরিং।
   - **প্রোডাক্টস ম্যানেজার:** সরাসরি ক্লাউডফ্লেয়ার R2-তে Zip/ফাইল আপলোড, মূল্য, অফার ডিসকাউন্ট এবং ফিচার নিয়ন্ত্রণ।
   - **অর্ডার ও ডেলিভারি লগ:** গ্রাহকের পাঠানো TrxID এক ক্লিকে যাচাই করে অর্ডার অ্যাপ্রুভ বা রিজেক্ট এবং কাস্টম লাইসেন্স কী ডেলিভারি।
   - **পেমেন্ট মেথড ম্যানেজার:** বিকাশ (Send Money), নগদ (Send Money), ক্রিপ্টো (USDT TRC20/BEP20) অন/অফ করা এবং আনলিমিটেড নতুন পেমেন্ট মেথড যুক্ত করার সুবিধা।
   - **হেডার ও ফুটার বিল্ডার:** সাইটের লোগো, শিরোনাম, মেনু লিংক, ফুটার কপিরাইট ও সোশ্যাল লিংক অ্যাডমিন থেকে পরিবর্তনযোগ্য।
   - **কাস্টম কোড ইনজেকশন:** `<head>` এবং `<body>` ট্যাগে যেকোনো স্ক্রিপ্ট (GTM, Google Analytics, Custom CSS) ইনসার্ট করার সুবিধা।
   - **Facebook Pixel & CAPI:** ব্রাউজার পিক্সেলের সাথে সার্ভার-সাইড Meta Conversion API (CAPI) ডেটা ডিডুপ্লিকেশন (`event_id`) সহ কনফিগারেশন।
   - **স্মার্ট AI চ্যাটবট:** Google Gemini (Gemini 1.5 Flash) এবং OpenRouter (Llama 3/DeepSeek) এআই মডেল যুক্ত ও সিস্টেম প্রম্পট কাস্টমাইজেশন।

3. **মডার্ন ও রেস্পন্সিভ ইউজার ইন্টারফেস:**
   - মিনিমাল লাইট ও ডার্ক মোড (Smooth Theme Switcher)।
   - মোবাইল-ফ্রেন্ডলি ফ্লোয়েটিং এআই চ্যাটবট উইজেট।
   - কাস্টমারদের জন্য স্বয়ংক্রিয় অর্ডার ট্র্যাকিং ও রি-ডাউনলোড পেজ (`/track-order`)।

---

## 🛠️ ক্লাউডফ্লেয়ার কনফিগারেশন বিবরণ (Cloudflare Setup)

- **Worker / Pages Project Name:** `tootls`
- **ডোমেন (Domain):** `sohag.com.bd`
- **Cloudflare D1 Database Name:** `tools`
- **Cloudflare D1 Database ID:** `c81800b6-11e0-4779-a37f-2bfb6a13ebaa`
- **Cloudflare R2 Bucket Name:** `tools-media`

---

## 🚀 ক্লাউডফ্লেয়ারে ডেপ্লয় করার নিয়মাবলী (Deployment Steps)

### ধাপ ১: D1 ডেটাবেজ স্কিমা এক্সিকিউট করুন
প্রোডাকশন D1 ডেটাবেজে টেবিল ও ইনডেক্স তৈরির জন্য নিচের কমান্ডটি চালান:
```bash
npx wrangler d1 execute tools --remote --file=./schema.sql
```
*(লোকাল টেস্টের জন্য: `npx wrangler d1 execute tools --local --file=./schema.sql`)*

### ধাপ ২: Cloudflare R2 বাকেট নিশ্চিত করুন
আপনার ক্লাউডফ্লেয়ার ড্যাশবোর্ডে `tools-media` নামের R2 বাকেটটি তৈরি করা আছে কি না নিশ্চিত করুন:
```bash
npx wrangler r2 bucket create tools-media
```

### ধাপ ৩: ক্লাউডফ্লেয়ারে বিল্ড ও ডেপ্লয় করুন
```bash
npm run deploy
```
অথবা Cloudflare Dashboard (Workers & Pages) এর সাথে আপনার গিট রিপোজিটরি কানেক্ট করে বিল্ড কমান্ড দিন:
- **Build command:** `npm run pages:build`
- **Build output directory:** `.vercel/output/static`
- **Environment compatibility flag:** `nodejs_compat`

---

## 🔑 অ্যাডমিন লগইন ক্রেডেনশিয়াল (Default Credentials)

- **অ্যাডমিন URL:** `/admin` অথবা `/admin/login`
- **ডিফল্ট ইউজারনেম:** `admin`
- **ডিফল্ট পাসওয়ার্ড:** `admin@123`
*(লগইন করার পর সেটিংস থেকে পাসওয়ার্ড পরিবর্তন করে নিতে পারবেন)*

---

## 📁 ডিরেক্টরি কাঠামো (Directory Overview)

```
d:\vs\tools\
├── src/
│   ├── app/
│   │   ├── admin/                # অ্যাডমিন প্যানেলের সব মডিউল
│   │   │   ├── ai-settings/      # Gemini & OpenRouter AI সেটিংস
│   │   │   ├── custom-code/      # Header Code & Meta CAPI পিক্সেল
│   │   │   ├── header-footer/    # হেডার ও ফুটার ডায়নামিক বিল্ডার
│   │   │   ├── orders/           # অর্ডার ভেরিফাই ও TrxID অ্যাপ্রুভাল
│   │   │   ├── payment-methods/  # বিকাশ, নগদ, ক্রিপ্টো সেটিংস
│   │   │   └── products/         # ডিজিটাল টুলস আপলোড ও ম্যানেজমেন্ট
│   │   ├── api/                  # Edge API রুটস (Chat, Orders, CAPI, Upload, R2)
│   │   ├── checkout/[slug]/      # ডায়নামিক পেমেন্ট ও TrxID সাবমিশন পেজ
│   │   ├── download/[token]/     # ক্লাউডফ্লেয়ার R2 সিকিউর ডাউনলোড হ্যান্ডলার
│   │   ├── tools/[slug]/         # টুলস সিঙ্গেল ডিটেইল ও প্রিভিউ পেজ
│   │   ├── track-order/          # কাস্টমার ট্র্যাকিং ও লাইসেন্স কী পেজ
│   │   ├── layout.tsx            # রুট লেআউট (পিক্সেল ও কোড ইনজেকশন সহ)
│   │   └── page.tsx              # আধুনিক হোম পেজ ও টুলস শোকেস
│   ├── components/               # Navbar, Footer, AIChatWidget, ThemeToggle, ProductCard
│   └── lib/                      # D1 Database, R2 Object Storage, Meta CAPI
├── schema.sql                    # D1 অপটিমাইজড স্কিমা ও সিড ডেটা
├── wrangler.toml                 # ক্লাউডফ্লেয়ার কনফিগারেশন ফাইল
└── package.json
```
