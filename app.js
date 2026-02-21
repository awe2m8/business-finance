const STORAGE_KEY = "finance_os_transactions_v1";
const API_URL_KEY = "finance_os_api_url_v1";
const SELECTED_MONTH_KEY = "finance_os_selected_month_v1";

const CATEGORY_OPTIONS = [
  "Uncategorized",
  "Assistable",
  "Oracall AI",
  "Go High Level",
  "Instantly",
  "Thinker",
  "Twilio",
  "ElevenLabs",
  "Claude",
  "OpenAI",
  "Foreign Currency"
];

const CATEGORY_RULES = [
  { keyword: "assistable", category: "Assistable" },
  { keyword: "oracall", category: "Oracall AI" },
  { keyword: "go high level", category: "Go High Level" },
  { keyword: "gohighlevel", category: "Go High Level" },
  { keyword: "instantly", category: "Instantly" },
  { keyword: "thinker", category: "Thinker" },
  { keyword: "twilio", category: "Twilio" },
  { keyword: "elevenlabs", category: "ElevenLabs" },
  { keyword: "claude", category: "Claude" },
  { keyword: "anthropic", category: "Claude" },
  { keyword: "openai", category: "OpenAI" },
  { keyword: "chatgpt", category: "OpenAI" },
  { keyword: "foreign currency", category: "Foreign Currency" },
  { keyword: "foreign exchange", category: "Foreign Currency" },
  { keyword: "fx fee", category: "Foreign Currency" },
  { keyword: "international transaction fee", category: "Foreign Currency" }
];

const DEFAULT_SPLITS = Object.fromEntries(CATEGORY_OPTIONS.map((category) => [category, 50]));

const state = {
  transactions: [],
  recurring: [],
  selectedMonthKey: null
};

const els = {
  fileInput: document.getElementById("fileInput"),
  importMonthInput: document.getElementById("importMonthInput"),
  importBtn: document.getElementById("importBtn"),
  clearBtn: document.getElementById("clearBtn"),
  downloadTemplateBtn: document.getElementById("downloadTemplateBtn"),
  apiUrlInput: document.getElementById("apiUrlInput"),
  syncBtn: document.getElementById("syncBtn"),
  pullBtn: document.getElementById("pullBtn"),
  searchInput: document.getElementById("searchInput"),
  reviewFilter: document.getElementById("reviewFilter"),
  dateFromInput: document.getElementById("dateFromInput"),
  dateToInput: document.getElementById("dateToInput"),
  monthBadgeRow: document.getElementById("monthBadgeRow"),
  monthSelectedLabel: document.getElementById("monthSelectedLabel"),
  monthExpenseTotal: document.getElementById("monthExpenseTotal"),
  monthCreditTotal: document.getElementById("monthCreditTotal"),
  monthTxCount: document.getElementById("monthTxCount"),
  tableBody: document.querySelector("#transactionsTable tbody"),
  recurringList: document.getElementById("recurringList"),
  metricTotal: document.getElementById("metricTotal"),
  metricCount: document.getElementById("metricCount"),
  metricNeedsReview: document.getElementById("metricNeedsReview"),
  metricRecurring: document.getElementById("metricRecurring")
};

function init() {
  state.transactions = loadTransactions().sort(compareTransactionOrder);
  state.selectedMonthKey = localStorage.getItem(SELECTED_MONTH_KEY) || null;
  els.importMonthInput.value = getCurrentMonthKey();
  els.apiUrlInput.value = localStorage.getItem(API_URL_KEY) || "";
  refreshDerivedData();
  bindEvents();
  render();
}

function bindEvents() {
  els.importBtn.addEventListener("click", handleImportClick);
  els.clearBtn.addEventListener("click", handleClear);
  els.downloadTemplateBtn.addEventListener("click", downloadTemplate);
  els.syncBtn.addEventListener("click", syncToApi);
  els.pullBtn.addEventListener("click", pullFromApi);
  els.apiUrlInput.addEventListener("change", persistApiUrl);
  els.searchInput.addEventListener("input", render);
  els.reviewFilter.addEventListener("change", render);
  els.dateFromInput.addEventListener("change", render);
  els.dateToInput.addEventListener("change", render);
}

