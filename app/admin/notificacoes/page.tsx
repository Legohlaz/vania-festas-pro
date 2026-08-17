"use client";

import Link from "next/link";
import { Bell, CheckCheck, Clock3, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: number;
  type: "customer_pending" | "reservation_pending";
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function notificationIcon(type: Notification["type"]) {
  return type === "customer_pending" ? UserRoundPlus : Clock3;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  async function loadNotifications() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id,type,title,message,href,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) setErrorMessage(error.message);
    else setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);

    return () => window.clearTimeout(initialLoad);
  }, []);

  async function markAsRead(notification: Notification) {
    if (notification.read_at) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);

    if (!error) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("admin_notifications").update({ read_at: now }).in("id", unreadIds);
    if (error) setErrorMessage(error.message);
    else setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Central de avisos</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Notificações</h1>
            <p className="mt-2 text-sm text-slate-500">Acompanhe os cadastros e reservas que precisam de atenção.</p>
          </div>
          <button type="button" onClick={markAllAsRead} disabled={markingAll || unreadCount === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marcando..." : "Marcar todas como lidas"}
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="font-bold text-slate-900">{unreadCount} {unreadCount === 1 ? "aviso não lido" : "avisos não lidos"}</p>
            <Bell className="h-5 w-5 text-emerald-700" />
          </div>

          {loading && <p className="p-6 text-sm text-slate-500">Carregando notificações...</p>}
          {!loading && errorMessage && <p className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar as notificações: {errorMessage}</p>}
          {!loading && !errorMessage && notifications.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhuma notificação por enquanto.</p>}
          {!loading && !errorMessage && notifications.length > 0 && <div className="divide-y divide-slate-100">{notifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const content = <><span className={`mt-0.5 rounded-xl p-3 ${notification.read_at ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{notification.title}</strong>{!notification.read_at && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Novo</span>}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{notification.message}</span><span className="mt-2 block text-xs text-slate-400">{new Date(notification.created_at).toLocaleString("pt-BR")}</span></span></>;
            const className = `flex gap-4 px-5 py-5 transition ${notification.read_at ? "bg-white" : "bg-emerald-50/40 hover:bg-emerald-50"}`;
            return notification.href ? <Link key={notification.id} href={notification.href} onClick={() => void markAsRead(notification)} className={className}>{content}</Link> : <button key={notification.id} type="button" onClick={() => void markAsRead(notification)} className={`${className} w-full text-left`}>{content}</button>;
          })}</div>}
        </section>
      </div>
    </main>
  );
}
