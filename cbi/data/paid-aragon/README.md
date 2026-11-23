# Histórico PAIP Aragón

Datos revisados a **20/11/2026**. Configurador de solicitudes: **2027**. Expedientes PAIP: **2021–2026**, con antecedentes FEDER complementarios **2017–2025**.

## Alcance real

- TDI-FEDER **2023, 2024, 2025 y 2026**: convocatorias, modificaciones, propuestas enlazadas, resoluciones y ampliaciones disponibles en el portal oficial revisado. El conjunto de expedientes usa las resoluciones de concesión definitivas, no las propuestas provisionales.
- IDIS-REACT **2021 y 2022**: antecedentes separados por línea y sublínea verde/digital/mixta. No se presentan como TDI-FEDER del mismo ejercicio.
- Resolución adicional **TDI 2021**: localizada en la web PYME Aragón, pero el enlace oficial devuelve 404. No se incorporan cifras sin documento recuperado.
- Antecedentes FEDER **2017–2020**: 310 operaciones recuperadas (22, 94, 90 y 104 por año). Se mantienen separadas de los expedientes PAIP: sus costes no se convierten en ayudas concedidas. Los enlaces originales no recuperados conservan su estado de error. No se presenta el conjunto como un censo completo de todo PAIP desde su creación.
- Las líneas sectoriales textil/calzado, diseño y áreas industriales no se mezclan con TDI-FEDER. Su inclusión requeriría un alcance distinto.

## Entregables

- `historico_eventos.csv`: 2.384 filas extraídas por resolución y anexo; conserva fases/importes repetidos de un expediente en documentos distintos.
- `historico_expedientes.csv`: 2.323 expedientes consolidados por año, línea y número de expediente.
- `historico_2021.csv` … `historico_2026.csv`: una exportación por ejercicio.
- `sectores_prioritarios.csv`: 39 registros de fertilizantes/nutrición vegetal y nutrición animal desde 2017; 29 expedientes PAIP y 10 operaciones antiguas, incluyendo los indicios señalados como tales.
- `clasificacion_sectorial.csv`: trazabilidad y casos pendientes de revisión.
- `fuentes.csv` / `sources.json`: URL, año, línea, tipo documental, archivo, SHA-256 y resultado de descarga.
- `cobertura.csv`: años con datos, documentos y lagunas de cobertura.
- `criterios_2027.csv`, `elegibilidad_2027.csv`, `rules-2027.json`: requisitos y baremos con página y fuente.
- `history.json` y `validation.json`: copia de consulta y controles usados por el panel.
- `sources/*.pdf`: documentos oficiales descargados. `sources/portal.html.gz` conserva la captura del portal empleada para inventariar enlaces.

Los CSV utilizan UTF-8 con BOM, coma como separador, punto decimal y comillas RFC4180. Los campos vacíos significan no publicado/no disponible, no cero. `investment_reference` distingue inversión solicitada de inversión de preevaluación mediante `reference_basis`; **no es ayuda solicitada**.

## Consolidación

Los importes concedidos y los meramente posibles se mantienen separados. Las ampliaciones se incorporan en su orden documental; una ampliación no vuelve a sumar el importe de la lista de espera. Las concesiones parciales y complementos pendientes se preservan. Renunciar a la lista de espera no elimina una concesión parcial anterior si no se publica su revocación. Se incorpora la modificación de puntuación de AIRFAL 2025 y las renuncias expresas de las ampliaciones 2025–2026.

Un expediente de 2023 puede figurar en listas de espera de activos de tipo 1 y tipo 2; la tabla consolidada lo cuenta una sola vez y conserva ambos eventos. El número de expediente TDI de la ampliación 2026 se normaliza al sufijo TDII utilizado en el listado inicial, conservando el original en los eventos.

Los importes representan concesiones publicadas; no certifican pago, aceptación, ejecución final ni revocaciones posteriores no incluidas en las fuentes revisadas.

## Sectores

