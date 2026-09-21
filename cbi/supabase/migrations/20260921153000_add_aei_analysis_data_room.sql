-- Private data room for the AEI historical aid analysis.
insert into public.calls (code, name, status, kind, description, route_path)
values (
  'ANALISIS-AEI-HISTORICO',
  'Ayudas AEI · análisis de convocatorias',
  'active',
  'normal',
  'Data room histórico de ayudas a Agrupaciones Empresariales Innovadoras.',
  './aei-analisis-dashboard.html'
)
on conflict (code) do update
set
  name = excluded.name,
  status = excluded.status,
  kind = excluded.kind,
  description = excluded.description,
  route_path = excluded.route_path,
  updated_at = now();

-- Administrators receive access on deployment. Other users can be assigned
-- read access through the normal administration screen.
insert into public.user_call_access (user_id, call_id, access_level)
select profile.id, call.id, 'admin'::public.access_level
from public.profiles profile
cross join public.calls call
where profile.role = 'admin'
  and profile.status = 'active'
  and call.code = 'ANALISIS-AEI-HISTORICO'
on conflict (user_id, call_id) do update
set access_level = excluded.access_level;
