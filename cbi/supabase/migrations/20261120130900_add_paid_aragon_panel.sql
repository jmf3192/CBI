-- PAID Aragón: shared historical data and private application drafts.
create table public.paid_aragon_editions (
 id uuid primary key default gen_random_uuid(),
 year integer not null unique check (year between 2000 and 2100),
 title text not null,
 source_url text,
 notes text,
 created_at timestamptz not null default now()
);
create table public.paid_aragon_awards (
 id uuid primary key default gen_random_uuid(),
 edition_id uuid not null references public.paid_aragon_editions(id) on delete restrict,
 beneficiary text not null,
 project_title text,
 province text check (province in ('Huesca','Teruel','Zaragoza')),
 eligible_budget numeric(14,2) check (eligible_budget >= 0),
 granted_amount numeric(14,2) check (granted_amount >= 0),
 source_url text,
 created_at timestamptz not null default now()
);
create index paid_aragon_awards_edition_idx on public.paid_aragon_awards(edition_id);
create table public.paid_aragon_applications (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 application_year integer not null check (application_year between 2000 and 2100),
 company_name text not null check (length(trim(company_name)) > 0),
 project_name text not null check (length(trim(project_name)) > 0),
 province text not null check (province in ('Huesca','Teruel','Zaragoza')),
 requested_budget numeric(14,2) not null default 0 check (requested_budget >= 0),
 notes text not null default '',
 status text not null default 'draft' check (status in ('draft','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index paid_aragon_applications_owner_idx on public.paid_aragon_applications(owner_user_id);
create trigger paid_aragon_applications_updated_at before update on public.paid_aragon_applications
for each row execute function public.set_updated_at();
alter table public.paid_aragon_editions enable row level security;
revoke all on public.paid_aragon_editions from anon, authenticated;
grant select, insert, update, delete on public.paid_aragon_editions to service_role;
grant select on public.paid_aragon_editions to authenticated;
create policy paid_aragon_editions_read on public.paid_aragon_editions for select to authenticated using ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid())));
alter table public.paid_aragon_awards enable row level security;
revoke all on public.paid_aragon_awards from anon, authenticated;
grant select, insert, update, delete on public.paid_aragon_awards to service_role;
grant select on public.paid_aragon_awards to authenticated;
create policy paid_aragon_awards_read on public.paid_aragon_awards for select to authenticated using ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid())));
alter table public.paid_aragon_applications enable row level security;
revoke all on public.paid_aragon_applications from anon, authenticated;
grant select, insert, update, delete on public.paid_aragon_applications to service_role;
grant select, insert, update on public.paid_aragon_applications to authenticated;
create policy paid_aragon_applications_read on public.paid_aragon_applications for select to authenticated using (owner_user_id=(select auth.uid()) and ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid()))));
create policy paid_aragon_applications_insert on public.paid_aragon_applications for insert to authenticated with check (owner_user_id=(select auth.uid()) and ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid())) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and a.user_id=(select auth.uid()) and a.access_level in ('evaluate','admin'))));
create policy paid_aragon_applications_update on public.paid_aragon_applications for update to authenticated using (owner_user_id=(select auth.uid()) and ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid())) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and a.user_id=(select auth.uid()) and a.access_level in ('evaluate','admin')))) with check (owner_user_id=(select auth.uid()) and ((select private.current_user_is_active()) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and c.status='active' and a.user_id=(select auth.uid())) and exists (select 1 from public.calls c join public.user_call_access a on a.call_id=c.id where c.code='PAID-ARAGON' and a.user_id=(select auth.uid()) and a.access_level in ('evaluate','admin'))));

insert into public.calls(code,name,status,kind,description,route_path)
values ('PAID-ARAGON','PAID Aragón','active','normal','Configuración de solicitudes y consulta de históricos PAID Aragón.','./paid-aragon-dashboard.html');
insert into public.user_call_access(user_id,call_id,access_level)
select p.id,c.id,'admin'::public.access_level from public.profiles p cross join public.calls c
where p.role='admin' and p.status='active' and c.code='PAID-ARAGON';
