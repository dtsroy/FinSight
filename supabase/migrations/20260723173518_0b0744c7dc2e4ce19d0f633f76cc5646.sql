
alter table public.assets add column if not exists currency text not null default 'CNY';

create index if not exists assets_user_platform_idx on public.assets(user_id, platform, created_at desc);
