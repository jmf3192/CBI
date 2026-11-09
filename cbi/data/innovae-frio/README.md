# INNOVAE frío · calibración v2.0.0

Actualización de 9 de noviembre de 2026; recopilación documental del 6 de noviembre. [Abrir simulador](https://conasoc.com/cbi/interfaces/innovae-frio-dashboard.html) (requiere acceso CBI).

La v2 sustituye las 220 filas preliminares por poblaciones reproducibles construidas sobre pares observados de inversión y ahorro. El indicador principal cuenta financiación en 1.000 simulaciones bajo un escenario explícito. No estima una probabilidad de concesión real. La incertidumbre entre supuestos es distinta de la variabilidad dentro de un escenario.

## Evidencia incorporada

- **25 PDF oficiales, 697 páginas**: cinco convocatorias competitivas IDAE (RENOINN, BIOGAS, RENOCOGEN, HIALMAC y MOVES Flotas Plus) y cuatro bloques autonómicos. [Originales e índice](../../../Dats%20proyecto%20B/Fuentes/resoluciones_historicas_innovae_frio/00_INDICE.md).
- **320 expedientes únicos** extraídos de cinco DECA del RD 263/2019: Andalucía 7; Cataluña 179 + 87 + 17; Murcia 30. Son operaciones seleccionadas para cofinanciación FEDER; no constituyen el universo de solicitudes ni una muestra aleatoria del mercado.
- Cada fila conserva código IDAE y autonómico, beneficiario, título, inversión elegible, **ayuda concedida**, ahorro en tep/año, conversión a kWh/año, PDF, página, URL y SHA-256. No se copia el NIF al conjunto analítico.
- Clasificación por lectura del título: 9 equipos, 16 optimizaciones, 3 mixtas, 4 auxiliares y 4 ambiguas. Otras 284 quedan fuera de muestra. La clasificación es una decisión analítica revisable en [classification.json](../../../scripts/innovae-frio/classification.json), no una resolución de admisibilidad.
- Al exigir inversión observada ≥100.000 €, quedan **8 analogías de equipos** en la base central y **22** al incluir 14 optimizaciones. Los nueve títulos de equipos tampoco prueban por sí solos la sustitución de compresores, el uso RSIF o la potencia mínima. Se modela una población hipotética ya admitida utilizando esas analogías de coste y ahorro.
- Potencia y porcentaje de ahorro se mantienen **nulos/desconocidos** en observaciones y filas sintéticas. No se deducen de kWh/año. Las competidoras sintéticas llevan `technicalEligibility=supuesta_admitida`.

La extracción falla si cambian la estructura numérica, los recuentos o los identificadores. Admite decimales españoles de una/dos cifras y números enteros. Por ejemplo, el PDF Murcia p. 5 publica **490.000 €** para `FN-PGESI-MUR-557349-000006`; no se reutiliza la cifra de 2.490.000 € de la antigua referencia local. Se excluye ese proceso de escaldado-enfriado de las analogías frigoríficas.

Los restantes documentos IDAE aportan contexto de admisión y concurrencia. No se mezclan inversiones de biogás, almacenamiento o vehículos con ratios frigoríficas. El informe RENOINN p. 12 registra 58 solicitudes y 31 admitidas en bombas de calor: sirve como contraste, no como estimador de admisión INNOVAE. Galicia no publica ahorro e inversión en su relación descargada y no entra en los pares empíricos.

## Decisiones de generación

| Decisión | Implementación | Motivo y límite |
|---|---|---|
| Dependencia inversión-ahorro | Bootstrap uniforme de **pares del mismo expediente**, con reemplazo | Conserva una relación observada; no fabrica una recta de coste contra ahorro. Con ocho pares, la diversidad central sigue siendo limitada. |
| Tamaño | Factor común uniforme 0,8–1,25; el límite inferior se condiciona a ≥100.000 € | Evita amontonar filas exactamente en el mínimo. No hay topes artificiales de inversión o ahorro. |
| Variación de eficiencia | Multiplicador uniforme 0,9–1,1 del ahorro | Hipótesis de sensibilidad local; no es error de medición estimado. |
| Cola de RPA | Sensibilidad ×1,35 sobre el cuartil superior del pool antes de perturbaciones, reduciendo ahorro | Las concesiones RD 263 están seleccionadas y tienen restricciones de inversión/tep. La cola ampliada es una hipótesis, no una corrección estadística identificada. En pools pequeños, empates/orden discreto pueden afectar a algo más del 25 %. |
| Escala de inversión | ×1, ×2 o ×4 de coste y ahorro conjuntos | ×2/×4 son escenarios de tensión, no actualizaciones por inflación ni predicciones de tamaño. No alteran directamente RPA. |
| Tamaño empresarial y zona | Grande/mediana/pequeña 40/35/25 %; general/c/a 70/15/15 % | Priors de trabajo independientes, no inferidos de nombres de beneficiarios. |
| Base de ayuda | Inversión de contraste uniforme 20–40 % del coste | Supuesto configurable en calibración. Se distingue coste elegible y subvencionable. |
| Solicitud de ayuda | Uniforme 65–100 % del máximo calculado; redondeo hacia abajo a céntimos | Conserva límites de tamaño/zona/contraste y 2 M€. No confunde la ayuda histórica concedida con la que pediría una futura competidora. |
| Innovación | Baja/central/alta: 65/25/9/1 %, 45/35/17/3 %, 25/40/28/7 % | Supuestos expertos; puntuación fija en punto medio de cada categoría: 2,5/7,5/14/21,5. No incorpora toda la incertidumbre de evaluación técnica. |
| Bonus | Bernoulli 10/20/40 % | Sensibilidad sin asignación territorial ficticia. Proyecto con bonus completo o sin él; no se modela el prorrateo multiterritorial. |
| Orden en empates | Llegada uniforme sintética; proyecto y manuales en 0,5 | Reproduce la secuencia de criterios y después un orden hipotético. No conoce fechas reales. ID solo desempata llegadas idénticas. |

Los costes observados son nominales de expedientes históricos; no se ha ajustado inflación, cambio tecnológico ni composición terciaria/agropecuaria. Las hipótesis de tamaño, zona y ayuda se editan en [calibration.json](calibration.json); las sensibilidades principales están disponibles en pantalla.

## Demanda y admisión separadas

Número de competidoras = redondeo de candidatas × admisión. Se añaden el proyecto y las manuales. Las 1.000 simulaciones varían la composición manteniendo ese recuento; no se sortea una binomial de admitidas.

| Candidatas | 55 % | 70 % | 85 % |
|---:|---:|---:|---:|
| 40 | 22 | 28 | 34 |
| 110 | 61 | **77** | 94 |
| 260 | 143 | 182 | 221 |

Los tres volúmenes y tasas son escenarios, no estimaciones empíricas. Aumentar demanda puede mejorar la puntuación relativa de un proyecto al estabilizar extremos, incluso si empeora su posición; por ello no se fuerza una relación monótona entre demanda y frecuencia.

## Evaluación y lectura de resultados

Motor compartido navegador/worker/Node: [innovae-frio-model.js](../../assets/innovae-frio-model.js). Usa 11.630 kWh/tep, los cinco intervalos relativos de RPA/RPE, el umbral de 50 puntos y un presupuesto de trabajo de 25 M€. Consulta las [bases INNOVAE, anexos 2–4 y artículo 23](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-12282).

Se excluyen antes de construir escalas las filas con incumplimientos numéricos conocidos. El recorte del 5 % por extremo se activa desde 20 solicitudes y usa suelo entero; la norma no concreta «número representativo», así que este umbral y el redondeo son convenciones del modelo. Las filas que no llegan a 50 tras puntuar sí contribuyen al rango inicial. Si el rango es cero se asigna el primer tramo; es otra convención explícita.

La selección recorre la prelación y financia solicitudes completas mientras quepan; una solicitud que no cabe queda en reserva y se sigue con las siguientes. La **menor puntuación financiada** solo aparece cuando existe reserva y algún proyecto financiado. No es un corte universal: un proyecto de menor importe puede caber después de otro con mayor puntuación. Si todas las solicitudes viables caben, se muestra «sin reserva por presupuesto».

El máximo del proyecto se calcula con tamaño, zona y tres modos de base: contraste, sin contraste con intensidad reducida, o inversión exclusivamente de eficiencia sin alternativa. Esta última requiere justificar ese encaje. Sin actividad económica se conserva el límite específico del 70 %. No se modela acumulación de otras ayudas. Una reducción del máximo ajusta a la baja el importe solicitado y lo muestra. Los competidores manuales usan gran empresa/zona general/coste íntegro exclusivamente de eficiencia y elegibilidad técnica supuesta; las ayudas que superan su máximo se excluyen sin truncarlas silenciosamente.

Se muestran la frecuencia financiada, los conteos financiada/reserva/excluida y percentiles P5/mediana/P95 de puntuación y presupuesto. Los percentiles son estadísticos de orden con índice `floor((n−1)*p)`, no intervalos de confianza. Los de posición excluyen las simulaciones sin prelación y muestran el denominador. Las gráficas detallan la **primera población**, que puede diferir de la mediana. La semilla fija 20261106 permite reproducir exactamente resultados; no implica que el modelo esté validado predictivamente.

## Comparación reproducible

Archivo previo intacto: [220 filas preliminares](archive/simulacion_preliminar_220.csv). CSV actual: [77 competidoras centrales](simulacion_solicitudes.csv) con [metadatos](simulacion_solicitudes.meta.json).

| Primera población | Preliminar | v2 central |
|---|---:|---:|
| Competidoras | 220 | 77 |
| Coste P50 (estadístico de orden) | 830.000 € | 351.992,57 € |
| Ahorro P50 | 1.074 MWh/año | 466,68 MWh/año |
| RPA P50 | 9,06 M€/ktep | 7,77 M€/ktep |
| Ayuda solicitada total | 53,55 M€ | 6,68 M€ |
| Trazabilidad por fila | Sin expediente | Expediente + PDF + página + transformaciones |

Hay 12 filas v2 por encima del 30 % del coste: todas respetan su máximo por tamaño, zona y contraste. Superar 30 % no es en sí un incumplimiento. En el preliminar faltaban esas variables para justificar las 23 filas que lo superaban.

Caso de control: coste 720.000 €, ahorro 940 MWh/año, ayuda 158.400 €, innovación incremental, sin bonus, 165 kW y 24 % de ahorro. Gran empresa/zona general/contraste 144.000 €.

| Supuesto | Financiadas / 1.000 | Reserva | Excluidas | Puntuación P5 / P50 / P95 |
|---|---:|---:|---:|---|
| Central: 77, equipos, ×1 | 917 | 0 | 83 | 46,5 / 51,5 / 51,5 |
| Muestra ampliada | 983 | 0 | 17 | 51,5 / 51,5 / 59,5 |
| Cola de RPA ampliada | 1.000 | 0 | 0 | 59,5 / 59,5 / 64,5 |
| Alta demanda: 221, ×1 | 989 | 0 | 11 | 51,5 / 51,5 / 51,5 |
| Alta demanda: 221, ×4 | 114 | 875 | 11 | 51,5 / 51,5 / 51,5 |

La diferencia 91,7 % frente a 11,4 % muestra por qué no debe comunicarse un único porcentaje como probabilidad real. Los tamaños históricos producen poca presión presupuestaria; el escenario ×4 explicita el supuesto necesario para explorar esa presión. [Resultados completos y entradas](validation.json).

## Reproducir

Desde la raíz del repositorio, Python con `pypdf==6.10.0` y Node 18+:

```sh
python3 scripts/innovae-frio/extract_references.py
node scripts/innovae-frio/generate.cjs
node scripts/innovae-frio/audit.cjs
node --test scripts/innovae-frio/model.test.cjs
```

No requiere servicio de generación ni librerías JavaScript externas. `sources.json` registra checksum, URL y páginas de todos los PDF. El script genera `references.json` y su CSV a partir de los originales y de la clasificación versionada. La generación y la auditoría usan el mismo motor que la web; el worker evita bloquear los controles y se cancela cuando cambian las entradas. No se guardan los proyectos introducidos ni se envían al servidor: las descargas CSV/JSON se construyen en el navegador.

Los scripts antiguos de `Dats proyecto B` se conservan como investigación histórica; no son el motor desplegado v2.
