"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

import { getPasswordChecks, isStrongPassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/error-messages";

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const passwordChecks = getPasswordChecks(password);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setReady(Boolean(session));
        setCheckedSession(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(Boolean(session));
        setCheckedSession(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!ready) {
      setErrorMessage("Abra o link recebido por e-mail para criar uma nova senha.");
      return;
    }

    if (!isStrongPassword(password)) {
      setErrorMessage("Crie uma senha com os requisitos indicados abaixo.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas informadas não são iguais.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    setComplete(true);
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
        <h1 className="mt-5 text-3xl font-black text-slate-900">Criar nova senha</h1>

        {complete ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" /> Senha atualizada com sucesso.</p>
            <p className="mt-2 text-sm">Use sua nova senha no próximo acesso.</p>
            <Link href="/area-cliente" className="mt-5 inline-flex rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900">Entrar na área do cliente</Link>
          </div>
        ) : !checkedSession ? (
          <p className="mt-6 text-slate-600">Validando seu link seguro...</p>
        ) : !ready ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-bold">Este link é inválido ou expirou.</p>
            <p className="mt-2 text-sm">Solicite um novo link para continuar.</p>
            <Link href="/recuperar-senha" className="mt-5 inline-flex rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900">Solicitar novo link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Nova senha
              <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
            </label>

            <ul aria-live="polite" className="-mt-2 grid gap-1 text-sm">
              {passwordChecks.map((check) => <li key={check.label} className={check.valid ? "text-emerald-700" : "text-slate-500"}>{check.valid ? "✓" : "○"} {check.label}</li>)}
            </ul>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Confirmar nova senha
              <input type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
            </label>

            {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</p>}
            <button disabled={loading} className="h-12 rounded-xl bg-emerald-800 px-5 font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
