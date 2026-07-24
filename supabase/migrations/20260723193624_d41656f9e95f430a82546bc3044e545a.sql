
-- 把 amount 列精度扩到 numeric(20,8)：原来 (14,2) 只能存到 0.01，
-- 导致 batch_change_currency RPC 换币后 UPDATE 被截断到 2 位小数，
-- 回算 CNY 总额会掉几分钱。扩到 8 位小数后 RPC 内部的完整精度可无损落库。
-- 已有数据都是 ≤2 位小数，扩大精度不会丢失任何原值。
alter table public.assets alter column amount type numeric(20, 8);
