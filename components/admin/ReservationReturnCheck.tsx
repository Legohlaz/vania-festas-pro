"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Save, TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ReservationItem = {
  id: number;
  product_id: number | null;
  quantity: number | null;
  products: { name: string | null } | null;
};

type ReturnRow = {
  reservation_item_id: number;
  returned_quantity: number;
  damaged_quantity: number;
  lost_quantity: number;
  notes: string | null;
};

type ReturnLine = {
  returnedQuantity: string;
  damagedQuantity: string;
  lostQuantity: string;
  notes: string;
};

type Props = {
  reservationId: number;
  logisticsStatus: "scheduled" | "preparing" | "delivered" | "returned" | null;
  onFinished: () => void;
};

function initialLine(expectedQuantity: number, row?: ReturnRow): ReturnLine {
  return {
    returnedQuantity: String(row?.returned_quantity ?? expectedQuantity),
    damagedQuantity: String(row?.damaged_quantity ?? 0),
    lostQuantity: String(row?.lost_quantity ?? 0),
    notes: row?.notes ?? "",
  };
}

function parseQuantity(value: string) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 0 ? quantity : null;
}

export function ReservationReturnCheck({ reservationId, logisticsStatus, onFinished }: Props) {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [lines, setLines] = useState<Record<number, ReturnLine>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setMessage("");
      const supabase = createClient();
      const [itemsResult, returnsResult] = await Promise.all([
        supabase
          .from("reservation_items")
          .select("id,product_id,quantity,products(name)")
          .eq("reservation_id", reservationId),
        supabase
          .from("reservation_return_items")
          .select("reservation_item_id,returned_quantity,damaged_quantity,lost_quantity,notes")
          .eq("reservation_id", reservationId),
      ]);

      if (!active) return;

      if (itemsResult.error || returnsResult.error) {
        setMessage(`Não foi possível carregar a conferência: ${itemsResult.error?.message ?? returnsResult.error?.message}`);
        setLoading(false);
        return;
      }

      const nextItems = (itemsResult.data ?? []).map((item) => {
        const productRelation = item.products;
        const product = Array.isArray(productRelation) ? productRelation[0] ?? null : productRelation;

        return {
          id: Number(item.id),
          product_id: item.product_id === null ? null : Number(item.product_id),
          quantity: item.quantity === null ? null : Number(item.quantity),
          products: product ? { name: product.name ?? null } : null,
        } satisfies ReservationItem;
      });
      const returnByItem = new Map(
        ((returnsResult.data ?? []) as ReturnRow[]).map((row) => [row.reservation_item_id, row])
      );
      setItems(nextItems);
      setLines(Object.fromEntries(nextItems.map((item) => [item.id, initialLine(Number(item.quantity ?? 0), returnByItem.get(item.id))])));
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [reservationId]);

  const hasProblems = useMemo(
    () => items.some((item) => {
      const line = lines[item.id];
      return Number(line?.damagedQuantity ?? 0) > 0 || Number(line?.lostQuantity ?? 0) > 0;
    }),
    [items, lines]
  );

  function updateLine(itemId: number, field: keyof ReturnLine, value: string) {
    setLines((current) => ({ ...current, [itemId]: { ...current[itemId], [field]: value } }));
  }

  async function save(finalize: boolean) {
    setMessage("");
    const payload = [] as Array<Record<string, string | number | null>>;

    for (const item of items) {
      const expectedQuantity = Number(item.quantity ?? 0);
      const line = lines[item.id];
      const returnedQuantity = parseQuantity(line?.returnedQuantity ?? "");
      const damagedQuantity = parseQuantity(line?.damagedQuantity ?? "");
      const lostQuantity = parseQuantity(line?.lostQuantity ?? "");

      if (returnedQuantity === null || damagedQuantity === null || lostQuantity === null) {
        setMessage("Informe apenas quantidades inteiras iguais ou maiores que zero.");
        return;
      }

      if (returnedQuantity + damagedQuantity + lostQuantity !== expectedQuantity) {
        setMessage(`A conferência de ${item.products?.name ?? "um produto"} deve somar exatamente ${expectedQuantity} unidades.`);
        return;
      }

      payload.push({
        reservation_id: reservationId,
        reservation_item_id: item.id,
        product_id: item.product_id,
        expected_quantity: expectedQuantity,
        returned_quantity: returnedQuantity,
        damaged_quantity: damagedQuantity,
        lost_quantity: lostQuantity,
        notes: line?.notes.trim() || null,
        checked_at: new Date().toISOString(),
      });
    }

    if (payload.length === 0) {
      setMessage("Esta reserva não possui itens para conferir.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("reservation_return_items")
      .upsert(payload, { onConflict: "reservation_item_id" });

    if (error) {
      setMessage(`Não foi possível salvar a devolução: ${error.message}`);
      setSaving(false);
      return;
    }

    if (finalize && logisticsStatus !== "returned") {
      const { error: logisticsError } = await supabase
        .from("reservations")
        .update({ logistics_status: "returned" })
        .eq("id", reservationId);

      if (logisticsError) {
        setMessage(`Conferência salva, mas não foi possível finalizar a devolução: ${logisticsError.message}`);
        setSaving(false);
        return;
      }
    }

    setMessage(finalize ? "Devolução conferida e finalizada." : "Conferência de devolução salva.");
    setSaving(false);
    onFinished();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-violet-50 p-2 text-violet-700"><ClipboardCheck className="h-5 w-5" /></span>
        <div>
          <h2 className="font-bold text-slate-900">Conferência de devolução</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Registre o que voltou, o que precisa de reparo e eventuais perdas.</p>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Carregando itens...</p> : (
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const expected = Number(item.quantity ?? 0);
            const line = lines[item.id] ?? initialLine(expected);
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-800">{item.products?.name ?? "Produto"}</p><span className="text-xs font-bold text-slate-500">{expected} unidades</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ["returnedQuantity", "Devolvidas"],
                    ["damagedQuantity", "Avariadas"],
                    ["lostQuantity", "Perdidas"],
                  ] as Array<[keyof ReturnLine, string]>).map(([field, label]) => (
                    <label key={field} className="text-xs font-semibold text-slate-600">{label}
                      <input type="number" min="0" step="1" value={line[field]} onChange={(event) => updateLine(item.id, field, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-emerald-700" />
                    </label>
                  ))}
                </div>
                <input value={line.notes} onChange={(event) => updateLine(item.id, "notes", event.target.value)} placeholder="Observação (ex.: pequena avaria na pintura)" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700" />
              </div>
            );
          })}
          {hasProblems && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800"><TriangleAlert className="h-5 w-5 shrink-0" />Há itens avariados ou perdidos registrados. Atualize a situação deles no cadastro de produtos, se necessário.</p>}
          {message && <p className={`rounded-xl p-3 text-sm font-medium ${message.startsWith("Não") || message.startsWith("Informe") || message.startsWith("A conferência") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void save(false)} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-3 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"><Save className="h-4 w-4" />Salvar conferência</button>
            {logisticsStatus !== "returned" && <button type="button" onClick={() => void save(true)} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Concluir devolução</button>}
          </div>
        </div>
      )}
    </section>
  );
}
