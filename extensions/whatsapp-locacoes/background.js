chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "VF_READ_CONVERSATION_CONTACT") {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: () => {
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
        return name || phone ? { name, phone } : { error: "Não foi possível identificar o contato desta conversa." };
      },
    }).then((results) => sendResponse(results[0]?.result ?? { error: "Não foi possível ler a conversa." }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }

  if (message?.type !== "VF_ENSURE_CONTENT_SCRIPT") return;

  chrome.scripting.executeScript({
    target: { tabId: message.tabId },
    files: ["content.js"],
  }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ error: error.message }));

  return true;
});
