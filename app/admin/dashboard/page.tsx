"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Package, Truck, Users, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string | null;
  event_date: string;
  status: "pending" | "confirmed" | "cancelled" | string;
};

type Product = { stock_quantity: number | null };

type FinancialReservation = {
  service_fee: number | null;
  amount_paid: number | null;
  logistics_status: string | null;
  reservation_items: { quantity: number | null; unit_price: number | null }[] | null;
};

type Payment = { amount: number | null };

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function statusLabel(status: Reservation["status"]) {
  return ({ pending: "Pendente", confirmed: "Confirmada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;
}

function statusClass(status: Reservation["status"]) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customerCount, setCustomerCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [stockUnits, setStockUnits] = useState(0);
  const [receivableAmount, setReceivableAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [preparingCount, setPreparingCount] = useState(0);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const dateRange = useMemo(() => {
    const today = new Date();
    return { start: toDateKey(today), end: toDateKey(addDays(today, 30)) };
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();
      const [customersResult, pendingResult, productsResult, reservationsResult, financialReservationsResult, paymentsResult] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("stock_quantity").eq("active", true),
        supabase.from("reservations").select("id, customer_name, event_date, status").gte("event_date", dateRange.start).lte("event_date", dateRange.end).neq("status", "cancelled").order("event_date").limit(6),
        supabase.from("reservations").select("service_fee, amount_paid, logistics_status, reservation_items(quantity, unit_price)").gte("event_date", dateRange.start).lte("event_date", dateRange.end).neq("status", "cancelled"),
        supabase.from("reservation_payments").select("amount").gte("payment_date", dateRange.start).lte("payment_date", dateRange.end),
      ]);

      const error = customersResult.error ?? pendingResult.error ?? productsResult.error ?? reservationsResult.error ?? financialReservationsResult.error ?? paymentsResult.error;
      if (error) {
        setErrorMessage(error.message);
      } else {
        setCustomerCount(customersResult.count ?? 0);
        setPendingCount(pendingResult.count ?? 0);
        setStockUnits(((productsResult.data ?? []) as Product[]).reduce((total, product) => total + Number(product.stock_quantity ?? 0), 0));
        setUpcoming((reservationsResult.data ?? []) as Reservation[]);
        setReceivableAmount(((financialReservationsResult.data ?? []) as unknown as FinancialReservation[]).reduce((total, reservation) => {
          const reservationTotal = (reservation.reservation_items ?? []).reduce((itemsTotal, item) => itemsTotal + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0) + Number(reservation.service_fee ?? 0);
          return total + Math.max(reservationTotal - Number(reservation.amount_paid ?? 0), 0);
        }, 0));
        setReceivedAmount(((paymentsResult.data ?? []) as Payment[]).reduce((total, payment) => total + Number(payment.amount ?? 0), 0));
        setPreparingCount(((financialReservationsResult.data ?? []) as unknown as FinancialReservation[]).filter((reservation) => reservation.logistics_status === "preparing").length);
      }
      setLoading(false);
    }

    loadDashboard();
  }, [dateRange]);

  const cards = [
    { label: "Reservas pendentes", value: pendingCount, icon: Clock3, tone: "bg-amber-50 text-amber-700", href: "/admin/reservas" },
    { label: "Eventos em 30 dias", value: upcoming.length, icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700", href: "/admin/agenda" },
    { label: "Clientes cadastrados", value: customerCount, icon: Users, tone: "bg-sky-50 text-sky-700", href: "/admin/clientes" },
    { label: "Unidades no estoque", value: stockUnits, icon: Package, tone: "bg-violet-50 text-violet-700", href: "/admin/produtos" },
    { label: "A receber em 30 dias", value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivableAmount), icon: WalletCards, tone: "bg-rose-50 text-rose-700", href: "/admin/reservas?pagamento=pendentes" },
    { label: "Recebido em 30 dias", value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedAmount), icon: WalletCards, tone: "bg-emerald-50 text-emerald-700", href: "/admin/financeiro" },
    { label: "Eventos em preparação", value: preparingCount, icon: Truck, tone: "bg-sky-50 text-sky-700", href: "/admin/reservas?logistica=preparing" },
  ];

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Painel administrativo</p><h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Visão geral</h1><p className="mt-2 text-sm text-slate-500">Acompanhe o que precisa de atenção na sua locadora.</p></div><Link href="/admin/reservas/nova" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900">Nova reserva</Link></div>{loading && <p className="mt-8 text-sm font-medium text-slate-500">Carregando painel...</p>}{!loading && errorMessage && <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar o painel: {errorMessage}</p>}{!loading && !errorMessage && <><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone, href }) => <Link key={label} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></span><ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:text-emerald-700" /></div><p className="mt-5 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></Link>)}</section><section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5"><div><h2 className="font-bold text-slate-900">Próximos eventos</h2><p className="mt-1 text-sm text-slate-500">Reservas confirmadas ou pendentes nos próximos 30 dias.</p></div><Link href="/admin/agenda" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Abrir agenda</Link></div>{upcoming.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum evento nos próximos 30 dias.</p> : <div className="divide-y divide-slate-100">{upcoming.map((reservation) => <Link key={reservation.id} href={`/admin/reservas/${reservation.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"><div><p className="font-bold text-slate-800">Reserva #{reservation.id} · {reservation.customer_name || "Cliente não informado"}</p><p className="mt-1 text-sm text-slate-500">Evento em {new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(reservation.status)}`}>{statusLabel(reservation.status)}</span></Link>)}</div>}</section></>}</div></main>;
}
