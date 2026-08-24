"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, History, Wrench } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type HistoryItem = {
  id: number;
  reservation_id: number;
  quantity: number | null;
  reservations: {
    id: number;
    customer_name: string | null;
    event_date: string;
    status: string;
  } | null;
};

function statusLabel(status: string) {
  return ({ pending: "Pendente", confirmed: "Confirmada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;
}

export function ProductRentalHistory({ productId }: { productId: number | string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      const { data, error: queryError } = await createClient()
        .from("reservation_items")
        .select("id,reservation_id,quantity,reservations(id,customer_name,event_date,status)")
        .eq("product_id", Number(productId))
        .order("reservation_id", { ascending: false })
        .limit(12);

      if (queryError) setError(queryError.message);
      else setItems((data ?? []) as unknown as HistoryItem[]);
      setLoading(false);
    }

    void loadHistory();
  }, [productId]);

  const rentedUnits = useMemo(
    () => items.filter((item) => item.reservations?.status !== "cancelled").reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items]
  );

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800"><History size={18} /> Histórico de locações</div>
          <h2 className="mt-2 text-xl font-black text-slate-900">Uso recente deste produto</h2>
          <p className="mt-1 text-sm text-slate-500">Veja em quais reservas o item apareceu e acompanhe sua utilização.</p>
        </div>
        <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{rentedUnits} unidades em reservas ativas</span>
      </div>

      {loading && <p className="mt-5 text-sm text-slate-500">Carregando histórico...</p>}
      {!loading && error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar o histórico: {error}</p>}
      {!loading && !error && items.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Este produto ainda não foi usado em uma reserva.</p>}
      {!loading && !error && items.length > 0 && (
        <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
          {items.map((item) => {
            const reservation = item.reservations;
            if (!reservation) return null;
            const cancelled = reservation.status === "cancelled";
            return (
              <Link key={item.id} href={`/admin/reservas/${item.reservation_id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50">
                <span className="min-w-0"><strong className="block text-sm text-slate-800">Reserva #{item.reservation_id} · {reservation.customer_name || "Cliente não informado"}</strong><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13} />{new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR")}</span></span>
                <span className="shrink-0 text-right"><strong className="block text-sm text-slate-800">{item.quantity ?? 0} un.</strong><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${cancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{statusLabel(reservation.status)}</span></span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Wrench size={14} /> Para registrar avarias ou faltas, use a conferência de devolução da reserva.</p>
    </section>
  );
}
