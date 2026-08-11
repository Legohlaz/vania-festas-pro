"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Phone, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  event_date: string;
  status: "pending" | "confirmed" | "cancelled" | string;
  logistics_status: string | null;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: { quantity: number | null; unit_price: number | null }[] | null;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getBalance(reservation: Reservation) {
  const itemsTotal = (reservation.reservation_items ?? []).reduce(
    (total, item) =>
      total + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    0
  );

  return Math.max(
    itemsTotal + Number(reservation.service_fee ?? 0) - Number(reservation.amount_paid ?? 0),
    0
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function statusLabel(
  status: Reservation["status"],
  logisticsStatus: Reservation["logistics_status"]
) {
  const commercialLabel =
    ({ pending: "Pendente", confirmed: "Confirmada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;

  if (status === "cancelled") {
    return commercialLabel;
  }

  const logisticsLabel =
    ({
      scheduled: "Agendada",
      preparing: "Em preparação",
      delivered: "Entregue",
      returned: "Finalizada",
    } as Record<string, string>)[logisticsStatus ?? "scheduled"] ?? "Agendada";

  return `${commercialLabel} · ${logisticsLabel}`;
}

function statusClass(status: Reservation["status"]) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

export default function AgendaPage() {
  const [startDate, setStartDate] = useState(() => new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(startDate, index)), [startDate]);
  const firstDate = toDateKey(days[0]);
  const lastDate = toDateKey(days[days.length - 1]);

  useEffect(() => {
    async function loadAgenda() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await createClient()
        .from("reservations")
        .select("id, customer_name, customer_phone, event_date, status, logistics_status, service_fee, amount_paid, reservation_items(quantity, unit_price)")
        .gte("event_date", firstDate)
        .lte("event_date", lastDate)
        .order("event_date");

      if (error) {
        setErrorMessage(error.message);
      } else {
        setReservations((data ?? []) as Reservation[]);
      }

      setLoading(false);
    }

    loadAgenda();
  }, [firstDate, lastDate]);

  const reservationsByDate = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();
    for (const reservation of reservations) {
      const current = grouped.get(reservation.event_date) ?? [];
      current.push(reservation);
      grouped.set(reservation.event_date, current);
    }
    return grouped;
  }, [reservations]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"><CalendarDays className="h-4 w-4" /> Agenda</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Próximos eventos</h1>
            <p className="mt-2 text-sm text-slate-500">Veja as reservas dos próximos 14 dias e abra cada uma para conferir os itens.</p>
          </div>
          <Link href="/admin/reservas/nova" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900">Nova reserva</Link>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setStartDate((date) => addDays(date, -14))} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Anteriores</button>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input
                type="date"
                value={toDateKey(startDate)}
                onChange={(event) => {
                  if (event.target.value) setStartDate(new Date(`${event.target.value}T12:00:00`));
                }}
                aria-label="Ir para uma data"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button type="button" onClick={() => setStartDate(new Date())} className="h-10 rounded-lg border border-emerald-200 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Hoje</button>
              <p className="hidden text-center text-sm font-bold text-slate-700 xl:block">{days[0].toLocaleDateString("pt-BR")} a {days[13].toLocaleDateString("pt-BR")}</p>
            </div>
            <button type="button" onClick={() => setStartDate((date) => addDays(date, 14))} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Próximos <ChevronRight className="h-4 w-4" /></button>
          </div>
        </section>

        {loading && <p className="mt-6 text-sm font-medium text-slate-500">Carregando agenda...</p>}
        {!loading && errorMessage && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar a agenda: {errorMessage}</p>}

        {!loading && !errorMessage && <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const dayReservations = reservationsByDate.get(dateKey) ?? [];
            const isToday = dateKey === toDateKey(new Date());

            return <article key={dateKey} className={`min-h-48 rounded-2xl border bg-white p-4 shadow-sm ${isToday ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{day.toLocaleDateString("pt-BR", { weekday: "long" })}</p><h2 className="mt-1 text-xl font-black capitalize text-slate-900">{day.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{dayReservations.length}</span></div>
              <div className="mt-4 space-y-3">
                {dayReservations.length === 0 ? <p className="text-sm text-slate-400">Nenhum evento.</p> : dayReservations.map((reservation) => <Link key={reservation.id} href={`/admin/reservas/${reservation.id}`} className="block rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50"><div className="flex items-center justify-between gap-2"><p className="font-bold text-slate-800">Reserva #{reservation.id}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(reservation.status)}`}>{statusLabel(reservation.status, reservation.logistics_status)}</span></div><p className="mt-2 flex items-center gap-1.5 truncate text-sm text-slate-600"><UserRound className="h-3.5 w-3.5 shrink-0" />{reservation.customer_name || "Cliente não informado"}</p>{reservation.customer_phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" />{reservation.customer_phone}</p>}{reservation.status !== "cancelled" && <p className={`mt-2 text-xs font-bold ${getBalance(reservation) > 0 ? "text-amber-700" : "text-emerald-700"}`}>{getBalance(reservation) > 0 ? `Saldo: ${currency.format(getBalance(reservation))}` : "Financeiro quitado"}</p>}</Link>)}
              </div>
            </article>;
          })}
        </section>}
      </div>
    </main>
  );
}
