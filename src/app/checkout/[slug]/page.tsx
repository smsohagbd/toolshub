import { CheckoutClient } from "./CheckoutClient";

export async function generateStaticParams() {
  return [{ slug: "template" }];
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CheckoutClient slug={slug} />;
}
