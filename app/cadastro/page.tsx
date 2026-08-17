"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/error-messages";
import { getPasswordChecks, isStrongPassword } from "@/lib/auth/password";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const passwordChecks = getPasswordChecks(password);
  const isPasswordValid = isStrongPassword(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");

    if (!isPasswordValid) {
      setErrorMessage("Crie uma senha com os requisitos indicados abaixo.");
      return;
    }

    setLoading(true);

    const { error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/area-cliente`,
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    setMessage(
      "Cadastro enviado. Confirme o e-mail, se solicitado. Depois entre na sua área para incluir sua foto e acompanhar a aprovação."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserPlus className="h-6 w-6" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Área do cliente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Crie seu cadastro</h1>
          <p className="mt-3 leading-7 text-slate-600">Envie seus dados para análise. Assim que a Vânia Festas aprovar, seu acesso ficará liberado.</p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Nome completo
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={3} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">E-mail
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">WhatsApp
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" placeholder="(71) 99999-9999" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Endereço
              <input value={address} onChange={(event) => setAddress(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" placeholder="Rua, número, bairro e cidade" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Crie uma senha
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
              <span className="font-normal text-slate-500">Proteja seu acesso com uma senha forte.</span>
            </label>

            <ul aria-live="polite" className="-mt-2 grid gap-1 text-sm sm:col-span-2 sm:grid-cols-2">
              {passwordChecks.map((check) => (
                <li key={check.label} className={check.valid ? "text-emerald-700" : "text-slate-500"}>
                  {check.valid ? "✓" : "○"} {check.label}
                </li>
              ))}
            </ul>

            {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2">{errorMessage}</p>}
            {message && <p className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 sm:col-span-2"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>}

            <button disabled={loading} className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
              {loading ? "Enviando cadastro..." : "Enviar cadastro para aprovação"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">Já possui cadastro? <Link href="/area-cliente" className="font-bold text-emerald-700 hover:text-emerald-900">Entrar na área do cliente</Link></p>
        </div>
      </div>
    </main>
  );
}
