-- Adds one visible placeholder of each future workspace category.
insert into public.calls (code, name, status, kind, description, route_path)
values
  (
    'DEMO-SEGUIMIENTO',
    'Seguimiento de proyecto · Demo',
    'active',
    'tracking',
    'Espacio de seguimiento continuo del proyecto. Contenido en preparación.',
    null
  ),
  (
    'DEMO-SPRINT',
    'Sprint de financiación · Demo',
    'active',
    'sprint',
    'Espacio intensivo de trabajo por objetivos. Contenido en preparación.',
    null
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
where profile.role = 'admin'
  and profile.status = 'active'
  and call.code in ('DEMO-SEGUIMIENTO', 'DEMO-SPRINT')
on conflict (user_id, call_id) do update
set access_level = excluded.access_level;
