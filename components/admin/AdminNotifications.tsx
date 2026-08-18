"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReservationAlert = {
  id: number;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: { quantity: number | null; unit_price: number | null }[] | null;
};

type ProductAlert = {
  id: number;
  stock_quantity: number | null;
  minimum_stock: number | null;
  maintenance_status: string | null;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function hasBalance(reservation: ReservationAlert) {
  const total = (reservation.reservation_items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    Number(reservation.service_fee ?? 0)
  );

  return total - Number(reservation.amount_paid ?? 0) > 0.009;
}

export function AdminNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUnreadCount() {
      const today = new Date();
      const inThreeDays = new Date(today);
      inThreeDays.setDate(today.getDate() + 3);
      const inThirtyDays = new Date(today);
      inThirtyDays.setDate(today.getDate() + 30);

      const [stored, upcoming, balances, products] = await Promise.all([
        supabase
          .from("admin_notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
        supabase
          .from("reservations")
          .select("id")
          .in("status", ["pending", "confirmed"])
          .gte("event_date", dateKey(today))
          .lte("event_date", dateKey(inThreeDays)),
        supabase
          .from("reservations")
          .select("id,service_fee,amount_paid,reservation_items(quantity,unit_price)")
          .in("status", ["pending", "confirmed"])
          .gte("event_date", dateKey(today))
          .lte("event_date", dateKey(inThirtyDays)),
        supabase
          .from("products")
          .select("id,stock_quantity,minimum_stock,maintenance_status")
          .eq("active", true),
      ]);

      const productAlerts = ((products.data ?? []) as ProductAlert[]).filter((product) =>
        Number(product.stock_quantity ?? 0) <= Number(product.minimum_stock ?? 5) ||
        (product.maintenance_status ?? "disponivel") !== "disponivel"
      ).length;
      const count = Number(stored.count ?? 0) + (upcoming.data?.length ?? 0) + ((balances.data ?? []) as ReservationAlert[]).filter(hasBalance).length + productAlerts;

      if (active) setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();
    const interval = window.setInterval(() => void loadUnreadCount(), 30000);
    window.addEventListener("focus", loadUnreadCount);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, []);

  return (
    <Link
      href="/admin/notificacoes"
      aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black leading-5 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
