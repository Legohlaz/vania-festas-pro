"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ReservationActionsProps = {
  reservationId: number;
  status: string;
};

export function ReservationActions({
  reservationId,
  status,
}: ReservationActionsProps) {
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing = isConfirming || isCancelling;

  async function handleConfirm() {
    const confirmed = window.confirm(
      `Deseja confirmar a reserva #${reservationId}?`
    );

    if (!confirmed) {
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", reservationId)
        .eq("status", "pending");

      if (error) {
        console.error("ERRO CONFIRM_RESERVATION:", error);

        setErrorMessage(
          error.message || "Não foi possível confirmar a reserva."
        );

        return;
      }

      router.refresh();
    } catch (error) {
      console.error("ERRO AO CONFIRMAR RESERVA:", error);

      setErrorMessage(
        "Ocorreu um erro inesperado ao confirmar a reserva."
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      `Deseja realmente cancelar a reserva #${reservationId}?`
    );

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId)
        .in("status", ["pending", "confirmed"]);

      if (error) {
        console.error("ERRO CANCEL_RESERVATION:", error);

        setErrorMessage(
          error.message || "Não foi possível cancelar a reserva."
        );

        return;
      }

      router.refresh();
    } catch (error) {
      console.error("ERRO AO CANCELAR RESERVA:", error);

      setErrorMessage(
        "Ocorreu um erro inesperado ao cancelar a reserva."
      );
    } finally {
      setIsCancelling(false);
    }
  }

  if (status === "cancelled") {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {status === "pending" && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar reserva
            </>
          )}
        </button>
      )}

      {(status === "pending" || status === "confirmed") && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCancelling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancelando...
            </>
          ) : (
            <>
              <Ban className="h-4 w-4" />
              Cancelar reserva
            </>
          )}
        </button>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
