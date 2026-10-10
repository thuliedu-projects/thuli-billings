-- Owner/staff can close their account from the app.
-- Deletes owned organizations (cascades stores, POS rows, memberships),
-- leftover staff memberships, then the auth user (cascades profiles).
-- organizations.owner_user_id is ON DELETE RESTRICT on profiles, so org
-- rows must go before auth.users.

create or replace function public.delete_own_account()
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

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
