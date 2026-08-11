"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Container } from "@/components/common/Container";

const suggestions = [
  "Painéis",
  "Mesas",
  "Casamentos",
  "Festa infantil",
  "15 anos",
  "Formaturas",
];

export function SearchSection() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const term = search.trim();

    if (!term) {
      router.push("/catalogo");
      return;
    }

    router.push(
      `/catalogo?busca=${encodeURIComponent(term)}`
    );
  }

  function handleSuggestion(suggestion: string) {
    router.push(
      `/catalogo?busca=${encodeURIComponent(suggestion)}`
    );
  }

  return (
    <section
      style={{
        paddingTop: "32px",
        paddingBottom: "32px",
      }}
    >
      <Container>
        <div
          className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm"
          style={{
            padding: "32px 40px",
          }}
        >
          {/* Detalhe decorativo */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative">
            {/* Cabeçalho */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                  <Sparkles size={16} />
                  Encontre o que precisa
                </div>

                <h2
                  className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl lg:text-4xl"
                  style={{
                    marginTop: "10px",
                  }}
                >
                  O que você procura para sua festa?
                </h2>

                <p
                  className="max-w-2xl text-base leading-7 text-gray-600"
                  style={{
                    marginTop: "8px",
                  }}
                >
                  Pesquise por produtos, tipos de eventos, temas ou decorações.
                </p>
              </div>

              <p className="hidden pb-1 text-sm text-gray-500 lg:block">
                Catálogo completo da Vânia Festas
              </p>
            </div>

            {/* Barra de pesquisa */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-sm"
              style={{
                marginTop: "24px",
                minHeight: "64px",
              }}
            >
              <div className="relative flex flex-1 items-center">
                <Search
                  size={21}
                  className="pointer-events-none absolute text-gray-400"
                  style={{
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Ex.: painel redondo, casamento, festa infantil..."
                  aria-label="Pesquisar no catálogo"
                  className="h-16 w-full bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                  style={{
                    paddingLeft: "56px",
                    paddingRight: "20px",
                  }}
                />
              </div>

              <button
                type="submit"
                className="m-1.5 inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-7 font-bold text-white shadow-sm transition hover:bg-emerald-900"
              >
                Pesquisar
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Sugestões */}
            <div
              className="flex flex-wrap items-center gap-2"
              style={{
                marginTop: "18px",
              }}
            >
              <span className="mr-1 text-sm font-semibold text-gray-500">
                Mais procurados:
              </span>

              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    handleSuggestion(suggestion)
                  }
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}