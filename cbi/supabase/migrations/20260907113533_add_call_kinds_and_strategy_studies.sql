-- Adds the two call experiences and persistent financing-strategy studies.
do $$
begin
  create type public.call_kind as enum ('normal', 'strategy');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.strategy_study_status as enum ('draft', 'prepared', 'presented', 'archived');
exception
  when duplicate_object then null;
end
$$;

alter table public.calls
  add column if not exists kind public.call_kind not null default 'normal',
  add column if not exists description text not null default '',
  add column if not exists route_path text;

update public.calls
set route_path = case code
  when 'CONV-2026-INNOVAE-FRIO' then './innovae-frio-dashboard.html'
  when 'CONV-2026-INCENTIVOS-REGIONALES' then './incentivos-regionales-dashboard.html'
  else route_path
end
where route_path is null;

alter table public.calls
  drop constraint if exists calls_route_path_format;

alter table public.calls
  add constraint calls_route_path_format
  check (route_path is null or route_path ~ '^\./[a-z0-9-]+\.html$');

create table if not exists public.strategy_studies (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  project_name text not null,
  status public.strategy_study_status not null default 'draft',
  schema_version integer not null default 1 check (schema_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategy_studies_call_owner_idx
  on public.strategy_studies (call_id, owner_user_id, updated_at desc);

drop trigger if exists strategy_studies_set_updated_at on public.strategy_studies;
create trigger strategy_studies_set_updated_at
before update on public.strategy_studies
for each row execute function public.set_updated_at();

alter table public.strategy_studies enable row level security;

drop policy if exists "strategy_studies_select_owner" on public.strategy_studies;
drop policy if exists "strategy_studies_insert_owner" on public.strategy_studies;
drop policy if exists "strategy_studies_update_owner" on public.strategy_studies;
drop policy if exists "strategy_studies_delete_owner" on public.strategy_studies;

create policy "strategy_studies_select_owner"
on public.strategy_studies
for select
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
          and call.status = 'active'
          and call.kind = 'strategy'
      )
    )
    or (select private.current_user_is_admin())
  )
);

create policy "strategy_studies_insert_owner"
on public.strategy_studies
for insert
to authenticated
with check (
  (select private.current_user_is_active())
  and owner_user_id = (select auth.uid())
  and (
    exists (
      select 1
      from public.user_call_access access
      join public.calls call on call.id = access.call_id
      where access.user_id = (select auth.uid())
        and access.call_id = strategy_studies.call_id
        and access.access_level in ('evaluate', 'admin')
        and call.status = 'active'
        and call.kind = 'strategy'
    )
    or (select private.current_user_is_admin())
  )
);

create policy "strategy_studies_update_owner"
on public.strategy_studies
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

create policy "strategy_studies_delete_owner"
on public.strategy_studies
for delete
to authenticated
using (
  (select private.current_user_is_active())
  and (
    owner_user_id = (select auth.uid())
    or (select private.current_user_is_admin())
  )
);

revoke all on table public.strategy_studies from anon;
grant select, insert, update, delete on table public.strategy_studies to authenticated;
grant select, insert, update, delete on table public.strategy_studies to service_role;

insert into public.calls (code, name, status, kind, description, route_path)
values (
  'DEMO-ESTRATEGIA-FINANCIACION',
  'Estrategia de financiación',
  'active',
  'strategy',
  'Planificación temporal, presupuestaria y comparativa de ayudas para un mismo proyecto.',
  './estrategia-financiacion-demo.html'
)
on conflict (code) do update
set
  name = excluded.name,
  kind = excluded.kind,
  description = excluded.description,
  route_path = excluded.route_path,
  updated_at = now();
