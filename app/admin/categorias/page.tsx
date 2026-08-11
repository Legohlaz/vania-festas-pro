"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderTree,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
};

type StatusFilter =
  | "todos"
  | "ativas"
  | "inativas";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function CategoriasPage() {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [updatingCategoryId, setUpdatingCategoryId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data, error } =
        await supabase
          .from("categories")
          .select(`
            id,
            name,
            description,
            active
          `)
          .order("name");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setCategories(
        (data ?? []) as Category[]
      );

      setLoading(false);
    }

    loadCategories();
  }, []);

  const filteredCategories =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search);

      return categories.filter(
        (category) => {
          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            normalizeText(
              category.name
            ).includes(
              normalizedSearch
            );

          const matchesStatus =
            statusFilter ===
              "todos" ||
            (statusFilter ===
              "ativas" &&
              category.active ===
                true) ||
            (statusFilter ===
              "inativas" &&
              category.active !==
                true);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      categories,
      search,
      statusFilter,
    ]);

  const hasFilters =
    search.length > 0 ||
    statusFilter !== "todos";

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
  }

  async function toggleStatus(
    category: Category
  ) {
    const supabase = createClient();
    const newStatus =
      category.active !== true;

    setUpdatingCategoryId(
      category.id
    );

    const { error } =
      await supabase
        .from("categories")
        .update({
          active: newStatus,
        })
        .eq("id", category.id);

    if (!error) {
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? {
                ...item,
                active: newStatus,
              }
            : item
        )
      );
    }

    setUpdatingCategoryId(null);
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800"
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
              <FolderTree size={18} />
              Administração
            </div>

            <h1
              className="text-4xl font-black"
              style={{
                marginTop: "12px",
              }}
            >
              Categorias
            </h1>

            <p
              className="text-base text-gray-600"
              style={{
                marginTop: "12px",
              }}
            >
              Gerencie todas as
              categorias do catálogo.
            </p>
          </div>

          <Link
            href="/admin/categorias/nova"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <Plus size={18} />
            Nova categoria
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
                Carregando categorias...
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
            categories.length > 0 && (
              <>
                <div
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                  style={{
                    padding: "20px",
                  }}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
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
                        placeholder="Buscar categoria..."
                        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        style={{
                          paddingLeft: "48px",
                        }}
                      />
                    </div>

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

                      <option value="ativas">
                        Ativas
                      </option>

                      <option value="inativas">
                        Inativas
                      </option>
                    </select>
                  </div>

                  <div
                    className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SlidersHorizontal
                        size={16}
                      />

                      <span>
                        {filteredCategories.length ===
                        1
                          ? "1 categoria encontrada"
                          : `${filteredCategories.length} categorias encontradas`}
                      </span>

                      {hasFilters && (
                        <span className="text-gray-400">
                          de {categories.length}
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

                {filteredCategories.length ===
                  0 && (
                  <div
                    className="mt-5 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"
                  >
                    <Search
                      size={30}
                      className="mx-auto text-gray-300"
                    />

                    <h2 className="mt-4 text-lg font-black">
                      Nenhuma categoria encontrada
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Tente alterar a busca ou os filtros.
                    </p>
                  </div>
                )}

                {filteredCategories.length > 0 && (
                  <div
                    className="mt-5 flex flex-col gap-4"
                  >
                    {filteredCategories.map(
                      (category) => (
                        <div
                          key={category.id}
                          className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white shadow-sm md:flex-row md:items-center"
                          style={{
                            padding: "20px",
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Categoria
                            </p>

                            <h2
                              className="text-lg font-black text-gray-900"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              {category.name}
                            </h2>

                            <p
                              className="text-sm text-gray-500"
                              style={{
                                marginTop: "8px",
                              }}
                            >
                              {category.description ??
                                "Sem descrição"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() =>
                                toggleStatus(category)
                              }
                              disabled={
                                updatingCategoryId ===
                                category.id
                              }
                              aria-pressed={
                                category.active === true
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                              title={
                                category.active
                                  ? "Clique para desativar"
                                  : "Clique para ativar"
                              }
                            >
                              <span
                                className={
                                  category.active
                                    ? "relative h-5 w-9 rounded-full bg-emerald-600 transition"
                                    : "relative h-5 w-9 rounded-full bg-gray-300 transition"
                                }
                              >
                                <span
                                  className={
                                    category.active
                                      ? "absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                      : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                  }
                                />
                              </span>

                              <span
                                className={
                                  category.active
                                    ? "text-sm font-bold text-emerald-700"
                                    : "text-sm font-bold text-gray-500"
                                }
                              >
                                {updatingCategoryId ===
                                category.id
                                  ? "Salvando..."
                                  : category.active
                                    ? "Ativa"
                                    : "Inativa"}
                              </span>
                            </button>

                            <Link
                              href={`/admin/categorias/${category.id}/editar`}
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
            categories.length === 0 && (
              <div
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                style={{
                  padding: "28px",
                }}
              >
                <p className="text-sm text-gray-500">
                  Nenhuma categoria cadastrada.
                </p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
