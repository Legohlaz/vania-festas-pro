"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  PackagePlus,
  Save,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  EVENT_TYPES,
  PRODUCT_CATEGORIES,
} from "@/lib/catalog-options";

export default function NovoProdutoPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [category, setCategory] = useState("");

  const [eventTypes, setEventTypes] = useState<string[]>(
    []
  );

  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");

  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  function createSlug(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleNameChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;

    setName(value);
    setSlug(createSlug(value));
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  function handleAdditionalImagesChange(event: ChangeEvent<HTMLInputElement>) {
    setAdditionalImageFiles(Array.from(event.target.files ?? []));
  }

  function handleEventTypeChange(
    eventType: string
  ) {
    setEventTypes((currentEventTypes) => {
      if (currentEventTypes.includes(eventType)) {
        return currentEventTypes.filter(
          (item) => item !== eventType
        );
      }

      return [
        ...currentEventTypes,
        eventType,
      ];
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage(
        "Informe o nome do produto."
      );
      return;
    }

    if (!slug.trim()) {
      setErrorMessage(
        "Informe o slug do produto."
      );
      return;
    }

    if (!category.trim()) {
      setErrorMessage(
        "Selecione a categoria."
      );
      return;
    }

    if (eventTypes.length === 0) {
      setErrorMessage(
        "Selecione pelo menos um tipo de evento."
      );
      return;
    }

    if (!price) {
      setErrorMessage("Informe o preço.");
      return;
    }

    const numericStockQuantity = Number(stockQuantity);

    if (!Number.isInteger(numericStockQuantity) || numericStockQuantity < 0) {
      setErrorMessage("Informe uma quantidade em estoque válida.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const supabase = createClient();

    let imageUrl: string | null = null;

    try {
      /*
       * 1. Upload da imagem
       */
      if (imageFile) {
        const extension =
          imageFile.name.split(".").pop() ??
          "jpg";

        const safeSlug =
          createSlug(slug);

        const fileName =
          `${safeSlug}-${Date.now()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("products")
            .upload(fileName, imageFile, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          throw new Error(
            `Erro ao enviar imagem: ${uploadError.message}`
          );
        }

        /*
         * 2. Pega a URL pública
         */
        const { data: publicUrlData } =
          supabase.storage
            .from("products")
            .getPublicUrl(fileName);

        imageUrl =
          publicUrlData.publicUrl;

      }

      /*
       * 3. Converte o preço
       */
      const numericPrice = Number(
        price.replace(",", ".")
      );

      if (Number.isNaN(numericPrice)) {
        throw new Error(
          "O preço informado é inválido."
        );
      }

      /*
       * 4. Cria o produto
       */
      const { data: createdProduct, error: insertError } =
        await supabase
          .from("products")
          .insert({
            name: name.trim(),
            slug: slug.trim(),

            description:
              description.trim() || null,

            search_keywords: searchKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),

            category:
              category.trim(),

            /*
             * Agora enviamos um ARRAY
             * para event_type.
             */
            event_type: eventTypes,

            price: numericPrice,
            stock_quantity: numericStockQuantity,
            image_url: imageUrl,
            featured,
            active,
          })
          .select("id")
          .single();

      if (insertError) {
        throw new Error(
          `Erro ao cadastrar produto: ${insertError.message}`
        );
      }

      if (!createdProduct) {
        throw new Error("Produto criado, mas não foi possível identificar a galeria.");
      }

      if (additionalImageFiles.length > 0) {
        const galleryRows: { product_id: number; image_url: string; position: number }[] = [];

        for (const [index, file] of additionalImageFiles.entries()) {
          const extension = file.name.split(".").pop() ?? "jpg";
          const fileName = `${createSlug(slug)}-galeria-${Date.now()}-${index}.${extension}`;
          const { error: uploadGalleryError } = await supabase.storage
            .from("products")
            .upload(fileName, file, { cacheControl: "3600", upsert: false });

          if (uploadGalleryError) throw new Error(`Erro ao enviar foto adicional: ${uploadGalleryError.message}`);

          const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(fileName);
          galleryRows.push({ product_id: Number(createdProduct.id), image_url: publicUrlData.publicUrl, position: index });
        }

        const { error: galleryError } = await supabase.from("product_images").insert(galleryRows);
        if (galleryError) throw new Error(`Produto criado, mas não foi possível salvar as fotos extras: ${galleryError.message}`);
      }

      router.push(
        "/admin/produtos"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "ERRO NO CADASTRO:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Não foi possível cadastrar o produto."
        );
      }

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto w-full max-w-5xl"
        style={{
          padding: "48px 32px",
        }}
      >
        <Link
          href="/admin/produtos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Voltar para produtos
        </Link>

        {/* Cabeçalho */}
        <div
          style={{
            marginTop: "40px",
          }}
        >
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            <PackagePlus size={18} />
            Administração
          </div>

          <h1
            className="text-4xl font-black tracking-tight text-gray-900"
            style={{
              marginTop: "12px",
            }}
          >
            Novo produto
          </h1>

          <p
            className="text-base text-gray-600"
            style={{
              marginTop: "12px",
            }}
          >
            Cadastre um novo item no
            catálogo da Vânia Festas.
          </p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm"
          style={{
            marginTop: "40px",
            padding: "32px",
          }}
        >
          {/* Nome + Slug */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="text-sm font-bold text-gray-800"
              >
                Nome do produto
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Ex.: Painel Redondo"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700"
                style={{
                  marginTop: "10px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="text-sm font-bold text-gray-800"
              >
                Slug
              </label>

              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    createSlug(
                      event.target.value
                    )
                  )
                }
                placeholder="painel-redondo"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700"
                style={{
                  marginTop: "10px",
                }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div
            style={{
              marginTop: "28px",
            }}
          >
            <label
              htmlFor="description"
              className="text-sm font-bold text-gray-800"
            >
              Descrição
            </label>

            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Descreva o produto..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700"
              style={{
                marginTop: "10px",
              }}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <label htmlFor="search-keywords" className="text-sm font-bold text-gray-800">Palavras-chave para sugestões</label>
            <p className="mt-1 text-xs text-gray-500">Separe por vírgulas. Ex.: Stitch, infantil, azul, aniversário.</p>
            <input id="search-keywords" value={searchKeywords} onChange={(event) => setSearchKeywords(event.target.value)} placeholder="Ex.: Stitch, infantil, azul" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700" />
          </div>

          {/* Categoria */}
          <div
            style={{
              marginTop: "28px",
            }}
          >
            <label
              htmlFor="category"
              className="text-sm font-bold text-gray-800"
            >
              Categoria
            </label>

            <select
              id="category"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700"
              style={{
                marginTop: "10px",
              }}
            >
              <option value="">
                Selecione uma categoria
              </option>

              {PRODUCT_CATEGORIES.map(
                (categoryOption) => (
                  <option
                    key={
                      categoryOption
                    }
                    value={
                      categoryOption
                    }
                  >
                    {categoryOption}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Tipos de evento */}
          <div
            style={{
              marginTop: "28px",
            }}
          >
            <div>
              <p className="text-sm font-bold text-gray-800">
                Tipos de evento
              </p>

              <p
                className="text-xs text-gray-500"
                style={{
                  marginTop: "5px",
                }}
              >
                Selecione todos os eventos
                em que este produto pode ser
                utilizado.
              </p>
            </div>

            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              style={{
                marginTop: "14px",
              }}
            >
              {EVENT_TYPES.map(
                (eventType) => {
                  const checked =
                    eventTypes.includes(
                      eventType
                    );

                  return (
                    <label
                      key={eventType}
                      className={
                        checked
                          ? "flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-500 bg-emerald-50"
                          : "flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white transition hover:border-emerald-300 hover:bg-emerald-50"
                      }
                      style={{
                        padding:
                          "14px 16px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          handleEventTypeChange(
                            eventType
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-emerald-800"
                      />

                      <span className="text-sm font-semibold text-gray-800">
                        {eventType}
                      </span>
                    </label>
                  );
                }
              )}
            </div>

            {eventTypes.length > 0 && (
              <p
                className="text-xs font-semibold text-emerald-700"
                style={{
                  marginTop: "12px",
                }}
              >
                {eventTypes.length === 1
                  ? "1 tipo de evento selecionado"
                  : `${eventTypes.length} tipos de evento selecionados`}
              </p>
            )}
          </div>

          {/* Preço */}
          <div
            style={{
              marginTop: "28px",
            }}
          >
            <label
              htmlFor="price"
              className="text-sm font-bold text-gray-800"
            >
              Preço
            </label>

            <div
              className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-emerald-700"
              style={{
                marginTop: "10px",
                maxWidth: "320px",
              }}
            >
              <span
                className="border-r border-gray-200 bg-gray-50 text-sm font-bold text-gray-600"
                style={{
                  padding: "12px 14px",
                }}
              >
                R$
              </span>

              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) =>
                  setPrice(
                    event.target.value
                  )
                }
                placeholder="0,00"
                className="w-full bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          {/* Quantidade em estoque */}
          <div style={{ marginTop: "28px" }}>
            <label htmlFor="stockQuantity" className="text-sm font-bold text-gray-800">
              Quantidade em estoque
            </label>
            <input
              id="stockQuantity"
              type="number"
              min="0"
              step="1"
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              placeholder="Ex.: 100"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700"
              style={{ marginTop: "10px", maxWidth: "320px" }}
            />
            <p className="text-xs text-gray-500" style={{ marginTop: "8px" }}>
              Informe quantas unidades deste produto estão disponíveis no acervo.
            </p>
          </div>

          {/* Imagem */}
          <div
            style={{
              marginTop: "32px",
            }}
          >
            <p className="text-sm font-bold text-gray-800">
              Imagem do produto
            </p>

            <label
              htmlFor="image"
              className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-center transition hover:border-emerald-500"
              style={{
                marginTop: "10px",
                minHeight: "220px",
                padding: imagePreview
                  ? "0"
                  : "32px",
              }}
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Prévia do produto"
                  width={900}
                  height={360}
                  unoptimized
                  className="h-full w-full object-contain"
                  style={{
                    maxHeight: "360px",
                  }}
                />
              ) : (
                <>
                  <ImagePlus
                    size={32}
                    className="text-emerald-700"
                  />

                  <span
                    className="text-sm font-bold text-gray-800"
                    style={{
                      marginTop: "14px",
                    }}
                  >
                    Selecionar imagem
                  </span>

                  <span
                    className="text-xs text-gray-500"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    Escolha uma imagem do
                    produto no computador
                  </span>
                </>
              )}

              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
                className="hidden"
              />
            </label>

            {imageFile && (
              <p
                className="text-xs text-gray-500"
                style={{
                  marginTop: "10px",
                }}
              >
                Imagem selecionada:{" "}
                {imageFile.name}
              </p>
            )}
          </div>

          <div style={{ marginTop: "28px" }}>
            <p className="text-sm font-bold text-gray-800">Fotos adicionais</p>
            <p className="mt-1 text-xs text-gray-500">Você pode selecionar várias imagens para mostrar outros ângulos do produto.</p>
            <label htmlFor="additional-images" className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
              <ImagePlus size={18} /> Selecionar fotos adicionais
              <input id="additional-images" type="file" accept="image/*" multiple onChange={handleAdditionalImagesChange} className="hidden" />
            </label>
            {additionalImageFiles.length > 0 && <p className="mt-2 text-xs font-semibold text-emerald-700">{additionalImageFiles.length} {additionalImageFiles.length === 1 ? "foto selecionada" : "fotos selecionadas"}.</p>}
          </div>

          {/* Opções */}
          <div
            className="grid gap-4 md:grid-cols-2"
            style={{
              marginTop: "32px",
            }}
          >
            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200"
              style={{
                padding: "18px",
              }}
            >
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) =>
                  setFeatured(
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-emerald-800"
              />

              <div>
                <p className="text-sm font-bold text-gray-800">
                  Produto em destaque
                </p>

                <p
                  className="text-xs text-gray-500"
                  style={{
                    marginTop: "3px",
                  }}
                >
                  Exibir entre os produtos
                  destacados.
                </p>
              </div>
            </label>

            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200"
              style={{
                padding: "18px",
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(event) =>
                  setActive(
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-emerald-800"
              />

              <div>
                <p className="text-sm font-bold text-gray-800">
                  Produto ativo
                </p>

                <p
                  className="text-xs text-gray-500"
                  style={{
                    marginTop: "3px",
                  }}
                >
                  Mostrar este produto no
                  catálogo.
                </p>
              </div>
            </label>
          </div>

          {/* Erro */}
          {errorMessage && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
              style={{
                marginTop: "28px",
                padding: "14px 16px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Botões */}
          <div
            className="flex items-center justify-end gap-3 border-t border-gray-200"
            style={{
              marginTop: "36px",
              paddingTop: "28px",
            }}
          >
            <Link
              href="/admin/produtos"
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />

              {saving
                ? "Salvando..."
                : "Salvar produto"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
