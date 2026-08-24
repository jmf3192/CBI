# Fase 2 — Calibrar

Convertir documentos y búsquedas en distribuciones defendibles.

Índice:

1. Jerarquía de fuentes
2. Calibrar una ratio: buscar la ratio, no sus componentes
3. Distribuciones censuradas
4. Número de solicitudes y admisibilidad
5. Criterios cualitativos
6. Criterios de ubicación
7. Trabajar en las unidades del baremo
8. Callejones sin salida conocidos

---

## 1. Jerarquía de fuentes

De más a menos fiable. Agotar cada nivel antes de bajar al siguiente.

**Nivel 1 — Resoluciones del mismo órgano gestor.** Publican, por expediente, puntuación por
criterio, importe y a menudo el indicador físico. Es el nivel más alto porque refleja cómo puntúa
realmente ese órgano, no cómo dice que puntúa.

**Nivel 2 — Listados de concesión de programas hermanos.** Ayudas del mismo ámbito resueltas por
concesión directa o por otro régimen. No dan puntuaciones, pero sí pares (inversión, resultado) por
proyecto, que es lo que calibra las ratios. Suelen esconderse en apartados administrativos de la
web del organismo —notificaciones a beneficiarios, listas de operaciones cofinanciadas, obligaciones
de publicidad— y no en la página de la ayuda. Merece la pena rastrear esos apartados.

**Nivel 3 — Registros sectoriales y datasets abiertos.** Certificados de ahorro, registros de
instalaciones, censos. Buenos para el denominador de las ratios y para el reparto territorial y
sectorial. Rara vez traen importes.

**Nivel 4 — Contratación pública.** Importes de adjudicación reales y competidos. Problema
recurrente: el anuncio publica el importe pero la magnitud física vive en el pliego técnico, que hay
que abrir uno a uno. Rendimiento bajo por unidad de esfuerzo, pero es la única vía cuando el mercado
privado no publica precios.

**Nivel 5 — Tarifas de fabricante y bases de precios de construcción.** Dan el equipo desnudo, sin
ingeniería, obra ni puesta en marcha, y normalmente en tamaños por debajo del rango que interesa.
Nunca como valor central; sí para dos cosas concretas y valiosas:

- **Comprobación cruzada de orden de magnitud.** Escalar el precio de tarifa al tamaño típico del
  proyecto y multiplicar por un factor de llave en mano (2,0–2,5 sobre el equipo es un punto de
  partida razonable). Si el resultado coincide con la mediana obtenida por la vía de la ratio, la
  calibración gana mucha credibilidad. Si no coincide, hay un error en alguna de las dos.
- **Cuantificar el sobrecoste de la tecnología exigida.** Muchos regímenes de ayuda calculan la base
  subvencionable como coste elegible menos una inversión de referencia: lo que habría costado hacer
  lo mismo con la tecnología convencional. Una tarifa que publique las dos gamas —la que cumple el
  requisito y la que no— da ese diferencial de forma limpia, porque son el mismo fabricante, el
  mismo año y la misma política de precios.

Dos cautelas al usar tarifas: son precios de catálogo sobre los que se aplican descuentos de
distribución sustanciales, y **solo se pueden comparar dos gamas en el rango de potencia donde
realmente solapan**. Ajustar curvas en rangos disjuntos y extrapolar produce diferencias que
parecen hallazgos y son artefactos del ajuste.

**Nivel 6 — Prensa y notas de organismos.** Totales agregados y número de solicitudes. Útil para
dimensionar, no para distribuciones.

---

## 2. Calibrar una ratio: buscar la ratio, no sus componentes

**Este es el atajo más rentable de todo el trabajo.**

Cuando el criterio es una ratio —coste por unidad de beneficio, ayuda por unidad de beneficio—, la
tentación es reconstruirla: buscar precios unitarios por un lado, rendimientos por otro, y
multiplicar. Es un mal camino. Los precios unitarios rara vez se publican, casi nunca son
comparables entre sí, y el error de cada componente se multiplica.

La vía corta es buscar fuentes que publiquen **numerador y denominador juntos, para el mismo
proyecto**. Las resoluciones de ayudas anteriores lo hacen sistemáticamente, porque el órgano gestor
necesita justificar ambas cosas. Una tabla con "inversión elegible aprobada" y "ahorro conseguido"
por expediente es directamente la distribución de la ratio.

