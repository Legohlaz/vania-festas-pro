"use client";

type Customer = {
  id: number;
  name: string;
  phone: string;
};

type Reservation = {
  customer_id: number;
  event_date: string;
  event_address: string | null;
  service_fee: number;
  amount_paid: number;
  status: string;
  notes: string | null;
};

type Props = {
  reservation: Reservation;
  customers: Customer[];
  onChange: (
    reservation: Reservation
  ) => void;
};

export default function ReservationForm({
  reservation,
  customers,
  onChange,
}: Props) {
  function updateField<
    K extends keyof Reservation
  >(
    field: K,
    value: Reservation[K]
  ) {
    onChange({
      ...reservation,
      [field]: value,
    });
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">

      <h2 className="text-xl font-black">
        Dados da Reserva
      </h2>

      <div className="mt-8 grid gap-6 md:grid-cols-2">

        <div>

          <label className="mb-2 block font-semibold">
            Cliente
          </label>

          <select
            value={reservation.customer_id}
            onChange={(event) =>
              updateField(
                "customer_id",
                Number(event.target.value)
              )
            }
            className="h-12 w-full rounded-xl border px-4"
          >

            <option value={0}>
              Selecione...
            </option>

            {customers.map((customer) => (

              <option
                key={customer.id}
                value={customer.id}
              >
                {customer.name}
              </option>

            ))}

          </select>

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Data do Evento
          </label>

          <input
            type="date"
            value={reservation.event_date}
            onChange={(event) =>
              updateField(
                "event_date",
                event.target.value
              )
            }
            className="h-12 w-full rounded-xl border px-4"
          />

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Status
          </label>

          <select
            value={reservation.status}
            onChange={(event) =>
              updateField(
                "status",
                event.target.value
              )
            }
            className="h-12 w-full rounded-xl border px-4"
          >

            <option value="pending">
              Pendente
            </option>

            <option value="confirmed">
              Confirmada
            </option>

            <option value="cancelled">
              Cancelado
            </option>

          </select>

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Endereço do evento
          </label>

          <input
            type="text"
            value={reservation.event_address ?? ""}
            onChange={(event) =>
              updateField(
                "event_address",
                event.target.value
              )
            }
            placeholder="Rua, número, bairro e cidade"
            className="h-12 w-full rounded-xl border px-4"
          />

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Valor recebido / sinal
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={reservation.amount_paid}
            onChange={(event) =>
              updateField(
                "amount_paid",
                Math.max(Number(event.target.value) || 0, 0)
              )
            }
            placeholder="0,00"
            className="h-12 w-full rounded-xl border px-4"
          />

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Taxa de entrega / montagem
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={reservation.service_fee}
            onChange={(event) =>
              updateField(
                "service_fee",
                Math.max(Number(event.target.value) || 0, 0)
              )
            }
            placeholder="0,00"
            className="h-12 w-full rounded-xl border px-4"
          />

        </div>

        <div>

          <label className="mb-2 block font-semibold">
            Observações
          </label>

          <textarea
            value={reservation.notes ?? ""}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            className="min-h-[120px] w-full rounded-xl border p-4"
          />

        </div>

      </div>

    </div>
  );
}
