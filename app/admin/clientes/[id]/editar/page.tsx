"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Save, Trash2, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      const customerId = Number(id);
      if (!Number.isInteger(customerId)) {
        setErrorMessage("Cliente inválido.");
        setLoading(false);
        return;
      }

      const { data, error } = await createClient()
        .from("customers")
        .select("id, name, email, phone, address, notes")
        .eq("id", customerId)
        .single();

      if (error || !data) setErrorMessage(error?.message ?? "Cliente não encontrado.");
      else setCustomer(data as Customer);
      setLoading(false);
    }

    loadCustomer();
  }, [id]);

  function updateField(field: keyof Omit<Customer, "id">, value: string) {
    setCustomer((current) => current ? { ...current, [field]: value } : current);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    setSaving(true);
    setErrorMessage("");

    const { error } = await createClient()
      .from("customers")
      .update({
        name: customer.name.trim(),
        email: customer.email?.trim() || null,
        phone: customer.phone?.trim() || null,
        address: customer.address?.trim() || null,
        notes: customer.notes?.trim() || null,
      })
      .eq("id", customer.id);

    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    router.push("/admin/clientes");
    router.refresh();
  }

  async function handleDelete() {
    if (!customer) return;
    const confirmed = window.confirm(
      `Excluir definitivamente o cliente ${customer.name}?\n\nAs reservas já criadas serão mantidas no histórico, mas deixarão de ficar vinculadas a este cadastro.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setErrorMessage("");
    const supabase = createClient();
    const { error: unlinkError } = await supabase
      .from("reservations")
      .update({ customer_id: null })
      .eq("customer_id", customer.id);

    if (unlinkError) {
      setDeleting(false);
      setErrorMessage(unlinkError.message);
      return;
    }

    const { error: deleteError } = await supabase.from("customers").delete().eq("id", customer.id);
    setDeleting(false);
    if (deleteError) {
      setErrorMessage(deleteError.message);
      return;
    }
    router.push("/admin/clientes");
    router.refresh();
  }

  if (loading) return <main className="flex min-h-[70vh] items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Carregando cliente...</main>;

  if (!customer) return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4"><p className="font-semibold text-slate-700">{errorMessage || "Cliente não encontrado."}</p><Link href="/admin/clientes" className="text-sm font-bold text-emerald-700">Voltar para clientes</Link></main>;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" />Voltar para clientes</Link>
        <div className="mt-6 flex items-center gap-3"><span className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><UserRound className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Cadastro de cliente</p><h1 className="mt-1 text-3xl font-black text-slate-900">Editar cliente</h1></div></div>

        <form onSubmit={handleSubmit} className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Nome<input value={customer.name} onChange={(event) => updateField("name", event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Telefone<input value={customer.phone ?? ""} onChange={(event) => updateField("phone", event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">E-mail<input type="email" value={customer.email ?? ""} onChange={(event) => updateField("email", event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-700" />Endereço</span><input value={customer.address ?? ""} onChange={(event) => updateField("address", event.target.value)} placeholder="Rua, número, bairro e cidade" className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Observações<textarea value={customer.notes ?? ""} onChange={(event) => updateField("notes", event.target.value)} rows={4} placeholder="Informações importantes sobre o cliente" className="resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-normal outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>
          </div>
          {errorMessage && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{errorMessage}</p>}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={handleDelete} disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">{deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Excluindo...</> : <><Trash2 className="h-4 w-4" />Excluir cliente</>}</button><div className="flex flex-wrap gap-3"><Link href="/admin/clientes" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</Link><button type="submit" disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Save className="h-4 w-4" />Salvar alterações</>}</button></div></div>
        </form>
      </div>
    </main>
  );
}
