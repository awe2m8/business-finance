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
      `select id, tx_date, description, amount_cents, category, partner_split_pct, source, created_at
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
      const txDate = normalizeTxDate(item.tx_date || item.date);
      const description = String(item.description || "").trim();
      const amount = Number(item.amount_cents ?? Math.round(Number(item.amount || 0) * 100));
      const category = String(item.category || "Uncategorized");
      const partnerSplitPct = Number(item.partner_split_pct ?? 50);
      const source = String(item.source || "manual");

      if (!txDate || !description || Number.isNaN(amount)) {
        continue;
      }

      await client.query(
        `insert into transactions (tx_date, description, amount_cents, category, partner_split_pct, source)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (tx_date, description, amount_cents) do update
           set category = excluded.category,
               partner_split_pct = excluded.partner_split_pct,
               source = excluded.source`,
        [txDate, description, amount, category, partnerSplitPct, source]
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dmyOrMdy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (dmyOrMdy) {
    const part1 = Number(dmyOrMdy[1]);
    const part2 = Number(dmyOrMdy[2]);
    const year = dmyOrMdy[3].length === 2 ? Number(`20${dmyOrMdy[3]}`) : Number(dmyOrMdy[3]);

    if (part1 > 12) {
      return toIsoDate(year, part2, part1); // DD/MM/YYYY
    }

    if (part2 > 12) {
      return toIsoDate(year, part1, part2); // MM/DD/YYYY
    }

    return toIsoDate(year, part2, part1); // default ambiguous dates to DD/MM/YYYY
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

app.listen(PORT, () => {
  // Intentional minimal log for Render startup visibility.
  console.log(`finance-api listening on ${PORT}`);
});
