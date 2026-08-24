# Esquema de la ficha de calibración y del CSV

La ficha JSON es el único sitio donde vive el conocimiento sobre la convocatoria. El CSV es su
producto. El script no sabe nada de ninguna convocatoria concreta: todo lo lee de la ficha.

Ejemplo completo y real en `assets/calibracion.ejemplo.json`. Conviene leerlo antes de escribir el
primero.

---

## 1. Estructura general

```json
{
  "convocatoria": { ... },
  "reglas": { ... },
  "escenarios": { ... },
  "variables": [ ... ],
  "arquetipos": [ ... ],
  "notas": [ ... ]
}
```

---

## 2. `convocatoria`

Metadatos e identidad. No interviene en el muestreo; sirve para que la ficha sea autoexplicativa
dentro de seis meses.

```json
"convocatoria": {
  "nombre": "INNOVAE subprograma d) - sustitucion de generadores de frio",
  "organismo": "IDAE",
  "cierre": "2026-11-18",
  "dotacion_eur": 25000000,
  "unidad_beneficio": "ktep",
  "factor_conversion": "1 ktep = 11.630.000 kWh",
  "fuente_bases": "https://...",
  "fuente_criterios": "https://..."
}
```

---

## 3. `reglas`

Los excluyentes cuantitativos. El generador los aplica al muestrear, de modo que **solo se escriben
filas admisibles**. Por eso el CSV no necesita columnas para marcarlos.

```json
"reglas": {
  "coste_minimo_eur": 100000,
  "ayuda_maxima_eur": 2000000,
  "max_intentos_por_fila": 100
}
```

Si un arquetipo produce rechazos sistemáticos, es señal de que sus distribuciones son incompatibles
con los excluyentes: hay que revisar la calibración, no subir el número de intentos.

---

## 4. `escenarios`

```json
"escenarios": {
  "BAJO":    { "solicitudes": 40,  "tasa_admision": 0.80 },
  "CENTRAL": { "solicitudes": 110, "tasa_admision": 0.80 },
  "ALTO":    { "solicitudes": 260, "tasa_admision": 0.80 }
}
```

`solicitudes` son las presentadas. El script escribe solo las que superan `tasa_admision`, porque
son las únicas que compiten y las únicas que forman la escala del baremo.

---

## 5. `variables`

El corazón de la ficha: una entrada por cada columna de puntuación que el baremo necesita, **en
orden de dependencia** (una variable solo puede referirse a otra anterior).

Tipos disponibles:

### `beneficio`

La magnitud física que va al denominador de las ratios. Se muestrea primero.

```json
{
  "nombre": "ahorro_kwh_ano",
  "tipo": "beneficio",
  "unidad_salida": "kWh",
  "por_unidad_baremo": 11630000,
  "distribucion": { "tipo": "lognormal", "p50": 0.0760, "p90": 0.2327 },
  "fuente": "https://..."
}
```

`por_unidad_baremo` es cuántas unidades de salida hay en una unidad del baremo. La distribución se
declara **en unidades del baremo**; el script convierte a la unidad de salida al escribir.

### `coste_por_ratio`

El numerador de la ratio principal. Se obtiene multiplicando la ratio muestreada por el beneficio,
que es exactamente la lógica del §2 de `calibracion.md`.

```json
{
  "nombre": "coste_elegible_eur",
  "tipo": "coste_por_ratio",
  "beneficio": "ahorro_kwh_ano",
  "distribucion": {
    "tipo": "empirica",
    "valores": [0.62, 3.21, 4.61, 4.76, 4.83, 5.06],
    "factor_cola": 1.35
  },
  "fuente": "https://..."
}
```

### `fraccion_de`

Para la ayuda solicitada y cualquier otra magnitud derivada de otra columna.

