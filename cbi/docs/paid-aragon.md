# PAIP Aragón · TDI-FEDER

Panel: `cbi/interfaces/paid-aragon-dashboard.html`. Se conserva el código de acceso y las rutas `PAID-ARAGON` / `paid-aragon-*` creadas inicialmente para no romper asignaciones existentes. La denominación visible oficial es PAIP.

## Solicitud 2027

Fuente principal: **Orden ECE/1624/2026, de 26 de octubre**, BOA de 10 de noviembre de 2026, CSV BOA20261110018:
https://www.boa.aragon.es/cgi-bin/EBOA/BRSCGI?CMD=VEROBJ&MLKOB=1474139920505&type=pdf

- Solicitudes: 11/11/2026–15/01/2027, ambos incluidos.
- Actuaciones elegibles: 01/07/2026–30/06/2027.
- Crédito inicial: 10.025.158,50 €. La ampliación prevista de hasta 6.000.000 € es eventual, no crédito garantizado.
- Ayuda ordinaria por solicitud: mínimo 4.000 €; máximo 500.000 €, sin perjuicio de los supuestos del apartado XI.6.
- **15 criterios binarios a–o, máximo 425 puntos**. Cada criterio puntúa completo o cero. No existe una nota de corte oficial de 2027; la simulación muestra cortes y frecuencias de financiación bajo supuestos explícitos. Desempate por fecha y hora de presentación.
- La guía está incorporada como anexo III de la propia orden (páginas 71–80); no se utiliza la guía 2026 para puntuar 2027.

### Modelo de elegibilidad y ayuda

`cbi/data/paid-aragon/rules-2027.json` contiene la versión, las fuentes por criterio y los requisitos. `paid-aragon-model.js` es el motor determinista compartido con las pruebas.

Los requisitos tienen tres estados: cumple, no cumple y pendiente. No se da por superado lo que falta por comprobar. Se revisan localización y actividad, constitución, solvencia, prohibiciones/crisis/recuperación, obligaciones tributarias, exclusiones sectoriales, proyecto no concluido antes de solicitar, no duplicidad PAIP, convocatoria energética específica, gastos, empleo, documentación y morosidad. Las condiciones de crisis y exclusiones con excepciones se confirman mediante revisión documental, no mediante un diagnóstico automático.

La calculadora toma **costes ya depurados por el usuario** en cinco categorías, una sola vez, con un interruptor minimis/RGEC en cada concepto. No es un clasificador automático de facturas. Aplica las intensidades publicadas por tamaño y zona, margen de minimis de la empresa única (300.000 € en periodo móvil de tres años), máximo ordinario y límite agregado del 80 % menos otras ayudas sobre los mismos costes. No reasigna automáticamente a RGEC el exceso de costes de minimis. La acumulación también requiere comprobar los límites específicos por coste/régimen; una alerta lo indica.

Para RGEC exige inicio posterior a la solicitud o pre-solicitud válida anterior al inicio y confirmación de las condiciones específicas de ese régimen. La comprobación por fecha es conservadora si ambos eventos ocurren el mismo día: se debe acreditar su orden y hora documental. Grandes empresas deben acreditar además el efecto incentivador adicional y las condiciones de inversión inicial/diversificación que procedan.

En modo reunión, los criterios suman por declaración de cumplimiento, sin exigir redacción de evidencias. El modo previo del motor para evaluaciones documentadas conserva la exigencia de evidencia. El motor impide puntuar tamaño pequeño para empresas medianas/grandes y antigüedad joven cuando no procede; calidad documental requiere documentación confirmada; en el modo documentado exige además evidencias de los méritos alegados. No comprueba la autenticidad de archivos ni sustituye la evaluación administrativa.

La interfaz es una calculadora efímera para reunión: no pide empresa, título, descripción, ejercicio o provincia redundante, no lee ni guarda borradores y no escribe datos de simulación en Supabase ni en almacenamiento local. Se conservan los borradores existentes en la base sin modificarlos.

## Históricos

Ver `cbi/data/paid-aragon/README.md` para estructura, alcance y conciliación. Los CSV de origen y consolidados se generan antes de la carga a Supabase. El panel carga todos los registros por páginas de 500; no usa el límite de 200 filas de la maqueta inicial. Los filtros, gráficos y tabla paginada trabajan sobre el mismo conjunto de datos. Los CSV se gestionan desde su página de datos.

El origen principal es Supabase. Si la consulta falla o la carga está incompleta respecto al inventario, usa la copia JSON de los CSV versionados y lo anuncia expresamente en pantalla. Los datos históricos son públicos; los borradores privados no se guardan en archivos versionados.

Se muestran KPIs, importes por año, resultados y dispersión puntuación/ayuda. Filtros por año, línea, estado, búsqueda y ordenación. Fertilizantes y nutrición animal forman una pestaña independiente que reúne 39 registros desde 2017: 29 expedientes PAIP y 10 operaciones FEDER antiguas. Los baremos cambian entre convocatorias; la dispersión identifica esa limitación y no sirve de corte predictivo de 2027.

