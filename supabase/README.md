# Supabase

El proyecto productivo de CBI usa Supabase como backend gestionado:

- Supabase Auth guardara usuarios, passwords, recuperacion de acceso y sesiones.
- `public.profiles` guardara solo metadatos de aplicacion: nombre, email, rol y estado.
- Las convocatorias activas, accesos, preguntas, competidores y evaluaciones viven en tablas versionadas por migraciones.
- Las operaciones administrativas sensibles se haran desde backend seguro o Edge Functions, nunca desde un cliente con `service_role`.

## Proyecto conectado

- Nombre: `CBI`
- Project ref: `wtiugprfadlwfpmfnvhe`
- Region: `eu-west-3`
- API URL: `https://wtiugprfadlwfpmfnvhe.supabase.co`

## Bootstrap de usuarios

La primera cuenta administradora debe crearse en Supabase Auth y despues enlazarse en `public.profiles` con rol `admin`. No se versionan usuarios reales ni contrasenas.

## Migraciones

Las migraciones aplicadas en Supabase estan versionadas en:

- `migrations/20260821121540_initial_cbi_schema.sql`
- `migrations/20260821121631_tighten_rls_advisor_findings.sql`
