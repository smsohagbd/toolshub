import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { order_number, customer_email } = await req.json();

    if (!order_number || !customer_email) {
      return NextResponse.json(
        { error: "অর্ডার নম্বর এবং ইমেইল দুটোই আবশ্যক" },
        { status: 400 }
      );
    }

    const db = getDB();
    const cleanNumber = order_number.trim().toUpperCase();
    const cleanEmail = customer_email.trim().toLowerCase();

    const order = await db
      .prepare(
        "SELECT * FROM orders WHERE (order_number = ? OR id = ?) AND customer_email = ? LIMIT 1"
      )
      .bind(cleanNumber, cleanNumber, cleanEmail)
      .first();

    if (!order) {
      return NextResponse.json(
        { error: "প্রদত্ত তথ্যের সাথে কোনো অর্ডার পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর ও ইমেইল চেক করুন।" },
        { status: 404 }
      );
    }

    const prod = await db
      .prepare("SELECT product_type, external_access_url FROM products WHERE id = ? OR slug = ? LIMIT 1")
      .bind(order.product_id, order.product_id)
      .first();

    return NextResponse.json({
      success: true,
      order: {
        order_number: order.order_number,
        product_title: order.product_title,
        product_type: prod?.product_type || "file",
        external_access_url: prod?.external_access_url || null,
        amount: order.amount,
        currency: order.currency,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        download_token: order.payment_status === "approved" ? order.download_token : null,
        download_count: order.download_count,
        max_downloads: order.max_downloads,
        delivered_license_key: order.delivered_license_key,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error("Order Track Error:", error);
    return NextResponse.json({ error: "অর্ডার চেক করতে ব্যর্থ হয়েছে" }, { status: 500 });
  }
}
