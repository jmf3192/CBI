# Calibración de la población sintética de solicitudes — INNOVAE subprograma d)

**Búsqueda de fuentes externas para dar valores a las entradas de `simulador_puntuacion.py`.**
Elaborado: 21 de agosto de 2026 · Jorge Moreno (CONASOC)

Este documento no construye la simulación. Recoge lo que se ha encontrado online para calibrar
las cinco entradas del motor, marca qué es dato verificado y qué es estimación, y dice
explícitamente qué no se ha encontrado.

---

## 0. El hallazgo que cambia el método

**La búsqueda de €/kW era el camino equivocado.** Los €/kW nunca fueron el objetivo: eran un
medio para generar pares coherentes de (coste elegible, ahorro). Existe una vía directa que los
hace innecesarios.

Las **notificaciones DECA** del programa de eficiencia energética industrial del IDAE
(RD 263/2019) publican, proyecto a proyecto y con nombre del beneficiario, **inversión elegible
aprobada, ayuda concedida y ahorro en tep/año**. Es decir: publican el numerador y el denominador
de las dos ratios del Anexo 3, en las unidades del Anexo 3, para proyectos reales de sustitución
de frío industrial ya resueltos por el propio IDAE.

De ahí salen **19 proyectos de frío con RPA y RPE calculables** → `Fuentes/rpa_observado_frio.csv`.

