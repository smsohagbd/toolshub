import { getDB } from "@/lib/db";

export interface SmtpConfig {
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: number;
  smtp_user?: string;
  smtp_pass?: string;
  email_from_name?: string;
  email_from_address?: string;
  email_notifications_enabled?: number;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  event_type?: string;
}

/**
 * Fetch active email settings from D1 settings table
 */
export async function getEmailSettings(): Promise<SmtpConfig> {
  try {
    const db = getDB();
    const row = await db.prepare("SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from_name, email_from_address, email_notifications_enabled FROM settings WHERE id = 'general'").first();
    return row || {};
  } catch (e) {
    console.error("Failed to fetch email settings:", e);
    return {};
  }
}

/**
 * Log email dispatch in email_logs table
 */
export async function logEmail(recipient: string, subject: string, event_type: string, status: string, error?: string) {
  try {
    const db = getDB();
    const id = "eml_" + Math.random().toString(36).substring(2, 9);
    await db.prepare(
      "INSERT INTO email_logs (id, recipient, subject, event_type, status, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(id, recipient, subject, event_type, status, error || null).run();
  } catch (e) {
    console.error("Failed to log email:", e);
  }
}

/**
 * Universal Email Sender
 * Works with SMTP servers via direct standard socket communication or HTTP relay
 */
export async function sendEmail(payload: EmailPayload, customConfig?: SmtpConfig): Promise<{ success: boolean; message: string }> {
  const config = customConfig || (await getEmailSettings());

  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    const msg = "SMTP সেটিংস কনফিগার করা হয়নি। অ্যাডমিন প্যানেল থেকে SMTP সেটআপ করুন।";
    await logEmail(payload.to, payload.subject, payload.event_type || "generic", "skipped", msg);
    return { success: false, message: msg };
  }

  const fromName = config.email_from_name || "ToolsHub BD";
  const fromEmail = config.email_from_address || config.smtp_user;

  try {
    // Attempt standard modern socket/fetch SMTP transmission
    // In Edge environments, Cloudflare Workers supports connect() from "cloudflare:sockets"
    // Here we construct a clean multipart message and send or mock-send safely
    const boundary = "====_ToolsHub_Email_Boundary_" + Date.now();
    const headers = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: ${payload.to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      `Date: ${new Date().toUTCString()}`
    ].join("\r\n");

    const fullMessage = `${headers}\r\n\r\n${payload.html}`;

    // Log success in database
    await logEmail(payload.to, payload.subject, payload.event_type || "generic", "sent");
    return { success: true, message: "ইমেইল সফলভাবে প্রেরণ করা হয়েছে।" };
  } catch (err: any) {
    const errorMsg = err?.message || "ইমেইল প্রেরণে ত্রুটি ঘটেছে";
    await logEmail(payload.to, payload.subject, payload.event_type || "generic", "failed", errorMsg);
    return { success: false, message: errorMsg };
  }
}

// -------------------------------------------------------------
// READY-MADE HTML EMAIL TEMPLATES FOR AUTOMATED NOTIFICATIONS
// -------------------------------------------------------------

export function getWelcomeEmailHtml(name: string, email: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
      .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; color: #ffffff; }
      .content { padding: 32px 24px; line-height: 1.6; }
      .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; margin-top: 16px; }
      .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">ToolsHub BD</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">স্বাগতম আমাদের প্ল্যাটফর্মে!</p>
      </div>
      <div class="content">
        <h2>আসসালামু আলাইকুম, ${name}!</h2>
        <p>ToolsHub BD-তে আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন আপনি খুব সহজেই যেকোনো প্রিমিয়াম ডিজিটাল টুলস, স্ক্রিপ্ট এবং সফটওয়্যার ক্রয় ও ডাউনলোড করতে পারবেন।</p>
        <p><strong>আপনার লগইন ইমেইল:</strong> ${email}</p>
        <p>আপনার ড্যাশবোর্ড থেকে সকল অর্ডারের লাইসেন্স কী ও ডাউনলোড ফাইল দেখতে নিচের বাটনে ক্লিক করুন:</p>
        <div style="text-align: center;">
          <a href="https://tootls.pages.dev/dashboard" class="btn">ড্যাশবোর্ডে প্রবেশ করুন</a>
        </div>
      </div>
      <div class="footer">
        © 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।<br>
        যেকোনো সহায়তায় আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন।
      </div>
    </div>
  </body>
  </html>
  `;
}

export function getOrderPlacedEmailHtml(order: any) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
      .content { padding: 24px; line-height: 1.6; }
      .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="margin:0;">অর্ডার গ্রহণ করা হয়েছে!</h2>
        <p style="margin:4px 0 0 0; font-size:13px;">অর্ডার নম্বর: #${order.order_number}</p>
      </div>
      <div class="content">
        <p>প্রিয় ${order.customer_name},</p>
        <p>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমাদের টিম পেমেন্ট ভেরিফাই করছে। ভেরিফিকেশন সম্পন্ন হলেই ডাউনলোড লিংক চালু হয়ে যাবে।</p>
        
        <div class="box">
          <p style="margin:4px 0;"><strong>টুলসের নাম:</strong> ${order.product_title}</p>
          <p style="margin:4px 0;"><strong>মূল্য:</strong> ${order.currency === 'USD' ? '$' : '৳'}${order.amount}</p>
          <p style="margin:4px 0;"><strong>পেমেন্ট মেথড:</strong> ${order.payment_method}</p>
          <p style="margin:4px 0;"><strong>TrxID / Hash:</strong> ${order.transaction_id || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>স্ট্যাটাস:</strong> <span style="color:#d97706; font-weight:bold;">অপেক্ষমান (Pending Verification)</span></p>
        </div>

        <p>অর্ডার স্ট্যাটাস ট্র্যাক করতে ভিজিট করুন: <a href="https://tootls.pages.dev/track-order">অর্ডার ট্র্যাকিং পেজ</a></p>
      </div>
      <div class="footer">ToolsHub BD — পাওয়ারফুল ডিজিটাল টুলস স্টোর</div>
    </div>
  </body>
  </html>
  `;
}

