import { HeartHandshake, MessageCircleHeart, ShieldCheck, Star } from "lucide-react";

import { Container } from "@/components/common/Container";

const highlights = [
  { icon: MessageCircleHeart, title: "Atendimento próximo", text: "Orientação desde a escolha dos itens até os últimos detalhes do evento." },
  { icon: ShieldCheck, title: "Materiais bem cuidados", text: "Itens revisados e organizados para chegarem prontos para a sua celebração." },
  { icon: HeartHandshake, title: "Soluções personalizadas", text: "Combinações flexíveis para diferentes estilos, espaços e momentos especiais." },
];

export function SocialProof() {
  return (
    <section className="reveal-section overflow-hidden bg-emerald-950 py-20 text-white md:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Experiência que acolhe</span>
            <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Cada detalhe pensado para você celebrar com tranquilidade.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/75">Mais do que alugar produtos, ajudamos a transformar ideias em uma experiência organizada, bonita e especial.</p>
            <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <span className="text-4xl font-black text-amber-200">4,9</span>
              <div>
                <div className="flex gap-1 text-amber-300" aria-label="Avaliação média de 4,9 de 5">
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill="currentColor" />)}
                </div>
                <p className="mt-1 text-xs text-emerald-100/70">avaliação média apresentada no atendimento</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/[0.11]" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-emerald-950"><Icon size={22} /></span>
                <h3 className="mt-7 text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-emerald-50/70">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