Procedimiento:

1. Localizar 15–30 proyectos comparables con ambas magnitudes publicadas
2. Filtrar los que se parezcan a la actuación objetivo por tipo, no por sector
3. Calcular la ratio proyecto a proyecto, **en las unidades del baremo**
4. Reportar mínimo, p25, mediana, p75, máximo
5. Aplicar la mecánica de tramos del baremo sobre esa muestra y ver cuántos caen en cada tramo

El paso 5 es el que da la lectura operativa: dice qué ratio hace falta para el tramo alto, y suele
sorprender. Un proyecto en la mediana del sector no cae en el tramo alto; cae en el medio.

**Aviso sobre la muestra.** Si la escala del baremo se calcula solo entre solicitudes del mismo
subprograma, la muestra debe restringirse a proyectos de ese tipo. Que un tipo de actuación salga
mejor que la media del sector no ayuda si todos los competidores son de ese mismo tipo: la ventaja
relativa desaparece al recentrarse la escala.

---

## 3. Distribuciones censuradas

Los datos del nivel 2 suelen venir de programas con topes: de ratio, de inversión elegible, de ayuda
por proyecto. Un tope activo **recorta la cola y comprime el rango**.

Cómo detectarlo: los valores se apilan justo por debajo de un número redondo o normativo, y la cola
derecha se corta de golpe en vez de decaer.

Por qué importa: si la convocatoria objetivo **no** tiene ese tope, muestrear de la distribución
observada tal cual subestima el máximo, comprime el rango y, en una escala por tramos sobre el
rango, **infla sistemáticamente la puntuación propia estimada**. Se acaba creyendo que se está en el
tramo 1 cuando se está en el 3.

Qué hacer: ensanchar la cola con un factor explícito y declarado (`factor_cola` en la ficha, §5 de
`esquema.md`), y hacer sensibilidad sobre él. No hay una forma canónica de fijarlo; lo honesto es
probar varios valores y reportar el rango de corte resultante en vez de un número.

---

## 4. Número de solicitudes y admisibilidad

El parámetro más incierto y el que más mueve el resultado. Se trata en dos piezas separadas, porque
se calibran con fuentes distintas.

### 4.1 Solicitudes presentadas — tres escenarios, no un número

Anclas disponibles, por orden de utilidad:

- **Sobresuscripción histórica** del mismo programa o de hermanos. Verificarla, no presumirla:
  muchas convocatorias no agotan presupuesto, y el patrón depende sobre todo del tipo de promotor.
- **Aritmética presupuestaria.** Dotación dividida por la ayuda mediana esperada da el número de
  expedientes financiables. El número de solicitudes es ese, multiplicado por la sobresuscripción.
- **Asistencia a webinars y jornadas informativas.** Suelo razonable del interés.
- **Factores de depresión de demanda.** Incompatibilidades con otros regímenes, plazos de ejecución
  ajustados, exigencia de garantías. Pueden hundir la demanda mucho más de lo que sugiere el interés
  declarado, y suelen estar mal cuantificados. Si hay uno importante, es el candidato número uno
  para el análisis de sensibilidad.

**El escenario bajo merece el mismo peso que el central.** Si no hay sobresuscripción, la línea de
corte no la fija el presupuesto sino el umbral mínimo del baremo, y toda la estrategia del
solicitante cambia: deja de importar optimizar ratios y pasa a importar blindar la admisibilidad.

### 4.2 Tasa de admisibilidad

En muchas convocatorias **mueren más expedientes por documentación que por puntuación**. Los motivos
son casi siempre los mismos: poderes de representación, estatutos no registrados, alta en censos,
certificados de estar al corriente, declaraciones responsables sin firmar.

Se calibra contando, en las resoluciones anteriores, admitidos frente al total de expedientes que
aparecen en las tablas.

Varía enormemente con el tipo de beneficiario. Como orden de magnitud:

| Tipo de solicitante | Admisibilidad orientativa |
|---|---|
| Entidades sin estructura administrativa (asociaciones, comunidades, cooperativas pequeñas) | 20–40 % |
| Administraciones locales pequeñas | 50–70 % |
| Empresas con asesoría profesional | 75–90 % |

Estos rangos son un punto de partida, no un dato. Sustituirlos por el recuento real en cuanto haya
una resolución anterior comparable.

