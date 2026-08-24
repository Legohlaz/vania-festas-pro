"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  QrCode,
  Truck,
  Undo2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LogisticsStatus = "scheduled" | "preparing" | "delivered" | "returned";
type DateFilter = "all" | "next7" | "next30";

type Reservation = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  event_date: string;
  event_address: string | null;
  status: string;
  logistics_status: LogisticsStatus | null;
  reservation_items: { quantity: number | null }[] | null;
  reservation_logistics_checklist: { completed_at: string | null }[] | null;
};

const columns: {
  status: LogisticsStatus;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  className: string;
  nextStatus?: LogisticsStatus;
  action?: string;
}[] = [
  {
    status: "scheduled",
    title: "Agendadas",
    description: "Eventos que ainda serão organizados.",
    icon: ClipboardList,
    className: "border-slate-200 bg-slate-50 text-slate-700",
    nextStatus: "preparing",
    action: "Iniciar preparação",
  },
  {
    status: "preparing",
    title: "Em preparação",
    description: "Separar e conferir os itens para o evento.",
    icon: PackageCheck,
    className: "border-sky-200 bg-sky-50 text-sky-700",
    nextStatus: "delivered",
    action: "Marcar como entregue",
  },
  {
    status: "delivered",
    title: "Entregues / montadas",
    description: "Itens em uso no evento do cliente.",
    icon: Truck,
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    status: "returned",
    title: "Finalizadas",
    description: "Eventos concluídos e devolvidos.",
    icon: Undo2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function itemCount(reservation: Reservation) {
  return (reservation.reservation_items ?? []).reduce(
    (total, item) => total + Number(item.quantity ?? 0),
    0
  );
}

function checklistProgress(reservation: Reservation) {
  const rows = reservation.reservation_logistics_checklist ?? [];
  return rows.filter((row) => row.completed_at).length;
}

function whatsappLink(phone: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

export default function LogisticaPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    async function loadLogistics() {
      const { data, error } = await createClient()
        .from("reservations")
        .select("id, customer_name, customer_phone, event_date, event_address, status, logistics_status, reservation_items(quantity), reservation_logistics_checklist(completed_at)")
        .neq("status", "cancelled")
        .order("event_date", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setReservations((data ?? []) as Reservation[]);
      }

      setLoading(false);
    }

    loadLogistics();
  }, []);

  const filteredReservations = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("pt-BR");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);

    if (dateFilter === "next7") limit.setDate(limit.getDate() + 7);
    if (dateFilter === "next30") limit.setDate(limit.getDate() + 30);

    return reservations.filter((reservation) =>
      (dateFilter === "all" || (() => {
        const eventDate = new Date(`${reservation.event_date}T12:00:00`);
        return eventDate >= today && eventDate <= limit;
      })()) &&
      (!term || [
          reservation.id.toString(),
          reservation.customer_name ?? "",
          reservation.customer_phone ?? "",
          reservation.event_address ?? "",
          formatDate(reservation.event_date),
        ].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)))
    );
  }, [reservations, searchTerm, dateFilter]);

  const reservationsByStatus = useMemo(() => {
    const grouped = new Map<LogisticsStatus, Reservation[]>();
    for (const column of columns) grouped.set(column.status, []);

    for (const reservation of filteredReservations) {
      const status = reservation.logistics_status ?? "scheduled";
      grouped.get(status)?.push(reservation);
    }

    return grouped;
  }, [filteredReservations]);

  async function moveReservation(id: number, nextStatus: LogisticsStatus) {
    setUpdatingId(id);
    setErrorMessage("");

    const { error } = await createClient()
      .from("reservations")
      .update({ logistics_status: nextStatus })
      .eq("id", id);

    if (error) {
      setErrorMessage(`Não foi possível atualizar a etapa: ${error.message}`);
    } else {
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === id
            ? { ...reservation, logistics_status: nextStatus }
            : reservation
        )
      );
    }

    setUpdatingId(null);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              <Truck className="h-4 w-4" /> Operação
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Logística dos eventos</h1>
            <p className="mt-2 text-sm text-slate-500">Acompanhe a separação, entrega e devolução de cada locação.</p>
          </div>
          <Link href="/admin/reservas/nova" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900">
            Nova reserva
          </Link>
        </div>

        {loading && <p className="mt-8 text-sm font-medium text-slate-500">Carregando logística...</p>}
        {!loading && errorMessage && <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{errorMessage}</p>}

        {!loading && (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Search className="h-5 w-5 shrink-0" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por reserva, cliente, telefone ou endereço..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                />
                <span className="hidden rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 sm:inline">
                  {filteredReservations.length} {filteredReservations.length === 1 ? "reserva" : "reservas"}
                </span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["all", "Todas"],
                  ["next7", "Próximos 7 dias"],
                  ["next30", "Próximos 30 dias"],
                ] as [DateFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDateFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${dateFilter === value ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-4">
            {columns.map((column) => {
              const Icon = column.icon;
              const columnReservations = reservationsByStatus.get(column.status) ?? [];

              return (
                <section key={column.status} className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`rounded-xl border p-4 ${column.className}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-lg bg-white/70 p-2"><Icon className="h-5 w-5" /></span>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black">{columnReservations.length}</span>
                    </div>
                    <h2 className="mt-3 font-black">{column.title}</h2>
                    <p className="mt-1 text-xs font-medium opacity-80">{column.description}</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {columnReservations.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">Nenhuma reserva nesta etapa.</p>
                    ) : (
                      columnReservations.map((reservation) => (
                        <article key={reservation.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/admin/reservas/${reservation.id}`} className="font-black text-slate-900 hover:text-emerald-700">Reserva #{reservation.id}</Link>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{itemCount(reservation)} itens</span>
                          </div>
                          <p className="mt-3 font-bold text-slate-800">{reservation.customer_name || "Cliente não informado"}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(reservation.event_date)}</p>
                          {reservation.event_address && <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{reservation.event_address}</p>}
                          {whatsappLink(reservation.customer_phone) && (
                            <a
                              href={whatsappLink(reservation.customer_phone)!}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Falar com cliente
                            </a>
                          )}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                              <span>Checklist operacional</span>
                              <span>{checklistProgress(reservation)}/4</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${checklistProgress(reservation) * 25}%` }} />
                            </div>
                          </div>
                          {column.nextStatus && column.action && (
                            <button type="button" disabled={updatingId === reservation.id} onClick={() => moveReservation(reservation.id, column.nextStatus!)} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 text-xs font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
                              <CheckCircle2 className="h-4 w-4" />
                              {updatingId === reservation.id ? "Atualizando..." : column.action}
                            </button>
                          )}
                          {column.status === "delivered" && (
                            <Link href={`/admin/reservas/${reservation.id}`} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-800 transition hover:bg-violet-100">
                              <ClipboardList className="h-4 w-4" /> Conferir devolução
                            </Link>
                          )}
                          {column.status !== "returned" && (
                            <Link href={`/admin/reservas/${reservation.id}`} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 transition hover:bg-sky-100">
                              <QrCode className="h-4 w-4" /> Conferir por QR Code
                            </Link>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
