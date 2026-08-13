import Link from "next/link";
import { CalendarDays, MessageCircle, PackageCheck, Sparkles, Truck } from "lucide-react";

import { Container } from "@/components/common/Container";
import { Header } from "@/components/layout/Header";

const services = [
  { icon: PackageCheck, title: "Locação de materiais", description: "Mesas, cadeiras, painéis, cilindros e itens para montar a sua festa." },
  { icon: Sparkles, title: "Decoração personalizada", description: "Composições pensadas para aniversários, casamentos, chás, formaturas e outros momentos." },
  { icon: Truck, title: "Entrega e montagem", description: "Organizamos a entrega, montagem e retirada conforme a necessidade do seu evento." },
];

export default function ServicosPage() {
  return <><Header /><main className="min-h-screen bg-slate-50 py-12 sm:py-16"><Container><section className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Vânia Festas Pro</p><h1 className="mt-4 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">Tudo para o seu evento</h1><p className="mt-4 text-base leading-7 text-slate-600">Escolha os itens, consulte a disponibilidade e conte com a gente em cada etapa da sua comemoração.</p></section><section className="mt-10 grid gap-5 md:grid-cols-3">{services.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700"><Icon className="h-6 w-6" /></span><h2 className="mt-5 text-lg font-black text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</section><section className="mt-10 rounded-2xl bg-emerald-900 px-6 py-8 text-white sm:px-10"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black">Vamos organizar sua festa?</h2><p className="mt-2 text-emerald-50/85">Veja o catálogo ou fale com a equipe para pedir um orçamento.</p></div><div className="flex flex-wrap gap-3"><Link href="/catalogo" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900"><CalendarDays className="h-4 w-4" />Ver catálogo</Link><Link href="/contato" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Solicitar orçamento</Link></div></div></section></Container></main></>;
}
