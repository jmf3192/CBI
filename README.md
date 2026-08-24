# Web Conasoc

Nueva web corporativa de Conasoc con integración inicial de CBI como pestaña propia.

## Objetivo

Crear una web pública para Conasoc que reúna:

- presentación corporativa y contacto;
- servicios de financiación pública, I+D+i y asesoramiento jurídico;
- proceso de trabajo;
- clientes y sectores;
- área CBI para business intelligence de convocatorias.

## CBI

La funcionalidad existente de CBI se ha incorporado inicialmente como estático en:

```text
public/cbi/
```

La ruta pública `/cbi` funciona como entrada integrada dentro de la nueva web.

## Documentación

- [Modelo de la nueva web](docs/modelo-web-conasoc.md)

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

## Estructura principal

```text
app/
  page.tsx
  cbi/page.tsx
  globals.css
docs/
  modelo-web-conasoc.md
public/
  assets/
  cbi/
```
