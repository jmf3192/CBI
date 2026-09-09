-- Revoked or inactive users must not keep mutating stored studies.
drop policy if exists "strategy_studies_update_owner" on public.strategy_studies;
drop policy if exists "strategy_studies_delete_owner" on public.strategy_studies;

create policy "strategy_studies_update_owner"
on public.strategy_studies
for update
to authenticated
using (
  (select private.current_user_is_active())
  and (
    (
      owner_user_id = (select auth.uid())
      and exists (
        select 1
        from public.user_call_access access
        join public.calls call on call.id = access.call_id
        where access.user_id = (select auth.uid())
          and access.call_id = strategy_studies.call_id
          and access.access_level in ('evaluate', 'admin')
          and call.status = 'active'
          and call.kind = 'strategy'
      )
    )
    or (select private.current_user_is_admin())
  )
)
with check (
  (select private.current_user_is_active())
  and (
    (
      owner_user_id = (select auth.uid())
      and exists (
        select 1
        from public.user_call_access access
        join public.calls call on call.id = access.call_id
        where access.user_id = (select auth.uid())
          and access.call_id = strategy_studies.call_id
          and access.access_level in ('evaluate', 'admin')
          and call.status = 'active'
          and call.kind = 'strategy'
      )
    )
    or (select private.current_user_is_admin())
  )
);

create policy "strategy_studies_delete_owner"
on public.strategy_studies
for delete
to authenticated
using (
  (select private.current_user_is_active())
  and (
    (
      owner_user_id = (select auth.uid())
      and exists (
        select 1
        from public.user_call_access access
        join public.calls call on call.id = access.call_id
        where access.user_id = (select auth.uid())
          and access.call_id = strategy_studies.call_id
          and access.access_level in ('evaluate', 'admin')
          and call.status = 'active'
          and call.kind = 'strategy'
      )
    )
    or (select private.current_user_is_admin())
  )
);
