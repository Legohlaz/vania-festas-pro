function getConversationContact() {
  const conversation = document.querySelector("#main");
  const header = conversation?.querySelector("header");
  if (!header) return { error: "Abra uma conversa individual no WhatsApp antes de usar esta opção." };

  const texts = [...header.querySelectorAll("span[dir='auto'], [title]")]
    .map((element) => element.getAttribute("title")?.trim() || element.textContent?.trim())
    .filter(Boolean);
  const headerText = header.innerText.replace(/\s+/g, " ").trim();
  const phoneMatch = [...texts, headerText].join(" ").match(/\+?\d[\d\s()\-]{7,}\d/);
  const phone = phoneMatch?.[0]?.replace(/[^\d+]/g, "") ?? "";
  const ignoredLabels = /^(dados do perfil|adicionar à lista|ligação de voz|ligação de vídeo|online|digitando|atendida em outro dispositivo)$/i;
  const name = texts.find((text) => text !== phoneMatch?.[0] && text.length > 1 && !ignoredLabels.test(text)) ?? "";

  if (!name && !phone) return { error: "Não foi possível identificar o contato desta conversa." };
  return { name, phone };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "VF_GET_CONVERSATION_CONTACT") sendResponse(getConversationContact());
});
