"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Supplier = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  active: boolean | null;
};

type StatusFilter =
  | "todos"
  | "ativos"
  | "inativos";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [updatingSupplierId, setUpdatingSupplierId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");

  useEffect(() => {
    async function loadSuppliers() {
      const supabase = createClient();
      const { data, error } =
        await supabase
          .from("suppliers")
          .select(`
            id,
            company_name,
            contact_name,
            phone,
            city,
            active
          `)
          .order("company_name");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSuppliers(
        (data ?? []) as Supplier[]
      );

      setLoading(false);
    }

    loadSuppliers();
  }, []);

  const filteredSuppliers =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search);

      return suppliers.filter(
        (supplier) => {
          const matchesSearch =
            normalizedSearch.length === 0 ||
            normalizeText(
              supplier.company_name
            ).includes(normalizedSearch) ||
            normalizeText(
              supplier.contact_name ?? ""
            ).includes(normalizedSearch);

          const matchesStatus =
            statusFilter === "todos" ||
            (statusFilter === "ativos" &&
              supplier.active === true) ||
            (statusFilter === "inativos" &&
              supplier.active !== true);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      suppliers,
      search,
      statusFilter,
    ]);

  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "todos";

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
  }

  async function toggleSupplierStatus(
    supplier: Supplier
  ) {
    const supabase = createClient();
    const newStatus =
      supplier.active !== true;

    setUpdatingSupplierId(
      supplier.id
    );

    const { error } =
      await supabase
        .from("suppliers")
        .update({
          active: newStatus,
        })
        .eq("id", supplier.id);

    if (!error) {
      setSuppliers((current) =>
        current.map((item) =>
          item.id === supplier.id
            ? {
                ...item,
                active: newStatus,
              }
            : item
        )
      );
    }

    setUpdatingSupplierId(null);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto w-full max-w-7xl"
        style={{
          padding: "48px 32px",
        }}
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Voltar ao painel
        </Link>

        <div
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{
            marginTop: "40px",
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              <Building2 size={18} />
              Administração
            </div>

            <h1
              className="text-4xl font-black"
              style={{
                marginTop: "12px",
              }}
            >
              Fornecedores
            </h1>

            <p
              className="text-base text-gray-600"
              style={{
                marginTop: "12px",
              }}
            >
              Gerencie todos os fornecedores cadastrados.
            </p>
          </div>

          <Link
            href="/admin/fornecedores/novo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <Plus size={18} />
            Novo fornecedor
          </Link>
        </div>

        <div
          style={{
            marginTop: "40px",
          }}
        >
          {/* Loading */}
          {loading && (
            <div
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              style={{
                padding: "28px",
              }}
            >
              <p className="text-sm text-gray-500">
                Carregando fornecedores...
              </p>
            </div>
          )}

          {/* Erro */}
          {!loading && errorMessage && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
              style={{
                padding: "16px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {!loading &&
            !errorMessage &&
            suppliers.length > 0 && (
              <>
                <div
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                  style={{
                    padding: "20px",
                  }}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    {/* Busca */}
                    <div className="relative">
                      <Search
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Buscar fornecedor..."
                        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        style={{
                          paddingLeft: "48px",
                        }}
                      />
                    </div>

                    {/* Status */}
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as StatusFilter
                        )
                      }
                      className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todos">
                        Todos os status
                      </option>

                      <option value="ativos">
                        Ativos
                      </option>

                      <option value="inativos">
                        Inativos
                      </option>
                    </select>
                  </div>

                  <div
                    className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SlidersHorizontal size={16} />

                      <span>
                        {filteredSuppliers.length === 1
                          ? "1 fornecedor encontrado"
                          : `${filteredSuppliers.length} fornecedores encontrados`}
                      </span>

                      {hasFilters && (
                        <span className="text-gray-400">
                          de {suppliers.length}
                        </span>
                      )}
                    </div>

                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>

                {filteredSuppliers.length === 0 && (
                  <div
                    className="mt-5 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"
                  >
                    <Search
                      size={30}
                      className="mx-auto text-gray-300"
                    />

                    <h2 className="mt-4 text-lg font-black">
                      Nenhum fornecedor encontrado
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Tente alterar a busca ou os filtros.
                    </p>
                  </div>
                )}

                {filteredSuppliers.length > 0 && (
                  <div className="mt-5 flex flex-col gap-4">
                    {filteredSuppliers.map(
                      (supplier) => (
                        <div
                          key={supplier.id}
                          className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white shadow-sm md:flex-row md:items-center"
                          style={{
                            padding: "20px",
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Fornecedor
                            </p>

                            <h2
                              className="text-lg font-black text-gray-900"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              {supplier.company_name}
                            </h2>

                            <p
                              className="mt-2 text-sm text-gray-600"
                            >
                              Responsável: {" "}
                              {supplier.contact_name ??
                                "Não informado"}
                            </p>

                            <p
                              className="mt-1 text-sm text-gray-600"
                            >
                              Telefone: {" "}
                              {supplier.phone ??
                                "Não informado"}
                            </p>

                            <p
                              className="mt-1 text-sm text-gray-600"
                            >
                              Cidade: {" "}
                              {supplier.city ??
                                "Não informada"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() =>
                                toggleSupplierStatus(
                                  supplier
                                )
                              }
                              disabled={
                                updatingSupplierId ===
                                supplier.id
                              }
                              aria-pressed={
                                supplier.active === true
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                              title={
                                supplier.active
                                  ? "Clique para desativar"
                                  : "Clique para ativar"
                              }
                            >
                              <span
                                className={
                                  supplier.active
                                    ? "relative h-5 w-9 rounded-full bg-emerald-600 transition"
                                    : "relative h-5 w-9 rounded-full bg-gray-300 transition"
                                }
                              >
                                <span
                                  className={
                                    supplier.active
                                      ? "absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                      : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                  }
                                />
                              </span>

                              <span
                                className={
                                  supplier.active
                                    ? "text-sm font-bold text-emerald-700"
                                    : "text-sm font-bold text-gray-500"
                                }
                              >
                                {updatingSupplierId ===
                                supplier.id
                                  ? "Salvando..."
                                  : supplier.active
                                    ? "Ativo"
                                    : "Inativo"}
                              </span>
                            </button>

                            <Link
                              href={`/admin/fornecedores/${supplier.id}/editar`}
                              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              Editar
                            </Link>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}

          {!loading &&
            !errorMessage &&
            suppliers.length === 0 && (
              <div
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                style={{
                  padding: "28px",
                }}
              >
                <p className="text-sm text-gray-500">
                  Nenhum fornecedor cadastrado.
                </p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
