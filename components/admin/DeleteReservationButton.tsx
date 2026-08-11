"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type DeleteReservationButtonProps = {
  reservationId: number;
};

export function DeleteReservationButton({
  reservationId,
}: DeleteReservationButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Deseja excluir definitivamente a reserva #${reservationId}?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .select("status")
        .eq("id", reservationId)
        .single();

      if (reservationError || reservation?.status !== "cancelled") {
        setErrorMessage("Somente reservas canceladas podem ser excluídas.");
        return;
      }

      const { error: itemsError } = await supabase
        .from("reservation_items")
        .delete()
        .eq("reservation_id", reservationId);

      if (itemsError) {
        setErrorMessage(itemsError.message || "Não foi possível excluir os itens da reserva.");
        return;
      }

      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId);

      if (error) {
        console.error(
          "ERRO DELETE_CANCELLED_RESERVATION:",
          error
        );

        setErrorMessage(
          error.message ||
            "Não foi possível excluir a reserva."
        );

        return;
      }

      router.push("/admin/reservas");
      router.refresh();
    } catch (error) {
      console.error(
        "ERRO AO EXCLUIR RESERVA:",
        error
      );

      setErrorMessage(
        "Ocorreu um erro inesperado ao excluir a reserva."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Excluindo...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Excluir reserva
          </>
        )}
      </button>

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
