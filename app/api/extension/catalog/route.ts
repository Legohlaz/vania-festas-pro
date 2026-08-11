import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

type Product = { id: number; name: string; slug: string; price: number | string | null; image_url: string | null; stock_quantity: number | null };
type Availability = { product_id: number; available_quantity: number | null };

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders, ...init?.headers } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const eventDate = request.nextUrl.searchParams.get("date");
  const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token) return json({ error: "Faça login para consultar o catálogo." }, { status: 401 });
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return json({ error: "Informe uma data de evento válida." }, { status: 400 });
  if (!supabaseUrl || !supabaseKey) return json({ error: "Configuração indisponível." }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([
    supabase.auth.getUser(token),
    supabase.rpc("is_admin"),
  ]);
  if (userError || !userData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  if (adminError || !isAdmin) return json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });

  const [{ data: products, error: productsError }, { data: availability, error: availabilityError }] = await Promise.all([
    supabase.from("products").select("id, name, slug, price, image_url, stock_quantity").eq("active", true).order("name"),
    supabase.rpc("get_product_availability", { p_event_date: eventDate }),
  ]);
  if (productsError || availabilityError) return json({ error: productsError?.message ?? availabilityError?.message ?? "Não foi possível consultar o catálogo." }, { status: 500 });

  const availabilityByProduct = new Map(((availability ?? []) as Availability[]).map((item) => [item.product_id, Number(item.available_quantity ?? 0)]));
  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const visibleProducts = ((products ?? []) as Product[])
    .filter((product) => product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    .map((product) => ({ id: product.id, name: product.name, slug: product.slug, price: Number(product.price ?? 0), imageUrl: product.image_url, available: availabilityByProduct.get(product.id) ?? Number(product.stock_quantity ?? 0) }));

  return json({ products: visibleProducts });
}
