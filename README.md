# Web Conasoc

Web estática de Conasoc preparada para publicarse en GitHub Pages.

## Estructura

```text
index.html
juridicos.html
probono.html
contacto.html
alternativas-inicio.html
aviso-legal.html
politica-privacidad.html
politica-cookies.html
styles.css
assets/
  logo-conasoc.png
  hero-conasoc-reference.png
cbi/
  index.html
  interfaces/
  assets/
docs/
  modelo-web-conasoc.md
references/
  conasoc.com/
```

## Publicación en GitHub Pages

1. Subir este repositorio a GitHub.
2. Entrar en `Settings > Pages`.
3. Elegir `Deploy from a branch`.
4. Seleccionar rama `main` y carpeta `/root`.
5. Guardar.

La web funciona sin build, sin dependencias y sin servidor propio.

## CBI

CBI queda como pestaña superior y entrada discreta en `cbi/index.html`.
Las pantallas estáticas actuales se conservan en `cbi/interfaces/`.

## Páginas

- `index.html`: inicio, financiación y consultoría, proceso y acceso a Probono.
- `juridicos.html`: servicios jurídicos.
- `probono.html`: orientación inicial para startups y emprendedores.
- `contacto.html`: datos de contacto y primera revisión.
- `alternativas-inicio.html`: laboratorio de alternativas narrativas y visuales para la página de inicio.
- `aviso-legal.html`: información legal del titular y condiciones de uso.
- `politica-privacidad.html`: información básica de protección de datos.
- `politica-cookies.html`: política de cookies para la versión estática actual.

## Modelo

El análisis de las webs previas y las decisiones de diseño están en:

- [docs/modelo-web-conasoc.md](docs/modelo-web-conasoc.md)

## Referencias

La copia local de la web actual de CONAsoc para consulta de contenido y estilo está en:

- [references/conasoc.com/README.md](references/conasoc.com/README.md)
