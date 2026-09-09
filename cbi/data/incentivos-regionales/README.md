# Incentivos regionales

Datos de referencia no sensibles para el borrador estatico de calculo de Incentivos Regionales.

- `zonas_intensidades.csv`: territorios CBI, intensidades maximas por tamano de empresa, acogibilidad y alcance de prioridad territorial.
- `municipios_prioritarios.csv`: municipios, provincias completas o ambitos especificos recogidos en los anexos del BOE como zonas prioritarias.
- `modulos_inversion.csv`: modulos internos de contraste para limitar obra civil por precio/m2.
- `espana_nuts3_10m.geojson`: geometria oficial NUTS 3 de Eurostat GISCO usada por el mapa seleccionable de provincias; el color se asigna por comunidad autonoma.

En `municipios_prioritarios.csv`, `aplica_auto=si` permite aplicar el incremento territorial directamente. `aplica_auto=revision` indica que el anexo depende de pedanias, secciones censales o zonas industriales concretas; el prototipo aplica el incremento para estimar, pero muestra aviso para revisar la ubicacion exacta con Conasoc.

En el calculo preliminar de modulos, la superficie facilitada por el cliente se considera superficie construida. La urbanizacion se estima aparte como un 10 % adicional, de modo que la superficie total modelizada equivale al 110 % del dato introducido.

Fuentes principales: fichas publicas de Incentivos Regionales del Ministerio de Hacienda, reales decretos consolidados del BOE incluidos en la columna `fuente_url` y [Eurostat GISCO NUTS 2021](https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2021-files.html).
