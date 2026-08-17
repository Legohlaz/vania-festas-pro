"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/error-messages";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");

    if (permissionError || !isAdmin) {
      await supabase.auth.signOut();
      setMessage("Este acesso é exclusivo da administração. Clientes devem entrar pela Área do cliente.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Vânia Festas Pro</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Acesso administrativo</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Entre para administrar reservas, produtos, clientes e a operação.</p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-bold text-slate-800">
            E-mail
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-bold text-slate-800">
            Senha
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <Link className="inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline" href="/recuperar-senha">
            Esqueci minha senha
          </Link>

          {message && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>}

          <button
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar na administração"}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          É cliente?{" "}
          <Link className="font-bold text-emerald-700 hover:underline" href="/area-cliente">
            Acesse sua área aqui
          </Link>
        </p>
      </section>
    </main>
  );
}
