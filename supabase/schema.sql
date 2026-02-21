create table if not exists transactions (
  id bigserial primary key,
  tx_date date not null,
  description text not null,
  amount_cents integer not null,
  category text not null default 'Uncategorized',
  partner_split_pct numeric(5,2) not null default 50,
  statement_month_key text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (tx_date, description, amount_cents)
);

alter table transactions add column if not exists statement_month_key text;

create index if not exists idx_transactions_tx_date on transactions (tx_date desc);
create index if not exists idx_transactions_category on transactions (category);
create index if not exists idx_transactions_statement_month_key on transactions (statement_month_key);
