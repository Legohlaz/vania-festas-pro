"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  notes: string | null;
  event_address: string | null;
  service_fee: number | null;
};

type ReservationItem = {
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

type ReservationItemRow = Omit<ReservationItem, "product_name">;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export default function ReservationQuotePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadQuote() {
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
          .select("id, customer_name, customer_phone, event_date, notes, event_address, service_fee")
          .eq("id", reservationId)
          .single(),
        supabase
          .from("reservation_items")
          .select("product_id, quantity, unit_price")
          .eq("reservation_id", reservationId),
      ]);

      if (reservationResult.error || itemsResult.error) {
        setErrorMessage(
          reservationResult.error?.message ??
            itemsResult.error?.message ??
            "Não foi possível carregar o orçamento."
        );
        setLoading(false);
        return;
      }

      const itemRows = (itemsResult.data ?? []) as ReservationItemRow[];
      const productIds = [...new Set(itemRows.map((item) => item.product_id).filter((productId): productId is number => productId !== null))];
      const productsResult = productIds.length
        ? await supabase.from("products").select("id, name").in("id", productIds)
        : { data: [], error: null };

      if (productsResult.error) {
        setErrorMessage(productsResult.error.message);
      } else {
        const productNames = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
        setReservation(reservationResult.data as Reservation);
        setItems(itemRows.map((item) => ({ ...item, product_name: item.product_id ? productNames.get(item.product_id) ?? null : null })));
      }

      setLoading(false);
    }

    loadQuote();
  }, [id]);

  const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
  const serviceFee = Number(reservation?.service_fee ?? 0);
  const total = itemsTotal + serviceFee;

  if (loading) {
    return <main className="flex min-h-[70vh] items-center justify-center text-sm font-medium text-slate-500">Preparando orçamento...</main>;
  }

  if (!reservation) {
    return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center"><p className="font-semibold text-slate-700">{errorMessage || "Reserva não encontrada."}</p><Link href="/admin/reservas" className="text-sm font-bold text-emerald-700">Voltar para reservas</Link></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0 sm:px-8">
      <div className="no-print mx-auto mb-5 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/reservas/${reservation.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Voltar para reserva</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"><Download className="h-4 w-4" /> Salvar como PDF</button>
      </div>

      <article className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-7 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-10">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-7">
          <div><p className="text-2xl font-black tracking-tight text-emerald-900">Vânia Festas <span className="text-sm font-bold text-emerald-700">Pro</span></p><p className="mt-2 text-sm text-slate-500">Locação, decoração e montagem para eventos</p></div>
          <div className="text-right"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Orçamento</p><p className="mt-2 text-lg font-black text-slate-900">#{reservation.id}</p><p className="mt-1 text-sm text-slate-500">Emitido em {new Intl.DateTimeFormat("pt-BR").format(new Date())}</p></div>
        </header>

        <section className="grid gap-6 border-b border-slate-100 py-7 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cliente</p><p className="mt-2 text-lg font-black text-slate-900">{reservation.customer_name}</p><p className="mt-1 text-sm text-slate-600">{reservation.customer_phone}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evento</p><p className="mt-2 text-lg font-black text-slate-900">{formatDate(reservation.event_date)}</p><p className="mt-1 text-sm text-slate-600">{reservation.event_address || "Endereço a combinar"}</p></div>
        </section>

        <section className="py-7">
          <h1 className="text-2xl font-black text-slate-900">Itens do orçamento</h1>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-center">Qtd.</th><th className="px-4 py-3 text-right">Unitário</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item, index) => { const subtotal = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0); return <tr key={`${item.product_id ?? "produto"}-${index}`}><td className="px-4 py-4 font-bold text-slate-800">{item.product_name || "Produto"}</td><td className="px-4 py-4 text-center text-slate-700">{item.quantity ?? 0}</td><td className="px-4 py-4 text-right text-slate-600">{currency.format(Number(item.unit_price ?? 0))}</td><td className="px-4 py-4 text-right font-bold text-slate-900">{currency.format(subtotal)}</td></tr>; })}</tbody></table></div>
          <div className="ml-auto mt-6 max-w-xs space-y-3 rounded-2xl bg-emerald-800 p-5 text-white"><div className="flex justify-between gap-5 text-sm text-emerald-100"><span>Itens</span><span>{currency.format(itemsTotal)}</span></div>{serviceFee > 0 && <div className="flex justify-between gap-5 text-sm text-emerald-100"><span>Entrega / montagem</span><span>{currency.format(serviceFee)}</span></div>}<div className="flex justify-between gap-5 border-t border-emerald-700 pt-3 text-lg font-black"><span>Total</span><span>{currency.format(total)}</span></div></div>
        </section>

        {reservation.notes && <section className="border-t border-slate-100 pt-6"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Observações</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{reservation.notes}</p></section>}
        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">Este orçamento está sujeito à confirmação de disponibilidade e condições de locação. Obrigada por escolher a Vânia Festas Pro.</footer>
      </article>
    </main>
  );
}
