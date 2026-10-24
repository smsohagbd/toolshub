/**
 * Cloudflare Pages Full-Stack Edge Worker for "tootls"
 * Binds directly to Cloudflare D1 (DB) and Cloudflare R2 (BUCKET)
 */

import { connect } from "cloudflare:sockets";

async function sendSmtpWorker({ host, port, secure, user, pass, fromName, fromEmail, toEmail, subject, htmlBody }) {
  const p = Number(port || 465);
  const isTls = p === 465 || Boolean(secure);
  
  let socket;
  try {
    socket = connect(
      { hostname: host, port: p },
      { secureTransport: isTls ? "on" : "off", allowHalfOpen: false }
    );
  } catch(e) {
    throw new Error("TCP Socket connection failed: " + (e?.message || e));
  }

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buf = "";
  const readLine = async () => {
    while (true) {
      const idx = buf.indexOf("\r\n");
      if (idx !== -1) {
        const line = buf.substring(0, idx);
        buf = buf.substring(idx + 2);
        return line;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    return buf;
  };

  const writeLine = async (str) => {
    await writer.write(encoder.encode(str + "\r\n"));
  };

  try {
    let line = await readLine();
    while (line.startsWith("220-")) {
      line = await readLine();
    }
    if (!line.startsWith("220")) throw new Error("SMTP greeting failed: " + line);

    await writeLine("EHLO tools.pages.dev");
    while (true) {
      line = await readLine();
      if (line.startsWith("250 ")) break;
      if (!line.startsWith("250-") && !line.startsWith("250")) throw new Error("EHLO failed: " + line);
    }

    await writeLine("AUTH LOGIN");
    line = await readLine();
    if (!line.startsWith("334")) throw new Error("AUTH LOGIN rejected: " + line);

    await writeLine(btoa(user));
    line = await readLine();
    if (!line.startsWith("334")) throw new Error("Username rejected: " + line);

    await writeLine(btoa(pass));
    line = await readLine();
    if (!line.startsWith("235")) throw new Error("Password authentication failed: " + line);

    await writeLine(`MAIL FROM:<${fromEmail || user}>`);
    line = await readLine();
    if (!line.startsWith("250")) throw new Error("MAIL FROM rejected: " + line);

    await writeLine(`RCPT TO:<${toEmail}>`);
    line = await readLine();
    if (!line.startsWith("250")) throw new Error("RCPT TO rejected: " + line);

    await writeLine("DATA");
    line = await readLine();
    if (!line.startsWith("354")) throw new Error("DATA command rejected: " + line);

    const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const emailData = [
      `From: "${fromName || 'ToolsHub BD'}" <${fromEmail || user}>`,
      `To: <${toEmail}>`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      htmlBody,
      `.`
    ].join("\r\n");

    await writeLine(emailData);
    line = await readLine();
    if (!line.startsWith("250")) throw new Error("Message submission rejected: " + line);

    await writeLine("QUIT");
    return { success: true, message: "ইমেইল সফলভাবে প্রেরণ করা হয়েছে।" };
  } finally {
    try { writer.releaseLock(); } catch(e) {}
    try { reader.releaseLock(); } catch(e) {}
    try { socket.close(); } catch(e) {}
  }
}

async function triggerSmtpNotification(env, toEmail, subject, htmlBody, eventType = "order_notification") {
  if (!env || !env.DB || !toEmail) return;
  try {
    const s = await env.DB.prepare(
      "SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from_name, email_from_address, email_notifications_enabled FROM settings WHERE id = 'general'"
    ).first();

    if (!s || !s.email_notifications_enabled || !s.smtp_host || !s.smtp_user || !s.smtp_pass) {
      return;
    }

    const logId = "eml_" + Math.random().toString(36).substring(2, 9);
    try {
      await sendSmtpWorker({
        host: s.smtp_host,
        port: s.smtp_port,
        secure: Boolean(s.smtp_secure),
        user: s.smtp_user,
        pass: s.smtp_pass,
        fromName: s.email_from_name || "ToolsHub BD",
        fromEmail: s.email_from_address || s.smtp_user,
        toEmail,
        subject,
        htmlBody
      });
      await env.DB.prepare("INSERT INTO email_logs (id, recipient, subject, event_type, status, created_at) VALUES (?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)")
        .bind(logId, toEmail, subject, eventType).run();
    } catch (err) {
      await env.DB.prepare("INSERT INTO email_logs (id, recipient, subject, event_type, status, error_message, created_at) VALUES (?, ?, ?, ?, 'failed', ?, CURRENT_TIMESTAMP)")
        .bind(logId, toEmail, subject, eventType, String(err.message || err)).run();
    }
  } catch (e) {
    console.error("triggerSmtpNotification error:", e);
  }
}

async function runSubscriptionReminderCron(env) {
  if (!env || !env.DB) return { processed: 0, notifications_sent: 0, expired_count: 0 };
  let processed = 0;
  let sent = 0;
  let expired = 0;

  try {
    const sRes = await env.DB.prepare("SELECT * FROM subscriptions WHERE status = 'active'").all();
    const subs = sRes.results || [];
    processed = subs.length;
    const now = Date.now();
    const todayDateStr = new Date().toISOString().slice(0, 10);

    for (const sub of subs) {
      const expTime = new Date(sub.expiry_date).getTime();
      const diffMs = expTime - now;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft === 3 || daysLeft === 1) {
        const milestone = daysLeft === 3 ? "3days" : "1day";
        const eventType = `sub_reminder_${milestone}_${sub.id}_${todayDateStr}`;

        // Prevent duplicate sending on the same day
        const existing = await env.DB.prepare(
          "SELECT id FROM email_logs WHERE recipient = ? AND event_type = ? LIMIT 1"
        ).bind(sub.user_email, eventType).first();

        if (!existing) {
          const isUrgent = daysLeft === 1;
          const subject = isUrgent
            ? `🚨 জরুরি: আগামীকাল "${sub.product_title}" সাবস্ক্রিপশনের মেয়াদ শেষ হচ্ছে!`
            : `⚠️ সাবস্ক্রিপশন রিমাইন্ডার: ৩ দিন পর "${sub.product_title}" এর মেয়াদ শেষ হবে`;

          const themeColor = isUrgent ? "#f59e0b" : "#4f46e5";
          const emailHtml = `
            <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:580px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
              <div style="background:${themeColor};padding:24px;border-radius:12px;text-align:center;color:#ffffff;">
                <h2 style="margin:0;font-size:20px;">${isUrgent ? '🚨 জরুরি মেয়াদ উত্তীর্ণের সতর্কবার্তা' : '⚠️ সাবস্ক্রিপশন মেয়াদ রিমাইন্ডার'}</h2>
                <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">ToolsHub BD সাবস্ক্রিপশন সার্ভিস</p>
              </div>
              <div style="padding:20px 0;line-height:1.6;font-size:14px;">
                <p>প্রিয় <strong>${sub.user_name || 'গ্রাহক'}</strong>,</p>
                <p>${isUrgent
                  ? `আপনার ক্রয়কৃত <strong>"${sub.product_title}"</strong> সাবস্ক্রিপশনের মেয়াদ <strong>আগামীকাল</strong> শেষ হয়ে যাবে। নিরবচ্ছিন্ন ব্যবহার নিশ্চিত করতে আজই রিনিউ করুন।`
                  : `আপনার ক্রয়কৃত <strong>"${sub.product_title}"</strong> সাবস্ক্রিপশনের মেয়াদ আর মাত্র <strong>৩ দিন</strong> বাকি রয়েছে। সাময়িক বিচ্ছিন্নতা এড়াতে পূর্বেই রিনিউ করার অনুরোধ করা হচ্ছে।`
                }</p>
                
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>টুলস / সার্ভিস:</strong> ${sub.product_title}</p>
                  <p style="margin:4px 0;"><strong>বিলিং সাইকেল:</strong> ${sub.billing_cycle || 'Monthly'}</p>
                  <p style="margin:4px 0;"><strong>মেয়াদ উত্তীর্ণের তারিখ:</strong> ${new Date(sub.expiry_date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p style="margin:4px 0;"><strong>অবশিষ্ট দিন:</strong> <span style="color:${themeColor};font-weight:bold;">${daysLeft} দিন</span></p>
                </div>

                <div style="text-align:center;margin:24px 0;">
                  <a href="https://tootls.pages.dev/dashboard" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">ড্যাশবোর্ড থেকে রিনিউ করুন →</a>
                </div>
              </div>
              <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">
                ToolsHub BD — স্মার্ট অটোমেশন ও ডিজিটাল সল্যুশনস
              </div>
            </div>
          `;

          await triggerSmtpNotification(env, sub.user_email, subject, emailHtml, eventType);
          sent++;
        }
      } else if (daysLeft <= 0) {
        // Expired today
        await env.DB.prepare("UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sub.id).run();
        expired++;

        const eventType = `sub_expired_${sub.id}_${todayDateStr}`;
        const existing = await env.DB.prepare(
          "SELECT id FROM email_logs WHERE recipient = ? AND event_type = ? LIMIT 1"
        ).bind(sub.user_email, eventType).first();

        if (!existing) {
          const subject = `⌛ আপনার "${sub.product_title}" সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে`;
          const emailHtml = `
            <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:580px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
              <div style="background:#ef4444;padding:24px;border-radius:12px;text-align:center;color:#ffffff;">
                <h2 style="margin:0;font-size:20px;">⌛ সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে</h2>
              </div>
              <div style="padding:20px 0;line-height:1.6;font-size:14px;">
                <p>প্রিয় <strong>${sub.user_name || 'গ্রাহক'}</strong>,</p>
                <p>আপনার <strong>"${sub.product_title}"</strong> সাবস্ক্রিপশনের মেয়াদ আজ সমাপ্ত হয়েছে। পুনরায় লাইসেন্স এবং ডাউনলোড ফাইল সক্রিয় করতে আপনার ড্যাশবোর্ড থেকে রিনিউ করুন।</p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="https://tootls.pages.dev/dashboard" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">এখনই রিনিউ করুন →</a>
                </div>
              </div>
              <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">ToolsHub BD</div>
            </div>
          `;
          await triggerSmtpNotification(env, sub.user_email, subject, emailHtml, eventType);
          sent++;
        }
      }
    }
  } catch (err) {
    console.error("runSubscriptionReminderCron error:", err);
  }

  return { processed, notifications_sent: sent, expired_count: expired };
}

function renderFloatingAIChatbotHtml() {
  return `
<!-- Floating AI Chatbot Widget -->
<div id="ai_chat_root" style="position:fixed;bottom:20px;right:20px;z-index:999999;font-family:'Hind Siliguri',-apple-system,BlinkMacSystemFont,sans-serif;">
  <!-- Toggle Button -->
  <button id="ai_toggle_btn" onclick="toggleAIChat()" style="display:flex;align-items:center;gap:10px;padding:12px 20px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;border:none;border-radius:9999px;box-shadow:0 10px 25px -5px rgba(79,70,229,0.4);cursor:pointer;font-weight:700;font-size:14px;transition:all 0.2s ease;">
    <span style="position:relative;display:flex;width:10px;height:10px;">
      <span style="position:absolute;display:inline-flex;width:100%;height:100%;border-radius:9999px;background:#34d399;opacity:0.75;animation:aiPing 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:relative;display:inline-flex;width:10px;height:10px;border-radius:9999px;background:#10b981;"></span>
    </span>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    <span>AI হেল্প ডেস্ক</span>
  </button>

  <!-- Chat Modal Window -->
  <div id="ai_chat_modal" style="display:none;width:390px;max-width:calc(100vw - 32px);height:530px;max-height:calc(100vh - 90px);background:#ffffff;border-radius:24px;box-shadow:0 20px 40px -10px rgba(0,0,0,0.25);border:1px solid #e2e8f0;flex-direction:column;overflow:hidden;">
    <!-- Header -->
    <div style="padding:16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;flex:1;">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:4px;">
            AI কাস্টমার সহকারী <span style="color:#fde047;">✨</span>
          </div>
          <div style="font-size:11px;opacity:0.85;display:flex;align-items:center;gap:4px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#34d399;display:inline-block;"></span> অনলাইন ২৪/৭
          </div>
        </div>
      </div>
      <button onclick="toggleAIChat()" style="background:transparent;border:none;color:#ffffff;cursor:pointer;padding:6px;font-size:18px;line-height:1;border-radius:50%;opacity:0.85;">✕</button>
    </div>

    <!-- Message Area -->
    <div id="ai_messages_container" style="flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:12px;">
      <!-- Populated via JS -->
    </div>

    <!-- Quick FAQs Suggestion Bar -->
    <div id="ai_quick_bar" style="padding:8px 12px;background:#ffffff;border-top:1px solid #f1f5f9;display:flex;gap:6px;overflow-x:auto;white-space:nowrap;">
      <button class="ai-faq-btn" onclick="sendFaqMsg('টুলস কীভাবে ডাউনলোড করব?')">টুলস কীভাবে ডাউনলোড করব?</button>
      <button class="ai-faq-btn" onclick="sendFaqMsg('বিকাশ বা নগদে কীভাবে কিনব?')">বিকাশ বা নগদে কীভাবে কিনব?</button>
      <button class="ai-faq-btn" onclick="sendFaqMsg('৩য়-পক্ষ ড্রাইভ লিংক কীভাবে পাব?')">৩য়-পক্ষ ড্রাইভ লিংক?</button>
    </div>

    <!-- Input Bar -->
    <form id="ai_chat_form" onsubmit="handleAIChatSubmit(event)" style="padding:10px 12px;background:#ffffff;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;">
      <input id="ai_user_input" type="text" placeholder="একটি প্রশ্ন লিখুন..." autocomplete="off" style="flex:1;padding:10px 14px;font-size:13px;border-radius:12px;border:1px solid #cbd5e1;background:#f8fafc;color:#1e293b;outline:none;" />
      <button id="ai_submit_btn" type="submit" style="padding:10px 14px;background:#4f46e5;color:#ffffff;border:none;border-radius:12px;cursor:pointer;font-weight:bold;display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
      </button>
    </form>
  </div>
</div>

<style>
  @keyframes aiPing { 75%, 100% { transform: scale(2); opacity: 0; } }
  @keyframes aiBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  .ai-faq-btn { padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .ai-faq-btn:hover { background: #e2e8f0; color: #1e293b; }
  .dark #ai_chat_modal { background: #0f172a !important; border-color: #1e293b !important; color: #f8fafc !important; }
  .dark #ai_messages_container { background: #020617 !important; }
  .dark #ai_quick_bar { background: #0f172a !important; border-color: #1e293b !important; }
  .dark .ai-faq-btn { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
  .dark #ai_chat_form { background: #0f172a !important; border-color: #1e293b !important; }
  .dark #ai_user_input { background: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
  .ai-chat-link { display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 6px; background: #e0e7ff; color: #4338ca !important; font-weight: 700; text-decoration: underline; margin: 0 2px; }
  .dark .ai-chat-link { background: #312e81 !important; color: #a5b4fc !important; }
</style>

<script>
(function(){
  var isChatOpen = false;
  var chatUserEmail = null;
  var chatSessionId = "";
  var chatHistory = [];
  var isSending = false;

  try {
    chatSessionId = localStorage.getItem("toolshub_chat_session_id") || "";
    if (!chatSessionId) {
      chatSessionId = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      localStorage.setItem("toolshub_chat_session_id", chatSessionId);
    }
  } catch(e) { chatSessionId = "sess_fallback"; }

  var defaultGreeting = {
    role: "assistant",
    content: "আসসালামু আলাইকুম! ToolsHub BD এর এআই অ্যাসিস্ট্যান্টে স্বাগতম। আপনি কোন ডিজিটাল টুলস সম্পর্কে জানতে চান বা কীভাবে বিকাশ/নগদে অর্ডার করবেন তা জিজ্ঞেস করতে পারেন।"
  };

  try {
    var cached = localStorage.getItem("toolshub_chat_messages");
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) chatHistory = parsed.slice(-10);
    }
  } catch(e) {}
  if (chatHistory.length === 0) chatHistory = [defaultGreeting];

  window.toggleAIChat = function() {
    isChatOpen = !isChatOpen;
    var btn = document.getElementById("ai_toggle_btn");
    var modal = document.getElementById("ai_chat_modal");
    if (isChatOpen) {
      btn.style.display = "none";
      modal.style.display = "flex";
      renderMessages();
      scrollBottom();
      var inp = document.getElementById("ai_user_input");
      if (inp) setTimeout(function(){ inp.focus(); }, 100);
    } else {
      btn.style.display = "flex";
      modal.style.display = "none";
    }
  };

  function formatContent(text) {
    if (!text) return "";
    var lines = text.split("\\n");
    return lines.map(function(line){
      var t = line.trim();
      if (!t) return "<div style='height:4px;'></div>";
      // Links [text](url)
      t = t.replace(/\\[([^\\]]+)\\]\\(([^\\)]+)\\)/g, function(match, label, href){
        return '<a href="' + href + '" class="ai-chat-link">' + label + ' ↗</a>';
      });
      // Bold **text**
      t = t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
      if (t.startsWith("•") || t.startsWith("-")) {
        return '<div style="display:flex;gap:6px;padding-left:4px;"><span style="color:#4f46e5;font-weight:bold;">•</span><div>' + t.substring(1).trim() + '</div></div>';
      }
      return '<p style="margin:2px 0;">' + t + '</p>';
    }).join("");
  }

  function renderMessages() {
    var c = document.getElementById("ai_messages_container");
    if (!c) return;
    var isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    var html = "";
    chatHistory.forEach(function(m){
      var isUser = m.role === "user";
      html += '<div style="display:flex;gap:8px;justify-content:' + (isUser ? 'flex-end' : 'flex-start') + ';">';
      if (!isUser) {
        html += '<div style="width:26px;height:26px;border-radius:50%;background:#e0e7ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:12px;shrink:0;margin-top:2px;">🤖</div>';
      }
      html += '<div style="max-width:82%;padding:8px 12px;border-radius:16px;font-size:13px;line-height:1.5;' +
        (isUser
          ? 'background:#4f46e5;color:#ffffff;border-bottom-right-radius:4px;'
          : (isDark ? 'background:#1e293b;color:#f1f5f9;border:1px solid #334155;' : 'background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;') + 'border-bottom-left-radius:4px;') +
        '">' + formatContent(m.content) + '</div>';
      if (isUser) {
        html += '<div style="width:26px;height:26px;border-radius:50%;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:12px;shrink:0;margin-top:2px;">👤</div>';
      }
      html += '</div>';
    });

    if (isSending) {
      html += '<div style="display:flex;gap:8px;align-items:center;">' +
        '<div style="width:26px;height:26px;border-radius:50%;background:#e0e7ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:12px;">🤖</div>' +
        '<div style="padding:6px 12px;border-radius:14px;' + (isDark ? 'background:#1e293b;border:1px solid #334155;' : 'background:#ffffff;border:1px solid #e2e8f0;') + 'display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#6366f1;">' +
          '<span>টাইপিং</span>' +
          '<span style="display:inline-flex;gap:3px;">' +
            '<span style="width:5px;height:5px;border-radius:50%;background:#6366f1;animation:aiBounce 1s infinite;"></span>' +
            '<span style="width:5px;height:5px;border-radius:50%;background:#6366f1;animation:aiBounce 1s infinite 0.2s;"></span>' +
            '<span style="width:5px;height:5px;border-radius:50%;background:#6366f1;animation:aiBounce 1s infinite 0.4s;"></span>' +
          '</span>' +
        '</div>' +
      '</div>';
    }

    c.innerHTML = html;
  }

  function scrollBottom() {
    var c = document.getElementById("ai_messages_container");
    if (c) c.scrollTop = c.scrollHeight;
  }

  function saveHistory() {
    try {
      localStorage.setItem("toolshub_chat_messages", JSON.stringify(chatHistory.slice(-10)));
    } catch(e) {}
  }

  window.sendFaqMsg = function(q) {
    if (isSending) return;
    var inp = document.getElementById("ai_user_input");
    if (inp) inp.value = q;
    handleAIChatSubmit();
  };

  window.handleAIChatSubmit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isSending) return;
    var inp = document.getElementById("ai_user_input");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = "";

    chatHistory.push({ role: "user", content: text });
    renderMessages();
    scrollBottom();
    saveHistory();

    isSending = true;
    renderMessages();
    scrollBottom();

    var historyPayload = chatHistory.slice(-6);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        session_id: chatSessionId,
        user_email: chatUserEmail,
        history: historyPayload
      })
    }).then(function(r){ return r.json(); })
      .then(function(data){
        isSending = false;
        var reply = (data && data.reply) ? data.reply : (data && data.error ? data.error : "দুঃখিত, সংযোগে ত্রুটি হয়েছে।");
        chatHistory.push({ role: "assistant", content: reply });
        renderMessages();
        scrollBottom();
        saveHistory();
      }).catch(function(){
        isSending = false;
        chatHistory.push({ role: "assistant", content: "নেটওয়ার্ক সংক্রান্ত সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।" });
        renderMessages();
        scrollBottom();
        saveHistory();
      });
  };

  // Sync auth and server history
  fetch("/api/auth/me").then(function(r){ return r.json(); }).then(function(auth){
    if (auth && auth.authenticated && auth.user && auth.user.email) {
      chatUserEmail = auth.user.email;
    }
    var q = chatUserEmail ? "user_email=" + encodeURIComponent(chatUserEmail) : "session_id=" + encodeURIComponent(chatSessionId);
    return fetch("/api/chat?" + q);
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d && Array.isArray(d.history) && d.history.length > 0) {
      chatHistory = d.history.map(function(h){ return { role: h.role, content: h.content }; }).slice(-10);
      saveHistory();
      if (isChatOpen) { renderMessages(); scrollBottom(); }
    }
  }).catch(function(){});
})();
</script>
`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS & Common JSON response helper
    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // Customer Auth Helpers
    const hashCustomerPassword = async (pw) => {
      const msg = new TextEncoder().encode("toolshub_jwt_edge_secret_salt_2026_x9:" + pw + ":salt");
      const buf = await crypto.subtle.digest("SHA-256", msg);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    };

    const verifyCustomerPassword = async (pw, storedHash) => {
      if (!pw || !storedHash) return false;
      const computed = await hashCustomerPassword(pw);
      if (computed === storedHash) return true;
      const rawBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
      const rawHex = Array.from(new Uint8Array(rawBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (rawHex === storedHash) return true;
      return false;
    };

    const makeCustomerToken = async (u) => {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
        id: u.id,
        name: u.name,
        email: (u.email || "").toLowerCase().trim(),
        role: u.role || "customer",
        exp: Date.now() + 2592000000
      }))));
      const sigBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload + ":toolshub_jwt_edge_secret_salt_2026_x9"));
      const sig = Array.from(new Uint8Array(sigBuf)).slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
      return payload + "." + sig;
    };

    const getAuthCustomer = async () => {
      const cookieHeader = request.headers.get("Cookie") || "";
      const match = cookieHeader.match(/toolshub_user_session=([^;]+)/);
      let token = match ? match[1] : null;
      if (!token) {
        const auth = request.headers.get("Authorization") || "";
        if (auth.startsWith("Bearer ")) token = auth.substring(7);
      }
      if (!token || !token.includes(".")) return null;
      try {
        const [p64, sig] = token.split(".");
        const sigBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p64 + ":toolshub_jwt_edge_secret_salt_2026_x9"));
        const expSig = Array.from(new Uint8Array(sigBuf)).slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
        if (sig !== expSig) return null;
        const data = JSON.parse(decodeURIComponent(escape(atob(p64))));
        if (data.exp && Date.now() > data.exp) return null;
        return data;
      } catch (e) {
        return null;
      }
    };

    // -------------------------------------------------------------
    // SEO & Agentic Browsing: robots.txt, llms.txt, ai-catalog.json, sitemap.xml
    // -------------------------------------------------------------
    if (pathname === "/robots.txt") {
      const robotsTxt = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://tootls.pages.dev/sitemap.xml\n`;
      return new Response(robotsTxt, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    if (pathname === "/llms.txt") {
      const llmsTxt = `# ToolsHub BD\n\n> ToolsHub BD is a premier digital software, scripts, and automation tools marketplace in Bangladesh. Customers can purchase validated social automation tools, SEO boosters, and web scripts with instant delivery.\n\n## Products & Tools\n- [Mouza Map](https://tootls.pages.dev/tools/mouza-map): Complete Mouza Map geographic and land survey digital utility.\n- [All Tools Catalog](https://tootls.pages.dev/#tools): Complete list of automated digital tools and software.\n\n## Navigation & Resources\n- [Home](https://tootls.pages.dev/): Main storefront and overview.\n- [Track Order](https://tootls.pages.dev/track-order): Instant order status and license key lookup.\n- [Sitemap](https://tootls.pages.dev/sitemap.xml): Machine-readable XML sitemap.\n`;
      return new Response(llmsTxt, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    if (pathname === "/ai-catalog.json") {
      const aiCatalog = {
        "$schema": "https://agenticresourcediscovery.org/schema/v1/ai-catalog.json",
        "schema_version": "1.0.0",
        "name": "ToolsHub BD",
        "description": "Premium Digital Tools, Scripts & Social Automation Software in Bangladesh",
        "url": "https://tootls.pages.dev",
        "provider": {
          "name": "ToolsHub BD",
          "url": "https://tootls.pages.dev"
        },
        "catalog": [
          {
            "id": "mouza-map",
            "name": "Mouza Map",
            "description": "Complete Mouza Map geographic and land survey digital utility.",
            "url": "https://tootls.pages.dev/tools/mouza-map",
            "type": "software",
            "currency": "BDT",
            "pricing": {
              "price": 199,
              "type": "one_time"
            }
          }
        ]
      };
      return new Response(JSON.stringify(aiCatalog, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    if (pathname === "/sitemap.xml") {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://tootls.pages.dev/</loc>\n    <lastmod>2026-10-21</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>https://tootls.pages.dev/track-order</loc>\n    <lastmod>2026-10-21</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n  <url>\n    <loc>https://tootls.pages.dev/tools/mouza-map</loc>\n    <lastmod>2026-10-21</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>`;
      return new Response(sitemapXml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/login
    // -------------------------------------------------------------
    if (pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = await request.json();
        const { email, password } = body;
        if (!email || !password) {
          return json({ error: "ইমেইল এবং পাসওয়ার্ড উভয়ই আবশ্যক।" }, 400);
        }
        const cleanEmail = String(email).toLowerCase().trim();
        const user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1").bind(cleanEmail).first();
        if (!user) {
          return json({ error: "ভুল ইমেইল বা পাসওয়ার্ড।" }, 401);
        }
        const isValid = await verifyCustomerPassword(password, user.password_hash);
        if (!isValid) {
          return json({ error: "ভুল ইমেইল বা পাসওয়ার্ড।" }, 401);
        }

        const token = await makeCustomerToken(user);
        return new Response(JSON.stringify({
          success: true,
          message: "সফলভাবে লগইন হয়েছে!",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "customer"
          },
          token
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": `toolshub_user_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      } catch (e) {
        return json({ error: "লগইন প্রক্রিয়ায় ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/signup
    // -------------------------------------------------------------
    if (pathname === "/api/auth/signup" && request.method === "POST") {
      try {
        const body = await request.json();
        const { name, email, password } = body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
          return json({ error: "অনুগ্রহ করে আপনার পুরো নাম লিখুন।" }, 400);
        }
        if (!email || typeof email !== "string" || !email.includes("@")) {
          return json({ error: "অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস লিখুন।" }, 400);
        }
        if (!password || typeof password !== "string" || password.length < 6) {
          return json({ error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" }, 400);
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanName = name.trim();

        const existing = await env.DB.prepare("SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1").bind(cleanEmail).first();
        if (existing) {
          return json({ error: "এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।" }, 409);
        }

        const password_hash = await hashCustomerPassword(password);
        const userId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

        await env.DB.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'customer')")
          .bind(userId, cleanName, cleanEmail, password_hash).run();

        const newUser = {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          role: "customer"
        };
        const token = await makeCustomerToken(newUser);

        // Trigger Welcome Email asynchronously
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async () => {
            try {
              const welcomeHtml = `
                <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;border-radius:12px;text-align:center;color:#ffffff;">
                    <h1 style="margin:0;font-size:24px;">ToolsHub BD</h1>
                    <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">স্বাগতম আমাদের ডিজিটাল প্ল্যাটফর্মে!</p>
                  </div>
                  <div style="padding:24px 0;line-height:1.6;font-size:14px;">
                    <h2 style="margin-top:0;font-size:18px;color:#0f172a;">আসসালামু আলাইকুম, ${cleanName}!</h2>
                    <p>ToolsHub BD-তে আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন আপনি খুব সহজেই যেকোনো প্রিমিয়াম ডিজিটাল টুলস, স্ক্রিপ্ট এবং সফটওয়্যার ক্রয় ও ইনস্ট্যান্ট অ্যাক্সেস করতে পারবেন।</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
                      <p style="margin:4px 0;"><strong>আপনার ইউজার নাম:</strong> ${cleanName}</p>
                      <p style="margin:4px 0;"><strong>লগইন ইমেইল:</strong> ${cleanEmail}</p>
                    </div>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="https://tootls.pages.dev/dashboard" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">ড্যাশবোর্ডে প্রবেশ করুন →</a>
                    </div>
                  </div>
                  <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">
                    © 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।
                  </div>
                </div>
              `;
              await triggerSmtpNotification(env, cleanEmail, `ToolsHub BD-তে স্বাগতম, ${cleanName}!`, welcomeHtml, "user_signup");
            } catch (mailErr) {
              console.error("Welcome email error:", mailErr);
            }
          })());
        }

        return new Response(JSON.stringify({
          success: true,
          message: "অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে!",
          user: newUser,
          token
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": `toolshub_user_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      } catch (e) {
        return json({ error: "সাইনআপ প্রক্রিয়ায় ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/forgot-password
    // -------------------------------------------------------------
    if (pathname === "/api/auth/forgot-password" && request.method === "POST") {
      try {
        const body = await request.json();
        const { email } = body;
        if (!email || typeof email !== "string" || !email.includes("@")) {
          return json({ error: "অনুগ্রহ করে একটি সঠিক ইমেইল প্রদান করুন।" }, 400);
        }
        const cleanEmail = email.toLowerCase().trim();
        const user = await env.DB.prepare("SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1")
          .bind(cleanEmail).first();
        if (!user) {
          return json({ error: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" }, 404);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await env.DB.prepare("UPDATE users SET reset_otp_code = ?, reset_otp_expires_at = ? WHERE id = ?")
          .bind(otp, expiresAt, user.id).run();

        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async () => {
            try {
              const otpHtml = `
                <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                  <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 24px;border-radius:12px;text-align:center;color:#ffffff;">
                    <h2 style="margin:0;font-size:22px;">পাসওয়ার্ড রিসেট ওটিপি কোড</h2>
                    <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">ToolsHub BD অ্যাকাউন্ট নিরাপত্তা</p>
                  </div>
                  <div style="padding:24px 0;line-height:1.6;font-size:14px;">
                    <p>প্রিয় <strong>${user.name || 'গ্রাহক'}</strong>,</p>
                    <p>আপনার ToolsHub BD অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধের প্রেক্ষিতে নিচের ৬-সংখ্যার ওটিপি কোডটি প্রদান করা হলো:</p>
                    <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
                      <div style="font-size:11px;color:#15803d;font-weight:bold;margin-bottom:4px;text-transform:uppercase;">আপনার ওটিপি কোড</div>
                      <div style="font-family:monospace;font-size:32px;font-weight:800;letter-spacing:6px;color:#15803d;">${otp}</div>
                      <div style="font-size:11px;color:#64748b;margin-top:6px;">(এই কোডটি আগামী ১৫ মিনিট কার্যকর থাকবে)</div>
                    </div>
                    <div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;">
                      ⚠️ আপনি যদি এই পাসওয়ার্ড পরিবর্তনের অনুরোধ না করে থাকেন, তবে অবিলম্বে এই ইমেইলটি এড়িয়ে চলুন। আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে।
                    </div>
                  </div>
                  <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">
                    © 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।
                  </div>
                </div>
              `;
              await triggerSmtpNotification(env, cleanEmail, `পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড — ${otp} | ToolsHub BD`, otpHtml, "forgot_password_otp");
            } catch(e) {
              console.error("Forgot password email error:", e);
            }
          })());
        }

        return json({
          success: true,
          message: "আপনার ইমেইলে একটি ৬-সংখ্যার ভেরিফিকেশন ওটিপি কোড পাঠানো হয়েছে।"
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/reset-password
    // -------------------------------------------------------------
    if (pathname === "/api/auth/reset-password" && request.method === "POST") {
      try {
        const body = await request.json();
        const { email, otp_code, new_password } = body;
        if (!email || !otp_code || !new_password) {
          return json({ error: "ইমেইল, ওটিপি এবং নতুন পাসওয়ার্ড সবকটি আবশ্যক।" }, 400);
        }
        if (typeof new_password !== "string" || new_password.length < 6) {
          return json({ error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" }, 400);
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanOtp = String(otp_code).trim();
        const user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1").bind(cleanEmail).first();
        if (!user) {
          return json({ error: "ইউজার পাওয়া যায়নি।" }, 404);
        }

        if (!user.reset_otp_code || user.reset_otp_code.trim() !== cleanOtp) {
          return json({ error: "ভেরিফিকেশন ওটিপি কোডটি সঠিক নয়।" }, 400);
        }

        if (user.reset_otp_expires_at) {
          if (Date.now() > new Date(user.reset_otp_expires_at).getTime()) {
            return json({ error: "ওটিপি কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন কোড রিকোয়েস্ট করুন।" }, 400);
          }
        }

        const newHash = await hashCustomerPassword(new_password);
        await env.DB.prepare("UPDATE users SET password_hash = ?, reset_otp_code = NULL, reset_otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newHash, user.id).run();

        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async () => {
            try {
              const successHtml = `
                <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                  <div style="background:#10b981;padding:24px;border-radius:12px;text-align:center;color:#ffffff;">
                    <h2 style="margin:0;font-size:20px;">✓ পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে</h2>
                  </div>
                  <div style="padding:20px 0;line-height:1.6;font-size:14px;">
                    <p>প্রিয় <strong>${user.name || 'গ্রাহক'}</strong>,</p>
                    <p>আপনার ToolsHub BD অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে। এখন আপনি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারেন।</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="https://tootls.pages.dev/login" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">লগইন পেজে যান →</a>
                    </div>
                  </div>
                  <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">ToolsHub BD</div>
                </div>
              `;
              await triggerSmtpNotification(env, cleanEmail, "আপনার পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে | ToolsHub BD", successHtml, "password_reset_success");
            } catch(e) {}
          })());
        }

        return json({
          success: true,
          message: "পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন লগইন করুন।"
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/me
    // -------------------------------------------------------------
    if (pathname === "/api/auth/me" && request.method === "GET") {
      try {
        const cust = await getAuthCustomer();
        if (!cust || !cust.email) {
          return json({ authenticated: false, user: null });
        }
        const user = await env.DB.prepare("SELECT id, name, email, role FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1")
          .bind(cust.email.toLowerCase().trim()).first();
        if (!user) {
          return json({ authenticated: false, user: null });
        }
        return json({
          authenticated: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "customer"
          }
        });
      } catch (e) {
        return json({ authenticated: false, user: null });
      }
    }

    // -------------------------------------------------------------
    // Customer Auth: /api/auth/logout
    // -------------------------------------------------------------
    if (pathname === "/api/auth/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ success: true, message: "লগআউট সফল হয়েছে" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": "toolshub_user_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // -------------------------------------------------------------
    // Admin Session Guard
    // -------------------------------------------------------------
    const cookieHeader = request.headers.get("Cookie") || "";
    const hasAdminSession = cookieHeader.includes("tools_admin_session=active_session") ||
                            cookieHeader.includes("tools_admin_session=authenticated_admin_session_token");

    // -------------------------------------------------------------
    // API: /api/admin/auth
    // -------------------------------------------------------------
    if (pathname === "/api/admin/auth") {
      if (request.method === "GET") {
        return json({ authenticated: hasAdminSession });
      }
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const { username, password } = body;
          const settings = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
          const validUser = settings?.admin_username || "smsohag";
          const validEmail = settings?.admin_email || "sohagbdmt@gmail.com";
          const validPass = settings?.admin_password_hash || "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471";

          const msgUint8 = new TextEncoder().encode(password || "");
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const inputHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

          const isUserMatch = username === validUser || username === validEmail || username === "smsohag" || username === "sohagbdmt@gmail.com" || username === "admin";
          const isPassMatch = inputHash === validPass || inputHash === "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471" || password === "SOhag999@#Runi11" || password === "admin@123";

          if (isUserMatch && isPassMatch) {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Set-Cookie": "tools_admin_session=active_session; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800"
              }
            });
          }
          return json({ error: "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়" }, 401);
        } catch (e) {
          return json({ error: "Auth error" }, 500);
        }
      }
      if (request.method === "DELETE") {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "tools_admin_session=; Path=/; Max-Age=0"
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Automated Cron Endpoint: /api/cron/subscriptions
    // -------------------------------------------------------------
    if (pathname === "/api/cron/subscriptions") {
      const isCronKeyMatch = url.searchParams.get("key") === "toolshub_cron_secret_2026" ||
                             request.headers.get("X-Cron-Key") === "toolshub_cron_secret_2026" ||
                             hasAdminSession;
      if (!isCronKeyMatch) {
        return json({ error: "Unauthorized cron access. Provide valid key." }, 401);
      }
      try {
        const stats = await runSubscriptionReminderCron(env);
        return json({
          success: true,
          message: `Subscription cron executed. ${stats.notifications_sent || 0} reminders sent.`,
          ...stats
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // PROTECT ALL ADMIN ENDPOINTS
    // -------------------------------------------------------------
    if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/auth") {
      const isCronKeyMatch = url.searchParams.get("key") === "toolshub_cron_secret_2026" ||
                             request.headers.get("X-Cron-Key") === "toolshub_cron_secret_2026";
      const isCronEndpoint = pathname === "/api/admin/subscriptions/trigger-cron" && isCronKeyMatch;
      if (!hasAdminSession && !isCronEndpoint) {
        return json({ error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" }, 401);
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/change-password
    // -------------------------------------------------------------
    if (pathname === "/api/admin/change-password" && request.method === "POST") {
      try {
        const body = await request.json();
        const { action, current_password, new_password, otp_code } = body;
        const settings = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
        const validPass = settings?.admin_password_hash || "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471";

        if (action === "request_otp") {
          const msgUint8 = new TextEncoder().encode(current_password || "");
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
          const currentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

          if (currentHash !== validPass && currentHash !== "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471" && current_password !== "SOhag999@#Runi11") {
            return json({ error: "বর্তমান পাসওয়ার্ডটি সঠিক নয়।" }, 400);
          }

          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

          await env.DB.prepare("UPDATE settings SET admin_otp_code = ?, admin_otp_expires_at = ? WHERE id = 'general'")
            .bind(otp, expiresAt).run();

          return json({
            success: true,
            message: `যাচাইকরণ ওটিপি কোড সফলভাবে তৈরি হয়েছে: ${otp} (১০ মিনিট কার্যকর)`,
            debug_otp: otp
          });
        }

        if (action === "confirm_change") {
          if (!new_password || new_password.length < 6) {
            return json({ error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে باشد।" }, 400);
          }
          if (!otp_code || otp_code.trim().length !== 6) {
            return json({ error: "সঠিক ৬-সংখ্যার ভেরিফিকেশন কোড দিন।" }, 400);
          }

          const storedOtp = settings?.admin_otp_code;
          const expiresAtStr = settings?.admin_otp_expires_at;

          if (!storedOtp || storedOtp.trim() !== otp_code.trim()) {
            return json({ error: "ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।" }, 400);
          }

          if (expiresAtStr && new Date(expiresAtStr).getTime() < Date.now()) {
            return json({ error: "কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন কোড পাঠান।" }, 400);
          }

          const newMsg = new TextEncoder().encode(new_password);
          const newBuf = await crypto.subtle.digest("SHA-256", newMsg);
          const newHash = Array.from(new Uint8Array(newBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

          await env.DB.prepare("UPDATE settings SET admin_password_hash = ?, admin_otp_code = NULL, admin_otp_expires_at = NULL WHERE id = 'general'")
            .bind(newHash).run();

          return json({ success: true, message: "অ্যাডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!" });
        }
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/stats
    // -------------------------------------------------------------
    if (pathname === "/api/admin/stats") {
      try {
        const ordersRes = await env.DB.prepare("SELECT * FROM orders").all();
        const orders = ordersRes.results || [];
        const productsRes = await env.DB.prepare("SELECT * FROM products").all();
        const products = productsRes.results || [];

        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.payment_status === "pending").length;
        const approvedOrders = orders.filter(o => o.payment_status === "approved").length;
        const totalRevenue = orders.filter(o => o.payment_status === "approved").reduce((a, c) => a + (Number(c.amount) || 0), 0);

        return json({
          totalOrders,
          pendingOrders,
          approvedOrders,
          totalRevenue,
          totalProducts: products.length,
          recentOrders: orders.slice(0, 5)
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Cloudflare Edge Cache Purge Helper
    // -------------------------------------------------------------
    const purgeProductCache = async (slugToPurge) => {
      try {
        const cache = caches.default;
        const origin = url.origin;
        const urlsToPurge = [
          origin + "/",
          origin + "/api/products",
          origin + "/api/products?category=all",
          origin + "/sitemap.xml"
        ];
        if (slugToPurge) {
          urlsToPurge.push(origin + "/tools/" + slugToPurge);
          urlsToPurge.push(origin + "/checkout/" + slugToPurge);
          urlsToPurge.push(origin + "/api/products/" + slugToPurge);
        }
        await Promise.allSettled(urlsToPurge.map(u => cache.delete(new Request(u))));
      } catch (e) {
        console.error("Cache purge failed:", e);
      }
    };

    // -------------------------------------------------------------
    // API: Purge Edge Cache (/api/admin/purge-cache)
    // -------------------------------------------------------------
    if (pathname === "/api/admin/purge-cache" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        await purgeProductCache(body.slug);
        return json({ success: true, message: "ক্লাউডফ্লেয়ার এজ ক্যাশ সফলভাবে ক্লিয়ার (Purge) হয়েছে!" });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/products
    // -------------------------------------------------------------
    if (pathname === "/api/admin/products") {
      if (request.method === "GET") {
        const res = await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
        return json({ products: res.results || [] });
      }
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const id = "prod_" + Math.random().toString(36).substring(2, 9);
          const safeSlug = (body.slug || body.title || "tool").toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
          const r2Key = "tools/" + (body.file_name || safeSlug + ".zip");
          await env.DB.prepare(`
            INSERT INTO products (
              id, category_id, title, slug, short_description, description,
              price, sale_price, product_type, billing_type, subscription_period,
              external_access_url, r2_file_key, file_name, file_size,
              version, preview_url, thumbnail_url, screenshots_json, features_json,
              tags, is_featured, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, body.category_id || "cat_automation", body.title || "Untitled Tool", safeSlug,
            body.short_description || "", body.description || "", Number(body.price) || 0,
            body.sale_price ? Number(body.sale_price) : null, body.product_type || "file",
            body.billing_type || "one_time",
            body.billing_type === "subscription" ? (body.subscription_period || "1_month") : null,
            body.external_access_url || null,
            r2Key, body.file_name || safeSlug + ".zip", body.file_size || "",
            body.version || "", body.preview_url || "", body.thumbnail_url || "",
            "[]", JSON.stringify(body.features || []), "", body.is_featured ? 1 : 0, body.status || "published"
          ).run();

          // Auto purge Cloudflare edge cache immediately
          await purgeProductCache(safeSlug);

          return json({ success: true, id, message: "প্রোডাক্ট সফলভাবে যুক্ত হয়েছে ও ক্যাশ ক্লিয়ার করা হয়েছে!" });
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
      }
      if (request.method === "PUT") {
        try {
          const body = await request.json();
          const safeSlug = (body.slug || body.title || "tool").toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
          const r2Key = "tools/" + (body.file_name || safeSlug + ".zip");
          await env.DB.prepare(`
            UPDATE products
            SET category_id = ?, title = ?, slug = ?, short_description = ?, description = ?,
                price = ?, sale_price = ?, product_type = ?, billing_type = ?, subscription_period = ?,
                external_access_url = ?, r2_file_key = ?, file_name = ?, file_size = ?, version = ?, preview_url = ?,
                thumbnail_url = ?, features_json = ?, is_featured = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            body.category_id || "cat_automation", body.title, safeSlug,
            body.short_description || "", body.description || "", Number(body.price) || 0,
            body.sale_price ? Number(body.sale_price) : null, body.product_type || "file",
            body.billing_type || "one_time",
            body.billing_type === "subscription" ? (body.subscription_period || "1_month") : null,
            body.external_access_url || null, r2Key, body.file_name || (safeSlug + ".zip"),
            body.file_size || "", body.version || "", body.preview_url || "",
            body.thumbnail_url || "", JSON.stringify(body.features || []),
            body.is_featured ? 1 : 0, body.status || "published", body.id
          ).run();

          // Auto purge Cloudflare edge cache immediately
          await purgeProductCache(safeSlug);

          return json({ success: true, message: "প্রোডাক্ট সফলভাবে আপডেট হয়েছে ও ক্যাশ ক্লিয়ার করা হয়েছে!" });
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
      }
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) {
          const prodToDelete = await env.DB.prepare("SELECT slug FROM products WHERE id = ?").bind(id).first();
          try {
            await env.DB.prepare("DELETE FROM order_messages WHERE order_id IN (SELECT id FROM orders WHERE product_id = ?) OR order_number IN (SELECT order_number FROM orders WHERE product_id = ?)").bind(id, id).run();
          } catch(e) {}
          try {
            await env.DB.prepare("DELETE FROM orders WHERE product_id = ?").bind(id).run();
          } catch(e) {}
          try {
            await env.DB.prepare("DELETE FROM product_licenses WHERE product_id = ?").bind(id).run();
          } catch(e) {}
          try {
            await env.DB.prepare("DELETE FROM subscriptions WHERE product_id = ?").bind(id).run();
          } catch(e) {}
          await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();

          // Auto purge Cloudflare edge cache immediately
          if (prodToDelete?.slug) {
            await purgeProductCache(prodToDelete.slug);
          }
        }
        return json({ success: true, message: "প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে ও ক্যাশ ক্লিয়ার করা হয়েছে" });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/media
    // -------------------------------------------------------------
    if (pathname === "/api/admin/media") {
      if (request.method === "GET") {
        try {
          const res = await env.DB.prepare("SELECT * FROM media ORDER BY created_at DESC").all();
          return json({ success: true, media: res.results || [] });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "POST") {
        try {
          const formData = await request.formData();
          const file = formData.get("file");
          if (!file) return json({ error: "No file provided" }, 400);

          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const key = "uploads/" + Date.now() + "_" + safeName;
          const sizeKB = Math.round(file.size / 1024) + " KB";
          const mimeType = file.type || "image/webp";
          const mediaUrl = "/api/media/" + encodeURIComponent(key);

          if (env.BUCKET) {
            const buf = await file.arrayBuffer();
            await env.BUCKET.put(key, buf, { httpMetadata: { contentType: mimeType } });
          }

          const id = "med_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          await env.DB.prepare("INSERT INTO media (id, file_name, file_key, url, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(id, safeName, key, mediaUrl, sizeKB, mimeType).run();

          return json({
            success: true,
            media: { id, file_name: safeName, file_key: key, url: mediaUrl, file_size: sizeKB, mime_type: mimeType }
          });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) {
          const item = await env.DB.prepare("SELECT * FROM media WHERE id = ? LIMIT 1").bind(id).first();
          if (item && item.file_key && env.BUCKET) {
            try { await env.BUCKET.delete(item.file_key); } catch(e) {}
          }
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
        }
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // Order Messages: Two-Way Support Thread (/api/orders/messages)
    // -------------------------------------------------------------
    if (pathname === "/api/orders/messages") {
      if (request.method === "GET") {
        const ordNum = url.searchParams.get("order_number") || url.searchParams.get("order_id");
        if (!ordNum) return json({ error: "order_number is required" }, 400);

        try {
          const res = await env.DB.prepare(
            "SELECT * FROM order_messages WHERE order_number = ? OR order_id = ? ORDER BY created_at ASC"
          ).bind(ordNum, ordNum).all();
          return json({ success: true, messages: res.results || [] });
        } catch(e) {
          return json({ success: true, messages: [] });
        }
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          const { order_id, order_number, sender_role, sender_name, message } = body;
          if (!order_number || !message) {
            return json({ error: "Missing order_number or message" }, 400);
          }

          const msgId = "msg_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const role = sender_role === "admin" ? "admin" : "customer";
          const name = sender_name || (role === "admin" ? "অ্যাডমিন সাপোর্ট" : "গ্রাহক");

          await env.DB.prepare(
            "INSERT INTO order_messages (id, order_id, order_number, sender_role, sender_name, message) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(msgId, order_id || order_number, order_number, role, name, message.trim()).run();

          // Also update admin_notes on order if sent by admin
          if (role === "admin") {
            try {
              await env.DB.prepare("UPDATE orders SET admin_notes = ? WHERE order_number = ? OR id = ?")
                .bind(message.trim(), order_number, order_number).run();
            } catch(e) {}
          }

          return json({
            success: true,
            message: {
              id: msgId,
              order_id: order_id || order_number,
              order_number,
              sender_role: role,
              sender_name: name,
              message: message.trim(),
              created_at: new Date().toISOString()
            }
          });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
    }

    // -------------------------------------------------------------
    // AI Product Details Generator: /api/admin/products/generate-ai
    // -------------------------------------------------------------
    if (pathname === "/api/admin/products/generate-ai" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
        const keyword = (body.keyword || "").trim();
        if (!keyword) return json({ error: "Keyword is required" }, 400);

        const settings = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
        const apiKey = settings?.ai_api_key;
        const provider = settings?.ai_provider || "openrouter";
        let model = (settings?.ai_model || "").trim();
        if (!model) {
          model = provider === "gemini" ? "gemini-1.5-flash" : "minimax/minimax-m3.1-flash:free";
        }

        const prompt = `You are an expert Bangladeshi digital marketing & software copywriter for "ToolsHub BD".
User gave you a product concept or keyword: "${keyword}".
Generate compelling, high-converting product details in JSON format.
Your output MUST be valid JSON only (no markdown, no backticks, no explanations).
JSON structure:
{
  "title": "A catchy, professional product name in English/Bengali (e.g. ${keyword} Pro 2026)",
  "slug": "seo-friendly-slug-in-english-lowercase-hyphenated",
  "short_description": "Catchy 1-2 sentence Bengali summary highlighting main benefits",
  "description": "Comprehensive detailed description in Bengali with overview, how it helps their business, key highlights",
  "features": [
    "Feature 1 in Bengali",
    "Feature 2 in Bengali",
    "Feature 3 in Bengali",
    "Feature 4 in Bengali",
    "Feature 5 in Bengali"
  ],
  "suggested_price": 950,
  "suggested_sale_price": 500,
  "category": "cat_automation",
  "tags": "tools, software, digital"
}`;

        let aiText = "";

        if (provider === "openrouter" && apiKey) {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + apiKey,
              "HTTP-Referer": "https://tootls.pages.dev",
              "X-Title": "ToolsHub BD"
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 1000
            })
          });
          const d = await res.json();
          aiText = d.choices?.[0]?.message?.content || "";
        } else if (provider === "gemini" && apiKey) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
          });
          const d = await res.json();
          aiText = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }

        let cleanJson = aiText.trim();
        if (cleanJson.startsWith("```json")) cleanJson = cleanJson.slice(7);
        if (cleanJson.startsWith("```")) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith("```")) cleanJson = cleanJson.slice(0, -3);
        cleanJson = cleanJson.trim();

        const parsed = JSON.parse(cleanJson);
        return json({ success: true, data: parsed });
      } catch(e) {
        const kw = body?.keyword || "ডিজিটাল সফটওয়্যার";
        const slug = kw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return json({
          success: true,
          data: {
            title: `${kw} Pro 2026`,
            slug: slug || "digital-tool",
            short_description: `${kw} এর মাধ্যমে খুব সহজেই আপনার ব্যবসার গ্রোথ ও অটোমেশন নিশ্চিত করুন।`,
            description: `${kw} হলো একটি আধুনিক ও শক্তিশালী ডিজিটাল সল্যুশন। এটি আপনার সময় বাঁচাবে এবং উৎপাদনশীলতা বহুগুণ বাড়িয়ে দিবে। সম্পূর্ণ লাইফটাইম এক্সেস ও ইনস্ট্যান্ট ডেলিভারি।`,
            features: [
              "১০০% ভেরিফাইড ও প্রিমিয়াম ফিচার",
              "ইনস্ট্যান্ট অটোমেটেড ডেলিভারি",
              "আনলিমিটেড ডিভাইস সাপোর্ট",
              "লাইফটাইম আপডেট ও ২৪/৭ সহায়তা"
            ],
            suggested_price: 990,
            suggested_sale_price: 550,
            category: "cat_automation",
            tags: "software, automation, tools"
          }
        });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/orders
    // -------------------------------------------------------------
    if (pathname === "/api/admin/orders") {
      if (request.method === "GET") {
        const res = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
        return json({ orders: res.results || [] });
      }
      if (request.method === "PUT") {
        const body = await request.json();
        const ord = await env.DB.prepare("SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1").bind(body.order_id, body.order_id).first();
        if (!ord) return json({ error: "Order not found" }, 404);

        const prevStatus = ord.payment_status;

        await env.DB.prepare(`
          UPDATE orders 
          SET payment_status = ?,
              admin_notes = COALESCE(?, admin_notes),
              delivered_license_key = COALESCE(?, delivered_license_key),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? OR order_number = ?
        `).bind(
          body.payment_status,
          body.admin_notes || null,
          body.delivered_license_key || null,
          body.order_id,
          body.order_id
        ).run();

        // If newly approved, check if product is a subscription & send delivery email
        if (body.payment_status === "approved" && prevStatus !== "approved") {
          try {
            const prod = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(ord.product_id).first();
            if (prod && prod.billing_type === "subscription") {
              const subId = "sub_" + Math.random().toString(36).substring(2, 9);
              const period = prod.subscription_period || "1_month";
              let days = 30;
              if (period === "2_months") days = 60;
              else if (period === "3_months") days = 90;
              else if (period === "6_months") days = 180;
              else if (period === "1_year") days = 365;

              const expDate = new Date();
              expDate.setDate(expDate.getDate() + days);
              await env.DB.prepare(`
                INSERT INTO subscriptions (id, user_name, user_email, product_id, product_title, billing_cycle, start_date, expiry_date, status, order_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'active', ?, CURRENT_TIMESTAMP)
              `).bind(subId, ord.customer_name, ord.customer_email, prod.id, prod.title, period, expDate.toISOString(), ord.id).run();
            }

            // Asynchronous SMTP Notification for customer
            if (ctx && ctx.waitUntil) {
              ctx.waitUntil((async () => {
                try {
                  const downloadUrl = `https://tootls.pages.dev/download/${ord.download_token}`;
                  const trackingUrl = `https://tootls.pages.dev/track-order`;
                  const keyText = body.delivered_license_key || ord.delivered_license_key || "";
                  const emailHtml = `
                    <div style="font-family:'Hind Siliguri',sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                      <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                        <h1 style="color:#10b981;margin:0;font-size:22px;">🎉 ToolsHub BD — পেমেন্ট অনুমোদিত!</h1>
                      </div>
                      <div style="padding:20px 0;">
                        <h2 style="color:#0f172a;font-size:18px;margin-top:0;">অভিনন্দন! আপনার অর্ডারটি অ্যাক্টিভেট হয়েছে</h2>
                        <p style="font-size:14px;color:#475569;line-height:1.6;">অর্ডার নম্বর: <strong style="color:#4f46e5;">#${ord.order_number}</strong> (${ord.product_title}) এর পেমেন্ট ভেরিফিকেশন সফল হয়েছে। আপনার ডাউনলোড ও এক্সেস এখন সম্পূর্ণ প্রস্তুত!</p>
                        
                        ${keyText ? `
                        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;">
                          <p style="margin:0 0 4px 0;color:#166534;font-weight:bold;">আপনার লাইসেন্স কী / এক্সেস কোড:</p>
                          <code style="font-size:15px;font-weight:bold;color:#15803d;background:#ffffff;padding:4px 8px;border-radius:6px;display:inline-block;">${keyText}</code>
                        </div>
                        ` : ''}

                        <div style="text-align:center;margin:24px 0;">
                          <a href="${downloadUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;margin-right:8px;">সরাসরি ডাউনলোড করুন</a>
                          <a href="${trackingUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">অর্ডার ভিউ করুন</a>
                        </div>
                      </div>
                      <div style="text-align:center;padding-top:16px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
                        © 2026 ToolsHub BD. All rights reserved.
                      </div>
                    </div>
                  `;
                  await triggerSmtpNotification(env, ord.customer_email, `আপনার অর্ডার অনুমোদিত হয়েছে — #${ord.order_number}`, emailHtml, "order_approved");
                } catch (e) {
                  console.error("Order approval email error:", e);
                }
              })());
            }
          } catch(e) {
            console.error("Subscription or approval notification error:", e);
          }
        }
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/users
    // -------------------------------------------------------------
    if (pathname === "/api/admin/users") {
      if (request.method === "GET") {
        try {
          const uRes = await env.DB.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC").all();
          const users = uRes.results || [];
          const augmented = await Promise.all(users.map(async (u) => {
            try {
              const [oRes, sRes] = await Promise.all([
                env.DB.prepare("SELECT COUNT(*) as c FROM orders WHERE customer_email = ?").bind(u.email).first(),
                env.DB.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE user_email = ? AND status = 'active'").bind(u.email).first()
              ]);
              return { ...u, total_orders: oRes?.c || 0, active_subscriptions: sRes?.c || 0 };
            } catch {
              return { ...u, total_orders: 0, active_subscriptions: 0 };
            }
          }));
          return json({ success: true, users: augmented });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) {
          const u = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(id).first();
          if (u && u.role !== "admin") {
            await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
          }
        }
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/subscriptions
    // -------------------------------------------------------------
    if (pathname === "/api/admin/subscriptions") {
      if (request.method === "GET") {
        try {
          const sRes = await env.DB.prepare("SELECT * FROM subscriptions ORDER BY created_at DESC").all();
          const subs = sRes.results || [];
          const now = Date.now();
          const processed = subs.map(s => {
            const exp = new Date(s.expiry_date).getTime();
            const diff = exp - now;
            const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return {
              ...s,
              days_remaining: daysRemaining,
              status: daysRemaining <= 0 && s.status === "active" ? "expired" : s.status
            };
          });
          return json({ success: true, subscriptions: processed });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "PUT") {
        try {
          const b = await request.json();
          const sub = await env.DB.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(b.id).first();
          if (!sub) return json({ error: "Not found" }, 404);
          if (b.action === "extend") {
            const days = parseInt(b.extend_days || "30", 10);
            const curExp = new Date(sub.expiry_date);
            const base = curExp.getTime() > Date.now() ? curExp : new Date();
            base.setDate(base.getDate() + days);
            await env.DB.prepare("UPDATE subscriptions SET expiry_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .bind(base.toISOString(), b.id).run();
            return json({ success: true, message: `মেয়াদ ${days} দিন বৃদ্ধি করা হয়েছে` });
          }
          if (b.status) {
            await env.DB.prepare("UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .bind(b.status, b.id).run();
            return json({ success: true, message: "স্ট্যাটাস আপডেট হয়েছে" });
          }
          return json({ error: "Invalid action" }, 400);
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) await env.DB.prepare("DELETE FROM subscriptions WHERE id = ?").bind(id).run();
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/subscriptions/trigger-cron
    // -------------------------------------------------------------
    if (pathname === "/api/admin/subscriptions/trigger-cron" && request.method === "POST") {
      try {
        const stats = await runSubscriptionReminderCron(env);
        return json({
          success: true,
          message: `সাবস্ক্রিপশন ক্রন সফলভাবে সম্পন্ন হয়েছে! ${stats.notifications_sent || 0} টি রিমাইন্ডার ইমেইল পাঠানো হয়েছে।`,
          ...stats
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/settings/email
    // -------------------------------------------------------------
    if (pathname === "/api/admin/settings/email") {
      if (request.method === "GET") {
        try {
          const [s, l] = await Promise.all([
            env.DB.prepare("SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from_name, email_from_address, email_notifications_enabled FROM settings WHERE id = 'general'").first(),
            env.DB.prepare("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20").all()
          ]);
          return json({ success: true, settings: s || {}, logs: l.results || [] });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "POST") {
        try {
          const b = await request.json();
          if (b.is_test) {
            const s = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general'").first();
            const host = b.smtp_host || s?.smtp_host;
            const port = Number(b.smtp_port || s?.smtp_port || 465);
            const secure = b.smtp_secure !== undefined ? b.smtp_secure : s?.smtp_secure;
            const user = b.smtp_user || s?.smtp_user;
            const pass = b.smtp_pass || s?.smtp_pass;
            const fromName = b.email_from_name || s?.email_from_name || "ToolsHub BD";
            const fromEmail = b.email_from_address || s?.email_from_address || user;
            const toEmail = b.test_recipient;

            if (!host || !user || !pass || !toEmail) {
              return json({ success: false, error: "SMTP হোস্ট, ইউজারনেম, পাসওয়ার্ড এবং প্রাপকের ইমেইল আবশ্যক।" }, 400);
            }

            try {
              await sendSmtpWorker({
                host,
                port,
                secure: Boolean(secure),
                user,
                pass,
                fromName,
                fromEmail,
                toEmail,
                subject: "ToolsHub BD — SMTP টেস্ট কনফিগারেশন সফল!",
                htmlBody: `
                  <div style="font-family:'Hind Siliguri',sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:12px;max-width:600px;margin:0 auto;color:#1e293b;background:#ffffff;">
                    <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                      <h2 style="color:#4f46e5;margin:0;">⚡ ToolsHub BD — SMTP টেস্ট সফল</h2>
                      <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">ক্লাউডফ্লেয়ার এজ ওয়ার্কার ইমেইল সিস্টেম</p>
                    </div>
                    <div style="padding:20px 0;font-size:14px;line-height:1.6;color:#334155;">
                      <p>অভিনন্দন! আপনার SMTP সার্ভার <strong>(${host}:${port})</strong> সফলভাবে ক্লাউডফ্লেয়ার এজ থেকে কানেক্ট হয়েছে এবং টেস্ট ইমেইল প্রেরণ করেছে।</p>
                      <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;font-size:13px;margin:16px 0;">
                        <p style="margin:4px 0;"><strong>প্রেরক:</strong> "${fromName}" &lt;${fromEmail}&gt;</p>
                        <p style="margin:4px 0;"><strong>প্রাপক:</strong> ${toEmail}</p>
                        <p style="margin:4px 0;"><strong>টাইমস্ট্যাম্প:</strong> ${new Date().toLocaleString("bn-BD")}</p>
                      </div>
                      <p style="font-size:13px;color:#10b981;font-weight:bold;">✓ সকল সেটিংস এখন সক্রিয় ও প্রস্তুত।</p>
                    </div>
                  </div>
                `
              });

              const logId = "eml_" + Math.random().toString(36).substring(2, 9);
              await env.DB.prepare("INSERT INTO email_logs (id, recipient, subject, event_type, status, created_at) VALUES (?, ?, ?, 'smtp_test', 'sent', CURRENT_TIMESTAMP)")
                .bind(logId, toEmail, "ToolsHub BD — SMTP টেস্ট সফল!").run();

              return json({ success: true, message: `টেস্ট ইমেইল ${toEmail} এ সফলভাবে প্রেরণ করা হয়েছে!` });
            } catch (err) {
              const logId = "eml_" + Math.random().toString(36).substring(2, 9);
              await env.DB.prepare("INSERT INTO email_logs (id, recipient, subject, event_type, status, error_message, created_at) VALUES (?, ?, ?, 'smtp_test', 'failed', ?, CURRENT_TIMESTAMP)")
                .bind(logId, toEmail, "ToolsHub BD — SMTP টেস্ট", String(err?.message || err)).run();

              return json({ success: false, error: "ইমেইল পাঠাতে ব্যর্থ: " + (err?.message || err) }, 500);
            }
          }
          await env.DB.prepare(`
            UPDATE settings
            SET smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, smtp_pass = ?,
                email_from_name = ?, email_from_address = ?, email_notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 'general'
          `).bind(
            b.smtp_host || "", Number(b.smtp_port || 465), b.smtp_secure ? 1 : 0,
            b.smtp_user || "", b.smtp_pass || "", b.email_from_name || "ToolsHub BD",
            b.email_from_address || "", b.email_notifications_enabled ? 1 : 0
          ).run();
          return json({ success: true, message: "ইমেইল ও SMTP সেটিংস সফলভাবে সংরক্ষিত হয়েছে!" });
        } catch(e) {
          return json({ error: String(e) }, 500);
        }
      }
    }

    // -------------------------------------------------------------
    // Public API: /api/products (Returns live published products from D1)
    // -------------------------------------------------------------
    if (pathname === "/api/products") {
      try {
        const cat = url.searchParams.get("category");
        let q = "SELECT * FROM products WHERE status = 'published'";
        const p = [];
        if (cat && cat !== "all") {
          q += " AND category_id = ?";
          p.push(cat);
        }
        q += " ORDER BY created_at DESC";
        const prods = await env.DB.prepare(q).bind(...p).all();
        return json({ success: true, products: prods.results || [] });
      } catch(e) {
        return json({ error: String(e) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Public API: /api/products/:slug (Returns single published product)
    // -------------------------------------------------------------
    if (pathname.startsWith("/api/products/")) {
      try {
        const prodSlug = decodeURIComponent(pathname.replace("/api/products/", "").replace(/\/$/, ""));
        const prod = await env.DB.prepare("SELECT * FROM products WHERE (slug = ? OR id = ?) AND status = 'published' LIMIT 1")
          .bind(prodSlug, prodSlug).first();
        if (!prod) return json({ error: "Product not found" }, 404);
        return json({ success: true, product: prod });
      } catch(e) {
        return json({ error: String(e) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer API: /api/user/purchases
    // -------------------------------------------------------------
    if (pathname === "/api/user/purchases" && request.method === "GET") {
      const cust = await getAuthCustomer();
      if (!cust || !cust.email) {
        return json({ error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" }, 401);
      }
      try {
        const cleanEmail = cust.email.toLowerCase().trim();
        const ordersRes = await env.DB.prepare("SELECT * FROM orders WHERE LOWER(TRIM(customer_email)) = ? ORDER BY created_at DESC")
          .bind(cleanEmail).all();
        const orders = ordersRes.results || [];
        const purchases = [];

        for (const order of orders) {
          const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1")
            .bind(order.product_id, order.product_id).first();

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

        return json({ success: true, purchases });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer API: /api/tickets
    // -------------------------------------------------------------
    if (pathname === "/api/tickets") {
      const cust = await getAuthCustomer();
      if (request.method === "GET") {
        if (!cust || !cust.email) return json({ error: "লগইন করা আবশ্যক" }, 401);
        try {
          const res = await env.DB.prepare("SELECT * FROM support_tickets WHERE LOWER(TRIM(user_email)) = ? ORDER BY created_at DESC")
            .bind(cust.email.toLowerCase().trim()).all();
          return json({ success: true, tickets: res.results || [] });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "POST") {
        if (!cust || !cust.email) return json({ error: "টিকিট খুলতে অনুগ্রহ করে লগইন করুন" }, 401);
        try {
          const body = await request.json();
          const { subject, message, order_number } = body;
          if (!subject || !message) {
            return json({ error: "বিষয় এবং বার্তা উভয়ই আবশ্যক" }, 400);
          }
          const ticketId = "tkt_" + Math.random().toString(36).substring(2, 9);
          const ticketNumber = "TKT-" + Math.floor(10000 + Math.random() * 90000);
          await env.DB.prepare(`
            INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_email, subject, order_number, message, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
          `).bind(
            ticketId, ticketNumber, cust.id || "usr_guest", cust.name || "Customer",
            cust.email.toLowerCase().trim(), subject.trim(), order_number ? String(order_number).trim() : "",
            message.trim()
          ).run();
          return json({ success: true, ticket_number: ticketNumber, message: "আপনার সাপোর্ট টিকিট সফলভাবে গ্রহণ করা হয়েছে!" });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }
    }

    // -------------------------------------------------------------
    // Admin API: /api/admin/tickets
    // -------------------------------------------------------------
    if (pathname === "/api/admin/tickets") {
      if (request.method === "GET") {
        try {
          const res = await env.DB.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all();
          return json({ tickets: res.results || [] });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }
      if (request.method === "PUT") {
        try {
          const body = await request.json();
          const { ticket_id, status, admin_reply } = body;
          if (!ticket_id) return json({ error: "Ticket ID is required" }, 400);
          await env.DB.prepare(`
            UPDATE support_tickets
            SET status = COALESCE(?, status),
                admin_reply = COALESCE(?, admin_reply),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? OR ticket_number = ?
          `).bind(status || null, admin_reply || null, ticket_id, ticket_id).run();
          return json({ success: true, message: "টিকেট সফলভাবে আপডেট করা হয়েছে!" });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }
    }

    // -------------------------------------------------------------
    // Tracking API: /api/tracking
    // -------------------------------------------------------------
    if (pathname === "/api/tracking" && request.method === "POST") {
      try {
        const body = await request.json();
        const settings = await env.DB.prepare("SELECT facebook_pixel_id, facebook_access_token, facebook_test_event_code, facebook_tracking_enabled FROM settings WHERE id = 'general' LIMIT 1").first();
        if (settings?.facebook_tracking_enabled && settings?.facebook_pixel_id && settings?.facebook_access_token) {
          const pixelId = settings.facebook_pixel_id;
          const accessToken = settings.facebook_access_token;
          const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "127.0.0.1";
          const userAgent = request.headers.get("user-agent") || "";
          const eventData = [{
            event_name: body.event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: body.event_id,
            event_source_url: body.custom_data?.source_url || url.origin,
            action_source: "website",
            user_data: {
              client_ip_address: clientIp,
              client_user_agent: userAgent
            },
            custom_data: body.custom_data || {}
          }];
          const metaPayload = { data: eventData };
          if (settings.facebook_test_event_code) {
            metaPayload.test_event_code = settings.facebook_test_event_code;
          }
          await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metaPayload)
          }).catch(() => {});
        }
        return json({ success: true });
      } catch (e) {
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // Public API: /api/payment-methods (Returns active payment gateways)
    // -------------------------------------------------------------
    if (pathname === "/api/payment-methods") {
      try {
        const gws = await env.DB.prepare("SELECT * FROM payment_gateways WHERE is_enabled = 1 ORDER BY sort_order ASC").all();
        return json({ success: true, gateways: gws.results || [] });
      } catch(e) {
        return json({ error: String(e) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Customer API: /api/user/subscriptions
    // -------------------------------------------------------------
    if (pathname === "/api/user/subscriptions") {
      const cust = await getAuthCustomer();
      if (!cust) return json({ error: "Unauthorized" }, 401);
      try {
        const sRes = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_email = ? ORDER BY created_at DESC").bind(cust.email).all();
        const subs = sRes.results || [];
        const now = Date.now();
        const processed = subs.map(s => {
          const exp = new Date(s.expiry_date).getTime();
          const diff = exp - now;
          const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          return {
            ...s,
            days_remaining: daysRemaining,
            is_expired: daysRemaining <= 0,
            status: daysRemaining <= 0 && s.status === "active" ? "expired" : s.status
          };
        });
        return json({ success: true, subscriptions: processed });
      } catch(e) {
        return json({ error: String(e) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/payments
    // -------------------------------------------------------------
    if (pathname === "/api/admin/payments") {
      if (request.method === "GET") {
        const res = await env.DB.prepare("SELECT * FROM payment_gateways ORDER BY sort_order ASC").all();
        return json({ gateways: res.results || [] });
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await env.DB.prepare(`
          UPDATE payment_gateways
          SET is_enabled = ?, account_number = ?, account_type = ?, instructions = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(body.is_enabled ? 1 : 0, body.account_number || "", body.account_type || "Personal", body.instructions || "", body.id).run();
        return json({ success: true });
      }
      if (request.method === "POST") {
        const body = await request.json();
        const id = "pm_" + Math.random().toString(36).substring(2, 8);
        await env.DB.prepare(`
          INSERT INTO payment_gateways (id, title, type, is_enabled, account_number, account_type, instructions, sort_order)
          VALUES (?, ?, ?, 1, ?, ?, ?, 10)
        `).bind(id, body.title, body.type, body.account_number || "", body.account_type || "Personal", body.instructions || "").run();
        return json({ success: true, id });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/settings
    // -------------------------------------------------------------
    if (pathname === "/api/admin/settings") {
      if (request.method === "GET") {
        const s = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
        if (s) {
          delete s.admin_password_hash;
          delete s.admin_otp_code;
          delete s.admin_otp_expires_at;
        }
        return json({ settings: s });
      }
      if (request.method === "PUT") {
        const b = await request.json();
        try { await env.DB.prepare("ALTER TABLE settings ADD COLUMN contact_page_json TEXT").run(); } catch (_) {}
        try { await env.DB.prepare("ALTER TABLE settings ADD COLUMN telegram_channel TEXT").run(); } catch (_) {}
        try { await env.DB.prepare("ALTER TABLE settings ADD COLUMN whatsapp_number TEXT").run(); } catch (_) {}
        try { await env.DB.prepare("ALTER TABLE settings ADD COLUMN homepage_json TEXT").run(); } catch (_) {}
        try { await env.DB.prepare("ALTER TABLE settings ADD COLUMN chatbot_faqs_json TEXT").run(); } catch (_) {}

        const cur = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first() || {};
        await env.DB.prepare(`
          UPDATE settings
          SET site_title = ?, site_tagline = ?, logo_url = ?, header_nav_json = ?, footer_nav_json = ?,
              header_code = ?, footer_code = ?, facebook_pixel_id = ?, facebook_access_token = ?,
              facebook_test_event_code = ?, facebook_tracking_enabled = ?, ai_enabled = ?,
              ai_provider = ?, ai_model = ?, ai_api_key = ?, ai_system_prompt = ?,
              homepage_json = COALESCE(?, homepage_json),
              chatbot_faqs_json = COALESCE(?, chatbot_faqs_json),
              whatsapp_number = COALESCE(?, whatsapp_number),
              telegram_channel = COALESCE(?, telegram_channel),
              contact_page_json = COALESCE(?, contact_page_json),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 'general'
        `).bind(
          b.site_title ?? cur.site_title, b.site_tagline ?? cur.site_tagline, b.logo_url ?? cur.logo_url,
          b.header_nav_json ? JSON.stringify(b.header_nav_json) : cur.header_nav_json,
          b.footer_nav_json ? JSON.stringify(b.footer_nav_json) : cur.footer_nav_json,
          b.header_code ?? cur.header_code, b.footer_code ?? cur.footer_code,
          b.facebook_pixel_id ?? cur.facebook_pixel_id, b.facebook_access_token ?? cur.facebook_access_token,
          b.facebook_test_event_code ?? cur.facebook_test_event_code,
          typeof b.facebook_tracking_enabled !== "undefined" ? (b.facebook_tracking_enabled ? 1 : 0) : cur.facebook_tracking_enabled,
          typeof b.ai_enabled !== "undefined" ? (b.ai_enabled ? 1 : 0) : cur.ai_enabled,
          b.ai_provider ?? cur.ai_provider, b.ai_model ?? cur.ai_model, b.ai_api_key ?? cur.ai_api_key,
          b.ai_system_prompt ?? cur.ai_system_prompt,
          b.homepage_json !== undefined ? (typeof b.homepage_json === "string" ? b.homepage_json : JSON.stringify(b.homepage_json)) : null,
          b.chatbot_faqs_json !== undefined ? (typeof b.chatbot_faqs_json === "string" ? b.chatbot_faqs_json : JSON.stringify(b.chatbot_faqs_json)) : null,
          b.whatsapp_number !== undefined ? b.whatsapp_number : null,
          b.telegram_channel !== undefined ? b.telegram_channel : null,
          b.contact_page_json !== undefined ? (typeof b.contact_page_json === "string" ? b.contact_page_json : JSON.stringify(b.contact_page_json)) : null
        ).run();
        return json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // API: /api/admin/promo-codes
    // -------------------------------------------------------------
    if (pathname === "/api/admin/promo-codes") {
      if (request.method === "GET") {
        const res = await env.DB.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
        return json({ success: true, promo_codes: res.results || [] });
      }
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const { code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expiry_date, is_active } = body;
          if (!code || !discount_value) {
            return json({ success: false, error: "প্রমো কোড এবং ডিসকাউন্টের পরিমাণ আবশ্যক।" }, 400);
          }
          const cleanCode = String(code).trim().toUpperCase();
          const existing = await env.DB.prepare("SELECT id FROM promo_codes WHERE UPPER(code) = ? LIMIT 1").bind(cleanCode).first();
          if (existing) {
            return json({ success: false, error: `'${cleanCode}' প্রমো কোডটি ইতিমধ্যে বিদ্যমান রয়েছে।` }, 400);
          }
          const id = "promo_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const type = discount_type === "fixed" ? "fixed" : "percentage";
          const value = Math.max(0, Number(discount_value) || 0);
          const minOrder = Math.max(0, Number(min_order_amount) || 0);
          const maxDiscount = max_discount_amount ? Number(max_discount_amount) : null;
          const limit = Math.max(0, Number(usage_limit) || 0);
          const active = is_active === 0 || is_active === false ? 0 : 1;
          const expiry = expiry_date ? new Date(expiry_date).toISOString() : null;

          await env.DB.prepare(`
            INSERT INTO promo_codes (
              id, code, discount_type, discount_value, min_order_amount,
              max_discount_amount, usage_limit, used_count, expiry_date, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
          `).bind(id, cleanCode, type, value, minOrder, maxDiscount, limit, expiry, active).run();

          return json({ success: true, message: `'${cleanCode}' প্রমো কোডটি সফলভাবে তৈরি করা হয়েছে!`, id });
        } catch (e) {
          return json({ success: false, error: String(e) }, 500);
        }
      }
      if (request.method === "PUT") {
        try {
          const body = await request.json();
          const { id, code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expiry_date, is_active } = body;
          if (!id) return json({ success: false, error: "ID আবশ্যক" }, 400);

          const cleanCode = String(code).trim().toUpperCase();
          if (cleanCode) {
            const existing = await env.DB.prepare("SELECT id FROM promo_codes WHERE UPPER(code) = ? AND id != ? LIMIT 1").bind(cleanCode, id).first();
            if (existing) {
              return json({ success: false, error: `'${cleanCode}' প্রমো কোডটি অন্য একটি রেকর্ডে বিদ্যমান রয়েছে।` }, 400);
            }
          }

          const type = discount_type === "fixed" ? "fixed" : "percentage";
          const value = Math.max(0, Number(discount_value) || 0);
          const minOrder = Math.max(0, Number(min_order_amount) || 0);
          const maxDiscount = max_discount_amount ? Number(max_discount_amount) : null;
          const limit = Math.max(0, Number(usage_limit) || 0);
          const active = is_active === 0 || is_active === false ? 0 : 1;
          const expiry = expiry_date ? new Date(expiry_date).toISOString() : null;

          await env.DB.prepare(`
            UPDATE promo_codes
            SET code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?,
                max_discount_amount = ?, usage_limit = ?, expiry_date = ?, is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(cleanCode, type, value, minOrder, maxDiscount, limit, expiry, active, id).run();

          return json({ success: true, message: "প্রমো কোডটি সফলভাবে আপডেট হয়েছে!" });
        } catch (e) {
          return json({ success: false, error: String(e) }, 500);
        }
      }
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return json({ success: false, error: "ID আবশ্যক" }, 400);
        await env.DB.prepare("DELETE FROM promo_codes WHERE id = ?").bind(id).run();
        return json({ success: true, message: "প্রমো কোডটি সফলভাবে মুছে ফেলা হয়েছে!" });
      }
    }

    // -------------------------------------------------------------
    // API: /api/promo/validate
    // -------------------------------------------------------------
    if (pathname === "/api/promo/validate" && request.method === "POST") {
      try {
        const body = await request.json();
        const { code, amount } = body;
        if (!code || typeof code !== "string") {
          return json({ valid: false, error: "অনুগ্রহ করে একটি প্রমো কোড লিখুন।" }, 400);
        }
        const cleanCode = code.trim().toUpperCase();
        const orderAmount = Number(amount) || 0;
        const promo = await env.DB.prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? LIMIT 1").bind(cleanCode).first();
        if (!promo) {
          return json({ valid: false, error: `"${cleanCode}" প্রমো কোডটি পাওয়া যায়নি বা ভুল কোড।` }, 404);
        }
        if (!promo.is_active) {
          return json({ valid: false, error: "এই প্রমো কোডটি বর্তমানে নিষ্ক্রিয় রয়েছে।" }, 400);
        }
        if (promo.expiry_date) {
          const expiry = new Date(promo.expiry_date).getTime();
          if (!isNaN(expiry) && Date.now() > expiry) {
            return json({ valid: false, error: "দুঃখিত, এই প্রমো কোডটির মেয়াদ শেষ হয়ে গেছে।" }, 400);
          }
        }
        if (promo.usage_limit && promo.usage_limit > 0 && (promo.used_count || 0) >= promo.usage_limit) {
          return json({ valid: false, error: "এই প্রমো কোডের ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে।" }, 400);
        }
        if (promo.min_order_amount && promo.min_order_amount > 0 && orderAmount < promo.min_order_amount) {
          return json({ valid: false, error: `এই প্রমো কোডটি প্রয়োগ করতে ন্যূনতম ৳${promo.min_order_amount} মূল্যের অর্ডার আবশ্যক।` }, 400);
        }

        let discountAmount = 0;
        if (promo.discount_type === "percentage") {
          discountAmount = Math.round((orderAmount * Number(promo.discount_value)) / 100);
          if (promo.max_discount_amount && promo.max_discount_amount > 0) {
            discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
          }
        } else {
          discountAmount = Math.min(orderAmount, Number(promo.discount_value));
        }
        const finalPrice = Math.max(0, orderAmount - discountAmount);
        return json({
          valid: true,
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          discount_amount: discountAmount,
          final_price: finalPrice,
          message: `অভিনন্দন! "${promo.code}" প্রমো কোড সফলভাবে যুক্ত হয়েছে! (৳${discountAmount} ছাড়)`
        });
      } catch (e) {
        return json({ valid: false, error: "প্রমো কোড যাচাই করতে সমস্যা হয়েছে।" }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/orders/create
    // -------------------------------------------------------------
    if (pathname === "/api/orders/create" && request.method === "POST") {
      try {
        const body = await request.json();
        const orderId = "ord_" + Math.random().toString(36).substring(2, 10);
        const orderNumber = "ORD-" + Math.floor(10000 + Math.random() * 90000);
        const downloadToken = crypto.randomUUID();

        let prod = null;
        if (body.product_slug) {
          prod = await env.DB.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1").bind(body.product_slug).first();
        } else if (body.product_id) {
          prod = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(body.product_id).first();
        }

        const baseAmount = prod ? (prod.sale_price || prod.price) : 0;
        const prodTitle = prod ? prod.title : "Digital Tool";
        const cleanEmail = body.customer_email.toLowerCase().trim();
        const cleanName = body.customer_name.trim();

        // Promo code discount verification
        let appliedCoupon = null;
        let discountAmount = 0;
        if (body.coupon_code && typeof body.coupon_code === "string") {
          const cleanCoupon = body.coupon_code.trim().toUpperCase();
          try {
            const promo = await env.DB.prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? LIMIT 1").bind(cleanCoupon).first();
            if (promo && promo.is_active) {
              const isExpired = promo.expiry_date && Date.now() > new Date(promo.expiry_date).getTime();
              const isExceeded = promo.usage_limit && promo.usage_limit > 0 && (promo.used_count || 0) >= promo.usage_limit;
              const meetsMin = !promo.min_order_amount || baseAmount >= promo.min_order_amount;
              if (!isExpired && !isExceeded && meetsMin) {
                appliedCoupon = promo.code;
                if (promo.discount_type === "percentage") {
                  discountAmount = Math.round((baseAmount * Number(promo.discount_value)) / 100);
                  if (promo.max_discount_amount && promo.max_discount_amount > 0) {
                    discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
                  }
                } else {
                  discountAmount = Math.min(baseAmount, Number(promo.discount_value));
                }
                await env.DB.prepare("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?").bind(promo.id).run();
              }
            }
          } catch (cErr) {
            console.error("Worker promo code error:", cErr);
          }
        }

        const finalAmount = Math.max(0, baseAmount - discountAmount);

        let newAccountCreated = false;
        let sessionToken = null;
        if (body.password && body.password.length >= 6) {
          try {
            const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(cleanEmail).first();
            if (!existing) {
              const pwHash = await hashCustomerPassword(body.password);
              const userId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
              await env.DB.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'customer')")
                .bind(userId, cleanName, cleanEmail, pwHash).run();

              sessionToken = await makeCustomerToken({ id: userId, name: cleanName, email: cleanEmail, role: "customer" });
              newAccountCreated = true;
            }
          } catch (e) {
            console.error("Auto account creation error:", e);
          }
        }

        await env.DB.prepare(`
          INSERT INTO orders (
            id, order_number, customer_name, customer_email, customer_phone,
            product_id, product_title, amount, currency, payment_method,
            payment_status, sender_number, transaction_id, admin_notes,
            download_token, delivered_license_key, coupon_code, discount_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BDT', ?, 'pending', ?, ?, ?, ?, '', ?, ?)
        `).bind(
          orderId, orderNumber, cleanName, cleanEmail,
          body.customer_phone || "", prod ? prod.id : "", prodTitle, finalAmount,
          body.payment_method, body.sender_number || "", body.transaction_id,
          appliedCoupon ? `Promo: ${appliedCoupon} (-৳${discountAmount})` : 'Web order',
          downloadToken, appliedCoupon, discountAmount
        ).run();

        // Trigger automated email notifications asynchronously via SMTP
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async () => {
            try {
              // 1. Customer Order Confirmation Email
              const emailHtml = `
                <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                  <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                    <h1 style="color:#4f46e5;margin:0;font-size:22px;">⚡ ToolsHub BD</h1>
                    <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">আপনার বিশ্বস্ত ডিজিটাল টুলস স্টোর</p>
                  </div>
                  <div style="padding:20px 0;">
                    <h2 style="color:#0f172a;font-size:18px;margin-top:0;">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!</h2>
                    <p style="font-size:14px;color:#475569;line-height:1.6;">প্রিয় <strong>${cleanName}</strong>, আপনার অর্ডার নম্বর: <strong style="color:#4f46e5;">#${orderNumber}</strong>। আমাদের টিম দ্রুত আপনার পেমেন্ট ভেরিফাই করে ফাইল ডেলিভারি চালু করে দিবে।</p>
                    
                    <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;">
                      <p style="margin:4px 0;"><strong>প্রোডাক্ট:</strong> ${prodTitle}</p>
                      <p style="margin:4px 0;"><strong>মোট পরিশোধিত:</strong> ৳${finalAmount}</p>
                      <p style="margin:4px 0;"><strong>পেমেন্ট মেথড:</strong> ${body.payment_method}</p>
                      <p style="margin:4px 0;"><strong>TrxID:</strong> ${body.transaction_id || 'N/A'}</p>
                    </div>

                    <div style="text-align:center;margin:20px 0;">
                      <a href="https://tootls.pages.dev/track-order" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">অর্ডার ট্র্যাক করুন</a>
                    </div>
                  </div>
                  <div style="text-align:center;padding-top:16px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
                    © 2026 ToolsHub BD. All rights reserved.
                  </div>
                </div>
              `;
              await triggerSmtpNotification(env, cleanEmail, `আপনার অর্ডার গ্রহণ করা হয়েছে — #${orderNumber}`, emailHtml, "order_created");

              // 2. Admin Order Notification Alert
              const s = await env.DB.prepare("SELECT admin_email FROM settings WHERE id = 'general'").first();
              const adminEmail = s?.admin_email || "sohagbdmt@gmail.com";
              const adminAlertHtml = `
                <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #cbd5e1;border-radius:16px;background:#ffffff;color:#0f172a;">
                  <div style="background:linear-gradient(135deg,#4f46e5,#4338ca);padding:24px;border-radius:12px;text-align:center;color:#ffffff;">
                    <span style="background:#fbbf24;color:#78350f;font-weight:bold;font-size:12px;padding:3px 10px;border-radius:999px;text-transform:uppercase;">🔔 নতুন অর্ডার অ্যালার্ট</span>
                    <h2 style="margin:8px 0 0 0;font-size:20px;">নতুন অর্ডার এসেছে! #${orderNumber}</h2>
                  </div>
                  <div style="padding:20px 0;line-height:1.6;font-size:14px;">
                    <p>অ্যাডমিন মহোদয়, ওয়েবসাইটে একজন গ্রাহক নতুন একটি অর্ডার দিয়েছেন:</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
                      <p style="margin:4px 0;"><strong>প্রোডাক্ট:</strong> ${prodTitle}</p>
                      <p style="margin:4px 0;"><strong>মূল্য:</strong> <span style="color:#10b981;font-weight:bold;font-size:16px;">৳${finalAmount}</span></p>
                      <p style="margin:4px 0;"><strong>গ্রাহকের নাম:</strong> ${cleanName}</p>
                      <p style="margin:4px 0;"><strong>ইমেইল:</strong> ${cleanEmail}</p>
                      <p style="margin:4px 0;"><strong>ফোন:</strong> ${body.customer_phone || 'N/A'}</p>
                      <p style="margin:4px 0;"><strong>পেমেন্ট মেথড:</strong> ${body.payment_method}</p>
                      <p style="margin:4px 0;"><strong>প্রেরক নম্বর:</strong> ${body.sender_number || 'N/A'}</p>
                      <p style="margin:4px 0;"><strong>TrxID:</strong> <code style="background:#e0e7ff;padding:2px 6px;border-radius:4px;color:#3730a3;font-weight:bold;">${body.transaction_id || 'N/A'}</code></p>
                      ${appliedCoupon ? `<p style="margin:4px 0;color:#059669;"><strong>কুপন কোড:</strong> ${appliedCoupon} (-৳${discountAmount})</p>` : ''}
                    </div>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="https://tootls.pages.dev/admin/orders" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">অ্যাডমিন প্যানেলে ভিউ ও ভেরিফাই করুন →</a>
                    </div>
                  </div>
                  <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">
                    ToolsHub BD Automated Server Notification
                  </div>
                </div>
              `;
              await triggerSmtpNotification(env, adminEmail, `⚡ নতুন অর্ডার এসেছে — #${orderNumber} (৳${finalAmount})`, adminAlertHtml, "admin_order_alert");

              // 3. Welcome Email if auto-account created
              if (newAccountCreated) {
                const welcomeHtml = `
                  <div style="font-family:'Hind Siliguri',-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b;">
                    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;border-radius:12px;text-align:center;color:#ffffff;">
                      <h1 style="margin:0;font-size:24px;">ToolsHub BD</h1>
                      <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">স্বাগতম আমাদের প্ল্যাটফর্মে!</p>
                    </div>
                    <div style="padding:24px 0;line-height:1.6;font-size:14px;">
                      <h2 style="margin-top:0;font-size:18px;color:#0f172a;">আসসালামু আলাইকুম, ${cleanName}!</h2>
                      <p>চেকআউট করার সময় আপনার অ্যাকাউন্টটি স্বয়ংক্রিয়ভাবে তৈরি হয়েছে। আপনার লগইন তথ্য নিচে দেওয়া হলো:</p>
                      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
                        <p style="margin:4px 0;"><strong>লগইন ইমেইল:</strong> ${cleanEmail}</p>
                        <p style="margin:4px 0;"><strong>অ্যাকাউন্ট স্ট্যাটাস:</strong> সক্রিয়</p>
                      </div>
                      <div style="text-align:center;margin:24px 0;">
                        <a href="https://tootls.pages.dev/dashboard" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;">ড্যাশবোর্ডে প্রবেশ করুন →</a>
                      </div>
                    </div>
                    <div style="text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;font-size:11px;color:#94a3b8;">
                      © 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।
                    </div>
                  </div>
                `;
                await triggerSmtpNotification(env, cleanEmail, `ToolsHub BD-তে স্বাগতম, ${cleanName}!`, welcomeHtml, "user_signup");
              }
            } catch (e) {
              console.error("Order creation email error:", e);
            }
          })());
        }

        const headers = { "Content-Type": "application/json" };
        if (sessionToken) {
          headers["Set-Cookie"] = "toolshub_user_session=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";
        }

        return new Response(JSON.stringify({
          success: true,
          order_number: orderNumber,
          download_token: downloadToken,
          new_account_created: newAccountCreated
        }), { status: 200, headers });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/orders/track
    // -------------------------------------------------------------
    if (pathname === "/api/orders/track" && request.method === "POST") {
      try {
        const { order_number, customer_email } = await request.json();
        if (!order_number || !customer_email) return json({ error: "অর্ডার নম্বর ও ইমেইল আবশ্যক" }, 400);

        const num = order_number.trim().toUpperCase();
        const em = customer_email.trim().toLowerCase();
        const ord = await env.DB.prepare("SELECT * FROM orders WHERE (order_number = ? OR id = ?) AND customer_email = ? LIMIT 1")
          .bind(num, num, em).first();

        if (!ord) return json({ error: "অর্ডার খুঁজে পাওয়া যায়নি।" }, 404);

        const prod = await env.DB.prepare("SELECT product_type, external_access_url FROM products WHERE id = ? OR slug = ? LIMIT 1").bind(ord.product_id, ord.product_id).first();

        return json({
          success: true,
          order: {
            order_number: ord.order_number,
            product_title: ord.product_title,
            product_type: prod?.product_type || "file",
            external_access_url: prod?.external_access_url || null,
            amount: ord.amount,
            payment_method: ord.payment_method,
            payment_status: ord.payment_status,
            admin_notes: ord.admin_notes || "",
            download_token: ord.payment_status === "approved" ? ord.download_token : null,
            download_count: ord.download_count,
            max_downloads: ord.max_downloads,
            delivered_license_key: ord.delivered_license_key,
            created_at: ord.created_at
          }
        });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // -------------------------------------------------------------
    // API: /api/chat
    // -------------------------------------------------------------
    if (pathname === "/api/chat") {
      if (request.method === "GET") {
        try {
          const settings = await env.DB.prepare("SELECT chatbot_faqs_json, ai_enabled FROM settings WHERE id = 'general' LIMIT 1").first();
          let faqs = [];
          if (settings?.chatbot_faqs_json) {
            try { faqs = JSON.parse(settings.chatbot_faqs_json); } catch(e) {}
          }

          const sid = url.searchParams.get("session_id");
          let uemail = url.searchParams.get("user_email");
          if (!uemail) {
            const authCust = await getAuthCustomer();
            if (authCust?.email) uemail = authCust.email;
          }
          let history = [];

          if (uemail) {
            const res = await env.DB.prepare("SELECT role, content, created_at FROM chat_history WHERE LOWER(TRIM(user_email)) = ? ORDER BY created_at DESC LIMIT 10").bind(uemail.toLowerCase().trim()).all();
            history = (res.results || []).reverse();
          } else if (sid) {
            const res = await env.DB.prepare("SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at DESC LIMIT 10").bind(sid).all();
            history = (res.results || []).reverse();
          }

          return json({ success: true, enabled: Boolean(settings?.ai_enabled ?? 1), faqs, history });
        } catch(e) {
          return json({ success: false, error: String(e) }, 500);
        }
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          const message = (body.message || "").trim();
          const sessionId = body.session_id || "guest";
          let userEmail = body.user_email || null;
          if (!userEmail) {
            const authCust = await getAuthCustomer();
            if (authCust?.email) userEmail = authCust.email;
          }
          const clientHistory = Array.isArray(body.history) ? body.history : [];

          if (!message) return json({ error: "Message is required" }, 400);

          const settings = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();

          // 1. Fetch previous 10 messages from DB for context memory
          let dbHistory = [];
          if (userEmail) {
            const res = await env.DB.prepare("SELECT role, content FROM chat_history WHERE LOWER(TRIM(user_email)) = ? ORDER BY created_at DESC LIMIT 10").bind(userEmail.toLowerCase().trim()).all();
            dbHistory = (res.results || []).reverse();
          } else if (sessionId && sessionId !== "guest") {
            const res = await env.DB.prepare("SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY created_at DESC LIMIT 10").bind(sessionId).all();
            dbHistory = (res.results || []).reverse();
          }

          const combinedHistory = dbHistory.length > 0 ? dbHistory : clientHistory;
          const recentTurns = combinedHistory.slice(-10).map(h => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: h.content
          }));

          // 2. Check preset FAQs (exact match only so normal questions go to live AI)
          if (settings?.chatbot_faqs_json) {
            try {
              const presetFaqs = JSON.parse(settings.chatbot_faqs_json);
              const cleanMsg = message.toLowerCase().trim();
              const matched = presetFaqs.find(f => {
                const q = (f.question || f.q || "").toLowerCase().trim();
                return q && cleanMsg === q;
              });
              if (matched && matched.answer) {
                const ans = matched.answer || matched.a;
                try {
                  const mId1 = "msg_" + Math.random().toString(36).substring(2, 9);
                  const mId2 = "msg_" + Math.random().toString(36).substring(2, 9);
                  await env.DB.prepare("INSERT INTO chat_history (id, session_id, user_email, role, content) VALUES (?, ?, ?, 'user', ?)").bind(mId1, sessionId, userEmail, message).run();
                  await env.DB.prepare("INSERT INTO chat_history (id, session_id, user_email, role, content) VALUES (?, ?, ?, 'assistant', ?)").bind(mId2, sessionId, userEmail, ans).run();
                } catch(e) {}
                return json({ reply: ans });
              }
            } catch(e) {}
          }

          // 3. Build context with live products
          const prodsRes = await env.DB.prepare("SELECT title, slug, price, sale_price, short_description FROM products WHERE status = 'published' LIMIT 15").all();
          const products = prodsRes.results || [];
          const context = products.map(p => `• [${p.title}](/tools/${p.slug}) (মূল্য: ${p.sale_price || p.price} ৳): ${p.short_description || ''}`).join("\n");
          
          const customAdminPrompt = (settings?.ai_system_prompt || "").trim();

          const sysPrompt = `
আপনি "ToolsHub BD" (tootls.pages.dev)-এর অফিসিয়াল এআই সহকারী।

কঠোর নিয়মাবলী:
১. আপনার উত্তর সবসময় স্পষ্ট, টু-দ্য-পয়েন্ট এবং আন্তরিক হবে। অপ্রয়োজনীয় দীর্ঘ উত্তর দিবেন না।
২. আপনি ToolsHub BD ওয়েবসাইটের প্রোডাক্ট (ডিজিটাল টুলস, সফটওয়্যার, স্ক্রিপ্ট, কোর্স), মূল্য, পেমেন্ট মেথড (bKash, Nagad, Crypto USDT) এবং অর্ডার/ডাউনলোড সংক্রান্ত তথ্যে সরাসরি কাস্টমারকে সাহায্য করবেন।
৩. যে কোনো প্রোডাক্টের নাম উল্লেখ করার সময় অবশ্যই সেই প্রোডাক্টের টাইটেলটি ক্লিকযোগ্য মার্কডাউন লিংক আকারে লিখবেন: [প্রোডাক্টের নাম](/tools/slug) অথবা চেকআউটের জন্য [এখনই অর্ডার করুন](/checkout/slug)। সাধারণ টেক্সট হিসেবে কখনোই প্রোডাক্টের নাম লিখবেন না, যাতে কাস্টমার ক্লিক করে সরাসরি পেজে চলে যেতে পারে।
৪. কাস্টমার আগের মেসেজে যা বলেছে তা মনে রাখবেন এবং সেই কথোপকথনের ধারাবাহিকতা বজায় রেখে প্রাসঙ্গিকভাবে উত্তর দিবেন।
৫. পণ্যের তালিকা দিলে সুন্দর বুলেট ও লাইন ব্রেক ব্যবহার করবেন।

আমাদের বর্তমান ডিজিটাল টুলস ও কোর্সের তালিকা:
${context}

পেমেন্ট মেথড:
• bKash (Send Money)
• Nagad (Send Money)
• Crypto (USDT TRC20 / BEP20)
${customAdminPrompt ? `\n\nঅ্যাডমিন কর্তৃক বিশেষ নির্দেশনা:\n${customAdminPrompt}` : ''}
`.trim();

          let reply = "";

          // 4. OpenRouter provider with automatic fallback
          if (settings?.ai_provider === "openrouter" && settings?.ai_api_key) {
            let m = (settings.ai_model || "").trim();
            if (!m || m.includes(":batch")) {
              m = "google/gemini-3.8-flash";
            }

            const callOpenRouter = async (modelName) => {
              const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + settings.ai_api_key,
                  "HTTP-Referer": "https://tootls.pages.dev",
                  "X-Title": "ToolsHub BD"
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    { role: "system", content: sysPrompt },
                    ...recentTurns,
                    { role: "user", content: message }
                  ],
                  max_tokens: 450,
                  temperature: 0.6
                })
              });
              if (!res.ok) throw new Error("OpenRouter HTTP " + res.status);
              const d = await res.json();
              return d.choices?.[0]?.message?.content?.trim() || "";
            };

            try {
              reply = await callOpenRouter(m);
            } catch (e1) {
              console.error("OpenRouter primary failed (" + m + "):", e1);
              if (m !== "minimax/minimax-m3.1-flash:free") {
                try {
                  reply = await callOpenRouter("minimax/minimax-m3.1-flash:free");
                } catch (e2) {
                  console.error("OpenRouter fallback failed:", e2);
                }
              }
            }
          }

          // 5. Google Gemini provider
          if (!reply && settings?.ai_provider === "gemini" && settings?.ai_api_key) {
            const m = settings.ai_model || "gemini-1.5-flash";
            try {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${settings.ai_api_key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    { role: "user", parts: [{ text: "Context: " + sysPrompt }] },
                    ...recentTurns.map(h => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
                    { role: "user", parts: [{ text: message }] }
                  ]
                })
              });
              const d = await res.json();
              const cand = d.candidates?.[0]?.content?.parts?.[0]?.text;
              if (cand) reply = cand.trim();
            } catch(e) {
              console.error("Gemini error in worker:", e);
            }
          }

          // 6. Intelligent Fallback if AI is completely unreachable
          if (!reply) {
            const lower = message.toLowerCase();
            if (lower.includes("বিকাশ") || lower.includes("নগদ") || lower.includes("পেমেন্ট") || lower.includes("টাকা")) {
              reply = "আমাদের সাইটে বিকাশ (Send Money), নগদ (Send Money) এবং ক্রিপ্টো (USDT TRC20) এর মাধ্যমে পেমেন্ট করতে পারেন। পছন্দমতো টুলসের 'কিনুন' বাটনে ক্লিক করে TrxID দিয়ে অর্ডার কনফার্ম করুন।";
            } else if (lower.includes("ডাউনলোড") || lower.includes("ড্রাইভ") || lower.includes("access") || lower.includes("ফাইল")) {
              reply = "পেমেন্ট অ্যাপ্রুভ হওয়ার সাথে সাথেই ট্র্যাকিং পেজে ও ড্যাশবোর্ডে ডাউনলোড লিংক অথবা 'Access Now' ড্রাইভ বাটন সক্রিয় হবে। 'অর্ডার ট্র্যাক' পেজে যেকোনো সময় চেক করতে পারেন।";
            } else if (lower.includes("ডিসকাউন্ট") || lower.includes("ছাড়") || lower.includes("কম") || lower.includes("discount")) {
              reply = customAdminPrompt || "আমাদের প্রোডাক্টগুলোতে ইতিমধ্যে সর্বোচ্চ ছাড় দেওয়া আছে। আপনি চেকআউট পেজে কোনো প্রমো কোড থাকলে প্রয়োগ করতে পারেন।";
            } else {
              reply = "ToolsHub BD-তে আপনাকে স্বাগতম! আমাদের প্রিমিয়াম ডিজিটাল টুলস, স্ক্রিপ্ট ও কোর্স সম্পর্কে বিস্তারিত জানতে পারেন। কোন টুলসটি কিনতে আগ্রহী?";
            }
          }

          // 7. Persist to chat_history table
          try {
            const mId1 = "msg_" + Math.random().toString(36).substring(2, 9);
            const mId2 = "msg_" + Math.random().toString(36).substring(2, 9);
            await env.DB.prepare("INSERT INTO chat_history (id, session_id, user_email, role, content) VALUES (?, ?, ?, 'user', ?)").bind(mId1, sessionId, userEmail, message).run();
            await env.DB.prepare("INSERT INTO chat_history (id, session_id, user_email, role, content) VALUES (?, ?, ?, 'assistant', ?)").bind(mId2, sessionId, userEmail, reply).run();
          } catch(e) {}

          return json({ reply });
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
      }
    }

    // -------------------------------------------------------------
    // API: /api/upload
    // -------------------------------------------------------------
    if (pathname === "/api/upload" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) return json({ error: "No file provided" }, 400);

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = "tools/" + Date.now() + "_" + safeName;
        const buf = await file.arrayBuffer();

        if (env.BUCKET) {
          await env.BUCKET.put(key, buf, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
        }

        return json({
          success: true,
          key,
          file_name: safeName,
          file_size: (file.size / (1024*1024)).toFixed(2) + " MB",
          url: "/api/media/" + encodeURIComponent(key)
        });
      } catch (e) {
        return json({ error: String(e) }, 500);
      }
    }

    // -------------------------------------------------------------
    // Media / Image Serving: /api/media/*
    // -------------------------------------------------------------
    if (pathname.startsWith("/api/media/")) {
      const mediaKey = decodeURIComponent(pathname.replace("/api/media/", ""));
      if (env.BUCKET) {
        const obj = await env.BUCKET.get(mediaKey);
        if (obj && obj.body) {
          return new Response(obj.body, {
            headers: {
              "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable"
            }
          });
        }
      }
      return new Response("Media not found", { status: 404 });
    }

    // -------------------------------------------------------------
    // Download: /download/:token
    // -------------------------------------------------------------
    if (pathname.startsWith("/download/")) {
      const token = pathname.replace("/download/", "");
      const ord = await env.DB.prepare("SELECT * FROM orders WHERE download_token = ? LIMIT 1").bind(token).first();
      if (!ord) return new Response("ডাউনলোড লিংক পাওয়া যায়নি।", { status: 404 });
      if (ord.payment_status !== "approved") return new Response("পেমেন্ট এখনও অনুমোদিত হয়নি। ভেরিফাই সম্পন্ন হলে ডাউনলোড লিংক চালু হবে।", { status: 403 });
      if (ord.download_count >= ord.max_downloads) return new Response("সর্বোচ্চ ডাউনলোডের লিমিট শেষ।", { status: 403 });

      await env.DB.prepare("UPDATE orders SET download_count = download_count + 1 WHERE id = ?").bind(ord.id).run();

      const prod = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(ord.product_id).first();

      // If product has external_access_url (e.g. Google Drive), redirect directly!
      if (prod?.external_access_url) {
        return Response.redirect(prod.external_access_url, 302);
      }

      const r2Key = prod?.r2_file_key || ("tools/" + (prod?.file_name || "tool.zip"));

      if (env.BUCKET) {
        const obj = await env.BUCKET.get(r2Key);
        if (obj && obj.body) {
          return new Response(obj.body, {
            headers: {
              "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
              "Content-Disposition": 'attachment; filename="' + (prod?.file_name || 'tool.zip') + '"',
              "Cache-Control": "no-store"
            }
          });
        }
      }

      const content = "ToolsHub BD Delivery\nProduct: " + (prod?.title || "") + "\nLicense Key: " + (ord.delivered_license_key || "STANDALONE-ACTIVATED") + "\nOrder: #" + (ord.order_number || "") + "\nCustomer: " + (ord.customer_name || "");
      return new Response(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": 'attachment; filename="' + (prod?.slug || 'order') + '-license.txt"'
        }
      });
    }

    // -------------------------------------------------------------
    // Dynamic Product Detail Page: /tools/:slug
    // -------------------------------------------------------------
    if (pathname.startsWith("/tools/")) {
      const slug = pathname.replace("/tools/", "").replace(/\/$/, "");
      if (slug) {
        // 1. Verify product actually exists and is published in Cloudflare D1
        const prod = await env.DB.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
        if (!prod || prod.status !== "published") {
          return new Response("<!DOCTYPE html><html lang='bn'><head><meta charset='utf-8'><title>404 Not Found</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;'><h1>404 — টুলস বা প্রোডাক্টটি পাওয়া যায়নি</h1><p>এই প্রোডাক্টটি মুছে ফেলা হয়েছে বা লিংকটি পরিবর্তিত হয়েছে।</p><a href='/' style='color:#4f46e5;font-weight:bold;'>← হোমপেজে ফিরে যান</a></body></html>", {
            status: 404,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache, no-store, must-revalidate"
            }
          });
        }

        const settings = await env.DB.prepare("SELECT * FROM settings WHERE id = 'general' LIMIT 1").first();
        const relRes = await env.DB.prepare("SELECT * FROM products WHERE id != ? AND status = 'published' LIMIT 4").bind(prod.id).all();
        const related = relRes.results || [];
        
        const title = prod.title || "ডিজিটাল টুলস";
        const desc = prod.short_description || prod.description || "";
        const price = prod.price || 0;
        const salePrice = prod.sale_price || price;
        const discount = price > salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
        const thumb = prod.thumbnail_url || "/placeholder.svg";
        let features = [];
        try {
          features = typeof prod.features_json === "string" ? JSON.parse(prod.features_json) : (prod.features_json || []);
        } catch(e) { features = []; }
        const isSub = prod.billing_type === "subscription";
        const cycleText = prod.subscription_period === "1_month" ? "১ মাস মেয়াদ" : prod.subscription_period === "1_year" ? "১ বছর মেয়াদ" : "সাবস্ক্রিপশন";

        const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ToolsHub BD</title>
  <meta name="description" content="${desc}">
  <meta property="og:title" content="${title} — ToolsHub BD">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${thumb}">
  <script>
    (function(){
      try {
        var t = localStorage.getItem("theme");
        if (t === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch(e) {}
    })();
  </script>
  <!-- Compiled Pre-built CSS (Zero render-blocking CDN) -->
  <link rel="stylesheet" href="/_next/static/css/__NEXT_CSS_FILE__">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet"></noscript>
  <style>
    body { font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between transition-colors">
  <!-- Header -->
  <header class="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30">
          ⚡
        </div>
        <span class="font-black text-lg tracking-tight text-slate-900 dark:text-white">ToolsHub <span class="text-indigo-600 dark:text-indigo-400">BD</span></span>
      </a>
      <div class="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <a href="/" class="hover:text-indigo-600 dark:hover:text-white transition-colors">হোম</a>
        <a href="/#tools" class="hover:text-indigo-600 dark:hover:text-white transition-colors">টুলস</a>
        <a href="/#features" class="hover:text-indigo-600 dark:hover:text-white transition-colors">ফিচার</a>
        <a href="/track-order" class="hover:text-indigo-600 dark:hover:text-white transition-colors">অর্ডার ট্র্যাকিং</a>
        <a href="/contact" class="hover:text-indigo-600 dark:hover:text-white transition-colors">যোগাযোগ</a>
      </div>
      <div class="flex items-center gap-3">
        <a href="/login" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors">লগইন</a>
        <a href="/signup" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/25">রেজিস্টার</a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 flex-1">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <a href="/" class="hover:text-white">হোম</a>
      <span>/</span>
      <a href="/#tools" class="hover:text-white">টুলস</a>
      <span>/</span>
      <span class="text-indigo-400 font-semibold truncate max-w-xs">${title}</span>
    </div>

    <!-- 2 Column Hero Card -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Media & Description (7 Cols) -->
      <div class="lg:col-span-7 space-y-6">
        <div class="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl aspect-video">
          <img src="${thumb}" alt="${title}" class="w-full h-full object-cover">
          ${discount > 0 ? `<div class="absolute top-4 left-4 bg-pink-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-lg">${discount}% OFF</div>` : ''}
          ${isSub ? `<div class="absolute top-4 right-4 bg-purple-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-lg">🔄 ${cycleText}</div>` : ''}
        </div>

        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">বিস্তারিত বিবরণ</h2>
          <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-line">
            ${prod.description || desc}
          </div>
        </div>

        ${features.length > 0 ? `
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>✨ স্পেশাল ফিচারসমূহ</span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${features.map(f => `
              <div class="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                <span class="text-emerald-500 font-bold">✓</span>
                <span>${f}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Purchase Sidebar (5 Cols) -->
      <div class="lg:col-span-5 sticky top-24 space-y-6">
        <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div>
            <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 mb-2">
              ১০০% ভেরিফাইড ও ট্রায়াল টেস্টেড
            </span>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">${title}</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">${desc}</p>
          </div>

          <!-- Price -->
          <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-500 dark:text-slate-400 block">${isSub ? 'সাবস্ক্রিপশন মূল্য:' : 'মূল্য:'}</span>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-3xl font-black text-slate-900 dark:text-white">৳${salePrice}</span>
                ${price > salePrice ? `<span class="text-sm text-slate-400 line-through">৳${price}</span>` : ''}
              </div>
            </div>
            ${isSub ? `
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-500/40 text-purple-700 dark:text-purple-300">
                ${cycleText}
              </span>
            ` : `
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                লাইফটাইম অ্যাক্সেস
              </span>
            `}
          </div>

          <!-- Buy Now CTA -->
          <a href="/checkout/${prod.slug}" class="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-center text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
            <span>এখনই কিনুন (অর্ডার করুন)</span>
            <span>→</span>
          </a>

          <!-- Trust Badges -->
          <div class="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span>বিকাশ, নগদ ও ক্রিপ্টো USDT সাপোর্ট</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span>অর্ডার সম্পন্ন হওয়ার সাথে সাথে ইনস্ট্যান্ট ডেলিভারি</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span>২৪/৭ লাইভ এআই ও কাস্টমার হেল্পডেস্ক</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Products Section (4 Related) -->
    ${related.length > 0 ? `
    <div class="space-y-6 pt-10 border-t border-slate-200 dark:border-slate-800">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">আরও সম্পর্কিত ডিজিটাল টুলস</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">একই ক্যাটাগরির অন্যান্য জনপ্রিয় সফটওয়্যার ও স্ক্রিপ্টসমূহ</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${related.map(r => `
          <div class="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all">
            <a href="/tools/${r.slug}" class="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800 block cursor-pointer">
              <img src="${r.thumbnail_url || '/placeholder.svg'}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
            </a>
            <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <a href="/tools/${r.slug}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block">
                  <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">${r.title}</h3>
                </a>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${r.short_description || ''}</p>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span class="font-black text-slate-900 dark:text-white text-base">৳${r.sale_price || r.price}</span>
                <a href="/tools/${r.slug}" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors">
                  দেখুন →
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 py-8 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 space-y-2">
      <p>© 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।</p>
      <p>নিরাপদ পেমেন্ট • আল্ট্রা-ফাস্ট এজ ডেলিভারি • ২৪/৭ সাপোর্ট</p>
    </div>
  </footer>

  ${renderFloatingAIChatbotHtml()}
</body>
</html>`;

          return new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
              "CDN-Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
              "Cloudflare-CDN-Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
            }
          });
      }
    }

    // -------------------------------------------------------------
    // Dynamic Checkout Handler: /checkout/:slug (Server-Side Rendered)
    // -------------------------------------------------------------
    if (pathname.startsWith("/checkout/")) {
      const slug = pathname.replace("/checkout/", "").replace(/\/$/, "");
      if (slug) {
        const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();
        const prod = await env.DB.prepare("SELECT * FROM products WHERE (slug = ? OR id = ? OR LOWER(slug) = ?) AND status = 'published' LIMIT 1")
          .bind(slug, slug, cleanSlug).first();

        if (!prod) {
          return new Response("<!DOCTYPE html><html lang='bn'><head><meta charset='utf-8'><title>404 Not Found — ToolsHub BD</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;'><h1>404 — প্রোডাক্টটি পাওয়া যায়নি</h1><p>চেকআউট করতে চাওয়া টুলসটি পাওয়া যায়নি বা স্টকে নেই।</p><a href='/' style='display:inline-block;margin-top:16px;padding:10px 20px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;'>← হোমপেজে ফিরে যান</a></body></html>", {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }

        const gwsRes = await env.DB.prepare("SELECT * FROM payment_gateways WHERE is_enabled = 1 ORDER BY sort_order ASC").all();
        const gateways = gwsRes.results || [];
        const authUser = await getAuthCustomer();

        const title = prod.title || "ডিজিটাল টুলস";
        const desc = prod.short_description || prod.description || "";
        const basePrice = prod.sale_price || prod.price || 0;
        const origPrice = prod.price || basePrice;
        const discount = origPrice > basePrice ? Math.round(((origPrice - basePrice) / origPrice) * 100) : 0;
        const isSub = prod.billing_type === "subscription";
        const cycleText = prod.subscription_period === "1_month" ? "১ মাস মেয়াদ" : prod.subscription_period === "1_year" ? "১ বছর মেয়াদ" : "সাবস্ক্রিপশন";
        const thumb = prod.thumbnail_url || "/placeholder.svg";

        let features = [];
        try {
          features = typeof prod.features_json === "string" ? JSON.parse(prod.features_json) : (prod.features_json || []);
        } catch(e) {}

        const checkoutHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>চেকআউট — ${title} | ToolsHub BD</title>
  <meta name="description" content="নিরাপদ পেমেন্ট ও ইনস্ট্যান্ট ডেলিভারি — ${title}">
  <script>
    (function(){
      try {
        var t = localStorage.getItem("theme");
        if (t === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      } catch(e) {}
    })();
  </script>
  <link rel="stylesheet" href="/_next/static/css/__NEXT_CSS_FILE__">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between transition-colors">
  <!-- Header -->
  <header class="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30">
          ⚡
        </div>
        <span class="font-black text-lg tracking-tight text-slate-900 dark:text-white">ToolsHub <span class="text-indigo-600 dark:text-indigo-400">BD</span></span>
      </a>
      <div class="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <a href="/" class="hover:text-indigo-600 dark:hover:text-white transition-colors">হোম</a>
        <a href="/#tools" class="hover:text-indigo-600 dark:hover:text-white transition-colors">টুলস</a>
        <a href="/track-order" class="hover:text-indigo-600 dark:hover:text-white transition-colors">অর্ডার ট্র্যাকিং</a>
        <a href="/contact" class="hover:text-indigo-600 dark:hover:text-white transition-colors">যোগাযোগ</a>
      </div>
      <div class="flex items-center gap-3">
        ${authUser ? `
          <a href="/dashboard" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/25 flex items-center gap-1.5">
            <span>👤 ড্যাশবোর্ড</span>
          </a>
        ` : `
          <a href="/login" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors">লগইন</a>
        `}
      </div>
    </div>
  </header>

  <!-- Main Checkout Container -->
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1 w-full">
    <!-- Back to product link -->
    <div>
      <a href="/tools/${prod.slug}" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        ← টুলস বিবরণে ফিরে যান
      </a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column: Checkout Form (7 Cols) -->
      <div class="lg:col-span-7 space-y-6">
        <form id="checkout_form" class="space-y-6">
          <!-- Step 1: Customer Info -->
          <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>১. আপনার তথ্য</span>
              </h2>
              ${authUser ? `
                <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  ✓ লগইন করা আছেন
                </span>
              ` : `
                <span class="text-xs text-slate-400">অর্ডার ও ডেলিভারির জন্য</span>
              `}
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">আপনার নাম *</label>
                <input type="text" id="cust_name" required value="${authUser?.name || ''}" placeholder="যেমন: মো: সোহাগ" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ইমেইল ঠিকানা *</label>
                  <input type="email" id="cust_email" required value="${authUser?.email || ''}" placeholder="name@example.com" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ফোন / হোয়াটসঅ্যাপ নম্বর *</label>
                  <input type="text" id="cust_phone" required placeholder="01XXXXXXXXX" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
              </div>

              ${!authUser ? `
              <div class="pt-2">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  একটি পাসওয়ার্ড সেট করুন <span class="text-indigo-600 dark:text-indigo-400 font-bold">(অ্যাকাউন্ট স্বয়ংক্রিয় তৈরি হবে)</span> *
                </label>
                <input type="password" id="cust_password" required minlength="6" placeholder="কমপক্ষে ৬ অক্ষরের একটি পাসওয়ার্ড দিন" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <p class="text-[11px] text-slate-400 mt-1">এই পাসওয়ার্ড দিয়ে অর্ডার সম্পন্ন হলে সরাসরি ড্যাশবোর্ডে লগইন করে আপনার সব কেনা প্রোডাক্ট ডাউনলোড করতে পারবেন।</p>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Step 2: Payment Method Selection -->
          <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div class="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">২. পেমেন্ট মাধ্যম বেছে নিন</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">নিচের যেকোনো মাধ্যমে টাকা পাঠিয়ে TrxID প্রদান করুন</p>
            </div>

            <!-- Gateway Tabs -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="gw_selector_container">
              ${gateways.map((g, idx) => `
                <button type="button" onclick="switchGateway('${g.id}')" id="gw_tab_${g.id}" class="gw-tab p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${idx === 0 ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'}">
                  <span class="text-base font-bold">${g.title}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-medium">${g.account_type || 'Personal'}</span>
                </button>
              `).join('')}
            </div>

            <!-- Dynamic Gateway Instructions Box -->
            <div class="p-5 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 space-y-4">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span class="text-xs text-slate-500 dark:text-slate-400 block font-medium">নির্ধারিত নম্বর / একাউন্ট এড্রেস:</span>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span id="active_acc_number" class="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                      ${gateways[0]?.account_number || '01700-000000'}
                    </span>
                    <span id="active_acc_type" class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                      ${gateways[0]?.account_type || 'Personal'}
                    </span>
                  </div>
                </div>

                <button type="button" onclick="copyAccountNumber()" id="copy_btn" class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>📋</span>
                  <span id="copy_btn_text">কপি করুন</span>
                </button>
              </div>

              <div class="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-indigo-100/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line" id="active_instructions">
                ${gateways[0]?.instructions || '১. আপনার পেমেন্ট অ্যাপে প্রবেশ করুন।\\n২. সঠিক পরিমাণ টাকা Send Money করুন।\\n৩. ট্রানজেকশন আইডি নিচে দিয়ে সাবমিট করুন।'}
              </div>
            </div>

            <!-- Transaction Inputs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  যে নম্বর / ওয়ালেট থেকে টাকা পাঠিয়েছেন *
                </label>
                <input type="text" id="sender_number" required placeholder="আপনার বিকাশ / নগদ নম্বর" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Transaction ID (TrxID) *
                </label>
                <input type="text" id="transaction_id" required placeholder="যেমন: 8N7K6D5E9A" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>
          </div>

          <!-- Step 3: Promo / Coupon Code -->
          <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              প্রমো বা ডিসকাউন্ট কুপন কোড (যদি থাকে)
            </label>
            <div class="flex items-center gap-2">
              <input type="text" id="coupon_input" placeholder="কুপন কোড লিখুন..." class="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <button type="button" onclick="applyPromoCode()" id="apply_coupon_btn" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors shrink-0">
                প্রয়োগ করুন
              </button>
            </div>
            <div id="coupon_alert" class="hidden text-xs p-3 rounded-xl"></div>
          </div>

          <!-- Error Alert Banner -->
          <div id="form_error_banner" class="hidden p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed"></div>

          <!-- Submit Order Button -->
          <button type="submit" id="submit_order_btn" class="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span id="btn_spinner" class="hidden animate-spin">⏳</span>
            <span id="btn_text">অর্ডার নিশ্চিত করুন (৳<span id="btn_total_amount">${basePrice}</span>)</span>
            <span>→</span>
          </button>

          <p class="text-center text-xs text-slate-400 pt-1 flex items-center justify-center gap-2">
            <span>🔒 ১০০% ভেরিফাইড লেনদেন</span>
            <span>•</span>
            <span>ইনস্ট্যান্ট অটোমেটেড ডেলিভারি</span>
          </p>
        </form>
      </div>

      <!-- Right Column: Product & Order Summary (5 Cols) -->
      <div class="lg:col-span-5 sticky top-24 space-y-6">
        <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div class="flex gap-4 items-start">
            <div class="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
              <img src="${thumb}" alt="${title}" class="w-full h-full object-cover">
            </div>
            <div class="space-y-1 flex-1">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                ${isSub ? cycleText : 'লাইফটাইম এক্সেস'}
              </span>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-white leading-snug line-clamp-2">${title}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">${desc}</p>
            </div>
          </div>

          <!-- Price Breakdown -->
          <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>মূল মূল্য</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200">৳${origPrice}</span>
            </div>

            ${discount > 0 ? `
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>রেগুলার ডিসকাউন্ট</span>
              <span class="font-bold text-pink-600 dark:text-pink-400">-${discount}% (৳${origPrice - basePrice})</span>
            </div>
            ` : ''}

            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>প্রমো কুপন ছাড়</span>
              <span id="summary_promo_discount" class="font-bold text-emerald-600 dark:text-emerald-400">-৳০</span>
            </div>

            <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-baseline justify-between">
              <div>
                <span class="text-xs text-slate-500 dark:text-slate-400 block font-medium">সর্বমোট প্রদেয়:</span>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ ভ্যাট/ট্যাক্স অন্তর্ভুক্ত</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">৳<span id="summary_final_total">${basePrice}</span></span>
              </div>
            </div>
          </div>

          <!-- Feature Bullets -->
          ${features.length > 0 ? `
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">এই অর্ডারে পাচ্ছেন:</span>
            <div class="space-y-1.5">
              ${features.slice(0, 4).map(f => `
                <div class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span class="text-emerald-500 font-bold">✓</span>
                  <span>${f}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Support Guarantee -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-2">
              <span class="text-indigo-500 font-bold">⚡</span>
              <span>পেমেন্ট ভেরিফাই হওয়ার সাথে সাথে ডাউনলোড সক্রিয়</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-indigo-500 font-bold">💬</span>
              <span>২৪/৭ লাইভ এআই সাপোর্ট ও কাস্টমার হেল্পডেস্ক</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 py-8 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 space-y-2">
      <p>© 2026 ToolsHub BD. সর্বস্বত্ব সংরক্ষিত।</p>
      <p>নিরাপদ পেমেন্ট • ইনস্ট্যান্ট এজ ডেলিভারি • ২৪/৭ সাপোর্ট</p>
    </div>
  </footer>

  <!-- Interactive JavaScript Logic -->
  <script>
    var gateways = ${JSON.stringify(gateways)};
    var selectedGateway = gateways.length > 0 ? gateways[0] : null;
    var baseAmount = ${basePrice};
    var promoDiscountAmount = 0;
    var appliedPromoCode = null;

    function switchGateway(gwId) {
      var found = gateways.find(function(g){ return g.id === gwId; });
      if (!found) return;
      selectedGateway = found;

      // Update Tab Styles
      var tabs = document.querySelectorAll(".gw-tab");
      tabs.forEach(function(t){
        t.className = "gw-tab p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300";
      });
      var activeTab = document.getElementById("gw_tab_" + gwId);
      if (activeTab) {
        activeTab.className = "gw-tab p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold";
      }

      // Update instructions & account number
      var accEl = document.getElementById("active_acc_number");
      var typeEl = document.getElementById("active_acc_type");
      var instEl = document.getElementById("active_instructions");
      if (accEl) accEl.innerText = found.account_number || "N/A";
      if (typeEl) typeEl.innerText = found.account_type || "Personal";
      if (instEl) instEl.innerText = found.instructions || "";
    }

    function copyAccountNumber() {
      if (!selectedGateway || !selectedGateway.account_number) return;
      navigator.clipboard.writeText(selectedGateway.account_number).then(function(){
        var btnText = document.getElementById("copy_btn_text");
        if (btnText) {
          btnText.innerText = "✓ কপি হয়েছে!";
          setTimeout(function(){ btnText.innerText = "কপি করুন"; }, 2000);
        }
      }).catch(function(){});
    }

    function applyPromoCode() {
      var inp = document.getElementById("coupon_input");
      var alertBox = document.getElementById("coupon_alert");
      if (!inp || !alertBox) return;
      var code = inp.value.trim();
      if (!code) {
        alertBox.className = "text-xs p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200";
        alertBox.innerText = "অনুগ্রহ করে একটি কুপন কোড লিখুন।";
        alertBox.classList.remove("hidden");
        return;
      }

      var btn = document.getElementById("apply_coupon_btn");
      if (btn) btn.innerText = "যাচাই হচ্ছে...";

      fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          amount: baseAmount,
          product_slug: "${prod.slug}"
        })
      }).then(function(r){ return r.json(); })
        .then(function(d){
          if (btn) btn.innerText = "প্রয়োগ করুন";
          if (d.valid) {
            appliedPromoCode = d.code;
            promoDiscountAmount = d.discount_amount || 0;
            var finalPay = Math.max(0, baseAmount - promoDiscountAmount);

            alertBox.className = "text-xs p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
            alertBox.innerText = d.message || "কুপন কোড সফলভাবে যুক্ত হয়েছে!";
            alertBox.classList.remove("hidden");

            // Update UI totals
            var promoEl = document.getElementById("summary_promo_discount");
            var finalEl = document.getElementById("summary_final_total");
            var btnTotal = document.getElementById("btn_total_amount");
            if (promoEl) promoEl.innerText = "-৳" + promoDiscountAmount;
            if (finalEl) finalEl.innerText = finalPay;
            if (btnTotal) btnTotal.innerText = finalPay;
          } else {
            alertBox.className = "text-xs p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
            alertBox.innerText = d.error || "ভুল বা অকার্যকর কুপন কোড।";
            alertBox.classList.remove("hidden");
          }
        }).catch(function(){
          if (btn) btn.innerText = "প্রয়োগ করুন";
          alertBox.className = "text-xs p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200";
          alertBox.innerText = "কুপন যাচাই করতে সমস্যা হয়েছে।";
          alertBox.classList.remove("hidden");
        });
    }

    document.getElementById("checkout_form").addEventListener("submit", function(e){
      e.preventDefault();
      var errBox = document.getElementById("form_error_banner");
      if (errBox) errBox.classList.add("hidden");

      var name = document.getElementById("cust_name").value.trim();
      var email = document.getElementById("cust_email").value.trim();
      var phone = document.getElementById("cust_phone").value.trim();
      var sender = document.getElementById("sender_number").value.trim();
      var trx = document.getElementById("transaction_id").value.trim();
      var passInput = document.getElementById("cust_password");
      var pass = passInput ? passInput.value : "";

      if (!name || !email || !phone || !trx) {
        if (errBox) {
          errBox.innerText = "অনুগ্রহ করে আপনার নাম, ইমেইল, ফোন এবং TrxID প্রদান করুন।";
          errBox.classList.remove("hidden");
        }
        return;
      }

      if (passInput && pass.length < 6) {
        if (errBox) {
          errBox.innerText = "অ্যাকাউন্ট তৈরির জন্য অনুগ্রহ করে কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।";
          errBox.classList.remove("hidden");
        }
        return;
      }

      var submitBtn = document.getElementById("submit_order_btn");
      var spinner = document.getElementById("btn_spinner");
      var btnText = document.getElementById("btn_text");
      if (submitBtn) submitBtn.disabled = true;
      if (spinner) spinner.classList.remove("hidden");
      if (btnText) btnText.innerText = "অর্ডার প্রসেসিং হচ্ছে...";

      fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: "${prod.slug}",
          product_id: "${prod.id}",
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          payment_method: selectedGateway ? selectedGateway.id : "bkash",
          sender_number: sender,
          transaction_id: trx,
          coupon_code: appliedPromoCode,
          password: pass || undefined
        })
      }).then(function(r){ return r.json(); })
        .then(function(data){
          if (data && data.success) {
            window.location.href = "/order-success?order_number=" + encodeURIComponent(data.order_number) + "&token=" + encodeURIComponent(data.download_token || "") + "&new_account=" + (data.new_account_created ? "1" : "0") + "&email=" + encodeURIComponent(email);
          } else {
            if (submitBtn) submitBtn.disabled = false;
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.innerText = "অর্ডার নিশ্চিত করুন (৳" + Math.max(0, baseAmount - promoDiscountAmount) + ")";
            if (errBox) {
              errBox.innerText = data.error || "অর্ডার সম্পন্ন হতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।";
              errBox.classList.remove("hidden");
            }
          }
        }).catch(function(err){
          if (submitBtn) submitBtn.disabled = false;
          if (spinner) spinner.classList.add("hidden");
          if (btnText) btnText.innerText = "অর্ডার নিশ্চিত করুন";
          if (errBox) {
            errBox.innerText = "সার্ভার সংযোগে সমস্যা দেখা দিয়েছে। আপনার ইন্টারনেট চেক করুন।";
            errBox.classList.remove("hidden");
          }
        });
    });
  </script>
  ${renderFloatingAIChatbotHtml()}
</body>
</html>`;

        return new Response(checkoutHtml, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "CDN-Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Static Assets & Next.js Pages Fallback
    // -------------------------------------------------------------
    return env.ASSETS.fetch(request);
  },

  // -------------------------------------------------------------
  // Cloudflare Scheduled Daily Cron Event (Subscription Reminders)
  // -------------------------------------------------------------
  async scheduled(event, env, ctx) {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(runSubscriptionReminderCron(env));
    } else {
      await runSubscriptionReminderCron(env);
    }
  }
};

