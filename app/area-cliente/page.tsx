"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LogOut,
  MapPin,
  MessageCircle,
  PackageOpen,
  ShieldAlert,
  Clock3,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/error-messages";
import { createWhatsAppLink } from "@/lib/whatsapp";

type CustomerProfile = {
  id: number;
  auth_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
};

type ReservationItem = {
  quantity: number | null;
  unit_price: number | null;
  products: { name: string | null } | { name: string | null }[] | null;
};

type CustomerReservation = {
  id: number;
  event_date: string;
  event_address: string | null;
  status: "pending" | "confirmed" | "cancelled" | string;
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: ReservationItem[] | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function reservationItemsTotal(reservation: CustomerReservation) {
  return (reservation.reservation_items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    0
  );
}

function reservationTotal(reservation: CustomerReservation) {
  return reservationItemsTotal(reservation) + Number(reservation.service_fee ?? 0);
}

function reservationStatus(status: CustomerReservation["status"]) {
  if (status === "confirmed") return { label: "Confirmada", className: "bg-emerald-100 text-emerald-800" };
  if (status === "cancelled") return { label: "Cancelada", className: "bg-red-100 text-red-700" };
  return { label: "Em análise", className: "bg-amber-100 text-amber-800" };
}

function reservationItemName(item: ReservationItem) {
  const product = Array.isArray(item.products) ? item.products[0] : item.products;
  return product?.name ?? "Item da reserva";
}

function statusDetails(status: CustomerProfile["approval_status"]) {
  if (status === "approved") {
    return {
      label: "Cadastro aprovado",
      text: "Seu cadastro foi aprovado. Acompanhe suas reservas e mantenha seus dados atualizados por aqui.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      Icon: CheckCircle2,
    };
  }

  if (status === "rejected") {
    return {
      label: "Cadastro não aprovado",
      text: "Entre em contato com a Vânia Festas para saber mais detalhes ou corrigir seus dados.",
      className: "border-red-200 bg-red-50 text-red-700",
      Icon: ShieldAlert,
    };
  }

  return {
    label: "Cadastro em análise",
    text: "Seus dados foram recebidos e aguardam aprovação da Vânia Festas.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Clock3,
  };
}

function ReservationCard({ reservation, customerName }: { reservation: CustomerReservation; customerName: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStatus = reservationStatus(reservation.status);
  const itemsTotal = reservationItemsTotal(reservation);
  const total = reservationTotal(reservation);
  const paid = Number(reservation.amount_paid ?? 0);
  const balance = Math.max(total - paid, 0);
  const formattedDate = new Date(`${reservation.event_date}T12:00:00`).toLocaleDateString("pt-BR");
  const itemsSummary = (reservation.reservation_items ?? [])
    .map((item) => `${Number(item.quantity ?? 0)}x ${reservationItemName(item)}`)
    .join(", ");
  const whatsappLink = createWhatsAppLink({
    message: `Olá! Sou ${customerName} e gostaria de falar sobre a reserva #${reservation.id}, marcada para ${formattedDate}.${itemsSummary ? ` Itens: ${itemsSummary}.` : ""}`,
  });

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        className="w-full p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-black text-slate-900">Reserva #{reservation.id}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentStatus.className}`}>
              {currentStatus.label}
            </span>
            <span className="text-emerald-700">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <p className="text-slate-500">
            Total <strong className="ml-1 text-slate-900">{currency.format(total)}</strong>
          </p>
          <span className="font-bold text-emerald-700">{isExpanded ? "Ocultar detalhes" : "Ver detalhes"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          {reservation.event_address && (
            <p className="mb-4 flex gap-2 text-sm leading-6 text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span><strong className="text-slate-800">Local do evento:</strong> {reservation.event_address}</span>
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-bold text-slate-900">Itens da reserva</h3>
            </div>
            {(reservation.reservation_items ?? []).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Nenhum item foi encontrado nesta reserva.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(reservation.reservation_items ?? []).map((item, index) => {
                  const quantity = Number(item.quantity ?? 0);
                  const unitPrice = Number(item.unit_price ?? 0);
                  return (
                    <li key={`${reservation.id}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-800">{reservationItemName(item)}</p>
                        <p className="mt-0.5 text-slate-500">{quantity} {quantity === 1 ? "unidade" : "unidades"} × {currency.format(unitPrice)}</p>
                      </div>
                      <strong className="whitespace-nowrap text-slate-900">{currency.format(quantity * unitPrice)}</strong>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <dl className="mt-4 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Itens</dt><dd className="font-bold text-slate-800">{currency.format(itemsTotal)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Entrega/montagem</dt><dd className="font-bold text-slate-800">{currency.format(Number(reservation.service_fee ?? 0))}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Valor recebido</dt><dd className="font-bold text-emerald-700">{currency.format(paid)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Saldo restante</dt><dd className={`font-bold ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{balance > 0 ? currency.format(balance) : "Quitado"}</dd></div>
          </dl>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <MessageCircle className="h-4 w-4" />
            Falar sobre esta reserva
          </a>
        </div>
      )}
    </article>
  );
}

export default function AreaClientePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setReservations([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("id, auth_user_id, name, email, phone, address, avatar_url, approval_status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage("Não foi possível carregar seu cadastro.");
    } else if (!data) {
      setErrorMessage("Seu cadastro ainda está sendo preparado. Tente novamente em instantes.");
    } else {
      const customer = data as CustomerProfile;
      setProfile(customer);

      if (customer.approval_status === "approved") {
        const { data: reservationData, error: reservationsError } = await supabase
          .from("reservations")
          .select("id,event_date,event_address,status,service_fee,amount_paid,reservation_items(quantity,unit_price,products(name))")
          .eq("customer_id", customer.id)
          .order("event_date", { ascending: false });

        if (reservationsError) {
          setErrorMessage("Seu cadastro foi carregado, mas não foi possível consultar suas reservas.");
        } else {
          setReservations((reservationData ?? []) as CustomerReservation[]);
        }
      } else {
        setReservations([]);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErrorMessage(translateAuthError(error.message));
    else await loadProfile();
    setSubmitting(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    const { error } = await createClient()
      .from("customers")
      .update({ name: profile.name.trim(), phone: profile.phone?.trim() || null, address: profile.address?.trim() || null })
      .eq("id", profile.id);
    setSubmitting(false);
    if (error) setErrorMessage("Não foi possível salvar seus dados.");
    else setMessage("Dados atualizados com sucesso.");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMessage("Use uma imagem JPG, PNG ou WEBP de até 5 MB.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${profile.auth_user_id}/avatar.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("customer-avatars").upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setErrorMessage("Não foi possível enviar a foto.");
      setSubmitting(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("customer-avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase.from("customers").update({ avatar_url: avatarUrl }).eq("id", profile.id);
    setSubmitting(false);

    if (updateError) setErrorMessage("A foto foi enviada, mas não foi possível vinculá-la ao cadastro.");
    else {
      setProfile({ ...profile, avatar_url: avatarUrl });
      setMessage("Foto atualizada com sucesso.");
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    setProfile(null);
    setReservations([]);
    setMessage("");
    setErrorMessage("");
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">Carregando sua área...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Voltar para o site</Link>
          <form onSubmit={handleLogin} className="mt-8 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound className="h-6 w-6" /></div>
            <h1 className="mt-5 text-3xl font-black text-slate-900">Área do cliente</h1>
            <p className="mt-2 text-slate-600">Entre para acompanhar seu cadastro.</p>
            <label className="mt-7 grid gap-2 text-sm font-bold text-slate-700">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-700">Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500" /></label>
            <Link href="/recuperar-senha" className="mt-3 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline">Esqueci minha senha</Link>
            {errorMessage && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p>}
            <button disabled={submitting} className="mt-6 h-12 w-full rounded-xl bg-emerald-800 font-bold text-white disabled:opacity-60">{submitting ? "Entrando..." : "Entrar"}</button>
            <p className="mt-6 text-center text-sm text-slate-600">Ainda não tem acesso? <Link href="/cadastro" className="font-bold text-emerald-700">Criar cadastro</Link></p>
          </form>
        </div>
      </main>
    );
  }

  const status = statusDetails(profile.approval_status);
  const StatusIcon = status.Icon;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Voltar para o site</Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900"><LogOut className="h-4 w-4" /> Sair</button>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-emerald-100 bg-emerald-50">
              {profile.avatar_url ? <Image src={profile.avatar_url} alt={`Foto de ${profile.name}`} fill sizes="96px" className="object-cover" /> : <UserRound className="absolute inset-0 m-auto h-10 w-10 text-emerald-700" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Área do cliente</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Olá, {profile.name}!</h1>
              <p className="mt-2 text-slate-600">Mantenha seus dados atualizados para agilizar seu atendimento.</p>
            </div>
          </div>

          <div className={`mt-8 flex gap-3 rounded-2xl border p-4 ${status.className}`}>
            <StatusIcon className="h-5 w-5 shrink-0" />
            <div><p className="font-bold">{status.label}</p><p className="mt-1 text-sm leading-6">{status.text}</p></div>
          </div>

          {profile.approval_status === "approved" && (
            <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><PackageOpen className="h-5 w-5" /></span>
                <div><h2 className="font-black text-slate-900">Minhas reservas</h2><p className="text-sm text-slate-500">Toque em uma reserva para ver os itens e os valores.</p></div>
              </div>
              <div className="mt-5 space-y-3">
                {reservations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">Você ainda não possui reservas vinculadas a este cadastro.</p> : reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} customerName={profile.name} />)}
              </div>
            </section>
          )}

          <form onSubmit={saveProfile} className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Nome<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">E-mail<input value={profile.email ?? ""} disabled className="h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 font-normal text-slate-500" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">WhatsApp<input value={profile.phone ?? ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Endereço<input value={profile.address ?? ""} onChange={(event) => setProfile({ ...profile, address: event.target.value })} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-emerald-500" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Foto de perfil<span className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 font-bold text-emerald-800 transition hover:bg-emerald-50"><Camera className="h-4 w-4" />{submitting ? "Enviando..." : "Escolher foto"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="sr-only" disabled={submitting} /></span><span className="font-normal text-slate-500">JPG, PNG ou WEBP, até 5 MB.</span></label>
            {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2">{errorMessage}</p>}
            {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 sm:col-span-2">{message}</p>}
            <button disabled={submitting} className="h-12 rounded-xl bg-emerald-800 px-5 font-bold text-white disabled:opacity-60 sm:col-span-2">{submitting ? "Salvando..." : "Salvar meus dados"}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