Fuente: [IDAE — Notificaciones de proyectos seleccionados para su cofinanciación con FEDER](https://www.idae.es/ayudas-y-financiacion/para-eficiencia-energetica-en-la-industria/concesion-directa-ccaa-de-las-0/notificaciones-de-proyectos-seleccionados-para-su-cofinanciacion-con-feder)

---

## 1. `coste_elegible_eur` — resuelto por la vía de la ratio, no por €/kW

### 1.1 Lo que se ha encontrado: 19 proyectos reales de frío (VERIFICADO)

Extraídos de tres notificaciones DECA (Murcia, Cataluña, Galicia). Cada fila lleva su URL.

| RPA de frío (M€/ktep) | Valor |
|---|---|
| mínimo | 0,62 |
| p25 | 4,79 |
| **mediana** | **8,69** |
| p75 | 12,20 |
| máximo | 15,73 |

| RPE de frío (M€/ktep) | Valor |
|---|---|
| mínimo | 0,18 |
| **mediana** | **1,56** |
| máximo | 3,39 |

Intensidad de ayuda observada sobre inversión elegible: mediana **22,0 %**, rango 11,6 %–30,0 %.

**Advertencia de sesgo.** Estos proyectos se resolvieron bajo el RD 263/2019, que impone un
**tope de ratio económico-energético de 14.379 €/tep** de ahorro anual de energía final — es decir,
**RPA ≤ 14,379 M€/ktep**. La distribución está censurada por arriba: solo uno de los 19 lo supera
(15,73), y los tres siguientes se apilan justo debajo del tope (14,23 · 14,01 · 13,90). Ese
apilamiento es la firma de una restricción activa. **INNOVAE no tiene ese tope.**
Por tanto la cola derecha de la población sintética debe ser **más larga** que la observada aquí,
no igual. Es la corrección más importante a introducir al muestrear.

> El tope de 14.379 €/tep procede del RD 263/2019 y sus modificaciones
> ([BOE-A-2019-5570](https://www.boe.es/buscar/doc.php?id=BOE-A-2019-5570)). Verificarlo contra el
> anexo consolidado antes de citarlo en un entregable a cliente: la cifra se ha tomado de fuentes
> secundarias que reproducen el anexo, no del texto consolidado leído directamente.

### 1.2 Qué implica esto para la escala del Anexo 3

Aplicando la mecánica del Anexo 3 sobre estos 19 proyectos (recorte del 5 %, que con n=19 no
elimina nada porque `int(19·0,05)=0`):

`Rm = 0,62` · `RM = 15,73` · `R = 15,12`

| Tramo | Umbral RPA | Puntos | Proyectos observados |
|---|---|---|---|
| 1 | ≤ 3,64 | 40 | 3 de 19 |
| 2 | ≤ 6,66 | 32 | 5 de 19 |
| 3 | ≤ 9,69 | 24 | 2 de 19 |
| 4 | ≤ 12,71 | 16 | 4 de 19 |
| 5 | > 12,71 | 8 | 5 de 19 |

**Lectura operativa:** un proyecto en la mediana del sector (RPA 8,69) cae en el **tramo 3 → 24
puntos**, no en el 1. Para los 40 puntos hace falta un RPA ≤ 3,64 M€/ktep, esto es, menos de
3.640 € de coste elegible por tep de ahorro anual: **cuatro veces mejor que el tope regulatorio**
del programa industrial. Es un objetivo exigente y conviene dimensionar el expediente sabiéndolo.

### 1.3 Grupo de control: la industria en general (VERIFICADO)

30 proyectos de Murcia, todas las tipologías → `Fuentes/rpa_observado_industria_murcia.csv`.
RPA mediana **10,03**, p75 13,78, máximo 14,32.

**Los proyectos de frío salen mejor que la media industrial** (mediana 8,69 frente a 10,03). Ojo:
esto no ayuda en INNOVAE, porque la escala del subprograma d) se calcula **solo entre proyectos de
frío**. La ventaja relativa del frío desaparece cuando todos los competidores son de frío.

### 1.4 €/kW: encontrado parcialmente, y sirve para otra cosa (VERIFICADO, con reservas)

**La tarifa de precios de Carrier 2025 sí publica PVP junto a potencia frigorífica en kW.** Es la
primera fuente localizada que da las dos cosas a la vez para equipos de gama alta.
→ `Fuentes/precios_equipo_eur_kw.csv` · [Tarifa Carrier 2025](https://www.carrier.com/commercial/es/es/media/carrier-tarifa-de-precios-2025-es_tcm205-183571.pdf)

| Gama | Refrigerante | PCA | ¿Elegible INNOVAE? | Rango | €/kW |
|---|---|---|---|---|---|
| Carrier 61AQ | R-290 | 3 | **Sí** (PCA < 150) | 32–105 kW | 938 → 660 |
| Carrier 30RB-R | R-32 | 675 | No | 42–81 kW | 583 → 403 |

Curvas de escala ajustadas: R-290 `coste = 2.437 · kW^0,728` · R-32 `coste = 4.103 · kW^0,465`.

**Tres reservas, y ninguna es menor.** Son PVP de tarifa, sobre los que en España se aplican
descuentos de distribución habituales del 25–45 %. Son equipos desnudos: no incluyen montaje,
tuberías, ingeniería, obra civil ni puesta en marcha. Y son enfriadoras de agua, no centrales
frigoríficas industriales de NH₃ o CO₂ transcrítico, que es lo que INNOVAE espera. **No usar estos
€/kW como coste de proyecto.**

### 1.5 Lo que sí resuelve este dato: la inversión de referencia del art. 38.8

Aquí está el valor real del hallazgo, y no es el que se buscaba.

El §7 del contexto plantea una decisión sin resolver: si la inversión de referencia supera el 50 %
del coste elegible, conviene la vía del art. 38.8 RGEC (sin hipótesis de contraste, a mitad de
intensidad); si no, conviene acreditar el contraste. Faltaba el número.

Las dos gamas de Carrier son el mismo fabricante, el mismo año y la misma tarifa, y solapan entre
42 y 81 kW. En esa franja —**la única donde la comparación es legítima**— el equipo de refrigerante
natural cuesta un **77 % más** de media que su equivalente HFC:

| Potencia | R-290 (elegible) | R-32 (referencia) | Sobrecoste | Referencia / elegible |
|---|---|---|---|---|
| 45 kW | 38.961 € | 24.131 € | 61,5 % | **61,9 %** |
| 55 kW | 45.091 € | 26.493 € | 70,2 % | **58,8 %** |
| 65 kW | 50.923 € | 28.636 € | 77,8 % | **56,2 %** |
| 75 kW | 56.516 € | 30.608 € | 84,6 % | **54,2 %** |
| 81 kW | 59.773 € | 31.724 € | 88,4 % | **53,1 %** |

**La inversión de referencia se sitúa en el 53–62 % del coste elegible, por encima del umbral del
50 %.** A nivel de equipo, y solo a nivel de equipo, **la vía del art. 38.8 da más ayuda**.

Ahora bien, esto no cierra la decisión, porque en un proyecto real el equipo es la mitad o menos de
la inversión, y los capítulos de obra, tubería e ingeniería tienen un sobrecoste natural/HFC mucho
menor. Al diluirse el sobrecoste sobre el total, la proporción de la inversión de referencia sube y
el argumento se refuerza. Pero hay que hacerlo con el presupuesto real del proyecto.

**Aviso de contraste entre fuentes.** Una fuente sectorial estadounidense sitúa el sobrecoste de los
sistemas de amoniaco en el [15–25 % sobre el HFC equivalente](https://irpros.com/ammonia-vs-co2-vs-hfc-choosing-the-right-refrigerant-for-your-industrial-facility/),
muy por debajo del 77 % medido aquí. La divergencia es explicable y conviene retenerla: las
enfriadoras compactas de R-290 cargan una prima grande por el envolvente de seguridad que exige un
refrigerante inflamable en equipo empaquetado, mientras que en una planta industrial de NH₃ el
sobrecoste dominante es el de materiales de tubería sobre una base de coste mucho mayor. **Para un
proyecto industrial de NH₃, la cifra del 15–25 % es probablemente más representativa que el 77 %.**
Modelizar con ambos extremos y reportar el rango.

### 1.6 Comprobación cruzada: las dos vías coinciden

Extrapolando la curva del R-290 a 300 kW frigoríficos —el orden de magnitud de un proyecto con
≥100 kW eléctricos de compresores— y aplicando un factor de llave en mano de 2,0 a 2,5 sobre el
equipo, sale una inversión de **310.000 a 388.000 €**.

La mediana de inversión elegible observada en los 19 proyectos DECA de frío es **312.900 €**.

Las dos rutas, construidas con fuentes independientes y métodos distintos, caen en el mismo orden
de magnitud. Es la primera validación externa que tiene la calibración del coste elegible, y da
confianza razonable en la distribución de RPA del §1.1.

### 1.7 Lo que sigue sin encontrarse (NO ENCONTRADO)

Confirmados los callejones sin salida ya conocidos. Se añaden estas comprobaciones nuevas:

- **Tarifas de fabricante de centrales industriales NH₃ y CO₂ transcrítico.** Buscadas listas de
  precios y *listini* de Rivacold, Zanotti, Frascold, Madefrigor y Frigoveneta: publican catálogos
  técnicos completos con kW, pero **ningún precio**. El segmento industrial trabaja íntegramente
  por presupuesto a medida.
- **Tarifa PVP de Salvador Escoda**, el mayor distribuidor español de frío comercial e industrial:
  contiene precios reales, pero de **componentes sueltos** —válvulas, detectores de fuga, controles—
  sin potencia de sistema asociada. Sirve para auxiliares de seguridad (que sí son elegibles según
  el webinar), no para el equipo principal.
- **Casos de éxito con presupuesto.** Verificado el caso Cofrico de planta multitemperatura NH₃/CO₂
  en Andalucía: da 3 MW frigoríficos, 2,2 MW recuperados y el detalle de compresores, **y ningún
  euro**. El patrón del sector se confirma.

- **TED / Plataforma de Contratación por CPV** (42513000, 42513200, 45331231). No se ha localizado
  ningún expediente español que publique simultáneamente importe de adjudicación **y** potencia
  frigorífica en kW. Los anuncios dan importe; los kW viven en el pliego técnico, que hay que
  descargar uno a uno. Sigue siendo la tarea 10 del contexto.
- **contratos.gobierto.es** requiere cuenta de pago para el buscador. No utilizable.
- **Pliegos técnicos con presupuesto desglosado y kW.** No localizado ninguno por búsqueda abierta.
  Siguen habiendo que abrirse uno a uno desde el perfil del contratante de cada expediente.
- **CYPE**, páginas estáticas de partida (el configurador sigue con captcha):
  - ICV042, equipo aire-agua 4,8 kW frigoríficos → 4.938,36 € = **1.029 €/kW**
    ([fuente](https://generadordeprecios.info/obra_nueva/Instalaciones/IC_Calefaccion__refrigeracion__cl/ICV_Unidades_centralizadas_para_ca/ICV042_Equipo_aire-agua__bomba_de_calor_ae.html))
  - ICV025, 5,75 kW → 906 €/kW (ya recogido en `contratos_frio_terciario.csv`)

  Ambos son equipos domésticos. Sirven como **techo del rango para equipos pequeños** y confirman
  el orden de magnitud, nada más. No son extrapolables a una central industrial de >100 kW
  eléctricos, donde el coste unitario cae con el tamaño.

**Recomendación: dejar de buscar €/kW.** El simulador no los necesita. Muestrear directamente
pares (coste elegible, ahorro) desde la distribución de RPA observada, y usar el coste elegible
para fijar la escala absoluta del proyecto.

---

## 2. `ahorro_kwh_ano` — dataset CAE procesado y contraste externo

### 2.1 Distribuciones de las cinco fichas de frío (VERIFICADO)

Se ha completado la laguna que señalaba el §13 del contexto: **faltaban las tres fichas
industriales**. Ya están → `Fuentes/cae_ahorro_fichas_frio.csv`.

Filtro aplicado: ahorro ≥ 120 MWh/año, que es el suelo aproximado compatible con los excluyentes
de INNOVAE (≥100 kW eléctricos de compresores operando 4.000–6.000 h/año, con ahorro >20 %).

| Ficha | n total | n ≥120 MWh | p25 (ktep) | mediana (ktep) | p75 (ktep) | p90 (ktep) |
|---|---|---|---|---|---|---|
| IND020 Sustitución de refrigerante | 8 | 2 | — | — | — | — |
| **IND030 Sustitución de compresores** | 87 | 80 | 0,0430 | **0,0760** | 0,1415 | 0,2327 |
| **IND150 Central frigorífica alta eficiencia (ind.)** | 143 | 118 | 0,0319 | **0,0687** | 0,1513 | 0,4224 |
| TER140 Planta enfriadora de procesos | 32 | 22 | 0,0154 | 0,0281 | 0,0648 | 0,1395 |
| TER150 Central frigorífica alta eficiencia (terc.) | 205 | 75 | 0,0124 | 0,0165 | 0,0232 | 0,0490 |

**IND030 es la ficha que mejor describe la actuación objetivo de INNOVAE** (sustitución de
compresores). El 92 % de sus registros supera el umbral de 120 MWh/año — es decir, casi toda la
población CAE de esa ficha sería, por tamaño, elegible en INNOVAE.

El reparto territorial de las tres fichas industriales (269 registros) concentra en Murcia (34),
Galicia (29), Castilla y León (28), Comunitat Valenciana (26), Andalucía (25) y Cataluña (25).
Mapa de competidores probable: **eje agroalimentario mediterráneo + cornisa noroeste**.

### 2.2 Contraste externo (VERIFICADO, parcial)

El contraste pedido lo dan las propias notificaciones DECA, que declaran ahorro en tep/año para
proyectos de frío reales. Convertidos a ktep, los 19 proyectos van de **0,0069 a 0,1525 ktep/año**
(mediana **0,0315**). Es **menor** que la mediana de IND030 (0,0760) porque los proyectos DECA
incluyen actuaciones parciales, no solo sustitución completa de central.

**Conclusión de calibración:** usar IND030 e IND150 como distribución de referencia para el
arquetipo industrial, y TER140/TER150 para el terciario. La cola alta de IND150 (máximo 1,70 ktep,
19,8 GWh) marca el techo realista de un solo proyecto.

### 2.3 Advertencia sobre la convención de ahorro (SIN RESOLVER)

El dataset CAE no documenta explícitamente si el ahorro declarado es anual o de vida útil. El
§12 del contexto ya concluye, con buenos argumentos, que INNOVAE es **anual**. Si el CAE fuera de
vida útil, las cifras de arriba estarían infladas por un factor de 10–15 y el denominador del RPA
sería erróneo. **Hay que verificarlo en el catálogo de fichas del MITECO antes de usar estas
distribuciones en un entregable.** El orden de magnitud observado (mediana 845 MWh/año para
IND030) es compatible con lectura anual para una instalación industrial media, lo que apoya la
lectura anual, pero no es prueba.

---

## 3. Número de solicitudes — el benchmark IDAE desmonta la hipótesis de sobresuscripción

→ `Fuentes/benchmark_convocatorias_idae.csv`

### 3.1 Lo verificado

| Convocatoria | En tablas | Concedidas | Lista de reserva | Máx | Corte | Mín publicada |
|---|---|---|---|---|---|---|
| [H2 Valles 1ª](https://sede.idae.gob.es/sites/default/files/documentos/2025/Hidrogeno/H2%20Valles/h2cluster_prop_resol_definitiva_adjudicacion_v04.pdf) | 17 | 7 | 4 | 76,27 | **63,59** | 36,85 |
| [CE IMPLEMENTA 6ª](https://sede.idae.gob.es/sites/default/files/documentos/2025/CE%20Implementa/CE%20Implementa%205%20y%206/cei_pilotos_06_prop_resol_provis_adjudicacion_firmado.pdf) | 42 | 9 | **0** | 96,00 | — | 38,20 |
| [MOVES FLOTAS PLUS 1ª](https://sede.idae.gob.es/sites/default/files/documentos/2026/MOVILIDAD/MOVES_FLOTAS_PLUS/_423_resol_adjudicacion_moves_flotas_plus_dgpem.pdf) | 24 | 20 | **0** | 72 | — | 21 |
| [HIALMAC 1ª](https://sede.idae.gob.es/sites/default/files/2024-02/HIALMAC_Resolucion_Definitiva.pdf) | **266** | 36 | ND | 55,47 | ND | 25,13 |

### 3.2 Los tres patrones que importan

**(a) La sobresuscripción no es la norma; es la excepción, y depende del tipo de beneficiario.**
HIALMAC recibió 266 solicitudes para 150 M€ — [siete veces el importe
disponible](https://energiaestrategica.es/el-idae-otorga-150-millones-e-en-ayudas-para-38-instalaciones-innovadoras-de-almacenamiento/) —
porque el promotor típico era un desarrollador de renovables con proyecto en cartera. En cambio
**CE IMPLEMENTA 6 y MOVES Flotas Plus no agotaron presupuesto**: en ambas, la tabla de "admitidas
para las que no se propone la concesión" estaba **vacía**. Todo el que superó admisibilidad cobró.

**(b) Donde no hay sobresuscripción, el cuello de botella es la admisibilidad, no la puntuación.**
CE IMPLEMENTA 6: **9 concedidas de 42 expedientes** = 21 % de tasa de admisión. Los motivos son
casi siempre documentales (poderes de representación, estatutos registrados, censo de empresarios,
obligaciones tributarias), no técnicos. MOVES Flotas Plus, con beneficiarios empresariales, sube
al 83 % (20 de 24, y 2 de las 4 bajas fueron renuncias).

Para INNOVAE d), cuyos beneficiarios son empresas industriales con asesoría, el rango razonable de
admisibilidad es el de MOVES Flotas Plus, **75–85 %**, no el de las comunidades energéticas.

**(c) La dispersión de puntuaciones es enorme y la cola baja es densa.** MOVES Flotas Plus
concedió desde 72 hasta **21 puntos**. En su criterio 1 —también una escala por tramos— **12 de 20
adjudicatarios cayeron en el tramo mínimo**. Esto es directamente transferible: **hay que esperar
que buena parte de los competidores caiga en los tramos 4 y 5 del RPA**, no una distribución
centrada.

### 3.3 Los tres escenarios propuestos (ESTIMACIÓN)

Anclas: 25 M€ de dotación · ayuda máxima 2 M€ · coste elegible mínimo 100.000 € · ~150 convocados
al webinar de frío · incompatibilidad CAE.

Con la intensidad mediana observada (22 %) y la ayuda mediana implícita de la población de frío,
una solicitud tipo pediría del orden de 100.000–300.000 € de ayuda. Los 25 M€ dan para **80–250
expedientes** si nadie pide el máximo.

| Escenario | Solicitudes presentadas | Admitidas (80 %) | Razonamiento |
|---|---|---|---|
| **BAJO** | 40 | 32 | La incompatibilidad CAE muerde fuerte. Patrón CE IMPLEMENTA 6 / MOVES Flotas Plus: no se agota el presupuesto y el corte lo fija el mínimo de 50 puntos, no el presupuesto |
| **CENTRAL** | 110 | 88 | Del orden de los ~150 convocados al webinar, con abandono. Sobresuscripción ligera. El corte se sitúa por encima de 50 |
| **ALTO** | 260 | 208 | Patrón HIALMAC. Sobresuscripción de 3–7×. Corte alto |

**El escenario BAJO no es un escenario pesimista: es el modal en las convocatorias IDAE recientes
que no van dirigidas a promotores de renovables.** Y tiene una consecuencia perversa que el §12 ya
anticipa: por debajo de **20 solicitudes admitidas** el recorte del 5 % del Anexo 3 no elimina
nada, y un único expediente con convención de ahorro distinta puede desplazar toda la escala. Con
32 admitidas en el escenario BAJO estamos justo por encima del umbral, pero sin margen.

---

## 4. `categoria_innovacion` — no hay dato público (NO ENCONTRADO)

**Ninguna resolución del IDAE publica el reparto de proyectos por grado de innovación.** Las tablas
publican la puntuación por criterio, no la categoría cualitativa. Y el Anexo 3 de INNOVAE es el
primer texto que introduce esta taxonomía de cinco niveles (sin / baja / incremental / intermedia
/ disruptiva), así que no hay precedente del que extraer una distribución.

Lo único aprovechable son dos indicios indirectos, y son débiles:

- **La CTV es dura y conservadora al puntuar.** En H2 Valles, **5 de 17 expedientes fueron
  desestimados por no alcanzar el mínimo en criterios técnicos excluyentes**, incluidos proyectos
  con 64,31 y 61,71 puntos totales. Un expediente puede ir bien en todo y morir en el criterio
  técnico.
- **Las alegaciones sobre puntuación técnica casi nunca prosperan.** En H2 Valles, las
  estimaciones parciales movieron entre 0,25 y 0,8 puntos sobre 100. En HIALMAC el patrón se
  repite. **Alegar contra la valoración de innovación no es una estrategia de recuperación.**

**Propuesta (JUICIO EXPERTO, no dato):** dado que INNOVAE excluye "sin innovación" y que la
sustitución de frío por NH₃ o CO₂ es tecnología madura y disponible en el mercado —la propia
definición literal de "baja innovación" del Anexo 3— el reparto realista es sesgado hacia abajo:

| Categoría | Peso propuesto | Justificación |
|---|---|---|
| baja (0–5) | 45 % | Sustitución directa por refrigerante natural con equipo de catálogo |
| incremental (5–10) | 35 % | Sustitución + recuperación de calor, control avanzado o integración de proceso |
| intermedia (10–18) | 17 % | Arquitectura sustancialmente modificada, barrera tecnológica acreditada |
| disruptiva (18–25) | 3 % | Excepcional |

Esto es una hipótesis de trabajo. Debe entrar en el simulador como parámetro conmutable y medirse
su efecto sobre la línea de corte, exactamente igual que se hizo con `modo_corte`.

---

## 5. `bonus_socioeconomico` — listados oficiales localizados

### 5.1 Reto demográfico (VERIFICADO)

El IDAE publica la definición operativa y el listado, y **coincide literalmente con el criterio 4
del Anexo 3 de INNOVAE**:

- **6.827** municipios de hasta 5.000 habitantes → 12 % de la población
- **+147** municipios no urbanos de hasta 20.000 hab. con todos sus núcleos ≤5.000 hab. → 2,2 %
- **Total: 6.974 municipios = 14 % de la población** (de 8.131 municipios españoles)
- Listado Excel descargable: [webListadoInformativo-MUNICIPIOS_RETO_DEMOGRAFICO_CON_CP.xlsx](https://www.idae.es/sites/default/files/documentos/ayudas_y_financiacion/webListadoInformativo-MUNICIPIOS_RETO_DEMOGRAFICO_CON_CP.xlsx)

Fuente: [IDAE — Municipios de reto demográfico (PREE 5000)](https://www.idae.es/ayudas-y-financiacion/para-la-rehabilitacion-de-edificios/programa-pree-5000-rehabilitacion/municipios-de-reto-demografico)

### 5.2 Transición justa (VERIFICADO)

**197 municipios** en **15 Convenios de Transición Justa**, en 8 comunidades autónomas.
Fuente: [Instituto para la Transición Justa — Zonas de transición justa](https://www.transicionjusta.gob.es/en/convenios-transicion-justa/zonastj.html).
Solapa parcialmente con el listado anterior; el efecto marginal sobre el porcentaje es pequeño.

### 5.3 Fracción de instalaciones frigoríficas con bonus (ESTIMACIÓN)

El 14 % es la fracción de **población**, no de instalaciones frigoríficas, y es un **suelo**. La
industria del frío está sobrerrepresentada en el medio rural:

- **74 %** de las empresas de alimentación y bebidas están en municipios de menos de 50.000
  habitantes (FIAB)
- **45 %** de la industria agroalimentaria de Castilla y León está en municipios de menos de
  **2.000** habitantes ([El Debate, 20/04/2026](https://www.eldebate.com/espana/castilla-y-leon/20260420/45-industria-agroalimentaria-castilla-leon-esta-municipios-menos-2000-habitantes_408372.html))

El dato de Castilla y León es de una comunidad extrema y no extrapolable al conjunto. Pero indica
que la fracción correcta está muy por encima del 14 % poblacional para el arquetipo agroalimentario
y agropecuario, y bastante por debajo para el terciario urbano (logística de distribución,
hospitales, mercados municipales).

**Propuesta para el simulador, por arquetipo:**

| Sector | `bonus_socioeconomico = sí` | Base |
|---|---|---|
| agropecuario | 55 % | Extrapolación desde el dato de CyL, moderada |
| industrial (agroalimentario) | 35 % | Entre el 14 % poblacional y el 45 % de CyL |
| terciario | 10 % | Por debajo del 14 %: la logística y el comercio se concentran en áreas urbanas |

**Es una estimación, no un dato.** La forma rigurosa de cerrarla sería geolocalizar los
beneficiarios de las fichas CAE de frío contra el listado Excel del IDAE, pero el dataset CAE no
publica municipio, solo comunidad autónoma. **Queda sin resolver.**

---

## 6. Prensa e indicador de expectativa de demanda (VERIFICADO, poco concluyente)

INNOVAE tuvo [nota de prensa del IDAE](https://www.idae.es/noticias/el-idae-lanza-115-millones-en-ayudas-para-proyectos-innovadores-de-ahorro-y-eficiencia)
y de [La Moncloa (08/06/2026)](https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transicion-ecologica/paginas/2026/080626-proyectos-innovadores-energeticos-boe.aspx),
y ha sido replicada por las consultoras del sector de ayudas (Zabala, airCO2, Bantec, Ipsom,
Acelera Pyme). Es la cobertura estándar de una convocatoria del FNEE: ni el silencio de una
convocatoria menor, ni el ruido de HIALMAC o del PERTE.

**No es un indicador utilizable con la precisión que se buscaba.** La presencia masiva de
consultoras replicando la convocatoria sí sugiere que habrá intermediación profesional, lo que
empuja al alza tanto el número de solicitudes como la tasa de admisibilidad. Es coherente con el
escenario CENTRAL.

---

## 7. Qué ha quedado sin encontrar

| Falta | Estado | Vía que queda |
|---|---|---|
| **€/kW de central industrial NH₃ o CO₂ transcrítico** | **No encontrado.** Ni fabricantes ni distribuidores ni casos de éxito publican precio en ese segmento. Sí hay €/kW de enfriadora de agua R-290 y R-32 (§1.4), que no sustituyen al dato industrial | Descargar pliegos técnicos uno a uno de los expedientes ya identificados. Tarea 10 del contexto. **No bloquea el simulador** (§1) |
| **Reparto de grados de innovación por la CTV** | **No existe dato público.** El Anexo 3 estrena la taxonomía | Solo juicio experto. Tratar como parámetro de sensibilidad |
| **Solicitudes presentadas en MOVES Proyectos Singulares II** | **No encontrado.** Las resoluciones no publican el total presentado y las notas de prensa no lo recogen | Descargar la resolución definitiva de la 2ª convocatoria (28/06/2023) y contar expedientes en tablas |
| **Tablas de concesión de HIALMAC** | **Parcial.** El PDF de 117 páginas solo extrae texto hasta la pág. 18; las tablas del Anexo II no son texto extraíble | Abrir el PDF a mano. Se tienen 266 solicitudes y 36 concedidas por prensa, falta la nota de corte |
| **Municipio de las instalaciones frigoríficas del CAE** | **No publicado.** El dataset solo llega a CCAA | Impide cerrar `bonus_socioeconomico` con dato en vez de estimación |
| **Convención anual vs. vida útil en las fichas CAE** | **Sin verificar** | Catálogo de fichas del MITECO. Es el mayor riesgo metodológico pendiente (§2.3) |
| **Verificación del tope de 14.379 €/tep en el texto consolidado** | **Tomado de fuente secundaria** | BOE consolidado del RD 263/2019 |

---

## 8. Ficheros producidos

| Fichero | Contenido | Para qué |
|---|---|---|
| `Fuentes/rpa_observado_frio.csv` | 19 proyectos de frío con inversión, ayuda, ahorro, RPA y RPE | **Calibrador principal.** Muestrear de aquí |
| `Fuentes/rpa_observado_industria_murcia.csv` | 30 proyectos de todas las tipologías | Grupo de control. Acredita que el frío sale mejor que la media y que el tope regulatorio muerde |
| `Fuentes/cae_ahorro_fichas_frio.csv` | Distribución de ahorro por ficha, en ktep, filtrada por el umbral de INNOVAE | Calibra `ahorro_kwh_ano` |
| `Fuentes/benchmark_convocatorias_idae.csv` | 4 convocatorias con solicitudes, concedidas, reserva y puntuaciones | Calibra el número de solicitudes y la tasa de admisión |
| `Fuentes/precios_equipo_eur_kw.csv` | 13 equipos de tarifa con kW, PVP y €/kW, marcados por elegibilidad según PCA | Valida el orden de magnitud del coste y cuantifica la inversión de referencia del art. 38.8 |

**Justificación de columnas.** En `rpa_observado_frio.csv`: `actuacion` permite filtrar y auditar
qué se ha contado como frío; `inversion_elegible_eur` y `ayuda_eur` son los dos numeradores del
Anexo 3; `ahorro_tep_ano` es el denominador común; `rpa_meur_ktep` y `rpe_meur_ktep` son
derivadas, pero son el producto de este trabajo y se incluyen para que el fichero sea usable sin
recalcular; `fuente_url` porque ninguna cifra va sin enlace. Se ha omitido NIF, emisiones evitadas
y número de expediente de la CCAA: no intervienen en ninguna ratio.

---

## 9. Tres cosas que conviene decidir antes de generar la población

1. **Alargar la cola derecha del RPA.** La distribución observada está censurada en 14,379
   M€/ktep por un tope que INNOVAE no tiene. Si se muestrea tal cual, se subestima `RM`, se
   comprime `R` y se sobreestima la puntuación propia.

2. **El escenario BAJO merece tanto peso como el CENTRAL.** Dos de las cuatro convocatorias del
   benchmark no agotaron presupuesto. Combinado con la incompatibilidad CAE, es un desenlace
   plausible, y cambia por completo la estrategia: si no hay sobresuscripción, basta con superar
   los 50 puntos y el esfuerzo debe ir a **blindar la admisibilidad**, no a optimizar ratios.

3. **La admisibilidad es un parámetro del modelo, no un detalle.** En CE IMPLEMENTA 6 murieron
   por documentación 33 de 42 expedientes. El simulador debería aplicar una tasa de admisión al
   escenario antes de puntuar, y CONASOC debería tratar la revisión documental como una línea de
   trabajo propia, separada de la memoria técnica.
