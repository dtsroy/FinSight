
alter table public.chat_messages enable row level security;

create policy "chat_messages_owner_select" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "chat_messages_owner_insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy "chat_messages_owner_delete" on public.chat_messages
  for delete using (auth.uid() = user_id);

alter table public.xray_reports enable row level security;

create policy "xray_reports_owner_select" on public.xray_reports
  for select using (auth.uid() = user_id);
create policy "xray_reports_owner_insert" on public.xray_reports
  for insert with check (auth.uid() = user_id);

alter table public.stress_test_runs enable row level security;

create policy "stress_test_runs_owner_select" on public.stress_test_runs
  for select using (auth.uid() = user_id);
create policy "stress_test_runs_owner_insert" on public.stress_test_runs
  for insert with check (auth.uid() = user_id);
