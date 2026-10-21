import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keyword = (body?.keyword || "").trim();
    if (!keyword) {
      return NextResponse.json({ error: "কিওয়ার্ড আবশ্যক" }, { status: 400 });
    }

    const settings = await getSiteSettings();
    const apiKey = settings?.ai_api_key;
    const provider = settings?.ai_provider || "openrouter";
    let model = (settings?.ai_model || "").trim();
    if (!model) {
      model = provider === "gemini" ? "gemini-1.5-flash" : "minimax/minimax-m3.1-flash:free";
    }

    const prompt = `You are an expert Bangladeshi digital marketing & software copywriter for "ToolsHub BD".
User gave you a product concept or keyword: "${keyword}".
Generate compelling, high-converting product details in JSON format.
Your output MUST be valid JSON only (no markdown code blocks, no backticks, no explanations).
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
          Authorization: `Bearer ${apiKey}`,
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          })
        }
      );
      const d = await res.json();
      aiText = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Parse JSON
    let cleanJson = aiText.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith("```")) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith("```")) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: parsed });
    } catch (parseErr) {
      // Return structured fallback
      const slug = keyword
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return NextResponse.json({
        success: true,
        data: {
          title: `${keyword} Pro 2026`,
          slug: slug || "digital-product",
          short_description: `${keyword} এর মাধ্যমে খুব সহজেই আপনার ব্যবসার গ্রোথ ও অটোমেশন নিশ্চিত করুন।`,
          description: `${keyword} হলো একটি আধুনিক ও শক্তিশালী ডিজিটাল সল্যুশন। এটি আপনার সময় বাঁচাবে এবং উৎপাদনশীলতা বহুগুণ বাড়িয়ে দিবে। সম্পূর্ণ লাইফটাইম এক্সেস ও ইনস্ট্যান্ট ডেলিভারি।`,
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
  } catch (err) {
    console.error("AI Product Generator Error:", err);
    return NextResponse.json({ error: "Failed to generate details" }, { status: 500 });
  }
}