function handleImportClick() {
  const file = els.fileInput.files[0];
  const selectedImportMonth = normalizeMonthKey(els.importMonthInput.value);
  if (!file) {
    alert("Pick a CSV file first.");
    return;
  }
  if (!selectedImportMonth) {
    alert("Pick a statement month before importing.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = String(e.target.result || "");
    const imported = parseCSV(text)
      .map((row) => normalizeTransaction(row, selectedImportMonth))
      .filter(Boolean);

    if (!imported.length) {
      alert("No valid rows found.");
      return;
    }

    upsertTransactions(imported);
    state.selectedMonthKey = selectedImportMonth;
    persistSelectedMonth();
    refreshDerivedData();
    persist();
    render();
  };
  reader.readAsText(file);
}

function handleClear() {
  if (!confirm("Delete all imported data from this browser?")) {
    return;
  }
  state.transactions = [];
  state.recurring = [];
  state.selectedMonthKey = null;
  persistSelectedMonth();
  persist();
  render();
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() ?? "";
    });
    return row;
  });
}

function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += char;
  }
  out.push(cur);
  return out;
}

function normalizeTransaction(row, importMonthKey = null) {
  const dateValue = row.date || row.posted || row.transaction_date;
  const description = row.description || row.memo || row.vendor || "";
  const debitValue = row.debit || row.withdrawal || row.charge || "";
  const creditValue = row.credit || row.deposit || "";
  const amountValue = row.amount || row.value || "";

  if (!dateValue || !description || (!debitValue && !creditValue && !amountValue)) {
    return null;
  }

  const txDate = parseDateToISO(dateValue);
  if (!txDate) {
    return null;
  }

  const parsedDebit = parseAmount(debitValue);
  const parsedCredit = parseAmount(creditValue);
  const parsedAmount = parseAmount(amountValue);

  let amount = null;
  if (parsedDebit !== null) {
    amount = Math.abs(parsedDebit);
  } else if (parsedCredit !== null) {
    amount = -Math.abs(parsedCredit);
  } else if (parsedAmount !== null) {
    amount = parsedAmount;
  }

  if (amount === null) {
    return null;
  }

  const descriptionLower = description.toLowerCase();
  const matchedRule = CATEGORY_RULES.find((r) => descriptionLower.includes(r.keyword));
  const category = normalizeCategory(row.category || matchedRule?.category || "Uncategorized");
  const confidence = row.category ? 0.95 : matchedRule ? 0.9 : 0.45;
  const splitPct = Number(row.partner_split_pct) || DEFAULT_SPLITS[category] || 50;

  return {
    id: buildTransactionId(txDate, description, amount),
    date: txDate,
    description: description.trim(),
    amount,
    category,
    partnerSplitPct: clamp(splitPct, 0, 100),
    statementMonthKey: normalizeMonthKey(importMonthKey || row.statement_month_key || row.statement_month || ""),
    status: confidence >= 0.8 ? "clean" : "needs-review"
  };
}

function parseAmount(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(numeric) ? null : numeric;
}

function buildTransactionId(date, description, amount) {
  return `${formatDate(date)}|${description.toLowerCase().trim()}|${amount.toFixed(2)}`;
}

function formatDate(value) {
  const normalized = parseDateToISO(value);
  if (normalized) {
    return normalized;
  }

  return String(value).trim();
}

