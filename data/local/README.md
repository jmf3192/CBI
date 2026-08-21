# Data local

Este directorio contiene bases de datos locales de desarrollo.

Los archivos de base de datos no se versionan en Git por seguridad. El esquema versionado esta en `../schema/`.

En produccion, los usuarios y contrasenas no se guardaran aqui ni en Git. CBI usara Supabase Auth y el esquema productivo versionado en `../../supabase/migrations/`.