La tasa se aplica **antes** de puntuar: reduce el tamaño de la población que compite. Y tiene un
efecto de segundo orden que conviene vigilar: si deja la población por debajo del mínimo que el
baremo exige para recortar colas, un solo expediente atípico puede desplazar toda la escala.

---

## 5. Criterios cualitativos

Grados de innovación, calidad de la memoria, madurez del proyecto: los evalúa un comité con margen
de discrecionalidad, y **casi nunca se publica el reparto**. Las resoluciones dan la puntuación por
criterio, no la categoría cualitativa asignada.

Hay que asumir que aquí no habrá dato y decirlo. Lo que sí se puede hacer:

- Buscar en las resoluciones cuántos expedientes cayeron por criterios técnicos excluyentes. Si son
  muchos, el comité es duro y conviene sesgar el reparto hacia abajo.
- Mirar cuánto movieron las alegaciones sobre criterios técnicos. Si movieron décimas, la valoración
  cualitativa es estable y no hay margen de recuperación por esa vía.
- Aplicar la definición literal del baremo a la actuación típica del sector. Si el baremo describe
  la categoría baja como "soluciones maduras y disponibles en el mercado" y la actuación típica es
  exactamente eso, el reparto está sesgado hacia abajo por construcción, por mucho que cada
  solicitante se describa a sí mismo como innovador.

Fijar el reparto por juicio, marcarlo como juicio, y **tratarlo como parámetro de sensibilidad**.
Medir cuánto mueve la línea de corte es más valioso que acertar el valor.

---

## 6. Criterios de ubicación

Suelen ser todo o nada y con listado oficial descargable. Localizar el listado y guardar la URL: son
los datos más fáciles de verificar de todo el ejercicio.

El error frecuente es usar el **porcentaje de población** que vive en esas zonas como si fuera el
porcentaje de instalaciones. Casi nunca coinciden. Actividades ligadas al territorio —agroalimentaria,
extractiva, forestal, agropecuaria— están muy sobrerrepresentadas en zonas rurales respecto a su
población; servicios y logística, infrarrepresentadas.

Buscar estadística sectorial de distribución por tamaño de municipio, y si no la hay, estimar por
arquetipo y declararlo como estimación. Un mismo porcentaje para todos los arquetipos es casi
seguro erróneo.

---

## 7. Trabajar en las unidades del baremo

Desde el primer minuto, y sin excepciones.

Si el baremo pide millones de euros por kilotonelada equivalente de petróleo, calibrar en eso. No
en euros por kilovatio-hora para convertir al final. Las conversiones tardías son la fuente número
uno de errores de tres órdenes de magnitud, y son difíciles de detectar porque el resultado sigue
pareciendo un número razonable.

Anotar en la ficha el factor de conversión utilizado, aunque parezca obvio.

---

## 8. Callejones sin salida conocidos

Documentados para no repetirlos. Ampliar esta lista cada vez que se agote una vía.

| Vía | Qué pasa | Alternativa |
|---|---|---|
| Fabricantes y distribuidores del segmento industrial a medida | No publican precios. Todo es "solicite presupuesto". Los catálogos son completos en datos técnicos y mudos en euros | Contratación pública, o la vía de la ratio (§2) |
| Tarifas de gran fabricante de equipo empaquetado | **Sí funcionan.** Publican precio junto a la magnitud física. Buscar "tarifa de precios", "lista de precios", "listino prezzi", "Preisliste" + el año | Nivel 5. Sirven para comprobación cruzada y para el diferencial de tecnología, no como coste de proyecto |
| Tarifas de distribuidor mayorista | Precios reales, pero de componentes sueltos sin magnitud de sistema asociada | Útiles solo si el baremo admite auxiliares como coste elegible |
| Casos de éxito de revistas sectoriales | Dan magnitudes técnicas pero nunca importes | Igual |
| Configuradores de bases de precios de construcción | Suelen bloquearse con captcha | Las páginas estáticas de cada partida sí son accesibles y dan un precio, pero solo para tamaños pequeños |
| Portales agregadores de contratación pública | Buscador de pago | Plataformas oficiales del organismo, una a una |
| Datasets abiertos oficiales vía API | A veces devuelven vacío a peticiones automatizadas | Descarga manual desde el navegador |
| Buscar precios unitarios para reconstruir una ratio | Rendimiento muy bajo | §2. Buscar la ratio publicada directamente |
