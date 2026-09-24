"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, Download, Package, TrendingUp, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { csvCell, monthlyRevenue, reservationBalance, reservationTotal } from "@/lib/reports";

type ProductRelation = { name: string | null } | { name: string | null }[] | null;

type ReportItem = {
  product_id: number | null;
  quantity: number | null;
  unit_price: number | null;
  products: ProductRelation;
};

type ReportReservation = {
  id: number;
  customer_name: string | null;
  event_date: string;
  status: string;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: ReportItem[] | null;
};

type ReportPayment = {
  amount: number | null;
  payment_date: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function productName(relation: ProductRelation) {
  const product = Array.isArray(relation) ? relation[0] : relation;
  return product?.name ?? "Produto removido";
}

function statusLabel(status: string) {
  return ({ pending: "Pendentes", confirmed: "Confirmadas", cancelled: "Canceladas", completed: "Concluídas" } as Record<string, string>)[status] ?? status;
}

export default function ReportsPage() {
  const initialRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    return { start: dateKey(start), end: dateKey(end) };
  }, []);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [reservations, setReservations] = useState<ReportReservation[]>([]);
  const [payments, setPayments] = useState<ReportPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();
      const [reservationsResult, paymentsResult] = await Promise.all([
        supabase
          .from("reservations")
          .select("id,customer_name,event_date,status,service_fee,amount_paid,reservation_items(product_id,quantity,unit_price,products(name))")
          .gte("event_date", startDate)
          .lte("event_date", endDate)
          .order("event_date"),
        supabase
          .from("reservation_payments")
          .select("amount,payment_date")
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date"),
      ]);

      const error = reservationsResult.error ?? paymentsResult.error;
      if (error) setErrorMessage(error.message);
      else {
        setReservations((reservationsResult.data ?? []) as ReportReservation[]);
        setPayments((paymentsResult.data ?? []) as ReportPayment[]);
      }
      setLoading(false);
    }

    void loadReports();
  }, [endDate, startDate]);

  const activeReservations = reservations.filter((reservation) => reservation.status !== "cancelled");
  const totals = {
    expected: activeReservations.reduce((sum, reservation) => sum + reservationTotal(reservation), 0),
    received: payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    outstanding: activeReservations.reduce((sum, reservation) => sum + reservationBalance(reservation), 0),
  };

  const statusCounts = Object.entries(
    reservations.reduce<Record<string, number>>((counts, reservation) => {
      counts[reservation.status] = (counts[reservation.status] ?? 0) + 1;
      return counts;
    }, {})
  ).sort(([, first], [, second]) => second - first);

  const productRanking = [...activeReservations.reduce<Map<string, { name: string; quantity: number; revenue: number }>>((ranking, reservation) => {
    for (const item of reservation.reservation_items ?? []) {
      const key = String(item.product_id ?? productName(item.products));
      const current = ranking.get(key) ?? { name: productName(item.products), quantity: 0, revenue: 0 };
      current.quantity += Number(item.quantity ?? 0);
      current.revenue += Number(item.quantity ?? 0) * Number(item.unit_price ?? 0);
      ranking.set(key, current);
    }
    return ranking;
  }, new Map()).values()].sort((first, second) => second.quantity - first.quantity).slice(0, 8);

  const revenueByMonth = monthlyRevenue(payments);
  const highestMonth = Math.max(...revenueByMonth.map((month) => month.amount), 1);
  const highestProduct = Math.max(...productRanking.map((product) => product.quantity), 1);

  function downloadCsv() {
    const rows = [
      ["Reserva", "Cliente", "Data", "Status", "Total", "Recebido", "Saldo"],
      ...reservations.map((reservation) => [
        `#${reservation.id}`,
        reservation.customer_name ?? "Cliente não informado",
        new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR"),
        statusLabel(reservation.status),
        reservationTotal(reservation).toFixed(2).replace(".", ","),
        Number(reservation.amount_paid ?? 0).toFixed(2).replace(".", ","),
        reservationBalance(reservation).toFixed(2).replace(".", ","),
      ]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"><BarChart3 className="h-4 w-4" /> Gestão</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Relatórios gerenciais</h1>
            <p className="mt-2 text-sm text-slate-500">Faturamento, reservas e produtos mais alugados em um só lugar.</p>
          </div>
          <button type="button" onClick={downloadCsv} disabled={reservations.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-50"><Download className="h-4 w-4" /> Exportar CSV</button>
        </div>

        <section className="mt-7 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Data inicial<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500" /></label>
          <label className="text-sm font-bold text-slate-700">Data final<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500" /></label>
        </section>

        {loading && <p className="mt-7 text-sm font-semibold text-slate-500">Preparando relatórios...</p>}
        {!loading && errorMessage && <p className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Não foi possível gerar os relatórios: {errorMessage}</p>}

        {!loading && !errorMessage && <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "Total previsto", value: totals.expected, icon: CalendarDays, tone: "bg-slate-100 text-slate-700" },
              { label: "Recebido no período", value: totals.received, icon: TrendingUp, tone: "bg-emerald-100 text-emerald-700" },
              { label: "Saldo a receber", value: totals.outstanding, icon: WalletCards, tone: "bg-amber-100 text-amber-700" },
            ].map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`inline-flex rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-5 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{currency.format(value)}</p></article>)}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-900">Recebimentos por mês</h2>
              <p className="mt-1 text-sm text-slate-500">Valores efetivamente registrados no financeiro.</p>
              <div className="mt-6 space-y-4">
                {revenueByMonth.length === 0 ? <p className="text-sm text-slate-500">Nenhum pagamento no período.</p> : revenueByMonth.map(({ month, amount }) => <div key={month}><div className="flex justify-between gap-4 text-sm"><span className="font-bold capitalize text-slate-700">{new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span><strong className="text-emerald-700">{currency.format(amount)}</strong></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max((amount / highestMonth) * 100, 3)}%` }} /></div></div>)}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-900">Situação das reservas</h2>
              <p className="mt-1 text-sm text-slate-500">Distribuição dos eventos no período selecionado.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {statusCounts.length === 0 ? <p className="text-sm text-slate-500">Nenhuma reserva no período.</p> : statusCounts.map(([status, count]) => <div key={status} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{statusLabel(status)}</p><p className="mt-1 text-3xl font-black text-slate-900">{count}</p></div>)}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-3 text-violet-700"><Package className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Produtos mais alugados</h2><p className="text-sm text-slate-500">Ranking pela quantidade reservada, excluindo cancelamentos.</p></div></div>
            <div className="mt-6 space-y-4">
              {productRanking.length === 0 ? <p className="text-sm text-slate-500">Nenhum produto reservado no período.</p> : productRanking.map((product, index) => <div key={`${product.name}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px]"><div><div className="flex justify-between gap-4 text-sm"><span className="font-bold text-slate-800">{index + 1}. {product.name}</span><span className="text-slate-500">{product.quantity} unidades</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max((product.quantity / highestProduct) * 100, 3)}%` }} /></div></div><strong className="self-center text-right text-sm text-emerald-700">{currency.format(product.revenue)}</strong></div>)}
            </div>
          </section>

          <div className="mt-6 flex justify-end"><Link href="/admin/financeiro" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Abrir financeiro detalhado →</Link></div>
        </>}
      </div>
    </main>
  );
}
