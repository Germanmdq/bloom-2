-- Private uploads created by a short-lived QR session.
create table if not exists public.invoice_upload_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_captures (
  id uuid primary key default gen_random_uuid(),
  upload_token_id uuid references public.invoice_upload_tokens(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'rejected')),
  document_type text,
  extracted_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.invoice_upload_tokens enable row level security;
alter table public.invoice_captures enable row level security;

-- The private server API uses the service role; neither table is exposed to browser users.
insert into storage.buckets (id, name, public) values ('invoice-captures', 'invoice-captures', false)
on conflict (id) do update set public = false;
