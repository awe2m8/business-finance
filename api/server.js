import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "2mb" }));

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
      `select id, client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source, created_at
       from transactions
       order by tx_date desc, created_at desc
       limit 1000`
    );
    return res.json(rows);
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

      if (!txDate || !description || Number.isNaN(amount)) {
        continue;
      }

      await client.query(
        `insert into transactions (client_tx_id, tx_date, description, amount_cents, category, partner_split_pct, statement_month_key, source)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (tx_date, description, amount_cents) do update
           set client_tx_id = coalesce(transactions.client_tx_id, excluded.client_tx_id),
               category = excluded.category,
               partner_split_pct = excluded.partner_split_pct,
               statement_month_key = excluded.statement_month_key,
               source = excluded.source`,
        [clientTxId, txDate, description, amount, category, partnerSplitPct, statementMonthKey, source]
      );

      inserted += 1;
    }

    await client.query("commit");
    return res.status(201).json({ inserted });
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

async function ensureSchema() {
  if (!pool) {
    return;
  }

  await pool.query(`alter table transactions add column if not exists statement_month_key text`);
  await pool.query(`alter table transactions add column if not exists client_tx_id text`);
  await pool.query(`create index if not exists idx_transactions_statement_month_key on transactions (statement_month_key)`);
  await pool.query(`create unique index if not exists idx_transactions_client_tx_id_unique on transactions (client_tx_id) where client_tx_id is not null`);
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
