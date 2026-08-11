"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type PaymentMethod = "pix" | "cash" | "card" | "transfer" | "other";

type Payment = {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string | null;
};

type ReservationPaymentsProps = {
  reservationId: number;
  onTotalChange?: (total: number) => void;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const paymentMethodLabel: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
  other: "Outro",
};

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

export function ReservationPayments({ reservationId, onTotalChange }: ReservationPaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayKey);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const paidTotal = useMemo(
    () => payments.reduce((total, payment) => total + Number(payment.amount), 0),
    [payments]
  );

  useEffect(() => {
    async function loadPayments() {
      const { data, error } = await createClient()
        .from("reservation_payments")
        .select("id, amount, payment_date, payment_method, notes")
        .eq("reservation_id", reservationId)
        .order("payment_date", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        setErrorMessage(`Não foi possível carregar os pagamentos: ${error.message}`);
      } else {
        setPayments((data ?? []) as Payment[]);
      }

      setLoading(false);
    }

    loadPayments();
  }, [reservationId]);

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Informe um valor de pagamento maior que zero.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { data, error } = await createClient()
      .from("reservation_payments")
      .insert({
        reservation_id: reservationId,
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      })
      .select("id, amount, payment_date, payment_method, notes")
      .single();

    if (error || !data) {
      setErrorMessage(`Não foi possível registrar o pagamento: ${error?.message ?? "tente novamente."}`);
    } else {
      const nextPayments = [data as Payment, ...payments];
      setPayments(nextPayments);
      onTotalChange?.(nextPayments.reduce((total, payment) => total + Number(payment.amount), 0));
      setAmount("");
      setPaymentDate(todayKey());
      setPaymentMethod("pix");
      setNotes("");
      setIsFormOpen(false);
    }

    setSaving(false);
  }

  async function deletePayment(paymentId: number) {
    if (!window.confirm("Excluir este pagamento? O valor recebido da reserva será recalculado.")) {
      return;
    }

    setDeletingId(paymentId);
    setErrorMessage("");

    const { error } = await createClient()
      .from("reservation_payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      setErrorMessage(`Não foi possível excluir o pagamento: ${error.message}`);
    } else {
      const nextPayments = payments.filter((payment) => payment.id !== paymentId);
      setPayments(nextPayments);
      onTotalChange?.(nextPayments.reduce((total, payment) => total + Number(payment.amount), 0));
    }

    setDeletingId(null);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><CreditCard className="h-5 w-5" /></span>
          <div>
            <h2 className="font-bold text-slate-900">Pagamentos</h2>
            <p className="mt-1 text-sm text-slate-500">Recebido: <strong className="text-emerald-700">{currency.format(paidTotal)}</strong></p>
          </div>
        </div>
        <button type="button" onClick={() => { setIsFormOpen((current) => !current); setErrorMessage(""); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50">
          <Plus className="h-4 w-4" /> Registrar
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={savePayment} className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Valor recebido<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ex.: 150,00" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-xs font-bold text-slate-700">Data<input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
          </div>
          <label className="text-xs font-bold text-slate-700">Forma de pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">{Object.entries(paymentMethodLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">Observação (opcional)<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: sinal da reserva" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
          <button disabled={saving} className="h-10 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">{saving ? "Registrando..." : "Salvar pagamento"}</button>
        </form>
      )}

      {errorMessage && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">{errorMessage}</p>}

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {loading ? <p className="text-sm text-slate-500">Carregando pagamentos...</p> : payments.length === 0 ? <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p> : payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{currency.format(payment.amount)} · {paymentMethodLabel[payment.payment_method] ?? "Outro"}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(payment.payment_date)}{payment.notes ? ` · ${payment.notes}` : ""}</p>
            </div>
            <button type="button" disabled={deletingId === payment.id} onClick={() => deletePayment(payment.id)} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60" title="Excluir pagamento"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
