# PAID Aragón

Panel privado: `cbi/interfaces/paid-aragon-dashboard.html`.
Entrada en el espacio de trabajo mediante la convocatoria `PAID-ARAGON` (tipo `normal`).

## Primera fase

- **Configurar solicitud** es la pestaña inicial. Permite crear, recuperar y actualizar borradores propios: empresa, proyecto, año, provincia, presupuesto previsto y notas.
- **Históricos** consulta concesiones y permite filtrar por año. Muestra hasta 200 resultados e indica si hay más. No contiene datos de ejemplo ni cifras oficiales pendientes de contrastar.
- Se reutilizan la sesión, el control de páginas y el catálogo de accesos de CBI.

## Supabase

- `paid_aragon_editions`: convocatorias por año, fuente y notas.
- `paid_aragon_awards`: beneficiarios, proyectos, provincia, presupuesto elegible, importe concedido y fuente; vinculados a la convocatoria histórica.
- `paid_aragon_applications`: borradores privados por propietario; estado `draft` o `archived`.

RLS en las tres tablas. La lectura requiere perfil activo y asignación a `PAID-ARAGON` activa. Los borradores solo pueden consultarse por su propietario; guardar exige permiso `evaluate` o `admin`. Los accesos `read` solo consultan. No hay acceso anónimo. Las cargas históricas se realizan mediante backend autorizado/migraciones; el navegador solo lee las tablas históricas.

La migración inicial asigna el panel a administradores activos existentes. Otros usuarios se asignan desde administración de CBI. No se habilita acceso automático para nuevos administradores.

## Continuación

1. Incorporar fuentes oficiales y años disponibles en `paid_aragon_editions` y `paid_aragon_awards`.
2. Confirmar campos y criterios de la solicitud PAID, líneas, gastos elegibles y documentación.
3. Incorporar cálculos y comparativas una vez definidos los criterios.
4. Ampliar búsqueda, paginación y análisis conforme crezca el histórico.

Esta fase no presenta solicitudes, no calcula subvenciones y no valida requisitos de convocatoria. El año del formulario es editable y no presupone que exista una convocatoria abierta.

## Verificación inicial

Se comprobó en Supabase la creación y actualización de un borrador bajo el rol `authenticated`, con la transacción revertida para no conservar datos de prueba. Migración con permisos explícitos y RLS. El asesor de seguridad no señaló problemas de las nuevas tablas; mantiene un aviso global sobre protección frente a contraseñas filtradas desactivada.
