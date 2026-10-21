import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, amount } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "অনুগ্রহ করে একটি প্রমো কোড লিখুন।" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Number(amount) || 0;

    const db = getDB();
    const promo = await db
      .prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? LIMIT 1")
      .bind(cleanCode)
      .first();

    if (!promo) {
      return NextResponse.json(
        { valid: false, error: `"${cleanCode}" প্রমো কোডটি পাওয়া যায়নি বা ভুল কোড।` },
        { status: 404 }
      );
    }

    // 1. Check active status
    if (!promo.is_active) {
      return NextResponse.json(
        { valid: false, error: "এই প্রমো কোডটি বর্তমানে নিষ্ক্রিয় রয়েছে।" },
        { status: 400 }
      );
    }

    // 2. Check expiry date
    if (promo.expiry_date) {
      const expiry = new Date(promo.expiry_date).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) {
        return NextResponse.json(
          { valid: false, error: "দুঃখিত, এই প্রমো কোডটির মেয়াদ শেষ হয়ে গেছে।" },
          { status: 400 }
        );
      }
    }

    // 3. Check usage limit
    if (promo.usage_limit && promo.usage_limit > 0) {
      if ((promo.used_count || 0) >= promo.usage_limit) {
        return NextResponse.json(
          { valid: false, error: "এই প্রমো কোডের ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে।" },
          { status: 400 }
        );
      }
    }

    // 4. Check minimum order amount
    if (promo.min_order_amount && promo.min_order_amount > 0) {
      if (orderAmount < promo.min_order_amount) {
        return NextResponse.json(
          {
            valid: false,
            error: `এই প্রমো কোডটি প্রয়োগ করতে ন্যূনতম ৳${promo.min_order_amount} মূল্যের অর্ডার আবশ্যক।`
          },
          { status: 400 }
        );
      }
    }

    // 5. Calculate discount amount
    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = Math.round((orderAmount * Number(promo.discount_value)) / 100);
      if (promo.max_discount_amount && promo.max_discount_amount > 0) {
        discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
      }
    } else {
      // Fixed discount
      discountAmount = Math.min(orderAmount, Number(promo.discount_value));
    }

    const finalPrice = Math.max(0, orderAmount - discountAmount);

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discountAmount,
      final_price: finalPrice,
      message: `অভিনন্দন! "${promo.code}" প্রমো কোড সফলভাবে যুক্ত হয়েছে! (৳${discountAmount} ছাড়)`
    });
  } catch (error: any) {
    console.error("Promo validation error:", error);
    return NextResponse.json(
      { valid: false, error: "প্রমো কোড যাচাই করতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}
