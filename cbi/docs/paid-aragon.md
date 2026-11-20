# PAIP Aragón · TDI-FEDER

Panel: `cbi/interfaces/paid-aragon-dashboard.html`. Se conserva el código de acceso y las rutas `PAID-ARAGON` / `paid-aragon-*` creadas inicialmente para no romper asignaciones existentes. La denominación visible oficial es PAIP.

## Solicitud 2027

Fuente principal: **Orden ECE/1624/2026, de 26 de octubre**, BOA de 10 de noviembre de 2026, CSV BOA20261110018:
https://www.boa.aragon.es/cgi-bin/EBOA/BRSCGI?CMD=VEROBJ&MLKOB=1474139920505&type=pdf

- Solicitudes: 11/11/2026–15/01/2027, ambos incluidos.
- Actuaciones elegibles: 01/07/2026–30/06/2027.
- Crédito inicial: 10.025.158,50 €. La ampliación prevista de hasta 6.000.000 € es eventual, no crédito garantizado.
- Ayuda ordinaria por solicitud: mínimo 4.000 €; máximo 500.000 €, sin perjuicio de los supuestos del apartado XI.6.
- **15 criterios binarios a–o, máximo 425 puntos**. Cada criterio puntúa completo o cero. No se ha inventado una nota de corte ni una probabilidad de concesión. Desempate por fecha y hora de presentación.
- La guía está incorporada como anexo III de la propia orden (páginas 71–80); no se utiliza la guía 2026 para puntuar 2027.

### Modelo de elegibilidad y ayuda

`cbi/data/paid-aragon/rules-2027.json` contiene la versión, las fuentes por criterio y los requisitos. `paid-aragon-model.js` es el motor determinista compartido con las pruebas.

Los requisitos tienen tres estados: cumple, no cumple y pendiente. No se da por superado lo que falta por comprobar. Se revisan localización y actividad, constitución, solvencia, prohibiciones/crisis/recuperación, obligaciones tributarias, exclusiones sectoriales, proyecto no concluido antes de solicitar, no duplicidad PAIP, convocatoria energética específica, gastos, empleo, documentación y morosidad. Las condiciones de crisis y exclusiones con excepciones se confirman mediante revisión documental, no mediante un diagnóstico automático.

La calculadora toma **costes ya depurados por el usuario** por cinco categorías, separando minimis y RGEC. No es un clasificador automático de facturas. Aplica las intensidades publicadas por tamaño y zona, margen de minimis de la empresa única (300.000 € en periodo móvil de tres años), máximo ordinario y límite agregado del 80 % menos otras ayudas sobre los mismos costes. No reasigna automáticamente a RGEC el exceso de costes de minimis. La acumulación también requiere comprobar los límites específicos por coste/régimen; una alerta lo indica.

Para RGEC exige inicio posterior a la solicitud o pre-solicitud válida anterior al inicio y confirmación de las condiciones específicas de ese régimen. La comprobación por fecha es conservadora si ambos eventos ocurren el mismo día: se debe acreditar su orden y hora documental. Grandes empresas deben acreditar además el efecto incentivador adicional y las condiciones de inversión inicial/diversificación que procedan.

Los criterios son autoevaluados: solo suman si se declara cumplimiento y se incluye una referencia de evidencia. El motor impide puntuar tamaño pequeño para empresas medianas/grandes y antigüedad joven cuando no procede; calidad documental requiere documentación confirmada y evidencias de los méritos alegados. No comprueba la autenticidad de archivos ni sustituye la evaluación administrativa.

Se guardan los datos, costes, respuestas y referencias de evidencias en `paid_aragon_applications.assessment`, con versión de reglas y `schema_version=2`. Solo el propietario puede leerlos y guardar requiere permiso `evaluate` o `admin`, perfil activo y asignación a la convocatoria activa. Los borradores existentes no se borran.

## Históricos

Ver `cbi/data/paid-aragon/README.md` para estructura, alcance y conciliación. Los CSV de origen y consolidados se generan antes de la carga a Supabase. El panel carga todos los registros por páginas de 500; no usa el límite de 200 filas de la maqueta inicial. Los filtros, gráficos, tabla paginada y exportación trabajan sobre el mismo conjunto de datos.

El origen principal es Supabase. Si la consulta falla o la carga está incompleta respecto al inventario, usa la copia JSON de los CSV versionados y lo anuncia expresamente en pantalla. Los datos históricos son públicos; los borradores privados no se guardan en archivos versionados.

Se muestran KPIs, importes por año, resultados y dispersión puntuación/ayuda. Filtros por año, línea, estado, búsqueda, sector y ordenación. Los baremos cambian entre convocatorias; la dispersión identifica esa limitación y no sirve de corte predictivo de 2027.

## Verificación

- Pruebas deterministas: fechas y límites incluidos/excluidos, mínimo antes del redondeo, margen de minimis, tope de 500.000 €, acumulación del 80 %, zonas/tamaños RGEC, pre-solicitud, evidencias y empresa joven/pequeña.
- Verificación de lectura histórica y guardado JSON bajo rol `authenticated` en Supabase, con transacción revertida para no conservar pruebas.
- Asesor de seguridad: sin avisos de las tablas nuevas. Persiste el aviso global previo sobre protección frente a contraseñas filtradas desactivada; no se cambió la configuración de autenticación.
- Prueba de navegador superada: autenticación simulada, 15 criterios, cálculo de ayuda, guardar/recuperar evaluación, paginación, filtros, descarga CSV y ausencia de desbordamiento de página en móvil. Revisión visual de escritorio y móvil completada.
- El navegador de prueba utiliza sesión y respuestas simuladas; la base real se comprueba por separado mediante consultas con RLS.

Las migraciones se generaron con el flujo alternativo de archivos SQL y MCP porque no existe un ejecutable Supabase CLI instalado en este equipo. Las migraciones aplicadas se conservan en Git.
