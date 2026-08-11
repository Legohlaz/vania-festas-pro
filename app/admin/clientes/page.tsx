"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = { id: number; name: string; email: string | null; phone: string | null };

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      const { data, error } = await createClient()
        .from("customers")
        .select("id,name,email,phone")
        .order("created_at", { ascending: false });

      if (error) setErrorMessage(error.message);
      else setCustomers((data ?? []) as Customer[]);
      setLoading(false);
    }
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email ?? "", customer.phone ?? ""].some((value) => normalizeText(value).includes(term))
    );
  }, [customers, search]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl" style={{ padding: "48px 32px" }}>
        <Link href="/admin/reservas" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800"><ArrowLeft size={18} /> Voltar para reservas</Link>
        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700"><Users size={18} /> Administração</div><h1 className="mt-3 text-4xl font-black">Clientes</h1><p className="mt-3 text-gray-600">Organize os contatos que fazem reservas na Vânia Festas.</p></div>
          <Link href="/admin/clientes/novo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-900"><Plus size={18} /> Novo cliente</Link>
        </div>
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" style={{ paddingLeft: "48px" }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone..." /></div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><div className="flex items-center gap-2 text-sm text-gray-500"><SlidersHorizontal size={16} /><span>{filteredCustomers.length === 1 ? "1 cliente encontrado" : `${filteredCustomers.length} clientes encontrados`}</span></div>{search && <button onClick={() => setSearch("")} className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Limpar busca</button>}</div>
        </div>
        {errorMessage && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar clientes: {errorMessage}</div>}
        <div className="mt-5 flex flex-col gap-4">
          {filteredCustomers.map((customer) => <div key={customer.id} className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><Users size={28} className="text-emerald-700" /></div><div className="flex-1"><h2 className="text-lg font-black">{customer.name}</h2><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="inline-flex items-center gap-2"><Mail size={15} /> {customer.email ?? "E-mail não informado"}</span><span className="inline-flex items-center gap-2"><Phone size={15} /> {customer.phone ?? "Telefone não informado"}</span></div></div><Link href={`/admin/clientes/${customer.id}/editar`} className="rounded-xl border border-emerald-700 px-4 py-2 text-center text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">Editar cliente</Link></div>)}
          {!loading && !errorMessage && filteredCustomers.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><Users size={32} className="mx-auto text-gray-300" /><h2 className="mt-3 text-lg font-black">Nenhum cliente encontrado</h2><p className="mt-2 text-sm text-gray-500">Cadastre um cliente para começar a criar e gerenciar reservas.</p></div>}
        </div>
      </div>
    </main>
  );
}
