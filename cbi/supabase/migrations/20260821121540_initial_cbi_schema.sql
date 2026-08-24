create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create type public.app_role as enum ('admin', 'user');
create type public.app_status as enum ('active', 'inactive');
create type public.call_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.access_level as enum ('read', 'evaluate', 'admin');
create type public.evaluation_status as enum ('draft', 'submitted', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'user',
  status public.app_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile data. Credentials live in Supabase Auth, not in this table.';

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status public.call_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_call_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  access_level public.access_level not null default 'evaluate',
  granted_at timestamptz not null default now(),
  primary key (user_id, call_id)
);

create table public.call_questions (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  question_key text not null,
  label text not null,
  help_text text,
  max_score numeric(8, 2) not null default 0,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (call_id, question_key)
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  source_file_name text,
  organization_name text not null,
  project_title text,
  estimated_score numeric(8, 2),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_evaluations (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  project_name text not null,
  status public.evaluation_status not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  total_score numeric(8, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_status_idx on public.profiles (role, status);
create index calls_status_idx on public.calls (status);
create index user_call_access_call_id_idx on public.user_call_access (call_id);
create index call_questions_call_sort_idx on public.call_questions (call_id, sort_order);
create index competitors_call_id_idx on public.competitors (call_id);
create index project_evaluations_owner_idx on public.project_evaluations (owner_user_id);
create index project_evaluations_call_idx on public.project_evaluations (call_id);
create index audit_log_actor_idx on public.audit_log (actor_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger calls_set_updated_at
before update on public.calls
for each row execute function public.set_updated_at();

create trigger call_questions_set_updated_at
before update on public.call_questions
for each row execute function public.set_updated_at();

create trigger competitors_set_updated_at
before update on public.competitors
for each row execute function public.set_updated_at();

create trigger project_evaluations_set_updated_at
before update on public.project_evaluations
for each row execute function public.set_updated_at();

create or replace function private.current_user_is_admin()
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
      and role = 'admin'
      and status = 'active'
  );
$$;

revoke all on function private.current_user_is_admin() from public;
revoke all on function private.current_user_is_admin() from anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.calls enable row level security;
alter table public.user_call_access enable row level security;
alter table public.call_questions enable row level security;
alter table public.competitors enable row level security;
alter table public.project_evaluations enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_admin_select"
on public.profiles
for select
to authenticated
using ((select private.current_user_is_admin()));

create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy "calls_select_assigned_active"
on public.calls
for select
to authenticated
using (
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
);

create policy "calls_admin_insert"
on public.calls
for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy "calls_admin_update"
on public.calls
for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy "calls_admin_delete"
on public.calls
for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy "access_select_own"
on public.user_call_access
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create policy "access_admin_insert"
on public.user_call_access
for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy "access_admin_update"
on public.user_call_access
for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy "access_admin_delete"
on public.user_call_access
for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy "questions_select_assigned_call"
on public.call_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_call_access access
    join public.calls call on call.id = access.call_id
    where access.user_id = (select auth.uid())
      and access.call_id = call_questions.call_id
      and call.status = 'active'
  )
  or (select private.current_user_is_admin())
);

create policy "questions_admin_insert"
on public.call_questions
for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy "questions_admin_update"
on public.call_questions
for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy "questions_admin_delete"
on public.call_questions
for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy "competitors_select_assigned_call"
on public.competitors
for select
to authenticated
using (
  exists (
    select 1
    from public.user_call_access access
    join public.calls call on call.id = access.call_id
    where access.user_id = (select auth.uid())
      and access.call_id = competitors.call_id
      and call.status = 'active'
  )
  or (select private.current_user_is_admin())
);

create policy "competitors_admin_insert"
on public.competitors
for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy "competitors_admin_update"
on public.competitors
for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy "competitors_admin_delete"
on public.competitors
for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy "evaluations_select_owner"
on public.project_evaluations
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create policy "evaluations_insert_owner"
on public.project_evaluations
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
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
  owner_user_id = (select auth.uid())
  or (select private.current_user_is_admin())
)
with check (
  owner_user_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create policy "evaluations_delete_owner"
on public.project_evaluations
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on
  public.profiles,
  public.calls,
  public.user_call_access,
  public.call_questions,
  public.competitors,
  public.project_evaluations
to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.calls (code, name, status)
values
  ('CONV-2026-001', 'Innovacion empresarial', 'active'),
  ('CONV-2026-002', 'Digitalizacion y datos', 'active'),
  ('CONV-2026-003', 'Sostenibilidad e impacto', 'active')
on conflict (code) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();
