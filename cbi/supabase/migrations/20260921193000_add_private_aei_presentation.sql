-- Private presentation card for the CBI workspace.
-- Only the named administrator receives the assignment.
insert into public.calls (code, name, status, kind, description, route_path)
values (
  'PRESENTACION-AEI',
  'Presentación corporativa · Ayudas AEI',
  'active',
  'normal',
  'Presentación corporativa de CONASOC y ayudas a Agrupaciones Empresariales Innovadoras.',
  './presentacion-aei.html'
)
on conflict (code) do update
set
  name = excluded.name,
  status = excluded.status,
  kind = excluded.kind,
  description = excluded.description,
  route_path = excluded.route_path,
  updated_at = now();

insert into public.user_call_access (user_id, call_id, access_level)
select profile.id, call.id, 'admin'::public.access_level
from public.profiles profile
cross join public.calls call
where profile.email = 'jorgemoreno@con-asociados.com'
  and profile.status = 'active'
  and call.code = 'PRESENTACION-AEI'
on conflict (user_id, call_id) do update
set access_level = excluded.access_level;
