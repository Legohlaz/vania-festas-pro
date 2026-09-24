import { describe, expect, it } from "vitest";

import { createWhatsAppLink, normalizeWhatsAppPhone } from "../lib/whatsapp";

describe("links de WhatsApp", () => {
  it("adiciona o código do Brasil a números locais", () => {
    expect(normalizeWhatsAppPhone("(71) 98609-3473")).toBe("5571986093473");
  });

  it("preserva números que já possuem código do país", () => {
    expect(normalizeWhatsAppPhone("+55 71 98609-3473")).toBe("5571986093473");
  });

  it("gera mensagem codificada para o cliente informado", () => {
    expect(createWhatsAppLink({ phone: "71986093473", message: "Olá, Vânia!" }))
      .toBe("https://wa.me/5571986093473?text=Ol%C3%A1%2C%20V%C3%A2nia!");
  });
});
