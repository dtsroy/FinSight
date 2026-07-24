
create or replace function public.commit_import_batch(
  p_source text,
  p_rows jsonb,
  p_failed_count integer default 0,
  p_file_url text default null,
  p_file_key text default null,
  p_note text default null
)
returns public.import_batches
language plpgsql
set search_path to 'public'
as $function$
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
    (user_id, name, category, platform, amount, code, note, source, batch_id, currency)
  select
    v_user_id,
    trim(r->>'name'),
    (r->>'category')::public.asset_category,
    trim(r->>'platform'),
    (r->>'amount')::numeric,
    nullif(trim(coalesce(r->>'code','')), ''),
    nullif(trim(coalesce(r->>'note','')), ''),
    p_source,
    v_batch.id,
    coalesce(nullif(upper(trim(coalesce(r->>'currency',''))), ''), 'CNY')
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
$function$;
