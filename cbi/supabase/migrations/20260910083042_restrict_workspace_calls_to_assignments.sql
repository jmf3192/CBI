-- The workspace must show only explicitly assigned content for every profile,
-- including administrators. Global administration remains behind admin-calls.
drop policy if exists calls_select_assigned_active on public.calls;

create policy calls_select_assigned_active
on public.calls
for select
to authenticated
using (
  (select private.current_user_is_active())
  and status = 'active'::public.call_status
  and exists (
    select 1
    from public.user_call_access access
    where access.user_id = (select auth.uid())
      and access.call_id = calls.id
  )
);
