
-- 资产分类枚举
create type public.asset_category as enum (
  'bank_deposit',
  'stock',
  'fund',
  'bond',
  'insurance',
  'cash_management',
  'other'
);

-- 资产账本
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.asset_category not null,
  platform text not null,
  amount numeric(14,2) not null check (amount >= 0),
  code text,
  purchase_date date,
  note text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'ocr', 'demo')),
  batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_user_created_idx on public.assets (user_id, created_at desc);
create index assets_user_category_idx on public.assets (user_id, category);
create index assets_batch_idx on public.assets (batch_id) where batch_id is not null;

alter table public.assets enable row level security;

create policy assets_select_own on public.assets for select
  using (auth.uid() = user_id);

create policy assets_insert_own on public.assets for insert
  with check (auth.uid() = user_id);

create policy assets_update_own on public.assets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy assets_delete_own on public.assets for delete
  using (auth.uid() = user_id);

-- 导入批次（CSV / OCR 原始文件与解析中间态）
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('csv', 'ocr', 'demo')),
  file_key text,
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'imported', 'partial', 'failed')),
  parsed_rows jsonb not null default '[]'::jsonb,
  imported_count integer not null default 0,
  failed_count integer not null default 0,
  note text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index import_batches_user_created_idx on public.import_batches (user_id, created_at desc);

alter table public.import_batches enable row level security;

create policy import_batches_select_own on public.import_batches for select
  using (auth.uid() = user_id);

create policy import_batches_insert_own on public.import_batches for insert
  with check (auth.uid() = user_id);

create policy import_batches_update_own on public.import_batches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy import_batches_delete_own on public.import_batches for delete
  using (auth.uid() = user_id);

-- updated_at 自动维护
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create trigger trg_import_batches_updated_at before update on public.import_batches
  for each row execute function public.set_updated_at();
