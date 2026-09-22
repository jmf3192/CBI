# Dataset del data room AEI

Esta carpeta publica los CSV que alimentan la interfaz privada `aei-analisis-dashboard.html`.

- `aei_solicitudes_historicas_v5.csv`: base operativa a nivel de expediente. Conserva las concesiones finales e incorpora solicitudes provisionales en espera, desestimadas por puntuación, por otros motivos y desistidas para 2013–2015, 2017–2018, 2020–2024, 2025 y 2025 RETOS. Las puntuaciones se incluyen cuando el anexo las publica y se han podido extraer de forma comparable.
- `aei_solicitudes_2026.csv`: 194 solicitudes de la propuesta provisional de 2026, incluidas lista de espera, desestimadas y desistidas.

Fecha de consulta de las fuentes: 21 de septiembre de 2026. La interfaz identifica las propuestas provisionales de 2026; no las presenta como concesiones definitivas.

El origen y la metodología completos están en el data room fuente, en `02_documentacion/aei_actualizacion_notas.md`. El campo `variante_convocatoria` (`general`, `b` y `RETOS` cuando aplica) se conserva para documentar las líneas convocadas al pie de cada vista. Los ordinales de lista de espera de 2023 no se muestran como puntuaciones.
