export interface SiteSettings {
  id: string;
  site_title: string;
  site_tagline: string;
  site_description: string;
  site_url: string;
  logo_url: string;
  favicon_url: string;
  currency: string;
  currency_symbol: string;
  usd_rate: number;
  
  // Custom Header & Footer
  header_nav_json: string;
  footer_nav_json: string;
  
  // Custom Code Injection
  header_code: string;
  footer_code: string;
  
  // Facebook Pixel & CAPI
  facebook_pixel_id: string;
  facebook_access_token: string;
  facebook_test_event_code: string;
  facebook_tracking_enabled: number;
  
  // AI Chatbot
  ai_enabled: number;
  ai_provider: "gemini" | "openrouter";
  ai_model: string;
  ai_api_key: string;
  ai_system_prompt: string;
  
  admin_username: string;
  whatsapp_number?: string;
  telegram_channel?: string;
  homepage_json?: string;
  chatbot_faqs_json?: string;
  contact_page_json?: string;
  updated_at?: string;
}

export interface ContactPageData {
  badge_text: string;
  title: string;
  subtitle: string;
  notice_banner?: {
    enabled: boolean;
    text: string;
    type: "info" | "warning" | "success";
  };
  whatsapp: {
    enabled: boolean;
    title: string;
    description: string;
    number: string;
    button_text: string;
    prefill_text?: string;
  };
  telegram: {
    enabled: boolean;
    title: string;
    description: string;
    channel: string;
    button_text: string;
  };
  support_info: {
    email: string;
    phone: string;
    hours: string;
    address: string;
  };
  ticket_section: {
    guest_title: string;
    guest_desc: string;
    guest_btn_text: string;
    user_title: string;
    response_guarantee: string;
  };
  faqs?: Array<{ q: string; a: string }>;
}

export interface NavItem {
  label: string;
  url: string;
}

export interface FooterConfig {
  copyright: string;
  support_email: string;
  support_phone: string;
  telegram_link?: string;
  facebook_link?: string;
  whatsapp_number?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id?: string;
  category_name?: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  sale_price?: number;
  product_type: "file" | "license" | "link";
  r2_file_key?: string;
  file_name?: string;
  file_size?: string;
  version: string;
  external_access_url?: string;
  preview_url?: string;
  thumbnail_url?: string;
  screenshots_json: string;
  features_json: string;
  tags?: string;
  is_featured: number;
  status: "published" | "draft";
  views_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentGateway {
  id: string;
  title: string;
  type: "send_money" | "crypto" | "gateway";
  is_enabled: number;
  account_number: string;
  account_type: string;
  instructions: string;
  charge_percent: number;
  icon_name: string;
  badge_color: string;
  sort_order: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_id: string;
  product_title: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: "pending" | "approved" | "rejected" | "refunded";
  sender_number?: string;
  transaction_id?: string;
  admin_notes?: string;
  download_token: string;
  download_count: number;
  max_downloads: number;
  delivered_license_key?: string;
  coupon_code?: string;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  expiry_date?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrackingEvent {
  event_name: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";
  event_id: string;
  user_email?: string;
  user_ip?: string;
  user_agent?: string;
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    order_id?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: "customer" | "admin";
  created_at?: string;
  updated_at?: string;
}

export interface UserPurchase {
  order_id: string;
  order_number: string;
  product_id: string;
  product_title: string;
  product_slug: string;
  product_type: "file" | "license" | "link";
  thumbnail_url?: string;
  external_access_url?: string;
  download_token?: string;
  file_name?: string;
  file_size?: string;
  version?: string;
  delivered_license_key?: string;
  admin_notes?: string;
  amount: number;
  currency: string;
  payment_status: "pending" | "approved" | "rejected" | "refunded";
  purchase_date: string;
}

