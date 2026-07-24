
-- 清理与既存 *_own 策略等价的重复策略，避免每次 RLS 判断做重复评估
drop policy if exists "assets_owner_select" on public.assets;
drop policy if exists "assets_owner_insert" on public.assets;
drop policy if exists "assets_owner_update" on public.assets;
drop policy if exists "assets_owner_delete" on public.assets;

drop policy if exists "chat_messages_owner_select" on public.chat_messages;
drop policy if exists "chat_messages_owner_insert" on public.chat_messages;
drop policy if exists "chat_messages_owner_delete" on public.chat_messages;

drop policy if exists "xray_reports_owner_select" on public.xray_reports;
drop policy if exists "xray_reports_owner_insert" on public.xray_reports;

drop policy if exists "stress_test_runs_owner_select" on public.stress_test_runs;
drop policy if exists "stress_test_runs_owner_insert" on public.stress_test_runs;

drop policy if exists "import_batches_owner_select" on public.import_batches;
drop policy if exists "import_batches_owner_insert" on public.import_batches;
drop policy if exists "import_batches_owner_update" on public.import_batches;
drop policy if exists "import_batches_owner_delete" on public.import_batches;

drop policy if exists "user_profiles_owner_select" on public.user_profiles;
drop policy if exists "user_profiles_owner_insert" on public.user_profiles;
drop policy if exists "user_profiles_owner_update" on public.user_profiles;

drop policy if exists "shared_reports_owner_all" on public.shared_reports;