La clasificación es **por actividad del beneficiario**, no una afirmación sobre el objeto de cada proyecto. Las resoluciones no publican títulos ni provincias de forma homogénea. La ampliación FEDER añade descripción, localización y fechas cuando existe un cruce documentado; no deduce el lugar del proyecto del domicilio social ni inventa títulos a partir del nombre de la empresa.

Se incluyen pruebas corporativas u oficiales para Fertinagro, Forgasa, Arvensis, Delso, Innova Nutrición Vegetal, Best Feed Ibérica, Renure, Adisseo, Nutriad y GUCO. Las coincidencias por `PIENSOS`, `AGROPIENSO` o nutrición ovina quedan como `indicio_denominacion`. Las empresas multisectoriales o afines sin evidencia suficiente se señalan como `revision_sectorial`. Herbetom, Chelats Sarrate o Solontia no se etiquetan por parecido del nombre con el sector.

## Controles y discrepancias

La extracción textual conserva página y hash del PDF; la de 2021 utiliza OCR local. Las discrepancias de suma minimis+RGEC frente al importe total de cada fila se contrastaron visualmente y se registraron en `scripts/paid-aragon/ocr-corrections.json`.

**Conciliación con pies de tabla de IDIS-REACT 2021:**

| Sublínea | Suma de filas extraída | Total impreso | Diferencia |
|---|---:|---:|---:|
| Verde | 2.580.595 € | 2.580.601 € | −6 € |
| Digital | 5.381.900 € | 5.381.900 € | 0 € |
| Mixta | 2.932.113 € | 2.932.113 € | 0 € |

La diferencia digital de 7.000 € quedó resuelta contrastando todas las filas: ERGOMAQ-97 tenía una ayuda de 9.070 €, no 2.070 €.

En IDIS-REACT 2022, la suma textual por filas es 16.729.197 €, 100 € superior a la suma de los tres pies de tabla (16.729.097 €). También se conserva y muestra esa diferencia sin modificar filas oficiales.

No se introducen ajustes sin una fila fuente que los respalde. Los importes de 2021 son una reconstrucción OCR con conciliación por fila, y las diferencias agregadas se muestran en el panel. `financial_validated` se refiere al control aritmético por fila, no a una certificación administrativa ni a una revisión visual íntegra de todos los campos OCR.

Los controles y los registros de 2021 necesitan revisión adicional si se usan para una decisión financiera. Las filas y originales permiten completarla sin perder trazabilidad.

## Reproducción

1. `scripts/paid-aragon/download_sources.py`: inventario y descarga.
2. `cache_pdf.py`: extracción textual por coordenadas.
3. `ocr.swift` / `ocr_scans.py`: reconocimiento local de la resolución escaneada.
4. `extract_history.py`, `extract_ocr.py`: extracción y correcciones.
5. `build_rules.py`: reglas versionadas 2027.
6. `build_history.py`: CSV, consolidación, sectores y controles; al terminar reaplica `enrich_history.py` para conservar el enriquecimiento. Este último también puede ejecutarse por separado a partir de `history.json` y las fuentes descargadas.
7. Las migraciones SQL versionadas cargan los datos en Supabase; no volver a generar nuevas migraciones para repetir una carga sin revisar la historia aplicada.

No se incluyen solicitudes privadas, contraseñas ni claves secretas.

## Previsión 2027 y CSV editables

`demanda_historica.csv`, `escenario_2027.csv` y `solicitudes_simuladas_2027.csv` están registrados como entradas activas en el catálogo de CBI. Administración → Datos y muestras → PAIP permite editar, guardar versiones y publicarlas. La página carga la versión publicada después de validar acceso; sin versión publicada usa el original del repositorio. Se conserva el historial de cambios y se puede volver al original. El simulador de reunión no guarda solicitudes; los borradores previos de Supabase permanecen intactos.

