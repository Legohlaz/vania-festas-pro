"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  customer_name: string;
  event_date: string | null;
  total: number | null;
  status: string | null;
};

type StatusFilter =
  | "todos"
  | "pendente"
  | "confirmado"
  | "finalizado"
  | "cancelado";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function PedidosPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");

  useEffect(() => {
    async function loadOrders() {
      const supabase = createClient();
      const { data, error } =
        await supabase
          .from("orders")
          .select(`
            id,
            customer_name,
            event_date,
            total,
            status
          `)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setOrders((data ?? []) as Order[]);

      setLoading(false);
    }

    loadOrders();
  }, []);

  const filteredOrders =
    useMemo(() => {
      const searchText =
        normalizeText(search);

      return orders.filter((order) => {
        const matchSearch =
          searchText.length === 0 ||
          normalizeText(
            order.customer_name
          ).includes(searchText);

        const matchStatus =
          statusFilter === "todos" ||
          order.status === statusFilter;

        return (
          matchSearch &&
          matchStatus
        );
      });
    }, [
      orders,
      search,
      statusFilter,
    ]);

  const hasFilters =
    search.length > 0 ||
    statusFilter !== "todos";

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className="mx-auto w-full max-w-7xl"
        style={{
          padding: "48px 32px",
        }}
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={18} />

          Voltar ao painel
        </Link>

        <div
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{
            marginTop: "40px",
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              <ClipboardList size={18} />

              Administração
            </div>

            <h1
              className="text-4xl font-black tracking-tight text-gray-900"
              style={{
                marginTop: "12px",
              }}
            >
              Pedidos
            </h1>

            <p
              className="text-base text-gray-600"
              style={{
                marginTop: "12px",
              }}
            >
              Gerencie todos os pedidos
              realizados.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "40px",
          }}
        >
          {/* Loading */}
          {loading && (
            <div
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              style={{
                padding: "28px",
              }}
            >
              <p className="text-sm text-gray-500">
                Carregando pedidos...
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

          {!loading &&
            !errorMessage &&
            orders.length > 0 && (
              <>
                <div
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                  style={{
                    padding: "20px",
                  }}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="relative">
                      <Search
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Buscar pedido..."
                        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        style={{
                          paddingLeft: "48px",
                        }}
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target
                            .value as StatusFilter
                        )
                      }
                      className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="todos">
                        Todos os status
                      </option>

                      <option value="pendente">
                        Pendente
                      </option>

                      <option value="confirmado">
                        Confirmado
                      </option>

                      <option value="finalizado">
                        Finalizado
                      </option>

                      <option value="cancelado">
                        Cancelado
                      </option>
                    </select>
                  </div>

                  <div
                    className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SlidersHorizontal
                        size={16}
                      />

                      <span>
                        {filteredOrders.length ===
                        1
                          ? "1 pedido encontrado"
                          : `${filteredOrders.length} pedidos encontrados`}
                      </span>

                      {hasFilters && (
                        <span className="text-gray-400">
                          de {orders.length}
                        </span>
                      )}
                    </div>

                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>

                {filteredOrders.length ===
                  0 && (
                  <div
                    className="mt-5 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"
                  >
                    <Search
                      size={30}
                      className="mx-auto text-gray-300"
                    />

                    <h2 className="mt-4 text-lg font-black">
                      Nenhum pedido encontrado
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Tente alterar os filtros
                      utilizados.
                    </p>
                  </div>
                )}

                {filteredOrders.length >
                  0 && (
                  <div
                    className="mt-5 flex flex-col gap-4"
                  >
                    {filteredOrders.map(
                      (order) => (
                        <div
                          key={order.id}
                          className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white shadow-sm md:flex-row md:items-center"
                          style={{
                            padding: "20px",
                          }}
                        >
                          {/* Dados */}
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Pedido #{order.id.slice(0, 8)}
                            </p>

                            <h2
                              className="text-lg font-black text-gray-900"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              {order.customer_name}
                            </h2>

                            <p
                              className="text-sm text-gray-500"
                              style={{
                                marginTop: "8px",
                              }}
                            >
                              Evento:
                              {" "}
                              {order.event_date
                                ? new Date(
                                    order.event_date
                                  ).toLocaleDateString(
                                    "pt-BR"
                                  )
                                : "Não informado"}
                            </p>

                            <p
                              className="text-sm font-semibold text-gray-700"
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              Total:
                              {" "}
                              {formatCurrency(
                                order.total
                              )}
                            </p>
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-end gap-3">
                            <span
                              className={
                                order.status ===
                                "confirmado"
                                  ? "rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700"
                                  : order.status ===
                                      "pendente"
                                    ? "rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700"
                                    : order.status ===
                                        "cancelado"
                                      ? "rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700"
                                      : "rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700"
                              }
                            >
                              {order.status ??
                                "Sem status"}
                            </span>

                            <Link
                              href={`/admin/pedidos/${order.id}`}
                              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              Ver pedido
                            </Link>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}

          {!loading &&
            !errorMessage &&
            orders.length === 0 && (
              <div
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                style={{
                  padding: "28px",
                }}
              >
                <p className="text-sm text-gray-500">
                  Nenhum pedido cadastrado.
                </p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
