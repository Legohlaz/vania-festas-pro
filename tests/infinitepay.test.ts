import { describe, expect, it } from "vitest";

import { infinitePayAmountMatches, infinitePayMethod } from "../lib/payments/infinitepay";

describe("validação da InfinitePay", () => {
  it("compara centavos com o total em reais", () => {
    expect(infinitePayAmountMatches(12345, 123.45)).toBe(true);
    expect(infinitePayAmountMatches(12344, 123.45)).toBe(false);
  });

  it("traduz o método recebido", () => {
    expect(infinitePayMethod("pix")).toBe("pix");
    expect(infinitePayMethod("credit_card")).toBe("card");
  });
});
