"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { Container } from "@/components/common/Container";

const SELECTION_STORAGE_KEY = "vania-festas-minha-selecao";
const SELECTION_UPDATED_EVENT = "vania-festas-selection-updated";
const navigation = [
  { label: "Início", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Serviços", href: "/servicos" },
  { label: "Contato", href: "/contato" },
];

export function Header() {
  const [selectionCount, setSelectionCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function updateSelectionCount() {
      try {
        const saved = window.localStorage.getItem(SELECTION_STORAGE_KEY);
        const selection = saved ? JSON.parse(saved) : [];
        setSelectionCount(Array.isArray(selection) ? selection.length : 0);
      } catch {
        setSelectionCount(0);
      }
    }
    function handleStorage(event: StorageEvent) {
      if (event.key === SELECTION_STORAGE_KEY || event.key === null) updateSelectionCount();
    }
    queueMicrotask(updateSelectionCount);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SELECTION_UPDATED_EVENT, updateSelectionCount);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SELECTION_UPDATED_EVENT, updateSelectionCount);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen && !mobileOpen) return;
    function dismissOutside(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
        setMobileOpen(false);
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (mobileOpen) menuButton.current?.focus();
      else moreButton.current?.focus();
      setMoreOpen(false);
      setMobileOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [moreOpen, mobileOpen]);

  function closeMenus() {
    setMoreOpen(false);
    setMobileOpen(false);
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/95 backdrop-blur-md">
      <Container className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex h-[72px] items-center justify-between gap-2 sm:gap-5 lg:h-20">
          <Link href="/" onClick={closeMenus} className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            <span className="text-xl font-black tracking-tight text-emerald-900 sm:text-2xl">Vânia Festas</span>
            <span className="ml-2 hidden text-[10px] font-bold tracking-wider text-emerald-600 sm:inline">PRO</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden min-w-0 items-center justify-center gap-5 lg:flex xl:gap-7">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenus} className="rounded-sm text-xs font-medium text-slate-600 transition-colors hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
                {item.label}
              </Link>
            ))}
            <div className="relative">
              <button
                ref={moreButton}
                type="button"
                aria-expanded={moreOpen}
                aria-controls="header-more"
                onClick={() => { setMoreOpen(!moreOpen); setMobileOpen(false); }}
                className="flex min-h-11 items-center gap-1 rounded-sm text-xs font-medium text-slate-600 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                Mais <ChevronDown size={14} aria-hidden="true" className={moreOpen ? "rotate-180" : ""} />
              </button>
              {moreOpen && (
                <div id="header-more" className="absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2 rounded-xl border border-emerald-100 bg-white p-2 shadow-xl">
                  <Link href="/catalogo?selecao=aberta" onClick={closeMenus} className="block rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-emerald-50">Minha seleção</Link>
                  <Link href="/contato" onClick={closeMenus} className="block rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-emerald-50">Falar pelo WhatsApp</Link>
                  <Link href="/area-cliente" onClick={closeMenus} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-emerald-50"><UserRound size={16} aria-hidden="true" /> Área do cliente</Link>
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link href="/area-cliente" onClick={closeMenus} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-800/25 bg-emerald-50/60 px-2 text-[10px] font-bold text-emerald-900 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-xs">
              <UserRound size={15} aria-hidden="true" /> Área do cliente
            </Link>
            <Link
              href="/catalogo?selecao=aberta"
              onClick={closeMenus}
              aria-label={selectionCount > 0 ? "Minha seleção com " + selectionCount + " produtos" : "Minha seleção"}
              className="relative hidden h-11 w-11 items-center justify-center rounded-lg border border-emerald-100 text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700 min-[400px]:inline-flex"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {selectionCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white">{selectionCount > 99 ? "99+" : selectionCount}</span>}
            </Link>
            <Link href="/contato" onClick={closeMenus} className="hidden min-h-11 items-center rounded-lg bg-emerald-800 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-900 sm:inline-flex">
              Solicitar orçamento
            </Link>
            <button
              ref={menuButton}
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              aria-controls="header-mobile"
              onClick={() => { setMobileOpen(!mobileOpen); setMoreOpen(false); }}
              className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700 lg:hidden"
            >
              {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </Container>

      {mobileOpen && (
        <nav id="header-mobile" aria-label="Navegação no celular" className="absolute inset-x-0 top-full max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-emerald-100 bg-white px-5 pb-5 pt-2 shadow-lg lg:hidden">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenus} className="block rounded-xl px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-50">{item.label}</Link>
          ))}
          <Link href="/catalogo?selecao=aberta" onClick={closeMenus} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-50">
            <ShoppingBag size={17} aria-hidden="true" /> Minha seleção {selectionCount > 0 && "(" + selectionCount + ")"}
          </Link>
          <Link href="/area-cliente" onClick={closeMenus} className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900"><UserRound size={17} aria-hidden="true" /> Área do cliente</Link>
          <Link href="/contato" onClick={closeMenus} className="mt-2 block rounded-xl bg-emerald-800 px-4 py-3 text-center text-sm font-bold text-white">Solicitar orçamento</Link>
        </nav>
      )}
    </header>
  );
}
