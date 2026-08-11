"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type Item = {
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

type Props = {
  customerName: string;
  eventDate: string;
  eventAddress: string | null;
  notes: string | null;
  serviceFee: number;
  amountPaid: number;
  items: Item[];
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function CopyReservationSummaryButton({ customerName, eventDate, eventAddress, notes, serviceFee, amountPaid, items }: Props) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
    const total = itemsTotal + Number(serviceFee || 0);
    const balance = Math.max(total - Number(amountPaid || 0), 0);
    const message = `Olá, ${customerName}!\n\nResumo da sua reserva:\n\n${items.map((item) => `• ${item.quantity ?? 0}× ${item.product_name || "Produto"}`).join("\n")}\n\nData: ${formatDate(eventDate)}${eventAddress ? `\nEndereço: ${eventAddress}` : ""}${serviceFee > 0 ? `\nTaxa de entrega / montagem: ${currency.format(serviceFee)}` : ""}${notes ? `\nObservações: ${notes.replace(/\n+/g, " ")}` : ""}\nTotal: ${currency.format(total)}\nValor recebido: ${currency.format(amountPaid)}\nSaldo restante: ${currency.format(balance)}`;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <button type="button" onClick={() => void copySummary()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"><Copy className="h-4 w-4" />{copied ? "Resumo copiado" : "Copiar resumo"}</button>;
}
