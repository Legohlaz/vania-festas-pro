export const whatsappConfig = {
  /*
   * WhatsApp usado para locação de produtos.
   */
  locacao: "5571986093473",

  /*
   * Futuramente colocaremos aqui o número
   * exclusivo para decoração e montagem.
   *
   * Por enquanto usamos o mesmo número.
   */
  decoracao: "5571986093473",
};

type WhatsAppType = keyof typeof whatsappConfig;

type CreateWhatsAppLinkParams = {
  type?: WhatsAppType;
  phone?: string;
  message: string;
};

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function createWhatsAppLink({
  type = "locacao",
  phone,
  message,
}: CreateWhatsAppLinkParams) {
  const destination = phone
    ? normalizeWhatsAppPhone(phone)
    : whatsappConfig[type];

  return `https://wa.me/${destination}?text=${encodeURIComponent(
    message
  )}`;
}
