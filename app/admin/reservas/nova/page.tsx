"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: number;
  name: string;
  phone: string;
};

type Product = {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  active: boolean;
};

type ReservationItem = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

export default function NovaReservaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState<number | "">("");

  const [eventDate, setEventDate] = useState("");

  const [eventAddress, setEventAddress] = useState("");

  const [status, setStatus] = useState("pending");

  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ReservationItem[]>([
    {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
    },
  ]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const [customersResult, productsResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id,name,phone")
            .order("name"),

          supabase
            .from("products")
            .select(
              "id,name,price,stock_quantity,active"
            )
            .eq("active", true)
            .eq("maintenance_status", "disponivel")
            .order("name"),
        ]);

      if (customersResult.data) {
        setCustomers(
          customersResult.data as Customer[]
        );
      }

      if (productsResult.data) {
        setProducts(
          productsResult.data as Product[]
        );
      }
    }

    loadData();
  }, []);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === customerId
    );

  const total = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.unit_price,
      0
    );
  }, [items]);

  function addItem() {
    setItems((current) => [
      ...current,
      {
        product_id: 0,
        quantity: 1,
        unit_price: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  function updateItem(
    index: number,
    field: keyof ReservationItem,
    value: number
  ) {
    const copy = [...items];

    copy[index] = {
      ...copy[index],
      [field]: value,
    };

    if (field === "product_id") {
      const product =
        products.find(
          (p) => p.id === value
        );

      if (product) {
        copy[index].unit_price =
          Number(product.price);
      }
    }

    setItems(copy);
  }
  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!selectedCustomer) {
      alert("Selecione um cliente.");
      return;
    }

    if (!eventDate) {
      alert("Informe a data do evento.");
      return;
    }

    if (items.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { data: reservation, error } =
      await supabase
        .from("reservations")
        .insert({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          customer_phone: selectedCustomer.phone,
          event_date: eventDate,
          event_address: eventAddress.trim() || null,
          status,
          notes,
        })
        .select()
        .single();

    if (error || !reservation) {
      setSaving(false);

      alert(error?.message);

      return;
    }

    const reservationItems =
      items.map((item) => ({
        reservation_id: reservation.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

    const { error: itemsError } =
      await supabase
        .from("reservation_items")
        .insert(reservationItems);

    if (itemsError) {
      await supabase
        .from("reservations")
        .delete()
        .eq("id", reservation.id);

      setSaving(false);

      alert(
        `Não foi possível salvar os itens da reserva. Nenhuma reserva foi criada: ${itemsError.message}`
      );

      return;
    }

    setSaving(false);

    alert("Reserva criada com sucesso!");

    router.push("/admin/reservas");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto max-w-7xl"
        style={{
          padding: "48px 32px",
        }}
      >
        <Link
          href="/admin/reservas"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800"
        >
          <ArrowLeft size={18} />

          Voltar
        </Link>

        <div
          style={{
            marginTop: "40px",
          }}
        >
          <h1 className="text-4xl font-black">
            Nova Reserva
          </h1>

          <p
            className="text-gray-600"
            style={{
              marginTop: "10px",
            }}
          >
            Cadastre uma nova reserva.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
          style={{
            marginTop: "40px",
          }}
        >
          <div className="rounded-2xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-black">
              Dados da Reserva
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  Cliente
                </label>

                <select
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(
                      Number(event.target.value)
                    )
                  }
                  className="h-12 w-full rounded-xl border px-4"
                >
                  <option value="">
                    Selecione...
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Data do evento
                </label>

                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) =>
                    setEventDate(
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
                  value={status}
                  onChange={(event) =>
                    setStatus(
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
                  value={eventAddress}
                  onChange={(event) => setEventAddress(event.target.value)}
                  placeholder="Rua, número, bairro e cidade"
                  className="h-12 w-full rounded-xl border px-4"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  className="min-h-[120px] w-full rounded-xl border p-4"
                />
              </div>

            </div>

          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-black">
                Produtos da Reserva
              </h2>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white transition hover:bg-emerald-900"
              >
                <Plus size={18} />

                Adicionar Produto
              </button>

            </div>

            <div className="mt-8 flex flex-col gap-6">

              {items.map((item, index) => {

                const subtotal =
                  item.quantity *
                  item.unit_price;

                return (

                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 p-6"
                  >

                    <div className="grid gap-6 lg:grid-cols-[2fr_120px_180px_180px_auto]">

                      {/* Produto */}

                      <div>

                        <label className="mb-2 block font-semibold">
                          Produto
                        </label>

                        <select
                          value={item.product_id}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "product_id",
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="h-12 w-full rounded-xl border px-4"
                        >
                          <option value={0}>
                            Selecione...
                          </option>

                          {products.map(
                            (product) => (

                              <option
                                key={product.id}
                                value={product.id}
                              >
                                {product.name}
                              </option>

                            )
                          )}

                        </select>

                      </div>

                      {/* Quantidade */}

                      <div>

                        <label className="mb-2 block font-semibold">
                          Qtde
                        </label>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="h-12 w-full rounded-xl border px-4"
                        />

                      </div>

                      {/* Valor */}

                      <div>

                        <label className="mb-2 block font-semibold">
                          Valor
                        </label>

                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "unit_price",
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="h-12 w-full rounded-xl border px-4"
                        />

                      </div>

                      {/* Subtotal */}

                      <div>

                        <label className="mb-2 block font-semibold">
                          Subtotal
                        </label>

                        <div className="flex h-12 items-center rounded-xl border bg-gray-50 px-4 font-bold">

                          {new Intl.NumberFormat(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            }
                          ).format(subtotal)}

                        </div>

                      </div>

                      {/* Excluir */}

                      <div className="flex items-end">

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(index)
                          }
                          disabled={
                            items.length === 1
                          }
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 size={18} />
                        </button>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-black">
              Resumo da Reserva
            </h2>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between">

                <span className="text-gray-600">
                  Cliente
                </span>

                <span className="font-bold">
                  {selectedCustomer?.name ?? "-"}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-gray-600">
                  Data do evento
                </span>

                <span className="font-bold">
                  {eventDate || "-"}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-gray-600">
                  Produtos
                </span>

                <span className="font-bold">
                  {items.length}
                </span>

              </div>

              <div className="border-t pt-5 flex items-center justify-between">

                <span className="text-xl font-black">
                  Total
                </span>

                <span className="text-3xl font-black text-emerald-700">
                  {new Intl.NumberFormat(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    }
                  ).format(total)}
                </span>

              </div>

            </div>

          </div>

          <div className="flex justify-end gap-4">

            <Link
              href="/admin/reservas"
              className="rounded-xl border border-gray-300 px-6 py-3 font-bold transition hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 font-bold text-white transition hover:bg-emerald-900 disabled:opacity-50"
            >
              <Save size={18} />

              {saving
                ? "Salvando..."
                : "Salvar Reserva"}
            </button>

          </div>

        </form>

      </div>

    </main>

  );
}
