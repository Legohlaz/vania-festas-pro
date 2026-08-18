"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronDown,
  Menu,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { Container } from "@/components/common/Container";

const SELECTION_STORAGE_KEY =
  "vania-festas-minha-selecao";

const SELECTION_UPDATED_EVENT =
  "vania-festas-selection-updated";

const navigation = [
  {
    label: "Início",
    href: "/",
  },
  {
    label: "Catálogo",
    href: "/catalogo",
  },
  {
    label: "Serviços",
    href: "/servicos",
  },
  {
    label: "Contato",
    href: "/contato",
  },
];

export function Header() {
  const [selectionCount, setSelectionCount] =
    useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  function updateSelectionCount() {
    try {
      const savedSelection =
        window.localStorage.getItem(
          SELECTION_STORAGE_KEY
        );

      if (!savedSelection) {
        setSelectionCount(0);
        return;
      }

      const parsedSelection =
        JSON.parse(savedSelection);

      if (!Array.isArray(parsedSelection)) {
        setSelectionCount(0);
        return;
      }

      setSelectionCount(
        parsedSelection.length
      );
    } catch (error) {
      console.error(
        "Erro ao carregar Minha seleção no Header:",
        error
      );

      setSelectionCount(0);
    }
  }

  useEffect(() => {
    queueMicrotask(updateSelectionCount);

    function handleStorageChange(
      event: StorageEvent
    ) {
      if (
        event.key ===
        SELECTION_STORAGE_KEY
      ) {
        updateSelectionCount();
      }
    }

    function handleSelectionUpdated() {
      updateSelectionCount();
    }

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    window.addEventListener(
      SELECTION_UPDATED_EVENT,
      handleSelectionUpdated
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      window.removeEventListener(
        SELECTION_UPDATED_EVENT,
        handleSelectionUpdated
      );
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-md">
      <Container>
        <div className="flex h-20 items-center justify-between gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0"
          >
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight text-emerald-900">
                Vânia Festas
              </span>

              <span className="mb-1 text-sm font-semibold text-emerald-600">
                Pro
              </span>
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden flex-1 items-center justify-center gap-8 lg:flex xl:gap-10">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-700"
              >
                {item.label}
              </Link>
            ))}

            <div className="relative">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen((current) => !current)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-emerald-700"
              >
                Mais
                <ChevronDown
                  size={16}
                  className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>

              {moreOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-3 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-xl">
                  <Link
                    href="/catalogo?selecao=aberta"
                    onClick={() => setMoreOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    Minha seleção
                  </Link>
                  <Link
                    href="/contato"
                    onClick={() => setMoreOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    Falar pelo WhatsApp
                  </Link>
                  <Link
                    href="/area-cliente"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <UserRound className="h-4 w-4" />
                    Área do cliente
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Ações */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/area-cliente"
              title="Área do cliente"
              className="hidden items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100 lg:inline-flex"
            >
              <UserRound className="h-4 w-4" />
              Área do cliente
            </Link>
            {/* Minha seleção */}
            <Link
              href="/catalogo?selecao=aberta"
              aria-label={
                selectionCount > 0
                  ? `Minha seleção com ${selectionCount} produtos`
                  : "Minha seleção"
              }
              title="Minha seleção"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
            >
              <ShoppingBag size={20} />

              {selectionCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-300 px-1.5 text-xs font-black text-emerald-950 shadow-sm">
                  {selectionCount > 99
                    ? "99+"
                    : selectionCount}
                </span>
              )}
            </Link>

            <Link
              href="/catalogo"
              className="hidden rounded-xl border border-emerald-700 px-5 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 lg:inline-flex"
            >
              Ver catálogo
            </Link>

            <Link
              href="/contato"
              className="hidden rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 sm:inline-flex"
            >
              Solicitar orçamento
            </Link>

            <Link
              href="/area-cliente"
              aria-label="Área do cliente"
              title="Área do cliente"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 lg:hidden"
            >
              <UserRound size={20} />
            </Link>

            <button
              type="button"
              aria-label="Abrir menu"
              className="rounded-xl p-2.5 text-emerald-900 transition-colors hover:bg-emerald-50 lg:hidden"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </Container>
    </header>
  );
}
