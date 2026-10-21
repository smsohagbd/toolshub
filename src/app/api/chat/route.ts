import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, getProducts, getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    const userEmail = searchParams.get("user_email");

    const settings = await getSiteSettings();
    let faqs = [
      {
        question: "টুলস কীভাবে ডাউনলোড করব?",
        answer: "পেমেন্ট সম্পন্ন করে TrxID সাবমিট করার ৫-১৫ মিনিটের মধ্যে অ্যাডমিন ভেরিফাই করে ডাউনলোড লিংক সক্রিয় করে দেয়। এছাড়াও 'ট্র্যাক অর্ডার' পেজে অর্ডার নম্বর দিয়ে যেকোনো সময় ডাউনলোড করতে পারবেন।"
      },
      {
        question: "বিকাশ বা নগদে কীভাবে কিনব?",
        answer: "পছন্দের টুলস বা কোর্সের 'কিনুন' বাটনে ক্লিক করে বিকাশ বা নগদ পার্সোনাল নম্বরে Send Money করুন এবং TrxID ফর্মটিতে লিখে সাবমিট করুন।"
      },
      {
        question: "৩য়-পক্ষ কোর্স বা ড্রাইভ লিংক কীভাবে পাব?",
        answer: "যেসব প্রডাক্টে গুগল ড্রাইভ বা ৩য়-পক্ষ অ্যাক্সেস রয়েছে, সেগুলোতে পেমেন্ট অ্যাপ্রুভ হওয়ার পর ট্র্যাকিং পেজ ও ইউজার ড্যাশবোর্ডে সরাসরি 'Access Now' বাটন দৃশ্যমান হবে।"
      },
      {
        question: "লাইসেন্স কী কতক্ষণে পাওয়া যাবে?",
        answer: "পেমেন্ট অ্যাপ্রুভ হওয়ার সাথে সাথেই ট্র্যাকিং পেজে এবং আপনার ড্যাশবোর্ডে লাইসেন্স কী প্রদর্শিত হবে।"
      }
    ];

    if ((settings as any)?.chatbot_faqs_json) {
      try {
        const parsed = JSON.parse((settings as any).chatbot_faqs_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          faqs = parsed;
        }
      } catch (e) {}
    }

    // Retrieve last 10 messages from database if sessionId or userEmail is provided
    let history: any[] = [];
    if (sessionId || userEmail) {
      try {
        const db = getDB();
        let rows: any[] = [];
        if (userEmail) {
          const res = await db.prepare(
            "SELECT role, content, created_at FROM chat_history WHERE user_email = ? ORDER BY created_at DESC LIMIT 10"
          ).bind(userEmail).all();
          rows = res.results || [];
        } else if (sessionId) {
          const res = await db.prepare(
            "SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at DESC LIMIT 10"
          ).bind(sessionId).all();
          rows = res.results || [];
        }
        // Reverse to chronological order (oldest to newest)
        history = rows.reverse();
      } catch (dbErr) {
        // chat_history might not exist in local SQLite, fail softly
      }
    }

    return NextResponse.json({
      enabled: Boolean(settings?.ai_enabled ?? 1),
      faqs,
      history
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load chat data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, session_id, user_email, history = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const cleanInput = message.trim();
    const settings = await getSiteSettings();
    const products = await getProducts({ limit: 10 });

    // 1. Check if user question matches preset Chatbot FAQs
    if ((settings as any)?.chatbot_faqs_json) {
      try {
        const presetFaqs = JSON.parse((settings as any).chatbot_faqs_json);
        if (Array.isArray(presetFaqs)) {
          const lower = cleanInput.toLowerCase();
          const match = presetFaqs.find(
            (f: any) =>
              f.question &&
              (f.question.toLowerCase().trim() === lower ||
                lower.includes(f.question.toLowerCase().trim()))
          );
          if (match && match.answer) {
            // Save to chat_history
            await saveChatMessage(session_id, user_email, "user", cleanInput);
            await saveChatMessage(session_id, user_email, "assistant", match.answer);
            return NextResponse.json({ reply: match.answer });
          }
        }
      } catch (e) {}
    }

    // Build context with current tools on sale as clickable links
    const toolsContext = products
      .map(
        (p: any) =>
          `• [${p.title}](/tools/${p.slug}) (মূল্য: ${p.sale_price || p.price} টাকা): ${p.short_description || ''}`
      )
      .join("\n");

    const systemPrompt = `
আপনি "ToolsHub BD" (tootls.pages.dev)-এর অফিসিয়াল প্রফেশনাল এআই কাস্টমার সহকারী।

গুরুত্বপূর্ণ কঠোর নিয়মাবলী:
১. আপনার উত্তর সবসময় অত্যন্ত সংক্ষিপ্ত, মার্জিত এবং টু-দ্য-পয়েন্ট (সর্বোচ্চ ২ থেকে ৩ লাইনের মধ্যে) রাখবেন। কখনোই দীর্ঘ বা অতিরিক্ত প্যারাগ্রাফ লিখবেন না।
২. আপনি শুধুমাত্র ToolsHub BD ওয়েবসাইটের পণ্যসমূহ (ডিজিটাল টুলস, স্ক্রিপ্ট, সফটওয়্যার, কোর্স), মূল্য, পেমেন্ট মেথড (bKash Send Money, Nagad Send Money, Crypto USDT) এবং অর্ডার/ডাউনলোড/অ্যাক্সেস সংক্রান্ত প্রশ্নের উত্তর দিবেন।
৩. যে কোনো প্রোডাক্টের নাম উল্লেখ করার সময় অবশ্যই সেই প্রোডাক্টের টাইটেলটি ক্লিকযোগ্য লিংক আকারে লিখবেন: [প্রোডাক্টের নাম](/tools/slug) অথবা চেকআউটের জন্য [এখনই কিনুন](/checkout/slug)। সাধারণ টেক্সট হিসেবে কখনোই প্রোডাক্টের নাম লিখবেন না, যাতে কাস্টমার ক্লিক করে সরাসরি পেজে চলে যেতে পারে।
৪. এই ওয়েবসাইটের বাইরের বা অপ্রাসঙ্গিক কোনো বিষয়ে প্রশ্ন করা হলে অতি বিনয়ের সাথে বলুন:
"দুঃখিত, আমি শুধুমাত্র ToolsHub BD-এর প্রোডাক্ট ও সার্ভিস সম্পর্কিত তথ্যে সহায়তা করতে পারি। আপনি কি কোনো টুলস বা অর্ডার সম্পর্কে জানতে চান?"
৫. পণ্যের তালিকা দেওয়ার সময় সুন্দর লাইন-ব্রেক ও বুলেট ব্যবহার করবেন যাতে মোবাইল স্ক্রিনে পরিষ্কারভাবে পড়া যায়।

আমাদের বর্তমান টুলস ও কোর্সের তালিকা:
${toolsContext}

পেমেন্ট মেথড:
• bKash (Send Money)
• Nagad (Send Money)
• Crypto (USDT TRC20 / BEP20)
`.trim();

    let reply = "";

    // Take the last 3-5 QA turns from history
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];

    // 2. OpenRouter AI provider
    if (settings?.ai_provider === "openrouter" && settings?.ai_api_key) {
      let model = (settings.ai_model || "").trim();
      if (!model) {
        model = "minimax/minimax-m3.1-flash:free";
      }

      const endpoint = "https://openrouter.ai/api/v1/chat/completions";
      const messages = [
        { role: "system", content: systemPrompt },
        ...recentHistory.map((h: any) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content
        })),
        { role: "user", content: cleanInput }
      ];

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.ai_api_key}`,
            "HTTP-Referer": "https://tootls.pages.dev",
            "X-Title": "ToolsHub BD"
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 300,
            temperature: 0.5
          })
        });

        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
          reply = data.choices[0].message.content.trim();
        }
      } catch (e) {
        console.error("OpenRouter fetch error:", e);
      }
    }

    // 3. Fallback Smart Assistant if reply is still empty
    if (!reply) {
      const lower = cleanInput.toLowerCase();
      if (lower.includes("বিকাশ") || lower.includes("নগদ") || lower.includes("পেমেন্ট") || lower.includes("টাকা")) {
        reply = "আমাদের সাইটে বিকাশ (Send Money), নগদ (Send Money) এবং ক্রিপ্টো (USDT TRC20) এর মাধ্যমে পেমেন্ট করতে পারেন। প্রোডাক্টের 'কিনুন' বাটনে ক্লিক করে TrxID সাবমিট করলেই অ্যাডমিন ভেরিফাই করে ডেলিভারি সক্রিয় করে দেয়।";
      } else if (lower.includes("ডাউনলোড") || lower.includes("ড্রাইভ") || lower.includes("access") || lower.includes("ফাইল")) {
        reply = "অর্ডার অ্যাপ্রুভ হওয়ার সাথে সাথেই আপনার ট্র্যাকিং পেজে ও ড্যাশবোর্ডে ডাউনলোড লিংক অথবা 'Access Now' ড্রাইভ বাটন সক্রিয় হবে। 'অর্ডার ট্র্যাক' পেজে যেকোনো সময় স্ট্যাটাস দেখতে পারেন।";
      } else if (lower.includes("প্রোডাক্ট") || lower.includes("product") || lower.includes("টুলস") || lower.includes("tool") || lower.includes("কি কি")) {
        reply = "আমাদের স্টোরে বর্তমানে রয়েছে:\n• Facebook Lead Scraper Pro (৳৯৫০)\n• SEO Backlink Indexer & Booster (৳১৪০০)\n• Next.js SaaS Starter Kit (৳২৪০০)\n• WhatsApp AI Bot (৳১৮০০)\nহোমপেজে সব টুলসের বিস্তারিত ফিচার ও ডেমো পেয়ে যাবেন।";
      } else if (lower.includes("হাই") || lower.includes("হ্যালো") || lower.includes("hello") || lower.includes("hi") || lower.includes("সালাম")) {
        reply = "আসসালামু আলাইকুম! ToolsHub BD-তে আপনাকে স্বাগতম। আপনি কোন ডিজিটাল টুলস সম্পর্কে জানতে চান বা কীভাবে অর্ডার করবেন সাহায্য করতে পারি?";
      } else {
        reply = "ToolsHub BD-তে আপনাকে স্বাগতম! আমাদের প্রিমিয়াম ডিজিটাল টুলস, স্ক্রিপ্ট ও কোর্স সম্পর্কে জানতে চান বা কীভাবে বিকাশ/নগদে অর্ডার করবেন তা জিজ্ঞেস করতে পারেন।";
      }
    }

    // Save message to chat_history
    await saveChatMessage(session_id, user_email, "user", cleanInput);
    await saveChatMessage(session_id, user_email, "assistant", reply);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Chat Route Error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}

async function saveChatMessage(sessionId?: string, userEmail?: string, role = "user", content = "") {
  if (!content) return;
  try {
    const db = getDB();
    const id = "msg_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    await db.prepare(
      "INSERT INTO chat_history (id, session_id, user_email, role, content, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(id, sessionId || "guest", userEmail || null, role, content).run();
  } catch (e) {
    // Non-fatal if local db lacks table
  }
}
