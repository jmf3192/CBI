# Manual de estilo web de CBI

## Números

Toda la plataforma usa formato español para introducir y mostrar cifras:

- El punto separa miles: `1.400.000`.
- La coma separa decimales: `3.033,85`.
- Los importes se muestran en euros y, salvo que los céntimos sean relevantes, sin decimales: `1.400.000 €`.
- Las superficies admiten hasta dos decimales: `3.033,85 m²`.
- Los porcentajes muestran la coma decimal cuando sea necesaria: `21,5 %`.
- Empleos, meses, fases y demás recuentos se muestran como enteros.

Los campos numéricos deben agrupar los miles mientras el usuario escribe. Esto reduce el riesgo de introducir un cero de más o de menos. La unidad debe aparecer en la etiqueta o junto al resultado, no dentro del valor editable.

### Implementación

Las interfaces cargan el componente compartido `assets/cbi-number-format.js`.

Un campo entero se declara así:

```html
<input type="number" data-number-format min="0" step="10000" />
```

Un campo con decimales, como una superficie, se declara así:

```html
<input
  type="number"
  data-number-format
  data-number-decimals="2"
  min="0"
  step="0.01"
/>
```

Reglas técnicas obligatorias:

1. Leer el valor con `CBINumbers.parse(input.value)`. No usar `Number(input.value)` ni `parseFloat(input.value)` en campos localizados.
2. Actualizar el valor desde JavaScript con `CBINumbers.setValue(input, value)` para conservar el formato visible.
3. Guardar y calcular siempre con números sin formato. Los puntos y comas de presentación no se almacenan en la base de datos.
4. Mantener `min`, `max` y `step` en el elemento para documentar y validar el rango de negocio.
5. Usar `inputmode="numeric"` para enteros y `inputmode="decimal"` para cifras decimales. El componente lo configura automáticamente.

### Criterios de precisión

| Tipo de dato | Entrada | Presentación habitual |
|---|---|---|
| Importe en euros | Entero salvo necesidad expresa | `1.400.000 €` |
| Superficie | Hasta 2 decimales | `3.033,85 m²` |
| Porcentaje | Hasta 1 decimal en controles; más solo si afecta al cálculo | `21,5 %` |
| Empleo y unidades | Entero | `24` |
| Puntuación | 1 decimal cuando exista fracción | `37,5 puntos` |

No se redondea el valor usado en el cálculo para hacerlo coincidir con la presentación. El redondeo visual y la precisión matemática se mantienen separados.
