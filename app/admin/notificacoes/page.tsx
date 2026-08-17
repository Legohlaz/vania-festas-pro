"use client";

import Link from "next/link";
import { Bell, CheckCheck, CircleDollarSign, Clock3, Truck, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StoredNotification = {
  id: number;
  type: "customer_pending" | "reservation_pending";
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type ReservationAlert = {
  id: number;
  customer_name: string | null;
  event_date: string;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: { quantity: number | null; unit_price: number | null }[] | null;
};

type AttentionNotification = StoredNotification & {
  kind?: "event" | "balance";
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function reservationBalance(reservation: ReservationAlert) {
  const total = (reservation.reservation_items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    Number(reservation.service_fee ?? 0)
  );

  return Math.max(total - Number(reservation.amount_paid ?? 0), 0);
}

function notificationIcon(type: StoredNotification["type"]) {
  return type === "customer_pending" ? UserRoundPlus : Clock3;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [attention, setAttention] = useState<AttentionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    setErrorMessage("");
    const supabase = createClient();
    const today = new Date();
    const inThreeDays = new Date(today);
    inThreeDays.setDate(today.getDate() + 3);
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(today.getDate() + 30);

    const [storedResult, eventsResult, balancesResult] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("id,type,title,message,href,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("reservations")
        .select("id,customer_name,event_date,service_fee,amount_paid,reservation_items(quantity,unit_price)")
        .in("status", ["pending", "confirmed"])
        .gte("event_date", dateKey(today))
        .lte("event_date", dateKey(inThreeDays))
        .order("event_date", { ascending: true }),
      supabase
        .from("reservations")
        .select("id,customer_name,event_date,service_fee,amount_paid,reservation_items(quantity,unit_price)")
        .in("status", ["pending", "confirmed"])
        .gte("event_date", dateKey(today))
        .lte("event_date", dateKey(inThirtyDays))
        .order("event_date", { ascending: true }),
    ]);

    const error = storedResult.error ?? eventsResult.error ?? balancesResult.error;
    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const eventAlerts: AttentionNotification[] = ((eventsResult.data ?? []) as ReservationAlert[]).map((reservation) => ({
      id: -reservation.id,
      type: "reservation_pending",
      title: `Evento em breve: reserva #${reservation.id}`,
      message: `${reservation.customer_name ?? "Cliente"} tem evento em ${new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR")}. Confira logística e itens.`,
      href: `/admin/reservas/${reservation.id}`,
      read_at: null,
      created_at: `${reservation.event_date}T12:00:00`,
      kind: "event",
    }));
    const balanceAlerts: AttentionNotification[] = ((balancesResult.data ?? []) as ReservationAlert[])
      .filter((reservation) => reservationBalance(reservation) > 0.009)
      .map((reservation) => ({
        id: -(1000000 + reservation.id),
        type: "reservation_pending",
        title: `Saldo a receber: reserva #${reservation.id}`,
        message: `${reservation.customer_name ?? "Cliente"} ainda tem ${currency.format(reservationBalance(reservation))} em aberto para o evento de ${new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR")}.`,
        href: `/admin/reservas/${reservation.id}`,
        read_at: null,
        created_at: `${reservation.event_date}T12:00:00`,
        kind: "balance",
      }));

    setNotifications((storedResult.data ?? []) as StoredNotification[]);
    setAttention([...eventAlerts, ...balanceAlerts]);
    setLoading(false);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  async function markAsRead(notification: AttentionNotification) {
    if (notification.read_at || notification.kind) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("admin_notifications").update({ read_at: now }).eq("id", notification.id);
    if (!error) setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: now } : item));
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    const { error } = await createClient().from("admin_notifications").update({ read_at: now }).in("id", unreadIds);
    if (error) setErrorMessage(error.message);
    else setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
    setMarkingAll(false);
  }

  const allNotifications = useMemo<AttentionNotification[]>(() => [...attention, ...notifications], [attention, notifications]);
  const unreadCount = allNotifications.filter((notification) => !notification.read_at).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Central de avisos</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Notificações</h1>
            <p className="mt-2 text-sm text-slate-500">Cadastros pendentes, eventos próximos e saldos a receber.</p>
          </div>
          <button type="button" onClick={markAllAsRead} disabled={markingAll || notifications.every((notification) => notification.read_at)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marcando..." : "Marcar todas como lidas"}
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="font-bold text-slate-900">{unreadCount} {unreadCount === 1 ? "aviso exige atenção" : "avisos exigem atenção"}</p>
            <Bell className="h-5 w-5 text-emerald-700" />
          </div>
          {loading && <p className="p-6 text-sm text-slate-500">Carregando notificações...</p>}
          {!loading && errorMessage && <p className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar as notificações: {errorMessage}</p>}
          {!loading && !errorMessage && allNotifications.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhuma notificação por enquanto.</p>}
          {!loading && !errorMessage && allNotifications.length > 0 && <div className="divide-y divide-slate-100">{allNotifications.map((notification) => {
            const StoredIcon = notificationIcon(notification.type);
            const Icon = notification.kind === "event" ? Truck : notification.kind === "balance" ? CircleDollarSign : StoredIcon;
            const background = notification.kind ? "bg-amber-50 text-amber-700" : notification.read_at ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700";
            const content = <><span className={`mt-0.5 rounded-xl p-3 ${background}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{notification.title}</strong>{notification.kind ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Atenção</span> : !notification.read_at && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Novo</span>}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{notification.message}</span>{!notification.kind && <span className="mt-2 block text-xs text-slate-400">{new Date(notification.created_at).toLocaleString("pt-BR")}</span>}</span></>;
            const className = `flex gap-4 px-5 py-5 transition ${notification.read_at ? "bg-white" : "bg-emerald-50/40 hover:bg-emerald-50"}`;
            return notification.href ? <Link key={`${notification.kind ?? "stored"}-${notification.id}`} href={notification.href} onClick={() => void markAsRead(notification)} className={className}>{content}</Link> : <button key={notification.id} type="button" onClick={() => void markAsRead(notification)} className={`${className} w-full text-left`}>{content}</button>;
          })}</div>}
        </section>
      </div>
    </main>
  );
}
