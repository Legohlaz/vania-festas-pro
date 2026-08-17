"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, LayoutDashboard, Package, PartyPopper, Truck, Users, WalletCards } from "lucide-react";
import { AdminNotifications } from "@/components/admin/AdminNotifications";

const links = [
  { href: "/admin/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/admin/logistica", label: "Logística", icon: Truck },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/admin/financeiro", label: "Financeiro", icon: WalletCards },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur"
      style={{ boxShadow: "0 1px 10px rgba(15, 23, 42, 0.06)" }}
    >
      <div
        className="mx-auto flex max-w-none items-center gap-3 overflow-x-auto px-4 py-3 sm:gap-4 sm:px-8"
        style={{ minHeight: "76px" }}
      >
        <Link href="/admin/dashboard" className="mr-1 inline-flex shrink-0 items-center gap-3 text-emerald-950 sm:mr-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white">
            <PartyPopper size={20} />
          </span>
          <span className="leading-tight">
            <strong className="block text-base font-black">Vânia Festas</strong>
            <span className="text-xs font-semibold text-gray-500">Administração</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label="Navegação administrativa">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-800 text-white"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AdminNotifications />
          <Link href="/" className="inline-flex h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">
          Ver site
          </Link>
        </div>
      </div>
    </header>
  );
}
