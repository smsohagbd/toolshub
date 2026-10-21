import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM subscriptions ORDER BY created_at DESC").all();
    const subs = res.results || [];

    // Calculate days remaining and update status if expired
    const now = new Date().getTime();
    const processedSubs = subs.map((s: any) => {
      const expiry = new Date(s.expiry_date).getTime();
      const diffMs = expiry - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysRemaining <= 0;
      return {
        ...s,
        days_remaining: daysRemaining,
        is_expired: isExpired,
        status: isExpired && s.status === "active" ? "expired" : s.status
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: processedSubs
    });
  } catch (error: any) {
    console.error("Admin subscriptions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Extend expiry date or toggle status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, extend_days, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "সাবস্ক্রিপশন আইডি প্রয়োজন" }, { status: 400 });
    }

    const db = getDB();
    const sub = await db.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(id).first();
    if (!sub) {
      return NextResponse.json({ success: false, error: "সাবস্ক্রিপশন পাওয়া যায়নি" }, { status: 404 });
    }

    if (action === "extend") {
      const days = parseInt(extend_days || "30", 10);
      const currentExpiry = new Date(sub.expiry_date);
      const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      const newExpiryStr = baseDate.toISOString();

      await db.prepare("UPDATE subscriptions SET expiry_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(newExpiryStr, id)
        .run();

      return NextResponse.json({
        success: true,
        message: `মেয়াদ সফলভাবে ${days} দিন বৃদ্ধি করা হয়েছে`,
        new_expiry: newExpiryStr
      });
    }

    if (status) {
      await db.prepare("UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(status, id)
        .run();
      return NextResponse.json({ success: true, message: "স্ট্যাটাস আপডেট হয়েছে" });
    }

    return NextResponse.json({ success: false, error: "অ্যাকশন নির্দিষ্ট করুন" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "আইডি প্রয়োজন" }, { status: 400 });
    }

    const db = getDB();
    await db.prepare("DELETE FROM subscriptions WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true, message: "সাবস্ক্রিপশন মুছে ফেলা হয়েছে" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
