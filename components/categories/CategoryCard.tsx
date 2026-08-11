import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type CategoryCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  featured?: boolean;
};

export function CategoryCard({
  title,
  description,
  href,
  icon: Icon,
  featured = false,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={`
        group relative flex min-h-[260px] flex-col overflow-hidden
        rounded-[24px] border
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl
        ${
          featured
            ? "border-emerald-200 bg-emerald-950 text-white"
            : "border-gray-200 bg-white text-gray-900"
        }
      `}
      style={{
        padding: "28px",
      }}
    >
      {/* Detalhe decorativo */}
      <div
        className={`
          pointer-events-none absolute -right-12 -top-12
          h-32 w-32 rounded-full blur-2xl
          ${
            featured
              ? "bg-yellow-300/10"
              : "bg-emerald-100/70"
          }
        `}
      />

      <div className="relative flex h-full flex-1 flex-col">
        {/* Ícone + seta */}
        <div className="flex items-start justify-between">
          <div
            className={`
              flex h-14 w-14 items-center justify-center
              rounded-2xl transition-transform duration-300
              group-hover:scale-105
              ${
                featured
                  ? "bg-white/10 text-yellow-300"
                  : "bg-emerald-50 text-emerald-800"
              }
            `}
          >
            <Icon size={27} strokeWidth={1.8} />
          </div>

          <div
            className={`
              flex h-10 w-10 items-center justify-center
              rounded-full transition-all duration-300
              group-hover:translate-x-1 group-hover:-translate-y-1
              ${
                featured
                  ? "bg-white/10 text-white"
                  : "bg-gray-50 text-gray-500"
              }
            `}
          >
            <ArrowUpRight size={19} />
          </div>
        </div>

        {/* Título */}
        <h3
          className={`
            text-xl font-black tracking-tight
            ${
              featured
                ? "text-white"
                : "text-emerald-950"
            }
          `}
          style={{
            marginTop: "28px",
          }}
        >
          {title}
        </h3>

        {/* Descrição */}
        <p
          className={`
            text-sm leading-6
            ${
              featured
                ? "text-emerald-50/75"
                : "text-gray-600"
            }
          `}
          style={{
            marginTop: "10px",
          }}
        >
          {description}
        </p>

        {/* Link */}
        <div
          className={`
            mt-auto text-sm font-bold
            ${
              featured
                ? "text-yellow-300"
                : "text-emerald-700"
            }
          `}
          style={{
            paddingTop: "24px",
          }}
        >
          Explorar categoria
        </div>
      </div>
    </Link>
  );
}