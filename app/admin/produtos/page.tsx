"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  CopyPlus,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
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

type ProductCopySource = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  search_keywords: string[] | null;
  category: string | null;
  event_type: string[] | null;
  price: number | null;
  image_url: string | null;
};

type ProductImage = {
  image_url: string;
  position: number;
};

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

  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  const [updatingProductId, setUpdatingProductId] =
    useState<string | null>(null);

  const [duplicatingProductId, setDuplicatingProductId] =
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

  const stockSummary = useMemo(() => {
    const active = products.filter(
      (product) => product.active === true
    ).length;

    const inactive = products.length - active;

    const outOfStock = products.filter(
      (product) => (product.stock_quantity ?? 0) <= 0
    ).length;

    const lowStock = products.filter((product) => {
      const quantity = product.stock_quantity ?? 0;

      return quantity > 0 && quantity <= 5;
    }).length;

    return {
      active,
      inactive,
      outOfStock,
      lowStock,
    };
  }, [products]);

  function clearFilters() {
    setSearch("");
    setCategoryFilter("todas");
    setStatusFilter("todos");
  }

  function getStorageFilePath(imageUrl: string | null) {
    if (!imageUrl) {
      return null;
    }

    const marker = "/storage/v1/object/public/products/";
    const markerIndex = imageUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedFilePath = imageUrl.substring(
      markerIndex + marker.length
    );

    return decodeURIComponent(encodedFilePath.split("?")[0]) || null;
  }

  async function duplicateProduct(product: Product) {
    const confirmed = window.confirm(
      `Criar uma cópia de "${product.name}"?\n\nA nova cópia ficará inativa e sem estoque para você revisar antes de publicar.`
    );

    if (!confirmed) {
      return;
    }

    setActionMessage(null);
    setDuplicatingProductId(product.id);

    const supabase = createClient();
    const timestamp = Date.now();
    const copiedFilePaths: string[] = [];
    let createdProductId: string | null = null;

    try {
      const { data: sourceData, error: sourceError } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, search_keywords, category, event_type, price, image_url"
        )
        .eq("id", product.id)
        .single();

      if (sourceError || !sourceData) {
        throw new Error(
          `Não foi possível carregar o produto para duplicar: ${sourceError?.message ?? "produto não encontrado"}`
        );
      }

      const source = sourceData as ProductCopySource;

      const { data: sourceGallery, error: galleryError } = await supabase
        .from("product_images")
        .select("image_url, position")
        .eq("product_id", source.id)
        .order("position");

      if (galleryError) {
        throw new Error(
          `Não foi possível carregar as fotos do produto: ${galleryError.message}`
        );
      }

      const copySlug = `${source.slug}-copia-${timestamp}`;

      async function copyImageUrl(
        imageUrl: string,
        suffix: string
      ) {
        const sourcePath = getStorageFilePath(imageUrl);

        // URLs externas não podem ser copiadas pelo Storage. Mantemos a referência
        // para que o cadastro continue funcional e possa ser substituído depois.
        if (!sourcePath) {
          return imageUrl;
        }

        const extension = sourcePath.split(".").pop() ?? "jpg";
        const destinationPath = `copias/${copySlug}-${suffix}.${extension}`;

        const { error: copyError } = await supabase.storage
          .from("products")
          .copy(sourcePath, destinationPath);

        if (copyError) {
          throw new Error(
            `Não foi possível copiar uma das imagens: ${copyError.message}`
          );
        }

        copiedFilePaths.push(destinationPath);

        return supabase.storage
          .from("products")
          .getPublicUrl(destinationPath).data.publicUrl;
      }

      const copiedPrimaryImage = source.image_url
        ? await copyImageUrl(source.image_url, "capa")
        : null;

      const copiedGallery = await Promise.all(
        ((sourceGallery ?? []) as ProductImage[]).map(
          async (image, index) => ({
            image_url: await copyImageUrl(
              image.image_url,
              `galeria-${index}`
            ),
            position: image.position,
          })
        )
      );

      const { data: createdProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          name: `Cópia de ${source.name}`,
          slug: copySlug,
          description: source.description,
          search_keywords: source.search_keywords ?? [],
          category: source.category,
          event_type: source.event_type ?? [],
          price: source.price,
          stock_quantity: 0,
          image_url: copiedPrimaryImage,
          featured: false,
          active: false,
        })
        .select("id")
        .single();

      if (insertError || !createdProduct) {
        throw new Error(
          `Não foi possível criar a cópia: ${insertError?.message ?? "produto não identificado"}`
        );
      }

      createdProductId = String(createdProduct.id);

      if (copiedGallery.length > 0) {
        const { error: galleryInsertError } = await supabase
          .from("product_images")
          .insert(
            copiedGallery.map((image) => ({
              product_id: createdProduct.id,
              image_url: image.image_url,
              position: image.position,
            }))
          );

        if (galleryInsertError) {
          throw new Error(
            `A cópia foi criada, mas não foi possível salvar as fotos: ${galleryInsertError.message}`
          );
        }
      }

      window.location.href = `/admin/produtos/${createdProduct.id}/editar`;
    } catch (error) {
      if (createdProductId) {
        await supabase
          .from("products")
          .delete()
          .eq("id", createdProductId);
      }

      if (copiedFilePaths.length > 0) {
        await supabase.storage
          .from("products")
          .remove(copiedFilePaths);
      }

      console.error("Erro ao duplicar produto:", error);

      setActionMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível duplicar o produto. Tente novamente."
      );

      setDuplicatingProductId(null);
    }
  }

  async function toggleProductStatus(
    product: Product
  ) {
    const newStatus = product.active !== true;

    setActionMessage(null);
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

      setActionMessage(
        `Não foi possível ${
          newStatus ? "ativar" : "desativar"
        } o produto. Tente novamente.`
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

    setActionMessage(
      `${product.name} foi ${
        newStatus ? "ativado" : "desativado"
      } com sucesso.`
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
          {actionMessage && (
            <div
              role="status"
              className={`mb-5 flex items-center justify-between gap-4 rounded-xl border p-4 text-sm font-semibold ${
                actionMessage.includes("Não foi possível")
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p>{actionMessage}</p>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="shrink-0 text-xs font-bold underline"
              >
                Fechar
              </button>
            </div>
          )}

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

          {/* Visão rápida do catálogo */}
          {!loading &&
            !errorMessage &&
            products.length > 0 && (
              <section
                aria-label="Resumo do catálogo"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                style={{ marginBottom: "20px" }}
              >
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <Package size={20} className="text-violet-600" />
                  <p className="mt-4 text-sm font-semibold text-gray-500">
                    Produtos cadastrados
                  </p>
                  <p className="mt-1 text-3xl font-black text-gray-900">
                    {products.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                  <CheckCircle2 size={20} className="text-emerald-700" />
                  <p className="mt-4 text-sm font-semibold text-emerald-800">
                    Ativos no catálogo
                  </p>
                  <p className="mt-1 text-3xl font-black text-emerald-900">
                    {stockSummary.active}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                  <CircleOff size={20} className="text-gray-600" />
                  <p className="mt-4 text-sm font-semibold text-gray-600">
                    Inativos
                  </p>
                  <p className="mt-1 text-3xl font-black text-gray-900">
                    {stockSummary.inactive}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <TriangleAlert size={20} className="text-amber-700" />
                  <p className="mt-4 text-sm font-semibold text-amber-900">
                    Atenção ao estoque
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-950">
                    {stockSummary.outOfStock + stockSummary.lowStock}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    {stockSummary.outOfStock} sem estoque · {stockSummary.lowStock} baixo
                  </p>
                </div>
              </section>
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
                      (product) => {
                        const quantity = product.stock_quantity ?? 0;
                        const stockLabel =
                          quantity <= 0
                            ? "Sem estoque"
                            : quantity <= 5
                              ? "Estoque baixo"
                              : "Estoque disponível";

                        const stockClassName =
                          quantity <= 0
                            ? "bg-red-50 text-red-700"
                            : quantity <= 5
                              ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-800";

                        return (
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

                            <div
                              className="flex flex-wrap items-center gap-2"
                              style={{ marginTop: "10px" }}
                            >
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockClassName}`}
                              >
                                {stockLabel}
                              </span>
                              <span className="text-sm font-semibold text-gray-500">
                                {quantity} {quantity === 1 ? "unidade" : "unidades"}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex flex-wrap items-center gap-3">
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

                            <button
                              type="button"
                              onClick={() => duplicateProduct(product)}
                              disabled={
                                duplicatingProductId === product.id
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                              title="Criar uma cópia para editar"
                            >
                              <CopyPlus size={16} />
                              {duplicatingProductId === product.id
                                ? "Duplicando..."
                                : "Duplicar"}
                            </button>

                            <Link
                              href={`/admin/produtos/${product.id}/editar`}
                              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              Editar
                            </Link>
                          </div>
                        </div>
                        );
                      }
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
