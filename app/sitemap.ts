import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/servicos`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contato`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/cadastro`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const { data: products } = await createPublicClient()
    .from("products")
    .select("slug,created_at,image_url")
    .eq("active", true)
    .order("created_at", { ascending: false });

  return [
    ...publicPages,
    ...(products ?? []).filter((product) => product.slug).map((product) => ({
      url: `${SITE_URL}/catalogo/${encodeURIComponent(product.slug)}`,
      lastModified: product.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: product.image_url ? [product.image_url] : undefined,
    })),
  ];
}
