import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Container } from "@/components/common/Container";
import { CatalogContent } from "@/components/catalog/CatalogContent";

export default function CatalogoPage() {
  return (
    <>
      <Header />

      <main>
        {/* Cabeçalho do catálogo */}
        <section
          className="border-b border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800"
          style={{
            paddingTop: "64px",
            paddingBottom: "64px",
          }}
        >
          <Container>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              Voltar para o início
            </Link>

            <div
              className="max-w-3xl"
              style={{
                marginTop: "28px",
              }}
            >
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-yellow-300">
                <Sparkles size={16} />
                Catálogo Vânia Festas
              </div>

              <h1
                className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl"
                style={{
                  marginTop: "14px",
                }}
              >
                Encontre tudo para tornar seu evento especial.
              </h1>

              <p
                className="max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg"
                style={{
                  marginTop: "20px",
                }}
              >
                Explore nossos materiais, decorações e kits para encontrar
                tudo o que precisa para sua comemoração.
              </p>
            </div>
          </Container>
        </section>

        <Suspense
          fallback={
            <div className="flex min-h-80 items-center justify-center text-gray-600">
              Carregando catálogo...
            </div>
          }
        >
          <CatalogContent />
        </Suspense>
      </main>
    </>
  );
}
