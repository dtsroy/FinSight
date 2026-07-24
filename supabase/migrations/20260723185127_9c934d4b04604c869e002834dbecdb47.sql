
-- 每日汇率缓存：以人民币等值为准（rate_to_cny 表示 1 单位该币种 = 多少人民币）
create table if not exists public.fx_rates (
  target_code text primary key,
  rate_to_cny numeric(18, 8) not null,
  source text not null default 'seed',
  updated_at timestamptz not null default now(),
  constraint fx_rates_supported check (target_code in ('CNY','USD','HKD','EUR','GBP','JPY','SGD','KRW','TWD','AUD','CAD'))
);

alter table public.fx_rates enable row level security;

create policy "fx_rates_public_read" on public.fx_rates for select using (true);

-- 初始种子：与前端硬编码的 CURRENCY_META.baseRate 一致，首个 get-fx-rates 调用前也能兜底
insert into public.fx_rates (target_code, rate_to_cny, source) values
  ('CNY', 1,       'seed'),
  ('USD', 7.10,    'seed'),
  ('HKD', 0.91,    'seed'),
  ('EUR', 7.68,    'seed'),
  ('GBP', 8.90,    'seed'),
  ('JPY', 0.048,   'seed'),
  ('SGD', 5.20,    'seed'),
  ('KRW', 0.0051,  'seed'),
  ('TWD', 0.22,    'seed'),
  ('AUD', 4.75,    'seed'),
  ('CAD', 5.25,    'seed')
on conflict (target_code) do nothing;
