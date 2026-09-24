import { describe, expect, it } from "vitest";

import { csvCell, monthlyRevenue, reservationBalance, reservationTotal } from "../lib/reports";

describe("cálculos financeiros de reservas", () => {
  const reservation = {
    service_fee: 50,
    amount_paid: 120,
    reservation_items: [
      { quantity: 2, unit_price: 80 },
      { quantity: 1, unit_price: 40 },
    ],
  };

  it("soma produtos e serviço", () => {
    expect(reservationTotal(reservation)).toBe(250);
  });

  it("calcula o saldo sem permitir valor negativo", () => {
    expect(reservationBalance(reservation)).toBe(130);
    expect(reservationBalance({ ...reservation, amount_paid: 999 })).toBe(0);
  });

  it("agrupa pagamentos por mês em ordem", () => {
    expect(monthlyRevenue([
      { amount: 30, payment_date: "2026-09-10" },
      { amount: 20, payment_date: "2026-08-01" },
      { amount: 70, payment_date: "2026-09-12" },
    ])).toEqual([
      { month: "2026-08", amount: 20 },
      { month: "2026-09", amount: 100 },
    ]);
  });

  it("protege células CSV com aspas", () => {
    expect(csvCell('Cliente "Teste"')).toBe('"Cliente ""Teste"""');
  });
});
