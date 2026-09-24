"use client";

import { CalendarClock, CircleDollarSign, MessageCircle, PackageCheck } from "lucide-react";

import { createWhatsAppLink, normalizeWhatsAppPhone } from "@/lib/whatsapp";

type ReservationReminderLinksProps = {
  reservationId: number;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventAddress: string | null;
  balance: number;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function ReservationReminderLinks({
  reservationId,
  customerName,
  customerPhone,
  eventDate,
  eventAddress,
  balance,
}: ReservationReminderLinksProps) {
  const normalizedPhone = normalizeWhatsAppPhone(customerPhone);

  if (normalizedPhone.length < 12) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="font-bold text-amber-950">Lembretes pelo WhatsApp</h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">Cadastre um número de WhatsApp válido para liberar as mensagens prontas.</p>
      </section>
    );
  }

  const date = formatDate(eventDate);
  const location = eventAddress ? ` no endereço ${eventAddress}` : "";
  const reminders = [
    {
      label: "Confirmar detalhes",
      icon: MessageCircle,
      message: `Olá, ${customerName}! Estamos conferindo os detalhes da sua reserva #${reservationId}, para o dia ${date}${location}. Você confirma que as informações estão corretas?`,
    },
    ...(balance > 0
      ? [{
          label: "Lembrar saldo",
          icon: CircleDollarSign,
          message: `Olá, ${customerName}! A reserva #${reservationId} possui saldo de ${currency.format(balance)}. Se desejar, você pode realizar o pagamento pela Área do Cliente da Vânia Festas.`,
        }]
      : []),
    {
      label: "Lembrar evento",
      icon: CalendarClock,
      message: `Olá, ${customerName}! Seu evento da reserva #${reservationId} será em ${date}${location}. Estamos preparando tudo com carinho. Se houver alguma atualização, fale conosco por aqui.`,
    },
    {
      label: "Combinar devolução",
      icon: PackageCheck,
      message: `Olá, ${customerName}! Vamos combinar a devolução dos itens da reserva #${reservationId}. Por favor, confirme o melhor horário para a conferência dos materiais.`,
    },
  ];

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
        <div>
          <h2 className="font-bold text-slate-900">Lembretes pelo WhatsApp</h2>
          <p className="mt-1 text-sm text-slate-500">Abra uma mensagem pronta para o cliente.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {reminders.map(({ label, icon: Icon, message }) => (
          <a
            key={label}
            href={createWhatsAppLink({ phone: normalizedPhone, message })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}