La previsión considera expedientes únicos de TDI-FEDER, excluyendo anulaciones, pero incluyendo desistimientos, no elegibles y renuncias como demanda presentada: 445 en 2023, 494 en 2024, 351 en 2025 y 290 en 2026. Pesos 1, 2, 3, 4 (10 %, 20 %, 30 %, 40 %). Media = 364,6; incremento del 5 % = 382,83; resultado redondeado final = **383 solicitudes**. El crecimiento se aplica a la media ponderada, no al dato de 2026. IDIS-REACT no calibra la previsión.

Es una proyección puntual con supuestos editables, no un intervalo estadístico, ni demanda monetaria, ni una población de solicitudes reales. El simulador competitivo adicional usa estos supuestos para producir poblaciones ilustrativas, cortes y frecuencias condicionadas, descritos en `cbi/docs/paid-aragon.md`. El crédito del escenario es independiente de la demanda prevista. Los importes concedidos no representan por sí solos todos los importes solicitados. Si un CSV publicado tiene años duplicados, pesos inválidos o supuestos incompatibles, la página muestra un error y no presenta una previsión engañosa.


## Ampliación documental FEDER · 20/11/2026

Se incorporan **1.489 referencias**: 1.045 operaciones del programa 2014–2020 (años 2017–2022) y 444 registros de proyectos del programa 2021–2027 (convocatorias TDI 2023–2025). Los registros de proyectos pueden compartir operación; no son nuevas concesiones PAIP.

Fuentes oficiales conservadas con hash:

- `sources/feder-aragon-2014-2020-20250529.pdf`, actualizado 29/05/2025; cada operación conserva su página.
- `sources/feder-aragon-2014-2020.xlsx`, versión 07/03/2024, respaldo de consulta. La extracción principal utiliza el PDF más reciente.
- `sources/feder-aragon-2021-2027-20261001.json`, respuesta pública del listado Artículo 49 de Fondos Europeos, actualizado 01/10/2026. `feder-aragon-2021-2027-query.json` conserva la consulta de Aragón, sin credenciales.
- `sources/feder-aragon-indicadores-20261001.json`: indicadores publicados por operación, con nombre, unidad, objetivo y logro declarado. No se suman al repetirse por régimen ni se interpretan ceros como resultados definitivos.

| Convocatoria | Fichas con descripción y localización del proyecto | NIF contrastado | Otras actuaciones de empresa |
|---|---:|---:|---:|
| 2021 | 132 | 39 | 104 |
| 2022 | 169 | 65 | 193 |
| 2023 | 158 | 166 | 219 |
| 2024 | 103 | 111 | 216 |
| 2025 | 71 | 111 | 169 |
| 2026 | 0 | 71 | 146 |

Las columnas cuentan expedientes y pueden solaparse. No son números de empresas únicas. En 2026 no se publica descripción actual en las fuentes FEDER consultadas; las actuaciones de otros años se presentan exclusivamente como referencias de la empresa.

**Criterio de enlace:** coincidencia exacta de denominación normalizada, anualidad y programa, con un único expediente de la empresa en esa anualidad. En IDIS-REACT se exige además conciliar la suma de costes de operaciones con la ayuda publicada (tolerancia 1 €). Para TDI, la anualidad procede del código de proyecto FEDER `TDI2023…`, `TDI2024…` o `TDI2025…`; el número posterior **no es el número de expediente**. Los costes FEDER permanecen separados; se indica si concilian o no con la ayuda.

**Incidencias del origen reciente:** en 175 de 444 registros el campo de beneficiario y el nombre de la operación no coinciden tras normalización. Se conserva el dato original y una advertencia. En esos casos solo se puede enlazar por el nombre de la operación y la anualidad; el NIF de la fila se descarta. Los NIF se propagan a otras anualidades únicamente con denominación coincidente y un único NIF confirmado. Los identificadores `ES…` de beneficiarios FEDER nunca se utilizan como NIF.

`operaciones_feder_2017_2022.csv`, `operaciones_feder_2023_2025.csv` y `cobertura_enriquecimiento.csv` permiten revisar la ampliación. Los expedientes incluyen campos simples de descripción, municipio, provincia, fechas, NIF y un objeto `enrichment` con actuaciones vinculadas, referencias separadas, método y fuentes. Los municipios recientes no se deducen de las descripciones: si solo consta provincia, el municipio queda vacío.

