"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  MessageCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { Container } from "@/components/common/Container";
import { ProductCard } from "@/components/products/ProductCard";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string | number;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  event_type: string[] | null;
  price: number;
  image_url: string | null;
  featured: boolean;
  active: boolean;
};

type SelectedProduct = {
  id: string | number;
  name: string;
  slug: string;
  category: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type ProductAvailabilityRow = {
  product_id: string | number;
  available_quantity: number | string | null;
};

const SELECTION_STORAGE_KEY =
  "vania-festas-minha-selecao";

const SELECTION_UPDATED_EVENT =
  "vania-festas-selection-updated";

const WHATSAPP_NUMBER =
  "5571986093473";

const categories = [
  {
    label: "Todos",
    value: "todos",
  },
  {
    label: "Painéis",
    value: "paineis",
  },
  {
    label: "Mesas",
    value: "mesas",
  },
  {
    label: "Kits",
    value: "kits",
  },
  {
    label: "Balões",
    value: "baloes",
  },
  {
    label: "Decoração",
    value: "decoracao",
  },
  {
    label: "Acessórios",
    value: "acessorios",
  },
  {
    label: "Outros",
    value: "outros",
  },
];

const eventOptions = [
  {
    label: "Todos os eventos",
    value: "todos",
  },
  {
    label: "Festas e eventos",
    value: "festas-e-eventos",
  },
  {
    label: "Casamento",
    value: "casamento",
  },
  {
    label: "Festa infantil",
    value: "festa-infantil",
  },
  {
    label: "15 anos",
    value: "15-anos",
  },
  {
    label: "Formatura",
    value: "formatura",
  },
  {
    label: "Chá de fraldas",
    value: "cha-de-fraldas",
  },
  {
    label: "Chá revelação",
    value: "cha-revelacao",
  },
];

const priceOptions = [
  {
    label: "Qualquer preço",
    value: "todos",
  },
  {
    label: "Até R$ 150",
    value: "ate-150",
  },
  {
    label: "R$ 151 a R$ 250",
    value: "151-250",
  },
  {
    label: "Acima de R$ 250",
    value: "acima-250",
  },
];

const sortOptions = [
  {
    label: "Mais relevantes",
    value: "relevantes",
  },
  {
    label: "Menor preço",
    value: "menor-preco",
  },
  {
    label: "Maior preço",
    value: "maior-preco",
  },
  {
    label: "Nome A-Z",
    value: "nome",
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createFilterValue(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatEventDate(value: string) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchFromUrl =
    searchParams.get("busca") ?? "";

  const categoryFromUrl =
    searchParams.get("categoria") ?? "todos";

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [search, setSearch] =
    useState(searchFromUrl);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(categoryFromUrl);

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  /*
   * Filtros aplicados.
   */
  const [eventFilter, setEventFilter] =
    useState("todos");

  const [priceFilter, setPriceFilter] =
    useState("todos");

  const [sort, setSort] =
    useState("relevantes");

  /*
   * Filtros temporários do painel.
   */
  const [draftEvent, setDraftEvent] =
    useState("todos");

  const [draftPrice, setDraftPrice] =
    useState("todos");

  const [draftSort, setDraftSort] =
    useState("relevantes");

  /*
   * Minha seleção.
   */
  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState<SelectedProduct[]>([]);

  const [
    selectionLoaded,
    setSelectionLoaded,
  ] = useState(false);

  const [
    selectionOpen,
    setSelectionOpen,
  ] = useState(false);

  const [eventDate, setEventDate] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [reservationLoading, setReservationLoading] =
    useState(false);

  const [
    productAvailability,
    setProductAvailability,
  ] = useState<Record<string, number>>({});

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  /*
   * Consulta a disponibilidade dos produtos
   * para a data escolhida.
   */
  useEffect(() => {
    async function loadAvailability() {
      if (!eventDate) {
        setProductAvailability({});
        setAvailabilityError("");
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const supabase = createClient();

        const { data, error } = await supabase.rpc(
          "get_product_availability",
          {
            p_event_date: eventDate,
          }
        );

        if (error) {
          console.error("ERRO RPC DISPONIBILIDADE:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });

          throw error;
        }

        const availability: Record<string, number> = {};

        for (const item of (data ?? []) as ProductAvailabilityRow[]) {
          availability[String(item.product_id)] = Math.max(
            0,
            Number(item.available_quantity) || 0
          );
        }

        setProductAvailability(availability);
      } catch (error) {
        const rpcError = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };

        console.error("Erro ao consultar disponibilidade:", {
          message: rpcError?.message ?? "Erro desconhecido",
          details: rpcError?.details ?? null,
          hint: rpcError?.hint ?? null,
          code: rpcError?.code ?? null,
        });

        setProductAvailability({});
        setAvailabilityError(
          "Não foi possível consultar a disponibilidade para esta data."
        );
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadAvailability();
  }, [eventDate]);

  /*
   * Carrega a seleção salva no navegador.
   */
  useEffect(() => {
    try {
      const savedSelection =
        window.localStorage.getItem(
          SELECTION_STORAGE_KEY
        );

      if (savedSelection) {
        const parsedSelection =
          JSON.parse(savedSelection);

        if (Array.isArray(parsedSelection)) {
          queueMicrotask(() => {
            setSelectedProducts(
              parsedSelection.map((product: SelectedProduct) => ({
                ...product,
                quantity:
                  typeof product.quantity === "number" &&
                  product.quantity > 0
                    ? product.quantity
                    : 1,
              }))
            );
          });
        }
      }
    } catch (error) {
      console.error(
        "Erro ao carregar Minha seleção:",
        error
      );
    } finally {
      queueMicrotask(() => setSelectionLoaded(true));
    }
  }, []);

  /*
   * Salva a seleção no navegador sempre
   * que ela for alterada.
   */
  useEffect(() => {
    if (!selectionLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        SELECTION_STORAGE_KEY,
        JSON.stringify(selectedProducts)
      );

      window.dispatchEvent(
        new Event(SELECTION_UPDATED_EVENT)
      );
    } catch (error) {
      console.error(
        "Erro ao salvar Minha seleção:",
        error
      );
    }
  }, [
    selectedProducts,
    selectionLoaded,
  ]);

  /*
   * Abre automaticamente Minha seleção
   * quando o acesso vier pelo Header.
   */
  useEffect(() => {
    if (
      searchParams.get("selecao") ===
      "aberta"
    ) {
      queueMicrotask(() => setSelectionOpen(true));
    }
  }, [searchParams]);

  /*
   * Carrega os produtos do Supabase.
   */
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setLoadError("");

      try {
        const supabase = createClient();

        const { data, error } =
          await supabase
            .from("products")
            .select(
              `
                id,
                name,
                slug,
                description,
                category,
                event_type,
                price,
                image_url,
                featured,
                active
              `
            )
            .eq("active", true);

        if (error) {
          throw error;
        }

        setProducts(
          (data ?? []) as Product[]
        );
      } catch (error) {
        console.error(
          "Erro ao carregar produtos:",
          error
        );

        setLoadError(
          "Não foi possível carregar os produtos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  /*
   * Sincroniza pesquisa com a URL.
   */
  useEffect(() => {
    queueMicrotask(() => setSearch(searchFromUrl));
  }, [searchFromUrl]);

  /*
   * Sincroniza categoria com a URL.
   */
  useEffect(() => {
    const exists = categories.some(
      (category) =>
        category.value === categoryFromUrl
    );

    queueMicrotask(() => {
      setSelectedCategory(
        exists
          ? categoryFromUrl
          : "todos"
      );
    });
  }, [categoryFromUrl]);

  function updateUrl(
    nextSearch: string,
    nextCategory: string
  ) {
    const params =
      new URLSearchParams();

    const cleanSearch =
      nextSearch.trim();

    if (cleanSearch) {
      params.set(
        "busca",
        cleanSearch
      );
    }

    if (nextCategory !== "todos") {
      params.set(
        "categoria",
        nextCategory
      );
    }

    const query =
      params.toString();

    router.replace(
      query
        ? `/catalogo?${query}`
        : "/catalogo",
      {
        scroll: false,
      }
    );
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    updateUrl(
      search,
      selectedCategory
    );
  }

  function handleCategory(
    category: string
  ) {
    setSelectedCategory(category);

    updateUrl(
      search,
      category
    );
  }

  function openFilters() {
    setDraftEvent(eventFilter);
    setDraftPrice(priceFilter);
    setDraftSort(sort);

    setFiltersOpen(true);
  }

  function applyFilters() {
    setEventFilter(draftEvent);
    setPriceFilter(draftPrice);
    setSort(draftSort);

    setFiltersOpen(false);
  }

  function clearAdvancedFilters() {
    setDraftEvent("todos");
    setDraftPrice("todos");
    setDraftSort("relevantes");

    setEventFilter("todos");
    setPriceFilter("todos");
    setSort("relevantes");

    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setSearch("");
    setSelectedCategory("todos");

    setEventFilter("todos");
    setPriceFilter("todos");
    setSort("relevantes");

    setDraftEvent("todos");
    setDraftPrice("todos");
    setDraftSort("relevantes");

    router.replace(
      "/catalogo",
      {
        scroll: false,
      }
    );
  }

  /*
   * Adiciona produto à seleção.
   */
  function addToSelection(
    product: Product
  ) {
    setSelectedProducts(
      (currentProducts) => {
        const alreadySelected =
          currentProducts.some(
            (selectedProduct) =>
              String(
                selectedProduct.id
              ) ===
              String(product.id)
          );

        if (alreadySelected) {
          return currentProducts;
        }

        const selectedProduct: SelectedProduct =
          {
            id: product.id,
            name: product.name,
            slug: product.slug,
            category:
              product.category ??
              "Outros",
            price:
              Number(
                product.price
              ) || 0,
            imageUrl:
              product.image_url,
            quantity: 1,
          };

        return [
          ...currentProducts,
          selectedProduct,
        ];
      }
    );
  }

  /*
   * Altera a quantidade de um produto selecionado.
   */
  function changeProductQuantity(
    productId: string | number,
    amount: number
  ) {
    setSelectedProducts((currentProducts) =>
      currentProducts.map((product) => {
        if (String(product.id) !== String(productId)) {
          return product;
        }

        const nextQuantity = Math.max(
          1,
          product.quantity + amount
        );

        if (!eventDate || amount < 0) {
          return {
            ...product,
            quantity: nextQuantity,
          };
        }

        const availableQuantity =
          productAvailability[String(productId)];

        if (
          availableQuantity === undefined ||
          nextQuantity > availableQuantity
        ) {
          return product;
        }

        return {
          ...product,
          quantity: nextQuantity,
        };
      })
    );
  }

  /*
   * Remove um produto da seleção.
   */
  function removeFromSelection(
    productId: string | number
  ) {
    setSelectedProducts(
      (currentProducts) =>
        currentProducts.filter(
          (product) =>
            String(product.id) !==
            String(productId)
        )
    );
  }

  /*
   * Limpa toda a seleção.
   */
  function clearSelection() {
    const confirmed =
      window.confirm(
        "Deseja remover todos os produtos da sua seleção?"
      );

    if (!confirmed) {
      return;
    }

    setSelectedProducts([]);
  }

  function isProductSelected(
    productId: string | number
  ) {
    return selectedProducts.some(
      (product) =>
        String(product.id) ===
        String(productId)
    );
  }

  async function requestSelectionOnWhatsApp() {
    if (selectedProducts.length === 0) {
      return;
    }

    const cleanCustomerName = customerName.trim();
    const cleanCustomerPhone = customerPhone.trim();

    if (!cleanCustomerName) {
      window.alert(
        "Informe seu nome antes de solicitar o orçamento."
      );
      return;
    }

    if (!cleanCustomerPhone) {
      window.alert(
        "Informe seu WhatsApp antes de solicitar o orçamento."
      );
      return;
    }

    if (!eventDate) {
      window.alert(
        "Escolha a data do evento antes de solicitar o orçamento."
      );
      return;
    }

    if (availabilityLoading) {
      window.alert(
        "Aguarde a consulta de disponibilidade para a data escolhida."
      );
      return;
    }

    if (availabilityError) {
      window.alert(
        "Não foi possível confirmar a disponibilidade para esta data. Tente novamente."
      );
      return;
    }

    const unavailableProduct = selectedProducts.find(
      (product) => {
        const availableQuantity =
          productAvailability[String(product.id)];

        return (
          availableQuantity === undefined ||
          availableQuantity < product.quantity
        );
      }
    );

    if (unavailableProduct) {
      const availableQuantity =
        productAvailability[String(unavailableProduct.id)] ?? 0;

      window.alert(
        availableQuantity <= 0
          ? `${unavailableProduct.name} não está disponível para esta data.`
          : `${unavailableProduct.name}: há apenas ${availableQuantity} ${
              availableQuantity === 1 ? "unidade disponível" : "unidades disponíveis"
            } para esta data.`
      );
      return;
    }

    setReservationLoading(true);

    try {
      const supabase = createClient();

      const reservationItems = selectedProducts.map((product) => ({
        product_id: Number(product.id),
        quantity: product.quantity,
        unit_price: Number(product.price),
      }));

      const { data, error } = await supabase.rpc(
        "create_reservation",
        {
          p_customer_name: cleanCustomerName,
          p_customer_phone: cleanCustomerPhone,
          p_event_date: eventDate,
          p_notes: "Solicitação enviada pelo catálogo do Vânia Festas Pro.",
          p_items: reservationItems,
        }
      );

      if (error) {
        console.error("ERRO RPC CREATE_RESERVATION:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      const reservationId = Number(data);

      if (!Number.isFinite(reservationId)) {
        throw new Error("A reserva foi criada sem um identificador válido.");
      }

      const formattedDate = formatEventDate(eventDate);

      const productLines = selectedProducts
        .map((product, index) => {
          const quantity =
            typeof product.quantity === "number" && product.quantity > 0
              ? product.quantity
              : 1;

          const subtotal = Number(product.price) * quantity;

          return [
            `${index + 1}. ${product.name}`,
            `   ${quantity} ${
              quantity === 1 ? "unidade" : "unidades"
            } × ${formatPrice(Number(product.price))}`,
            `   Subtotal: ${formatPrice(subtotal)}`,
          ].join("\n");
        })
        .join("\n\n");

      const message = [
        "Olá! Gostaria de solicitar um orçamento para minha seleção no Vânia Festas Pro.",
        "",
        `Solicitação: #${reservationId}`,
        `Nome: ${cleanCustomerName}`,
        `WhatsApp: ${cleanCustomerPhone}`,
        `Data do evento: ${formattedDate}`,
        "",
        "Produtos selecionados:",
        "",
        productLines,
        "",
        "Valor total:",
        `${formatPrice(selectionTotal)}`,
        "",
        "Gostaria de confirmar a disponibilidade e o valor final para essa data.",
      ].join("\n");

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      const reservationError = error as {
        message?: string;
      };

      console.error("Erro ao criar solicitação de orçamento:", error);

      window.alert(
        reservationError?.message
          ? `Não foi possível registrar a solicitação: ${reservationError.message}`
          : "Não foi possível registrar a solicitação. Tente novamente."
      );
    } finally {
      setReservationLoading(false);
    }
  }

  const activeAdvancedFilters =
    eventFilter !== "todos" ||
    priceFilter !== "todos" ||
    sort !== "relevantes";

  /*
   * Soma apenas para referência visual.
   * Como os valores são "a partir de",
   * não tratamos isso como preço final.
   */
  const selectionTotal = selectedProducts.reduce(
    (total, product) =>
      total +
      Number(product.price) * product.quantity,
    0
  );

  /*
   * Filtra e ordena os produtos.
   */
  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search);

      const result =
        products.filter(
          (product) => {
            /*
             * Categoria do produto.
             */
            const productCategory =
              createFilterValue(
                product.category
              );

            const matchesCategory =
              selectedCategory ===
                "todos" ||
              productCategory ===
                selectedCategory;

            /*
             * Tipos de evento.
             */
            const productEvents =
              (
                product.event_type ??
                []
              ).map(
                (eventType) =>
                  createFilterValue(
                    eventType
                  )
              );

            /*
             * Pesquisa.
             */
            const searchableText =
              normalizeText(
                [
                  product.name,
                  product.description ??
                    "",
                  product.category ??
                    "",
                  ...(
                    product.event_type ??
                    []
                  ),
                ].join(" ")
              );

            const matchesSearch =
              !normalizedSearch ||
              searchableText.includes(
                normalizedSearch
              );

            /*
             * Evento.
             *
             * "Festas e eventos"
             * continua funcionando
             * como uso geral.
             */
            const matchesEvent =
              eventFilter ===
                "todos" ||
              productEvents.includes(
                "festas-e-eventos"
              ) ||
              productEvents.includes(
                eventFilter
              );

            /*
             * Preço.
             */
            const productPrice =
              Number(
                product.price
              ) || 0;

            let matchesPrice = true;

            if (
              priceFilter ===
              "ate-150"
            ) {
              matchesPrice =
                productPrice <= 150;
            }

            if (
              priceFilter ===
              "151-250"
            ) {
              matchesPrice =
                productPrice >= 151 &&
                productPrice <= 250;
            }

            if (
              priceFilter ===
              "acima-250"
            ) {
              matchesPrice =
                productPrice > 250;
            }

            return (
              matchesCategory &&
              matchesSearch &&
              matchesEvent &&
              matchesPrice
            );
          }
        );

      /*
       * Ordenação.
       */
      if (
        sort === "menor-preco"
      ) {
        return [...result].sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        );
      }

      if (
        sort === "maior-preco"
      ) {
        return [...result].sort(
          (a, b) =>
            Number(b.price) -
            Number(a.price)
        );
      }

      if (sort === "nome") {
        return [...result].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "pt-BR"
            )
        );
      }

      /*
       * Mais relevantes:
       * destaques primeiro.
       */
      return [...result].sort(
        (a, b) =>
          Number(b.featured) -
          Number(a.featured)
      );
    }, [
      products,
      search,
      selectedCategory,
      eventFilter,
      priceFilter,
      sort,
    ]);

  return (
    <>
      {/* Pesquisa e filtros */}
      <section
        className="bg-white"
        style={{
          paddingTop: "48px",
          paddingBottom: "32px",
        }}
      >
        <Container>
          <form
            onSubmit={
              handleSearchSubmit
            }
            className="flex flex-col gap-4 lg:flex-row"
          >
            {/* Pesquisa */}
            <div className="relative flex min-h-[60px] flex-1 items-center rounded-2xl border border-gray-200 bg-gray-50 transition focus-within:border-emerald-400 focus-within:bg-white">
              <Search
                size={21}
                className="pointer-events-none absolute text-gray-400"
                style={{
                  left: "20px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                }}
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Pesquisar produtos, temas ou categorias..."
                aria-label="Pesquisar produtos"
                className="h-[60px] w-full bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                style={{
                  paddingLeft:
                    "56px",
                  paddingRight:
                    "20px",
                }}
              />
            </div>

            {/* Mais filtros */}
            <button
              type="button"
              onClick={openFilters}
              className={
                activeAdvancedFilters
                  ? "relative inline-flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-50 px-6 font-bold text-emerald-800 transition hover:bg-emerald-100"
                  : "relative inline-flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 font-bold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              }
            >
              <SlidersHorizontal
                size={19}
              />

              Mais filtros

              {activeAdvancedFilters && (
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-700" />
              )}
            </button>

            {/* Minha seleção */}
            <button
              type="button"
              onClick={() =>
                setSelectionOpen(
                  (current) =>
                    !current
                )
              }
              className={
                selectedProducts.length >
                0
                  ? "relative inline-flex min-h-[60px] items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-6 font-bold text-white transition hover:bg-emerald-900"
                  : "relative inline-flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 font-bold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              }
            >
              <ShoppingBag
                size={19}
              />

              Minha seleção

              {selectedProducts.length >
                0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-300 px-1.5 text-xs font-black text-emerald-950">
                  {
                    selectedProducts.length
                  }
                </span>
              )}
            </button>
          </form>

          {/* Categorias */}
          <div
            className="flex flex-wrap items-center gap-2"
            style={{
              marginTop: "24px",
            }}
          >
            {categories.map(
              (category) => {
                const active =
                  selectedCategory ===
                  category.value;

                return (
                  <button
                    key={
                      category.value
                    }
                    type="button"
                    onClick={() =>
                      handleCategory(
                        category.value
                      )
                    }
                    className={
                      active
                        ? "rounded-full bg-emerald-800 px-4 py-2 text-sm font-bold text-white"
                        : "rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }
                  >
                    {
                      category.label
                    }
                  </button>
                );
              }
            )}
          </div>

          {/* Minha seleção */}
          {selectionOpen && (
            <div
              className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm"
              style={{
                marginTop: "28px",
              }}
            >
              <div
                className="flex flex-col gap-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  padding:
                    "24px 28px",
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag
                      size={20}
                      className="text-emerald-800"
                    />

                    <h3 className="text-xl font-black text-emerald-950">
                      Minha seleção
                    </h3>
                  </div>

                  <p
                    className="text-sm text-gray-500"
                    style={{
                      marginTop:
                        "5px",
                    }}
                  >
                    {selectedProducts.length ===
                    0
                      ? "Você ainda não selecionou nenhum produto."
                      : `${selectedProducts.length} ${
                          selectedProducts.length ===
                          1
                            ? "produto selecionado"
                            : "produtos selecionados"
                        }.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectionOpen(
                      false
                    )
                  }
                  aria-label="Fechar Minha seleção"
                  className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-emerald-300 hover:text-emerald-800 sm:self-auto"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedProducts.length ===
              0 ? (
                <div
                  className="text-center"
                  style={{
                    padding:
                      "36px 24px",
                  }}
                >
                  <ShoppingBag
                    size={34}
                    className="mx-auto text-gray-300"
                  />

                  <p
                    className="text-sm font-semibold text-gray-500"
                    style={{
                      marginTop:
                        "12px",
                    }}
                  >
                    Adicione produtos do
                    catálogo para montar
                    sua seleção.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="grid gap-3"
                    style={{
                      padding:
                        "20px 28px",
                    }}
                  >
                    {selectedProducts.map(
                      (
                        selectedProduct
                      ) => (
                        <div
                          key={
                            selectedProduct.id
                          }
                          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50"
                          style={{
                            padding:
                              "12px",
                          }}
                        >
                          {/* Imagem */}
                          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                            {selectedProduct.imageUrl ? (
                              <Image
                                src={
                                  selectedProduct.imageUrl
                                }
                                alt={
                                  selectedProduct.name
                                }
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-2xl">
                                🎉
                              </span>
                            )}
                          </div>

                          {/* Dados */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-gray-900">
                              {
                                selectedProduct.name
                              }
                            </p>

                            <p
                              className="text-xs font-semibold text-gray-500"
                              style={{
                                marginTop:
                                  "3px",
                              }}
                            >
                              {
                                selectedProduct.category
                              }
                            </p>

                            <p
                              className="text-sm font-black text-emerald-800"
                              style={{
                                marginTop:
                                  "6px",
                              }}
                            >
                              {formatPrice(
                                selectedProduct.price
                              )}{" "}
                              cada
                            </p>

                            {selectedProduct.quantity > 1 && (
                              <p
                                className="text-xs font-bold text-gray-500"
                                style={{
                                  marginTop: "3px",
                                }}
                              >
                                Subtotal:{" "}
                                {formatPrice(
                                  selectedProduct.price *
                                    selectedProduct.quantity
                                )}
                              </p>
                            )}

                            {eventDate && (
                              <p
                                className={
                                  availabilityError
                                    ? "text-xs font-bold text-red-500"
                                    : (productAvailability[
                                          String(selectedProduct.id)
                                        ] ?? 0) <= 0
                                      ? "text-xs font-bold text-red-500"
                                      : "text-xs font-bold text-emerald-700"
                                }
                                style={{
                                  marginTop: "5px",
                                }}
                              >
                                {availabilityLoading
                                  ? "Consultando disponibilidade..."
                                  : availabilityError
                                    ? "Disponibilidade não confirmada"
                                    : `${
                                        productAvailability[
                                          String(selectedProduct.id)
                                        ] ?? 0
                                      } ${
                                        (productAvailability[
                                          String(selectedProduct.id)
                                        ] ?? 0) === 1
                                          ? "unidade disponível"
                                          : "unidades disponíveis"
                                      } nesta data`}
                              </p>
                            )}
                          </div>

                          {/* Quantidade */}
                          <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                changeProductQuantity(
                                  selectedProduct.id,
                                  -1
                                )
                              }
                              disabled={selectedProduct.quantity <= 1}
                              aria-label={`Diminuir quantidade de ${selectedProduct.name}`}
                              className="flex h-10 w-10 items-center justify-center text-lg font-black text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-300"
                            >
                              −
                            </button>

                            <span className="flex h-10 min-w-10 items-center justify-center border-x border-gray-200 px-2 text-sm font-black text-gray-900">
                              {selectedProduct.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                changeProductQuantity(
                                  selectedProduct.id,
                                  1
                                )
                              }
                              disabled={
                                availabilityLoading ||
                                Boolean(availabilityError) ||
                                Boolean(
                                  eventDate &&
                                    productAvailability[
                                      String(selectedProduct.id)
                                    ] !== undefined &&
                                    selectedProduct.quantity >=
                                      productAvailability[
                                        String(selectedProduct.id)
                                      ]
                                )
                              }
                              aria-label={`Aumentar quantidade de ${selectedProduct.name}`}
                              className="flex h-10 w-10 items-center justify-center text-lg font-black text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                            >
                              +
                            </button>
                          </div>

                          {/* Remover */}
                          <button
                            type="button"
                            onClick={() =>
                              removeFromSelection(
                                selectedProduct.id
                              )
                            }
                            aria-label={`Remover ${selectedProduct.name} da seleção`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2
                              size={
                                17
                              }
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <div
                    className="border-t border-gray-100 bg-gray-50"
                    style={{
                      padding: "24px 28px",
                    }}
                  >
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Soma dos valores iniciais
                        </p>

                        <p
                          className="text-xl font-black text-emerald-900"
                          style={{ marginTop: "3px" }}
                        >
                          A partir de {formatPrice(selectionTotal)}
                        </p>

                        <p
                          className="text-xs text-gray-400"
                          style={{ marginTop: "3px" }}
                        >
                          O valor final será confirmado no orçamento.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="selection-event-date"
                          className="text-sm font-bold text-gray-700"
                        >
                          Data do evento
                        </label>

                        <div
                          className="relative"
                          style={{ marginTop: "8px" }}
                        >
                          <input
                            id="selection-event-date"
                            type="date"
                            value={eventDate}
                            min={getToday()}
                            onChange={(event) =>
                              setEventDate(event.target.value)
                            }
                            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-400"
                          />
                        </div>

                        {eventDate && (
                          <p
                            className={
                              availabilityError
                                ? "text-xs font-semibold text-red-500"
                                : "text-xs text-gray-400"
                            }
                            style={{ marginTop: "7px" }}
                          >
                            {availabilityLoading
                              ? "Consultando disponibilidade..."
                              : availabilityError ||
                                "Disponibilidade atualizada para a data escolhida."}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="selection-customer-name"
                          className="text-sm font-bold text-gray-700"
                        >
                          Nome
                        </label>

                        <input
                          id="selection-customer-name"
                          type="text"
                          value={customerName}
                          onChange={(event) =>
                            setCustomerName(event.target.value)
                          }
                          autoComplete="name"
                          placeholder="Seu nome"
                          className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="selection-customer-phone"
                          className="text-sm font-bold text-gray-700"
                        >
                          WhatsApp
                        </label>

                        <input
                          id="selection-customer-phone"
                          type="tel"
                          value={customerPhone}
                          onChange={(event) =>
                            setCustomerPhone(event.target.value)
                          }
                          autoComplete="tel"
                          placeholder="(71) 99999-9999"
                          className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      style={{ marginTop: "22px" }}
                    >
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Limpar seleção
                      </button>

                      <button
                        type="button"
                        onClick={requestSelectionOnWhatsApp}
                        disabled={
                          availabilityLoading ||
                          Boolean(availabilityError)
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <MessageCircle size={18} />
                        {reservationLoading
                          ? "Registrando solicitação..."
                          : "Solicitar orçamento pelo WhatsApp"}
                      </button>
                    </div>

                    {!eventDate && (
                      <p
                        className="text-right text-xs text-gray-400"
                        style={{ marginTop: "9px" }}
                      >
                        Escolha a data do evento para enviar a solicitação.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Painel Mais filtros */}
          {filtersOpen && (
            <div
              className="rounded-[24px] border border-emerald-100 bg-gray-50 shadow-sm"
              style={{
                marginTop: "28px",
                padding: "28px",
              }}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">
                    Mais filtros
                  </h3>

                  <p
                    className="text-sm leading-6 text-gray-500"
                    style={{
                      marginTop: "5px",
                    }}
                  >
                    Refine os produtos de
                    acordo com o seu evento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFiltersOpen(
                      false
                    )
                  }
                  aria-label="Fechar filtros"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="grid gap-5 md:grid-cols-3"
                style={{
                  marginTop: "28px",
                }}
              >
                {/* Evento */}
                <div>
                  <label
                    htmlFor="event-filter"
                    className="text-sm font-bold text-gray-700"
                  >
                    Tipo de evento
                  </label>

                  <div
                    className="relative"
                    style={{
                      marginTop: "9px",
                    }}
                  >
                    <select
                      id="event-filter"
                      value={
                        draftEvent
                      }
                      onChange={(
                        event
                      ) =>
                        setDraftEvent(
                          event
                            .target
                            .value
                        )
                      }
                      className="h-14 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-11 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-400"
                    >
                      {eventOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                {/* Preço */}
                <div>
                  <label
                    htmlFor="price-filter"
                    className="text-sm font-bold text-gray-700"
                  >
                    Faixa de preço
                  </label>

                  <div
                    className="relative"
                    style={{
                      marginTop: "9px",
                    }}
                  >
                    <select
                      id="price-filter"
                      value={
                        draftPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setDraftPrice(
                          event
                            .target
                            .value
                        )
                      }
                      className="h-14 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-11 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-400"
                    >
                      {priceOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                {/* Ordenação */}
                <div>
                  <label
                    htmlFor="sort-filter"
                    className="text-sm font-bold text-gray-700"
                  >
                    Ordenar por
                  </label>

                  <div
                    className="relative"
                    style={{
                      marginTop: "9px",
                    }}
                  >
                    <select
                      id="sort-filter"
                      value={
                        draftSort
                      }
                      onChange={(
                        event
                      ) =>
                        setDraftSort(
                          event
                            .target
                            .value
                        )
                      }
                      className="h-14 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-11 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-400"
                    >
                      {sortOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"
                style={{
                  marginTop: "28px",
                }}
              >
                <button
                  type="button"
                  onClick={
                    clearAdvancedFilters
                  }
                  className="min-h-12 rounded-xl border border-gray-200 bg-white px-5 font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-100"
                >
                  Limpar filtros
                </button>

                <button
                  type="button"
                  onClick={
                    applyFilters
                  }
                  className="min-h-12 rounded-xl bg-emerald-800 px-6 font-bold text-white transition hover:bg-emerald-900"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Produtos */}
      <section
        className="bg-gray-50"
        style={{
          paddingTop: "56px",
          paddingBottom: "112px",
        }}
      >
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                Nosso acervo
              </span>

              <h2
                className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl"
                style={{
                  marginTop: "10px",
                }}
              >
                {selectedCategory ===
                "todos"
                  ? "Todos os produtos"
                  : categories.find(
                      (category) =>
                        category.value ===
                        selectedCategory
                    )?.label ??
                    "Produtos"}
              </h2>
            </div>

            {!loading &&
              !loadError && (
                <p className="text-sm text-gray-500">
                  {
                    filteredProducts.length
                  }{" "}
                  {filteredProducts.length ===
                  1
                    ? "produto encontrado"
                    : "produtos encontrados"}
                </p>
              )}
          </div>

          {/* Carregando */}
          {loading && (
            <div
              className="rounded-[24px] border border-gray-200 bg-white text-center"
              style={{
                marginTop: "40px",
                padding:
                  "72px 24px",
              }}
            >
              <p className="text-sm font-semibold text-gray-500">
                Carregando produtos...
              </p>
            </div>
          )}

          {/* Erro */}
          {!loading &&
            loadError && (
              <div
                className="rounded-[24px] border border-red-200 bg-red-50 text-center"
                style={{
                  marginTop: "40px",
                  padding:
                    "72px 24px",
                }}
              >
                <h3 className="text-xl font-black text-red-800">
                  Não foi possível
                  carregar o catálogo
                </h3>

                <p
                  className="text-sm text-red-600"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  {loadError}
                </p>
              </div>
            )}

          {/* Produtos */}
          {!loading &&
            !loadError &&
            filteredProducts.length >
              0 && (
              <div
                className="grid md:grid-cols-2 xl:grid-cols-4"
                style={{
                  marginTop: "40px",
                  gap: "28px",
                }}
              >
                {filteredProducts.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      name={
                        product.name
                      }
                      category={
                        product.category ??
                        "Outros"
                      }
                      price={`A partir de ${formatPrice(
                        Number(
                          product.price
                        )
                      )}`}
                      imageUrl={
                        product.image_url
                      }
                      slug={
                        product.slug
                      }
                      isSelected={isProductSelected(
                        product.id
                      )}
                      onAddToSelection={() =>
                        addToSelection(
                          product
                        )
                      }
                    />
                  )
                )}
              </div>
            )}

          {/* Nenhum resultado */}
          {!loading &&
            !loadError &&
            filteredProducts.length ===
              0 && (
              <div
                className="rounded-[24px] border border-gray-200 bg-white text-center"
                style={{
                  marginTop: "40px",
                  padding:
                    "72px 24px",
                }}
              >
                <Search
                  size={34}
                  className="mx-auto text-gray-300"
                />

                <h3
                  className="text-xl font-black text-emerald-950"
                  style={{
                    marginTop:
                      "20px",
                  }}
                >
                  Nenhum produto
                  encontrado
                </h3>

                <p
                  className="text-gray-500"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  Tente pesquisar outro
                  termo ou selecionar
                  filtros diferentes.
                </p>

                <button
                  type="button"
                  onClick={
                    clearAllFilters
                  }
                  className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-900"
                  style={{
                    marginTop:
                      "24px",
                  }}
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
        </Container>
      </section>
    </>
  );
}
