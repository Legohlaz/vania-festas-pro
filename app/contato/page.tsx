import Link from "next/link";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";

import { Container } from "@/components/common/Container";
import { Header } from "@/components/layout/Header";

const whatsappUrl = "https://wa.me/5571986093473?text=Ol%C3%A1%21%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20meu%20evento.";

export default function ContatoPage() {
  return <><Header /><main className="min-h-screen bg-slate-50 py-12 sm:py-16"><Container><div className="mx-auto max-w-3xl"><section className="rounded-3xl bg-emerald-900 px-6 py-10 text-center text-white shadow-xl sm:px-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Fale com a Vânia Festas</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Solicite seu orçamento</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-emerald-50/85">Envie a data, o tipo de evento e a quantidade aproximada de convidados. Nossa equipe confirma a disponibilidade.</p><a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-emerald-900 shadow-lg"><MessageCircle className="h-5 w-5" />Conversar no WhatsApp</a></section><section className="mt-6 grid gap-5 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Phone className="h-6 w-6 text-emerald-700" /><h2 className="mt-4 font-black text-slate-900">Atendimento pelo WhatsApp</h2><p className="mt-2 text-sm leading-6 text-slate-600">Clique no botão acima e envie as informações do seu evento diretamente para a equipe.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><CalendarDays className="h-6 w-6 text-emerald-700" /><h2 className="mt-4 font-black text-slate-900">Consulte o catálogo</h2><p className="mt-2 text-sm leading-6 text-slate-600">Você também pode selecionar produtos e mandar a lista para orçamento.</p><Link href="/catalogo" className="mt-4 inline-block text-sm font-bold text-emerald-700 hover:text-emerald-900">Abrir catálogo →</Link></div></section></div></Container></main></>;
}