Los históricos y las referencias se registran en **Datos y muestras** como archivos de consulta y edición de copias. Guardar una versión de estos archivos no reconstruye automáticamente el JSON ni los registros históricos de Supabase. Los dos CSV activos de previsión 2027 mantienen su funcionamiento publicado.

Los NIF incorporados son de entidades. Se omiten identificadores fiscales de personas físicas de las respuestas archivadas, manteniendo las posiciones de los diccionarios. `sources/feder-redactions.json` y el inventario conservan el hash original y describen el tratamiento; el hash principal verifica el archivo disponible.


## CSV completo y corte simulado 2027

`solicitudes_simuladas_2027.csv` contiene **383 solicitudes sintéticas**, con las no admisibles incluidas. Cada fila publica su identificador, ejercicio, tipo simulado, nombre ficticio, admisibilidad, puntuación, ayuda solicitada, orden de desempate y referencia histórica (año, expediente, estado, imputación y fuente). No son empresas que hayan presentado solicitud en 2027.

`demanda_historica.csv` mantiene la previsión ponderada (pesos 1–4) e incremento del 5 %; `escenario_2027.csv` conserva los parámetros, incluido el crédito. El CSV completo se construye con esos supuestos y semilla 20261120 mediante `node scripts/paid-aragon/build_simulation.mjs`, que reutiliza el parser CSV de la aplicación. Ese comando sustituye el original del repositorio, no las versiones compartidas por usuarios.

Para generar las filas se muestrean expedientes no anulados de TDI-FEDER 2023–2026 según los pesos. Se conserva la proporción muestreada de no admisibles, desistidas y renuncias; estas filas tienen un importe solicitado hipotético, pero no reciben ayuda en el reparto. Las puntuaciones de admitidas se normalizan a 425 con máximos de origen 415 (2023) y 425 (2024–2026), redondeando a dos decimales. La ayuda solicitada sintética parte de concesión más parte pendiente, con mediana anual para importes desconocidos y límites 4.000–500.000 €. `importe_imputado` identifica el uso de mediana. Estas transformaciones no alteran los históricos.

**Reparto y corte:** la página toma las filas del CSV publicado, o el original si no existe versión publicada. Ordena las admisibles por puntuación descendente y después por `orden_desempate` ascendente. Concede el importe íntegro de cada una mientras quepa en el crédito; la primera que no cabe detiene el reparto, sin saltar a solicitudes de menor puntuación. El corte es la puntuación de la última financiada de **esa misma población visible**, nunca una mediana de poblaciones distintas. Si no se financia ninguna, no se inventa un corte. Este reparto es un supuesto sin ampliaciones ni financiación parcial, no un resultado administrativo.

En el original, antes de añadir el proyecto de la reunión: **383 filas, 316 admisibles, 77 financiadas, 220 puntos de corte, 10.024.017 € asignados y 1.141,50 € de crédito restante**. La comprobación independiente vuelve a repartir todos los importes y verifica estos totales.

Al introducir una ayuda propia calculable, el proyecto sustituye la última fila sintética; las competidoras conocidas sustituyen otras filas. El total de solicitudes se conserva. Nada de la reunión se guarda en el CSV ni en Supabase. Los cambios de puntuación, importe, competidoras o crédito recalculan el corte. Los empates también dependen del orden simulado; compartir la puntuación de corte no garantiza financiación.

La frecuencia de aprobación usa 1.000 escenarios: el primero es el CSV visible, y los otros 999 remuestrean su distribución de admisibilidad, puntuaciones e importes. Si cambia el número previsto de solicitudes y deja de coincidir con las filas del CSV, se remuestrea la base hasta el nuevo volumen; no se mezclan poblaciones de tamaños distintos. Los pesos históricos ya están incorporados en la generación original: para cambiar también esa composición se regenera el CSV con los nuevos pesos. Una edición publicada de sus puntuaciones/importes alimenta directamente los gráficos en la siguiente carga. Los resultados de financiación se calculan; no se leen de columnas editables que puedan quedar obsoletas.

