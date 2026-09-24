import { describe, expect, it } from "vitest";
import { translateAuthError } from "../lib/supabase/error-messages";

describe("translateAuthError", () => {
  it("explica quando e-mail ou senha estão incorretos", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("explica quando o serviço de autenticação está indisponível", () => {
    expect(translateAuthError("Failed to fetch")).toBe(
      "O sistema de acesso está temporariamente indisponível. Aguarde alguns instantes e tente novamente.",
    );
  });
});