## Verificación

- Pruebas deterministas: fechas y límites incluidos/excluidos, mínimo antes del redondeo, margen de minimis, tope de 500.000 €, acumulación del 80 %, zonas/tamaños RGEC, pre-solicitud, evidencias y empresa joven/pequeña.
- Verificación de lectura histórica y guardado JSON bajo rol `authenticated` en Supabase, con transacción revertida para no conservar pruebas.
- Asesor de seguridad: sin avisos de las tablas nuevas. Persiste el aviso global previo sobre protección frente a contraseñas filtradas desactivada; no se cambió la configuración de autenticación.
- Prueba de navegador superada: autenticación simulada, 15 criterios, cálculo de ayuda, modo reunión sin persistencia, puntuación por declaración, simulación de 1.000 escenarios, fichas con detalle por resolución, pestaña sectorial agregada, paginación, filtros y CSV publicados y ausencia de desbordamiento de página en móvil. Revisión visual de escritorio y móvil completada.
- El navegador de prueba utiliza sesión y respuestas simuladas; la base real se comprueba por separado mediante consultas con RLS.

Las migraciones se generaron con el flujo alternativo de archivos SQL y MCP porque no existe un ejecutable Supabase CLI instalado en este equipo. Las migraciones aplicadas se conservan en Git.


## Simulación competitiva en reuniones

El modelo carga el CSV completo `solicitudes_simuladas_2027.csv`, editable y publicable en Datos y muestras. Incluye las 383 solicitudes previstas por defecto, tanto admisibles como no admisibles. Con una solicitud propia calculable se sustituye la última fila, sin aumentar la demanda; las competidoras conocidas sustituyen otras posiciones. La distribución y el corte se calculan sobre la misma población visible, repartiendo el crédito por puntuación y orden de desempate hasta la primera solicitud que no cabe. El corte se muestra incluso antes de completar la solicitud propia, tomando el escenario base del CSV.

La frecuencia de aprobación usa 1.000 escenarios con semilla 20261120: el primero es la población completa visible y los otros remuestrean el CSV. El indicador de corte del gráfico no mezcla esa población con el corte mediano de los otros escenarios. Si la demanda prevista cambia de tamaño, se remuestrea la base completa al volumen objetivo. Las versiones publicadas de parámetros y de solicitudes se cargan a través del consumidor CSV existente, tras el control de acceso.

Se verificaron en las órdenes archivadas los máximos teóricos de 415 puntos en 2023 y 425 en 2024, 2025 y 2026. La puntuación se escala por la razón 425/máximo anual. Es una hipótesis de comparabilidad, no una reevaluación de los criterios de 2027. Los importes que calibran el CSV son ayuda concedida más importe pendiente, acotados al intervalo simulado 4.000–500.000 €. En 139 expedientes de lista de espera de 2023 sin importe disponible se usa la mediana positiva del año. Las renuncias forman parte de la demanda presentada, pero no compiten por financiación en las poblaciones simuladas. La imputación se identifica en el CSV y en su documentación, y solo afecta la simulación; las fichas conservan los valores publicados.

Se supone concesión íntegra por puntuación hasta agotar el crédito inicial, sin ampliaciones ni financiación parcial. La población visible usa el orden de desempate del CSV; los otros escenarios sortean ese orden al desconocerse las horas de registro futuras. Con elegibilidad pendiente, el porcentaje queda expresamente condicionado a confirmarla; con incumplimientos se fija en cero. Sin importe calculable no se muestra porcentaje. No es una probabilidad oficial ni una predicción validada contra resultados futuros.

Las fichas históricas son accesibles desde el nombre, «Ver ficha» y los puntos del gráfico. Incluyen resultados, motivos, inversión solicitada/preevaluada/subvencionable, concesión, espera, regímenes, clasificación sectorial y detalle de cada resolución con fuente y página. Los datos suplementarios se leen del JSON archivado y del CSV de eventos; los estados y los importes consolidados de Supabase siguen siendo prioritarios. Los anexos revisados no publican de forma homogénea NIF, título ni provincia del proyecto; no se inventan esos campos.


## Elementos incorporados desde AEI e INNOVAE

Histórico (AEI 1, 3, 4, 5): histograma con cursor, media general, media de concesiones y menor puntuación financiada únicamente cuando hay una sola convocatoria/línea. Las barras y celdas del mapa abren el listado del tramo, desde el que se consulta la ficha. Se añaden porcentaje de concesión sobre expedientes no anulados, media financiada y menor puntuación financiada. La vista agregada y la sectorial muestran mapa de calor en tramos de 25 puntos (color proporcional al número de puntuaciones publicadas de cada convocatoria) y composición porcentual de los seis resultados. La composición incluye anulaciones; el indicador de concesión las excluye y lo indica en su etiqueta. No se crea un corte común entre baremos distintos.

