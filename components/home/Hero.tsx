import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { Container } from "@/components/common/Container";

const benefits = [
  "Atendimento rápido",
  "Entrega e montagem",
  "Decorações personalizadas",
];

export function Hero() {
  return (
    <section className="py-8 lg:py-10">
      <Container>
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 shadow-xl">
          <div className="grid lg:grid-cols-2">
            {/* Conteúdo */}
            <div
              className="relative flex items-center"
              style={{
                padding: "56px 52px",
              }}
            >
              {/* Decoração */}
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-700/20 blur-3xl" />

              <div className="relative z-10 w-full max-w-[560px]">
                {/* Selo */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-50 backdrop-blur">
                  <Sparkles
                    size={16}
                    className="text-yellow-300"
                  />

                  Locação, decoração e montagem
                </div>

                {/* Título */}
                <h1
                  className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl xl:text-[56px]"
                  style={{
                    marginTop: "24px",
                  }}
                >
                  Seu evento merece ser{" "}
                  <span className="text-yellow-300">
                    inesquecível.
                  </span>
                </h1>

                {/* Descrição */}
                <p
                  className="max-w-[520px] text-base leading-7 text-emerald-50/85 sm:text-lg sm:leading-8"
                  style={{
                    marginTop: "22px",
                  }}
                >
                  Decorações e materiais para casamentos, aniversários,
                  festas infantis, 15 anos, formaturas e momentos especiais.
                </p>

                {/* Botões */}
                <div
                  className="flex flex-col gap-4 sm:flex-row"
                  style={{
                    marginTop: "30px",
                  }}
                >
                  <Link
                    href="/catalogo"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-emerald-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                  >
                    Ver catálogo
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/contato"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <MessageCircle size={18} />
                    Solicitar orçamento
                  </Link>
                </div>

                {/* Benefícios */}
                <div
                  className="grid gap-3"
                  style={{
                    marginTop: "30px",
                  }}
                >
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-center gap-3 text-sm font-medium text-emerald-50/90"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Check
                          size={14}
                          className="text-yellow-300"
                        />
                      </span>

                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Imagem */}
            <div className="relative min-h-[380px] lg:min-h-[520px]">
              <Image
                src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=85&w=1600&auto=format&fit=crop"
                alt="Decoração elegante para evento"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/30 via-transparent to-transparent" />

              {/* Avaliação */}
              <div
                className="absolute bottom-6 left-6 rounded-2xl border border-white/40 bg-white/95 shadow-xl backdrop-blur"
                style={{
                  padding: "16px 20px",
                }}
              >
                <div className="flex items-center gap-1 text-sm text-yellow-500">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>

                <div
                  className="flex items-end gap-2"
                  style={{
                    marginTop: "6px",
                  }}
                >
                  <span className="text-2xl font-black text-emerald-950">
                    4,9
                  </span>

                  <span className="pb-1 text-sm text-gray-500">
                    avaliação média
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}