
create policy "assets_owner_select" on public.assets
  for select using (auth.uid() = user_id);
create policy "assets_owner_insert" on public.assets
  for insert with check (auth.uid() = user_id);
create policy "assets_owner_update" on public.assets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assets_owner_delete" on public.assets
  for delete using (auth.uid() = user_id);
