"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  ListChecks,
  Eye,
  Phone,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  event_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  service_fee: number | null;
  amount_paid: number | null;
  logistics_status: string | null;
};

type StatusFilter =
  | "todos"
  | "pending"
  | "confirmed"
  | "cancelled";

type PaymentFilter = "todos" | "pendentes" | "quitadas" | "recebidas";

type LogisticsFilter =
  | "todos"
  | "scheduled"
  | "preparing"
  | "delivered"
  | "returned";

type ReservationDetailRow = {
  reservation_id: number;
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

type AvailabilityRow = {
  product_id: number;
  available_quantity: number;
};

type ReservationConflict = {
  productId: number;
  productName: string;
  requested: number;
  available: number;
};

type ReservationAvailability = {
  checked: boolean;
  conflicts: ReservationConflict[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(date: string) {
  if (!date) {
    return "Data não informada";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatCreatedAt(date: string) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pendente";

    case "confirmed":
      return "Confirmada";

    case "cancelled":
      return "Cancelada";

    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function initialPaymentFilter(): PaymentFilter {
  if (typeof window === "undefined") return "todos";
  const payment = new URLSearchParams(window.location.search).get("pagamento");
  return payment === "pendentes" || payment === "quitadas" || payment === "recebidas"
    ? payment
    : "todos";
}

function initialLogisticsFilter(): LogisticsFilter {
  if (typeof window === "undefined") return "todos";
  const logistics = new URLSearchParams(window.location.search).get("logistica");
  return logistics === "scheduled" || logistics === "preparing" || logistics === "delivered" || logistics === "returned"
    ? logistics
    : "todos";
}

function getLogisticsLabel(status: string | null) {
  return (
    ({
      scheduled: "Agendada",
      preparing: "Em preparação",
      delivered: "Entregue / montada",
      returned: "Finalizada / devolvida",
    } as Record<string, string>)[status ?? "scheduled"] ?? "Agendada"
  );
}

export default function ReservasPage() {
  const [reservations, setReservations] = useState<Reservation[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");

  const [paymentFilter, setPaymentFilter] =
    useState<PaymentFilter>(initialPaymentFilter);

  const [logisticsFilter, setLogisticsFilter] =
    useState<LogisticsFilter>(initialLogisticsFilter);

  const [availabilityByReservation, setAvailabilityByReservation] =
    useState<Record<number, ReservationAvailability>>({});
  const [balanceByReservation, setBalanceByReservation] =
    useState<Record<number, number>>({});

  useEffect(() => {
    async function loadReservations() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("reservations")
        .select("id, customer_name, customer_phone, event_date, status, notes, created_at, service_fee, amount_paid, logistics_status")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Erro ao carregar reservas:",
          error
        );

        setErrorMessage(
          `Erro ao carregar reservas: ${error.message}`
        );

        setLoading(false);
        return;
      }

      const loadedReservations =
        (data ?? []) as Reservation[];

      setReservations(loadedReservations);

      const pendingReservations = loadedReservations.filter(
        (reservation) => reservation.status === "pending"
      );

      const reservationIds = loadedReservations.map(
        (reservation) => reservation.id
      );

      const { data: itemData, error: itemError } = reservationIds.length
        ? await supabase
            .from("reservation_items")
            .select("reservation_id, product_id, quantity, unit_price")
            .in("reservation_id", reservationIds)
        : { data: [], error: null };

      if (itemError) {
        setErrorMessage(`Erro ao carregar itens das reservas: ${itemError.message}`);
        setLoading(false);
        return;
      }

      const productIds = [
        ...new Set(
          (itemData ?? [])
            .map((item) => item.product_id)
            .filter((productId): productId is number => productId !== null)
        ),
      ];

      const { data: productData, error: productError } = productIds.length
        ? await supabase.from("products").select("id, name").in("id", productIds)
        : { data: [], error: null };

      if (productError) {
        setErrorMessage(`Erro ao carregar produtos das reservas: ${productError.message}`);
        setLoading(false);
        return;
      }

      const productNames = new Map(
        (productData ?? []).map((product) => [product.id, product.name])
      );
      const detailsByReservation = new Map<number, ReservationDetailRow[]>();

      for (const item of itemData ?? []) {
        const reservationItems = detailsByReservation.get(item.reservation_id) ?? [];
        reservationItems.push({
          ...item,
          product_name: item.product_id ? productNames.get(item.product_id) ?? null : null,
        });
        detailsByReservation.set(item.reservation_id, reservationItems);
      }

      setBalanceByReservation(
        Object.fromEntries(
          loadedReservations.map((reservation) => {
            const itemsTotal = (detailsByReservation.get(reservation.id) ?? []).reduce(
              (total, item) => total + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
              0
            );
            return [
              reservation.id,
              Math.max(itemsTotal + Number(reservation.service_fee ?? 0) - Number(reservation.amount_paid ?? 0), 0),
            ];
          })
        )
      );

      if (pendingReservations.length > 0) {
        const availabilityCache = new Map<
          string,
          AvailabilityRow[]
        >();

        const checks = await Promise.all(
          pendingReservations.map(async (reservation) => {
            try {
              let availabilityRows = availabilityCache.get(
                reservation.event_date
              );

              if (!availabilityRows) {
                const { data: availabilityData, error: availabilityError } =
                  await supabase.rpc("get_product_availability", {
                    p_event_date: reservation.event_date,
                  });

                if (availabilityError) {
                  throw availabilityError;
                }

                availabilityRows =
                  (availabilityData ?? []) as AvailabilityRow[];

                availabilityCache.set(
                  reservation.event_date,
                  availabilityRows
                );
              }

              const detailRows =
                detailsByReservation.get(reservation.id) ?? [];

              const availableByProduct = new Map(
                availabilityRows.map((row) => [
                  Number(row.product_id),
                  Number(row.available_quantity ?? 0),
                ])
              );

              const conflicts = detailRows
                .filter((row) => row.product_id !== null)
                .map((row) => {
                  const productId = Number(row.product_id);
                  const requested = Number(row.quantity ?? 0);
                  const available =
                    availableByProduct.get(productId) ?? 0;

                  return {
                    productId,
                    productName:
                      row.product_name ?? `Produto ${productId}`,
                    requested,
                    available,
                  };
                })
                .filter(
                  (item) => item.requested > item.available
                );

              return [
                reservation.id,
                { checked: true, conflicts },
              ] as const;
            } catch (availabilityError) {
              console.error(
                `Erro ao verificar disponibilidade da reserva #${reservation.id}:`,
                availabilityError
              );

              return [
                reservation.id,
                { checked: false, conflicts: [] },
              ] as const;
            }
          })
        );

        setAvailabilityByReservation(
          Object.fromEntries(checks)
        );
      }

      setLoading(false);
    }

    loadReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return reservations.filter((reservation) => {
      const customerName =
        reservation.customer_name ?? "";

      const customerPhone =
        reservation.customer_phone ?? "";

      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeText(customerName).includes(
          normalizedSearch
        ) ||
        normalizeText(customerPhone).includes(
          normalizedSearch
        ) ||
        String(reservation.id).includes(
          normalizedSearch
        );

      const matchesStatus =
        statusFilter === "todos" ||
        reservation.status === statusFilter;

      const balance = balanceByReservation[reservation.id] ?? 0;
      const matchesPayment =
        paymentFilter === "todos" ||
        (paymentFilter === "pendentes" &&
          reservation.status !== "cancelled" &&
          balance > 0) ||
        (paymentFilter === "quitadas" &&
          reservation.status !== "cancelled" &&
          balance === 0) ||
        (paymentFilter === "recebidas" &&
          reservation.status !== "cancelled" &&
          Number(reservation.amount_paid ?? 0) > 0);

      const matchesLogistics =
        logisticsFilter === "todos" ||
        (reservation.logistics_status ?? "scheduled") === logisticsFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesLogistics
      );
    });
  }, [
    reservations,
    search,
    statusFilter,
    paymentFilter,
    logisticsFilter,
    balanceByReservation,
  ]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "todos" ||
    paymentFilter !== "todos" ||
    logisticsFilter !== "todos";

  const reservationCounts = useMemo(() => {
    return reservations.reduce(
      (counts, reservation) => {
        counts.total += 1;

        if (reservation.status === "pending") {
          counts.pending += 1;
        } else if (reservation.status === "confirmed") {
          counts.confirmed += 1;
        } else if (reservation.status === "cancelled") {
          counts.cancelled += 1;
        }

        return counts;
      },
      {
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
      }
    );
  }, [reservations]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
    setPaymentFilter("todos");
    setLogisticsFilter("todos");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto w-full max-w-7xl"
        style={{
          padding: "48px 32px",
        }}
      >
        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Voltar para o site
        </Link>

        {/* Cabeçalho */}
        <div
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{
            marginTop: "40px",
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              <CalendarDays size={18} />
              Administração
            </div>

            <h1
              className="text-4xl font-black tracking-tight text-gray-900"
              style={{
                marginTop: "12px",
              }}
            >
              Reservas
            </h1>

            <p
              className="text-base text-gray-600"
              style={{
                marginTop: "12px",
              }}
            >
              Acompanhe as solicitações e reservas dos
              clientes da Vânia Festas.
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ marginTop: "40px" }}>
          {/* Carregando */}
          {loading && (
            <div
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              style={{
                padding: "28px",
              }}
            >
              <p className="text-sm text-gray-500">
                Carregando reservas...
              </p>
            </div>
          )}

          {/* Erro */}
          {!loading && errorMessage && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
              style={{
                padding: "16px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Nenhuma reserva */}
          {!loading &&
            !errorMessage &&
            reservations.length === 0 && (
              <div
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                style={{
                  padding: "28px",
                }}
              >
                <p className="text-sm text-gray-500">
                  Nenhuma reserva cadastrada até o
                  momento.
                </p>
              </div>
            )}

          {/* Reservas */}
          {!loading &&
            !errorMessage &&
            reservations.length > 0 && (
              <>
                {/* Resumo das reservas */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("todos")}
                    className={`rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      statusFilter === "todos"
                        ? "border-slate-400 ring-2 ring-slate-100"
                        : "border-gray-200"
                    }`}
                    style={{ padding: "20px" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                          Total
                        </p>
                        <p
                          className="text-3xl font-black text-gray-900"
                          style={{ marginTop: "8px" }}
                        >
                          {reservationCounts.total}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <ListChecks size={21} />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={`rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      statusFilter === "pending"
                        ? "border-amber-400 ring-2 ring-amber-100"
                        : "border-gray-200"
                    }`}
                    style={{ padding: "20px" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
                          Pendentes
                        </p>
                        <p
                          className="text-3xl font-black text-gray-900"
                          style={{ marginTop: "8px" }}
                        >
                          {reservationCounts.pending}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Clock3 size={21} />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("confirmed")}
                    className={`rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      statusFilter === "confirmed"
                        ? "border-emerald-400 ring-2 ring-emerald-100"
                        : "border-gray-200"
                    }`}
                    style={{ padding: "20px" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                          Confirmadas
                        </p>
                        <p
                          className="text-3xl font-black text-gray-900"
                          style={{ marginTop: "8px" }}
                        >
                          {reservationCounts.confirmed}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={21} />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("cancelled")}
                    className={`rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      statusFilter === "cancelled"
                        ? "border-red-400 ring-2 ring-red-100"
                        : "border-gray-200"
                    }`}
                    style={{ padding: "20px" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                          Canceladas
                        </p>
                        <p
                          className="text-3xl font-black text-gray-900"
                          style={{ marginTop: "8px" }}
                        >
                          {reservationCounts.cancelled}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <CircleX size={21} />
                      </div>
                    </div>
                  </button>
                </div>

                {/* Busca e filtros */}

                <div
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                  style={{
                    marginTop: "20px",
                    padding: "20px",
                  }}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_220px_220px]">
                    {/* Busca */}
                    <div className="relative">
                      <Search
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Buscar por cliente, telefone ou número da reserva..."
                        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        style={{
                          paddingLeft: "48px",
                        }}
                      />
                    </div>

                    {/* Status */}
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target
                            .value as StatusFilter
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todos">
                        Todos os status
                      </option>

                      <option value="pending">
                        Pendentes
                      </option>

                      <option value="confirmed">
                        Confirmadas
                      </option>

                      <option value="cancelled">
                        Canceladas
                      </option>
                    </select>

                    <select
                      value={paymentFilter}
                      onChange={(event) =>
                        setPaymentFilter(
                          event.target.value as PaymentFilter
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todos">Todos os pagamentos</option>
                      <option value="pendentes">Com saldo pendente</option>
                      <option value="quitadas">Quitadas</option>
                      <option value="recebidas">Com pagamento recebido</option>
                    </select>

                    <select
                      value={logisticsFilter}
                      onChange={(event) =>
                        setLogisticsFilter(
                          event.target.value as LogisticsFilter
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todos">Toda a logística</option>
                      <option value="scheduled">Agendada</option>
                      <option value="preparing">Em preparação</option>
                      <option value="delivered">Entregue / montada</option>
                      <option value="returned">Finalizada / devolvida</option>
                    </select>
                  </div>

                  {/* Resumo dos filtros */}
                  <div
                    className="flex flex-col gap-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      marginTop: "18px",
                      paddingTop: "16px",
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SlidersHorizontal size={16} />

                      <span>
                        {filteredReservations.length === 1
                          ? "1 reserva encontrada"
                          : `${filteredReservations.length} reservas encontradas`}
                      </span>

                      {hasActiveFilters && (
                        <span className="text-gray-400">
                          de {reservations.length}
                        </span>
                      )}
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-fit text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Nenhum resultado */}
                {filteredReservations.length === 0 && (
                  <div
                    className="rounded-2xl border border-gray-200 bg-white text-center shadow-sm"
                    style={{
                      marginTop: "20px",
                      padding: "36px 28px",
                    }}
                  >
                    <Search
                      size={30}
                      className="mx-auto text-gray-300"
                    />

                    <h2
                      className="text-lg font-black text-gray-900"
                      style={{
                        marginTop: "14px",
                      }}
                    >
                      Nenhuma reserva encontrada
                    </h2>

                    <p
                      className="text-sm text-gray-500"
                      style={{
                        marginTop: "6px",
                      }}
                    >
                      Tente alterar a busca ou o filtro
                      selecionado.
                    </p>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                      style={{
                        marginTop: "18px",
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}

                {/* Lista */}
                {filteredReservations.length > 0 && (
                  <div
                    className="flex flex-col gap-4"
                    style={{
                      marginTop: "20px",
                    }}
                  >
                    {filteredReservations.map(
                      (reservation) => (
                        <div
                          key={reservation.id}
                          className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                          style={{
                            padding: "20px",
                          }}
                        >
                          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            {/* Dados principais */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                  Reserva #
                                  {reservation.id}
                                </span>

                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                                    reservation.status
                                  )}`}
                                >
                                  {getStatusLabel(
                                    reservation.status
                                  )}
                                </span>
                                {reservation.status !== "cancelled" && (
                                  <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                    {getLogisticsLabel(
                                      reservation.logistics_status
                                    )}
                                  </span>
                                )}
                                {reservation.status !== "cancelled" && (
                                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                                    {balanceByReservation[reservation.id] > 0
                                      ? `Saldo: ${currency.format(balanceByReservation[reservation.id])}`
                                      : "Quitada"}
                                  </span>
                                )}
                              </div>

                              <div
                                className="flex items-center gap-2"
                                style={{
                                  marginTop: "14px",
                                }}
                              >
                                <UserRound
                                  size={18}
                                  className="shrink-0 text-gray-400"
                                />

                                <h2 className="truncate text-lg font-black text-gray-900">
                                  {reservation.customer_name ||
                                    "Cliente não informado"}
                                </h2>
                              </div>

                              <div
                                className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500"
                                style={{
                                  marginTop: "12px",
                                }}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Phone size={16} />

                                  {reservation.customer_phone ||
                                    "Telefone não informado"}
                                </span>

                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays
                                    size={16}
                                  />

                                  Evento:{" "}
                                  <strong className="font-bold text-gray-700">
                                    {formatDate(
                                      reservation.event_date
                                    )}
                                  </strong>
                                </span>
                              </div>

                              {reservation.status === "pending" &&
                                availabilityByReservation[reservation.id] && (
                                  availabilityByReservation[reservation.id]
                                    .checked ? (
                                    availabilityByReservation[reservation.id]
                                      .conflicts.length > 0 ? (
                                      <div
                                        className="rounded-xl border border-red-200 bg-red-50"
                                        style={{
                                          marginTop: "14px",
                                          padding: "12px 14px",
                                        }}
                                      >
                                        <div className="flex items-start gap-2">
                                          <TriangleAlert
                                            size={18}
                                            className="mt-0.5 shrink-0 text-red-600"
                                          />

                                          <div>
                                            <p className="text-sm font-black text-red-700">
                                              Conflito de disponibilidade
                                            </p>

                                            <div
                                              className="space-y-1"
                                              style={{ marginTop: "5px" }}
                                            >
                                              {availabilityByReservation[
                                                reservation.id
                                              ].conflicts.map((conflict) => (
                                                <p
                                                  key={conflict.productId}
                                                  className="text-xs font-semibold text-red-600"
                                                >
                                                  {conflict.productName}: solicitadas{" "}
                                                  {conflict.requested} / disponíveis{" "}
                                                  {conflict.available}
                                                </p>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                                        style={{
                                          marginTop: "14px",
                                          padding: "8px 10px",
                                        }}
                                      >
                                        <CheckCircle2 size={16} />
                                        Estoque disponível para confirmação
                                      </div>
                                    )
                                  ) : (
                                    <div
                                      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700"
                                      style={{
                                        marginTop: "14px",
                                        padding: "8px 10px",
                                      }}
                                    >
                                      <TriangleAlert size={16} />
                                      Não foi possível verificar o estoque
                                    </div>
                                  )
                                )}

                              {reservation.status === "confirmed" && (
                                <div
                                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                                  style={{
                                    marginTop: "14px",
                                    padding: "8px 10px",
                                  }}
                                >
                                  <CheckCircle2 size={16} />
                                  Estoque reservado
                                </div>
                              )}

                              <p
                                className="text-xs text-gray-400"
                                style={{
                                  marginTop: "10px",
                                }}
                              >
                                Solicitação recebida em{" "}
                                {formatCreatedAt(
                                  reservation.created_at
                                )}
                              </p>
                            </div>

                            {/* Ação */}
                            <div className="shrink-0">
                              <Link
                                href={`/admin/reservas/${reservation.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
                              >
                                <Eye size={17} />
                                Ver reserva
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </main>
  );
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
