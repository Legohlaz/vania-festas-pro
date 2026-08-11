"use client";

import { Save } from "lucide-react";

type ReservationItem = {
  quantity: number;
  unit_price: number;
};

type Props = {
  items: ReservationItem[];
  serviceFee?: number;
  amountPaid?: number;
  onSave: () => void;
  isSaving?: boolean;
};

export default function ReservationSummary({
  items,
  serviceFee = 0,
  amountPaid = 0,
  onSave,
  isSaving = false,
}: Props) {
  const itemsTotal = items.reduce(
    (sum, item) =>
      sum +
      item.quantity *
      item.unit_price,
    0
  );
  const total = itemsTotal + Math.max(serviceFee, 0);
  const balance = Math.max(total - Math.max(amountPaid, 0), 0);

  const totalItems = items.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">

      <h2 className="text-xl font-black">
        Resumo da Reserva
      </h2>

      <div className="mt-8 space-y-5">

        <div className="flex items-center justify-between">

          <span className="text-gray-600">
            Produtos
          </span>

          <span className="font-bold">
            {items.length}
          </span>

        </div>

        {serviceFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Entrega / montagem</span>
            <span className="font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(serviceFee)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Valor recebido</span>
          <span className="font-bold text-emerald-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountPaid)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Saldo restante</span>
          <span className="font-bold text-amber-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(balance)}</span>
        </div>

        <div className="flex items-center justify-between">

          <span className="text-gray-600">
            Quantidade Total
          </span>

          <span className="font-bold">
            {totalItems}
          </span>

        </div>

        <div className="border-t pt-5 flex items-center justify-between">

          <span className="text-xl font-black">
            Total
          </span>

          <span className="text-3xl font-black text-emerald-700">

            {new Intl.NumberFormat(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL",
              }
            ).format(total)}

          </span>

        </div>

      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-4 font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={18} />

        {isSaving ? "Salvando..." : "Salvar Alterações"}

      </button>

    </div>
  );
}
