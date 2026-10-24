import { NextRequest, NextResponse } from "next/server";
import { getDB, getSiteSettings } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    if (settings) {
      const safe = { ...settings };
      delete (safe as any).admin_password_hash;
      delete (safe as any).admin_otp_code;
      delete (safe as any).admin_otp_expires_at;
      return NextResponse.json({ settings: safe });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDB();

    // Auto-create any missing columns in Cloudflare D1
    try { await db.prepare("ALTER TABLE settings ADD COLUMN contact_page_json TEXT").run(); } catch (_) {}
    try { await db.prepare("ALTER TABLE settings ADD COLUMN telegram_channel TEXT").run(); } catch (_) {}
    try { await db.prepare("ALTER TABLE settings ADD COLUMN whatsapp_number TEXT").run(); } catch (_) {}
    try { await db.prepare("ALTER TABLE settings ADD COLUMN homepage_json TEXT").run(); } catch (_) {}
    try { await db.prepare("ALTER TABLE settings ADD COLUMN chatbot_faqs_json TEXT").run(); } catch (_) {}

    const current = await getSiteSettings();

    const updated = {
      site_title: body.site_title ?? current.site_title,
      site_tagline: body.site_tagline ?? current.site_tagline,
      site_description: body.site_description ?? current.site_description,
      logo_url: body.logo_url ?? current.logo_url,
      header_nav_json: body.header_nav_json ? JSON.stringify(body.header_nav_json) : current.header_nav_json,
      footer_nav_json: body.footer_nav_json ? JSON.stringify(body.footer_nav_json) : current.footer_nav_json,
      header_code: body.header_code ?? current.header_code,
      footer_code: body.footer_code ?? current.footer_code,
      facebook_pixel_id: body.facebook_pixel_id ?? current.facebook_pixel_id,
      facebook_access_token: body.facebook_access_token ?? current.facebook_access_token,
      facebook_test_event_code: body.facebook_test_event_code ?? current.facebook_test_event_code,
      facebook_tracking_enabled: typeof body.facebook_tracking_enabled !== "undefined" ? (body.facebook_tracking_enabled ? 1 : 0) : current.facebook_tracking_enabled,
      ai_enabled: typeof body.ai_enabled !== "undefined" ? (body.ai_enabled ? 1 : 0) : current.ai_enabled,
      ai_provider: body.ai_provider ?? current.ai_provider,
      ai_model: body.ai_model ?? current.ai_model,
      ai_api_key: body.ai_api_key ?? current.ai_api_key,
      ai_system_prompt: body.ai_system_prompt ?? current.ai_system_prompt,
      homepage_json: body.homepage_json !== undefined ? (typeof body.homepage_json === "string" ? body.homepage_json : JSON.stringify(body.homepage_json)) : ((current as any)?.homepage_json || null),
      chatbot_faqs_json: body.chatbot_faqs_json !== undefined ? (typeof body.chatbot_faqs_json === "string" ? body.chatbot_faqs_json : JSON.stringify(body.chatbot_faqs_json)) : ((current as any)?.chatbot_faqs_json || null),
      whatsapp_number: body.whatsapp_number !== undefined ? body.whatsapp_number : ((current as any)?.whatsapp_number || ""),
      telegram_channel: body.telegram_channel !== undefined ? body.telegram_channel : ((current as any)?.telegram_channel || ""),
      contact_page_json: body.contact_page_json !== undefined ? (typeof body.contact_page_json === "string" ? body.contact_page_json : JSON.stringify(body.contact_page_json)) : ((current as any)?.contact_page_json || null)
    };

    await db
      .prepare(`
        UPDATE settings 
        SET site_title = ?,
            site_tagline = ?,
            site_description = ?,
            logo_url = ?,
            header_nav_json = ?,
            footer_nav_json = ?,
            header_code = ?,
            footer_code = ?,
            facebook_pixel_id = ?,
            facebook_access_token = ?,
            facebook_test_event_code = ?,
            facebook_tracking_enabled = ?,
            ai_enabled = ?,
            ai_provider = ?,
            ai_model = ?,
            ai_api_key = ?,
            ai_system_prompt = ?,
            homepage_json = ?,
            chatbot_faqs_json = ?,
            whatsapp_number = ?,
            telegram_channel = ?,
            contact_page_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 'general'
      `)
      .bind(
        updated.site_title,
        updated.site_tagline,
        updated.site_description,
        updated.logo_url,
        updated.header_nav_json,
        updated.footer_nav_json,
        updated.header_code,
        updated.footer_code,
        updated.facebook_pixel_id,
        updated.facebook_access_token,
        updated.facebook_test_event_code,
        updated.facebook_tracking_enabled,
        updated.ai_enabled,
        updated.ai_provider,
        updated.ai_model,
        updated.ai_api_key,
        updated.ai_system_prompt,
        updated.homepage_json,
        updated.chatbot_faqs_json,
        updated.whatsapp_number,
        updated.telegram_channel,
        updated.contact_page_json
      )
      .run();

    return NextResponse.json({ success: true, message: "সেটিংস সফলভাবে সংরক্ষিত হয়েছে!", settings: updated });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
