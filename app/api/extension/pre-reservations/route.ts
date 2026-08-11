import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

type ItemInput = { productId: number; quantity: number; unitPrice: number };
type Availability = { product_id: number; available_quantity: number | null };

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
  if (!token) return json({ error: "Faça login para salvar a pré-reserva." }, { status: 401 });
  if (!supabaseUrl || !supabaseKey) return json({ error: "Configuração indisponível." }, { status: 500 });

  const body = await request.json().catch(() => null) as { customerName?: string; customerPhone?: string; address?: string; eventAddress?: string; notes?: string; serviceFee?: number; eventDate?: string; items?: ItemInput[] } | null;
  const customerName = body?.customerName?.trim();
  const customerPhone = body?.customerPhone?.trim();
  const address = body?.address?.trim();
  const eventAddress = body?.eventAddress?.trim() || address;
  const notes = body?.notes?.trim().slice(0, 1500) || "";
  const serviceFee = Number(body?.serviceFee ?? 0);
  const eventDate = body?.eventDate;
  const items = body?.items;
  if (!customerName || !customerPhone || !address || !eventAddress || !eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !items?.length) {
    return json({ error: "Informe cliente, telefone, endereço, data e ao menos um produto." }, { status: 400 });
  }
  if (!Number.isFinite(serviceFee) || serviceFee < 0 || items.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
    return json({ error: "Os itens informados são inválidos." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([supabase.auth.getUser(token), supabase.rpc("is_admin")]);
  if (userError || !userData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  if (adminError || !isAdmin) return json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });

  const { data: availability, error: availabilityError } = await supabase.rpc("get_product_availability", { p_event_date: eventDate });
  if (availabilityError) return json({ error: availabilityError.message }, { status: 500 });
  const availabilityByProduct = new Map(((availability ?? []) as Availability[]).map((item) => [item.product_id, Number(item.available_quantity ?? 0)]));
  const unavailable = items.find((item) => item.quantity > (availabilityByProduct.get(item.productId) ?? 0));
  if (unavailable) return json({ error: "Um dos produtos não possui mais a quantidade selecionada para essa data." }, { status: 409 });

  const normalizedPhone = customerPhone.replace(/\D/g, "");
  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", customerPhone)
    .limit(1)
    .maybeSingle();
  if (customerLookupError) return json({ error: customerLookupError.message }, { status: 500 });

  let customerId = existingCustomer?.id as number | undefined;
  if (!customerId) {
    const { data: createdCustomer, error: customerCreateError } = await supabase
      .from("customers")
      .insert({ name: customerName, phone: customerPhone, address, notes: `Cliente criado pelo atendimento no WhatsApp (${normalizedPhone}).` })
      .select("id")
      .single();
    if (customerCreateError || !createdCustomer) return json({ error: customerCreateError?.message ?? "Não foi possível cadastrar o cliente." }, { status: 500 });
    customerId = createdCustomer.id as number;
  } else {
    const { error: customerUpdateError } = await supabase.from("customers").update({ name: customerName, address }).eq("id", customerId);
    if (customerUpdateError) return json({ error: customerUpdateError.message }, { status: 500 });
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({ customer_id: customerId, customer_name: customerName, customer_phone: customerPhone, event_date: eventDate, event_address: eventAddress, service_fee: serviceFee, status: "pending", notes: notes ? `Pré-reserva criada pelo atendimento no WhatsApp.\n\nDetalhes do pedido: ${notes}` : "Pré-reserva criada pelo atendimento no WhatsApp." })
    .select("id")
    .single();
  if (reservationError || !reservation) return json({ error: reservationError?.message ?? "Não foi possível criar a pré-reserva." }, { status: 500 });

  const { error: itemsError } = await supabase.from("reservation_items").insert(items.map((item) => ({ reservation_id: reservation.id, product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice })));
  if (itemsError) {
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return json({ error: itemsError.message }, { status: 500 });
  }

  return json({ reservationId: reservation.id });
}
