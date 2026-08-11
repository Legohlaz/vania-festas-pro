const selected = new Map();
let products = [];
let session = null;
let savedReservation = null;
let favoriteIds = new Set();
let recentIds = [];
let conversationDrafts = {};
let currentConversationKey = null;
let draftTimer;

const date = document.querySelector("#event-date");
const search = document.querySelector("#search");
const results = document.querySelector("#results");
const list = document.querySelector("#product-list");
const favoritesSection = document.querySelector("#favorites");
const favoriteList = document.querySelector("#favorite-list");
const recentSection = document.querySelector("#recent");
const recentList = document.querySelector("#recent-list");
const hint = document.querySelector("#hint");
const catalogError = document.querySelector("#catalog-error");
const cart = document.querySelector("#cart-items");
const total = document.querySelector("#total");
const count = document.querySelector("#count");
const copy = document.querySelector("#copy");
const save = document.querySelector("#save");
const customerPhoneInput = document.querySelector("#customer-phone");
const customerHistory = document.querySelector("#customer-history");
const historyList = document.querySelector("#history-list");
const aiRequest = document.querySelector("#ai-request");
const askAi = document.querySelector("#ask-ai");
const aiError = document.querySelector("#ai-error");
const aiSuggestions = document.querySelector("#ai-suggestions");
const customerNameInput = document.querySelector("#customer-name");
const customerAddressInput = document.querySelector("#customer-address");
const draftStatus = document.createElement("p");
draftStatus.className = "draft-status";
draftStatus.hidden = true;
document.querySelector("#use-conversation").insertAdjacentElement("afterend", draftStatus);
const notesLabel = document.createElement("label");
notesLabel.textContent = "Observações do pedido";
const notesInput = document.createElement("textarea");
notesInput.id = "reservation-notes";
notesInput.rows = 3;
notesInput.maxLength = 1500;
notesInput.placeholder = "Ex.: tema Stitch, montagem às 14h, salão no 2º andar";
notesLabel.append(notesInput);
customerAddressInput.closest("label")?.insertAdjacentElement("afterend", notesLabel);
const serviceFeeLabel = document.createElement("label");
serviceFeeLabel.textContent = "Taxa de entrega / montagem (opcional)";
const serviceFeeInput = document.createElement("input");
serviceFeeInput.id = "service-fee";
serviceFeeInput.type = "number";
serviceFeeInput.min = "0";
serviceFeeInput.step = "0.01";
serviceFeeInput.inputMode = "decimal";
serviceFeeInput.placeholder = "Ex.: 50,00";
serviceFeeLabel.append(serviceFeeInput);
notesLabel.insertAdjacentElement("afterend", serviceFeeLabel);
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const normalizeBaseUrl = (value) => value.trim().replace(/\/$/, "");
const storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));
const storageSet = (value) => new Promise((resolve) => chrome.storage.local.set(value, resolve));
const storageRemove = (keys) => new Promise((resolve) => chrome.storage.local.remove(keys, resolve));

function serviceFee() {
  return Math.max(Number(serviceFeeInput.value) || 0, 0);
}

function conversationKey(contact) {
  const phone = String(contact?.phone || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  const name = String(contact?.name || "").trim().toLocaleLowerCase("pt-BR");
  return name ? `name:${name}` : null;
}

function queueDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => { void saveConversationDraft(); }, 300);
}

async function saveConversationDraft() {
  if (!currentConversationKey) return;
  conversationDrafts[currentConversationKey] = {
    eventDate: date.value,
    customerName: customerNameInput.value,
    customerPhone: customerPhoneInput.value,
    customerAddress: customerAddressInput.value,
    notes: notesInput.value,
    serviceFee: serviceFeeInput.value,
    aiRequest: aiRequest.value,
    items: [...selected.values()].map(({ id, quantity }) => ({ id, quantity })),
    updatedAt: Date.now(),
  };
  conversationDrafts = Object.fromEntries(Object.entries(conversationDrafts).sort(([, a], [, b]) => b.updatedAt - a.updatedAt).slice(0, 30));
  await storageSet({ vfConversationDrafts: conversationDrafts });
  draftStatus.textContent = "Rascunho desta conversa salvo automaticamente.";
  draftStatus.hidden = false;
}