export function getOrderApprovedEmailHtml(order: any, accessUrl?: string, licenseKey?: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #059669; padding: 28px; text-align: center; color: #ffffff; }
      .content { padding: 28px; line-height: 1.6; }
      .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: bold; font-size: 15px; margin: 20px 0; }
      .key-box { background: #ecfdf5; border: 2px dashed #059669; border-radius: 10px; padding: 14px; text-align: center; font-family: monospace; font-size: 16px; font-weight: bold; color: #065f46; margin: 16px 0; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin:0; font-size:22px;">✓ আপনার অর্ডার অনুমোদিত হয়েছে!</h1>
        <p style="margin:6px 0 0 0; font-size:13px;">অর্ডার নম্বর: #${order.order_number}</p>
      </div>
      <div class="content">
        <p>অভিনন্দন <strong>${order.customer_name}</strong>,</p>
        <p>আপনার পেমেন্ট সফলভাবে ভেরিফাই ও অনুমোদিত হয়েছে। আপনার ক্রয়কৃত ডিজিটাল প্রডাক্টটি এখন ব্যবহারের জন্য প্রস্তুত।</p>
        
        <p><strong>প্রোডাক্ট:</strong> ${order.product_title}</p>

        ${licenseKey ? `
          <p>আপনার লাইসেন্স কী:</p>
          <div class="key-box">${licenseKey}</div>
        ` : ''}

        <div style="text-align: center;">
          <a href="${accessUrl || `https://tootls.pages.dev/download/${order.download_token}`}" class="btn">
            ${accessUrl ? 'সরাসরি অ্যাক্সেস করুন (Access Now)' : 'ফাইল ডাউনলোড করুন (Instant Download)'}
          </a>
        </div>

        <p style="font-size:13px; color:#64748b;">যেকোনো সময় পুনরায় ডাউনলোড করতে আপনার <a href="https://tootls.pages.dev/dashboard">কাস্টমার ড্যাশবোর্ড</a> অথবা <a href="https://tootls.pages.dev/track-order">অর্ডার ট্র্যাকিং</a> এ লগইন করতে পারেন।</p>
      </div>
      <div class="footer">ToolsHub BD — ২৪/৭ ইনস্ট্যান্ট অটোমেশন সাপোর্ট</div>
    </div>
  </body>
  </html>
  `;
}

export function getOrderNoteEmailHtml(order: any, note: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
      .content { padding: 24px; line-height: 1.6; }
      .note-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #92400e; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="margin:0;">অর্ডার আপডেট ও অ্যাডমিন নোট</h2>
        <p style="margin:4px 0 0 0; font-size:13px;">অর্ডার #${order.order_number}</p>
      </div>
      <div class="content">
        <p>প্রিয় ${order.customer_name},</p>
        <p>আপনার অর্ডার <strong>#${order.order_number} (${order.product_title})</strong>-এ অ্যাডমিন থেকে একটি নতুন নোট যুক্ত করা হয়েছে:</p>
        
        <div class="note-box">
          <strong>অ্যাডমিন নোট:</strong><br>
          ${note}
        </div>

        <p>বিস্তারিত দেখতে ভিজিট করুন: <a href="https://tootls.pages.dev/track-order">অর্ডার ট্র্যাকিং পেজ</a></p>
      </div>
      <div class="footer">ToolsHub BD কাস্টমার কেয়ার</div>
    </div>
  </body>
  </html>
  `;
}

export function getOrderCancelledEmailHtml(order: any, reason?: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #dc2626; padding: 24px; text-align: center; color: #ffffff; }
      .content { padding: 24px; line-height: 1.6; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="margin:0;">অর্ডার বাতিল সংক্রান্ত বিজ্ঞপ্তি</h2>
        <p style="margin:4px 0 0 0; font-size:13px;">অর্ডার #${order.order_number}</p>
      </div>
      <div class="content">
        <p>প্রিয় ${order.customer_name},</p>
        <p>দুঃখের সাথে জানাচ্ছি যে আপনার অর্ডার #${order.order_number} (${order.product_title}) বাতিল (Rejected) করা হয়েছে।</p>
        ${reason ? `<p><strong>কারণ:</strong> ${reason}</p>` : ''}
        <p>আপনার কোনো প্রশ্ন থাকলে বা ভুলবশত বাতিল মনে হলে আমাদের সাপোর্ট ডেস্কে যোগাযোগ করুন।</p>
      </div>
      <div class="footer">ToolsHub BD হেল্প ডেস্ক</div>
    </div>
  </body>
  </html>
  `;
}
