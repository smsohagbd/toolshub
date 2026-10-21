import { NextRequest, NextResponse } from "next/server";
import { getDB, getProductBySlug, createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, createSessionToken, USER_COOKIE_NAME } from "@/lib/auth";
import { sendMetaCAPIEvent } from "@/lib/meta-capi";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_id,
      product_slug,
      customer_name,
      customer_email,
      customer_phone,
      payment_method,
      sender_number,
      transaction_id,
      password
    } = body;

    if (!customer_name || !customer_email || !payment_method || !transaction_id) {
      return NextResponse.json(
        { error: "সবগুলো প্রয়োজনীয় ঘর পূরণ করুন (নাম, ইমেইল, পেমেন্ট মেথড ও TrxID)" },
        { status: 400 }
      );
    }

    const cleanEmail = customer_email.trim().toLowerCase();
    const cleanName = customer_name.trim();

    const db = getDB();

    // Fetch product info to secure exact price
    let product: any = null;
    if (product_slug) {
      product = await getProductBySlug(product_slug);
    } else {
      product = await db.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(product_id).first();
    }

    if (!product) {
      return NextResponse.json({ error: "প্রোডাক্ট পাওয়া যায়নি" }, { status: 404 });
    }

    // Check if customer already exists. If not and password is provided, auto-create account
    let newAccountCreated = false;
    let sessionToken: string | null = null;

    try {
      const existingUser = await findUserByEmail(cleanEmail);
      if (!existingUser && password && password.length >= 6) {
        const password_hash = await hashPassword(password);
        const userId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const newUser = {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          password_hash,
          role: "customer"
        };
        await createUser(newUser);
        sessionToken = await createSessionToken(newUser);
        newAccountCreated = true;
      }
    } catch (authErr) {
      console.error("Auto account creation non-fatal error:", authErr);
    }

    const orderId = "ord_" + Math.random().toString(36).substring(2, 10);
    const orderNumber = "ORD-" + Math.floor(10000 + Math.random() * 90000);
    const downloadToken = crypto.randomUUID();
    const baseAmount = product.sale_price || product.price;

    // Promo code validation & server-side discount calculation
    let appliedCoupon: string | null = null;
    let discountAmount = 0;

    if (body.coupon_code && typeof body.coupon_code === "string") {
      const cleanCoupon = body.coupon_code.trim().toUpperCase();
      try {
        const promo = await db
          .prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? LIMIT 1")
          .bind(cleanCoupon)
          .first();

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

            // Increment usage count
            await db
              .prepare("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?")
              .bind(promo.id)
              .run();
          }
        }
      } catch (couponErr) {
        console.error("Promo code check error:", couponErr);
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);

    // Insert order into D1 with indexed columns
    await db
      .prepare(`
        INSERT INTO orders (
          id, order_number, customer_name, customer_email, customer_phone,
          product_id, product_title, amount, currency, payment_method,
          payment_status, sender_number, transaction_id, admin_notes,
          download_token, delivered_license_key, coupon_code, discount_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        orderId,
        orderNumber,
        cleanName,
        cleanEmail,
        customer_phone?.trim() || "",
        product.id,
        product.title,
        finalAmount,
        "BDT",
        payment_method,
        "pending",
        sender_number?.trim() || "",
        transaction_id.trim(),
        appliedCoupon ? `Promo applied: ${appliedCoupon} (-৳${discountAmount})` : "Submitted via online checkout",
        downloadToken,
        "",
        appliedCoupon,
        discountAmount
      )
      .run();

    // Trigger Meta CAPI Server Purchase Event
    const eventId = `purchase_${orderNumber}_${Date.now()}`;
    const clientIp = req.headers.get("cf-connecting-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    sendMetaCAPIEvent({
      event_name: "Purchase",
      event_id: eventId,
      user_email: cleanEmail,
      user_ip: clientIp,
      user_agent: userAgent,
      custom_data: {
        currency: "BDT",
        value: finalAmount,
        content_name: product.title,
        content_ids: [product.id],
        order_id: orderNumber
      }
    }).catch(() => {});

    // Send Automated Email Notifications
    try {
      const { sendEmail, getOrderPlacedEmailHtml, getWelcomeEmailHtml } = await import("@/lib/smtp");
      
      // 1. Order Placed Email
      sendEmail({
        to: cleanEmail,
        subject: `অর্ডার গ্রহণ করা হয়েছে #${orderNumber} - ToolsHub BD`,
        html: getOrderPlacedEmailHtml({
          order_number: orderNumber,
          customer_name: cleanName,
          product_title: product.title,
          amount: finalAmount,
          currency: "BDT",
          payment_method,
          transaction_id
        }),
        event_type: "order_created"
      }).catch((e) => console.error("Order placed email async error:", e));

      // 2. Welcome Email if new customer account was created
      if (newAccountCreated) {
        sendEmail({
          to: cleanEmail,
          subject: `ToolsHub BD-তে স্বাগতম, ${cleanName}!`,
          html: getWelcomeEmailHtml(cleanName, cleanEmail),
          event_type: "user_signup"
        }).catch((e) => console.error("Welcome email async error:", e));
      }
    } catch (mailErr) {
      console.error("Order notification email dispatch error:", mailErr);
    }

    const response = NextResponse.json({
      success: true,
      order_number: orderNumber,
      download_token: downloadToken,
      new_account_created: newAccountCreated,
      message: newAccountCreated
        ? "আপনার অর্ডার সফল হয়েছে এবং নতুন কাস্টমার অ্যাকাউন্ট তৈরি হয়েছে!"
        : "আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!"
    });

    if (sessionToken) {
      response.cookies.set({
        name: USER_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Order Creation Error:", error);
    return NextResponse.json({ error: "অর্ডার সাবমিট করতে ব্যর্থ হয়েছে" }, { status: 500 });
  }
}
