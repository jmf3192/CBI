insert into public.calls (code, name, status, kind, description, route_path)
values ('INNTERCONECTA-STEP', 'INNTERCONECTA STEP', 'active', 'normal',
        'Criterios, elegibilidad y proyectos históricos de INNTERCONECTA.',
        './innterconecta-step-dashboard.html')
on conflict (code) do nothing;

insert into public.user_call_access (user_id, call_id, access_level)
select p.id, c.id, 'admin'::public.access_level
from public.profiles p
cross join public.calls c
where p.role = 'admin' and p.status = 'active' and c.code = 'INNTERCONECTA-STEP'
on conflict (user_id, call_id) do nothing;

insert into public.data_catalog (id, call_id, name, source_path, metadata)
select d.id, c.id, d.name, '/cbi/data/innterconecta-step/' || d.file,
       jsonb_build_object(
         'group', 'innterconecta-step', 'role', 'activo', 'connection', 'csv',
         'delimiter', ',', 'headers', d.headers, 'numeric', d.numeric_fields,
         'categories', d.categories, 'sourceFields', d.source_fields,
         'validation', 'generic', 'pages', array['innterconecta-step-dashboard.html'],
         'description', d.description
       )
from public.calls c
cross join (values
  ('step-proyectos', 'INNTERCONECTA · Proyectos concedidos', 'proyectos.csv',
   array['anio_convocatoria','anio_resolucion','programa','expediente','titulo','representante','puntos','resultado','fuente_url','presupuesto_elegible_eur','subvencion_eur'],
   array['anio_convocatoria','anio_resolucion','puntos','presupuesto_elegible_eur','subvencion_eur'],
   array['programa','anio_convocatoria','resultado'], array['fuente_url'],
   'Una fila por expediente concedido. Carga inicial con STEP 2025, importes totales del consorcio y referencia al PDF oficial.'),
  ('step-cobertura', 'INNTERCONECTA · Cobertura y fuentes', 'cobertura.csv',
   array['programa','anio_convocatoria','anio_resolucion','edicion','cobertura','fuente_url'],
   array['anio_convocatoria','anio_resolucion'], array['programa','edicion'], array['fuente_url'],
   'Inventario de convocatorias y estado de incorporación del detalle.'),
  ('step-escenario-2027', 'INNTERCONECTA · Escenario 2027', 'escenario_2027.csv',
   array['id','ejercicio','credito_eur','solicitudes_previstas','estado','notas'],
   array['ejercicio','credito_eur','solicitudes_previstas'], array['estado'], array[]::text[],
   'Plantilla editable de supuestos para la futura previsión. Los campos de crédito y demanda quedan pendientes.')
) as d(id, name, file, headers, numeric_fields, categories, source_fields, description)
where c.code = 'INNTERCONECTA-STEP'
on conflict (id) do nothing;
