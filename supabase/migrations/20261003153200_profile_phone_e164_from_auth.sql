-- Auth stores the phone without a leading +. profiles.phone must be E.164.

create or replace function private.to_e164(raw text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when raw is null or btrim(raw) = '' then null
    when btrim(raw) ~ '^\+[1-9][0-9]{7,14}$' then btrim(raw)
    when regexp_replace(btrim(raw), '\D', '', 'g') ~ '^[1-9][0-9]{7,14}$'
      then '+' || regexp_replace(btrim(raw), '\D', '', 'g')
    else null
  end;
$$;

revoke all on function private.to_e164(text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    private.to_e164(new.phone)
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.sync_profile_phone_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set phone = private.to_e164(new.phone)
   where id = new.id;
  return new;
end;
$$;

revoke all on function private.sync_profile_phone_from_auth() from public, anon, authenticated;

create or replace function private.enforce_profile_phone_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_phone text;
begin
  if new.phone is distinct from old.phone
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    select u.phone into auth_phone from auth.users u where u.id = new.id;
    if private.to_e164(new.phone) is distinct from private.to_e164(auth_phone) then
      raise exception 'profiles.phone must match auth.users.phone';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_profile_phone_locked() from public, anon, authenticated;