function parseDateToISO(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymdSlash = raw.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (ymdSlash) {
    return toISODate(Number(ymdSlash[1]), Number(ymdSlash[2]), Number(ymdSlash[3]));
  }

  const dmyOrMdy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (dmyOrMdy) {
    const part1 = Number(dmyOrMdy[1]);
    const part2 = Number(dmyOrMdy[2]);
    const year = normalizeYear(dmyOrMdy[3]);

    if (part1 > 12) {
      return toISODate(year, part2, part1); // DD/MM/YYYY
    }

    if (part2 > 12) {
      return toISODate(year, part1, part2); // MM/DD/YYYY
    }

    return toISODate(year, part2, part1); // default ambiguous dates to DD/MM/YYYY
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeYear(yearValue) {
  if (yearValue.length === 2) {
    return Number(`20${yearValue}`);
  }
  return Number(yearValue);
}

function toISODate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!valid) {
    return null;
  }

  const y = String(year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeMonthKey(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return `${String(year)}-${String(month).padStart(2, "0")}`;
}

function normalizeCategory(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "Uncategorized";
  }
  const matched = CATEGORY_OPTIONS.find((option) => option.toLowerCase() === raw.toLowerCase());
  return matched || raw;
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function upsertTransactions(items) {
  const map = new Map(state.transactions.map((t) => [t.id, t]));
  items.forEach((item) => {
    map.set(item.id, item);
  });
  state.transactions = Array.from(map.values()).sort(compareTransactionOrder);
}

function refreshDerivedData() {
  state.recurring = detectRecurring(state.transactions);
}

function detectRecurring(transactions) {
  const byMerchant = new Map();

  transactions.forEach((t) => {
    const merchant = canonicalMerchant(t.description);
    if (!byMerchant.has(merchant)) {
      byMerchant.set(merchant, []);
    }
    byMerchant.get(merchant).push(t);
  });

  const recurring = [];
  byMerchant.forEach((items, merchant) => {
    if (items.length < 2) {
      return;
    }

    const sorted = items.slice().sort((a, b) => a.date.localeCompare(b.date));
    const avgAmount = sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length;
    const denominator = Math.max(Math.abs(avgAmount), 0.01);
    const allNearAmount = sorted.every((t) => Math.abs(t.amount - avgAmount) / denominator < 0.2);

    if (!allNearAmount) {
      return;
    }

    const dayGaps = [];
    for (let i = 1; i < sorted.length; i++) {
      dayGaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }

    const avgGap = dayGaps.reduce((sum, d) => sum + d, 0) / dayGaps.length;
    if (avgGap >= 24 && avgGap <= 38) {
      recurring.push({ merchant, avgAmount, occurrences: sorted.length, avgGap });
    }
  });

  return recurring.sort((a, b) => b.occurrences - a.occurrences);
}

function canonicalMerchant(description) {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(b - a);
  return diff / (1000 * 60 * 60 * 24);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function persistApiUrl() {
  localStorage.setItem(API_URL_KEY, els.apiUrlInput.value.trim());
}

function persistSelectedMonth() {
  if (!state.selectedMonthKey) {
    localStorage.removeItem(SELECTED_MONTH_KEY);
    return;
  }
  localStorage.setItem(SELECTED_MONTH_KEY, state.selectedMonthKey);
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (_e) {
    return [];
  }
}

function render() {
  renderMetrics();
  renderMonthPanel();
  renderTransactions();
  renderRecurring();
}

function renderMetrics() {
  const total = state.transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
  const needsReview = state.transactions.filter((t) => t.status === "needs-review").length;

  els.metricTotal.textContent = formatCurrency(total);
  els.metricCount.textContent = String(state.transactions.length);
  els.metricNeedsReview.textContent = String(needsReview);
  els.metricRecurring.textContent = String(state.recurring.length);
}

function renderMonthPanel() {
  const summaries = buildMonthSummaries(state.transactions);

  if (state.selectedMonthKey && !summaries.some((s) => s.key === state.selectedMonthKey)) {
    state.selectedMonthKey = null;
    persistSelectedMonth();
  }

  els.monthBadgeRow.innerHTML = "";

  const allSummary = state.transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount) || 0;
      acc.count += 1;
      if (amount < 0) {
        acc.credits += Math.abs(amount);
      } else {
        acc.expenses += amount;
      }
      return acc;
    },
    { count: 0, expenses: 0, credits: 0 }
  );

  const allBtn = document.createElement("button");
  allBtn.className = `month-badge ${state.selectedMonthKey ? "" : "active"}`.trim();
  allBtn.innerHTML = `<span class="month-name">All Months</span><span class="month-meta">${allSummary.count} tx</span>`;
  allBtn.addEventListener("click", () => {
    state.selectedMonthKey = null;
    persistSelectedMonth();
    render();
  });
  els.monthBadgeRow.appendChild(allBtn);

  summaries.forEach((summary) => {
    const btn = document.createElement("button");
    btn.className = `month-badge ${state.selectedMonthKey === summary.key ? "active" : ""}`.trim();
    btn.innerHTML = `
      <span class="month-badge-top">
        <span class="month-name">${escapeHtml(summary.label)}</span>
        <span class="month-delete-btn" data-month-delete="${summary.key}" role="button" aria-label="Delete ${escapeHtml(summary.label)}">×</span>
      </span>
      <span class="month-meta">${summary.count} tx</span>
    `;
    btn.addEventListener("click", () => {
      state.selectedMonthKey = summary.key;
      persistSelectedMonth();
      render();
    });
    const deleteBtn = btn.querySelector("[data-month-delete]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteMonthBatch(summary);
      });
    }
    els.monthBadgeRow.appendChild(btn);
  });

  const activeSummary = state.selectedMonthKey
    ? summaries.find((item) => item.key === state.selectedMonthKey) || allSummary
    : allSummary;

  const selectedLabel = state.selectedMonthKey
    ? summaries.find((item) => item.key === state.selectedMonthKey)?.label || "All Months"
    : "All Months";

  els.monthSelectedLabel.textContent = selectedLabel;
  els.monthExpenseTotal.textContent = formatCurrency(activeSummary.expenses || 0);
  els.monthCreditTotal.textContent = formatCurrency(activeSummary.credits || 0);
  els.monthTxCount.textContent = String(activeSummary.count || 0);
}

