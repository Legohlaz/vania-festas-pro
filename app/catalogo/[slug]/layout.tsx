import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

type ProductLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await createPublicClient()
    .from("products")
    .select("name,description,image_url")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!product) {
    return { title: "Produto não encontrado", robots: { index: false, follow: false } };
  }

  const title = `${product.name} para locação`;
  const description = product.description?.trim().slice(0, 155) || SITE_DESCRIPTION;
  const url = `${SITE_URL}/catalogo/${encodeURIComponent(slug)}`;
  const images = product.image_url ? [{ url: product.image_url, alt: product.name }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: "pt_BR", type: "website", images },
    twitter: { card: "summary_large_image", title, description, images: product.image_url ? [product.image_url] : undefined },
  };
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children;
}
