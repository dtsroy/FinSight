
alter table public.import_batches enable row level security;

create policy "import_batches_owner_select" on public.import_batches
  for select using (auth.uid() = user_id);
create policy "import_batches_owner_insert" on public.import_batches
  for insert with check (auth.uid() = user_id);
create policy "import_batches_owner_update" on public.import_batches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "import_batches_owner_delete" on public.import_batches
  for delete using (auth.uid() = user_id);

alter table public.user_profiles enable row level security;

create policy "user_profiles_owner_select" on public.user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_owner_insert" on public.user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_owner_update" on public.user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.shared_reports enable row level security;

create policy "shared_reports_owner_all" on public.shared_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
