const STORAGE_KEY = "finance_os_transactions_v1";
const API_URL_KEY = "finance_os_api_url_v1";
const SELECTED_MONTH_KEY = "finance_os_selected_month_v1";
const CONTROLS_OPEN_KEY = "finance_os_controls_open_v1";
const RECON_NOTES_KEY = "finance_os_reconciliation_notes_v1";
const INITIAL_RECON_KEY = "finance_os_initial_reconciliation_v1";
const INITIAL_RECON_META_KEY = "finance_os_initial_reconciliation_meta_v1";
const INITIAL_RECON_RANGE_START = "2025-06-01";
const INITIAL_RECON_RANGE_END = "2026-02-28";

const CATEGORY_OPTIONS = [
  "Uncategorized",
  "Credit",
  "Giles Credit",
  "Misc Credit",
  "Debit",
  "Assistable",
  "Oracall AI",
  "Go High Level",
  "Instantly",
  "Thinkrr",
  "Twilio",
  "ElevenLabs",
  "Claude",
  "OpenAI",
  "Foreign Currency",
  "Google",
  "Misc Debit"
];
const CREDIT_CATEGORIES = new Set(["Credit", "Giles Credit", "Misc Credit"]);
const CATEGORY_ALIASES = {
  "credit giles": "Giles Credit",
  "giles credit": "Giles Credit",
  thinker: "Thinkrr",
  misc: "Misc Debit",
  miscellaneous: "Misc Debit"
};

const CATEGORY_RULES = [
  { keyword: "giles", category: "Giles Credit" },
  { keyword: "google", category: "Google" },
  { keyword: "assistable", category: "Assistable" },
  { keyword: "oracall", category: "Oracall AI" },
  { keyword: "go high level", category: "Go High Level" },
  { keyword: "gohighlevel", category: "Go High Level" },
  { keyword: "instantly", category: "Instantly" },
  { keyword: "thinker", category: "Thinkrr" },
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
  selectedMonthKey: null,
  reconciliationNotes: {},
  activeNoteScopeKey: null,
  initialReconciliation: [],
  initialReconciliationMeta: null
};

const els = {
  fileInput: document.getElementById("fileInput"),
  controlsToggleBtn: document.getElementById("controlsToggleBtn"),
  controlsContent: document.getElementById("controlsContent"),
  controlsToggleIcon: document.getElementById("controlsToggleIcon"),
  metricsToggleBtn: document.getElementById("metricsToggleBtn"),
  metricsContent: document.getElementById("metricsContent"),
  metricsToggleIcon: document.getElementById("metricsToggleIcon"),
  monthPanelToggleBtn: document.getElementById("monthPanelToggleBtn"),
  monthPanelContent: document.getElementById("monthPanelContent"),
  monthPanelToggleIcon: document.getElementById("monthPanelToggleIcon"),
  insightsToggleBtn: document.getElementById("insightsToggleBtn"),
  insightsContent: document.getElementById("insightsContent"),
  insightsToggleIcon: document.getElementById("insightsToggleIcon"),
  notesToggleBtn: document.getElementById("notesToggleBtn"),
  notesContent: document.getElementById("notesContent"),
  notesToggleIcon: document.getElementById("notesToggleIcon"),
  transactionsToggleBtn: document.getElementById("transactionsToggleBtn"),
  transactionsContent: document.getElementById("transactionsContent"),
  transactionsToggleIcon: document.getElementById("transactionsToggleIcon"),
  recurringToggleBtn: document.getElementById("recurringToggleBtn"),
  recurringContent: document.getElementById("recurringContent"),
  recurringToggleIcon: document.getElementById("recurringToggleIcon"),
  initialReconToggleBtn: document.getElementById("initialReconToggleBtn"),
  initialReconContent: document.getElementById("initialReconContent"),
  initialReconToggleIcon: document.getElementById("initialReconToggleIcon"),
  importMonthInput: document.getElementById("importMonthInput"),
  importMiscBtn: document.getElementById("importMiscBtn"),
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
  metricRecurring: document.getElementById("metricRecurring"),
  insightScopeLabel: document.getElementById("insightScopeLabel"),
  closeScore: document.getElementById("closeScore"),
  closeStatus: document.getElementById("closeStatus"),
  closeUncategorized: document.getElementById("closeUncategorized"),
  closeNeedsReview: document.getElementById("closeNeedsReview"),
  closeMissingSplit: document.getElementById("closeMissingSplit"),
  partnerShareAmount: document.getElementById("partnerShareAmount"),
  businessShareAmount: document.getElementById("businessShareAmount"),
  partnerSplitRatio: document.getElementById("partnerSplitRatio"),
  partnerExpenseTotal: document.getElementById("partnerExpenseTotal"),
  partnerCreditTotal: document.getElementById("partnerCreditTotal"),
  vendorConcentrationPercent: document.getElementById("vendorConcentrationPercent"),
  vendorTopList: document.getElementById("vendorTopList"),
  vendorExpenseBaseTotal: document.getElementById("vendorExpenseBaseTotal"),
  vendorTopTotal: document.getElementById("vendorTopTotal"),
  reconNoteScopeLabel: document.getElementById("reconNoteScopeLabel"),
  reconNoteInput: document.getElementById("reconNoteInput"),
  saveReconNoteBtn: document.getElementById("saveReconNoteBtn"),
  reconNoteStatus: document.getElementById("reconNoteStatus"),
  initialReconFileInput: document.getElementById("initialReconFileInput"),
  uploadInitialReconBtn: document.getElementById("uploadInitialReconBtn"),
  clearInitialReconBtn: document.getElementById("clearInitialReconBtn"),
  initialReconLoadedRows: document.getElementById("initialReconLoadedRows"),
  initialReconInRangeRows: document.getElementById("initialReconInRangeRows"),
  initialReconExpenseTotal: document.getElementById("initialReconExpenseTotal"),
  initialReconCreditTotal: document.getElementById("initialReconCreditTotal"),
  initialReconPartnerTotal: document.getElementById("initialReconPartnerTotal"),
  initialReconBusinessTotal: document.getElementById("initialReconBusinessTotal"),
  initialReconMessages: document.getElementById("initialReconMessages")
};

