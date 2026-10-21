import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

// GET /api/admin/promo-codes - List all promo codes
export async function GET() {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
    return NextResponse.json({ success: true, promo_codes: res.results || [] });
  } catch (error: any) {
    console.error("Admin promo-codes GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch promo codes" }, { status: 500 });
  }
}

// POST /api/admin/promo-codes - Create new promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      expiry_date,
      is_active
    } = body;

    if (!code || !discount_value) {
      return NextResponse.json(
        { success: false, error: "প্রমো কোড এবং ডিসকাউন্টের পরিমাণ আবশ্যক।" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const db = getDB();

    // Check if code already exists
    const existing = await db
      .prepare("SELECT id FROM promo_codes WHERE UPPER(code) = ? LIMIT 1")
      .bind(cleanCode)
      .first();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `'${cleanCode}' প্রমো কোডটি ইতিমধ্যে বিদ্যমান রয়েছে। অন্য কোড দিন।` },
        { status: 400 }
      );
    }

    const id = "promo_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const type = discount_type === "fixed" ? "fixed" : "percentage";
    const value = Math.max(0, Number(discount_value) || 0);
    const minOrder = Math.max(0, Number(min_order_amount) || 0);
    const maxDiscount = max_discount_amount ? Number(max_discount_amount) : null;
    const limit = Math.max(0, Number(usage_limit) || 0);
    const active = is_active === 0 || is_active === false ? 0 : 1;
    const expiry = expiry_date ? new Date(expiry_date).toISOString() : null;

    await db
      .prepare(`
        INSERT INTO promo_codes (
          id, code, discount_type, discount_value, min_order_amount,
          max_discount_amount, usage_limit, used_count, expiry_date, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(id, cleanCode, type, value, minOrder, maxDiscount, limit, expiry, active)
      .run();

    return NextResponse.json({
      success: true,
      message: `'${cleanCode}' প্রমো কোডটি সফলভাবে তৈরি করা হয়েছে!`,
      id
    });
  } catch (error: any) {
    console.error("Admin promo-codes POST error:", error);
    return NextResponse.json({ success: false, error: "প্রমো কোড তৈরি করতে ব্যর্থ হয়েছে।" }, { status: 500 });
  }
}

// PUT /api/admin/promo-codes - Update promo code
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      expiry_date,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID আবশ্যক।" }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const db = getDB();

    // Check duplicate code if code changed
    if (cleanCode) {
      const existing = await db
        .prepare("SELECT id FROM promo_codes WHERE UPPER(code) = ? AND id != ? LIMIT 1")
        .bind(cleanCode, id)
        .first();

      if (existing) {
        return NextResponse.json(
          { success: false, error: `'${cleanCode}' প্রমো কোডটি অন্য একটি রেকর্ডে বিদ্যমান রয়েছে।` },
          { status: 400 }
        );
      }
    }

    const type = discount_type === "fixed" ? "fixed" : "percentage";
    const value = Math.max(0, Number(discount_value) || 0);
    const minOrder = Math.max(0, Number(min_order_amount) || 0);
    const maxDiscount = max_discount_amount ? Number(max_discount_amount) : null;
    const limit = Math.max(0, Number(usage_limit) || 0);
    const active = is_active === 0 || is_active === false ? 0 : 1;
    const expiry = expiry_date ? new Date(expiry_date).toISOString() : null;

    await db
      .prepare(`
        UPDATE promo_codes
        SET code = ?,
            discount_type = ?,
            discount_value = ?,
            min_order_amount = ?,
            max_discount_amount = ?,
            usage_limit = ?,
            expiry_date = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(cleanCode, type, value, minOrder, maxDiscount, limit, expiry, active, id)
      .run();

    return NextResponse.json({
      success: true,
      message: `'${cleanCode}' প্রমো কোডটি সফলভাবে আপডেট করা হয়েছে!`
    });
  } catch (error: any) {
    console.error("Admin promo-codes PUT error:", error);
    return NextResponse.json({ success: false, error: "প্রমো কোড আপডেট করতে ব্যর্থ হয়েছে।" }, { status: 500 });
  }
}

// DELETE /api/admin/promo-codes - Delete promo code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID আবশ্যক।" }, { status: 400 });
    }

    const db = getDB();
    await db.prepare("DELETE FROM promo_codes WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true, message: "প্রমো কোডটি সফলভাবে মুছে ফেলা হয়েছে!" });
  } catch (error: any) {
    console.error("Admin promo-codes DELETE error:", error);
    return NextResponse.json({ success: false, error: "প্রমো কোড মুছতে ব্যর্থ হয়েছে।" }, { status: 500 });
  }
}
