import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

type Product = { id: number; name: string; slug: string; description: string | null; category: string | null; event_type: string[] | null; search_keywords: string[] | null; price: number | string | null; image_url: string | null; stock_quantity: number | null };
type Availability = { product_id: number; available_quantity: number | null };

const ignoredTerms = new Set(["a", "ao", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "eu", "festa", "para", "por", "quero", "uma", "um", "o", "os"]);

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders, ...init?.headers } });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function termsFrom(message: string) {
  return normalize(message).match(/[a-z0-9]+/g)?.filter((term) => term.length > 1 && !ignoredTerms.has(term)) ?? [];
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const body = await request.json().catch(() => null) as { eventDate?: unknown; message?: unknown } | null;
  const eventDate = typeof body?.eventDate === "string" ? body.eventDate : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1200) : "";

  if (!token) return json({ error: "Faça login para usar as sugestões." }, { status: 401 });
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return json({ error: "Informe uma data de evento válida." }, { status: 400 });
  if (!message) return json({ error: "Descreva o que o cliente precisa para receber sugestões." }, { status: 400 });
  if (!supabaseUrl || !supabaseKey) return json({ error: "Configuração indisponível." }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([
    supabase.auth.getUser(token), supabase.rpc("is_admin"),
  ]);
  if (userError || !userData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  if (adminError || !isAdmin) return json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });

  const [{ data: products, error: productsError }, { data: availability, error: availabilityError }] = await Promise.all([
    supabase.from("products").select("id, name, slug, description, category, event_type, search_keywords, price, image_url, stock_quantity").eq("active", true).order("name"),
    supabase.rpc("get_product_availability", { p_event_date: eventDate }),
  ]);
  if (productsError || availabilityError) return json({ error: productsError?.message ?? availabilityError?.message ?? "Não foi possível consultar o catálogo." }, { status: 500 });

  const availabilityByProduct = new Map(((availability ?? []) as Availability[]).map((item) => [item.product_id, Number(item.available_quantity ?? 0)]));
  const availableProducts = ((products ?? []) as Product[])
    .map((product) => ({ ...product, available: availabilityByProduct.get(product.id) ?? Number(product.stock_quantity ?? 0) }))
    .filter((product) => product.available > 0);
  const terms = termsFrom(message);
  const guestCount = Number(normalize(message).match(/\b(\d{1,4})\s*(pessoas|convidados?)\b/)?.[1] ?? 0);

  const ranked = availableProducts
    .map((product) => {
      const searchable = normalize([product.name, product.category, product.description, ...(product.event_type ?? []), ...(product.search_keywords ?? [])].filter(Boolean).join(" "));
      const matchingTerms = terms.filter((term) => searchable.includes(term));
      let score = matchingTerms.length * 10;
      if (guestCount > 0 && /(cadeira|mesa)/i.test(product.name)) score += 3;
      if (guestCount > 0 && product.available >= Math.min(guestCount, 10)) score += 1;
      return { product, matchingTerms, score };
    })
    .sort((a, b) => b.score - a.score || b.product.available - a.product.available || a.product.name.localeCompare(b.product.name, "pt-BR"));

  const hasMatches = ranked.some((item) => item.matchingTerms.length > 0);
  const suggestions = ranked.slice(0, 5).map(({ product, matchingTerms }) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price ?? 0),
    imageUrl: product.image_url,
    available: product.available,
    suggestedQuantity: guestCount > 0 && /cadeira/i.test(product.name) ? Math.min(guestCount, product.available) : 1,
    reason: matchingTerms.length ? `Relacionado a: ${matchingTerms.join(", ")}.` : guestCount > 0 && /(cadeira|mesa)/i.test(product.name) ? `Item útil para atender ${guestCount} pessoas.` : "Disponível para a data escolhida.",
  }));

  return json({
    message: hasMatches ? "Sugestões encontradas pelos termos do pedido e pela disponibilidade." : "Não encontrei o tema exato; estes são os itens disponíveis que podem compor a locação.",
    suggestions,
  });
}
