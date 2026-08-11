"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MessageCircle,
  PackageCheck,
  Plus,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Container } from "@/components/common/Container";
import { createClient } from "@/lib/supabase/client";
import { createWhatsAppLink } from "@/lib/whatsapp";

type Product = {
  id: string;
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

type ProductImage = {
  id: number;
  image_url: string;
  position: number;
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

const SELECTION_STORAGE_KEY =
  "vania-festas-minha-selecao";

const SELECTION_UPDATED_EVENT =
  "vania-festas-selection-updated";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatEventDate(value: string) {
  if (!value) {
    return "";
  }

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}

function getToday() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProdutoDetalhesPage() {
  const params = useParams();

  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [eventDate, setEventDate] =
    useState("");

  const [isSelected, setIsSelected] =
    useState(false);

  const dateInputRef =
    useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const input = dateInputRef.current;

    if (!input) {
      return;
    }

    try {
      if (
        typeof input.showPicker ===
        "function"
      ) {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    } catch {
      input.focus();
      input.click();
    }
  }

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

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
            .eq("slug", slug)
            .eq("active", true)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setError(
            "Produto não encontrado."
          );

          setProduct(null);

          return;
        }

        const loadedProduct = data as Product;
        setProduct(loadedProduct);
        setSelectedImageUrl(loadedProduct.image_url);

        const { data: galleryData, error: galleryError } = await supabase
          .from("product_images")
          .select("id, image_url, position")
          .eq("product_id", loadedProduct.id)
          .order("position");

        if (galleryError) throw galleryError;
        setGalleryImages((galleryData ?? []) as ProductImage[]);
      } catch (err) {
        console.error(
          "Erro ao carregar produto:",
          err
        );

        setError(
          "Não foi possível carregar este produto."
        );
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  useEffect(() => {
    if (!product) {
      return;
    }

    let nextIsSelected = false;

    try {
      const savedSelection =
        window.localStorage.getItem(
          SELECTION_STORAGE_KEY
        );

      if (savedSelection) {
        const parsedSelection =
          JSON.parse(savedSelection);

        if (Array.isArray(parsedSelection)) {
          nextIsSelected = parsedSelection.some(
            (selectedProduct) =>
              String(selectedProduct.id) ===
              String(product.id)
          );
        }
      }
    } catch {
      nextIsSelected = false;
    }

    queueMicrotask(() => setIsSelected(nextIsSelected));
  }, [product]);

  function addProductToSelection() {
    if (!product || isSelected) {
      return;
    }

    try {
      const savedSelection =
        window.localStorage.getItem(
          SELECTION_STORAGE_KEY
        );

      const parsedSelection =
        savedSelection
          ? JSON.parse(savedSelection)
          : [];

      const currentSelection:
        SelectedProduct[] =
        Array.isArray(parsedSelection)
          ? parsedSelection.map(
              (selectedProduct) => ({
                ...selectedProduct,
                quantity:
                  typeof selectedProduct.quantity ===
                    "number" &&
                  selectedProduct.quantity > 0
                    ? selectedProduct.quantity
                    : 1,
              })
            )
          : [];

      const alreadySelected =
        currentSelection.some(
          (selectedProduct) =>
            String(selectedProduct.id) ===
            String(product.id)
        );

      if (alreadySelected) {
        setIsSelected(true);
        return;
      }

      const selectedProduct:
        SelectedProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category:
          product.category ?? "Outros",
        price: Number(product.price),
        imageUrl: product.image_url,
        quantity: 1,
      };

      window.localStorage.setItem(
        SELECTION_STORAGE_KEY,
        JSON.stringify([
          ...currentSelection,
          selectedProduct,
        ])
      );

      window.dispatchEvent(
        new Event(SELECTION_UPDATED_EVENT)
      );

      setIsSelected(true);
    } catch (error) {
      console.error(
        "Erro ao adicionar produto à seleção:",
        error
      );
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-gray-50">
          <Container>
            <div className="py-20 text-center">
              <p className="text-sm font-semibold text-gray-500">
                Carregando produto...
              </p>
            </div>
          </Container>
        </main>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-gray-50">
          <Container>
            <div className="py-20">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
              >
                <ArrowLeft size={17} />
                Voltar para o catálogo
              </Link>

              <div
                className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm"
                style={{
                  marginTop: "32px",
                }}
              >
                <h1 className="text-2xl font-black text-gray-900">
                  Produto não encontrado
                </h1>

                <p
                  className="text-gray-500"
                  style={{
                    marginTop: "12px",
                  }}
                >
                  {error ||
                    "Este produto não está disponível."}
                </p>
              </div>
            </div>
          </Container>
        </main>
      </>
    );
  }

  const formattedEventDate =
    eventDate
      ? formatEventDate(eventDate)
      : "";

  const whatsappMessage = eventDate
    ? `Olá! Gostaria de consultar a disponibilidade do produto "${product.name}" para meu evento no dia ${formattedEventDate}.`
    : `Olá! Gostaria de consultar a disponibilidade do produto "${product.name}" para meu evento.`;

  const whatsappUrl =
    createWhatsAppLink({
      type: "locacao",
      message: whatsappMessage,
    });

  const productImages = [
    product.image_url,
    ...galleryImages.map((image) => image.image_url),
  ].filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  const displayedImageUrl = selectedImageUrl ?? productImages[0] ?? null;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50">
        <Container>
          <div
            style={{
              paddingTop: "40px",
              paddingBottom: "80px",
            }}
          >
            {/* Voltar */}
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
            >
              <ArrowLeft size={17} />
              Voltar para o catálogo
            </Link>

            {/* Card principal */}
            <div
              className="grid overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-sm lg:grid-cols-[42%_58%]"
              style={{
                marginTop: "28px",
              }}
            >
              {/* Imagem */}
              <div className="relative flex min-h-[380px] items-center justify-center bg-gray-100 p-6 sm:min-h-[460px] lg:min-h-[520px] lg:p-8">
                {displayedImageUrl ? (
                  <Image
                    src={displayedImageUrl}
                    alt={product.name}
                    fill
                    priority
                    className="object-contain p-4 sm:p-6"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                ) : (
                  <div className="flex h-full min-h-[380px] items-center justify-center text-sm font-semibold text-gray-400">
                    Produto sem imagem
                  </div>
                )}

                {product.featured && (
                  <div className="absolute left-5 top-5 z-10 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-950">
                    Destaque
                  </div>
                )}

                {productImages.length > 1 && (
                  <div className="absolute bottom-5 left-5 right-5 z-10 flex gap-2 overflow-x-auto rounded-xl bg-white/85 p-2 backdrop-blur">
                    {productImages.map((imageUrl, index) => (
                      <button
                        key={imageUrl}
                        type="button"
                        onClick={() => setSelectedImageUrl(imageUrl)}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${displayedImageUrl === imageUrl ? "border-emerald-700" : "border-transparent hover:border-emerald-300"}`}
                        aria-label={`Ver foto ${index + 1} de ${product.name}`}
                      >
                        <Image src={imageUrl} alt="" fill className="object-cover" sizes="64px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-10 xl:p-12">
                {/* Categoria + eventos */}
                <div className="flex flex-wrap items-center gap-2">
                  {product.category && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-800">
                      {product.category}
                    </span>
                  )}

                  {(product.event_type ?? []).map(
                    (eventType) => (
                      <span
                        key={eventType}
                        className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600"
                      >
                        {eventType}
                      </span>
                    )
                  )}
                </div>

                {/* Nome */}
                <h1
                  className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl"
                  style={{
                    marginTop: "20px",
                  }}
                >
                  {product.name}
                </h1>

                {/* Preço */}
                <div
                  style={{
                    marginTop: "20px",
                  }}
                >
                  <span className="text-sm font-semibold text-gray-500">
                    A partir de
                  </span>

                  <div
                    className="text-3xl font-black text-emerald-800"
                    style={{
                      marginTop: "4px",
                    }}
                  >
                    {formatPrice(
                      Number(product.price)
                    )}
                  </div>
                </div>

                {/* Descrição */}
                {product.description ? (
                  <p
                    className="max-w-2xl text-base leading-7 text-gray-600"
                    style={{
                      marginTop: "28px",
                    }}
                  >
                    {product.description}
                  </p>
                ) : (
                  <p
                    className="max-w-2xl text-base leading-7 text-gray-500"
                    style={{
                      marginTop: "28px",
                    }}
                  >
                    Entre em contato para
                    consultar disponibilidade
                    e mais informações sobre
                    este produto.
                  </p>
                )}

                {/* Disponibilidade + data */}
                <div
                  className="grid gap-4 sm:grid-cols-2"
                  style={{
                    marginTop: "34px",
                  }}
                >
                  {/* Disponibilidade */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                        <PackageCheck
                          size={22}
                          className="text-emerald-800"
                        />
                      </div>

                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          Produto disponível
                        </div>

                        <div
                          className="text-xs leading-5 text-gray-500"
                          style={{
                            marginTop: "2px",
                          }}
                        >
                          Consulte a
                          disponibilidade
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data do evento */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openDatePicker}
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openDatePicker();
                      }
                    }}
                    className="relative cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                        <CalendarDays
                          size={22}
                          className="text-emerald-800"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900">
                          Reserve para seu
                          evento
                        </div>

                        <div
                          className={
                            eventDate
                              ? "text-xs font-bold leading-5 text-emerald-800"
                              : "text-xs leading-5 text-gray-500"
                          }
                          style={{
                            marginTop: "2px",
                          }}
                        >
                          {eventDate
                            ? formatEventDate(
                                eventDate
                              )
                            : "Clique para escolher a data"}
                        </div>
                      </div>
                    </div>

                    <input
                      ref={dateInputRef}
                      type="date"
                      value={eventDate}
                      onChange={(event) =>
                        setEventDate(
                          event.target.value
                        )
                      }
                      min={getToday()}
                      aria-label="Data do evento"
                      className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
                    />
                  </div>
                </div>

                {/* Adicionar à seleção */}
                <button
                  type="button"
                  onClick={addProductToSelection}
                  disabled={isSelected}
                  className={
                    isSelected
                      ? "inline-flex min-h-[52px] w-full cursor-default items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-sm font-black text-emerald-800"
                      : "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-white px-6 py-3.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
                  }
                  style={{
                    marginTop: "28px",
                  }}
                >
                  {isSelected ? (
                    <>
                      <Check size={19} />
                      Adicionado à seleção
                    </>
                  ) : (
                    <>
                      <Plus size={19} />
                      Adicionar à seleção
                    </>
                  )}
                </button>

                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-6 py-4 text-base font-black !text-white shadow-sm transition hover:bg-emerald-900 hover:shadow-md"
                  style={{
                    marginTop: "12px",
                  }}
                >
                  <MessageCircle
                    size={20}
                    className="text-white"
                  />

                  Solicitar orçamento pelo
                  WhatsApp
                </a>

                {/* Informação inferior */}
                <p
                  className="text-center text-xs leading-5 text-gray-400"
                  style={{
                    marginTop: "12px",
                  }}
                >
                  {eventDate
                    ? `Consulta para ${formatEventDate(
                        eventDate
                      )}. A disponibilidade será confirmada pelo WhatsApp.`
                    : "Consulte valores, disponibilidade e condições para a data do seu evento."}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
