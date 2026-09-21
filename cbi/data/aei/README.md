# Dataset del data room AEI

Esta carpeta publica los CSV que alimentan la interfaz privada `aei-analisis-dashboard.html`.

- `aei_concesiones_base_v2.csv`: histórico vigente de concesiones y las 51 propuestas aprobadas provisionalmente de 2026. La interfaz sustituye esas 51 filas por el detalle completo de solicitudes de 2026 para no duplicarlas.
- `aei_solicitudes_2026.csv`: 194 solicitudes de la propuesta provisional de 2026, incluidas lista de espera, desestimadas y desistidas.

Fecha de consulta de las fuentes: 21 de septiembre de 2026. La interfaz identifica las propuestas provisionales de 2026; no las presenta como concesiones definitivas.

El origen y la metodología completos están en el data room fuente, en `02_documentacion/aei_actualizacion_notas.md`. El campo disponible para subpestañas es `variante_convocatoria` (`general`, `b` y `RETOS` cuando aplica). No se ha inferido un desglose de líneas que no figura en los archivos fuente.