async function restoreConversationDraft(key) {
  const draft = conversationDrafts[key];
  selected.clear();
  if (!draft) {
    date.value = "";
    customerAddressInput.value = "";
    notesInput.value = "";
    serviceFeeInput.value = "";
    aiRequest.value = "";
    renderCart();
    draftStatus.textContent = "Nova pré-reserva para esta conversa.";
    draftStatus.hidden = false;
    return;
  }
  date.value = draft.eventDate || "";
  customerNameInput.value = draft.customerName || "";
  customerPhoneInput.value = draft.customerPhone || "";
  customerAddressInput.value = draft.customerAddress || "";
  notesInput.value = draft.notes || "";
  serviceFeeInput.value = draft.serviceFee || "";
  aiRequest.value = draft.aiRequest || "";
  if (date.value) await loadCatalog();
  for (const item of draft.items || []) {
    const product = products.find((candidate) => candidate.id === item.id);
    if (product && product.available > 0) selected.set(product.id, { ...product, quantity: Math.min(Math.max(Math.trunc(item.quantity) || 1, 1), product.available) });
  }
  renderCart();
  draftStatus.textContent = "Rascunho desta conversa restaurado.";
  draftStatus.hidden = false;
}

function showLoggedIn() {
  document.querySelector("#login-card").hidden = true;
  document.querySelector("#app").hidden = false;
  document.querySelector("#session-email").textContent = session.email;
}

function showLogin(message = "") {
  document.querySelector("#app").hidden = true;
  document.querySelector("#login-card").hidden = false;
  const error = document.querySelector("#login-error");
  error.textContent = message;
  error.hidden = !message;
}

function renderSavedReservation() {
  const section = document.querySelector("#saved-reservation");
  const button = document.querySelector("#confirm-saved");
  if (!savedReservation) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  document.querySelector("#saved-title").textContent = savedReservation.status === "confirmed" ? "Reserva confirmada" : `Pré-reserva #${savedReservation.id} salva`;
  document.querySelector("#saved-description").textContent = savedReservation.status === "confirmed" ? "A reserva está confirmada e o estoque continua reservado." : "Quando o cliente aceitar a proposta, confirme aqui com um clique.";
  button.hidden = savedReservation.status === "confirmed";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderResults() {
  if (!date.value) return;
  if (!products.length) {
    list.innerHTML = "<p>Nenhum produto disponível para esta busca.</p>";
    return;
  }
  list.innerHTML = products.map(productCard).join("");
  bindProductButtons(list);
  renderFavorites();
  renderRecent();
}

function productCard(product) {
  const isFavorite = favoriteIds.has(product.id);
  const image = product.imageUrl
    ? `<img class="product-image" src="${escapeHtml(product.imageUrl)}" alt="">`
    : `<span class="product-image-placeholder">Foto</span>`;
  return `<article class="product">${image}<div class="product-content"><strong>${escapeHtml(product.name)}</strong><p>${product.available} unidades disponíveis · Locação ${currency.format(product.price)}</p></div><div class="product-actions"><button class="link-button" data-copy-url="${escapeHtml(product.slug)}" aria-label="Copiar link de ${escapeHtml(product.name)}">Link</button><button class="favorite-button ${isFavorite ? "is-favorite" : ""}" data-favorite-id="${product.id}" aria-label="${isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}">★</button><button data-id="${product.id}" ${product.available < 1 ? "disabled" : ""}>${product.available < 1 ? "Indisponível" : "Adicionar"}</button></div></article>`;
}

function bindProductButtons(container) {
  container.querySelectorAll("button[data-id]").forEach((button) => button.addEventListener("click", () => addProduct(Number(button.dataset.id))));
  container.querySelectorAll("button[data-favorite-id]").forEach((button) => button.addEventListener("click", () => toggleFavorite(Number(button.dataset.favoriteId))));
  container.querySelectorAll("button[data-copy-url]").forEach((button) => button.addEventListener("click", async () => {
    if (!session || !button.dataset.copyUrl) return;
    const catalogBase = session.catalogBase || session.apiBase;
    if (/localhost|127\.0\.0\.1/i.test(catalogBase)) {
      alert("Informe o endereço público do catálogo ao entrar na extensão antes de compartilhar links com clientes.");
      return;
    }
    await navigator.clipboard.writeText(`${catalogBase}/catalogo/${button.dataset.copyUrl}`);
    button.textContent = "Copiado";
    setTimeout(() => { button.textContent = "Link"; }, 1500);
  }));
}

function renderFavorites() {
  const favorites = products.filter((product) => favoriteIds.has(product.id));
  favoritesSection.hidden = !favorites.length;
  if (!favorites.length) return;
  favoriteList.innerHTML = favorites.map(productCard).join("");
  bindProductButtons(favoriteList);
}

function renderRecent() {
  const recentProducts = recentIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);
  recentSection.hidden = !recentProducts.length;
  if (!recentProducts.length) return;
  recentList.innerHTML = recentProducts.map(productCard).join("");
  bindProductButtons(recentList);
}

