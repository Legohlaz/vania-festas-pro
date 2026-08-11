"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  stock_quantity: number | null;
  image_url: string | null;
  active: boolean | null;
};

type StatusFilter = "todos" | "ativos" | "inativos";

function formatPrice(price: number | null) {
  if (price === null || price === undefined) {
    return "Preço não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [updatingProductId, setUpdatingProductId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("todas");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, category, price, stock_quantity, image_url, active"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Erro ao carregar produtos:",
          error
        );

        setErrorMessage(
          `Erro ao carregar produtos: ${error.message}`
        );

        setLoading(false);
        return;
      }

      setProducts((data ?? []) as Product[]);
      setLoading(false);
    }

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => product.category)
          .filter(
            (category): category is string =>
              Boolean(category?.trim())
          )
      )
    );

    return uniqueCategories.sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeText(product.name).includes(
          normalizedSearch
        );

      const matchesCategory =
        categoryFilter === "todas" ||
        product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "ativos" &&
          product.active === true) ||
        (statusFilter === "inativos" &&
          product.active !== true);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    categoryFilter !== "todas" ||
    statusFilter !== "todos";

  function clearFilters() {
    setSearch("");
    setCategoryFilter("todas");
    setStatusFilter("todos");
  }

  async function toggleProductStatus(
    product: Product
  ) {
    const newStatus = product.active !== true;

    setUpdatingProductId(product.id);

    const supabase = createClient();

    const { error } = await supabase
      .from("products")
      .update({
        active: newStatus,
      })
      .eq("id", product.id);

    if (error) {
      console.error(
        "Erro ao atualizar status do produto:",
        error
      );

      window.alert(
        `Não foi possível ${
          newStatus ? "ativar" : "desativar"
        } o produto.`
      );

      setUpdatingProductId(null);
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? {
              ...currentProduct,
              active: newStatus,
            }
          : currentProduct
      )
    );

    setUpdatingProductId(null);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto w-full max-w-7xl"
        style={{
          padding: "48px 32px",
        }}
      >
        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Voltar para o site
        </Link>

        {/* Cabeçalho */}
        <div
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{
            marginTop: "40px",
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              <Package size={18} />
              Administração
            </div>

            <h1
              className="text-4xl font-black tracking-tight text-gray-900"
              style={{
                marginTop: "12px",
              }}
            >
              Produtos
            </h1>

            <p
              className="text-base text-gray-600"
              style={{
                marginTop: "12px",
              }}
            >
              Gerencie os produtos disponíveis no
              catálogo da Vânia Festas.
            </p>
          </div>

          <Link
            href="/admin/produtos/novo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <Plus size={18} />
            Novo produto
          </Link>
        </div>

        {/* Conteúdo */}
        <div style={{ marginTop: "40px" }}>
          {/* Carregando */}
          {loading && (
            <div
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              style={{
                padding: "28px",
              }}
            >
              <p className="text-sm text-gray-500">
                Carregando produtos...
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

          {/* Nenhum produto cadastrado */}
          {!loading &&
            !errorMessage &&
            products.length === 0 && (
              <div
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                style={{
                  padding: "28px",
                }}
              >
                <p className="text-sm text-gray-500">
                  Os produtos cadastrados aparecerão
                  aqui.
                </p>
              </div>
            )}

          {/* Produtos */}
          {!loading &&
            !errorMessage &&
            products.length > 0 && (
              <>
                {/* Busca e filtros */}
                <div
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                  style={{
                    padding: "20px",
                  }}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_220px]">
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
                        placeholder="Buscar produto..."
                        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        style={{
                          paddingLeft: "48px",
                        }}
                      />
                    </div>

                    {/* Categoria */}
                    <select
                      value={categoryFilter}
                      onChange={(event) =>
                        setCategoryFilter(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todas">
                        Todas as categorias
                      </option>

                      {categories.map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>

                    {/* Status */}
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target
                            .value as StatusFilter
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
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

                  {/* Resumo dos filtros */}
                  <div
                    className="flex flex-col gap-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      marginTop: "18px",
                      paddingTop: "16px",
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SlidersHorizontal size={16} />

                      <span>
                        {filteredProducts.length === 1
                          ? "1 produto encontrado"
                          : `${filteredProducts.length} produtos encontrados`}
                      </span>

                      {hasActiveFilters && (
                        <span className="text-gray-400">
                          de {products.length}
                        </span>
                      )}
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-fit text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Nenhum resultado */}
                {filteredProducts.length === 0 && (
                  <div
                    className="rounded-2xl border border-gray-200 bg-white text-center shadow-sm"
                    style={{
                      marginTop: "20px",
                      padding: "36px 28px",
                    }}
                  >
                    <Search
                      size={30}
                      className="mx-auto text-gray-300"
                    />

                    <h2
                      className="text-lg font-black text-gray-900"
                      style={{
                        marginTop: "14px",
                      }}
                    >
                      Nenhum produto encontrado
                    </h2>

                    <p
                      className="text-sm text-gray-500"
                      style={{
                        marginTop: "6px",
                      }}
                    >
                      Tente alterar a busca ou os
                      filtros selecionados.
                    </p>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                      style={{
                        marginTop: "18px",
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}

                {/* Lista */}
                {filteredProducts.length > 0 && (
                  <div
                    className="flex flex-col gap-4"
                    style={{
                      marginTop: "20px",
                    }}
                  >
                    {filteredProducts.map(
                      (product) => (
                        <div
                          key={product.id}
                          className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white shadow-sm md:flex-row md:items-center"
                          style={{
                            padding: "20px",
                          }}
                        >
                          {/* Imagem */}
                          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                            {product.image_url ? (
                              <Image
                                src={
                                  product.image_url
                                }
                                alt={product.name}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <Package
                                size={30}
                                className="text-gray-300"
                              />
                            )}
                          </div>

                          {/* Dados */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              {product.category ||
                                "Sem categoria"}
                            </p>

                            <h2
                              className="text-lg font-black text-gray-900"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              {product.name}
                            </h2>

                            <p
                              className="text-sm font-semibold text-gray-700"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              {formatPrice(
                                product.price
                              )}
                            </p>

                            <p
                              className="text-sm font-semibold text-gray-500"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              Estoque:{" "}
                              <span className="font-bold text-gray-700">
                                {product.stock_quantity ?? 0}{" "}
                                {(product.stock_quantity ?? 0) === 1
                                  ? "unidade"
                                  : "unidades"}
                              </span>
                            </p>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() =>
                                toggleProductStatus(
                                  product
                                )
                              }
                              disabled={
                                updatingProductId ===
                                product.id
                              }
                              aria-pressed={
                                product.active === true
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                              title={
                                product.active
                                  ? "Clique para desativar"
                                  : "Clique para ativar"
                              }
                            >
                              <span
                                className={
                                  product.active
                                    ? "relative h-5 w-9 rounded-full bg-emerald-600 transition"
                                    : "relative h-5 w-9 rounded-full bg-gray-300 transition"
                                }
                              >
                                <span
                                  className={
                                    product.active
                                      ? "absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                      : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition"
                                  }
                                />
                              </span>

                              <span
                                className={
                                  product.active
                                    ? "text-sm font-bold text-emerald-700"
                                    : "text-sm font-bold text-gray-500"
                                }
                              >
                                {updatingProductId ===
                                product.id
                                  ? "Salvando..."
                                  : product.active
                                    ? "Ativo"
                                    : "Inativo"}
                              </span>
                            </button>

                            <Link
                              href={`/admin/produtos/${product.id}/editar`}
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
        </div>
      </div>
    </main>
  );
}
