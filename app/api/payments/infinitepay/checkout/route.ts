import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ReservationItem = {
  quantity: number | null;
  unit_price: number | null;
  products: { name: string | null } | { name: string | null }[] | null;
};

type Reservation = {
  id: number;
  customer_id: number;
  status: string;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: ReservationItem[] | null;
};

type InfinitePayCheckout = { url?: string; slug?: string; invoice_slug?: string; message?: string; detail?: string };

function productName(item: ReservationItem) {
  const product = Array.isArray(item.products) ? item.products[0] : item.products;
  return product?.name ?? "Item da reserva";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  if (!handle || !process.env.SUPABASE_SERVICE_ROLE_KEY) return jsonError("O pagamento online ainda não foi configurado pela Vânia Festas.", 503);
  if (!appUrl.startsWith("https://")) return jsonError("O pagamento online precisa de um endereço HTTPS configurado.", 503);

  const body = (await request.json().catch(() => null)) as { reservationId?: unknown } | null;
  const reservationId = Number(body?.reservationId);
  if (!Number.isInteger(reservationId) || reservationId < 1) return jsonError("Reserva inválida.", 400);

  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonError("Sua sessão expirou. Entre novamente.", 401);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id,name,email,phone,approval_status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (customerError || !customer || customer.approval_status !== "approved") return jsonError("Seu cadastro precisa estar aprovado para pagar uma reserva.", 403);

  const { data, error: reservationError } = await supabase
    .from("reservations")
    .select("id,customer_id,status,service_fee,amount_paid,reservation_items(quantity,unit_price,products(name))")
    .eq("id", reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (reservationError || !data) return jsonError("Reserva não encontrada.", 404);

  const reservation = data as Reservation;
  if (reservation.status !== "confirmed") return jsonError("Esta reserva ainda precisa ser confirmada antes do pagamento.", 409);

  const itemsTotal = (reservation.reservation_items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
  const total = itemsTotal + Number(reservation.service_fee ?? 0);
  const remaining = Number((total - Number(reservation.amount_paid ?? 0)).toFixed(2));
  if (remaining <= 0) return jsonError("Esta reserva já está quitada.", 409);

  const externalReference = `VF-R${reservation.id}-${randomUUID()}`;
  const service = createServiceClient();
  const { error: attemptError } = await service.from("online_payment_attempts").insert({
    reservation_id: reservation.id, customer_id: customer.id, provider: "infinitepay", external_reference: externalReference, amount: remaining, status: "pending",
  });
  if (attemptError) return jsonError("Não foi possível preparar o pagamento. Tente novamente.", 500);

  const items = (reservation.reservation_items ?? []).map((item) => ({
    description: `${Number(item.quantity ?? 0)}x ${productName(item)}`,
    quantity: 1,
    price: Math.round(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) * 100),
  }));
  if (Number(reservation.service_fee ?? 0) > 0) items.push({ description: "Entrega e montagem", quantity: 1, price: Math.round(Number(reservation.service_fee) * 100) });

  const checkoutResponse = await fetch("https://api.checkout.infinitepay.io/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle, items, order_nsu: externalReference,
      redirect_url: `${appUrl}/pagamento/resultado?resultado=sucesso`,
      webhook_url: `${appUrl}/api/payments/infinitepay/webhook`,
      customer: { name: customer.name, email: customer.email ?? user.email ?? undefined, phone_number: customer.phone?.replace(/\D/g, "") || undefined },
    }),
  });
  const checkout = await checkoutResponse.json().catch(() => null) as InfinitePayCheckout | null;
  const checkoutUrl = checkout?.url;
  const invoiceSlug = checkout?.slug ?? checkout?.invoice_slug;
  if (!checkoutResponse.ok || !checkoutUrl || !invoiceSlug) {
    await service.from("online_payment_attempts").update({ status: "error" }).eq("external_reference", externalReference);
    return jsonError(checkout?.message ?? checkout?.detail ?? "Não foi possível abrir o checkout. Tente novamente.", 502);
  }
  await service.from("online_payment_attempts").update({ preference_id: invoiceSlug, provider_invoice_slug: invoiceSlug, checkout_url: checkoutUrl }).eq("external_reference", externalReference);
  return NextResponse.json({ checkoutUrl });
}
