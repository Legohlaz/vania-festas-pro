export function translateAuthError(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("user already registered")) {
    return "Este e-mail já possui cadastro. Entre na Área do cliente.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar na Área do cliente.";
  }

  if (normalized.includes("password should be at least") || normalized.includes("password must be at least")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }

  if (normalized.includes("email rate limit exceeded") || normalized.includes("for security purposes")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("signup is disabled")) {
    return "O cadastro de novos clientes está indisponível no momento.";
  }

  if (normalized.includes("invalid email")) {
    return "Informe um endereço de e-mail válido.";
  }

  return "Não foi possível concluir a operação. Confira os dados e tente novamente.";
}
