-- ====================================================================
-- CLOUDFLARE D1 DATABASE SCHEMA FOR "tootls" (Tools Selling Platform)
-- Fully Optimized with High-Speed Indexes
-- ====================================================================

-- 1. GLOBAL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'general',
  site_title TEXT DEFAULT 'ToolsHub BD',
  site_tagline TEXT DEFAULT 'পাওয়ারফুল ডিজিটাল টুলস ও প্রিমিয়াম সফটওয়্যার স্টোর',
  site_description TEXT DEFAULT 'প্রফেশনাল ডিজিটাল টুলস, স্ক্রিপ্ট ও সফটওয়্যার কিনুন নিমেষেই বিকাশ, নগদ ও ক্রিপ্টোতে।',
  site_url TEXT DEFAULT 'https://sohag.com.bd',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  currency TEXT DEFAULT 'BDT',
  currency_symbol TEXT DEFAULT '৳',
  usd_rate REAL DEFAULT 120.0,
  
  -- Customizable Header & Footer JSON
  header_nav_json TEXT DEFAULT '[{"label":"হোম","url":"/"},{"label":"টুলস","url":"/#tools"},{"label":"ফিচার","url":"/#features"},{"label":"অর্ডার ট্র্যাকিং","url":"/track-order"},{"label":"যোগাযোগ","url":"/contact"}]',
  footer_nav_json TEXT DEFAULT '{"copyright":"© 2026 ToolsHub BD. All rights reserved. Built for speed on Cloudflare Workers.","support_email":"support@sohag.com.bd","support_phone":"+880 1700-000000","telegram_link":"https://t.me/sohag","facebook_link":"https://facebook.com/sohag"}',
  
  -- Page Content JSON & Support Channels
  homepage_json TEXT DEFAULT NULL,
  chatbot_faqs_json TEXT DEFAULT NULL,
  whatsapp_number TEXT DEFAULT '+8801700000000',
  telegram_channel TEXT DEFAULT 'toolshubbd',
  contact_page_json TEXT DEFAULT NULL,
  
  -- Custom Header & Footer Code Injection (Scripts, CSS, Analytics)
  header_code TEXT DEFAULT '<!-- Header Custom Scripts / GTM / Meta Tags -->',
  footer_code TEXT DEFAULT '<!-- Footer Custom Scripts / Live Chat -->',
  
  -- Meta / Facebook Pixel & Conversion API (CAPI)
  facebook_pixel_id TEXT DEFAULT '',
  facebook_access_token TEXT DEFAULT '',
  facebook_test_event_code TEXT DEFAULT '',
  facebook_tracking_enabled INTEGER DEFAULT 1,
  
  -- AI Chatbot Settings (OpenRouter / Gemini)
  ai_enabled INTEGER DEFAULT 1,
  ai_provider TEXT DEFAULT 'gemini', -- 'gemini' or 'openrouter'
  ai_model TEXT DEFAULT 'gemini-1.5-flash',
  ai_api_key TEXT DEFAULT '',
  ai_system_prompt TEXT DEFAULT 'আপনি ToolsHub BD এর একজন দক্ষ এআই হেল্প ডেস্ক সহকারী। গ্রাহকদের আমাদের ওয়েবসাইটের ডিজিটাল টুলস সম্পর্কে তথ্য দিন, পেমেন্ট পদ্ধতি (বিকাশ, নগদ, ক্রিপ্টো) বুঝিয়ে বলুন এবং বিনম্রভাবে সহায়তা করুন।',
  
  -- Admin Authentication
  admin_username TEXT DEFAULT 'smsohag',
  admin_email TEXT DEFAULT 'sohagbdmt@gmail.com',
  admin_password_hash TEXT DEFAULT 'b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471', -- SOhag999@#Runi11
  admin_otp_code TEXT,
  admin_otp_expires_at DATETIME,
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (Customer Authentication & Accounts)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'customer', -- 'customer', 'admin'
  reset_otp_code TEXT,
  reset_otp_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'Package',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 3. PRODUCTS / TOOLS TABLE
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  sale_price REAL,
  product_type TEXT DEFAULT 'file', -- 'file', 'license', 'link'
  r2_file_key TEXT, -- Key in Cloudflare R2 'tools-media' bucket
  file_name TEXT,
  file_size TEXT,
  version TEXT DEFAULT '1.0.0',
  billing_type TEXT DEFAULT 'one_time', -- 'one_time', 'subscription'
  subscription_period TEXT DEFAULT '1_month', -- '1_month', '2_months', '3_months', '6_months', '1_year'
  external_access_url TEXT,
  preview_url TEXT,
  thumbnail_url TEXT,
  screenshots_json TEXT DEFAULT '[]',
  features_json TEXT DEFAULT '[]',
  tags TEXT,
  is_featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published', -- 'published', 'draft'
  views_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Highly Optimized Indexes for Products
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status_featured ON products(status, is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_sales ON products(sales_count DESC);

-- 4. LICENSE KEYS POOL TABLE (For digital keys)
CREATE TABLE IF NOT EXISTS product_licenses (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  license_key TEXT NOT NULL,
  is_used INTEGER DEFAULT 0,
  order_id TEXT,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_licenses_product_unused ON product_licenses(product_id, is_used);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON product_licenses(order_id);

-- 5. PAYMENT GATEWAYS TABLE
CREATE TABLE IF NOT EXISTS payment_gateways (
  id TEXT PRIMARY KEY, -- 'bkash', 'nagad', 'crypto', 'manual'
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'send_money', 'crypto', 'gateway'
  is_enabled INTEGER DEFAULT 1,
  account_number TEXT,
  account_type TEXT DEFAULT 'Personal',
  instructions TEXT,
  charge_percent REAL DEFAULT 0.0,
  icon_name TEXT DEFAULT 'Wallet',
  badge_color TEXT DEFAULT 'pink',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_enabled ON payment_gateways(is_enabled, sort_order ASC);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'BDT',
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'refunded'
  sender_number TEXT, -- Customer's bKash/Nagad or Wallet Address
  transaction_id TEXT, -- TrxID submitted by customer
  admin_notes TEXT,
  download_token TEXT UNIQUE NOT NULL, -- Secret Token for R2 Download
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  delivered_license_key TEXT,
  coupon_code TEXT,
  discount_amount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Fast Lookup Indexes for Orders
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(download_token);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_trx ON orders(transaction_id);

-- 7. TRACKING / SERVER CAPI EVENTS TABLE
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  user_email TEXT,
  user_ip TEXT,
  user_agent TEXT,
  custom_data_json TEXT,
  fb_status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_event_id ON tracking_events(event_id);

-- 8. SUBSCRIPTIONS TABLE (For Recurring & Expiring Products)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  billing_cycle TEXT NOT NULL, -- '1_month', '2_months', '3_months', '6_months', '1_year'
  start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATETIME NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  order_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 9. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  event_type TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);

-- 10. CHAT HISTORY TABLE
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history (user_email);

-- 11. PROMO CODES / DISCOUNT COUPONS TABLE
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value REAL NOT NULL, -- e.g. 15 (15%) or 200 (৳200 flat)
  min_order_amount REAL DEFAULT 0,
  max_discount_amount REAL, -- cap for percentage discount
  usage_limit INTEGER DEFAULT 0, -- 0 = unlimited
  used_count INTEGER DEFAULT 0,
  expiry_date DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);

-- ====================================================================
-- INITIAL SEED DATA
-- ====================================================================

-- Default Settings Record
INSERT OR IGNORE INTO settings (id, site_title, site_tagline, currency, currency_symbol)
VALUES ('general', 'ToolsHub BD', 'প্রিমিয়াম ডিজিটাল টুলস ও অটোমেশন সফটওয়্যার', 'BDT', '৳');

-- Default Categories
INSERT OR IGNORE INTO categories (id, name, slug, icon, sort_order) VALUES
('cat_seo', 'SEO & Marketing', 'seo-marketing', 'TrendingUp', 1),
('cat_automation', 'Social Automation', 'social-automation', 'Cpu', 2),
('cat_dev', 'Web & App Scripts', 'web-scripts', 'Code', 3),
('cat_ai', 'AI Tools & Prompts', 'ai-tools', 'Bot', 4);

-- Default Payment Methods
INSERT OR IGNORE INTO payment_gateways (id, title, type, is_enabled, account_number, account_type, instructions, charge_percent, icon_name, badge_color, sort_order) VALUES
('bkash', 'bKash Send Money', 'send_money', 1, '01712-345678', 'Personal', '১. আপনার bKash অ্যাপে প্রবেশ করুন।\n২. "Send Money" অপশন সিলেক্ট করুন।\n৩. উপরের নম্বরে মোট টাকার পরিমাণ পাঠাবেন।\n৪. সফল হওয়ার পর Transaction ID (TrxID) এবং আপনার নম্বর নিচে লিখে অর্ডার কনফার্ম করুন।', 0.0, 'Smartphone', 'pink', 1),
('nagad', 'Nagad Send Money', 'send_money', 1, '01812-345678', 'Personal', '১. আপনার Nagad অ্যাপে প্রবেশ করে "Send Money" সিলেক্ট করুন।\n২. উপরের নম্বরে সঠিক টাকা পাঠান।\n৩. TrxID এবং প্রেরক নম্বর দিয়ে অর্ডার সাবমিট করুন। অ্যাডমিন অবিলম্বে ভেরিফাই করে ডাউনলোড লিংক চালু করে দিবে।', 0.0, 'Smartphone', 'orange', 2),
('crypto', 'Crypto (USDT TRC20 / BEP20)', 'crypto', 1, 'TJmXxxxxxxxxxxxxxxxxxxxxxxxxxxTRC20', 'TRC20 / BEP20', '১. যেকোনো ক্রিপ্টো ওয়ালেট (Binance, TrustWallet) থেকে USDT TRC-20 এড্রেসে সমপরিমাণ ডলার সেন্ড করুন।\n২. ট্রানজেকশন Hash (TXID) নিচে সাবমিট করুন। কনফার্মেশন পাওয়ার পর অটোমেটিক আপনার টুলস ডেলিভারি দেওয়া হবে।', 0.0, 'Bitcoin', 'emerald', 3);

-- Sample High Quality Digital Products
INSERT OR IGNORE INTO products (id, category_id, title, slug, short_description, description, price, sale_price, product_type, r2_file_key, file_name, file_size, version, is_featured, status, features_json) VALUES
(
  'prod_1',
  'cat_automation',
  'Facebook Auto Lead Scraper Pro 2026',
  'facebook-auto-lead-scraper-pro',
  'ফেসবুক গ্রুপ এবং পেজ থেকে টার্গেটেড ইমেইল ও ফোন নম্বর এক্সট্রাক্ট করার সুপারফাস্ট স্ক্রিপ্ট।',
  'এই টুলটির মাধ্যমে আপনি ফেসবুকের যেকোনো পাবলিক গ্রুপ বা পেজ থেকে নিমেষেই টার্গেটেড লিড, ইমেইল এবং ফোন নাম্বার স্ক্র্যাপ করতে পারবেন। এটি ক্লাউড রেডি এবং এন্টি-ব্যান প্রটেকশন সহ আসে। এক ক্লিকে CSV/Excel এক্সপোর্ট সুবিধা।',
  1500,
  950,
  'file',
  'tools/fb-scraper-pro-v2.zip',
  'fb-scraper-pro-v2.zip',
  '18.4 MB',
  '2.4.0',
  1,
  'published',
  '["100% Anti-Ban Algorithm","Export to CSV / Excel directly","Multi-threaded ultra high speed","Lifetime updates included"]'
),
(
  'prod_2',
  'cat_seo',
  'All-in-One SEO Backlink Indexer & Booster',
  'seo-backlink-indexer-booster',
  'নতুন ব্যাকলিংক এবং ব্লগের পেজ গুগলে ২৪-৪৮ ঘণ্টার মধ্যে ইনডেক্স করানোর স্বয়ংক্রিয় টুল।',
  'গুগলে ইনডেক্সিং সমস্যা সমাধান করুন। আপনার হাজার হাজার ব্যাকলিংক এবং ওয়েবসাইট URL স্বয়ংক্রিয়ভাবে গুগল ইনডেক্সিং API ও পিং সার্ভারের মাধ্যমে সাবমিট করে দ্রুত ইনডেক্স করুন।',
  2200,
  1400,
  'file',
  'tools/seo-indexer-v3.zip',
  'seo-indexer-v3.zip',
  '12.2 MB',
  '3.1.2',
  1,
  'published',
  '["Google Indexing API Integration","Bulk 50,000 URLs per day","Detailed success/failed report","Proxy & Captcha support"]'
),
(
  'prod_3',
  'cat_dev',
  'Next.js Full-Stack SaaS Starter Kit with Cloudflare',
  'nextjs-fullstack-saas-starter-kit',
  'Next.js 15, Cloudflare D1/R2, Tailwind, Auth সহ ফুল-স্ট্যাক প্রোডাকশন রেডি টেমপ্লেট।',
  'নিজের SaaS বা ডিজিটাল প্রোডাক্টের ওয়েবসাইট শুরু করার জন্য রেডিমেড সম্পূর্ণ বয়লারপ্লেট। রয়েছে ইউজার অথেন্টিকেশন, স্ট্রাইপ/বিকাশ পেমেন্ট, ডার্ক মোড এবং ক্লাউডফ্লেয়ার ডেব্লপমেন্ট গাইড।',
  3500,
  2400,
  'file',
  'tools/nextjs-saas-kit.zip',
  'nextjs-saas-kit.zip',
  '35.8 MB',
  '1.0.0',
  1,
  'published',
  '["Clean Architecture with App Router","Edge runtime compatibility","Admin panel & RBAC included","Figma design files included"]'
),
(
  'prod_4',
  'cat_ai',
  'WhatsApp AI Customer Support Bot (Python + Node.js)',
  'whatsapp-ai-customer-support-bot',
  'Gemini ও OpenAI চালিত চ্যাটবট যা আপনার পেজের বা শপের কাস্টমারকে স্বয়ংক্রিয় রিপ্লাই দিবে।',
  'আপনার ব্যবসার জন্য ২৪/৭ লাইভ এজেন্ট। এটি হোয়াটসঅ্যাপে যেকোনো গ্রাহকের প্রশ্নের উত্তর কাস্টম নলেজবেস অনুযায়ী দেয়, অর্ডার নেয় এবং গুগল শিটে ডাটা সংরক্ষণ করে।',
  2800,
  1800,
  'file',
  'tools/whatsapp-ai-bot.zip',
  'whatsapp-ai-bot.zip',
  '24.5 MB',
  '2.0.1',
  1,
  'published',
  '["Powered by Gemini Flash & GPT-4o","No monthly subscription needed","Google Sheets auto sync","Bangla & English smart NLP"]'
);

-- Default Promo Codes
INSERT OR IGNORE INTO promo_codes (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, is_active)
VALUES
('promo_welcome', 'WELCOME10', 'percentage', 10, 500, 300, 100, 0, 1),
('promo_save200', 'SAVE200', 'fixed', 200, 1000, 200, 50, 0, 1),
('promo_eid', 'EIDSPECIAL', 'percentage', 20, 1500, 500, 200, 0, 1);