async function rememberRecentProduct(id) {
  recentIds = [id, ...recentIds.filter((recentId) => recentId !== id)].slice(0, 6);
  await storageSet({ vfRecentProductIds: recentIds });
}

function renderAiSuggestions(suggestions, message) {
  aiSuggestions.hidden = false;
  aiSuggestions.innerHTML = `<p class="ai-message">${escapeHtml(message || "Sugestões encontradas.")}</p>${suggestions.length ? suggestions.map((product) => { const suggestedQuantity = Number(product.suggestedQuantity || 1); return `<article class="ai-product"><div><strong>${escapeHtml(product.name)}</strong><p>${escapeHtml(product.reason)}<br>${product.available} disponíveis · ${currency.format(product.price)}${suggestedQuantity > 1 ? `<br><b>Sugestão: ${suggestedQuantity} unidades</b>` : ""}</p></div><button data-ai-product-id="${product.id}" data-suggested-quantity="${suggestedQuantity}">${suggestedQuantity > 1 ? `Adicionar ${suggestedQuantity}` : "Adicionar"}</button></article>`; }).join("") : "<p class=\"ai-message\">Não encontrei itens adequados no catálogo disponível.</p>"}`;
  aiSuggestions.querySelectorAll("button[data-ai-product-id]").forEach((button) => button.addEventListener("click", () => addSuggestedProduct(Number(button.dataset.aiProductId), Number(button.dataset.suggestedQuantity))));
}

