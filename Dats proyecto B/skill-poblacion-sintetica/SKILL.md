---
name: poblacion-sintetica-convocatoria
description: Genera una población sintética de solicitudes competidoras para una convocatoria de ayudas en concurrencia competitiva y la entrega en CSV listo para puntuar. Primero reclama al usuario la documentación de la convocatoria, luego busca los datos de calibración que falten, y solo después genera las filas. Usar SIEMPRE que el usuario quiera estimar la línea o nota de corte de una convocatoria, saber "contra quién competimos" o "cuántos se van a presentar", simular solicitudes, poblar un simulador, calibrar escenarios de demanda o modelar competidores en una subvención. Se activa con "estima el corte de", "cuántos se presentarán a", "simula las solicitudes de", "genera una población de solicitudes", "calibra el escenario de", "modela la competencia de", y también cuando el usuario entrega las bases de una convocatoria y pregunta si su proyecto entraría. No usar para redactar la solicitud en sí ni para valorar un proyecto aislado sin referencia a competidores.
---

# Población sintética de solicitudes

En una convocatoria en concurrencia competitiva **no existe una puntuación buena en abstracto**.
Cuando los criterios usan escalas relativas al conjunto de solicitudes presentadas —tramos sobre el
rango observado, percentiles, ordenaciones—, la nota propia depende de contra quién se compita.
Optimizar el expediente propio sin estimar la población es disparar a ciegas.

Esta skill construye esa población: un CSV de solicitudes verosímiles, cada una con los valores que
el baremo de esa convocatoria necesita para puntuar. **No puntúa.** Puntuar y cortar es un paso
posterior, con el motor que corresponda a cada convocatoria.

## El orden importa

Recoger → calibrar → generar. Nunca al revés.

Generar filas antes de tener las distribuciones calibradas produce números que parecen datos y no
lo son. Es el fallo más caro de este trabajo, porque el resultado es plausible y por tanto nadie lo
audita. Si en algún momento hay que inventar un valor, se marca como inventado (§4) y se sigue.

---

## Fase 1 — Recoger

Antes de nada, reclamar al usuario la documentación. Leer `references/recogida.md`, que contiene la
lista completa de lo que hay que pedir, organizada en obligatorio / muy útil / opcional, con las
preguntas que hay que hacer si algo no aparece.

Resumen de lo imprescindible:

1. **Bases reguladoras** y **resolución de convocatoria** (PDF o enlace al boletín oficial)
2. **El anexo de criterios de valoración**, completo y con las fórmulas. Es el documento que
   determina qué columnas tiene el CSV. Sin él no se puede empezar.
3. **FAQ oficial** y grabación o transcripción de webinars informativos, si los hay
4. **Dotación, tope de ayuda por proyecto, coste mínimo elegible, fecha de cierre**
5. **Convocatorias anteriores comparables**, si el usuario ya sabe cuáles son
6. **Datasets sectoriales** que el usuario ya tenga descargados

Pedirlo todo de una vez, en una sola lista, no de tres en tres. El usuario suele tener la mitad a
mano y le ahorra viajes.

**Después** de recibir lo del usuario, buscar online lo que falte, siguiendo el orden de prioridad
de `references/calibracion.md` §1. Declarar explícitamente lo que no se encuentre: un hueco
señalado vale más que un número inventado.

---

## Fase 2 — Calibrar

Leer `references/calibracion.md`. Contiene la jerarquía de fuentes, cómo derivar distribuciones,
y los errores recurrentes que arruinan la estimación.

Los cuatro que más daño hacen, por si no se lee nada más:

**Buscar la ratio, no sus componentes.** Si el criterio es una ratio (coste por unidad de
beneficio, ayuda por unidad de beneficio), buscar fuentes que publiquen numerador y denominador
juntos, para el mismo proyecto. Es mucho más fácil de encontrar y mucho más fiable que reconstruir
la ratio a partir de precios unitarios de catálogo. Los precios unitarios rara vez se publican y
casi nunca son comparables entre sí; las resoluciones de ayudas anteriores, en cambio, publican
sistemáticamente inversión y resultado por expediente.

**Las distribuciones observadas suelen estar censuradas.** Si los datos vienen de un programa que
imponía un tope —de ratio, de inversión, de ayuda— la cola está recortada artificialmente, y se
nota en que los valores se apilan justo debajo del tope. Si la convocatoria objetivo no tiene ese
tope, hay que ensanchar la cola antes de muestrear. No hacerlo comprime el rango, y comprimir el
rango infla sistemáticamente la puntuación propia estimada.