function init() {
  state.transactions = normalizeStoredTransactions(loadTransactions()).sort(compareTransactionOrder);
  state.selectedMonthKey = localStorage.getItem(SELECTED_MONTH_KEY) || null;
  state.reconciliationNotes = loadStoredObject(RECON_NOTES_KEY, {});
  state.initialReconciliation = loadStoredArray(INITIAL_RECON_KEY);
  state.initialReconciliationMeta = loadStoredObject(INITIAL_RECON_META_KEY, null);
  initControlsPanel();
  initSectionPanels();
  els.importMonthInput.value = getCurrentMonthKey();
  els.apiUrlInput.value = localStorage.getItem(API_URL_KEY) || "";
  refreshDerivedData();
  bindEvents();
  render();
}

function bindEvents() {
  if (els.controlsToggleBtn) {
    els.controlsToggleBtn.addEventListener("click", toggleControlsPanel);
  }

  getSectionPanels().forEach((panel) => {
    if (!panel.toggleBtn || !panel.content) {
      return;
    }

    panel.toggleBtn.addEventListener("click", () => {
      toggleSectionPanel(panel);
    });
  });

  els.importBtn.addEventListener("click", handleImportClick);
  if (els.importMiscBtn) {
    els.importMiscBtn.addEventListener("click", handleMiscImportClick);
  }
  els.clearBtn.addEventListener("click", handleClear);
  els.downloadTemplateBtn.addEventListener("click", downloadTemplate);
  els.syncBtn.addEventListener("click", syncToApi);
  els.pullBtn.addEventListener("click", pullFromApi);
  if (els.saveReconNoteBtn) {
    els.saveReconNoteBtn.addEventListener("click", handleSaveReconNoteClick);
  }
  if (els.reconNoteInput) {
    els.reconNoteInput.addEventListener("input", handleReconNoteInput);
  }
  if (els.uploadInitialReconBtn) {
    els.uploadInitialReconBtn.addEventListener("click", handleUploadInitialReconClick);
  }
  if (els.clearInitialReconBtn) {
    els.clearInitialReconBtn.addEventListener("click", handleClearInitialReconClick);
  }
  els.apiUrlInput.addEventListener("change", persistApiUrl);
  els.searchInput.addEventListener("input", render);
  els.reviewFilter.addEventListener("change", render);
  els.dateFromInput.addEventListener("change", render);
  els.dateToInput.addEventListener("change", render);
}

function initControlsPanel() {
  const raw = localStorage.getItem(CONTROLS_OPEN_KEY);
  const isOpen = raw === null ? true : raw === "1";
  setControlsPanelOpen(isOpen);
}

function initSectionPanels() {
  const defaultOpenLabels = new Set(["monthly imports", "insights", "transactions"]);
  getSectionPanels().forEach((panel) => {
    setSectionPanelOpen(panel, defaultOpenLabels.has(panel.label));
  });
}

function getSectionPanels() {
  return [
    {
      toggleBtn: els.metricsToggleBtn,
      content: els.metricsContent,
      icon: els.metricsToggleIcon,
      label: "dashboard"
    },
    {
      toggleBtn: els.monthPanelToggleBtn,
      content: els.monthPanelContent,
      icon: els.monthPanelToggleIcon,
      label: "monthly imports"
    },
    {
      toggleBtn: els.insightsToggleBtn,
      content: els.insightsContent,
      icon: els.insightsToggleIcon,
      label: "insights"
    },
    {
      toggleBtn: els.notesToggleBtn,
      content: els.notesContent,
      icon: els.notesToggleIcon,
      label: "reconciliation notes"
    },
    {
      toggleBtn: els.transactionsToggleBtn,
      content: els.transactionsContent,
      icon: els.transactionsToggleIcon,
      label: "transactions"
    },
    {
      toggleBtn: els.recurringToggleBtn,
      content: els.recurringContent,
      icon: els.recurringToggleIcon,
      label: "recurring candidates"
    },
    {
      toggleBtn: els.initialReconToggleBtn,
      content: els.initialReconContent,
      icon: els.initialReconToggleIcon,
      label: "initial full reconciliation"
    }
  ];
}

function toggleSectionPanel(panel) {
  const isOpen = !panel.content.classList.contains("is-collapsed");
  setSectionPanelOpen(panel, !isOpen);
}

