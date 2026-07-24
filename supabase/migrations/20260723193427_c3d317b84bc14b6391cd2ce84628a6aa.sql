
-- 批量改币种时按内置参考汇率 per-row 换算金额，保证 CNY 总额恒定。
-- security invoker：以调用者身份执行，RLS 自动约束到 auth.uid() 名下的行。
create or replace function public.batch_change_currency(
  target_ids uuid[],
  target_currency text
) returns int
language plpgsql
security invoker
as $$
declare
  affected int;
  target_code text := upper(target_currency);
  target_rate numeric;
begin
  if target_code not in ('CNY','USD','HKD','EUR','GBP','JPY','SGD','KRW','TWD','AUD','CAD') then
    raise exception 'unsupported target currency: %', target_code;
  end if;

  target_rate := case target_code
    when 'CNY' then 1
    when 'USD' then 7.1
    when 'HKD' then 0.91
    when 'EUR' then 7.68
    when 'GBP' then 8.9
    when 'JPY' then 0.048
    when 'SGD' then 5.2
    when 'KRW' then 0.0051
    when 'TWD' then 0.22
    when 'AUD' then 4.75
    when 'CAD' then 5.25
  end;

  update public.assets a
  set
    amount = a.amount * (case upper(coalesce(a.currency, 'CNY'))
      when 'CNY' then 1
      when 'USD' then 7.1
      when 'HKD' then 0.91
      when 'EUR' then 7.68
      when 'GBP' then 8.9
      when 'JPY' then 0.048
      when 'SGD' then 5.2
      when 'KRW' then 0.0051
      when 'TWD' then 0.22
      when 'AUD' then 4.75
      when 'CAD' then 5.25
      else 1
    end) / target_rate,
    currency = target_code
  where a.id = any(target_ids)
    and a.user_id = auth.uid()
    and upper(coalesce(a.currency, 'CNY')) <> target_code;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.batch_change_currency(uuid[], text) to authenticated;
