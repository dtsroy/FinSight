
-- 1) 把 chat_messages 从 realtime publication 里撤掉（防跨用户 DELETE 广播；前端也没订阅）
alter publication supabase_realtime drop table public.chat_messages;

-- 2) shared_reports 收紧：只保留 SELECT own 的策略，其余写路径全部由 Edge Function 用 service role 走
drop policy if exists shared_reports_insert_own on public.shared_reports;
drop policy if exists shared_reports_update_own on public.shared_reports;
drop policy if exists shared_reports_delete_own on public.shared_reports;

-- 3) stress_test_runs 增加 run_id，用来把同一轮的四条绑成一组
alter table public.stress_test_runs add column if not exists run_id uuid;
create index if not exists stress_test_run_id_idx on public.stress_test_runs(user_id, run_id, created_at desc);

-- 4) chat_messages 增加单调 seq，用于确定性顺序
alter table public.chat_messages add column if not exists seq bigserial;
create index if not exists chat_messages_user_seq_idx on public.chat_messages(user_id, seq desc);

-- 5) 为 slug 表加匿名读速率限制辅助 —— 用简单的 rate-limit 表（read-shared-report 会写 last_hit_at 并统计 5 分钟内命中次数），
--    但为了避免额外表和复杂逻辑，改为 read 端把三个错误都统一为 404（无 oracle）；这里只做撤销/失效时清零 slug 的可扫描性。

-- 6) 修复以后允许分享报告用较长 slug（32 字符 base32），列宽已是 text 不需要 alter
