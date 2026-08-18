"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ReservationForm from "@/components/admin/reservas/ReservationForm";
import ReservationItems from "@/components/admin/reservas/ReservationItems";
import ReservationSummary from "@/components/admin/reservas/ReservationSummary";
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
};

type Reservation = {
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  event_date: string;
  event_address: string | null;
  service_fee: number;
  amount_paid: number;
  status: string;
  notes: string | null;
};

type ReservationItem = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

type ReservationItemRow = {
  product_id: number | null;
  quantity: number | null;
  unit_price: number | null;
};

export default function EditarReservaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const reservationId = Number(id);

      if (!Number.isInteger(reservationId)) {
        setErrorMessage("Reserva inválida.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const [reservationsResult, itemsResult, customersResult, productsResult] =
        await Promise.all([
          supabase
            .from("reservations")
            .select("customer_id, customer_name, customer_phone, event_date, event_address, service_fee, amount_paid, status, notes")
            .eq("id", reservationId)
            .single(),
          supabase
            .from("reservation_items")
            .select("product_id, quantity, unit_price")
            .eq("reservation_id", reservationId),
          supabase.from("customers").select("id,name,phone").order("name"),
          supabase.from("products").select("id,name,price,stock_quantity").eq("active", true).eq("maintenance_status", "disponivel").order("name"),
        ]);

      if (reservationsResult.error || itemsResult.error) {
        setErrorMessage(
          reservationsResult.error?.message ??
            itemsResult.error?.message ??
            "Não foi possível carregar a reserva."
        );
        setLoading(false);
        return;
      }

      const foundReservation = reservationsResult.data as Reservation | null;

      const loadedCustomers = (customersResult.data ?? []) as Customer[];

      if (foundReservation) {
        const selectedCustomer = loadedCustomers.find(
          (customer) =>
            customer.id === foundReservation.customer_id ||
            (customer.name === foundReservation.customer_name &&
              customer.phone === foundReservation.customer_phone)
        );

        setReservation({
          ...foundReservation,
          customer_id: selectedCustomer?.id ?? 0,
        });
      }

      setItems(
        ((itemsResult.data ?? []) as ReservationItemRow[])
          .filter((item) => item.product_id !== null)
          .map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity ?? 1),
            unit_price: Number(item.unit_price ?? 0),
          }))
      );
      setCustomers(loadedCustomers);
      if (productsResult.data) setProducts(productsResult.data as Product[]);
      setLoading(false);
    }

    loadData();
  }, [id]);

  async function handleSave() {
    if (!reservation || !reservation.customer_id || !reservation.event_date) {
      alert("Preencha o cliente e a data do evento.");
      return;
    }

    if (!items.length || items.some((item) => !item.product_id || item.quantity < 1)) {
      alert("Adicione pelo menos um produto válido.");
      return;
    }

    const customer = customers.find((item) => item.id === reservation.customer_id);

    if (!customer) {
      alert("Cliente não encontrado.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          ...reservation,
          customer_name: customer.name,
          customer_phone: customer.phone,
        })
        .eq("id", id);

      if (reservationError) throw reservationError;

      const { error: deleteError } = await supabase
        .from("reservation_items")
        .delete()
        .eq("reservation_id", id);

      if (deleteError) throw deleteError;

      const { error: itemsError } = await supabase.from("reservation_items").insert(
        items.map((item) => ({ ...item, reservation_id: Number(id) }))
      );

      if (itemsError) throw itemsError;

      router.push(`/admin/reservas/${id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível salvar a reserva."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center">Carregando...</main>;

  if (!reservation) return <main className="flex min-h-screen items-center justify-center">Reserva não encontrada.</main>;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-8 py-12">
        <Link href={`/admin/reservas/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-800">
          <ArrowLeft size={18} /> Voltar para a reserva
        </Link>

        <div className="mt-10">
          <h1 className="text-4xl font-black">Editar Reserva</h1>
          <p className="mt-2 text-gray-600">Atualize os dados e produtos da reserva #{id}.</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}
            <ReservationForm reservation={reservation} customers={customers} onChange={setReservation} />
            <ReservationItems products={products} items={items} setItems={setItems} />
          </div>
          <ReservationSummary items={items} serviceFee={reservation.service_fee} amountPaid={reservation.amount_paid} onSave={handleSave} isSaving={saving} />
        </div>
      </div>
    </main>
  );
}
