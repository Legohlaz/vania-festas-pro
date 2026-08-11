import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders, ...init?.headers } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const body = await request.json().catch(() => null) as { reservationId?: number } | null;
  const reservationId = body?.reservationId;

  if (!token) return json({ error: "Faça login para confirmar a reserva." }, { status: 401 });
  if (!Number.isInteger(reservationId) || !reservationId || reservationId < 1) return json({ error: "Reserva inválida." }, { status: 400 });
  if (!supabaseUrl || !supabaseKey) return json({ error: "Configuração indisponível." }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([supabase.auth.getUser(token), supabase.rpc("is_admin")]);
  if (userError || !userData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  if (adminError || !isAdmin) return json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", reservationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 500 });
  if (!reservation) return json({ error: "A reserva não está pendente ou não foi encontrada." }, { status: 409 });

  return json({ reservationId: reservation.id, status: "confirmed" });
}
