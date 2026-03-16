import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MAX_ATTACHMENT_DATA_URL_LENGTH = 7_000_000;

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "8mb" }));

const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

app.get("/health", async (_req, res) => {
  if (!pool) {
    return res.status(200).json({ ok: true, db: false, message: "No DATABASE_URL configured" });
  }

  try {
    await pool.query("select 1");
    return res.status(200).json({ ok: true, db: true });
  } catch (error) {
    return res.status(500).json({ ok: false, db: false, error: String(error.message || error) });
  }
});

app.get("/transactions", async (_req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  try {
    const { rows } = await pool.query(
      `select id, client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source, created_at, updated_at
       from transactions
       order by tx_date desc, updated_at desc, created_at desc
       limit 1000`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.get("/reconciliation-scopes", async (_req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  try {
    const { rows } = await pool.query(
      `select scope_key, note_giles, note_jesse, status, updated_at
       from reconciliation_scopes
       order by scope_key asc`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.get("/reconciliation-scopes/:scopeKey/history", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const scopeKey = normalizeScopeKey(req.params.scopeKey);
  if (!scopeKey) {
    return res.status(400).json({ error: "Valid scope key is required" });
  }

  const requestedLimit = Number(req.query.limit || 20);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 20;

  try {
    const { rows } = await pool.query(
      `select id, scope_key, note_giles, note_jesse, status, event_type, source, created_at
       from reconciliation_scope_versions
       where scope_key = $1
       order by id desc
       limit $2`,
      [scopeKey, limit]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.get("/reconciliation-attachments", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const scopeKey = normalizeScopeKey(req.query.scope_key || req.query.scopeKey);
  if (!scopeKey) {
    return res.status(400).json({ error: "scope_key is required" });
  }

  try {
    const { rows } = await pool.query(
      `select id, scope_key, side, kind, title, asset_url, mime_type, file_name, created_at
       from reconciliation_attachments
       where scope_key = $1
       order by created_at desc, id desc`,
      [scopeKey]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.post("/reconciliation-attachments", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const scopeKey = normalizeScopeKey(req.body?.scope_key || req.body?.scopeKey);
  const side = normalizeAttachmentSide(req.body?.side);
  const kind = normalizeAttachmentKind(req.body?.kind);

  if (!scopeKey) {
    return res.status(400).json({ error: "Valid scope_key is required" });
  }
  if (!side) {
    return res.status(400).json({ error: "side must be giles or jesse" });
  }
  if (!kind) {
    return res.status(400).json({ error: "kind must be image or link" });
  }

  let assetUrl = null;
  let mimeType = null;
  let fileName = null;
  let title = normalizeAttachmentTitle(req.body?.title);

  if (kind === "link") {
    assetUrl = normalizeExternalUrl(req.body?.url || req.body?.asset_url || req.body?.assetUrl);
    if (!assetUrl) {
      return res.status(400).json({ error: "Valid link URL is required" });
    }
    title = title || deriveAttachmentTitleFromUrl(assetUrl);
  } else {
    assetUrl = normalizeImageDataUrl(req.body?.data_url || req.body?.dataUrl || req.body?.asset_url || req.body?.assetUrl);
    if (!assetUrl) {
      return res.status(400).json({ error: "Valid image data URL is required" });
    }
    mimeType = normalizeAttachmentMimeType(req.body?.mime_type || req.body?.mimeType) || extractMimeTypeFromDataUrl(assetUrl);
    fileName = normalizeAttachmentFileName(req.body?.file_name || req.body?.fileName);
    title = title || fileName || "Screenshot";
  }

  try {
    const { rows } = await pool.query(
      `insert into reconciliation_attachments (scope_key, side, kind, title, asset_url, mime_type, file_name)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, scope_key, side, kind, title, asset_url, mime_type, file_name, created_at`,
      [scopeKey, side, kind, title, assetUrl, mimeType, fileName]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.delete("/reconciliation-attachments/:id", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const attachmentId = Number(req.params.id);
  if (!Number.isInteger(attachmentId) || attachmentId < 1) {
    return res.status(400).json({ error: "Valid attachment id is required" });
  }

  try {
    const result = await pool.query(`delete from reconciliation_attachments where id = $1`, [attachmentId]);
    if (!result.rowCount) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    return res.json({ deleted: attachmentId });
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.post("/transactions/bulk", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ error: "items[] is required" });
  }

  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  let staleSkipped = 0;
  const rows = [];

  try {
    await client.query("begin");

    for (const item of items) {
      const clientTxId = String(item.client_tx_id || "").trim() || null;
      const txDate = normalizeTxDate(item.tx_date || item.date);
      const description = String(item.description || "").trim();
      const amount = Number(item.amount_cents ?? Math.round(Number(item.amount || 0) * 100));
      const category = String(item.category || "Uncategorized");
      const partnerSplitPct = Number(item.partner_split_pct ?? 50);
      const statementMonthKey = normalizeMonthKey(item.statement_month_key);
      const source = String(item.source || "manual");
      const knownUpdatedAt = normalizeKnownUpdatedAt(item.known_updated_at ?? item.knownUpdatedAt);

      if (!txDate || !description || Number.isNaN(amount)) {
        continue;
      }

      const existingRes = await client.query(
        `select id, client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source, created_at, updated_at
         from transactions
         where tx_date = $1 and description = $2 and amount_cents = $3
         limit 1`,
        [txDate, description, amount]
      );
      const existing = existingRes.rows[0] || null;

      if (!existing) {
        const insertRes = await client.query(
          `insert into transactions (client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id, client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source, created_at, updated_at`,
          [clientTxId, txDate, description, amount, category, partnerSplitPct, statementMonthKey, source]
        );
        inserted += 1;
        rows.push({ ...insertRes.rows[0], sync_state: "inserted" });
        continue;
      }

      if (!knownUpdatedAt) {
        staleSkipped += 1;
        rows.push({ ...existing, sync_state: "stale" });
        continue;
      }

      const knownUpdatedTs = new Date(knownUpdatedAt).getTime();
      const currentUpdatedTs = existing.updated_at instanceof Date ? existing.updated_at.getTime() : new Date(existing.updated_at).getTime();
      if (!Number.isFinite(knownUpdatedTs) || !Number.isFinite(currentUpdatedTs) || knownUpdatedTs < currentUpdatedTs) {
        staleSkipped += 1;
        rows.push({ ...existing, sync_state: "stale" });
        continue;
      }

      const updateRes = await client.query(
        `update transactions
         set client_tx_id = coalesce(transactions.client_tx_id, $2),
             category = $3,
             partner_split_pct = $4,
             statement_month_key = $5,
             source = $6,
             updated_at = now()
         where id = $1
         returning id, client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source, created_at, updated_at`,
        [existing.id, clientTxId, category, partnerSplitPct, statementMonthKey, source]
      );
      updated += 1;
      rows.push({ ...updateRes.rows[0], sync_state: "updated" });
    }

    await client.query("commit");
    return res.status(201).json({ inserted, updated, stale_skipped: staleSkipped, rows });
  } catch (error) {
    await client.query("rollback");
    return res.status(500).json({ error: String(error.message || error) });
  } finally {
    client.release();
  }
});

app.post("/transactions/clear", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  try {
    const result = await pool.query(`delete from transactions`);
    return res.json({ deleted: Number(result.rowCount || 0) });
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
});

app.post("/reconciliation-scopes/bulk", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const source = normalizeSource(req.body?.source);
  if (!items.length) {
    return res.status(400).json({ error: "items[] is required" });
  }

  const client = await pool.connect();
  let upserted = 0;
  let deleted = 0;

  try {
    await client.query("begin");

    for (const item of items) {
      const scopeKey = normalizeScopeKey(item.scope_key || item.scopeKey);
      const noteGiles = normalizeOptionalText(item.note_giles ?? item.noteGiles);
      const noteJesse = normalizeOptionalText(item.note_jesse ?? item.noteJesse);
      const status = normalizeReconStatus(item.status);

      if (!scopeKey) {
        continue;
      }

      const existingRes = await client.query(
        `select note_giles, note_jesse, status from reconciliation_scopes where scope_key = $1`,
        [scopeKey]
      );
      const existing = existingRes.rows[0] || null;

      const shouldClear = !noteGiles && !noteJesse && status === "pending";
      if (shouldClear) {
        if (existing) {
          await insertScopeVersion(client, {
            scopeKey,
            noteGiles: null,
            noteJesse: null,
            status: "pending",
            eventType: "delete",
            source
          });
          const result = await client.query(`delete from reconciliation_scopes where scope_key = $1`, [scopeKey]);
          deleted += Number(result.rowCount || 0);
        }
        continue;
      }

      const normalizedExistingGiles = normalizeOptionalText(existing?.note_giles);
      const normalizedExistingJesse = normalizeOptionalText(existing?.note_jesse);
      const normalizedExistingStatus = normalizeReconStatus(existing?.status);
      const changed =
        !existing ||
        normalizedExistingGiles !== noteGiles ||
        normalizedExistingJesse !== noteJesse ||
        normalizedExistingStatus !== status;

      if (!changed) {
        continue;
      }

      await client.query(
        `insert into reconciliation_scopes (scope_key, note_giles, note_jesse, status)
         values ($1, $2, $3, $4)
         on conflict (scope_key) do update
           set note_giles = excluded.note_giles,
               note_jesse = excluded.note_jesse,
               status = excluded.status,
               updated_at = now()`,
        [scopeKey, noteGiles, noteJesse, status]
      );
      upserted += 1;
      await insertScopeVersion(client, {
        scopeKey,
        noteGiles,
        noteJesse,
        status,
        eventType: existing ? "update" : "create",
        source
      });
    }

    await client.query("commit");
    return res.status(201).json({ upserted, deleted });
  } catch (error) {
    await client.query("rollback");
    return res.status(500).json({ error: String(error.message || error) });
  } finally {
    client.release();
  }
});

app.post("/reconciliation-scopes/:scopeKey/restore", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "DATABASE_URL is required" });
  }

  const scopeKey = normalizeScopeKey(req.params.scopeKey);
  const versionId = Number(req.body?.version_id);
  const source = normalizeSource(req.body?.source || "ui-restore");

  if (!scopeKey) {
    return res.status(400).json({ error: "Valid scope key is required" });
  }
  if (!Number.isInteger(versionId) || versionId < 1) {
    return res.status(400).json({ error: "version_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const versionRes = await client.query(
      `select id, scope_key, note_giles, note_jesse, status
       from reconciliation_scope_versions
       where id = $1 and scope_key = $2`,
      [versionId, scopeKey]
    );
    const version = versionRes.rows[0];
    if (!version) {
      await client.query("rollback");
      return res.status(404).json({ error: "Version not found for this scope" });
    }

    const noteGiles = normalizeOptionalText(version.note_giles);
    const noteJesse = normalizeOptionalText(version.note_jesse);
    const status = normalizeReconStatus(version.status);
    const shouldClear = !noteGiles && !noteJesse && status === "pending";

    if (shouldClear) {
      await insertScopeVersion(client, {
        scopeKey,
        noteGiles: null,
        noteJesse: null,
        status: "pending",
        eventType: "restore",
        source
      });
      await client.query(`delete from reconciliation_scopes where scope_key = $1`, [scopeKey]);
      await client.query("commit");
      return res.json({
        scope_key: scopeKey,
        note_giles: null,
        note_jesse: null,
        status: "pending",
        updated_at: new Date().toISOString(),
        cleared: true
      });
    }

    const upsertRes = await client.query(
      `insert into reconciliation_scopes (scope_key, note_giles, note_jesse, status)
       values ($1, $2, $3, $4)
       on conflict (scope_key) do update
         set note_giles = excluded.note_giles,
             note_jesse = excluded.note_jesse,
             status = excluded.status,
             updated_at = now()
       returning scope_key, note_giles, note_jesse, status, updated_at`,
      [scopeKey, noteGiles, noteJesse, status]
    );

    await insertScopeVersion(client, {
      scopeKey,
      noteGiles,
      noteJesse,
      status,
      eventType: "restore",
      source
    });

    await client.query("commit");
    return res.json(upsertRes.rows[0]);
  } catch (error) {
    await client.query("rollback");
    return res.status(500).json({ error: String(error.message || error) });
  } finally {
    client.release();
  }
});

function normalizeTxDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
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
    return toIsoDate(Number(ymdSlash[1]), Number(ymdSlash[2]), Number(ymdSlash[3]));
  }

  const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s.*)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = dmy[3].length === 2 ? Number(`20${dmy[3]}`) : Number(dmy[3]);
    return toIsoDate(year, month, day); // Australian format: DD/MM/YYYY
  }
  return null;
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

function toIsoDate(year, month, day) {
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

  return `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeScopeKey(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  if (raw === "__all_months__") {
    return raw;
  }
  const monthKey = normalizeMonthKey(raw);
  if (monthKey) {
    return monthKey;
  }
  return raw.slice(0, 128);
}

function normalizeOptionalText(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 4000) : null;
}

function normalizeReconStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending" || normalized === "waiting-giles" || normalized === "waiting-jesse" || normalized === "reconciled") {
    return normalized;
  }
  return "pending";
}

function normalizeSource(value) {
  const raw = String(value || "").trim();
  return raw ? raw.slice(0, 80) : "ui-sync";
}

function normalizeAttachmentSide(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "giles" || raw === "jesse") {
    return raw;
  }
  return null;
}

function normalizeAttachmentKind(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "image" || raw === "link") {
    return raw;
  }
  return null;
}

function normalizeAttachmentTitle(value) {
  const raw = String(value || "").trim();
  return raw ? raw.slice(0, 255) : null;
}

function normalizeAttachmentFileName(value) {
  const raw = String(value || "").trim();
  return raw ? raw.slice(0, 255) : null;
}

function normalizeAttachmentMimeType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("image/")) {
    return null;
  }
  return raw.slice(0, 100);
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString().slice(0, 4000);
  } catch (_error) {
    return null;
  }
}

function normalizeImageDataUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX_ATTACHMENT_DATA_URL_LENGTH) {
    return null;
  }
  if (!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(raw)) {
    return null;
  }
  return raw.replace(/\s+/g, "");
}

function extractMimeTypeFromDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

function deriveAttachmentTitleFromUrl(value) {
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return normalizeAttachmentTitle(lastSegment || parsed.hostname || "Link");
  } catch (_error) {
    return "Link";
  }
}

function normalizeKnownUpdatedAt(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

async function insertScopeVersion(client, { scopeKey, noteGiles, noteJesse, status, eventType, source }) {
  await client.query(
    `insert into reconciliation_scope_versions (scope_key, note_giles, note_jesse, status, event_type, source)
     values ($1, $2, $3, $4, $5, $6)`,
    [scopeKey, noteGiles, noteJesse, status, eventType, source]
  );
}

async function ensureSchema() {
  if (!pool) {
    return;
  }

  await pool.query(
    `create table if not exists transactions (
      id bigserial primary key,
      client_tx_id text,
      tx_date date not null,
      description text not null,
      amount_cents integer not null,
      category text not null default 'Uncategorized',
      partner_split_pct numeric(5,2) not null default 50,
      statement_month_key text,
      source text not null default 'manual',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (tx_date, description, amount_cents)
    )`
  );
  await pool.query(`alter table transactions add column if not exists statement_month_key text`);
  await pool.query(`alter table transactions add column if not exists client_tx_id text`);
  await pool.query(`alter table transactions add column if not exists updated_at timestamptz not null default now()`);
  await pool.query(`create index if not exists idx_transactions_tx_date on transactions (tx_date desc)`);
  await pool.query(`create index if not exists idx_transactions_category on transactions (category)`);
  await pool.query(`create index if not exists idx_transactions_statement_month_key on transactions (statement_month_key)`);
  await pool.query(`create unique index if not exists idx_transactions_client_tx_id_unique on transactions (client_tx_id) where client_tx_id is not null`);
  await pool.query(`create index if not exists idx_transactions_updated_at on transactions (updated_at desc)`);

  await pool.query(
    `create table if not exists reconciliation_scopes (
      scope_key text primary key,
      note_giles text,
      note_jesse text,
      status text not null default 'pending',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint reconciliation_scopes_status_check check (status in ('pending', 'waiting-giles', 'waiting-jesse', 'reconciled'))
    )`
  );
  await pool.query(`create index if not exists idx_reconciliation_scopes_updated_at on reconciliation_scopes (updated_at desc)`);
  await pool.query(
    `create table if not exists reconciliation_scope_versions (
      id bigserial primary key,
      scope_key text not null,
      note_giles text,
      note_jesse text,
      status text not null default 'pending',
      event_type text not null default 'update',
      source text not null default 'ui-sync',
      created_at timestamptz not null default now(),
      constraint reconciliation_scope_versions_status_check check (status in ('pending', 'waiting-giles', 'waiting-jesse', 'reconciled')),
      constraint reconciliation_scope_versions_event_type_check check (event_type in ('create', 'update', 'delete', 'restore'))
    )`
  );
  await pool.query(`create index if not exists idx_reconciliation_scope_versions_scope_id on reconciliation_scope_versions (scope_key, id desc)`);
  await pool.query(
    `create table if not exists reconciliation_attachments (
      id bigserial primary key,
      scope_key text not null,
      side text not null,
      kind text not null,
      title text,
      asset_url text not null,
      mime_type text,
      file_name text,
      created_at timestamptz not null default now(),
      constraint reconciliation_attachments_side_check check (side in ('giles', 'jesse')),
      constraint reconciliation_attachments_kind_check check (kind in ('image', 'link'))
    )`
  );
  await pool.query(`create index if not exists idx_reconciliation_attachments_scope_created on reconciliation_attachments (scope_key, created_at desc, id desc)`);
  await pool.query(`create index if not exists idx_reconciliation_attachments_scope_side on reconciliation_attachments (scope_key, side)`);
}

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      // Intentional minimal log for Render startup visibility.
      console.log(`finance-api listening on ${PORT}`);
    });
  } catch (error) {
    console.error("failed to start finance-api", error);
    process.exit(1);
  }
}

start();