function deleteMonthBatch(summary) {
  const monthKey = summary.key;
  const label = summary.label;
  const count = summary.count;
  const ok = confirm(`Delete ${count} transaction(s) for ${label}? This cannot be undone.`);
  if (!ok) {
    return;
  }

  state.transactions = state.transactions.filter((tx) => normalizeMonthKey(tx.statementMonthKey) !== monthKey);
  if (state.selectedMonthKey === monthKey) {
    state.selectedMonthKey = null;
    persistSelectedMonth();
  }

  refreshDerivedData();
  persist();
  render();
}

function buildMonthSummaries(transactions) {
  const monthMap = new Map();

  transactions.forEach((t) => {
    const key = normalizeMonthKey(t.statementMonthKey);
    if (!key) {
      return;
    }

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: formatMonthKeyLabel(key),
        count: 0,
        expenses: 0,
        credits: 0
      });
    }

    const summary = monthMap.get(key);
    summary.count += 1;

    const amount = Number(t.amount) || 0;
    if (amount < 0) {
      summary.credits += Math.abs(amount);
    } else {
      summary.expenses += amount;
    }
  });

  return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function formatMonthKeyLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function renderTransactions() {
  const filterText = els.searchInput.value.trim().toLowerCase();
  const reviewFilter = els.reviewFilter.value;
  const dateFrom = els.dateFromInput.value;
  const dateTo = els.dateToInput.value;
  const selectedMonthKey = state.selectedMonthKey;

  const filtered = state.transactions.filter((t) => {
    const matchesText =
      !filterText ||
      t.description.toLowerCase().includes(filterText) ||
      t.category.toLowerCase().includes(filterText);

    const matchesReview =
      reviewFilter === "all" ||
      (reviewFilter === "needs-review" && t.status === "needs-review") ||
      (reviewFilter === "clean" && t.status === "clean");

    const txDate = parseDateToISO(t.date);
    const matchesDateFrom = !dateFrom || (txDate && txDate >= dateFrom);
    const matchesDateTo = !dateTo || (txDate && txDate <= dateTo);
    const matchesMonth = !selectedMonthKey || normalizeMonthKey(t.statementMonthKey) === selectedMonthKey;

    return matchesText && matchesReview && matchesDateFrom && matchesDateTo && matchesMonth;
  });

  filtered.sort(compareTransactionOrder);

  els.tableBody.innerHTML = "";

  filtered.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td class="description-cell">${escapeHtml(t.description)}</td>
      <td>${formatCurrency(t.amount)}</td>
      <td>
        ${renderCategorySelect(t)}
      </td>
      <td>
        <input type="number" min="0" max="100" value="${t.partnerSplitPct}" data-id="${t.id}" data-field="partnerSplitPct" />
      </td>
      <td><span class="status ${t.status}">${t.status === "clean" ? "Clean" : "Needs Review"}</span></td>
    `;

    tr.querySelectorAll("input, select").forEach((control) => {
      control.addEventListener("change", onCellChange);
    });

    els.tableBody.appendChild(tr);
  });
}

function renderCategorySelect(tx) {
  const current = normalizeCategory(tx.category);
  const options = CATEGORY_OPTIONS.includes(current) ? CATEGORY_OPTIONS : CATEGORY_OPTIONS.concat(current);
  const optionMarkup = options
    .map((category) => {
      const selected = category === current ? " selected" : "";
      return `<option value="${escapeHtml(category)}"${selected}>${escapeHtml(category)}</option>`;
    })
    .join("");

  return `<select data-id="${tx.id}" data-field="category">${optionMarkup}</select>`;
}

function compareTransactionOrder(a, b) {
  const dateA = parseDateToISO(a.date) || "";
  const dateB = parseDateToISO(b.date) || "";

  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }

  // Keep ordering deterministic when multiple items share the same date.
  return String(a.id).localeCompare(String(b.id));
}

function renderRecurring() {
  els.recurringList.innerHTML = "";

  if (!state.recurring.length) {
    const li = document.createElement("li");
    li.textContent = "No recurring candidates yet.";
    els.recurringList.appendChild(li);
    return;
  }

  state.recurring.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.merchant} - ${formatCurrency(item.avgAmount)} (${item.occurrences} hits, ~${Math.round(item.avgGap)} day cadence)`;
    els.recurringList.appendChild(li);
  });
}

