const STORAGE = {
  apiKey: "remanent_api_key",
  qtyPrefix: "remanent_qty_"
};

const state = {
  items: []
};

const els = {
  status: document.getElementById("status"),
  leftColumn: document.getElementById("leftColumn"),
  rightColumn: document.getElementById("rightColumn"),
  docMeta: document.getElementById("docMeta"),
  docCounter: document.getElementById("docCounter"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveKeyBtn: document.getElementById("saveKeyBtn"),
  forgetKeyBtn: document.getElementById("forgetKeyBtn"),
  personName: document.getElementById("personName"),
  placeName: document.getElementById("placeName"),
  documentDate: document.getElementById("documentDate"),
  loadBtn: document.getElementById("loadBtn"),
  clearBtn: document.getElementById("clearBtn"),
  pngBtn: document.getElementById("pngBtn"),
  pdfBtn: document.getElementById("pdfBtn"),
  document: document.getElementById("document")
};

function setStatus(text) {
  els.status.textContent = text;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeText(value) {
  return String(value ?? "").trim();
}

function getSavedApiKey() {
  return localStorage.getItem(STORAGE.apiKey) || "";
}

function saveApiKey() {
  const key = safeText(els.apiKeyInput.value);

  if (!key) {
    alert("Wpisz klucz dostępu.");
    return;
  }

  localStorage.setItem(STORAGE.apiKey, key);
  els.apiKeyInput.value = key;
  setStatus("Klucz zapisany");
}

function forgetApiKey() {
  localStorage.removeItem(STORAGE.apiKey);
  els.apiKeyInput.value = "";
  setStatus("Klucz usunięty");
}

function updateMeta() {
  const person = safeText(els.personName.value) || "—";
  const place = safeText(els.placeName.value) || "—";
  const date = safeText(els.documentDate.value) || todayISO();
  els.docMeta.textContent = `Data: ${date} | Osoba: ${person} | Miejsce: ${place}`;
}

function makeQtyBox(itemIndex, fieldName, unitText) {
  const box = document.createElement("div");
  box.className = "qtyBox";

  const unit = document.createElement("div");
  unit.className = "unit";
  unit.textContent = unitText || "—";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.placeholder = "0";

  const key = `${STORAGE.qtyPrefix}${itemIndex}_${fieldName}`;
  input.value = localStorage.getItem(key) || "";

  input.addEventListener("input", () => {
    localStorage.setItem(key, input.value);
  });

  box.appendChild(unit);
  box.appendChild(input);

  return box;
}

function createItemElement(item, index) {
  const row = document.createElement("div");
  row.className = "item";

  const name = document.createElement("div");
  name.className = "itemName";
  name.textContent = item.product;

  row.appendChild(name);
  row.appendChild(makeQtyBox(index, "carton", item.cartonUnit));
  row.appendChild(makeQtyBox(index, "package", item.packageUnit));
  row.appendChild(makeQtyBox(index, "weight", item.weightUnit));

  return row;
}

function renderItems() {
  els.leftColumn.innerHTML = "";
  els.rightColumn.innerHTML = "";

  const count = state.items.length;
  els.docCounter.textContent = `${count} ${count === 1 ? "pozycja" : "pozycji"}`;

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = "Brak pozycji. Wpisz klucz i kliknij „Pobierz pozycje”.";
    els.leftColumn.appendChild(empty);
    return;
  }

  const leftCount = Math.ceil(count / 2);
  const leftItems = state.items.slice(0, leftCount);
  const rightItems = state.items.slice(leftCount);

  leftItems.forEach((item, index) => {
    els.leftColumn.appendChild(createItemElement(item, index));
  });

  rightItems.forEach((item, offset) => {
    const index = leftCount + offset;
    els.rightColumn.appendChild(createItemElement(item, index));
  });

  updateMeta();
}

async function loadItems() {
  const config = window.REMANENT_CONFIG || {};
  const apiUrl = safeText(config.API_URL);
  const apiKey = safeText(els.apiKeyInput.value) || getSavedApiKey();

  if (!apiUrl || apiUrl.includes("WKLEJ_TUTAJ")) {
    alert("Uzupełnij API_URL w pliku config.js");
    return;
  }

  if (!apiKey) {
    alert("Wpisz klucz dostępu w aplikacji.");
    return;
  }

  localStorage.setItem(STORAGE.apiKey, apiKey);

  setStatus("Pobieram...");

  const url = new URL(apiUrl);
  url.searchParams.set("action", "getItems");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (!data.ok) throw new Error(data.error || "Błąd API");

    state.items = Array.isArray(data.items) ? data.items : [];
    renderItems();
    setStatus(`Pobrano: ${state.items.length}`);
  } catch (error) {
    console.error(error);
    setStatus("Błąd pobierania");
    alert(`Nie udało się pobrać pozycji: ${error.message}`);
  }
}

function clearQuantities() {
  if (!confirm("Wyczyścić wpisane ilości?")) return;

  Object.keys(localStorage)
    .filter(key => key.startsWith(STORAGE.qtyPrefix))
    .forEach(key => localStorage.removeItem(key));

  document.querySelectorAll(".item input").forEach(input => {
    input.value = "";
  });
}

async function exportPNG() {
  updateMeta();

  if (!window.html2canvas) {
    alert("Brak biblioteki html2canvas. Sprawdź internet albo CDN w index.html.");
    return;
  }

  setStatus("Tworzę PNG...");

  const canvas = await html2canvas(els.document, {
    scale: 2,
    backgroundColor: "#ffffff"
  });

  const link = document.createElement("a");
  link.download = `remanent-${els.documentDate.value || todayISO()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();

  setStatus("PNG gotowy");
}

function exportPDF() {
  updateMeta();
  window.print();
}

["input", "change"].forEach(evt => {
  els.personName.addEventListener(evt, updateMeta);
  els.placeName.addEventListener(evt, updateMeta);
  els.documentDate.addEventListener(evt, updateMeta);
});

els.saveKeyBtn.addEventListener("click", saveApiKey);
els.forgetKeyBtn.addEventListener("click", forgetApiKey);
els.loadBtn.addEventListener("click", loadItems);
els.clearBtn.addEventListener("click", clearQuantities);
els.pngBtn.addEventListener("click", exportPNG);
els.pdfBtn.addEventListener("click", exportPDF);

els.documentDate.value = todayISO();
els.apiKeyInput.value = getSavedApiKey();

updateMeta();
renderItems();

if (getSavedApiKey()) {
  setStatus("Klucz wczytany");
}
