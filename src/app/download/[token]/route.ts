import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getFromR2 } from "@/lib/r2";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse("Invalid download token", { status: 400 });
    }

    const db = getDB();

    // 1. Verify token in D1 (indexed column)
    const order = await db
      .prepare("SELECT * FROM orders WHERE download_token = ? LIMIT 1")
      .bind(token)
      .first();

    if (!order) {
      return new NextResponse(
        "<h1>ডাউনলোড লিংক পাওয়া যায়নি</h1><p>আপনার ডাউনলোড টোকেনটি সঠিক নয় অথবা বাতিল করা হয়েছে।</p>",
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 2. Check payment status
    if (order.payment_status !== "approved") {
      return new NextResponse(
        `<h1>পেমেন্ট অপেক্ষারত আছে</h1><p>অর্ডার নম্বর #${order.order_number} এর পেমেন্ট এখনও অ্যাডমিন ভেরিফাই করেনি। ভেরিফাই সম্পন্ন হলে এই লিংক থেকে ফাইল ডাউনলোড করতে পারবেন।</p>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 3. Check download limit
    if (order.download_count >= order.max_downloads) {
      return new NextResponse(
        `<h1>ডাউনলোড লিমিট শেষ</h1><p>আপনি ইতিমধ্যে সর্বোচ্চ ${order.max_downloads} বার ফাইলটি ডাউনলোড করেছেন। কোনো সমস্যা হলে সাপোর্টে যোগাযোগ করুন।</p>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Fetch product details
    const product = await db
      .prepare("SELECT * FROM products WHERE id = ? LIMIT 1")
      .bind(order.product_id)
      .first();

    if (!product) {
      return new NextResponse("Product record not found", { status: 404 });
    }

    // 4. Increment download count in D1
    await db
      .prepare("UPDATE orders SET download_count = download_count + 1 WHERE id = ?")
      .bind(order.id)
      .run();

    // 5. If product is external link (Google Drive / 3rd Party Access URL), redirect directly!
    if (product.external_access_url) {
      return NextResponse.redirect(product.external_access_url, 302);
    }

    // 5. Fetch file from Cloudflare R2 bucket 'tools-media'
    const fileName = product.file_name || `${product.slug}.zip`;
    const r2Key = product.r2_file_key || `tools/${fileName}`;

    const r2Object = await getFromR2(r2Key);
    if (r2Object && r2Object.body) {
      return new Response(r2Object.body, {
        headers: {
          "Content-Type": r2Object.httpMetadata?.contentType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store"
        }
      });
    }

    // Fallback/Simulated file download for testing before manual R2 upload
    const dummyContent = `ToolsHub BD Digital Delivery
Product: ${product.title}
Version: ${product.version}
License Key: ${order.delivered_license_key || "STANDALONE-OFFLINE-ACTIVATED"}
Customer: ${order.customer_name} (${order.customer_email})
Order Number: ${order.order_number}
Domain: sohag.com.bd
Date: ${new Date().toISOString()}

Thank you for purchasing!
For support: support@sohag.com.bd
`;

    return new Response(dummyContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${product.slug}-read-me.txt"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Download Handler Error:", error);
    return new NextResponse("Internal Server Error while serving file", { status: 500 });
  }
}
