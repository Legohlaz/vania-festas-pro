"use client";

import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <form
      className="
        mt-8
        flex
        w-full
        flex-col
        gap-3
        rounded-2xl
        border
        border-gray-200
        bg-white
        p-3
        shadow-xl
        md:flex-row
      "
    >
      <div className="relative flex-1">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Pesquisar produtos, temas, mesas, painéis..."
          className="
            h-14
            w-full
            rounded-xl
            border-0
            bg-transparent
            pl-12
            pr-4
            text-base
            outline-none
            placeholder:text-gray-400
          "
        />
      </div>

      <button
        type="submit"
        className="
          h-14
          rounded-xl
          bg-emerald-700
          px-8
          font-semibold
          text-white
          transition
          hover:bg-emerald-800
        "
      >
        Pesquisar
      </button>
    </form>
  );
}
