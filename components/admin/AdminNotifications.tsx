"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUnreadCount() {
      const { count } = await supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);

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
