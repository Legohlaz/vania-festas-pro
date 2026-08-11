"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent, mode: "login" | "signup") {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup") {
      setMessage("Cadastro criado. Confirme o e-mail, se solicitado, e depois entre.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><form className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm" onSubmit={(event) => submit(event, "login")}><h1 className="text-3xl font-black">Acesso administrativo</h1><p className="mt-2 text-gray-600">Entre para administrar a Vânia Festas.</p><label className="mt-6 block font-semibold">E-mail<input className="mt-2 h-12 w-full rounded-xl border px-4" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="mt-4 block font-semibold">Senha<input className="mt-2 h-12 w-full rounded-xl border px-4" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{message && <p className="mt-4 text-sm text-red-700">{message}</p>}<button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Aguarde..." : "Entrar"}</button><button type="button" disabled={loading} onClick={(event) => submit(event as unknown as FormEvent, "signup")} className="mt-3 w-full rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-800">Criar acesso</button></form></main>;
}
