import { CheckoutClient } from "./CheckoutClient";
import { getProducts } from "@/lib/db";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p: any) => ({
    slug: p.slug,
  }));
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CheckoutClient slug={slug} />;
}
