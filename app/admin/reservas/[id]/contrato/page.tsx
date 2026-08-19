"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileSignature, Printer } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_address: string | null;
  notes: string | null;
  service_fee: number | null;
  amount_paid: number | null;
};

type ReservationItem = {
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

type ReservationItemRow = Omit<ReservationItem, "product_name">;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function defaultReturnDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;
  parsedDate.setDate(parsedDate.getDate() + 1);
  return parsedDate.toISOString().slice(0, 10);
}

function PrintableField({ label, value }: { label: string; value: string }) {
  return <p className="border-b border-slate-300 pb-1 text-sm leading-6 text-slate-800"><span className="font-bold">{label}: </span>{value || "________________________________"}</p>;
}

export default function ReservationContractPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [customerAddress, setCustomerAddress] = useState("");
  const [identityDocument, setIdentityDocument] = useState("");
  const [eventType, setEventType] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [celebratedPerson, setCelebratedPerson] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [additionalPackages, setAdditionalPackages] = useState("");
  const [returnDate, setReturnDate] = useState("");

  useEffect(() => {
    async function loadContract() {
      const reservationId = Number(id);
      if (!Number.isInteger(reservationId)) {
        setErrorMessage("Reserva inválida.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const [reservationResult, itemsResult] = await Promise.all([
        supabase
          .from("reservations")
          .select("id, customer_id, customer_name, customer_phone, event_date, event_address, notes, service_fee, amount_paid")
          .eq("id", reservationId)
          .single(),
        supabase.from("reservation_items").select("product_id, quantity, unit_price").eq("reservation_id", reservationId),
      ]);

      if (reservationResult.error || itemsResult.error) {
        setErrorMessage(reservationResult.error?.message ?? itemsResult.error?.message ?? "Não foi possível carregar o contrato.");
        setLoading(false);
        return;
      }

      const reservationData = reservationResult.data as Reservation;
      const itemRows = (itemsResult.data ?? []) as ReservationItemRow[];
      const productIds = [...new Set(itemRows.map((item) => item.product_id).filter((productId): productId is number => productId !== null))];
      const [productsResult, customerResult] = await Promise.all([
        productIds.length ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [], error: null }),
        reservationData.customer_id ? supabase.from("customers").select("address").eq("id", reservationData.customer_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);

      if (productsResult.error || customerResult.error) {
        setErrorMessage(productsResult.error?.message ?? customerResult.error?.message ?? "Não foi possível completar os dados do contrato.");
      } else {
        const productNames = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
        setReservation(reservationData);
        setItems(itemRows.map((item) => ({ ...item, product_name: item.product_id ? productNames.get(item.product_id) ?? null : null })));
        setCustomerAddress(customerResult.data?.address ?? "");
        setPackageDescription(reservationData.notes ?? "");
        setReturnDate(defaultReturnDate(reservationData.event_date));
      }

      setLoading(false);
    }

    loadContract();
  }, [id]);

  const financial = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
    const serviceFee = Number(reservation?.service_fee ?? 0);
    const total = itemsTotal + serviceFee;
    const amountPaid = Number(reservation?.amount_paid ?? 0);
    return { itemsTotal, serviceFee, total, amountPaid, balance: Math.max(total - amountPaid, 0) };
  }, [items, reservation]);

  if (loading) return <main className="flex min-h-[70vh] items-center justify-center text-sm font-medium text-slate-500">Preparando contrato...</main>;

  if (!reservation) {
    return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center"><p className="font-semibold text-slate-700">{errorMessage || "Reserva não encontrada."}</p><Link href="/admin/reservas" className="text-sm font-bold text-emerald-700">Voltar para reservas</Link></main>;
  }

  const paymentSchedule = [
    { label: "Entrada / sinal (40%)", value: financial.total * 0.4 },
    { label: "Um mês antes do evento (30%)", value: financial.total * 0.3 },
    { label: "Na entrega do evento (30%)", value: financial.total * 0.3 },
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0 sm:px-8">
      <div className="no-print mx-auto mb-5 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/reservas/${reservation.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Voltar para reserva</Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">Preencha os campos e use “Salvar como PDF” na janela de impressão.</span>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"><Download className="h-4 w-4" /> Baixar contrato em PDF</button>
        </div>
      </div>

      <article className="mx-auto w-full max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-9 print:shadow-none sm:p-10">
        <header className="border-b-2 border-emerald-800 pb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800"><FileSignature className="h-4 w-4" /> Contrato de locação</div>
          <h1 className="mt-4 text-2xl font-black text-emerald-950 sm:text-3xl">DADOS PARA CONTRATAÇÃO DE EVENTOS — VÂNIA FESTAS</h1>
          <p className="mt-2 text-sm text-slate-500">Contrato vinculado à reserva #{reservation.id}</p>
        </header>

        <section className="no-print mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-950">Complementos do contrato</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">Estes dados ficam nesta tela para a emissão do PDF. Eles não alteram a reserva automaticamente.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">CPF ou RG<input value={identityDocument} onChange={(event) => setIdentityDocument(event.target.value)} placeholder="Ex.: 000.000.000-00" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Tipo de festa<input value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="Ex.: Casamento, aniversário" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Paleta de cor<input value={colorPalette} onChange={(event) => setColorPalette(event.target.value)} placeholder="Ex.: Terracota e branco" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Aniversariante ou noivos<input value={celebratedPerson} onChange={(event) => setCelebratedPerson(event.target.value)} placeholder="Nome(s) para o evento" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">Descrição do pacote<textarea value={packageDescription} onChange={(event) => setPackageDescription(event.target.value)} rows={3} placeholder="Descreva o pacote, decoração e demais condições" className="rounded-xl border border-slate-200 bg-white p-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">Pacotes adicionais<textarea value={additionalPackages} onChange={(event) => setAdditionalPackages(event.target.value)} rows={2} placeholder="Itens ou serviços adicionais, se houver" className="rounded-xl border border-slate-200 bg-white p-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Data da devolução / desmontagem<input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Endereço do contratante<input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Rua, número, bairro e cidade" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500" /></label>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 print:mt-6">
          <PrintableField label="Nome do contratante" value={reservation.customer_name} />
          <PrintableField label="Nº do CPF ou RG" value={identityDocument} />
          <PrintableField label="Endereço do espaço" value={reservation.event_address ?? ""} />
          <PrintableField label="Endereço do contratante" value={customerAddress} />
          <PrintableField label="Nº para contato" value={reservation.customer_phone} />
          <PrintableField label="Tipo de festa" value={eventType} />
          <PrintableField label="Paleta de cor" value={colorPalette} />
          <PrintableField label="Idade do aniversariante e/ou nome dos noivos" value={celebratedPerson} />
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 p-5 print:rounded-none">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-900">Descrição do pacote orçado</h2>
          <p className="mt-3 min-h-12 whitespace-pre-line text-sm leading-6 text-slate-700">{packageDescription || "________________________________"}</p>
          <h2 className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-emerald-900">Pacotes adicionais</h2>
          <p className="mt-3 min-h-10 whitespace-pre-line text-sm leading-6 text-slate-700">{additionalPackages || "________________________________"}</p>
        </section>

        <section className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5 print:rounded-none">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-900">Condições de pagamento</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">{paymentSchedule.map((payment) => <div key={payment.label} className="flex justify-between gap-4"><span>{payment.label}</span><strong>{currency.format(payment.value)}</strong></div>)}</div>
            <div className="mt-4 border-t border-slate-200 pt-3 text-sm"><div className="flex justify-between"><span>Valor recebido / sinal</span><strong>{currency.format(financial.amountPaid)}</strong></div><div className="mt-2 flex justify-between text-amber-800"><span>Saldo restante</span><strong>{currency.format(financial.balance)}</strong></div></div>
          </div>
          <div className="rounded-2xl bg-emerald-900 p-5 text-white print:rounded-none">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Valores do orçamento</p>
            <p className="mt-4 text-sm text-emerald-100">Materiais locados</p><p className="text-xl font-black">{currency.format(financial.itemsTotal)}</p>
            {financial.serviceFee > 0 && <><p className="mt-3 text-sm text-emerald-100">Entrega / montagem</p><p className="text-xl font-black">{currency.format(financial.serviceFee)}</p></>}
            <div className="mt-4 border-t border-emerald-700 pt-4"><p className="text-sm text-emerald-100">Valor do orçamento</p><p className="text-3xl font-black">{currency.format(financial.total)}</p></div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Discriminação dos materiais locados</p><h2 className="mt-1 text-xl font-black text-slate-900">Itens contratados</h2></div><p className="text-sm text-slate-500">{items.length} itens</p></div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 print:rounded-none"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600"><tr><th className="px-3 py-3">Item</th><th className="px-3 py-3">Descrição dos materiais</th><th className="px-3 py-3 text-center">Qtd.</th><th className="px-3 py-3 text-right">Valor unitário</th><th className="px-3 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item, index) => { const subtotal = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0); return <tr key={`${item.product_id ?? "item"}-${index}`}><td className="px-3 py-3 font-bold text-slate-700">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{item.product_name || "Produto"}</td><td className="px-3 py-3 text-center">{item.quantity ?? 0}</td><td className="px-3 py-3 text-right">{currency.format(Number(item.unit_price ?? 0))}</td><td className="px-3 py-3 text-right font-bold">{currency.format(subtotal)}</td></tr>; })}</tbody><tfoot className="bg-slate-50"><tr><td colSpan={4} className="px-3 py-3 text-right text-sm font-black">VALOR TOTAL DOS MATERIAIS LOCADOS</td><td className="px-3 py-3 text-right font-black text-emerald-800">{currency.format(financial.itemsTotal)}</td></tr></tfoot></table></div>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 print:rounded-none">
          <h2 className="font-black uppercase tracking-[0.12em]">Favor ler com atenção</h2>
          <p className="mt-3">O cliente contratante se responsabiliza por perdas e danos sofridos com o material alugado sob sua responsabilidade, devendo arcar com as possíveis avarias ou perdas.</p>
          <p className="mt-3">Em caso de atraso na devolução do material, caso o frete fique sob a responsabilidade do contratante, será cobrada multa de 20% sobre o valor da locação por dia de atraso.</p>
          <p className="mt-3">Em caso de desistência da locação, o valor pago não será devolvido, ficando como crédito para uma nova festividade por tempo indeterminado, podendo ser transferido para outra pessoa.</p>
        </section>

        <section className="mt-12 grid gap-10 text-center text-sm sm:grid-cols-2 print:mt-10"><div className="border-t border-slate-500 pt-3 font-bold text-slate-800">ASSINATURA DO CONTRATANTE</div><div className="border-t border-slate-500 pt-3 font-bold text-slate-800">VÂNIA FESTAS<br /><span className="font-normal">CNPJ: 21.902.702/0001-62</span></div></section>
        <footer className="mt-8 text-center text-xs text-slate-500">Contrato emitido em {new Intl.DateTimeFormat("pt-BR").format(new Date())} · Reserva #{reservation.id}</footer>
      </article>

      <div className="no-print mx-auto mt-5 flex w-full max-w-5xl justify-end"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"><Printer className="h-4 w-4" /> Imprimir contrato</button></div>
    </main>
  );
}
