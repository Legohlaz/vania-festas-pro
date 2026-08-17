"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  Clock3,
  Mail,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ApprovalStatus = "pending" | "approved" | "rejected";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: ApprovalStatus;
};

const approvalLabel: Record<ApprovalStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Reprovado",
};

const approvalClass: Record<ApprovalStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await createClient()
      .from("customers")
      .select("id,name,email,phone,avatar_url,approval_status")
      .order("created_at", { ascending: false });

    if (error) setErrorMessage(error.message);
    else setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function changeApproval(customerId: number, approvalStatus: ApprovalStatus) {
    setUpdatingId(customerId);
    setErrorMessage(null);

    const { error } = await createClient()
      .from("customers")
      .update({ approval_status: approvalStatus })
      .eq("id", customerId);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId ? { ...customer, approval_status: approvalStatus } : customer,
        ),
      );
    }

    setUpdatingId(null);
  }

  const filteredCustomers = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email ?? "", customer.phone ?? ""].some((value) => normalizeText(value).includes(term)),
    );
  }, [customers, search]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-12">
        <Link href="/admin/reservas" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800">
          <ArrowLeft size={18} /> Voltar para reservas
        </Link>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700"><Users size={18} /> Administração</div>
            <h1 className="mt-3 text-4xl font-black text-slate-900">Clientes</h1>
            <p className="mt-3 text-gray-600">Aprove os cadastros feitos pelos clientes e organize os contatos da Vânia Festas.</p>
          </div>
          <Link href="/admin/clientes/novo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-900"><Plus size={18} /> Novo cliente</Link>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" style={{ paddingLeft: "48px" }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone..." /></div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><div className="flex items-center gap-2 text-sm text-gray-500"><SlidersHorizontal size={16} /><span>{filteredCustomers.length === 1 ? "1 cliente encontrado" : `${filteredCustomers.length} clientes encontrados`}</span></div>{search && <button onClick={() => setSearch("")} className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Limpar busca</button>}</div>
        </div>

        {errorMessage && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">Não foi possível carregar ou atualizar clientes: {errorMessage}</div>}

        <div className="mt-5 flex flex-col gap-4">
          {filteredCustomers.map((customer) => {
            const status = customer.approval_status ?? "approved";
            const changing = updatingId === customer.id;

            return (
              <article key={customer.id} className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
                  {customer.avatar_url ? <Image src={customer.avatar_url} alt={`Foto de ${customer.name}`} fill sizes="64px" className="object-cover" /> : <Users size={28} className="text-emerald-700" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-900">{customer.name}</h2><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${approvalClass[status]}`}>{status === "pending" ? <Clock3 size={13} /> : status === "approved" ? <CheckCircle2 size={13} /> : <CircleX size={13} />}{approvalLabel[status]}</span></div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="inline-flex items-center gap-2"><Mail size={15} /> {customer.email ?? "E-mail não informado"}</span><span className="inline-flex items-center gap-2"><Phone size={15} /> {customer.phone ?? "Telefone não informado"}</span></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {status !== "approved" && <button disabled={changing} onClick={() => void changeApproval(customer.id, "approved")} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60">{changing ? "Salvando..." : "Aprovar"}</button>}
                  {status !== "rejected" && <button disabled={changing} onClick={() => void changeApproval(customer.id, "rejected")} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">Reprovar</button>}
                  <Link href={`/admin/clientes/${customer.id}/editar`} className="rounded-xl border border-emerald-700 px-4 py-2 text-center text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">Editar</Link>
                </div>
              </article>
            );
          })}

          {!loading && !errorMessage && filteredCustomers.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><Users size={32} className="mx-auto text-gray-300" /><h2 className="mt-3 text-lg font-black">Nenhum cliente encontrado</h2><p className="mt-2 text-sm text-gray-500">Cadastre um cliente ou aguarde os pedidos de cadastro do site.</p></div>}
        </div>
      </div>
    </main>
  );
}
