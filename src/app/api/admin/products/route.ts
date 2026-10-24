import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
    return NextResponse.json({ products: res.results || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      slug,
      category_id,
      short_description,
      description,
      price,
      sale_price,
      product_type,
      billing_type,
      subscription_period,
      external_access_url,
      file_name,
      file_size,
      version,
      preview_url,
      thumbnail_url,
      features,
      is_featured,
      status
    } = body;

    if (!title || !slug || !price) {
      return NextResponse.json({ error: "Title, slug and price are required" }, { status: 400 });
    }

    const db = getDB();
    const id = "prod_" + Math.random().toString(36).substring(2, 9);
    const r2Key = `tools/${file_name || slug + ".zip"}`;

    await db
      .prepare(`
        INSERT INTO products (
          id, category_id, title, slug, short_description, description,
          price, sale_price, product_type, billing_type, subscription_period,
          external_access_url, r2_file_key, file_name, file_size,
          version, preview_url, thumbnail_url, screenshots_json, features_json,
          tags, is_featured, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        category_id || "cat_automation",
        title.trim(),
        slug.trim().toLowerCase(),
        short_description || "",
        description || "",
        Number(price),
        sale_price ? Number(sale_price) : null,
        product_type || "file",
        billing_type || "one_time",
        billing_type === "subscription" ? (subscription_period || "1_month") : null,
        external_access_url || null,
        r2Key,
        file_name || `${slug}.zip`,
        file_size || "",
        version || "",
        preview_url || "",
        thumbnail_url || "",
        "[]",
        JSON.stringify(features || []),
        "",
        is_featured ? 1 : 0,
        status || "published"
      )
      .run();

    try {
      revalidatePath("/");
      revalidatePath("/api/products");
      revalidatePath(`/tools/${slug.trim().toLowerCase()}`);
      revalidatePath(`/checkout/${slug.trim().toLowerCase()}`);
    } catch (e) {}

    return NextResponse.json({ success: true, id, message: "প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!" });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      slug,
      category_id,
      short_description,
      description,
      price,
      sale_price,
      product_type,
      billing_type,
      subscription_period,
      external_access_url,
      file_name,
      file_size,
      version,
      preview_url,
      thumbnail_url,
      features,
      is_featured,
      status
    } = body;

    if (!id || !title || !slug || !price) {
      return NextResponse.json({ error: "ID, Title, slug and price are required" }, { status: 400 });
    }

    const db = getDB();
    const r2Key = `tools/${file_name || slug + ".zip"}`;

    await db
      .prepare(`
        UPDATE products
        SET category_id = ?,
            title = ?,
            slug = ?,
            short_description = ?,
            description = ?,
            price = ?,
            sale_price = ?,
            product_type = ?,
            billing_type = ?,
            subscription_period = ?,
            external_access_url = ?,
            r2_file_key = ?,
            file_name = ?,
            file_size = ?,
            version = ?,
            preview_url = ?,
            thumbnail_url = ?,
            features_json = ?,
            is_featured = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        category_id || "cat_automation",
        title.trim(),
        slug.trim().toLowerCase(),
        short_description || "",
        description || "",
        Number(price),
        sale_price ? Number(sale_price) : null,
        product_type || "file",
        billing_type || "one_time",
        billing_type === "subscription" ? (subscription_period || "1_month") : null,
        external_access_url || null,
        r2Key,
        file_name || `${slug}.zip`,
        file_size || "",
        version || "",
        preview_url || "",
        thumbnail_url || "",
        JSON.stringify(features || []),
        is_featured ? 1 : 0,
        status || "published",
        id
      )
      .run();

    try {
      revalidatePath("/");
      revalidatePath("/api/products");
      revalidatePath(`/tools/${slug.trim().toLowerCase()}`);
      revalidatePath(`/checkout/${slug.trim().toLowerCase()}`);
    } catch (e) {}

    return NextResponse.json({ success: true, message: "প্রোডাক্ট সফলভাবে আপডেট করা হয়েছে!" });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const db = getDB();
    const prod = await db.prepare("SELECT slug FROM products WHERE id = ?").bind(id).first<{ slug: string }>();

    try {
      await db.prepare("DELETE FROM order_messages WHERE order_id IN (SELECT id FROM orders WHERE product_id = ?) OR order_number IN (SELECT order_number FROM orders WHERE product_id = ?)").bind(id, id).run();
    } catch(e) {}
    try {
      await db.prepare("DELETE FROM orders WHERE product_id = ?").bind(id).run();
    } catch(e) {}
    try {
      await db.prepare("DELETE FROM product_licenses WHERE product_id = ?").bind(id).run();
    } catch(e) {}
    try {
      await db.prepare("DELETE FROM subscriptions WHERE product_id = ?").bind(id).run();
    } catch(e) {}
    await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();

    try {
      revalidatePath("/");
      revalidatePath("/api/products");
      if (prod?.slug) {
        revalidatePath(`/tools/${prod.slug}`);
        revalidatePath(`/checkout/${prod.slug}`);
      }
    } catch (e) {}

    return NextResponse.json({ success: true, message: "প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
