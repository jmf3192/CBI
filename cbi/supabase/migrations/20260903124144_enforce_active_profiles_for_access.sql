create or replace function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
  );
$$;

revoke all on function private.current_user_is_active() from public;
revoke all on function private.current_user_is_active() from anon;
grant execute on function private.current_user_is_active() to authenticated;

drop policy if exists "calls_select_assigned_active" on public.calls;
drop policy if exists "access_select_own" on public.user_call_access;
drop policy if exists "questions_select_assigned_call" on public.call_questions;
drop policy if exists "competitors_select_assigned_call" on public.competitors;
drop policy if exists "evaluations_select_owner" on public.project_evaluations;
drop policy if exists "evaluations_insert_owner" on public.project_evaluations;
drop policy if exists "evaluations_update_owner" on public.project_evaluations;
drop policy if exists "evaluations_delete_owner" on public.project_evaluations;

create policy "calls_select_assigned_active"
on public.calls
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    (
      status = 'active'
      and exists (
        select 1
        from public.user_call_access access
        where access.user_id = (select auth.uid())
          and access.call_id = calls.id
      )
    )
    or (select private.current_user_is_admin())
  )
);

create policy "access_select_own"
on public.user_call_access
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
);

create policy "questions_select_assigned_call"
on public.call_questions
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    exists (
      select 1
      from public.user_call_access access
      join public.calls call on call.id = access.call_id
      where access.user_id = (select auth.uid())
        and access.call_id = call_questions.call_id
        and call.status = 'active'
    )
    or (select private.current_user_is_admin())
  )
);

create policy "competitors_select_assigned_call"
on public.competitors
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    exists (
      select 1
      from public.user_call_access access
      join public.calls call on call.id = access.call_id
      where access.user_id = (select auth.uid())
        and access.call_id = competitors.call_id
        and call.status = 'active'
    )
    or (select private.current_user_is_admin())
  )
);

create policy "evaluations_select_owner"
on public.project_evaluations
for select
to authenticated
using (
  (select private.current_user_is_active())
  and (
    owner_user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
);

create policy "evaluations_insert_owner"
on public.project_evaluations
for insert
to authenticated
with check (
  (select private.current_user_is_active())
  and owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_call_access access
    join public.calls call on call.id = access.call_id
    where access.user_id = (select auth.uid())
      and access.call_id = project_evaluations.call_id
      and access.access_level in ('evaluate', 'admin')
      and call.status = 'active'
  )
);

create policy "evaluations_update_owner"
on public.project_evaluations
for update
to authenticated
using (
  (select private.current_user_is_active())
  and (
    owner_user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
)
with check (
  (select private.current_user_is_active())
  and (
    owner_user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
);

create policy "evaluations_delete_owner"
on public.project_evaluations
for delete
to authenticated
using (
  (select private.current_user_is_active())
  and (
    owner_user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
);
