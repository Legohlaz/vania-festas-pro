import Link from "next/link";
import { Clock3, CreditCard, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";

import { Container } from "@/components/common/Container";

const whatsappUrl = "https://wa.me/5571986093473?text=Ol%C3%A1%21%20Gostaria%20de%20conhecer%20as%20op%C3%A7%C3%B5es%20da%20V%C3%A2nia%20Festas.";

export function Footer() {
  return (
    <footer className="border-t border-emerald-900/10 bg-[#f2f3ee] text-emerald-950">
      <Container className="py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.9fr_1.1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight"><Sparkles size={22} className="text-amber-600" /> Vânia Festas</Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-950/65">Locação, decoração e montagem para celebrar casamentos, aniversários, festas infantis, formaturas e momentos especiais.</p>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"><MessageCircle size={17} /> Falar no WhatsApp</a>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.16em]">Acesso rápido</h2>
            <nav className="mt-5 grid gap-3 text-sm text-emerald-950/70" aria-label="Links do rodapé">
              <Link href="/catalogo" className="hover:text-emerald-800">Catálogo</Link><Link href="/servicos" className="hover:text-emerald-800">Serviços</Link><Link href="/area-cliente" className="hover:text-emerald-800">Área do cliente</Link><Link href="/contato" className="hover:text-emerald-800">Solicitar orçamento</Link>
            </nav>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.16em]">Atendimento</h2>
            <div className="mt-5 grid gap-4 text-sm text-emerald-950/70">
              <p className="flex items-start gap-3"><Phone size={17} className="mt-0.5 shrink-0 text-emerald-700" /> (71) 98609-3473</p>
              <p className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-emerald-700" /> Salvador e região</p>
              <p className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 shrink-0 text-emerald-700" /> Horários confirmados pelo WhatsApp</p>
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-900/10 bg-white/70 p-6">
            <CreditCard className="text-emerald-700" size={24} /><h2 className="mt-4 font-black">Pagamento facilitado</h2><p className="mt-2 text-sm leading-6 text-emerald-950/65">Pix e cartão disponíveis conforme as condições apresentadas no orçamento.</p>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-emerald-900/10 pt-6 text-xs text-emerald-950/55 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Vânia Festas. Todos os direitos reservados.</p><Link href="/login" className="hover:text-emerald-800">Acesso administrativo</Link></div>
      </Container>
    </footer>
  );
}
