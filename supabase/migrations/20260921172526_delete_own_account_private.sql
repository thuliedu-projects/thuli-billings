-- Keep the PostgREST RPC in public as SECURITY INVOKER.
-- The privileged body lives in private (not on the Data API).

drop function if exists public.delete_own_account();

create or replace function private.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.organizations
  where owner_user_id = uid;

  delete from public.organization_members
  where user_id = uid;

  delete from auth.users
  where id = uid;
end;
$$;

revoke all on function private.delete_own_account() from public, anon;
grant execute on function private.delete_own_account() to authenticated, service_role;

create or replace function public.delete_own_account()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.delete_own_account();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
