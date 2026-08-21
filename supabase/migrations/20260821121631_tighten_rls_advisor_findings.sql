drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_admin_select" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create policy "audit_admin_select"
on public.audit_log
for select
to authenticated
using ((select private.current_user_is_admin()));

create policy "audit_admin_insert"
on public.audit_log
for insert
to authenticated
with check ((select private.current_user_is_admin()));

grant select, insert on public.audit_log to authenticated;
