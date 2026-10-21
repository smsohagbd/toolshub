import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import {
  sendEmail,
  getOrderApprovedEmailHtml,
  getOrderCancelledEmailHtml,
  getOrderNoteEmailHtml
} from "@/lib/smtp";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return NextResponse.json({ orders: res.results || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, payment_status, admin_notes, delivered_license_key } = body;

    if (!order_id || !payment_status) {
      return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 });
    }

    const db = getDB();

    // Fetch existing order to check previous status and customer info
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1")
      .bind(order_id, order_id)
      .first();

    if (!order) {
      return NextResponse.json({ error: "অর্ডার পাওয়া যায়নি" }, { status: 404 });
    }

    const prevStatus = order.payment_status;
    const finalLicense = delivered_license_key || order.delivered_license_key;

    // Update order record
    await db
      .prepare(`
        UPDATE orders 
        SET payment_status = ?, 
            admin_notes = COALESCE(?, admin_notes),
            delivered_license_key = COALESCE(?, delivered_license_key),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR order_number = ?
      `)
      .bind(
        payment_status,
        admin_notes || null,
        delivered_license_key || null,
        order_id,
        order_id
      )
      .run();

    // Fetch product info to check if subscription or external link
    const product = await db
      .prepare("SELECT * FROM products WHERE id = ? LIMIT 1")
      .bind(order.product_id)
      .first();

    // AUTOMATION 1: If Order is newly approved and product is a Subscription, record subscription
    if (payment_status === "approved" && prevStatus !== "approved" && product?.billing_type === "subscription") {
      try {
        const subId = "sub_" + Math.random().toString(36).substring(2, 9);
        const period = product.subscription_period || "1_month";
        let daysToAdd = 30;
        if (period === "2_months") daysToAdd = 60;
        else if (period === "3_months") daysToAdd = 90;
        else if (period === "6_months") daysToAdd = 180;
        else if (period === "1_year") daysToAdd = 365;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysToAdd);

        await db
          .prepare(`
            INSERT INTO subscriptions (
              id, user_name, user_email, product_id, product_title, billing_cycle,
              start_date, expiry_date, status, order_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'active', ?, CURRENT_TIMESTAMP)
          `)
          .bind(
            subId,
            order.customer_name,
            order.customer_email,
            product.id,
            product.title,
            period,
            expiryDate.toISOString(),
            order.id
          )
          .run();
      } catch (subErr) {
        console.error("Subscription creation error:", subErr);
      }
    }

    // AUTOMATION 2: Send Automated Emails
    try {
      if (payment_status === "approved" && prevStatus !== "approved") {
        // Send Approved & Delivery Email
        const accessUrl = product?.external_access_url || `https://tootls.pages.dev/download/${order.download_token}`;
        await sendEmail({
          to: order.customer_email,
          subject: `✓ আপনার অর্ডার অনুমোদিত হয়েছে! #${order.order_number} - ToolsHub BD`,
          html: getOrderApprovedEmailHtml(order, accessUrl, finalLicense),
          event_type: "order_approved"
        });
      } else if (payment_status === "rejected" && prevStatus !== "rejected") {
        // Send Rejection/Cancellation Email
        await sendEmail({
          to: order.customer_email,
          subject: `অর্ডার বাতিল সংক্রান্ত নোটিফিকেশন #${order.order_number} - ToolsHub BD`,
          html: getOrderCancelledEmailHtml(order, admin_notes),
          event_type: "order_cancelled"
        });
      } else if (admin_notes && admin_notes !== order.admin_notes) {
        // Send Admin Note Email
        await sendEmail({
          to: order.customer_email,
          subject: `আপনার অর্ডার #${order.order_number} এ নতুন অ্যাডমিন নোট যুক্ত হয়েছে`,
          html: getOrderNoteEmailHtml(order, admin_notes),
          event_type: "order_note"
        });
      }
    } catch (mailErr) {
      console.error("Email notification dispatch error:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `অর্ডার স্ট্যাটাস সফলভাবে '${payment_status}' এ আপডেট করা হয়েছে!`
    });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