async function askForSuggestions() {
  if (!session || !date.value) return;
  const message = aiRequest.value.trim();
  aiError.hidden = true;
  aiSuggestions.hidden = true;
  if (!message) {
    aiError.textContent = "Descreva o que o cliente está procurando.";
    aiError.hidden = false;
    return;
  }
  askAi.disabled = true;
  askAi.textContent = "Pensando...";
  try {
    const response = await fetch(`${session.apiBase}/api/extension/suggestions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eventDate: date.value, message }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível gerar sugestões.");
    for (const suggestion of payload.suggestions || []) {
      const current = products.find((product) => product.id === suggestion.id);
      if (current) Object.assign(current, suggestion);
      else products.push(suggestion);
    }
    renderAiSuggestions(payload.suggestions || [], payload.message);
  } catch (error) {
    aiError.textContent = error.message;
    aiError.hidden = false;
  } finally {
    askAi.disabled = false;
    askAi.textContent = "Sugerir produtos";
  }
}

async function toggleFavorite(id) {
  if (favoriteIds.has(id)) favoriteIds.delete(id);
  else favoriteIds.add(id);
  await storageSet({ vfFavoriteIds: [...favoriteIds] });
  renderResults();
}

function addProduct(id) {
  const product = products.find((item) => item.id === id);
  const current = selected.get(id)?.quantity || 0;
  if (!product || current >= product.available) return;
  selected.set(id, { ...product, quantity: current + 1 });
  void rememberRecentProduct(id);
  renderCart();
  queueDraftSave();
}

function addSuggestedProduct(id, quantity) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  const current = selected.get(id)?.quantity || 0;
  selected.set(id, { ...product, quantity: Math.min(Math.max(current, Math.trunc(quantity) || 1), product.available) });
  void rememberRecentProduct(id);
  renderCart();
  queueDraftSave();
}

function renderCart() {
  const items = [...selected.values()];
  const itemsValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = serviceFee();
  const value = itemsValue + fee;
  count.textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
  total.textContent = currency.format(value);
  copy.disabled = !items.length;
  save.disabled = !items.length;
  cart.innerHTML = items.length ? items.map((item) => `<div class="cart-item"><div><strong>${escapeHtml(item.name)}</strong><div class="quantity-controls"><button type="button" data-action="decrease" data-id="${item.id}" aria-label="Diminuir ${escapeHtml(item.name)}">−</button><input class="quantity-input" type="number" min="1" max="${item.available}" value="${item.quantity}" data-id="${item.id}" aria-label="Quantidade de ${escapeHtml(item.name)}"><button type="button" data-action="increase" data-id="${item.id}" aria-label="Aumentar ${escapeHtml(item.name)}" ${item.quantity >= item.available ? "disabled" : ""}>+</button><small>de ${item.available}</small></div></div><strong>${currency.format(item.price * item.quantity)}</strong></div>`).join("") : "<p>Nenhum produto selecionado.</p>";
  cart.querySelectorAll("button[data-action]").forEach((button) => button.addEventListener("click", () => changeQuantity(Number(button.dataset.id), button.dataset.action)));
  cart.querySelectorAll("input.quantity-input").forEach((input) => input.addEventListener("change", () => setQuantity(Number(input.dataset.id), Number(input.value))));
  if (items.length && fee) cart.insertAdjacentHTML("beforeend", `<p class="fee-summary">Taxa de entrega / montagem: <strong>${currency.format(fee)}</strong></p>`);
}

function formatHistoryDate(value) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

async function loadCustomerHistory() {
  if (!session || !customerPhoneInput.value.trim()) {
    customerHistory.hidden = true;
    return;
  }
  try {
    const url = new URL(`${session.apiBase}/api/extension/customers/history`);
    url.searchParams.set("phone", customerPhoneInput.value.trim());
    const response = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o histórico.");
    if (!payload.reservations.length) {
      customerHistory.hidden = true;
      return;
    }
    historyList.innerHTML = payload.reservations.map((reservation) => `<div class="history-item"><strong>Reserva #${reservation.id} · ${formatHistoryDate(reservation.event_date)}</strong><span>${escapeHtml(reservation.event_address || "Endereço não informado")} · ${reservation.status === "confirmed" ? "Confirmada" : reservation.status === "cancelled" ? "Cancelada" : "Pendente"}</span></div>`).join("");
    customerHistory.hidden = false;
  } catch {
    customerHistory.hidden = true;
  }
}

function changeQuantity(id, action) {
  const item = selected.get(id);
  if (!item) return;
  if (action === "decrease") {
    if (item.quantity === 1) selected.delete(id);
    else selected.set(id, { ...item, quantity: item.quantity - 1 });
  }
  if (action === "increase" && item.quantity < item.available) {
    selected.set(id, { ...item, quantity: item.quantity + 1 });
  }
  renderCart();
  queueDraftSave();
}

function setQuantity(id, quantity) {
  const item = selected.get(id);
  if (!item) return;
  const safeQuantity = Math.min(Math.max(Math.trunc(quantity) || 1, 1), item.available);
  selected.set(id, { ...item, quantity: safeQuantity });
  renderCart();
  queueDraftSave();
}

async function loadCatalog() {
  if (!date.value || !session) return;
  search.disabled = true;
  askAi.disabled = true;
  catalogError.hidden = true;
  hint.hidden = false;
  hint.textContent = "Consultando disponibilidade...";
  try {
    const url = new URL(`${session.apiBase}/api/extension/catalog`);
    url.searchParams.set("date", date.value);
    url.searchParams.set("q", search.value);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o catálogo.");
    products = payload.products;
    for (const [id, item] of selected) {
      const fresh = products.find((product) => product.id === id);
      if (!fresh || fresh.available < item.quantity) selected.delete(id);
    }
    renderCart();
    renderResults();
    results.hidden = false;
    askAi.disabled = false;
    hint.hidden = true;
  } catch (error) {
    products = [];
    results.hidden = true;
    catalogError.textContent = error.message;
    catalogError.hidden = false;
    if (/sessão expirou/i.test(error.message)) {
      await storageRemove("vfSession");
      session = null;
      showLogin(error.message);
    }
  } finally {
    search.disabled = false;
    if (date.value) askAi.disabled = false;
  }
}

async function login() {
  const button = document.querySelector("#login");
  const apiBase = normalizeBaseUrl(document.querySelector("#api-base").value);
  const catalogBase = normalizeBaseUrl(document.querySelector("#catalog-base").value) || apiBase;
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const error = document.querySelector("#login-error");
  error.hidden = true;
  if (!apiBase || !email || !password) {
    error.textContent = "Preencha o endereço, e-mail e senha.";
    error.hidden = false;
    return;
  }
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    const configResponse = await fetch(`${apiBase}/api/extension/config`);
    const config = await configResponse.json();
    if (!configResponse.ok) throw new Error(config.error || "Não foi possível acessar o sistema.");
    const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const auth = await authResponse.json();
    if (!authResponse.ok || !auth.access_token) throw new Error(auth.error_description || "E-mail ou senha inválidos.");
    session = { apiBase, catalogBase, accessToken: auth.access_token, email: auth.user.email };
    await storageSet({ vfSession: session, vfApiBase: apiBase, vfCatalogBase: catalogBase });
    document.querySelector("#password").value = "";
    showLoggedIn();
  } catch (loginError) {
    error.textContent = loginError.message;
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
}

document.querySelector("#login").addEventListener("click", login);
document.querySelector("#use-conversation").addEventListener("click", async () => {
  const error = document.querySelector("#save-error");
  error.hidden = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error("Não foi possível identificar a aba do WhatsApp.");
    const contact = await chrome.runtime.sendMessage({ type: "VF_READ_CONVERSATION_CONTACT", tabId: tab.id });
    if (contact?.error) throw new Error(contact.error);
    const key = conversationKey(contact);
    if (!key) throw new Error("NÃ£o foi possÃ­vel identificar esta conversa.");
    currentConversationKey = key;
    await restoreConversationDraft(key);
    if (contact?.name && !customerNameInput.value.trim()) customerNameInput.value = contact.name;
    if (contact?.phone && !customerPhoneInput.value.trim()) customerPhoneInput.value = contact.phone;
    queueDraftSave();
    if (contact?.phone) await loadCustomerHistory();
    if (!contact?.phone) {
      error.textContent = "Nome preenchido. Confira e informe o telefone antes de salvar.";
      error.hidden = false;
    }
  } catch (contactError) {
    error.textContent = contactError.message || "Não foi possível ler os dados da conversa.";
    error.hidden = false;
  }
});
document.querySelector("#logout").addEventListener("click", async () => {
  await storageRemove("vfSession");
  session = null;
  selected.clear();
  products = [];
  renderCart();
  showLogin();
});
customerPhoneInput.addEventListener("change", loadCustomerHistory);
customerNameInput.addEventListener("input", queueDraftSave);
customerPhoneInput.addEventListener("input", queueDraftSave);
customerAddressInput.addEventListener("input", queueDraftSave);
notesInput.addEventListener("input", queueDraftSave);
serviceFeeInput.addEventListener("input", () => { renderCart(); queueDraftSave(); });
aiRequest.addEventListener("input", queueDraftSave);
date.addEventListener("change", () => { void loadCatalog(); queueDraftSave(); });
let searchTimer;
search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadCatalog, 250); });
askAi.addEventListener("click", askForSuggestions);
copy.addEventListener("click", async () => {
  const items = [...selected.values()];
  const customerName = customerNameInput.value.trim();
  const address = customerAddressInput.value.trim();
  const notes = notesInput.value.trim();
  const fee = serviceFee();
  const greeting = customerName ? `Olá, ${customerName}!\n\n` : "";
  const message = `${greeting}Sua pré-reserva:\n\n${items.map((item) => `• ${item.quantity}× ${item.name}`).join("\n")}\n\nData: ${date.value.split("-").reverse().join("/")}${address ? `\nEndereço: ${address}` : ""}${notes ? `\nObservações: ${notes}` : ""}${fee ? `\nTaxa de entrega / montagem: ${currency.format(fee)}` : ""}\nTotal: ${total.textContent}`;
  await navigator.clipboard.writeText(message);
  copy.textContent = "Mensagem copiada!";
  setTimeout(() => { copy.textContent = "Copiar mensagem para WhatsApp"; }, 1800);
});
save.addEventListener("click", async () => {
  const customerName = document.querySelector("#customer-name").value.trim();
  const customerPhone = document.querySelector("#customer-phone").value.trim();
  const address = document.querySelector("#customer-address").value.trim();
  const error = document.querySelector("#save-error");
  error.hidden = true;
  if (!customerName || !customerPhone || !address) {
    error.textContent = "Informe nome, telefone e endereço do cliente para salvar.";
    error.hidden = false;
    return;
  }
  save.disabled = true;
  save.textContent = "Salvando...";
  try {
    const response = await fetch(`${session.apiBase}/api/extension/pre-reservations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, customerPhone, address, eventAddress: address, notes: notesInput.value.trim(), serviceFee: serviceFee(), eventDate: date.value, items: [...selected.values()].map((item) => ({ productId: item.id, quantity: item.quantity, unitPrice: item.price })) }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível salvar a pré-reserva.");
    savedReservation = { id: payload.reservationId, status: "pending" };
    await storageSet({ vfLastPreReservation: savedReservation });
    renderSavedReservation();
    save.textContent = `Pré-reserva #${payload.reservationId} salva`;
    selected.clear();
    renderCart();
    queueDraftSave();
    await loadCatalog();
    setTimeout(() => { save.textContent = "Salvar pré-reserva"; }, 2500);
  } catch (saveError) {
    error.textContent = saveError.message;
    error.hidden = false;
    save.textContent = "Salvar pré-reserva";
    save.disabled = false;
  }
});
document.querySelector("#confirm-saved").addEventListener("click", async () => {
  if (!savedReservation || !session) return;
  const button = document.querySelector("#confirm-saved");
  button.disabled = true;
  button.textContent = "Confirmando...";
  try {
    const response = await fetch(`${session.apiBase}/api/extension/reservations/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: savedReservation.id }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível confirmar a reserva.");
    savedReservation = { ...savedReservation, status: "confirmed" };
    await storageSet({ vfLastPreReservation: savedReservation });
    renderSavedReservation();
  } catch (confirmError) {
    document.querySelector("#save-error").textContent = confirmError.message;
    document.querySelector("#save-error").hidden = false;
    button.disabled = false;
    button.textContent = "Confirmar reserva";
  }
});

(async () => {
  const { vfSession, vfApiBase, vfCatalogBase, vfLastPreReservation, vfFavoriteIds, vfRecentProductIds, vfConversationDrafts } = await storageGet(["vfSession", "vfApiBase", "vfCatalogBase", "vfLastPreReservation", "vfFavoriteIds", "vfRecentProductIds", "vfConversationDrafts"]);
  document.querySelector("#api-base").value = vfApiBase || "http://localhost:3000";
  document.querySelector("#catalog-base").value = vfCatalogBase || "";
  favoriteIds = new Set(vfFavoriteIds || []);
  recentIds = vfRecentProductIds || [];
  conversationDrafts = vfConversationDrafts || {};
  if (vfSession?.accessToken) {
    session = vfSession;
    savedReservation = vfLastPreReservation ?? null;
    showLoggedIn();
    renderSavedReservation();
  } else {
    showLogin();
  }
})();
