create table if not exists transactions (
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
);

alter table transactions add column if not exists statement_month_key text;
alter table transactions add column if not exists client_tx_id text;
alter table transactions add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_transactions_tx_date on transactions (tx_date desc);
create index if not exists idx_transactions_category on transactions (category);
create index if not exists idx_transactions_statement_month_key on transactions (statement_month_key);
create unique index if not exists idx_transactions_client_tx_id_unique on transactions (client_tx_id) where client_tx_id is not null;
create index if not exists idx_transactions_updated_at on transactions (updated_at desc);

create table if not exists reconciliation_scopes (
  scope_key text primary key,
  note_giles text,
  note_jesse text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reconciliation_scopes_status_check check (status in ('pending', 'waiting-giles', 'waiting-jesse', 'reconciled'))
);

create index if not exists idx_reconciliation_scopes_updated_at on reconciliation_scopes (updated_at desc);

create table if not exists reconciliation_scope_versions (
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
);

create index if not exists idx_reconciliation_scope_versions_scope_id on reconciliation_scope_versions (scope_key, id desc);
