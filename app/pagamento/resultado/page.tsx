import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export default async function ResultadoPagamentoPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  const { resultado } = await searchParams;
  const pending = resultado === "pendente";
  const failed = resultado === "falha";
  const Icon = failed ? XCircle : pending ? Clock3 : CheckCircle2;
  const title = failed ? "Pagamento n\u00e3o conclu\u00eddo" : pending ? "Pagamento em an\u00e1lise" : "Pagamento enviado";
  const text = failed
    ? "N\u00e3o foi poss\u00edvel concluir o pagamento. Voc\u00ea pode tentar novamente pela sua reserva."
    : pending
      ? "A InfinitePay est\u00e1 processando o seu pagamento. A confirma\u00e7\u00e3o aparecer\u00e1 na \u00e1rea do cliente assim que for recebida."
      : "Recebemos a informa\u00e7\u00e3o do pagamento. A confirma\u00e7\u00e3o final aparecer\u00e1 na sua reserva em instantes.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Icon className={`mx-auto h-12 w-12 ${failed ? "text-red-600" : pending ? "text-amber-600" : "text-emerald-700"}`} />
        <h1 className="mt-5 text-2xl font-black text-slate-900">{title}</h1>
        <p className="mt-3 leading-6 text-slate-600">{text}</p>
        <Link href="/area-cliente" className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900">Voltar para minha \u00e1rea</Link>
      </section>
    </main>
  );
}
