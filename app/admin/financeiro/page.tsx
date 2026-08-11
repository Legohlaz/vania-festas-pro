"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleDollarSign, Download, HandCoins, Search, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string | null;
  event_date: string;
  status: string;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: { quantity: number | null; unit_price: number | null }[] | null;
};

type PaymentFilter = "all" | "outstanding" | "paid";

type Payment = {
  id: number;
  reservation_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function reservationTotal(reservation: Reservation) {
  const itemsTotal = (reservation.reservation_items ?? []).reduce(
    (total, item) => total + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    0
  );
  return itemsTotal + Number(reservation.service_fee ?? 0);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function FinanceiroPage() {
  const initialRange = useMemo(() => {
    const today = new Date();
    return { start: toDateKey(today), end: toDateKey(addDays(today, 30)) };
  }, []);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadFinance() {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();
      const [reservationsResult, paymentsResult] = await Promise.all([
        supabase
          .from("reservations")
          .select("id, customer_name, event_date, status, service_fee, amount_paid, reservation_items(quantity, unit_price)")
          .gte("event_date", startDate)
          .lte("event_date", endDate)
          .neq("status", "cancelled")
          .order("event_date", { ascending: true }),
        supabase
          .from("reservation_payments")
          .select("id, reservation_id, amount, payment_date, payment_method")
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false })
          .order("id", { ascending: false }),
      ]);

      if (reservationsResult.error || paymentsResult.error) {
        setErrorMessage(reservationsResult.error?.message ?? paymentsResult.error?.message ?? "Não foi possível carregar os dados.");
      } else {
        setReservations((reservationsResult.data ?? []) as Reservation[]);
        setPayments((paymentsResult.data ?? []) as Payment[]);
      }
      setLoading(false);
    }

    loadFinance();
  }, [startDate, endDate]);

  const totals = useMemo(() => {
    const expected = reservations.reduce((total, reservation) => total + reservationTotal(reservation), 0);
    const receivedForReservations = reservations.reduce((total, reservation) => total + Number(reservation.amount_paid ?? 0), 0);
    const receivedInPeriod = payments.reduce((total, payment) => total + Number(payment.amount ?? 0), 0);
    return { expected, receivedForReservations, receivedInPeriod, balance: Math.max(expected - receivedForReservations, 0) };
  }, [payments, reservations]);

  const visibleReservations = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("pt-BR");

    return reservations.filter((reservation) => {
      const balance = Math.max(
        reservationTotal(reservation) - Number(reservation.amount_paid ?? 0),
        0
      );
      const matchesPayment =
        paymentFilter === "all" ||
        (paymentFilter === "outstanding" ? balance > 0 : balance === 0);
      const matchesSearch =
        !term ||
        reservation.id.toString().includes(term) ||
        (reservation.customer_name ?? "").toLocaleLowerCase("pt-BR").includes(term);

      return matchesPayment && matchesSearch;
    });
  }, [paymentFilter, reservations, searchTerm]);

  function downloadCsv() {
    const rows = [
      ["Reserva", "Cliente", "Data do evento", "Total", "Recebido", "Saldo"],
      ...visibleReservations.map((reservation) => {
        const total = reservationTotal(reservation);
        const received = Number(reservation.amount_paid ?? 0);
        return [
          `#${reservation.id}`,
          reservation.customer_name ?? "Cliente não informado",
          new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR"),
          total.toFixed(2).replace(".", ","),
          received.toFixed(2).replace(".", ","),
          Math.max(total - received, 0).toFixed(2).replace(".", ","),
        ];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"><WalletCards className="h-4 w-4" /> Financeiro</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Entradas e valores a receber</h1>
            <p className="mt-2 text-sm text-slate-500">Acompanhe os valores das reservas por data de evento.</p>
          </div>
          <Link href="/admin/reservas/nova" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900">Nova reserva</Link>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm font-bold text-slate-700">Data inicial<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="block flex-1 text-sm font-bold text-slate-700">Data final<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <button type="button" onClick={() => { const today = new Date(); setStartDate(toDateKey(today)); setEndDate(toDateKey(addDays(today, 30))); }} className="h-11 rounded-xl border border-emerald-200 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Próximos 30 dias</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ["all", "Todas"],
              ["outstanding", "Com saldo a receber"],
              ["paid", "Quitadas"],
            ] as [PaymentFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${paymentFilter === value ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search className="h-5 w-5 shrink-0" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente ou número da reserva..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
        </section>

        {loading && <p className="mt-7 text-sm font-medium text-slate-500">Carregando financeiro...</p>}
        {!loading && errorMessage && <p className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar o financeiro: {errorMessage}</p>}

        {!loading && !errorMessage && <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex rounded-xl bg-slate-100 p-3 text-slate-700"><CircleDollarSign className="h-5 w-5" /></span><p className="mt-5 text-sm font-medium text-slate-500">Total previsto</p><p className="mt-1 text-3xl font-black text-slate-900">{currency.format(totals.expected)}</p></article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><span className="inline-flex rounded-xl bg-white p-3 text-emerald-700"><HandCoins className="h-5 w-5" /></span><p className="mt-5 text-sm font-medium text-emerald-700">Recebido no período</p><p className="mt-1 text-3xl font-black text-emerald-900">{currency.format(totals.receivedInPeriod)}</p></article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><span className="inline-flex rounded-xl bg-white p-3 text-amber-700"><WalletCards className="h-5 w-5" /></span><p className="mt-5 text-sm font-medium text-amber-700">A receber</p><p className="mt-1 text-3xl font-black text-amber-900">{currency.format(totals.balance)}</p></article>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">Reservas no período</h2><p className="mt-1 text-sm text-slate-500">{visibleReservations.length} {visibleReservations.length === 1 ? "reserva" : "reservas"} encontradas.</p></div><button type="button" onClick={downloadCsv} disabled={visibleReservations.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-700 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Baixar CSV</button></div>
            {visibleReservations.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhuma reserva corresponde a este filtro.</p> : <div className="divide-y divide-slate-100">{visibleReservations.map((reservation) => {
              const total = reservationTotal(reservation);
              const paid = Number(reservation.amount_paid ?? 0);
              const balance = Math.max(total - paid, 0);
              return <Link key={reservation.id} href={`/admin/reservas/${reservation.id}`} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-800">Reserva #{reservation.id} · {reservation.customer_name || "Cliente não informado"}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Evento em {new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><div className="grid grid-cols-3 gap-5 text-right text-sm"><div><p className="text-slate-500">Total</p><p className="mt-1 font-bold text-slate-800">{currency.format(total)}</p></div><div><p className="text-slate-500">Recebido</p><p className="mt-1 font-bold text-emerald-700">{currency.format(paid)}</p></div><div><p className="text-slate-500">Saldo</p><p className={`mt-1 font-bold ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{balance > 0 ? currency.format(balance) : "Quitada"}</p></div></div></Link>;
            })}</div>}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5"><h2 className="font-bold text-slate-900">Pagamentos recebidos no período</h2><p className="mt-1 text-sm text-slate-500">{payments.length} {payments.length === 1 ? "lançamento" : "lançamentos"} registrados.</p></div>
            {payments.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum pagamento registrado neste período.</p> : <div className="divide-y divide-slate-100">{payments.map((payment) => <Link key={payment.id} href={`/admin/reservas/${payment.reservation_id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"><div><p className="font-bold text-slate-800">Reserva #{payment.reservation_id}</p><p className="mt-1 text-sm text-slate-500">{new Date(`${payment.payment_date}T12:00:00`).toLocaleDateString("pt-BR")} · {({ pix: "PIX", cash: "Dinheiro", card: "Cartão", transfer: "Transferência", other: "Outro" } as Record<string, string>)[payment.payment_method] ?? "Outro"}</p></div><p className="text-lg font-black text-emerald-700">{currency.format(payment.amount)}</p></Link>)}</div>}
          </section>
        </>}
      </div>
    </main>
  );
}
