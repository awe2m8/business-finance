# Private Business Finance API

Minimal Express API for Render + Supabase.

## Endpoints
- `GET /health`
- `GET /transactions`
- `POST /transactions/bulk`
- `GET /reconciliation-scopes`
- `POST /reconciliation-scopes/bulk`

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