Simulador (INNOVAE 1–6): criterios y elegibilidad con botones Cumple / No cumple / Pendiente; presupuesto con campo numérico formateado y deslizador por categoría/régimen; ayuda a solicitar regulable hasta el máximo calculado. Una ayuda solicitada inferior a 4.000 € invalida la financiación del escenario. Los campos numéricos aceptan formato español y conservan céntimos en los costes. El esquema de 425 puntos muestra los quince pesos oficiales, proporcionales en escritorio, y cada segmento abre un cuadro con condición, documentación para acreditarla y enlace a la página de la orden. El círculo utiliza quince colores vivos; admite clic y activación con teclado, con retorno del foco al cerrar el cuadro. Se homogeneizan cabeceras, tarjetas y colores de estado.

Competidoras conocidas: hasta 50, siempre por debajo del total de solicitudes previsto; puntuación 0–425 y ayuda 4.000–500.000 €. Cada competidora sustituye una posición del muestreo original (también puede sustituir una solicitud no admitida), por lo que no aumenta la demanda. Mantiene la misma puntuación e importe en las 1.000 poblaciones; se supone admisibilidad y se sortea su orden en empate con una semilla estable. Se recalculan frecuencia, posición, corte y gráficos; las conocidas se identifican en morado. Añadir y quitar no guarda datos.

Verificación adicional: estadísticos con ausencias y distintas convocatorias, límites de intervalos, sustitución de competidoras y conservación de la demanda, efecto de una competidora de mayor puntuación con crédito limitado, controles directos, ajuste de ayuda, formato de miles, consulta de tramos, composición, mapa y adaptación móvil.


## Ampliación de los históricos

Los 2.323 expedientes conservan sus estados, puntuaciones e importes originales. La nueva columna `paid_aragon_awards.enrichment` contiene las actuaciones FEDER vinculadas y los antecedentes de empresa por separado, con fuentes. Sus campos simples se fusionan en el panel después de cargar Supabase; así se mantienen disponibles también si falla la copia JSON. No cambia RLS ni la autorización de escritura.

Las fichas incorporan descripción, provincia/municipio publicados, fechas, NIF contrastado e indicadores oficiales de las operaciones disponibles. Las referencias de empresa están identificadas como otras actuaciones y no se suman al proyecto ni a las concesiones. Las incidencias de identidad del listado reciente se muestran en la ficha y se excluyen del cruce de NIF. El detalle de cobertura y el método figuran en el README de los datos.

Se retira el bloque superior de fechas/importes del configurador. El esquema de puntuación se muestra en círculo junto al gráfico de ayuda y puntuación, bajo la distribución de la muestra; las fechas se comprueban por declaraciones en Elegibilidad, sin campos de fecha en Proyecto. El presupuesto usa un único coste por concepto y un interruptor minimis/RGEC por fila.


## Disposición de los gráficos y presupuesto · revisión 2027

La distribución ocupa todo el ancho del panel de resultados y no lleva el borde superior oscuro. Debajo, Esquema de puntuación (circular) y Ayuda y puntuación tienen dos columnas de igual ancho y alineación vertical en escritorio. En móvil se apilan. El presupuesto muestra cinco campos de coste, un interruptor minimis/RGEC por concepto y una intensidad actualizada para cada fila. El desplegable explica minimis, RGEC y la posibilidad legal de tramos sobre conceptos distintos. Se mantienen las comprobaciones de margen, localización/tamaño, acumulación y efecto incentivador.


## Navegación histórica desde 2017

Se integran los antecedentes 2017–2020 en las pestañas anuales y en Todos desde 2017, sin duplicar la antigua sección desplegable. La pestaña sectorial reúne también sus diez registros confirmados. La tabla y las fichas mantienen un tipo de registro explícito: las 310 operaciones no aportan puntuación ni importes de ayuda PAIP. Los indicadores financieros y de resultados se calculan únicamente con los 2.323 expedientes consolidados. Para anualidades solo con operaciones se muestran recuentos y datos de ficha, sin interpretar una ayuda desconocida como cero.

La tabla adicional `paid_aragon_legacy_operations` almacena el identificador de operación, año y ficha pública como JSON. Se habilita RLS con el mismo acceso por convocatoria activa que el histórico existente y se revocan escrituras de los roles de cliente. La carga y los CSV están versionados; las escrituras de solicitudes privadas siguen desactivadas en la interfaz.


## Conceptos con regímenes combinados

Los controles del presupuesto guardan en memoria un importe y un régimen exclusivo por fila. La selección general desaparece de la interfaz. El motor suma las ayudas minimis y RGEC de los distintos conceptos, aplicando el margen minimis una sola vez a su suma. Cambiar un interruptor conserva el coste declarado. Los conceptos RGEC activan sus condiciones cuando tienen importe; los conceptos a cero no crean requisitos adicionales. Los casos de prueba verifican mezcla, conservación del presupuesto, límites compartidos y rechazo de regímenes no válidos/no aplicables.
