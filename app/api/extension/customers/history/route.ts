import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders, ...init?.headers } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const phone = request.nextUrl.searchParams.get("phone")?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token) return json({ error: "Faça login para consultar o histórico." }, { status: 401 });
  if (!phone) return json({ reservations: [] });
  if (!supabaseUrl || !supabaseKey) return json({ error: "Configuração indisponível." }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([supabase.auth.getUser(token), supabase.rpc("is_admin")]);
  if (userError || !userData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  if (adminError || !isAdmin) return json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });

  const { data, error } = await supabase
    .from("reservations")
    .select("id, event_date, event_address, status")
    .eq("customer_phone", phone)
    .order("event_date", { ascending: false })
    .limit(5);
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ reservations: data ?? [] });
}