function setSectionPanelOpen(panel, isOpen) {
  if (!panel.toggleBtn || !panel.content) {
    return;
  }

  panel.content.classList.toggle("is-collapsed", !isOpen);
  panel.toggleBtn.classList.toggle("collapsed", !isOpen);
  panel.toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");

  if (panel.icon) {
    panel.icon.textContent = isOpen ? "▾" : "▸";
  }

  if (panel.label) {
    panel.toggleBtn.setAttribute("title", `${isOpen ? "Collapse" : "Expand"} ${panel.label}`);
  }
}

function toggleControlsPanel() {
  if (!els.controlsContent) {
    return;
  }
  const isOpen = !els.controlsContent.classList.contains("is-collapsed");
  setControlsPanelOpen(!isOpen);
}

function setControlsPanelOpen(isOpen) {
  if (!els.controlsContent || !els.controlsToggleBtn || !els.controlsToggleIcon) {
    return;
  }

  els.controlsContent.classList.toggle("is-collapsed", !isOpen);
  els.controlsToggleBtn.classList.toggle("collapsed", !isOpen);
  els.controlsToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  els.controlsToggleBtn.setAttribute("title", isOpen ? "Collapse statement import" : "Expand statement import");
  els.controlsToggleIcon.textContent = isOpen ? "▾" : "▸";
  localStorage.setItem(CONTROLS_OPEN_KEY, isOpen ? "1" : "0");
}

function handleImportClick() {
  const selectedImportMonth = normalizeMonthKey(els.importMonthInput.value);
  if (!selectedImportMonth) {
    alert("Pick a statement month before importing.");
    return;
  }

  importFromSelectedFile({
    importMonthKey: selectedImportMonth,
    idScopeKey: selectedImportMonth,
    selectImportedMonth: true
  });
}

function handleMiscImportClick() {
  importFromSelectedFile({
    importMonthKey: null,
    idScopeKey: "misc",
    selectImportedMonth: false
  });
}

function importFromSelectedFile({ importMonthKey = null, idScopeKey = null, selectImportedMonth = false } = {}) {
  const file = els.fileInput.files[0];
  if (!file) {
    alert("Pick a CSV file first.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = String(e.target.result || "");
    let nextSortOrdinal = getNextSortOrdinal();
    const imported = parseCSV(text)
      .map((row, index) => normalizeTransaction(row, importMonthKey, nextSortOrdinal++, index + 1, idScopeKey))
      .filter(Boolean);

    if (!imported.length) {
      alert("No valid rows found.");
      return;
    }

    upsertTransactions(imported);
    if (selectImportedMonth && importMonthKey) {
      state.selectedMonthKey = importMonthKey;
      persistSelectedMonth();
    }
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

function normalizeTransaction(row, importMonthKey = null, sortOrdinal = null, rowIndex = null, idScopeKey = null) {
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

  const normalizedMonthKey = normalizeMonthKey(importMonthKey || row.statement_month_key || row.statement_month || "");
  const importRowKey = Number.isFinite(Number(rowIndex)) ? Number(rowIndex) : null;
  const normalizedScopeKey = String(idScopeKey || "").trim();
  const suffixScope = normalizedMonthKey || normalizedScopeKey;

  return {
    id: buildTransactionId(txDate, description, amount, suffixScope && importRowKey ? `${suffixScope}:${importRowKey}` : ""),
    date: txDate,
    description: description.trim(),
    amount,
    category,
    partnerSplitPct: clamp(splitPct, 0, 100),
    statementMonthKey: normalizedMonthKey,
    sortOrdinal: Number.isFinite(Number(sortOrdinal)) ? Number(sortOrdinal) : null,
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

function buildTransactionId(date, description, amount, suffix = "") {
  const safeDescription = String(description || "").toLowerCase().trim();
  const safeAmount = Number(amount) || 0;
  const base = `${formatDate(date)}|${safeDescription}|${safeAmount.toFixed(2)}`;
  return suffix ? `${base}|${suffix}` : base;
}

function buildLegacyMatchKey(txDate, description, amount, statementMonthKey = null) {
  const date = parseDateToISO(txDate) || "";
  const normalizedDescription = String(description || "").toLowerCase().trim().replace(/\s+/g, " ");
  const amountCents = Math.round((Number(amount) || 0) * 100);
  const monthKey = normalizeMonthKey(statementMonthKey) || "";
  return `${date}|${normalizedDescription}|${amountCents}|${monthKey}`;
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

  const excelSerialMatch = raw.match(/^\d+(?:\.\d+)?$/);
  if (excelSerialMatch) {
    const excelDate = excelSerialToISO(Number(raw));
    if (excelDate) {
      return excelDate;
    }
  }

  const isoTimestamp = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoTimestamp) {
    return isoTimestamp[1];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymdSlash = raw.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})(?:\s.*)?$/);
  if (ymdSlash) {
    return toISODate(Number(ymdSlash[1]), Number(ymdSlash[2]), Number(ymdSlash[3]));
  }

  const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s.*)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = normalizeYear(dmy[3]);
    return toISODate(year, month, day); // Australian format: DD/MM/YYYY
  }
  return null;
}

