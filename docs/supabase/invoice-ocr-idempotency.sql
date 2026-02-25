-- Invoice OCR persistence: idempotency uniqueness constraint
-- Safe to run multiple times.

create table if not exists public.invoice_ocr_idempotency (
  workflow_id text not null,
  idempotency_key text not null,
  fingerprint text not null,
  trace_id text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (workflow_id, idempotency_key)
);

create index if not exists idx_invoice_ocr_idempotency_updated_at
  on public.invoice_ocr_idempotency (updated_at desc);

create or replace function public.invoice_ocr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_invoice_ocr_idempotency_updated_at
  on public.invoice_ocr_idempotency;

create trigger trg_invoice_ocr_idempotency_updated_at
before update on public.invoice_ocr_idempotency
for each row execute function public.invoice_ocr_set_updated_at();
