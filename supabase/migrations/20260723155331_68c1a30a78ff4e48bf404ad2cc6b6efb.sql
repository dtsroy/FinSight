
-- 用户配置：月度硬性支出，用于压力测试的失业场景
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_expense numeric(14,2) not null default 15000 check (monthly_expense >= 0),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
create policy user_profiles_select_own on public.user_profiles for select using (auth.uid() = user_id);
create policy user_profiles_upsert_own on public.user_profiles for insert with check (auth.uid() = user_id);
create policy user_profiles_update_own on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();

-- 基金底层持仓预置数据（面向所有已登录用户只读）
create table public.fund_master (
  fund_code text primary key,
  fund_name text not null,
  fund_type text not null,
  updated_at timestamptz not null default now()
);
create table public.fund_holdings (
  fund_code text references public.fund_master(fund_code) on delete cascade,
  stock_code text not null,
  stock_name text not null,
  industry text not null,
  weight numeric(6,3) not null check (weight >= 0 and weight <= 100),
  primary key (fund_code, stock_code)
);
create index fund_holdings_stock_idx on public.fund_holdings(stock_code);
create table public.stock_industry (
  stock_code text primary key,
  stock_name text not null,
  industry text not null
);
alter table public.fund_master enable row level security;
alter table public.fund_holdings enable row level security;
alter table public.stock_industry enable row level security;
create policy fund_master_public_read on public.fund_master for select to authenticated using (true);
create policy fund_holdings_public_read on public.fund_holdings for select to authenticated using (true);
create policy stock_industry_public_read on public.stock_industry for select to authenticated using (true);

-- X 光穿透快照
create table public.xray_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_amount numeric(14,2) not null,
  fund_amount numeric(14,2) not null,
  stock_amount numeric(14,2) not null,
  cash_amount numeric(14,2) not null,
  concentration_score numeric(5,2) not null,
  top_industry text,
  top_industry_pct numeric(6,3),
  industry_exposure jsonb not null default '[]'::jsonb,
  top_stocks jsonb not null default '[]'::jsonb,
  duplicate_holdings jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  unmatched_funds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index xray_reports_user_created_idx on public.xray_reports(user_id, created_at desc);
alter table public.xray_reports enable row level security;
create policy xray_reports_select_own on public.xray_reports for select using (auth.uid() = user_id);
create policy xray_reports_insert_own on public.xray_reports for insert with check (auth.uid() = user_id);
create policy xray_reports_delete_own on public.xray_reports for delete using (auth.uid() = user_id);

-- 压力测试结果
create table public.stress_test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null,
  scenario_label text not null,
  estimated_loss numeric(14,2) not null,
  loss_pct numeric(6,3) not null,
  recovery_days integer,
  emergency_months numeric(6,2),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index stress_test_user_created_idx on public.stress_test_runs(user_id, created_at desc);
alter table public.stress_test_runs enable row level security;
create policy stress_test_runs_select_own on public.stress_test_runs for select using (auth.uid() = user_id);
create policy stress_test_runs_insert_own on public.stress_test_runs for insert with check (auth.uid() = user_id);
create policy stress_test_runs_delete_own on public.stress_test_runs for delete using (auth.uid() = user_id);

-- AI 对话消息
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tone text check (tone in ('friendly','sharp')),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_user_created_idx on public.chat_messages(user_id, created_at desc);
alter table public.chat_messages enable row level security;
create policy chat_messages_select_own on public.chat_messages for select using (auth.uid() = user_id);
create policy chat_messages_insert_own on public.chat_messages for insert with check (auth.uid() = user_id);
create policy chat_messages_delete_own on public.chat_messages for delete using (auth.uid() = user_id);

-- 分享报告
create table public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  snapshot jsonb not null,
  slug text unique not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index shared_reports_user_created_idx on public.shared_reports(user_id, created_at desc);
create index shared_reports_slug_active_idx on public.shared_reports(slug) where revoked_at is null;
alter table public.shared_reports enable row level security;
create policy shared_reports_select_own on public.shared_reports for select using (auth.uid() = user_id);
create policy shared_reports_insert_own on public.shared_reports for insert with check (auth.uid() = user_id);
create policy shared_reports_update_own on public.shared_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shared_reports_delete_own on public.shared_reports for delete using (auth.uid() = user_id);

-- Realtime 广播资产表
alter publication supabase_realtime add table public.assets;
alter publication supabase_realtime add table public.chat_messages;
