# Dataset del data room AEI

Esta carpeta publica los CSV que alimentan la interfaz privada `aei-analisis-dashboard.html`.

- `aei_solicitudes_historicas_v5.csv`: base operativa a nivel de expediente. Conserva las concesiones finales e incorpora solicitudes provisionales en espera, desestimadas por puntuación, por otros motivos y desistidas para 2013–2015, 2017–2018, 2020–2024, 2025 y 2025 RETOS. Las puntuaciones se incluyen cuando el anexo las publica y se han podido extraer de forma comparable.
- `aei_solicitudes_2026.csv`: 194 solicitudes de la propuesta provisional de 2026, incluidas lista de espera, desestimadas y desistidas.

Fecha de consulta de las fuentes: 21 de septiembre de 2026. La interfaz identifica las propuestas provisionales de 2026; no las presenta como concesiones definitivas.

El origen y la metodología completos están en el data room fuente, en `02_documentacion/aei_actualizacion_notas.md`. El campo `variante_convocatoria` (`general`, `b` y `RETOS` cuando aplica) se conserva para documentar las líneas convocadas al pie de cada vista. Los ordinales de lista de espera de 2023 no se muestran como puntuaciones.

### Frío y logística

`aei_sector_frio.json` alimenta la pestaña sectorial: 14 expedientes directos y 4 relacionados, con títulos recuperados de anexos, fichas, fuentes, participantes publicados y cobertura de las 19 convocatorias disponibles. `aei_sector_frio.csv` es la exportación de consulta. Ambos deben publicarse junto al HTML/JS/CSS.

La vista distingue selección temática de convocatoria oficial y no calcula un corte sectorial. Filtros por convocatoria, relación, resultado y texto actualizan indicadores, gráficos y listado completo. Las fichas distinguen concesión, propuesta, espera y desestimación. No se estiman notas. Los cruces de 2011/2012 por año, NIF e importe se marcan como pendientes de confirmación documental. Cero coincidencias no demuestra ausencia de proyectos.

Reproducción en la carpeta compartida: `Data room AEI/04_trabajo_tecnico/construir_sector_frio.py`. Metodología y límites: `Data room AEI/02_documentacion/revision_sector_frio.md`. Reconstruir tras cualquier cambio del histórico: el JSON conserva una selección documentada de sus filas, no un filtro automático por palabras.

Actualización de alcance: el conjunto sectorial se amplía a **320 registros**, con la propiedad `ambito`: **Frío (18)** y **Transporte y distribución (302)**. La vista inicial muestra ambos; columna, ficha y filtro comparten la misma propiedad. Para regenerar esta versión usar `Data room AEI/04_trabajo_tecnico/ampliar_sector_logistica.py` (sustituye al constructor de frío como punto de entrada). Los nombres de archivo se mantienen para compatibilidad. La tabla completa dispone de desplazamiento interno y encabezado fijo.
