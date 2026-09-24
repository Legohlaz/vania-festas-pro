export type FinancialItem = {
  quantity: number | null;
  unit_price: number | null;
};

export type FinancialReservation = {
  service_fee: number | null;
  amount_paid: number | null;
  reservation_items: FinancialItem[] | null;
};

export type DatedPayment = {
  amount: number | null;
  payment_date: string;
};

export function reservationTotal(reservation: FinancialReservation) {
  return (reservation.reservation_items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
    Number(reservation.service_fee ?? 0)
  );
}

export function reservationBalance(reservation: FinancialReservation) {
  return Math.max(reservationTotal(reservation) - Number(reservation.amount_paid ?? 0), 0);
}

export function monthlyRevenue(payments: DatedPayment[]) {
  const grouped = new Map<string, number>();

  for (const payment of payments) {
    const month = payment.payment_date.slice(0, 7);
    grouped.set(month, (grouped.get(month) ?? 0) + Number(payment.amount ?? 0));
  }

  return [...grouped.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, amount]) => ({ month, amount }));
}

export function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
