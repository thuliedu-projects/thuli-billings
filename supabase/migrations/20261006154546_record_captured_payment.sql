-- Records a captured Razorpay payment as the organization owner subscription.
-- Called only by the payment edge functions with the service role key.
-- security invoker: service_role bypasses RLS; authenticated cannot execute this.

create or replace function public.record_captured_payment(
  p_user_id uuid,
  p_plan_code text,
  p_payment_id text,
  p_order_id text,
  p_amount_paise integer,
  p_owner_phone text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_key text := 'pay:' || p_payment_id;
  v_phone text;
  v_plan public.plans%rowtype;
  v_org_id uuid;
  v_event_id uuid;
  v_sub public.subscriptions%rowtype;
  v_now timestamptz := now();
  v_base timestamptz;
  v_end timestamptz;
  v_start timestamptz;
begin
  if current_user is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_user_id is null or p_payment_id is null or btrim(p_payment_id) = '' then
    raise exception 'missing payment';
  end if;

  if p_owner_phone is null or p_owner_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'owner phone must be E.164';
  end if;

  select phone into v_phone
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'account profile is missing';
  end if;

  if v_phone is distinct from p_owner_phone then
    raise exception 'phone does not match account';
  end if;

  select * into v_plan
  from public.plans
  where code = p_plan_code
    and is_active
  limit 1;

  if not found then
    raise exception 'unknown plan';
  end if;

  if v_plan.price_paise < 100 then
    raise exception 'plan price is not set';
  end if;

  if p_amount_paise is distinct from v_plan.price_paise then
    raise exception 'amount does not match plan';
  end if;

  v_event_id := null;

  insert into public.payment_events (
    org_id,
    owner_phone,
    event_type,
    razorpay_event_id,
    amount_paise,
    status,
    payload
  )
  values (
    null,
    p_owner_phone,
    'payment.captured',
    v_event_key,
    p_amount_paise,
    'captured',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'order_id', p_order_id,
      'plan_code', p_plan_code
    )
  )
  on conflict (razorpay_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select org_id into v_org_id
    from public.payment_events
    where razorpay_event_id = v_event_key;

    return jsonb_build_object(
      'org_id', v_org_id,
      'already_recorded', true
    );
  end if;

  select o.id into v_org_id
  from public.organizations o
  where o.owner_user_id = p_user_id
    and o.closed_at is null
  order by o.created_at
  limit 1;

  if v_org_id is null then
    begin
      insert into public.organizations (name, owner_user_id, source_event_id)
      values ('My business', p_user_id, v_event_key)
      returning id into v_org_id;
    exception
      when unique_violation then
        select o.id into v_org_id
        from public.organizations o
        where o.source_event_id = v_event_key;
    end;
  end if;

  if v_org_id is null then
    raise exception 'could not create organization';
  end if;

  select * into v_sub
  from public.subscriptions
  where org_id = v_org_id;

  if found
     and v_sub.current_period_end is not null
     and v_sub.current_period_end > v_now then
    v_base := v_sub.current_period_end;
  else
    v_base := v_now;
  end if;

  if v_plan.interval = 'year' then
    v_end := v_base + interval '1 year';
  else
    v_end := v_base + interval '1 month';
  end if;

  if found
     and v_sub.current_period_end is not null
     and v_sub.current_period_end > v_now
     and v_sub.current_period_start is not null then
    v_start := v_sub.current_period_start;
  else
    v_start := v_now;
  end if;

  if not found then
    insert into public.subscriptions (
      org_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    values (
      v_org_id,
      v_plan.id,
      'active',
      v_start,
      v_end,
      false
    );
  else
    update public.subscriptions
    set plan_id = v_plan.id,
        status = 'active',
        current_period_start = v_start,
        current_period_end = v_end,
        cancel_at_period_end = false
    where id = v_sub.id;
  end if;

  update public.payment_events
  set org_id = v_org_id
  where id = v_event_id;

  return jsonb_build_object(
    'org_id', v_org_id,
    'already_recorded', false
  );
end;
$$;

revoke all on function public.record_captured_payment(uuid, text, text, text, integer, text) from public;
revoke all on function public.record_captured_payment(uuid, text, text, text, integer, text) from anon, authenticated;
grant execute on function public.record_captured_payment(uuid, text, text, text, integer, text) to service_role;

comment on function public.record_captured_payment(uuid, text, text, text, integer, text) is
  'Service-role only. Idempotent on Razorpay payment id. Creates the owner org and activates the subscription.';

-- Match the prices shown on the website. Skip rows that already have a real price.
update public.plans
set price_paise = 49900
where code = 'starter' and price_paise = 0;

update public.plans
set price_paise = 99900
where code = 'growth' and price_paise = 0;

update public.plans
set price_paise = 199900
where code = 'pro' and price_paise = 0;
