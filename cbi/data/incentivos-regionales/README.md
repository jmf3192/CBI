# Incentivos regionales

Datos de referencia no sensibles para el borrador estatico de calculo de Incentivos Regionales.

- `zonas_intensidades.csv`: territorios CBI, intensidades maximas por tamano de empresa, acogibilidad y alcance de prioridad territorial.
- `municipios_prioritarios.csv`: municipios, provincias completas o ambitos especificos recogidos en los anexos del BOE como zonas prioritarias.
- `modulos_inversion.csv`: modulos internos de contraste para limitar obra civil por precio/m2.
- `espana_nuts3_10m.geojson`: geometria NUTS usada por el mapa interactivo.

En `municipios_prioritarios.csv`, `aplica_auto=si` permite aplicar el incremento territorial directamente. `aplica_auto=revision` indica que el anexo depende de pedanias, secciones censales o zonas industriales concretas; el prototipo aplica el incremento para estimar, pero muestra aviso para revisar la ubicacion exacta con Conasoc.

Fuentes principales: fichas publicas de Incentivos Regionales del Ministerio de Hacienda y reales decretos consolidados del BOE incluidos en la columna `fuente_url`.
