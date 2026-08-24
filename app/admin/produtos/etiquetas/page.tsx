"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, CheckSquare, Printer, QrCode, Search, Square } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  stock_quantity: number | null;
};

export default function EtiquetasQrPage() {
  const siteUrl = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => ""
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error: queryError } = await createClient()
        .from("products")
        .select("id,name,slug,category,stock_quantity")
        .eq("active", true)
        .order("name");

      if (queryError) setError(queryError.message);
      else setProducts((data ?? []) as Product[]);
      setLoading(false);
    }

    const initialLoad = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) =>
      !term ||
      `${product.name} ${product.category ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(term)
    );
  }, [products, search]);
  const chosen = products.filter((product) => selected.includes(product.id));

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function toggleVisible() {
    setSelected((current) =>
      visible.every((product) => current.includes(product.id))
        ? current.filter((id) => !visible.some((product) => product.id === id))
        : Array.from(
            new Set([...current, ...visible.map((product) => product.id)])
          )
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/admin/produtos"
          className="no-print inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft size={16} /> Voltar para produtos
        </Link>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">
              Operação
            </p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">
              Etiquetas QR em lote
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Selecione os produtos e imprima as etiquetas para organizar o estoque.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!chosen.length}
            className="no-print inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Printer size={17} /> Imprimir {chosen.length || ""} etiquetas
          </button>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produto"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={toggleVisible}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800"
            >
              {visible.every((product) => selected.includes(product.id)) ? (
                <CheckSquare size={17} />
              ) : (
                <Square size={17} />
              )}
              Selecionar resultados ({visible.length})
            </button>
            {loading && <p className="mt-5 text-sm text-slate-500">Carregando produtos...</p>}
            {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
            <div className="mt-4 divide-y divide-slate-100">
              {visible.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center justify-between gap-3 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      onChange={() => toggle(product.id)}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    <span>
                      <strong className="block truncate text-sm text-slate-800">{product.name}</strong>
                      <span className="text-xs text-slate-500">
                        {product.category || "Sem categoria"} · {product.stock_quantity ?? 0} un.
                      </span>
                    </span>
                  </span>
                  <QrCode size={17} className="text-emerald-700" />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="no-print font-bold text-slate-900">Prévia de impressão</h2>
            {chosen.length === 0 ? (
              <p className="no-print mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Selecione um ou mais produtos para criar as etiquetas.
              </p>
            ) : (
              <div className="labels-grid mt-4 grid gap-4">
                {chosen.map((product) => (
                  <article
                    key={product.id}
                    className="print-label rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-black text-slate-900">{product.name}</p>
                      <p className="mt-2 text-xs font-bold tracking-[.12em] text-emerald-800">
                        VF-{String(product.id).padStart(5, "0")}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Vânia Festas Pro</p>
                    </div>
                    {siteUrl && (
                      <QRCodeSVG
                        value={`${siteUrl}/catalogo/${product.slug}`}
                        size={112}
                        level="M"
                        includeMargin
                        fgColor="#064e3b"
                      />
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .labels-grid { grid-template-columns: repeat(2, 70mm); gap: 5mm; }
          .print-label {
            width: 70mm;
            min-height: 48mm;
            display: grid;
            grid-template-columns: 1fr 30mm;
            align-items: center;
            border: 1px solid #cbd5e1 !important;
            page-break-inside: avoid;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </main>
  );
}
