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
  message: string;
};

export function createWhatsAppLink({
  type = "locacao",
  message,
}: CreateWhatsAppLinkParams) {
  const phone = whatsappConfig[type];

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    message
  )}`;
}
