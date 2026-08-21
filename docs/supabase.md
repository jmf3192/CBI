# Supabase

## Proyecto CBI

- Nombre: `CBI`
- Project ref: `wtiugprfadlwfpmfnvhe`
- Organizacion: `jmf3192's Org`
- Organization ID: `ptqnqzeteifxvvftovub`
- Region: `eu-west-3`
- Estado inicial: `ACTIVE_HEALTHY`
- API URL: `https://wtiugprfadlwfpmfnvhe.supabase.co`
- Coste consultado al crear: `0/mes`

## Seguridad

No versionar claves privadas, `service_role`, `sb_secret`, passwords, cadenas de conexion con credenciales ni dumps con datos reales.

Las variables sensibles deberan vivir en el entorno de despliegue. En el repositorio solo se versionaran migraciones, esquema y documentacion no sensible.

## Modelo acordado

- Produccion usara Supabase Auth para usuarios, passwords, recuperacion de acceso y sesiones.
- La tabla `public.profiles` solo guardara metadatos de aplicacion y enlazara con `auth.users`.
- Las tablas en `public` se crean con RLS activado y grants explicitos. No hay acceso anonimo a datos de CBI.
- El panel admin no debe exponer `service_role` en frontend. Las acciones sensibles futuras se resolveran con backend seguro o Edge Functions.
- La SQLite local de `data/local/` queda como apoyo de maqueta y desarrollo, no como almacen productivo.
