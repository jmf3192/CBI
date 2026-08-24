# Web Conasoc

Web estática de Conasoc preparada para publicarse en GitHub Pages.

## Estructura

```text
index.html
styles.css
assets/
  logo-conasoc.png
  wix-hero-buildings.jpeg
cbi/
  index.html
  interfaces/
  assets/
docs/
  modelo-web-conasoc.md
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

## Modelo

El análisis de las webs previas y las decisiones de diseño están en:

- [docs/modelo-web-conasoc.md](docs/modelo-web-conasoc.md)