```json
{
  "nombre": "ayuda_solicitada_eur",
  "tipo": "fraccion_de",
  "base": "coste_elegible_eur",
  "distribucion": { "tipo": "triangular", "min": 0.12, "moda": 0.22, "max": 0.30 },
  "tope": "ayuda_maxima_eur",
  "fuente": "https://..."
}
```

### `categorica`

Criterios cualitativos.

```json
{
  "nombre": "categoria_innovacion",
  "tipo": "categorica",
  "probabilidades": { "baja": 0.45, "incremental": 0.35, "intermedia": 0.17, "disruptiva": 0.03 },
  "origen": "JUICIO_EXPERTO",
  "fuente": "sin dato publico - ver calibracion.md 5"
}
```

Marcar `"origen": "JUICIO_EXPERTO"` cuando no hay fuente. El script lo refleja en el resumen para
que quede a la vista qué parte del modelo es opinión.

### `booleana`

Criterios de todo o nada, típicamente de ubicación.

```json
{
  "nombre": "bonus_socioeconomico",
  "tipo": "booleana",
  "probabilidad": 0.35,
  "valores": ["si", "no"],
  "fuente": "https://..."
}
```

---

## 6. Distribuciones

Cuatro formas, todas con el mismo campo `tipo`:

| Tipo | Campos | Cuándo usarla |
|---|---|---|
| `empirica` | `valores`, opcional `factor_cola` | Hay una muestra real de proyectos. **Es la preferible.** `factor_cola` ensancha la cola derecha para corregir censura (§3 de `calibracion.md`) |
| `lognormal` | `p50`, `p90` | Solo hay percentiles publicados. Adecuada para magnitudes positivas y asimétricas, que es lo habitual |
| `triangular` | `min`, `moda`, `max` | Solo hay un rango y un valor típico. Honesta cuando la información es pobre |
| `uniforme` | `min`, `max` | Último recurso. Si se acaba aquí, decirlo en las notas |

---

## 7. `arquetipos`

Perfiles de solicitante. Cada uno tiene un peso y puede sobrescribir cualquier distribución de
`variables`. Lo que no sobrescribe, lo hereda.

```json
{
  "nombre": "gran industria agroalimentaria - reconversion a NH3",
  "sector": "industrial",
  "peso": 0.35,
  "sobrescribe": {
    "bonus_socioeconomico": { "probabilidad": 0.35 },
    "ahorro_kwh_ano": { "distribucion": { "tipo": "lognormal", "p50": 0.14, "p90": 0.42 } }
  }
}
```

El `nombre` es prosa legible y es donde se concentra el trabajo de calibración: absorbe tamaño de
empresa, tecnología, sector, territorio y todo lo demás. **Ninguna de esas características merece
columna propia en el CSV.**

Los pesos se normalizan solos, así que no hace falta que sumen exactamente 1.

---

## 8. `notas`

Lista de cadenas. Todo lo que un lector futuro necesita saber y no cabe en los campos: supuestos
abiertos, huecos declarados, decisiones interpretativas, avisos de censura, qué falta por verificar.

Esta sección no es decorativa. Es la que permite que otra persona —o uno mismo en tres meses—
audite el modelo en vez de creérselo.

---

## 9. El CSV resultante

Columnas de identificación, siempre:

| Columna | Para qué |
|---|---|
| `id` | Clave única. Sirve además de desempate por orden de presentación en muchos baremos |
| `escenario` | Permite tener las tres corridas en un fichero |
| `origen_dato` | `SINTETICO` / `REAL` / `EJEMPLO_ILUSTRATIVO`. Innegociable |
| `arquetipo` | Trazabilidad hacia la ficha de calibración |
| `sector` | Solo si hace falta leer resultados por sector. Si no, quitarla |

Después, una columna por cada entrada de `variables`, en el mismo orden.

Nada más. Si aparece la tentación de añadir una columna, la pregunta es: ¿identifica la solicitud o
interviene en su puntuación? Si la respuesta es no, va a la ficha de calibración o al nombre del
arquetipo.
