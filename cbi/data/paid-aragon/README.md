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
- `sectores_prioritarios.csv`: fertilizantes/nutrición vegetal y nutrición animal, incluyendo los indicios señalados como tales.
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

`demanda_historica.csv` y `escenario_2027.csv` están registrados como entradas activas en el catálogo de CBI. Administración → Datos y muestras → PAIP permite editar, guardar versiones y publicarlas. La página carga la versión publicada después de validar acceso; sin versión publicada usa el original del repositorio. Se conserva el historial de cambios y se puede volver al original. El simulador de reunión no guarda solicitudes; los borradores previos de Supabase permanecen intactos.

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
