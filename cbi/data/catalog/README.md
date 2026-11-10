# Datos y muestras · Panel de control

[Panel de control → Datos y muestras CSV](https://conasoc.com/cbi/interfaces/admin.html?view=datos). Actualización: 10 de noviembre de 2026.

La gestión de CSV es una sección del panel, junto a Usuarios y contenidos. No constituye un contenido independiente del espacio de trabajo. La antigua dirección `datos-ayuda.html` redirige a esta sección. Solo los administradores activos acceden a la administración de datos.

## Catálogo y versiones

El catálogo inicial de Supabase registra 12 CSV de INNOVAE frío, AEI e Incentivos Regionales. La relación usa `calls.id`, y el formulario permite registrar CSV nuevos bajo `/cbi/data/`, indicando contenido, página y función. Se diferencia entrada activa, referencia, exportación derivada e histórico.

`data_catalog` mantiene la definición y la versión activa. `data_versions` conserva de forma inmutable el CSV, autor, fecha, motivo, definición analítica de columnas y operaciones de preparación. Una huella MD5 calculada por el servidor identifica contenido igual; las huellas SHA-256 de los PDF siguen identificando los documentos originales. Guardar crea una versión compartida. Publicar cambia la versión que cargan las páginas. La publicación detecta si otra sesión cambió el puntero mientras se editaba. El historial permite cargar, comparar y volver a activar versiones anteriores. Volver al original conserva el historial.

RLS restringe la lectura a administradores activos o usuarios activos con acceso al contenido. Solo administración puede registrar, guardar y activar versiones; el cliente no puede modificar o borrar versiones. El acceso anónimo está revocado. Los ensayos de inserción y publicación se verificaron dentro de una transacción revertida, sin dejar versiones de prueba activas.

## Edición, configuración y análisis

El editor permite importar/exportar CSV, buscar y ordenar filas, editar todos sus campos, añadir/quitar filas y añadir columnas. Se mantienen las columnas originales requeridas. Se pueden configurar tipos analíticos, unidades y campos de procedencia. La validación comprueba estructura y, para INNOVAE, las reglas de unidades, clasificación y trazabilidad. Los CSV genéricos conservan los valores publicados, incluidos motivos textuales en columnas mayoritariamente numéricas; la validez estructural no certifica el sentido de una regla de ayuda editada.

Los visores incluyen:

- Histogramas original/copia con intervalos comunes y proporciones de valores válidos; 8, 12, 20 o 30 intervalos.
- Cajas con mínimo, Q1, mediana, Q3 y máximo. Los atípicos se cuentan aparte por 1,5 IQR; los extremos del gráfico representan el rango completo.
- Dispersión X/Y. Hasta 600 puntos mediante selección sistemática; se muestran los recuentos representado y disponible. Los demás estadísticos usan todos los valores válidos.
- Composición por categorías, cobertura por convocatoria/documento y aportación de fuentes. Una fila puede citar varias referencias; las URLs se deduplican dentro de la fila.
- Ausencias, duplicados exactos, identificadores repetidos, mediana, P5/P95 y comparación con el original. Si no existe una clave única, no se afirman modificaciones individuales.

No se rellenan las ausencias con cero ni se ajusta una curva gaussiana. Los percentiles utilizan el estadístico de orden `floor((n−1)·p)`.

Las herramientas de muestra permiten recortar espacios, retirar duplicados exactos, filtrar categorías/intervalos, exigir un valor numérico, excluir explícitamente atípicos y obtener submuestras aleatorias o estratificadas con semilla. La estratificación usa restos mayores y selección sin reemplazo. La propuesta se compara antes de aceptar; no crea evidencia nueva. Se pueden deshacer las diez últimas modificaciones durante la sesión y conservar el resultado guardando una versión.

## Consumidores y fuentes

El guardián CBI instala un adaptador para las rutas CSV del catálogo pertenecientes al contenido autorizado y marcadas como entrada directa o generador. Si existe una versión activa, esa es la que recibe la página en su próxima carga. Sin versión activa, se mantiene el archivo original del repositorio. Si no se puede consultar el catálogo, se muestra un aviso explícito de uso de originales. Las nuevas páginas deben usar el guardián y solicitar la ruta registrada después de validar acceso.

- INNOVAE: las referencias activas alimentan el generador. Sus parámetros se guardan junto al CSV de referencias. El CSV sintético es un resultado exportable; editar ese resultado no sustituye las 1.000 poblaciones del motor. La vista local de prueba existente se identifica en el simulador y se retira en la pestaña al publicar referencias desde el panel.
- AEI: histórico v5 y solicitudes 2026 son entradas directas. Las bases v2–v4 son históricas. El CSV sectorial es una exportación de consulta: el visor usa un JSON derivado que debe reconstruirse para trasladarle cambios.
- Incentivos Regionales: zonas/intensidades, módulos y municipios prioritarios son entradas CSV directas. La geometría GeoJSON queda fuera del editor CSV.

Para INNOVAE, se muestran los 25 PDF y el uso de cada uno: las cinco DECA aportan pares de inversión-ahorro; el informe RENOINN contrasta demanda/admisión; el resto aporta contexto documental. Descargar documentos de Biogás, RENOCOGEN, HIALMAC o MOVES no implica que sus importes se hayan utilizado en las ratios frigoríficas.

## Pruebas

```sh
npm ci --prefix scripts/data-platform
NODE_PATH=scripts/data-platform/node_modules node --test scripts/data-platform/*.test.cjs scripts/innovae-frio/*.test.cjs
```

Las pruebas DOM recorren la sección dentro del panel, visores, edición de fila, deshacer, muestra estratificada, guardado y publicación con un backend de prueba. Las pruebas de consumidor comprueban el aislamiento por ayuda y la sustitución de CSV activos. La migración aplicada a Supabase se conserva en `cbi/supabase/migrations/20261109133408_platform_data_catalog.sql`. `registry.json` es una instantánea inicial del inventario; la fuente operativa del catálogo es Supabase.