function onCellChange(event) {
  const id = event.target.dataset.id;
  const field = event.target.dataset.field;
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) {
    return;
  }

  if (field === "partnerSplitPct") {
    tx.partnerSplitPct = clamp(Number(event.target.value), 0, 100);
  }

  if (field === "category") {
    tx.category = normalizeCategory(event.target.value);
  }

  tx.status = tx.category === "Uncategorized" ? "needs-review" : "clean";

  refreshDerivedData();
  persist();
  render();
}

function downloadTemplate() {
  const csv = [
    "date,description,amount,account,category,partner_split_pct",
    "2026-02-01,OpenAI API Usage,59.99,Business Checking,OpenAI,50",
    "2026-02-03,Twilio SMS,22.15,Business Card,Twilio,50"
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance_os_template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatCurrency(num) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0);
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function getApiBaseUrl() {
  return (els.apiUrlInput.value || "").trim().replace(/\/+$/, "");
}

async function syncToApi() {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    alert("Enter API URL first.");
    return;
  }

  try {
    const validTransactions = state.transactions
      .map((t) => ({ ...t, txDate: parseDateToISO(t.date) }))
      .filter((t) => Boolean(t.txDate));

    if (!validTransactions.length) {
      alert("No valid dated transactions to sync. Check your CSV date format.");
      return;
    }

    const payload = {
      items: validTransactions.map((t) => ({
        tx_date: t.txDate,
        description: t.description,
        amount_cents: Math.round(t.amount * 100),
        category: t.category,
        partner_split_pct: t.partnerSplitPct,
        statement_month_key: normalizeMonthKey(t.statementMonthKey),
        source: "ui-import"
      }))
    };

    const res = await fetch(`${baseUrl}/transactions/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Sync failed (${res.status})`);
    }

    const json = await res.json();
    persistApiUrl();
    alert(`Synced ${json.inserted || 0} transaction(s) to API.`);
  } catch (error) {
    alert(`Sync failed: ${String(error.message || error)}`);
  }
}

async function pullFromApi() {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    alert("Enter API URL first.");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/transactions`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Pull failed (${res.status})`);
    }

    const rows = await res.json();
    const imported = rows.map((row) => {
      const category = normalizeCategory(row.category || "Uncategorized");
      return {
        id: buildTransactionId(row.tx_date, row.description, Number(row.amount_cents) / 100),
        date: formatDate(row.tx_date),
        description: String(row.description || ""),
        amount: Number(row.amount_cents) / 100,
        category,
        partnerSplitPct: clamp(Number(row.partner_split_pct || 50), 0, 100),
        statementMonthKey: normalizeMonthKey(row.statement_month_key),
        status: category === "Uncategorized" ? "needs-review" : "clean"
      };
    });

    upsertTransactions(imported);
    refreshDerivedData();
    persistApiUrl();
    persist();
    render();
    alert(`Pulled ${imported.length} transaction(s) from API.`);
  } catch (error) {
    alert(`Pull failed: ${String(error.message || error)}`);
  }
}

init();
