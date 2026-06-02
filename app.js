const STORAGE = {
  apiKey: "remanent_api_key",
  qtyPrefix: "remanent_qty_"
};

const state = {
  items: []
};

const els = {
  status: document.getElementById("status"),
  leftBody: document.getElementById("leftBody"),
  rightBody: document.getElementById("rightBody"),
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

function makeQtyCell(itemIndex, fieldName, unitText) {
  const td = document.createElement("td");
  td.className = "qtyCell";

  const unit = document.createElement("div");
  unit.className = "unit";
  unit.textContent = unitText || "";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.placeholder = "";

  const key = `${STORAGE.qtyPrefix}${itemIndex}_${fieldName}`;
  input.value = localStorage.getItem(key) || "";

  input.addEventListener("input", () => {
    localStorage.setItem(key, input.value);
  });

  td.appendChild(unit);
  td.appendChild(input);

  return td;
}

function createItemRow(item, index) {
  const tr = document.createElement("tr");

  const product = document.createElement("td");
  product.className = "productCell";
  product.textContent = item.product;
  product.title = item.product;

  tr.appendChild(product);
  tr.appendChild(makeQtyCell(index, "carton", item.cartonUnit));
  tr.appendChild(makeQtyCell(index, "package", item.packageUnit));
  tr.appendChild(makeQtyCell(index, "weight", item.weightUnit));

  return tr;
}

function renderItems() {
  els.leftBody.innerHTML = "";
  els.rightBody.innerHTML = "";

  const count = state.items.length;
  els.docCounter.textContent = `${count} ${count === 1 ? "pozycja" : "pozycji"}`;

  if (!count) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "emptyState";
    td.textContent = "Brak pozycji. Wpisz klucz i kliknij „Pobierz pozycje”.";
    tr.appendChild(td);
    els.leftBody.appendChild(tr);
    return;
  }

  // 2 kolumny: parzyście 50/50, nieparzyście np. 51 -> 26/25.
  const leftCount = Math.ceil(count / 2);

  state.items.slice(0, leftCount).forEach((item, index) => {
    els.leftBody.appendChild(createItemRow(item, index));
  });

  state.items.slice(leftCount).forEach((item, offset) => {
    const index = leftCount + offset;
    els.rightBody.appendChild(createItemRow(item, index));
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

  document.querySelectorAll(".qtyCell input").forEach(input => {
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
    scale: 3,
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
