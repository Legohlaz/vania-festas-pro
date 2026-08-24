"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, Package, Phone, Printer, Truck, UserRound } from "lucide-react";

import { DeleteReservationButton } from "@/components/admin/DeleteReservationButton";
import { CopyReservationSummaryButton } from "@/components/admin/CopyReservationSummaryButton";
import { ReservationActions } from "@/components/admin/ReservationActions";
import { ReservationLogisticsChecklist } from "@/components/admin/ReservationLogisticsChecklist";
import { ReservationPayments } from "@/components/admin/ReservationPayments";
import { ReservationReturnCheck } from "@/components/admin/ReservationReturnCheck";
import { ReservationQrScanner } from "@/components/admin/ReservationQrScanner";
import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  status: string;
  notes: string | null;
  event_address: string | null;
  service_fee: number | null;
  amount_paid: number | null;
  logistics_status: "scheduled" | "preparing" | "delivered" | "returned" | null;
};

type ReservationItem = {
  id: number;
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  product_slug: string | null;
};

type ReservationItemRow = {
  id: number;
  product_id: number | null;
  quantity: number | null;
  unit_price: number | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function statusStyle(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (status === "cancelled") return "bg-red-100 text-red-700 ring-red-200";
  return "bg-amber-100 text-amber-800 ring-amber-200";
}

function statusLabel(status: string) {
  return ({ pending: "Pendente", confirmed: "Confirmada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;
}

function paymentStatus(total: number, amountPaid: number) {
  if (total > 0 && amountPaid >= total) return { label: "Quitada", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
  if (amountPaid > 0) return { label: "Sinal recebido", style: "bg-sky-100 text-sky-800 ring-sky-200" };
  return { label: "Sem pagamento", style: "bg-slate-100 text-slate-700 ring-slate-200" };
}

const logisticsOptions = [
  { value: "scheduled", label: "Agendada" },
  { value: "preparing", label: "Em preparação" },
  { value: "delivered", label: "Entregue / montada" },
  { value: "returned", label: "Finalizada / devolvida" },
] as const;

export default function ReservationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [eventAddress, setEventAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [logisticsUpdating, setLogisticsUpdating] = useState(false);

  useEffect(() => {
    async function loadReservation() {
      const reservationId = Number(id);
      if (!Number.isInteger(reservationId)) {
        setErrorMessage("Reserva inválida.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const [reservationResult, itemsResult] = await Promise.all([
        supabase
          .from("reservations")
          .select("id, customer_name, customer_phone, event_date, status, notes, event_address, service_fee, amount_paid, logistics_status")
          .eq("id", reservationId)
          .single(),
        supabase
          .from("reservation_items")
          .select("id, product_id, quantity, unit_price")
          .eq("reservation_id", reservationId),
      ]);

      const reservationsResult = reservationResult;

      if (reservationResult.error || itemsResult.error) {
        setErrorMessage(reservationsResult.error?.message ?? itemsResult.error?.message ?? "Não foi possível carregar a reserva.");
      } else {
        const reservationData = reservationResult.data as Reservation;
        const itemRows = (itemsResult.data ?? []) as ReservationItemRow[];
        const productIds = [...new Set(itemRows.map((item) => item.product_id).filter((productId): productId is number => productId !== null))];
        const productsResult = productIds.length
          ? await supabase.from("products").select("id, name, slug").in("id", productIds)
          : { data: [], error: null };

        if (productsResult.error) {
          setErrorMessage(productsResult.error.message);
        } else {
          const productsById = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
          setReservation(reservationData);
          setItems(itemRows.map((item) => {
            const product = item.product_id ? productsById.get(item.product_id) : null;
            return { ...item, product_name: product?.name ?? null, product_slug: product?.slug ?? null };
          }));
          setEventAddress(reservationData.event_address ?? null);
        }
      }
      setLoading(false);
    }

    loadReservation();
  }, [id]);

  const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
  const serviceFee = Number(reservation?.service_fee ?? 0);
  const total = itemsTotal + serviceFee;
  const amountPaid = Number(reservation?.amount_paid ?? 0);
  const balance = Math.max(total - amountPaid, 0);
  const payment = paymentStatus(total, amountPaid);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const logisticsStatus = reservation?.logistics_status ?? "scheduled";

  async function updateLogisticsStatus(
    nextStatus: (typeof logisticsOptions)[number]["value"]
  ) {
    if (!reservation || logisticsUpdating || nextStatus === logisticsStatus) {
      return;
    }

    setLogisticsUpdating(true);
    setErrorMessage("");

    const { error } = await createClient()
      .from("reservations")
      .update({ logistics_status: nextStatus })
      .eq("id", reservation.id);

    if (error) {
      setErrorMessage(`Não foi possível atualizar a logística: ${error.message}`);
    } else {
      setReservation({ ...reservation, logistics_status: nextStatus });
    }

    setLogisticsUpdating(false);
  }

  if (loading) {
    return <main className="flex min-h-[70vh] items-center justify-center text-sm font-medium text-slate-500">Carregando reserva...</main>;
  }

  if (!reservation) {
    return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center"><p className="font-semibold text-slate-700">{errorMessage || "Reserva não encontrada."}</p><Link href="/admin/reservas" className="text-sm font-bold text-emerald-700">Voltar para reservas</Link></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="w-full max-w-none px-5 py-8 sm:px-8 lg:px-10">
        <Link href="/admin/reservas" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> Voltar para reservas
        </Link>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Detalhes da reserva</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Reserva #{reservation.id}</h1>
                <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${statusStyle(reservation.status)}`}>{statusLabel(reservation.status)}</span><span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${payment.style}`}>{payment.label}</span></div>
              </div>
              <p className="mt-2 text-sm text-slate-500">Criada para {reservation.customer_name} · Evento em {formatDate(reservation.event_date)}</p>
            </div>
              <div className="no-print flex flex-wrap items-center gap-3"><Link href={`/admin/reservas/${reservation.id}/orcamento`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"><FileText className="h-4 w-4" />Gerar orçamento</Link><Link href={`/admin/reservas/${reservation.id}/contrato`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-700 px-5 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-50"><FileText className="h-4 w-4" />Gerar contrato</Link><button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"><Printer className="h-4 w-4" />Imprimir</button><CopyReservationSummaryButton customerName={reservation.customer_name} eventDate={reservation.event_date} eventAddress={eventAddress} notes={reservation.notes} serviceFee={serviceFee} amountPaid={amountPaid} items={items} /><Link href={`/admin/reservas/${reservation.id}/editar`} className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900">Editar reserva</Link></div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><UserRound className="h-5 w-5" /></span><h2 className="font-bold text-slate-900">Cliente</h2></div>
                <p className="mt-5 text-lg font-black text-slate-900">{reservation.customer_name}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{reservation.customer_phone}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><CalendarDays className="h-5 w-5" /></span><h2 className="font-bold text-slate-900">Evento</h2></div>
                <p className="mt-5 text-lg font-black text-slate-900">{formatDate(reservation.event_date)}</p>
                <p className="mt-2 text-sm text-slate-500">{eventAddress || "Endereço do evento ainda não informado"}</p>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><FileText className="h-5 w-5" /></span><h2 className="font-bold text-slate-900">Observações</h2></div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{reservation.notes || "Nenhuma observação adicionada."}</p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Package className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Itens da reserva</h2><p className="text-sm text-slate-500">{items.length} {items.length === 1 ? "produto" : "produtos"} · {totalQuantity} unidades</p></div></div></div>
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Produto</th><th className="px-5 py-3 text-center">Qtd.</th><th className="px-5 py-3 text-right">Unitário</th><th className="px-5 py-3 text-right">Subtotal</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item, index) => { const subtotal = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0); return <tr key={`${item.product_id ?? "produto"}-${index}`}><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.product_name || "Produto indisponível"}</p><p className="mt-1 text-xs text-slate-400">Código #{item.product_id ?? "—"}</p></td><td className="px-5 py-4 text-center font-semibold text-slate-700">{item.quantity ?? 0}</td><td className="px-5 py-4 text-right text-slate-600">{currency.format(item.unit_price ?? 0)}</td><td className="px-5 py-4 text-right font-bold text-slate-900">{currency.format(subtotal)}</td></tr>; })}</tbody></table></div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {reservation.status !== "cancelled" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-sky-50 p-2 text-sky-700">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-900">Logística da locação</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Acompanhe a preparação, entrega e devolução.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {logisticsOptions.filter((option) => option.value !== "returned").map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={logisticsUpdating || logisticsStatus === option.value}
                      onClick={() => updateLogisticsStatus(option.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition disabled:cursor-default ${logisticsStatus === option.value ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {reservation.status !== "cancelled" && (
              <ReservationQrScanner
                reservationId={reservation.id}
                initialStage={logisticsStatus === "scheduled" ? "preparing" : logisticsStatus === "preparing" ? "delivered" : "returned"}
                items={items.filter((item): item is ReservationItem & { product_id: number; product_name: string } => item.product_id !== null && item.product_name !== null).map((item) => ({ id: item.id, product_id: item.product_id, product_name: item.product_name, product_slug: item.product_slug, quantity: Number(item.quantity ?? 0) }))}
              />
            )}
            {reservation.status !== "cancelled" && <ReservationLogisticsChecklist reservationId={reservation.id} />}
            {reservation.status !== "cancelled" && (logisticsStatus === "delivered" || logisticsStatus === "returned") && <ReservationReturnCheck reservationId={reservation.id} logisticsStatus={logisticsStatus} onFinished={() => setReservation((current) => current ? { ...current, logistics_status: "returned" } : current)} />}
            {reservation.status !== "cancelled" && <ReservationPayments reservationId={reservation.id} onTotalChange={(nextAmountPaid) => setReservation({ ...reservation, amount_paid: nextAmountPaid })} />}
            <section className="rounded-2xl bg-emerald-800 p-6 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">Resumo financeiro</p><p className="mt-5 text-sm text-emerald-100">Total da reserva</p><p className="mt-1 text-4xl font-black tracking-tight">{currency.format(total)}</p>{serviceFee > 0 && <p className="mt-2 text-sm text-emerald-100">Itens: {currency.format(itemsTotal)} · Entrega/montagem: {currency.format(serviceFee)}</p>}<div className="mt-5 grid grid-cols-2 gap-3 border-t border-emerald-700 pt-5 text-sm"><div><p className="text-emerald-100">Recebido</p><p className="mt-1 text-lg font-bold">{currency.format(amountPaid)}</p></div><div><p className="text-emerald-100">Saldo restante</p><p className="mt-1 text-lg font-bold">{currency.format(balance)}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-emerald-700 pt-5 text-sm"><div><p className="text-emerald-100">Produtos</p><p className="mt-1 text-lg font-bold">{items.length}</p></div><div><p className="text-emerald-100">Unidades</p><p className="mt-1 text-lg font-bold">{totalQuantity}</p></div></div></section>
            {reservation.status !== "cancelled" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Ações da reserva</h2><ReservationActions reservationId={reservation.id} status={reservation.status} /></section>}
            {reservation.status === "cancelled" && <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Reserva cancelada</h2><p className="mt-2 text-sm leading-6 text-slate-500">Esta reserva não usa mais o estoque. Você pode excluí-la definitivamente quando não precisar manter o histórico.</p><DeleteReservationButton reservationId={reservation.id} /></section>}
          </aside>
        </div>
      </div>
    </main>
  );
}
