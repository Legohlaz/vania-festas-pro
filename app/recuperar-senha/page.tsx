"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/error-messages";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");
    setLoading(true);

    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    setMessage("Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também a caixa de spam.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/area-cliente" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> Voltar para entrar
        </Link>

        <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-900">Recuperar senha</h1>
        <p className="mt-2 leading-6 text-slate-600">Informe seu e-mail para receber um link seguro de redefinição.</p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</p>}
          {message && <p className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>}

          <button disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" /> {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
      </section>
    </main>
  );
}