**La admisibilidad es un parámetro, no un detalle.** En muchas convocatorias mueren más
expedientes por documentación que por puntuación. Se modela como una tasa que se aplica antes de
puntuar, y varía enormemente con el tipo de beneficiario: entidades sin estructura administrativa
caen por debajo del 25 %; empresas con asesoría profesional se mueven en el 75–90 %.

**La sobresuscripción no se presume.** Hay que verificarla contra rondas anteriores del mismo
programa o de programas hermanos. Muchas convocatorias no agotan presupuesto, y en ese caso la
línea de corte no la fija el presupuesto sino el umbral mínimo del baremo, lo que cambia por
completo la estrategia del solicitante.

El producto de esta fase es una **ficha de calibración** en JSON. Formato y campos en
`references/esquema.md`. Hay un ejemplo completo y real en `assets/calibracion.ejemplo.json`,
correspondiente al subprograma de frío de INNOVAE (IDAE, 2026) — leerlo antes de escribir el
primero, ahorra mucho.

Cada distribución de la ficha lleva un campo `fuente` con URL. Una ficha con fuentes vacías es una
ficha que no se puede defender ante un cliente.

---

## Fase 3 — Generar

```bash
python3 scripts/generar_poblacion.py ficha_calibracion.json --salida solicitudes.csv
```

El script muestrea por arquetipo, aplica los excluyentes en la generación —de modo que solo se
escriben filas admisibles y no hacen falta columnas para marcarlas—, y escribe un CSV por
escenario o los tres juntos, según se le pida. Usa solo biblioteca estándar.

Opciones útiles:

- `--escenario CENTRAL` genera uno solo en vez de los tres
- `--semilla 42` fija la aleatoriedad para que la corrida sea reproducible
- `--resumen` imprime las estadísticas de la población generada, para contrastarlas con las
  distribuciones de la ficha antes de dar el CSV por bueno

**Verificar siempre antes de entregar.** Comparar el resumen del script con las distribuciones
declaradas en la ficha. Si la mediana generada se aleja de la calibrada, hay un error en la ficha o
un rechazo excesivo por los excluyentes.

---

## Fase 4 — Disciplina de procedencia

Esto es lo que separa un modelo defendible de un montón de números inventados.

Toda fila del CSV lleva una columna `origen_dato` con uno de tres valores:

| Valor | Significado |
|---|---|
| `SINTETICO` | Fila muestreada de una distribución calibrada contra fuentes reales |
| `REAL` | Solicitud real observada, si se conoce alguna |
| `EJEMPLO_ILUSTRATIVO` | Fila escrita a mano para probar la aritmética. No es una estimación |

Y todo entregable que use estos datos dice, en su primera página, que la población es sintética y de
dónde salen sus parámetros. **Ninguna cifra generada aquí puede presentarse jamás como observada.**
Si el usuario pide un informe para cliente a partir de esto, esa advertencia va dentro.

---

## Estructura del CSV

Las columnas las dicta el baremo de cada convocatoria, no esta skill. La regla es dura y merece la
pena respetarla: **entra en la tabla lo que identifica la solicitud o interviene en su puntuación.
Nada más.**

Todo lo demás —potencia, tecnología, tamaño de empresa, CNAE, provincia, intensidad aplicada— es
material de calibración: vive en la ficha JSON y en la etiqueta del arquetipo, no en columnas
propias. Una tabla con veinte columnas es una tabla que nadie audita.

Columnas de identificación, comunes a cualquier convocatoria:

`id` · `escenario` · `origen_dato` · `arquetipo` · un eje sectorial si hace falta leer resultados
por sector

Columnas de puntuación: una por cada entrada que el baremo necesita. Detalle en
`references/esquema.md`.

El `arquetipo` es una etiqueta legible en prosa —"gran industria agroalimentaria, reconversión a
NH₃"— que absorbe de una vez todas las características de calibración. Es donde se concentra el
trabajo; la fila solo guarda el resultado.

---

## Archivos de esta skill

| Archivo | Cuándo leerlo |
|---|---|
| `references/recogida.md` | Al empezar. Lista de documentos que pedir y preguntas que hacer |
| `references/calibracion.md` | Antes de fijar ninguna distribución. Jerarquía de fuentes y errores frecuentes |
| `references/esquema.md` | Al escribir la ficha JSON y al decidir las columnas del CSV |
| `assets/calibracion.ejemplo.json` | Ejemplo real y completo. Leer antes de escribir la primera ficha |
| `scripts/generar_poblacion.py` | Fase 3 |
