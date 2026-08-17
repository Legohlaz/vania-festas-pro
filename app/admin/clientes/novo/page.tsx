"use client";

import Link from "next/link";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CustomerFormField = "name" | "email" | "phone" | "address";

export default function NovoClientePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    approval_status: "approved" as const,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("customers").insert(form);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Cliente cadastrado com sucesso!");
    history.back();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800">
          <ArrowLeft size={18}/>
          Voltar
        </Link>

        <div className="mt-10 flex items-center gap-3">
          <UserPlus className="text-emerald-700"/>
          <h1 className="text-4xl font-black">Novo Cliente</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl bg-white p-8 shadow-sm space-y-5">
          {([
            ["name","Nome"],
            ["email","E-mail"],
            ["phone","Telefone"],
            ["address","Endereço completo"],
          ] as [CustomerFormField, string][]).map(([key,label])=>(
            <div key={key}>
              <label className="mb-2 block text-sm font-bold">{label}</label>
              <input
                className="h-12 w-full rounded-xl border border-gray-200 px-4"
                value={form[key]}
                onChange={e=>setForm({...form,[key]:e.target.value})}
                placeholder={key === "address" ? "Rua, número, bairro, cidade e CEP" : undefined}
              />
            </div>
          ))}

          <button
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 font-bold text-white"
          >
            <Save size={18}/>
            {loading ? "Salvando..." : "Salvar cliente"}
          </button>
        </form>
      </div>
    </main>
  );
}
