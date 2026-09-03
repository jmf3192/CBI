# Supabase

El proyecto productivo de CBI usa Supabase como backend gestionado:

- Supabase Auth guardara usuarios, passwords y sesiones.
- `public.profiles` guardara solo metadatos de aplicacion: nombre, email, rol y estado.
- Las convocatorias activas, accesos, preguntas, competidores y evaluaciones viven en tablas versionadas por migraciones.
- Las operaciones administrativas sensibles se haran desde backend seguro o Edge Functions, nunca desde un cliente con `service_role`.

## Proyecto conectado

- Nombre: `CBI`
- Project ref: `wtiugprfadlwfpmfnvhe`
- Region: `eu-west-3`
- API URL: `https://wtiugprfadlwfpmfnvhe.supabase.co`

## Bootstrap de usuarios

La primera cuenta administradora se ha creado en Supabase Auth con email `jorgemoreno@con-asociados.com` y perfil `admin` en `public.profiles`.

El email debe quedar confirmado en Supabase Auth para poder iniciar sesion. No se versionan usuarios reales ni contrasenas.

## Migraciones

Las migraciones aplicadas en Supabase estan versionadas en:

- `migrations/20260821121540_initial_cbi_schema.sql`
- `migrations/20260821121631_tighten_rls_advisor_findings.sql`
- `migrations/20260903124116_add_innovae_frio_call.sql`
- `migrations/20260903124144_enforce_active_profiles_for_access.sql`

## Acceso operativo

El frontend publico usa la publishable key de Supabase y todas las lecturas/escrituras quedan protegidas por RLS o por Edge Functions con comprobacion de admin.

No hay recuperacion automatica de acceso. Los usuarios y cambios de contrasena se gestionaran por administradores o desde Codex/Supabase.

La Edge Function `admin-users` centraliza las operaciones sensibles del panel de control. Solo responde si la peticion incluye una sesion valida de un perfil `admin` activo.
