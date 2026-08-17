import Link from "next/link";
import Image from "next/image";
import {
  Check,
  PackageCheck,
  Plus,
} from "lucide-react";

type ProductCardProps = {
  name: string;
  slug: string;
  category: string;
  price: string;
  imageUrl?: string | null;
  availability?: number;
  availabilityLoading?: boolean;
  availabilityError?: boolean;

  isSelected?: boolean;

  onAddToSelection?: () => void;
};

export function ProductCard({
  name,
  slug,
  category,
  price,
  imageUrl,
  availability,
  availabilityLoading = false,
  availabilityError = false,
  isSelected = false,
  onAddToSelection,
}: ProductCardProps) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            <span className="transition-transform duration-300 group-hover:scale-110">
              🎉
            </span>
          </div>
        )}

        {/* Indicador de selecionado */}
        {isSelected && (
          <div
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-800 text-xs font-bold text-white shadow-md"
            style={{
              padding: "8px 12px",
            }}
          >
            <Check size={14} />

            Selecionado
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div
        className="flex flex-1 flex-col"
        style={{
          padding: "24px",
        }}
      >
        {/* Categoria */}
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          {category}
        </span>

        {/* Nome */}
        <h3
          className="text-xl font-black tracking-tight text-gray-900"
          style={{
            marginTop: "16px",
          }}
        >
          {name}
        </h3>

        {/* Preço */}
        <p
          className="text-lg font-bold text-emerald-900"
          style={{
            marginTop: "10px",
          }}
        >
          {price}
        </p>

        {availability !== undefined && (
          <div
            className={
              availabilityError
                ? "mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                : availabilityLoading
                  ? "mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500"
                  : availability > 0
                    ? "mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                    : "mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            }
          >
            {availabilityLoading ? (
              "Consultando disponibilidade..."
            ) : availabilityError ? (
              "Disponibilidade não confirmada"
            ) : availability > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <PackageCheck size={14} />
                {availability} {availability === 1 ? "unidade disponível" : "unidades disponíveis"}
              </span>
            ) : (
              "Indisponível para a data escolhida"
            )}
          </div>
        )}

        {/* Ações */}
        <div
          className="mt-auto grid gap-3"
          style={{
            marginTop: "24px",
          }}
        >
          {/* Adicionar à seleção */}
          {onAddToSelection && (
            <button
              type="button"
              onClick={onAddToSelection}
              disabled={isSelected}
              className={
                isSelected
                  ? "inline-flex w-full cursor-default items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800"
                  : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
              }
            >
              {isSelected ? (
                <>
                  <Check size={17} />
                  Adicionado à seleção
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Adicionar à seleção
                </>
              )}
            </button>
          )}

          {/* Ver detalhes */}
          <Link
            href={`/catalogo/${slug}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </div>
  );
}