function excelSerialToISO(serial) {
  if (!Number.isFinite(serial)) {
    return null;
  }
  const days = Math.floor(serial);
  if (days < 20000 || days > 60000) {
    return null;
  }

  const epoch = new Date(Date.UTC(1899, 11, 30));
  epoch.setUTCDate(epoch.getUTCDate() + days);
  const year = epoch.getUTCFullYear();
  const month = String(epoch.getUTCMonth() + 1).padStart(2, "0");
  const day = String(epoch.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const alias = CATEGORY_ALIASES[raw.toLowerCase()];
  if (alias) {
    return alias;
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

function normalizeStoredTransactions(items) {
  let nextSortOrdinal = 1;
  return items.map((tx) => {
    const normalized = { ...tx };
    const existingOrdinal = Number(normalized.sortOrdinal);
    if (Number.isFinite(existingOrdinal) && existingOrdinal > 0) {
      normalized.sortOrdinal = existingOrdinal;
      nextSortOrdinal = Math.max(nextSortOrdinal, existingOrdinal + 1);
    } else {
      normalized.sortOrdinal = nextSortOrdinal++;
    }
    return normalized;
  });
}

function getNextSortOrdinal() {
  return (
    state.transactions.reduce((max, tx) => {
      const current = Number(tx.sortOrdinal);
      return Number.isFinite(current) && current > max ? current : max;
    }, 0) + 1
  );
}

function upsertTransactions(items) {
  const map = new Map(state.transactions.map((t) => [t.id, t]));
  let nextSortOrdinal =
    Array.from(map.values()).reduce((max, tx) => {
      const current = Number(tx.sortOrdinal);
      return Number.isFinite(current) && current > max ? current : max;
    }, 0) + 1;

  items.forEach((item) => {
    const existing = map.get(item.id);
    const merged = {
      ...(existing || {}),
      ...item
    };
    if (existing && Number.isFinite(Number(existing.sortOrdinal)) && Number(existing.sortOrdinal) > 0) {
      merged.sortOrdinal = Number(existing.sortOrdinal);
    } else if (!Number.isFinite(Number(merged.sortOrdinal)) || Number(merged.sortOrdinal) <= 0) {
      merged.sortOrdinal = nextSortOrdinal++;
    }
    map.set(item.id, merged);
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

function loadStoredObject(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed;
  } catch (_e) {
    return fallback;
  }
}

function loadStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function persistReconciliationNotes() {
  localStorage.setItem(RECON_NOTES_KEY, JSON.stringify(state.reconciliationNotes || {}));
}

function persistInitialReconciliation() {
  localStorage.setItem(INITIAL_RECON_KEY, JSON.stringify(state.initialReconciliation || []));
  localStorage.setItem(INITIAL_RECON_META_KEY, JSON.stringify(state.initialReconciliationMeta || null));
}

function render() {
  renderMetrics();
  renderMonthPanel();
  renderInsights();
  renderReconciliationNotes();
  renderTransactions();
  renderRecurring();
  renderInitialReconciliation();
}

function getAnalysisTransactions() {
  const dateFrom = els.dateFromInput.value;
  const dateTo = els.dateToInput.value;
  const selectedMonthKey = state.selectedMonthKey;

  return state.transactions.filter((t) => {
    const txDate = parseDateToISO(t.date);
    const matchesDateFrom = !dateFrom || (txDate && txDate >= dateFrom);
    const matchesDateTo = !dateTo || (txDate && txDate <= dateTo);
    const matchesMonth = !selectedMonthKey || normalizeMonthKey(t.statementMonthKey) === selectedMonthKey;
    return matchesDateFrom && matchesDateTo && matchesMonth;
  });
}

function renderInsights() {
  const scopedTransactions = getAnalysisTransactions();
  renderCloseHub(scopedTransactions);
  renderPartnerSplitOverview(scopedTransactions);
  renderVendorConcentration(scopedTransactions);
}

function getReconNoteScopeKey() {
  return state.selectedMonthKey || "__all_months__";
}

function getReconNoteScopeLabel() {
  return state.selectedMonthKey ? formatMonthKeyLabel(state.selectedMonthKey) : "All Months";
}

function renderReconciliationNotes() {
  if (!els.reconNoteInput || !els.reconNoteScopeLabel || !els.reconNoteStatus) {
    return;
  }

  const scopeKey = getReconNoteScopeKey();
  const scopeLabel = getReconNoteScopeLabel();
  els.reconNoteScopeLabel.textContent = scopeLabel;

  if (state.activeNoteScopeKey !== scopeKey) {
    state.activeNoteScopeKey = scopeKey;
    els.reconNoteInput.value = String(state.reconciliationNotes[scopeKey] || "");
  }

  const noteValue = String(state.reconciliationNotes[scopeKey] || "");
  els.reconNoteStatus.textContent = noteValue ? "Saved for this scope" : "No note yet";
}

function handleReconNoteInput(event) {
  const scopeKey = getReconNoteScopeKey();
  const value = String(event.target.value || "");
  if (value.trim()) {
    state.reconciliationNotes[scopeKey] = value;
  } else {
    delete state.reconciliationNotes[scopeKey];
  }
  persistReconciliationNotes();
  if (els.reconNoteStatus) {
    els.reconNoteStatus.textContent = value.trim() ? "Saved for this scope" : "No note yet";
  }
}

function handleSaveReconNoteClick() {
  const scopeKey = getReconNoteScopeKey();
  const value = String(els.reconNoteInput?.value || "");
  if (value.trim()) {
    state.reconciliationNotes[scopeKey] = value;
  } else {
    delete state.reconciliationNotes[scopeKey];
  }
  persistReconciliationNotes();
  if (els.reconNoteStatus) {
    els.reconNoteStatus.textContent = value.trim() ? "Saved for this scope" : "No note yet";
  }
}

async function handleUploadInitialReconClick() {
  const file = els.initialReconFileInput?.files?.[0];
  if (!file) {
    alert("Choose your initial reconciliation file first.");
    return;
  }

  try {
    const rawRows = await readRowsFromFile(file);
    if (!rawRows.length) {
      alert("No rows found in that file.");
      return;
    }

    const normalizedRows = normalizeInitialReconRows(rawRows);

    if (!normalizedRows.length) {
      alert("Could not map any usable rows. Check headers like date/description/amount.");
      return;
    }

    state.initialReconciliation = normalizedRows;
    state.initialReconciliationMeta = {
      fileName: file.name,
      importedAt: new Date().toISOString(),
      rawRowCount: rawRows.length,
      normalizedRowCount: normalizedRows.length
    };
    persistInitialReconciliation();
    renderInitialReconciliation();
    alert(`Initial reconciliation loaded: ${normalizedRows.length} row(s).`);
  } catch (error) {
    alert(`Initial reconciliation upload failed: ${String(error.message || error)}`);
  }
}

function handleClearInitialReconClick() {
  if (!confirm("Clear initial full reconciliation dataset?")) {
    return;
  }
  state.initialReconciliation = [];
  state.initialReconciliationMeta = null;
  persistInitialReconciliation();
  renderInitialReconciliation();
}

async function readRowsFromFile(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return readRowsFromXlsx(file);
  }
  const text = await file.text();
  return parseCSV(text);
}

async function readRowsFromXlsx(file) {
  if (!window.XLSX) {
    throw new Error("XLSX parser is not available.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array" });
  if (!workbook.SheetNames.length) {
    return [];
  }

  const preferredSheetName =
    workbook.SheetNames.find((name) => /jesse/i.test(name)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[preferredSheetName];
  if (!sheet) {
    return [];
  }

  return window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
}

function normalizeInitialReconRows(rawRows) {
  const out = [];
  rawRows.forEach((row, index) => {
    if (Array.isArray(row)) {
      out.push(...normalizeInitialReconArrayRow(row, index));
      return;
    }
    const parsed = normalizeInitialReconMappedRow(row, index);
    if (parsed) {
      out.push(parsed);
    }
  });

  return dedupeInitialReconRows(out);
}

function dedupeInitialReconRows(rows) {
  const seen = new Set();
  const out = [];
  rows.forEach((row) => {
    const key = `${row.date || ""}|${String(row.description || "").toLowerCase().trim()}|${Number(row.amount || 0).toFixed(
      2
    )}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(row);
  });
  return out;
}

function normalizeInitialReconArrayRow(row, index) {
  const items = [];
  const cell = (idx) => String(row[idx] ?? "").trim();
  const categoryHint = cell(0);
  const cardHint = cell(4);

  const manualRow = buildInitialReconItem({
    dateValue: cell(0),
    descriptionValue: cell(1),
    amountValue: cell(2),
    debitValue: "",
    creditValue: "",
    categoryHint,
    splitHint: "",
    cardHint,
    rowKey: `manual-${index + 1}`
  });
  if (manualRow) {
    items.push(manualRow);
  }

  const bankBlock1 = buildInitialReconItem({
    dateValue: cell(17),
    descriptionValue: cell(18),
    amountValue: "",
    debitValue: cell(19),
    creditValue: cell(20),
    categoryHint,
    splitHint: "",
    cardHint,
    rowKey: `bank-a-${index + 1}`
  });
  if (bankBlock1) {
    items.push(bankBlock1);
  }

  const bankBlock2 = buildInitialReconItem({
    dateValue: cell(25),
    descriptionValue: cell(26),
    amountValue: "",
    debitValue: cell(27),
    creditValue: cell(28),
    categoryHint,
    splitHint: "",
    cardHint,
    rowKey: `bank-b-${index + 1}`
  });
  if (bankBlock2) {
    items.push(bankBlock2);
  }

  return items;
}

function normalizeInitialReconMappedRow(row, index) {
  const rowMap = toNormalizedRowMap(row);
  const dateRaw = pickRowValue(rowMap, ["date", "transactiondate", "txdate", "posted", "month", "period"]);
  const description = pickRowValue(rowMap, [
    "description",
    "merchant",
    "vendor",
    "details",
    "transaction",
    "name"
  ]);
  const categoryRaw = pickRowValue(rowMap, ["category", "label", "subcategory", "type"]);
  const splitRaw = pickRowValue(rowMap, [
    "partnersplitpct",
    "partnersplit",
    "splitpct",
    "split",
    "partnerpct",
    "partner"
  ]);
  return buildInitialReconItem({
    dateValue: dateRaw,
    descriptionValue: description || `Initial Recon Row ${index + 1}`,
    amountValue: pickRowValue(rowMap, ["amount", "total", "value", "net", "amountaud"]),
    debitValue: pickRowValue(rowMap, ["debit", "withdrawal", "expense", "dr", "debitamount"]),
    creditValue: pickRowValue(rowMap, ["credit", "deposit", "refund", "cr", "creditamount"]),
    categoryHint: categoryRaw,
    splitHint: splitRaw,
    cardHint: pickRowValue(rowMap, ["card", "source", "account"]),
    rowKey: `mapped-${index + 1}`
  });
}

function buildInitialReconItem({
  dateValue,
  descriptionValue,
  amountValue,
  debitValue,
  creditValue,
  categoryHint,
  splitHint,
  cardHint,
  rowKey
}) {
  let date = parseDateToISO(dateValue) || parseMonthToISODate(dateValue);
  const description = String(descriptionValue || "").trim();

  if ((!date || !isWithinInitialReconRange(date)) && description) {
    const inferredDate = inferInitialReconDateFromDescription(description);
    if (inferredDate) {
      date = inferredDate;
    }
  }

  const debit = parseAmount(debitValue);
  const credit = parseAmount(creditValue);
  const amount = parseAmount(amountValue);

  let normalizedAmount = null;
  if (debit !== null) {
    normalizedAmount = Math.abs(debit);
  } else if (credit !== null) {
    normalizedAmount = -Math.abs(credit);
  } else if (amount !== null) {
    normalizedAmount = amount;
  }

  if (!date || !description || normalizedAmount === null) {
    return null;
  }

  const parsedSplit = parsePercentValue(splitHint);
  const derivedCategory = inferInitialReconCategory(description, categoryHint, cardHint);
  const category = normalizeCategory(derivedCategory || "Uncategorized");
  const partnerSplitPct = Number.isFinite(parsedSplit) ? clamp(parsedSplit, 0, 100) : DEFAULT_SPLITS[category] || 50;

  return {
    id: `initial-recon-${rowKey}`,
    date,
    description,
    amount: normalizedAmount,
    category,
    partnerSplitPct
  };
}

function inferInitialReconDateFromDescription(description) {
  const raw = String(description || "").trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthToken = match[2].toLowerCase();
  const monthMap = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };
  const month = monthMap[monthToken];
  if (!month) {
    return null;
  }

  // Scope-specific year inference for the initial reconciliation window.
  const year = month >= 6 ? 2025 : 2026;
  return toISODate(year, month, day);
}

function inferInitialReconCategory(description, categoryHint = "", cardHint = "") {
  const hintCategory = normalizeCategory(String(categoryHint || "").trim());
  if (CATEGORY_OPTIONS.includes(hintCategory) && hintCategory !== "Uncategorized") {
    return hintCategory;
  }

  const text = `${description || ""} ${categoryHint || ""}`.toLowerCase();
  const matchedRule = CATEGORY_RULES.find((rule) => text.includes(rule.keyword));
  if (matchedRule) {
    return matchedRule.category;
  }

  const card = String(cardHint || "").toLowerCase();
  if (card.includes("personal")) {
    return "Misc Debit";
  }
  return "Uncategorized";
}

function toNormalizedRowMap(row) {
  const out = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeHeaderKey(key);
    out[normalizedKey] = value;
  });
  return out;
}

function normalizeHeaderKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function pickRowValue(rowMap, keys) {
  for (const key of keys) {
    const normalizedKey = normalizeHeaderKey(key);
    const value = rowMap[normalizedKey];
    if (String(value || "").trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function parsePercentValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return NaN;
  }
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(numeric) ? NaN : numeric;
}

function parseMonthToISODate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const monthMatch = raw.match(/^([A-Za-z]{3,9})[\s/-]*(\d{2,4})$/);
  if (!monthMatch) {
    return null;
  }
  const monthIndex = monthNameToIndex(monthMatch[1]);
  if (monthIndex < 0) {
    return null;
  }
  const year = monthMatch[2].length === 2 ? Number(`20${monthMatch[2]}`) : Number(monthMatch[2]);
  if (!Number.isInteger(year)) {
    return null;
  }
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function monthNameToIndex(value) {
  const normalized = String(value || "").toLowerCase();
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];

  return months.findIndex((month) => month.startsWith(normalized.slice(0, 3)));
}

function renderInitialReconciliation() {
  if (
    !els.initialReconLoadedRows ||
    !els.initialReconInRangeRows ||
    !els.initialReconExpenseTotal ||
    !els.initialReconCreditTotal ||
    !els.initialReconPartnerTotal ||
    !els.initialReconBusinessTotal ||
    !els.initialReconMessages
  ) {
    return;
  }

  const rows = Array.isArray(state.initialReconciliation) ? state.initialReconciliation : [];
  const inRangeRows = rows.filter((row) => isWithinInitialReconRange(row.date));

  let expenseTotal = 0;
  let creditTotal = 0;
  let partnerTotal = 0;
  let businessTotal = 0;

  inRangeRows.forEach((row) => {
    const amount = Number(row.amount) || 0;
    const splitRatio = clamp(Number(row.partnerSplitPct), 0, 100) / 100;
    if (amount > 0) {
      expenseTotal += amount;
    } else if (amount < 0) {
      creditTotal += Math.abs(amount);
    }
    partnerTotal += amount * splitRatio;
    businessTotal += amount * (1 - splitRatio);
  });

  els.initialReconLoadedRows.textContent = String(rows.length);
  els.initialReconInRangeRows.textContent = String(inRangeRows.length);
  els.initialReconExpenseTotal.textContent = formatCurrency(expenseTotal);
  els.initialReconCreditTotal.textContent = formatCurrency(creditTotal);
  els.initialReconPartnerTotal.textContent = formatCurrency(partnerTotal);
  els.initialReconBusinessTotal.textContent = formatCurrency(businessTotal);

  if (!rows.length) {
    els.initialReconMessages.innerHTML = "<li>No initial reconciliation file uploaded yet.</li>";
    return;
  }

  const meta = state.initialReconciliationMeta || {};
  const importedAt = meta.importedAt ? new Date(meta.importedAt).toLocaleString() : "Unknown";
  const fileName = meta.fileName || "Uploaded file";
  const undatedCount = rows.filter((row) => !parseDateToISO(row.date)).length;
  const outOfScopeCount = rows.filter((row) => {
    const iso = parseDateToISO(row.date);
    return iso && !isWithinInitialReconRange(iso);
  }).length;
  const categoryTotals = new Map();
  inRangeRows.forEach((row) => {
    const key = normalizeCategory(row.category || "Uncategorized");
    categoryTotals.set(key, (categoryTotals.get(key) || 0) + (Number(row.amount) || 0));
  });
  const topCategories = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 3);
  const topCategorySummary = topCategories.length
    ? topCategories
        .map((item) => `${item.category}: ${formatCurrency(item.amount)}`)
        .join(" | ")
    : "No category totals yet";

  els.initialReconMessages.innerHTML = `
    <li><strong>File:</strong> ${escapeHtml(fileName)}</li>
    <li><strong>Imported:</strong> ${escapeHtml(importedAt)}</li>
    <li><strong>Scope:</strong> ${formatDateAustralian(INITIAL_RECON_RANGE_START)} to ${formatDateAustralian(
      INITIAL_RECON_RANGE_END
    )}</li>
    <li><strong>Rows outside scope:</strong> ${outOfScopeCount}</li>
    <li><strong>Rows with unparsed date:</strong> ${undatedCount}</li>
    <li><strong>Top categories (net):</strong> ${escapeHtml(topCategorySummary)}</li>
  `;
}

function isWithinInitialReconRange(dateValue) {
  const iso = parseDateToISO(dateValue);
  if (!iso) {
    return false;
  }
  return iso >= INITIAL_RECON_RANGE_START && iso <= INITIAL_RECON_RANGE_END;
}

function renderCloseHub(transactions) {
  const total = transactions.length;
  const uncategorized = transactions.filter((t) => normalizeCategory(t.category) === "Uncategorized").length;
  const needsReview = transactions.filter((t) => t.status === "needs-review").length;
  const missingSplit = transactions.filter((t) => !Number.isFinite(Number(t.partnerSplitPct))).length;
  const issuePoints = uncategorized * 2 + needsReview * 2 + missingSplit;
  const maxPoints = Math.max(total * 5, 1);
  const score = total ? Math.max(0, Math.round(100 - (issuePoints / maxPoints) * 100)) : 100;

  let statusText = "Ready to close";
  if (!total) {
    statusText = "No transactions in scope";
  } else if (score < 75) {
    statusText = "Needs cleanup";
  } else if (score < 90) {
    statusText = "Almost ready";
  }

  els.insightScopeLabel.textContent = buildInsightScopeLabel();
  els.closeScore.textContent = `${score}%`;
  els.closeStatus.textContent = statusText;
  els.closeUncategorized.textContent = String(uncategorized);
  els.closeNeedsReview.textContent = String(needsReview);
  els.closeMissingSplit.textContent = String(missingSplit);
}

function buildInsightScopeLabel() {
  const monthLabel = state.selectedMonthKey ? formatMonthKeyLabel(state.selectedMonthKey) : "All Months";
  const dateFrom = els.dateFromInput.value;
  const dateTo = els.dateToInput.value;
  if (!dateFrom && !dateTo) {
    return monthLabel;
  }
  const fromLabel = dateFrom ? formatDateAustralian(dateFrom) : "start";
  const toLabel = dateTo ? formatDateAustralian(dateTo) : "end";
  return `${monthLabel} (${fromLabel} to ${toLabel})`;
}

function renderPartnerSplitOverview(transactions) {
  let expenseTotal = 0;
  let creditTotal = 0;
  let partnerExpenseAllocation = 0;
  let partnerNetAllocation = 0;
  let businessNetAllocation = 0;

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const splitRatio = clamp(Number(tx.partnerSplitPct), 0, 100) / 100;
    partnerNetAllocation += amount * splitRatio;
    businessNetAllocation += amount * (1 - splitRatio);

    if (amount > 0) {
      expenseTotal += amount;
      partnerExpenseAllocation += amount * splitRatio;
    } else if (amount < 0) {
      creditTotal += Math.abs(amount);
    }
  });

  const partnerRatio = expenseTotal ? Math.round((partnerExpenseAllocation / expenseTotal) * 100) : 0;

  els.partnerShareAmount.textContent = formatCurrency(partnerNetAllocation);
  els.businessShareAmount.textContent = formatCurrency(businessNetAllocation);
  els.partnerSplitRatio.textContent = `${partnerRatio}%`;
  els.partnerExpenseTotal.textContent = formatCurrency(expenseTotal);
  els.partnerCreditTotal.textContent = formatCurrency(creditTotal);
}

function renderVendorConcentration(transactions) {
  const expenseTransactions = transactions.filter((t) => (Number(t.amount) || 0) > 0);
  const totalExpense = expenseTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const categoryTotals = new Map();

  expenseTransactions.forEach((tx) => {
    const categoryKey = normalizeCategory(tx.category || "Uncategorized");
    categoryTotals.set(categoryKey, (categoryTotals.get(categoryKey) || 0) + Number(tx.amount || 0));
  });

  const topCategories = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topTotal = topCategories.reduce((sum, item) => sum + item.amount, 0);
  const concentrationPct = totalExpense ? Math.round((topTotal / totalExpense) * 100) : 0;

  els.vendorConcentrationPercent.textContent = `${concentrationPct}%`;
  els.vendorExpenseBaseTotal.textContent = formatCurrency(totalExpense);
  els.vendorTopTotal.textContent = formatCurrency(topTotal);

  if (!topCategories.length) {
    els.vendorTopList.innerHTML = "<li>No categorized spend in current scope.</li>";
    return;
  }

  els.vendorTopList.innerHTML = topCategories
    .map((item) => {
      const share = totalExpense ? (item.amount / totalExpense) * 100 : 0;
      return `
        <li>
          <div class="vendor-row">
            <div class="vendor-row-top">
              <span>${escapeHtml(item.category)}</span>
              <span>Total: ${formatCurrency(item.amount)} (${Math.round(share)}%)</span>
            </div>
            <div class="vendor-bar"><span style="width:${Math.max(2, Math.round(share))}%"></span></div>
          </div>
        </li>
      `;
    })
    .join("");
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
        <span class="month-delete-btn" data-month-delete="${summary.key}" role="button" aria-label="Remove ${escapeHtml(summary.label)} badge">×</span>
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
  const ok = confirm(
    `Remove ${label} as a month label for ${count} transaction(s)? Transactions will stay in All Months.`
  );
  if (!ok) {
    return;
  }

  state.transactions = state.transactions.map((tx) => {
    if (normalizeMonthKey(tx.statementMonthKey) !== monthKey) {
      return tx;
    }
    return { ...tx, statementMonthKey: null };
  });
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
    const normalizedCategory = normalizeCategory(t.category);
    const isWaiting = normalizedCategory === "Uncategorized";
    const statusClass = isWaiting ? "waiting" : t.status;
    const statusLabel = isWaiting ? "Waiting" : t.status === "clean" ? "Clean" : "Needs Review";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDateAustralian(t.date)}</td>
      <td class="description-cell">${escapeHtml(t.description)}</td>
      <td>${formatCurrency(t.amount)}</td>
      <td>
        ${renderCategorySelect(t)}
      </td>
      <td>
        <input type="number" min="0" max="100" value="${t.partnerSplitPct}" data-id="${t.id}" data-field="partnerSplitPct" />
      </td>
      <td><span class="status ${statusClass}">${statusLabel}</span></td>
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

  const toneClass = getCategoryToneClass(current);
  return `<select class="category-select ${toneClass}" data-id="${tx.id}" data-field="category">${optionMarkup}</select>`;
}

function getCategoryToneClass(category) {
  const normalized = normalizeCategory(category);
  if (normalized === "Uncategorized") {
    return "category-tone-waiting";
  }
  if (CREDIT_CATEGORIES.has(normalized)) {
    return "category-tone-credit";
  }
  const expenseCategories = CATEGORY_OPTIONS.filter((option) => !CREDIT_CATEGORIES.has(option));
  const knownIndex = expenseCategories.indexOf(normalized);
  const paletteIndex = knownIndex >= 0 ? knownIndex % 4 : hashString(normalized) % 4;
  return `category-tone-expense-${paletteIndex + 1}`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function compareTransactionOrder(a, b) {
  const dateA = parseDateToISO(a.date) || "";
  const dateB = parseDateToISO(b.date) || "";

  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }

  const ordinalA = Number(a.sortOrdinal);
  const ordinalB = Number(b.sortOrdinal);
  const hasOrdinalA = Number.isFinite(ordinalA) && ordinalA > 0;
  const hasOrdinalB = Number.isFinite(ordinalB) && ordinalB > 0;

  if (hasOrdinalA && hasOrdinalB && ordinalA !== ordinalB) {
    return ordinalA - ordinalB;
  }

  if (hasOrdinalA && !hasOrdinalB) {
    return -1;
  }

  if (!hasOrdinalA && hasOrdinalB) {
    return 1;
  }

  // Final tie-break for deterministic ordering.
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

function formatDateAustralian(value) {
  const iso = parseDateToISO(value);
  if (!iso) {
    return String(value || "");
  }
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
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
        client_tx_id: String(t.id),
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
    const existingIdByLegacyKey = new Map();
    state.transactions.forEach((tx) => {
      const key = buildLegacyMatchKey(tx.date, tx.description, tx.amount, tx.statementMonthKey);
      if (!existingIdByLegacyKey.has(key)) {
        existingIdByLegacyKey.set(key, tx.id);
      }
    });

    const imported = rows.map((row) => {
      const category = normalizeCategory(row.category || "Uncategorized");
      const statementMonthKey = normalizeMonthKey(row.statement_month_key);
      const fallbackId = buildTransactionId(row.tx_date, row.description, Number(row.amount_cents) / 100);
      const legacyKey = buildLegacyMatchKey(
        row.tx_date,
        row.description,
        Number(row.amount_cents) / 100,
        statementMonthKey
      );
      const existingId = existingIdByLegacyKey.get(legacyKey);
      return {
        id: String(row.client_tx_id || existingId || row.id || fallbackId),
        date: formatDate(row.tx_date),
        description: String(row.description || ""),
        amount: Number(row.amount_cents) / 100,
        category,
        partnerSplitPct: clamp(Number(row.partner_split_pct || 50), 0, 100),
        statementMonthKey,
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
