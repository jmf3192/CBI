# Modelo de nueva web Conasoc

Fecha de análisis: 2026-08-24

## Fuentes revisadas

- Web actual: https://conasoc.com/
- Web previa en Wix: https://jmf31892.wixsite.com/consultoresasociados/inicio
- Proyecto CBI local: `/Users/jorgemorenofuentes/Documents/Conasoc Business inteligence`

## Lectura de las webs previas

La web actual de Conasoc transmite una marca más contemporánea: navegación sobria, logo tipográfico, uso fuerte del azul corporativo, mensajes directos y foco en tres pilares: financiación pública, innovación y servicios jurídicos. También incorpora datos de prueba social como más de 300 millones de euros obtenidos, el proceso de trabajo en ocho fases, pro bono, convenios y contacto.

La web Wix previa es más clásica y comercial. Usa fotografía corporativa, logo circular, menú con clientes, financiación y consultoría, servicios jurídicos y contacto. Su mayor valor está en el desglose de servicios: financiación pública, deducciones I+D+i, proyectos I+D+i, licitaciones e internacionalización. También aporta una lista amplia de sectores cliente.

La nueva web debe sintetizar ambas: conservar la confianza, experiencia y lenguaje comercial de las dos versiones, pero ordenar mejor la arquitectura y dar entrada a CBI como parte natural del sitio.

## Posicionamiento

Conasoc debe presentarse como consultora especializada en financiación pública, subvenciones, asesoramiento jurídico-administrativo y análisis competitivo para convocatorias.

Mensaje central:

> Conasoc ayuda a empresas a identificar, tramitar, defender y optimizar financiación pública, ahora con una capa CBI para tomar decisiones con datos.

## Arquitectura propuesta

- Inicio: promesa principal, CTA de contacto y acceso a CBI.
- Quiénes somos: experiencia desde 1996, más de 30 años y más de 300 M€ gestionados.
- Servicios: financiación pública, innovación/I+D+i, servicios jurídicos, CBI.
- Cómo trabajamos: proceso de ocho fases desde sesión inicial hasta cobro.
- CBI: pestaña propia para el área privada de business intelligence.
- Clientes y sectores: prueba de transversalidad.
- Pro bono y convenios: captación de startups, emprendedores y colaboraciones.
- Contacto: teléfono, correos y dirección.

## Decisión CBI

El proyecto CBI existente no desaparece: pasa a vivir como área dentro de Conasoc.

Estado aplicado en esta primera versión:

- Se crea ruta `/cbi`.
- Se copian las pantallas estáticas actuales a `public/cbi/`.
- La home enlaza a CBI como servicio y como pestaña principal.
- La documentación registra que la siguiente fase es migrar la funcionalidad HTML a componentes y conectarla con Supabase.

Siguiente fase técnica:

- Convertir `public/cbi/interfaces/*.html` en componentes dentro de `app/cbi`.
- Definir autenticación real con Supabase Auth.
- Migrar convocatorias, usuarios, permisos, evaluaciones y CSV a tablas con RLS.
- Mantener convocatorias y reglas de scoring versionadas en GitHub.

## Tono y diseño

- Tono: directo, experto, cercano, sin exceso institucional.
- Visual: limpio, corporativo, con blanco, azul profundo, azul Conasoc, verde agua y acento dorado.
- Componentes: secciones amplias, tarjetas solo para elementos repetidos, navegación compacta, CTA claros.
- Imágenes: logo y pieza visual “nosotros” de la web actual para mantener continuidad de marca.

## Contenido base

Mensajes que deben mantenerse:

- “Dedícate a lo que sabes: tu empresa.”
- “Nosotros conseguimos tu financiación.”
- “Más de 30 años de experiencia.”
- “Más de 300 millones de euros en financiación pública obtenidos.”
- “Especialistas en subvenciones y financiación pública.”
- “CBI como plataforma para evaluar competitividad frente a convocatorias.”
