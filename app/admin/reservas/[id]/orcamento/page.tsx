"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, FileText, MapPin, Phone, Printer } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  notes: string | null;
  event_address: string | null;
  service_fee: number | null;
  amount_paid: number | null;
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
          .select("id, customer_name, customer_phone, event_date, notes, event_address, service_fee, amount_paid")
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
            "Não foi possível carregar o orçamento.",
        );
        setLoading(false);
        return;
      }

      const itemRows = (itemsResult.data ?? []) as ReservationItemRow[];
      const productIds = [
        ...new Set(
          itemRows
            .map((item) => item.product_id)
            .filter((productId): productId is number => productId !== null),
        ),
      ];
      const productsResult = productIds.length
        ? await supabase.from("products").select("id, name").in("id", productIds)
        : { data: [], error: null };

      if (productsResult.error) {
        setErrorMessage(productsResult.error.message);
      } else {
        const productNames = new Map(
          (productsResult.data ?? []).map((product) => [product.id, product.name]),
        );
        setReservation(reservationResult.data as Reservation);
        setItems(
          itemRows.map((item) => ({
            ...item,
            product_name: item.product_id
              ? productNames.get(item.product_id) ?? null
              : null,
          })),
        );
      }

      setLoading(false);
    }

    loadQuote();
  }, [id]);

  const { itemsTotal, serviceFee, amountPaid, total, balance, totalQuantity } = useMemo(() => {
    const currentItemsTotal = items.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
      0,
    );
    const currentServiceFee = Number(reservation?.service_fee ?? 0);
    const currentAmountPaid = Number(reservation?.amount_paid ?? 0);
    const currentTotal = currentItemsTotal + currentServiceFee;

    return {
      itemsTotal: currentItemsTotal,
      serviceFee: currentServiceFee,
      amountPaid: currentAmountPaid,
      total: currentTotal,
      balance: Math.max(currentTotal - currentAmountPaid, 0),
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    };
  }, [items, reservation]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-sm font-medium text-slate-500">
        Preparando orçamento...
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-semibold text-slate-700">{errorMessage || "Reserva não encontrada."}</p>
        <Link href="/admin/reservas" className="text-sm font-bold text-emerald-700">
          Voltar para reservas
        </Link>
      </main>
    );
  }

  const issueDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0 sm:px-8">
      <div className="no-print mx-auto mb-5 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/reservas/${reservation.id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para reserva
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">Na próxima tela, escolha “Salvar como PDF”.</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            <Download className="h-4 w-4" /> Baixar orçamento em PDF
          </button>
        </div>
      </div>

      <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-sm print:max-w-none print:rounded-none print:shadow-none">
        <header className="bg-emerald-900 px-7 py-8 text-white print:px-10 sm:px-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-800 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-50">
                <FileText className="h-3.5 w-3.5" /> Proposta de locação
              </div>
              <p className="mt-5 text-3xl font-black tracking-tight">Vânia Festas <span className="text-base font-bold text-emerald-300">Pro</span></p>
              <p className="mt-2 max-w-md text-sm leading-6 text-emerald-100">Locação, decoração e montagem para transformar o seu evento.</p>
            </div>
            <div className="rounded-2xl border border-emerald-700 bg-emerald-800/80 px-5 py-4 sm:min-w-48 sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Orçamento</p>
              <p className="mt-1 text-3xl font-black">#{reservation.id}</p>
              <p className="mt-3 text-xs text-emerald-100">Emitido em {issueDate}</p>
            </div>
          </div>
        </header>

        <div className="p-7 print:p-10 sm:p-10">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cliente</p>
              <p className="mt-3 text-xl font-black text-slate-900">{reservation.customer_name || "Cliente não informado"}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-emerald-700" /> {reservation.customer_phone || "Telefone não informado"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Evento</p>
              <p className="mt-3 flex items-center gap-2 text-xl font-black text-slate-900"><CalendarDays className="h-5 w-5 text-emerald-700" /> {formatDate(reservation.event_date)}</p>
              <p className="mt-2 flex items-start gap-2 text-sm leading-5 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> {reservation.event_address || "Endereço a combinar"}</p>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Resumo da proposta</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900">Itens para o seu evento</h1>
              </div>
              <p className="text-sm font-semibold text-slate-500">{items.length} {items.length === 1 ? "produto" : "produtos"} · {totalQuantity} unidades</p>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Item</th>
                    <th className="px-3 py-3 text-center sm:px-4">Qtd.</th>
                    <th className="hidden px-4 py-3 text-right sm:table-cell">Unitário</th>
                    <th className="px-4 py-3 text-right sm:px-5">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const subtotal = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0);

                    return (
                      <tr key={`${item.product_id ?? "produto"}-${index}`}>
                        <td className="px-4 py-4 sm:px-5">
                          <p className="font-bold text-slate-800">{item.product_name || "Produto"}</p>
                          <p className="mt-1 text-xs text-slate-400 sm:hidden">{currency.format(Number(item.unit_price ?? 0))} por unidade</p>
                        </td>
                        <td className="px-3 py-4 text-center font-semibold text-slate-700 sm:px-4">{item.quantity ?? 0}</td>
                        <td className="hidden px-4 py-4 text-right text-slate-600 sm:table-cell">{currency.format(Number(item.unit_price ?? 0))}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900 sm:px-5">{currency.format(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-7 grid gap-6 sm:grid-cols-[1fr_280px] sm:items-start">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <p className="font-black">Informações importantes</p>
              <ul className="mt-2 space-y-1.5 text-amber-900">
                <li>• Valores e disponibilidade serão confirmados no momento da reserva.</li>
                <li>• Entrega e montagem, quando informadas, já estão incluídas no total.</li>
                <li>• Para confirmar, fale com a Vânia Festas pelo WhatsApp.</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-emerald-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Resumo financeiro</p>
              <div className="mt-4 space-y-2.5 text-sm text-emerald-100">
                <div className="flex justify-between gap-4"><span>Itens</span><span>{currency.format(itemsTotal)}</span></div>
                {serviceFee > 0 && <div className="flex justify-between gap-4"><span>Entrega / montagem</span><span>{currency.format(serviceFee)}</span></div>}
                {amountPaid > 0 && <div className="flex justify-between gap-4"><span>Valor já recebido</span><span>{currency.format(amountPaid)}</span></div>}
              </div>
              <div className="mt-4 border-t border-emerald-700 pt-4">
                <div className="flex justify-between gap-4 text-xl font-black"><span>Total</span><span>{currency.format(total)}</span></div>
                {amountPaid > 0 && <p className="mt-2 text-right text-sm font-bold text-amber-200">Saldo restante: {currency.format(balance)}</p>}
              </div>
            </div>
          </section>

          {reservation.notes && (
            <section className="mt-7 border-t border-slate-200 pt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Observações</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{reservation.notes}</p>
            </section>
          )}

          <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">
            Este orçamento é uma proposta comercial e está sujeito à confirmação de disponibilidade e às condições de locação. Obrigada por escolher a Vânia Festas Pro.
          </footer>
        </div>
      </article>

      <div className="no-print mx-auto mt-5 flex w-full max-w-4xl justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"
        >
          <Printer className="h-4 w-4" /> Imprimir proposta
        </button>
      </div>
    </main>
  );
}
