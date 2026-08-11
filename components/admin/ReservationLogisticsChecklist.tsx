"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ChecklistKey = "items_checked" | "vehicle_loaded" | "assembly_completed" | "return_checked";

type ChecklistItem = {
  key: ChecklistKey;
  label: string;
  description: string;
};

type ChecklistRow = {
  item_key: ChecklistKey;
  completed_at: string | null;
};

const checklistItems: ChecklistItem[] = [
  { key: "items_checked", label: "Itens conferidos", description: "Confira quantidades e condição dos produtos antes da saída." },
  { key: "vehicle_loaded", label: "Veículo carregado", description: "Materiais separados e prontos para transporte." },
  { key: "assembly_completed", label: "Montagem concluída", description: "Decoração entregue ou montada no endereço do evento." },
  { key: "return_checked", label: "Devolução conferida", description: "Produtos retornaram e foram checados após o evento." },
];

export function ReservationLogisticsChecklist({ reservationId }: { reservationId: number }) {
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<ChecklistKey | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChecklist() {
      const { data, error } = await createClient()
        .from("reservation_logistics_checklist")
        .select("item_key, completed_at")
        .eq("reservation_id", reservationId);

      if (error) setErrorMessage(`Não foi possível carregar o checklist: ${error.message}`);
      else setRows((data ?? []) as ChecklistRow[]);
      setLoading(false);
    }

    loadChecklist();
  }, [reservationId]);

  const completedByKey = useMemo(() => new Map(rows.map((row) => [row.item_key, row.completed_at])), [rows]);
  const completedCount = rows.filter((row) => row.completed_at).length;

  async function toggleItem(item: ChecklistItem) {
    const completedAt = completedByKey.get(item.key) ? null : new Date().toISOString();
    setUpdatingKey(item.key);
    setErrorMessage("");

    const { error } = await createClient()
      .from("reservation_logistics_checklist")
      .upsert({ reservation_id: reservationId, item_key: item.key, completed_at: completedAt }, { onConflict: "reservation_id,item_key" });

    if (error) {
      setErrorMessage(`Não foi possível salvar o checklist: ${error.message}`);
    } else {
      setRows((current) => [...current.filter((row) => row.item_key !== item.key), { item_key: item.key, completed_at: completedAt }]);
    }

    setUpdatingKey(null);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
        <div><h2 className="font-bold text-slate-900">Checklist operacional</h2><p className="mt-1 text-sm text-slate-500">{completedCount} de {checklistItems.length} etapas concluídas</p></div>
      </div>
      {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando checklist...</div> : <div className="mt-4 space-y-2">{checklistItems.map((item) => {
        const completed = Boolean(completedByKey.get(item.key));
        const updating = updatingKey === item.key;
        return <button key={item.key} type="button" disabled={updatingKey !== null} onClick={() => toggleItem(item)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-wait disabled:opacity-60 ${completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${completed ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`}>{updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : completed && <Check className="h-3.5 w-3.5" />}</span><span><span className={`block text-sm font-bold ${completed ? "text-emerald-800" : "text-slate-800"}`}>{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span></span></button>;
      })}</div>}
      {errorMessage && <p className="mt-3 text-sm font-medium text-red-700">{errorMessage}</p>}
    </section>
  );
}
