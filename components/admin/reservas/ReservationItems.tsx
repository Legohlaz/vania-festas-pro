"use client";

import { Plus, Trash2 } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
};

type ReservationItem = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

type Props = {
  products: Product[];
  items: ReservationItem[];
  setItems: React.Dispatch<
    React.SetStateAction<ReservationItem[]>
  >;
};

export default function ReservationItems({
  products,
  items,
  setItems,
}: Props) {
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
      current.filter((_, i) => i !== index)
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
      const product = products.find(
        (p) => p.id === value
      );

      if (product) {
        copy[index].unit_price = Number(
          product.price
        );
      }
    }

    setItems(copy);
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">

      <div className="flex items-center justify-between">

        <h2 className="text-xl font-black">
          Produtos
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
                        Number(event.target.value)
                      )
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  >

                    <option value={0}>
                      Selecione...
                    </option>

                    {products.map((product) => (

                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                      </option>

                    ))}

                  </select>

                </div>

                <div>

                  <label className="mb-2 block font-semibold">
                    Quantidade
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "quantity",
                        Number(event.target.value)
                      )
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  />

                </div>

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
                        Number(event.target.value)
                      )
                    }
                    className="h-12 w-full rounded-xl border px-4"
                  />

                </div>

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
  );
}