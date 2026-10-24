/**
 * Cloudflare D1 Database Helper with Universal Edge & Local Fallback Support
 * Works seamlessly in both Cloudflare Workers Edge runtime and local Next.js dev server.
 */

export interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results: T[]; success: boolean; meta: any }>;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

// Global in-memory / cache store for local dev fallback
let localStore: {
  settings?: any;
  categories?: any[];
  products?: any[];
  product_licenses?: any[];
  payment_gateways?: any[];
  orders?: any[];
  users?: any[];
  promo_codes?: any[];
  tracking_events?: any[];
} | null = null;

function initializeLocalMock() {
  if (localStore) return;
  localStore = {
    settings: {
      id: "general",
      site_title: "ToolsHub BD",
      site_tagline: "পাওয়ারফুল ডিজিটাল টুলস ও প্রিমিয়াম সফটওয়্যার স্টোর",
      site_description: "প্রফেশনাল ডিজিটাল টুলস, স্ক্রিপ্ট ও সফটওয়্যার কিনুন নিমেষেই বিকাশ, নগদ ও ক্রিপ্টোতে।",
      site_url: "https://sohag.com.bd",
      logo_url: "",
      favicon_url: "",
      currency: "BDT",
      currency_symbol: "৳",
      usd_rate: 120.0,
      header_nav_json: JSON.stringify([
        { label: "হোম", url: "/" },
        { label: "টুলস", url: "/#tools" },
        { label: "ফিচার", url: "/#features" },
        { label: "অর্ডার ট্র্যাকিং", url: "/track-order" },
        { label: "যোগাযোগ", url: "/contact" }
      ]),
      footer_nav_json: JSON.stringify({
        copyright: "© 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।",
        support_email: "support@sohag.com.bd",
        support_phone: "+880 1700-000000",
        telegram_link: "https://t.me/sohag",
        facebook_link: "https://facebook.com/sohag"
      }),
      whatsapp_number: "+8801700000000",
      telegram_channel: "toolshubbd",
      contact_page_json: "",
      header_code: "<!-- Header Custom Scripts / GTM -->",
      footer_code: "<!-- Footer Custom Scripts -->",
      facebook_pixel_id: "",
      facebook_access_token: "",
      facebook_test_event_code: "",
      facebook_tracking_enabled: 1,
      ai_enabled: 1,
      ai_provider: "gemini",
      ai_model: "gemini-1.5-flash",
      ai_api_key: "",
      admin_username: "smsohag",
      admin_email: "sohagbdmt@gmail.com",
      admin_password_hash: "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471" // SOhag999@#Runi11
    },
    categories: [
      { id: "cat_seo", name: "SEO & Marketing", slug: "seo-marketing", icon: "TrendingUp", sort_order: 1 },
      { id: "cat_automation", name: "Social Automation", slug: "social-automation", icon: "Cpu", sort_order: 2 },
      { id: "cat_dev", name: "Web & App Scripts", slug: "web-scripts", icon: "Code", sort_order: 3 },
      { id: "cat_ai", name: "AI Tools & Prompts", slug: "ai-tools", icon: "Bot", sort_order: 4 }
    ],
    products: [
      {
        id: "prod_luksc10",
        category_id: "cat_automation",
        title: "Muza Map",
        slug: "mouza-map",
        short_description: "মাত্র ১৯৯ টাকায় বাংলাদেশের যেকোনো এলাকার মৌজা ম্যাপ",
        description: "মাত্র ১৯৯ টাকায় বাংলাদেশের যেকোনো এলাকার মৌজা ম্যাপ (SA, BA, RS, CS) ঘরে বসেই বুঝে নিন! 🗺️আপনার কাঙ্ক্ষিত ম্যাপটি এখনই অর্ডার করতে নিচের \"ORDER NOW\" বাটনে ক্লিক করুন অথবা আমাদের ইনবক্স করুন।",
        price: 499,
        sale_price: 199,
        product_type: "link",
        r2_file_key: "tools/muza-mp.zip",
        file_name: "muza-mp.zip",
        file_size: "10 MB",
        version: "1.0.0",
        external_access_url: "https://priceindian.net/",
        preview_url: "",
        thumbnail_url: "https://tootls.pages.dev/api/media/thumbnails%2F1792519058335_mouza_map.webp",
        screenshots_json: "[]",
        features_json: JSON.stringify([
          "মাত্র ১৯৯ টাকায় বাংলাদেশের যেকোনো এলাকার মৌজা ম্যাপ (SA, BA, RS, CS) ঘরে বসেই বুঝে নিন! 🗺️আপনার কাঙ্ক্ষিত ম্যাপটি এখনই অর্ডার করতে নিচের \"ORDER NOW\" বাটনে ক্লিক করুন অথবা আমাদের ইনবক্স করুন।"
        ]),
        tags: "mouza,map,bangladesh",
        is_featured: 1,
        status: "published",
        views_count: 45,
        sales_count: 12,
        created_at: "2026-10-20 17:57:51",
        updated_at: "2026-10-20 18:29:07",
        billing_type: "one_time",
        subscription_period: "1_month"
      }
    ],
    payment_gateways: [
      {
        id: "bkash",
        title: "bKash Send Money",
        type: "send_money",
        is_enabled: 1,
        account_number: "01712-345678",
        account_type: "Personal",
        instructions: "১. আপনার bKash অ্যাপে প্রবেশ করুন।\n২. \"Send Money\" অপশন সিলেক্ট করুন।\n৩. উপরের নম্বরে মোট টাকার পরিমাণ পাঠাবেন।\n৪. সফল হওয়ার পর Transaction ID (TrxID) এবং আপনার নম্বর নিচে লিখে অর্ডার কনফার্ম করুন।",
        charge_percent: 0.0,
        icon_name: "Smartphone",
        badge_color: "pink",
        sort_order: 1
      },
      {
        id: "nagad",
        title: "Nagad Send Money",
        type: "send_money",
        is_enabled: 1,
        account_number: "01812-345678",
        account_type: "Personal",
        instructions: "১. আপনার Nagad অ্যাপে প্রবেশ করে \"Send Money\" সিলেক্ট করুন।\n২. উপরের নম্বরে সঠিক টাকা পাঠান।\n৩. TrxID এবং প্রেরক নম্বর দিয়ে অর্ডার সাবমিট করুন। অ্যাডমিন অবিলম্বে ভেরিফাই করে ডাউনলোড লিংক চালু করে দিবে।",
        charge_percent: 0.0,
        icon_name: "Smartphone",
        badge_color: "orange",
        sort_order: 2
      },
      {
        id: "crypto",
        title: "Crypto (USDT TRC20 / BEP20)",
        type: "crypto",
        is_enabled: 1,
        account_number: "TJmXxxxxxxxxxxxxxxxxxxxxxxxxxxTRC20",
        account_type: "TRC20 / BEP20",
        instructions: "১. যেকোনো ক্রিপ্টো ওয়ালেট (Binance, TrustWallet) থেকে USDT TRC-20 এড্রেসে সমপরিমাণ ডলার সেন্ড করুন।\n২. ট্রানজেকশন Hash (TXID) নিচে সাবমিট করুন। কনফার্মেশন পাওয়ার পর অটোমেটিক আপনার টুলস ডেলিভারি দেওয়া হবে।",
        charge_percent: 0.0,
        icon_name: "Bitcoin",
        badge_color: "emerald",
        sort_order: 3
      }
    ],
    orders: [
      {
        id: "ord_demo_1",
        order_number: "ORD-88214",
        customer_name: "হাসান মাহমুদ",
        customer_email: "hasan@example.com",
        customer_phone: "01700112233",
        product_id: "prod_luksc10",
        product_title: "Muza Map",
        amount: 950,
        currency: "BDT",
        payment_method: "bkash",
        payment_status: "approved",
        sender_number: "01712998877",
        transaction_id: "9K8J7H6G5F",
        admin_notes: "Payment verified via bKash",
        download_token: "d9a1841f-827c-47bc-857c-2ea9087c88b1",
        download_count: 1,
        max_downloads: 5,
        delivered_license_key: "FB-SCRP-9921-X812-PRO",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    product_licenses: [],
    promo_codes: [
      {
        id: "promo_welcome",
        code: "WELCOME10",
        discount_type: "percentage",
        discount_value: 10,
        min_order_amount: 500,
        max_discount_amount: 300,
        usage_limit: 100,
        used_count: 5,
        expiry_date: "2026-12-31T23:59:59Z",
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "promo_save200",
        code: "SAVE200",
        discount_type: "fixed",
        discount_value: 200,
        min_order_amount: 1000,
        max_discount_amount: 200,
        usage_limit: 50,
        used_count: 12,
        expiry_date: "2026-12-31T23:59:59Z",
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "promo_eid",
        code: "EIDSPECIAL",
        discount_type: "percentage",
        discount_value: 20,
        min_order_amount: 1500,
        max_discount_amount: 500,
        usage_limit: 200,
        used_count: 0,
        expiry_date: "2026-12-31T23:59:59Z",
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    tracking_events: []
  };
}

/**
 * Universal D1 Database Client
 */
export function getDB(): D1Database {
  // 1. Check if running inside Cloudflare Workers Edge runtime with DB binding
  if (typeof (globalThis as any).DB !== "undefined" && (globalThis as any).DB?.prepare) {
    return (globalThis as any).DB;
  }
  if (typeof process !== "undefined" && (process.env as any).DB?.prepare) {
    return (process.env as any).DB;
  }

  // 2. High-performance Mock Driver for Local Next.js dev
  initializeLocalMock();

  return {
    prepare(query: string): D1PreparedStatement {
      const trimmed = query.trim();
      let boundParams: any[] = [];

      const statement: D1PreparedStatement = {
        bind(...params: any[]) {
          boundParams = params;
          return statement;
        },
        async all<T = any>() {
          const lower = trimmed.toLowerCase();
          
          if (lower.startsWith("select * from settings") || lower.includes("from settings")) {
            return { results: [localStore!.settings] as T[], success: true, meta: {} };
          }
          
          if (lower.includes("from categories")) {
            return { results: (localStore!.categories || []) as T[], success: true, meta: {} };
          }
          
          if (lower.includes("from products")) {
            let res = [...(localStore!.products || [])];
            if (boundParams.length > 0) {
              const param = boundParams[0];
              // check if looking for slug
              if (lower.includes("slug = ?")) {
                res = res.filter((p) => p.slug === param);
              } else if (lower.includes("id = ?")) {
                res = res.filter((p) => p.id === param);
              } else if (lower.includes("category_id = ?")) {
                res = res.filter((p) => p.category_id === param);
              }
            }
            return { results: res as T[], success: true, meta: {} };
          }
          
          if (lower.includes("from payment_gateways")) {
            let res = [...(localStore!.payment_gateways || [])];
            if (lower.includes("is_enabled = 1")) {
              res = res.filter((g) => g.is_enabled === 1);
            }
            return { results: res as T[], success: true, meta: {} };
          }
          
          if (lower.includes("from orders")) {
            let res = [...(localStore!.orders || [])];
            if (boundParams.length > 0) {
              const param = boundParams[0];
              if (lower.includes("order_number = ?") || lower.includes("id = ?")) {
                res = res.filter((o) => o.order_number === param || o.id === param);
              } else if (lower.includes("download_token = ?")) {
                res = res.filter((o) => o.download_token === param);
              } else if (lower.includes("customer_email = ?")) {
                res = res.filter((o) => String(o.customer_email).toLowerCase() === String(param).toLowerCase());
              }
            }
            return { results: res as T[], success: true, meta: {} };
          }

          if (lower.includes("from users")) {
            let res = [...(localStore!.users || [])];
            if (boundParams.length > 0) {
              const param = boundParams[0];
              if (lower.includes("email = ?")) {
                res = res.filter((u) => String(u.email).toLowerCase() === String(param).toLowerCase());
              } else if (lower.includes("id = ?")) {
                res = res.filter((u) => u.id === param);
              }
            }
            return { results: res as T[], success: true, meta: {} };
          }

          if (lower.includes("from promo_codes")) {
            let res = [...(localStore!.promo_codes || [])];
            if (boundParams.length > 0) {
              const param = boundParams[0];
              if (lower.includes("code = ?") || lower.includes("upper(code) = ?") || lower.includes("upper(code) = upper(?)")) {
                res = res.filter((c) => String(c.code).toUpperCase() === String(param).toUpperCase());
              } else if (lower.includes("id = ?")) {
                res = res.filter((c) => c.id === param);
              }
            }
            if (lower.includes("is_active = 1")) {
              res = res.filter((c) => c.is_active === 1);
            }
            return { results: res as T[], success: true, meta: {} };
          }

          return { results: [] as T[], success: true, meta: {} };
        },
        async first<T = any>(colName?: string): Promise<T | null> {
          const res = await this.all<T>();
          if (res.results && res.results.length > 0) {
            const row = res.results[0] as any;
            return colName ? row[colName] : row;
          }
          return null;
        },
        async run() {
          const lower = trimmed.toLowerCase();

          // Users insertion
          if (lower.startsWith("insert into users")) {
            const newUser: any = {
              id: boundParams[0],
              name: boundParams[1],
              email: String(boundParams[2]).toLowerCase().trim(),
              password_hash: boundParams[3],
              role: boundParams[4] || "customer",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            localStore!.users = localStore!.users || [];
            localStore!.users.unshift(newUser);
            return { success: true, meta: { changes: 1 } };
          }
          if (lower.startsWith("insert into orders")) {
            // boundParams matching order fields
            const newOrder: any = {
              id: boundParams[0],
              order_number: boundParams[1],
              customer_name: boundParams[2],
              customer_email: boundParams[3],
              customer_phone: boundParams[4],
              product_id: boundParams[5],
              product_title: boundParams[6],
              amount: boundParams[7],
              currency: boundParams[8] || "BDT",
              payment_method: boundParams[9],
              payment_status: boundParams[10] || "pending",
              sender_number: boundParams[11],
              transaction_id: boundParams[12],
              admin_notes: boundParams[13] || "",
              download_token: boundParams[14],
              download_count: 0,
              max_downloads: 5,
              delivered_license_key: boundParams[15] || "",
              coupon_code: boundParams[16] || null,
              discount_amount: Number(boundParams[17]) || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            localStore!.orders?.unshift(newOrder);
            return { success: true, meta: { changes: 1 } };
          }

          // Promo Codes insertion
          if (lower.startsWith("insert into promo_codes")) {
            const newPromo: any = {
              id: boundParams[0],
              code: String(boundParams[1]).toUpperCase().trim(),
              discount_type: boundParams[2] || "percentage",
              discount_value: Number(boundParams[3]) || 0,
              min_order_amount: Number(boundParams[4]) || 0,
              max_discount_amount: boundParams[5] ? Number(boundParams[5]) : null,
              usage_limit: Number(boundParams[6]) || 0,
              used_count: Number(boundParams[7]) || 0,
              expiry_date: boundParams[8] || null,
              is_active: boundParams[9] !== undefined ? Number(boundParams[9]) : 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            localStore!.promo_codes = localStore!.promo_codes || [];
            localStore!.promo_codes.unshift(newPromo);
            return { success: true, meta: { changes: 1 } };
          }

          // Promo Codes update
          if (lower.startsWith("update promo_codes")) {
            if (lower.includes("used_count = used_count + 1")) {
              const promoIdOrCode = boundParams[0];
              const p = localStore!.promo_codes?.find((c) => c.id === promoIdOrCode || c.code === promoIdOrCode);
              if (p) {
                p.used_count = (p.used_count || 0) + 1;
                p.updated_at = new Date().toISOString();
              }
            } else {
              const id = boundParams[boundParams.length - 1];
              const p = localStore!.promo_codes?.find((c) => c.id === id);
              if (p) {
                if (boundParams[0] !== undefined) p.code = String(boundParams[0]).toUpperCase().trim();
                if (boundParams[1] !== undefined) p.discount_type = boundParams[1];
                if (boundParams[2] !== undefined) p.discount_value = Number(boundParams[2]);
                if (boundParams[3] !== undefined) p.min_order_amount = Number(boundParams[3]);
                if (boundParams[4] !== undefined) p.max_discount_amount = boundParams[4] ? Number(boundParams[4]) : null;
                if (boundParams[5] !== undefined) p.usage_limit = Number(boundParams[5]);
                if (boundParams[6] !== undefined) p.expiry_date = boundParams[6] || null;
                if (boundParams[7] !== undefined) p.is_active = Number(boundParams[7]);
                p.updated_at = new Date().toISOString();
              }
            }
            return { success: true, meta: { changes: 1 } };
          }

          // Promo Codes delete
          if (lower.startsWith("delete from promo_codes")) {
            const id = boundParams[0];
            if (localStore!.promo_codes) {
              localStore!.promo_codes = localStore!.promo_codes.filter((c) => c.id !== id);
            }
            return { success: true, meta: { changes: 1 } };
          }

          // Order status update
          if (lower.startsWith("update orders")) {
            if (boundParams.length >= 2) {
              const status = boundParams[0];
              const orderId = boundParams[boundParams.length - 1];
              const ord = localStore!.orders?.find((o) => o.id === orderId || o.order_number === orderId);
              if (ord) {
                ord.payment_status = status;
                ord.updated_at = new Date().toISOString();
              }
            }
            return { success: true, meta: { changes: 1 } };
          }

          // Products update / insert
          if (lower.startsWith("insert into products")) {
            const newProd: any = {
              id: boundParams[0],
              category_id: boundParams[1],
              title: boundParams[2],
              slug: boundParams[3],
              short_description: boundParams[4],
              description: boundParams[5],
              price: boundParams[6],
              sale_price: boundParams[7],
              product_type: boundParams[8] || "file",
              r2_file_key: boundParams[9] || "",
              file_name: boundParams[10] || "",
              file_size: boundParams[11] || "",
              version: boundParams[12] || "1.0.0",
              preview_url: boundParams[13] || "",
              thumbnail_url: boundParams[14] || "",
              screenshots_json: boundParams[15] || "[]",
              features_json: boundParams[16] || "[]",
              tags: boundParams[17] || "",
              is_featured: boundParams[18] || 0,
              status: boundParams[19] || "published",
              views_count: 0,
              sales_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            localStore!.products?.unshift(newProd);
            return { success: true, meta: { changes: 1 } };
          }

          // Settings update
          if (lower.startsWith("update settings")) {
            if (localStore?.settings && boundParams.length >= 17) {
              const s = localStore.settings;
              if (boundParams[0] !== undefined) s.site_title = boundParams[0];
              if (boundParams[1] !== undefined) s.site_tagline = boundParams[1];
              if (boundParams[2] !== undefined) s.site_description = boundParams[2];
              if (boundParams[3] !== undefined) s.logo_url = boundParams[3];
              if (boundParams[4] !== undefined) s.header_nav_json = boundParams[4];
              if (boundParams[5] !== undefined) s.footer_nav_json = boundParams[5];
              if (boundParams[6] !== undefined) s.header_code = boundParams[6];
              if (boundParams[7] !== undefined) s.footer_code = boundParams[7];
              if (boundParams[8] !== undefined) s.facebook_pixel_id = boundParams[8];
              if (boundParams[9] !== undefined) s.facebook_access_token = boundParams[9];
              if (boundParams[10] !== undefined) s.facebook_test_event_code = boundParams[10];
              if (boundParams[11] !== undefined) s.facebook_tracking_enabled = boundParams[11];
              if (boundParams[12] !== undefined) s.ai_enabled = boundParams[12];
              if (boundParams[13] !== undefined) s.ai_provider = boundParams[13];
              if (boundParams[14] !== undefined) s.ai_model = boundParams[14];
              if (boundParams[15] !== undefined) s.ai_api_key = boundParams[15];
              if (boundParams[16] !== undefined) s.ai_system_prompt = boundParams[16];
              if (boundParams[17] !== undefined) (s as any).homepage_json = boundParams[17];
              if (boundParams[18] !== undefined) (s as any).chatbot_faqs_json = boundParams[18];
              if (boundParams[19] !== undefined) (s as any).whatsapp_number = boundParams[19];
              if (boundParams[20] !== undefined) (s as any).telegram_channel = boundParams[20];
              if (boundParams[21] !== undefined) (s as any).contact_page_json = boundParams[21];
              (s as any).updated_at = new Date().toISOString();
            }
            return { success: true, meta: { changes: 1 } };
          }

          return { success: true, meta: {} };
        }
      };

      return statement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    },
    async exec(query: string) {
      return { success: true };
    }
  };
}

/**
 * Get Site Settings helper with caching
 */
export async function getSiteSettings() {
  const db = getDB();
  const settings = await db.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
  return settings || (localStore ? localStore.settings : null);
}

/**
 * Get Active Payment Gateways
 */
export async function getActivePaymentGateways() {
  const db = getDB();
  const res = await db.prepare("SELECT * FROM payment_gateways WHERE is_enabled = 1 ORDER BY sort_order ASC").all();
  return res.results;
}

/**
 * Get Products with category information
 */
export async function getProducts(options?: { featuredOnly?: boolean; limit?: number }) {
  const db = getDB();
  let query = "SELECT * FROM products WHERE status = 'published'";
  if (options?.featuredOnly) {
    query += " AND is_featured = 1";
  }
  query += " ORDER BY created_at DESC";
  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
  }
  const res = await db.prepare(query).all();
  return res.results;
}

/**
 * Get Single Product by Slug
 */
export async function getProductBySlug(slug: string) {
  const db = getDB();
  const product = await db.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
  return product;
}

/**
 * Find User by Email
 */
export async function findUserByEmail(email: string) {
  const db = getDB();
  const user = await db
    .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
    .bind(email.toLowerCase().trim())
    .first();
  return user;
}

/**
 * Find User by ID
 */
export async function findUserById(id: string) {
  const db = getDB();
  const user = await db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first();
  return user;
}

/**
 * Create New User
 */
export async function createUser(user: {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role?: string;
}) {
  const db = getDB();
  await db
    .prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)")
    .bind(
      user.id,
      user.name,
      user.email.toLowerCase().trim(),
      user.password_hash,
      user.role || "customer"
    )
    .run();
}

/**
 * Get all purchases for a customer by email, enriched with product access URLs and files
 */
export async function getUserPurchases(email: string) {
  const db = getDB();
  const ordersRes = await db
    .prepare("SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC")
    .bind(email.toLowerCase().trim())
    .all();

  const orders = ordersRes.results || [];
  const purchases: any[] = [];

  for (const order of orders) {
    // Fetch associated product for metadata (external_access_url, product_type, thumbnail)
    const product = await db
      .prepare("SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1")
      .bind(order.product_id, order.product_id)
      .first();

    purchases.push({
      order_id: order.id,
      order_number: order.order_number,
      product_id: order.product_id,
      product_title: order.product_title || product?.title || "Digital Product",
      product_slug: product?.slug || "",
      product_type: product?.product_type || "file",
      thumbnail_url: product?.thumbnail_url || "",
      external_access_url: product?.external_access_url || "",
      download_token: order.download_token,
      file_name: product?.file_name || "",
      file_size: product?.file_size || "",
      version: product?.version || "1.0",
      delivered_license_key: order.delivered_license_key,
      admin_notes: order.admin_notes || "",
      amount: order.amount,
      currency: order.currency || "BDT",
      payment_status: order.payment_status,
      purchase_date: order.created_at
    });
  }

  return purchases;
}

