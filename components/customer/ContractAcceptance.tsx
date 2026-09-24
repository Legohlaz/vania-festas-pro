"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, FileSignature, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export type ContractAcceptanceRecord = {
  id: number;
  signer_name: string;
  signer_document: string;
  terms_version: string;
  accepted_at: string;
};

type ContractAcceptanceProps = {
  reservationId: number;
  customerId: number;
  customerName: string;
  eventDate: string;
  eventAddress: string | null;
  total: number;
  itemsSummary: string;
  initialAcceptance: ContractAcceptanceRecord | null;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ContractAcceptance({
  reservationId,
  customerId,
  customerName,
  eventDate,
  eventAddress,
  total,
  itemsSummary,
  initialAcceptance,
}: ContractAcceptanceProps) {
  const [acceptance, setAcceptance] = useState(initialAcceptance);
  const [signerName, setSignerName] = useState(customerName);
  const [signerDocument, setSignerDocument] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function acceptContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const documentDigits = signerDocument.replace(/\D/g, "");
    if (signerName.trim().length < 3) {
      setErrorMessage("Informe o nome completo do responsável.");
      return;
    }
    if (documentDigits.length < 8 || documentDigits.length > 14) {
      setErrorMessage("Informe um CPF ou RG válido.");
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("Confirme que leu e aceita as condições do contrato.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Sua sessão expirou. Entre novamente para aceitar o contrato.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("reservation_contract_acceptances")
      .insert({
        reservation_id: reservationId,
        customer_id: customerId,
        accepted_by_user: user.id,
        signer_name: signerName.trim(),
        signer_document: signerDocument.trim(),
      })
      .select("id,signer_name,signer_document,terms_version,accepted_at")
      .single();

    setSubmitting(false);

    if (error) {
      setErrorMessage(
        error.code === "23505"
          ? "Este contrato já foi aceito. Atualize a página para consultar o registro."
          : "Não foi possível registrar o aceite. Tente novamente."
      );
      return;
    }

    setAcceptance(data as ContractAcceptanceRecord);
  }

  if (acceptance) {
    return (
      <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <h3 className="font-black text-emerald-950">Contrato aceito digitalmente</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Aceito por {acceptance.signer_name} em{" "}
              {new Date(acceptance.accepted_at).toLocaleString("pt-BR")}.
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Documento final {acceptance.signer_document.slice(-4).padStart(4, "•")} · versão {acceptance.terms_version}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex gap-3">
        <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
        <div>
          <h3 className="font-black text-violet-950">Aceite digital do contrato</h3>
          <p className="mt-1 text-sm leading-6 text-violet-800">
            Leia as condições abaixo e confirme o contrato da reserva #{reservationId}.
          </p>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-sm text-slate-700">
        <summary className="cursor-pointer font-black text-violet-900">Ler o contrato antes de aceitar</summary>
        <div className="mt-4 space-y-3 leading-6">
          <p><strong>Evento:</strong> {new Date(`${eventDate}T12:00:00`).toLocaleDateString("pt-BR")} · {eventAddress || "local a confirmar"}.</p>
          <p><strong>Itens contratados:</strong> {itemsSummary || "itens descritos na reserva"}.</p>
          <p><strong>Valor total:</strong> {currency.format(total)}.</p>
          <p>O contratante se responsabiliza por perdas e danos sofridos pelos materiais enquanto estiverem sob sua responsabilidade.</p>
          <p>Em caso de atraso na devolução, quando o frete for responsabilidade do contratante, poderá ser cobrada multa de 20% sobre o valor da locação por dia de atraso.</p>
          <p>Em caso de desistência, o valor pago ficará como crédito para uma nova festividade, conforme as condições combinadas com a Vânia Festas.</p>
        </div>
      </details>

      <form onSubmit={acceptContract} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
          Nome completo do responsável
          <input value={signerName} onChange={(event) => setSignerName(event.target.value)} className="h-11 rounded-lg border border-violet-200 bg-white px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
          CPF ou RG
          <input value={signerDocument} onChange={(event) => setSignerDocument(event.target.value)} inputMode="numeric" placeholder="Informe o documento" className="h-11 rounded-lg border border-violet-200 bg-white px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm leading-5 text-slate-700">
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-700" />
          <span>Li as condições, conferi os itens e valores e aceito digitalmente este contrato.</span>
        </label>
        {errorMessage && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p>}
        <button disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60">
          <ShieldCheck className="h-4 w-4" />
          {submitting ? "Registrando aceite..." : "Aceitar contrato digitalmente"}
        </button>
      </form>
    </section>
  );
}
