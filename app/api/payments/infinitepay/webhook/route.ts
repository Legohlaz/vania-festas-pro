import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

type InfinitePayNotification = { invoice_slug?: string; capture_method?: "pix" | "credit_card" | string; transaction_nsu?: string; order_nsu?: string };
type InfinitePayPaymentCheck = { success?: boolean; paid?: boolean; amount?: number; capture_method?: "pix" | "credit_card" | string };

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "");
  if (!handle || !process.env.SUPABASE_SERVICE_ROLE_KEY) return error("Webhook não configurado.", 503);

  const notification = (await request.json().catch(() => null)) as InfinitePayNotification | null;
  const externalReference = notification?.order_nsu?.trim();
  const transactionNsu = notification?.transaction_nsu?.trim();
  const invoiceSlug = notification?.invoice_slug?.trim();
  if (!externalReference || !transactionNsu || !invoiceSlug) return error("Notificação inválida.", 400);

  const service = createServiceClient();
  const { data: attempt, error: attemptError } = await service
    .from("online_payment_attempts")
    .select("id,reservation_id,amount,provider_invoice_slug")
    .eq("provider", "infinitepay")
    .eq("external_reference", externalReference)
    .maybeSingle();
  if (attemptError) return error("Não foi possível localizar o pagamento.", 500);
  if (!attempt) return NextResponse.json({ ok: true });
  if (attempt.provider_invoice_slug && attempt.provider_invoice_slug !== invoiceSlug) return error("Pagamento não corresponde à reserva.", 409);

  const verificationResponse = await fetch("https://api.checkout.infinitepay.io/payment_check", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, order_nsu: externalReference, transaction_nsu: transactionNsu, slug: invoiceSlug }), cache: "no-store",
  });
  const verification = await verificationResponse.json().catch(() => null) as InfinitePayPaymentCheck | null;
  if (!verificationResponse.ok || !verification?.success) return error("Não foi possível validar o pagamento com a InfinitePay.", 502);
  if (!verification.paid) return error("O pagamento ainda não foi aprovado.", 409);
  if (Number(verification.amount) !== Math.round(Number(attempt.amount) * 100)) return error("Valor do pagamento não corresponde à reserva.", 409);

  const paymentMethod = verification.capture_method === "pix" ? "pix" : "card";
  await service.from("online_payment_attempts").update({ provider_payment_id: transactionNsu, preference_id: invoiceSlug, provider_invoice_slug: invoiceSlug, status: "approved", payment_method: paymentMethod }).eq("id", attempt.id);
  const { error: registerError } = await service.from("reservation_payments").upsert({
    reservation_id: attempt.reservation_id, amount: Number(attempt.amount), payment_method: paymentMethod, provider_payment_id: transactionNsu,
    notes: `Pagamento online via InfinitePay (${paymentMethod === "pix" ? "Pix" : "cartão"}; #${transactionNsu}).`,
  }, { onConflict: "provider_payment_id", ignoreDuplicates: true });
  if (registerError) return error("Não foi possível registrar o pagamento.", 500);
  return NextResponse.json({ ok: true });
}