## Régimen por concepto de gasto

La interfaz solicita un único importe por fila y un interruptor **Minimis / RGEC** para ese concepto. Apagado asigna el importe íntegro a minimis; encendido lo asigna íntegramente a RGEC. Los cinco conceptos de las categorías publicadas pueden combinar regímenes dentro de la misma simulación. Al accionar un interruptor se conserva el importe y solo cambia su asignación, intensidad y ayuda; no se duplica ningún coste ni se convierte el exceso de minimis automáticamente a RGEC.

Las ayudas calculadas de los conceptos minimis comparten un único margen de la empresa única. Solo se pide minimis previo cuando existe presupuesto asignado a ese régimen. Las condiciones RGEC y el efecto incentivador se exigen cuando hay importe positivo asignado a RGEC. Se mantienen los límites por categoría, tamaño/zona, acumulación y ayuda total.

El apartado I.3 de la orden (página 9) permite dos tramos sobre conceptos distintos, sin aplicar dos regímenes al mismo gasto. La explicación está en el desplegable del presupuesto. El motor utiliza `costMode: per_concept` y un par `amount`/`regime` por concepto; conserva compatibilidad con evaluaciones anteriores que utilizaran un régimen general o importes separados por régimen. El simulador de reunión sigue sin guardar solicitudes.


## Pestañas 2017–2026 y selección sectorial conjunta

El histórico muestra las diez anualidades, una pestaña **Todos desde 2017** y la selección **Fertilizantes y nutrición animal**. El conjunto reúne **2.633 registros disponibles**: 2.323 expedientes PAIP y 310 operaciones FEDER de cobertura parcial para 2017–2020. El contador distingue ambos tipos; la denominación de vista conjunta no afirma un censo completo de todos los solicitantes desde 2017.

| Anualidad | Operaciones recuperadas | Fertilizantes y nutrición animal |
|---|---:|---:|
| 2017 | 22 | 1 |
| 2018 | 94 | 5 |
| 2019 | 90 | 3 |
| 2020 | 104 | 1 |

Las diez incorporaciones sectoriales son cuatro de fertilizantes (tres de Arvensis y una de Defeder) y seis de nutrición animal (producción/ensacado de piensos y deshidratado de alfalfa). Los cruces corporativos reutilizan las reglas existentes. Las clasificaciones por proyecto se limitan al código de operación de `scripts/paid-aragon/legacy-sector-overrides.json`, con descripción oficial y evidencia. No se etiqueta automáticamente toda actividad de una cooperativa como nutrición animal. La maquinaria para aplicar abonos y los medicamentos veterinarios no se clasifican por esas palabras como fertilizantes o alimentación animal.

Las fichas antiguas muestran descripción, municipio/provincia, fechas, coste de operación, cofinanciación y fuentes. Los campos `granted_amount`, `eligible_budget` y `score` permanecen nulos. Las operaciones no entran en el porcentaje de concesión, las medias/cortes, el mapa/composición de resultados PAIP ni la suma de ayudas. En una anualidad antigua, sin datos de concesión publicados, el indicador de ayuda muestra «—», no cero.

`legacy-history.json` conserva la copia de consulta. Los registros se almacenan separadamente en `public.paid_aragon_legacy_operations` con RLS y permiso de lectura para miembros activos con acceso a PAID-ARAGON. El navegador comprueba su recuento y puede usar la copia versionada si Supabase no está disponible. No se incorporan como nuevas concesiones a `paid_aragon_awards`.

Se generan `historico_2017.csv` … `historico_2020.csv`, `todos_registros_2017_2026.csv` y la selección sectorial ampliada. Se registran en Datos y muestras como archivos de consulta/edición de copias. Para reproducirlos: `python3 scripts/paid-aragon/build_legacy.py`; `enrich_history.py` lo ejecuta al terminar, por lo que una reconstrucción completa no borra la ampliación. Los campos compuestos se conservan en JSON dentro de los CSV.
