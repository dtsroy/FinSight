
-- 让 assets.batch_id 建立外键约束，批次删除时置空
alter table public.assets
  add constraint assets_batch_id_fkey
  foreign key (batch_id) references public.import_batches(id) on delete set null;

-- 每位用户最多一条 demo 批次，避免并发或重复点击造成重复入账
create unique index import_batches_one_demo_per_user
  on public.import_batches(user_id)
  where source = 'demo';

-- 分页排序需要稳定次序，追加 id 列
create index assets_user_created_id_idx on public.assets (user_id, created_at desc, id desc);
drop index if exists public.assets_user_created_idx;

-- 原子提交导入批次：批次记录 + 资产写入 + 状态更新在同一事务里完成
create or replace function public.commit_import_batch(
  p_source text,
  p_rows jsonb,
  p_failed_count int default 0,
  p_file_url text default null,
  p_file_key text default null,
  p_note text default null
) returns public.import_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.import_batches;
  v_imported_count int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_source not in ('csv', 'ocr') then
    raise exception 'invalid_source';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows';
  end if;

  insert into public.import_batches
    (user_id, source, file_url, file_key, status, parsed_rows, failed_count, note)
  values
    (v_user_id, p_source, p_file_url, p_file_key, 'pending', p_rows, greatest(p_failed_count, 0), p_note)
  returning * into v_batch;

  insert into public.assets
    (user_id, name, category, platform, amount, code, note, source, batch_id)
  select
    v_user_id,
    trim(r->>'name'),
    (r->>'category')::public.asset_category,
    trim(r->>'platform'),
    (r->>'amount')::numeric,
    nullif(trim(coalesce(r->>'code','')), ''),
    nullif(trim(coalesce(r->>'note','')), ''),
    p_source,
    v_batch.id
  from jsonb_array_elements(p_rows) as r;

  get diagnostics v_imported_count = row_count;

  update public.import_batches
     set imported_count = v_imported_count,
         status = case
                    when v_imported_count = 0 then 'failed'
                    when greatest(p_failed_count, 0) = 0 then 'imported'
                    else 'partial'
                  end
   where id = v_batch.id
   returning * into v_batch;

  return v_batch;
end;
$$;

grant execute on function public.commit_import_batch(text, jsonb, int, text, text, text) to authenticated;
