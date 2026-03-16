# Private Business Finance API

Minimal Express API for Render + Supabase.

## Endpoints
- `GET /health`
- `GET /transactions`
- `POST /transactions/bulk` (returns `inserted`, `updated`, `stale_skipped`)
- `POST /transactions/clear`
- `GET /reconciliation-scopes`
- `POST /reconciliation-scopes/bulk`
- `GET /reconciliation-scopes/:scopeKey/history`
- `POST /reconciliation-scopes/:scopeKey/restore`

## Local run
```bash
cd api
npm install
cp .env.example .env
npm run dev
```

## Supabase setup
Run `/supabase/schema.sql` in Supabase SQL editor.

## Render setup
Use the root `/render.yaml` Blueprint or create a Node Web Service from `api/`.
