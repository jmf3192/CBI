# Modelo de nueva web Conasoc

Fecha de análisis: 2026-08-24

## Fuentes revisadas

- Web actual: https://conasoc.com/
- Web previa en Wix: https://jmf31892.wixsite.com/consultoresasociados/inicio
- Proyecto CBI local: `/Users/jorgemorenofuentes/Documents/Conasoc Business inteligence`

## Lectura de las webs previas

La web actual de Conasoc transmite una marca más contemporánea: navegación sobria, logo tipográfico, uso fuerte del azul corporativo, mensajes directos y foco en tres pilares: financiación pública, innovación y servicios jurídicos. También incorpora datos de prueba social como más de 300 millones de euros obtenidos, el proceso de trabajo en ocho fases, pro bono, convenios y contacto.

La web Wix previa es más clásica y comercial. Usa fotografía corporativa, logo circular, menú con clientes, financiación y consultoría, servicios jurídicos y contacto. Su mayor valor está en el desglose de servicios: financiación pública, deducciones I+D+i, proyectos I+D+i, licitaciones e internacionalización. También aporta una lista amplia de sectores cliente.

La nueva web debe sintetizar ambas: conservar la confianza, experiencia y lenguaje comercial de las dos versiones, ordenar mejor la arquitectura y dejar CBI como área privada accesible desde la navegación superior, sin robar protagonismo a la web corporativa.

## Posicionamiento

Conasoc debe presentarse como consultora especializada en financiación pública, subvenciones y asesoramiento jurídico-administrativo.

Mensaje central:

> Conasoc ayuda a empresas a identificar, tramitar, defender y optimizar financiación pública.

## Arquitectura propuesta

- Inicio: promesa principal y CTA de contacto.
- Quiénes somos: experiencia desde 1996, más de 30 años y más de 300 M€ gestionados.
- Servicios: financiación pública, innovación/I+D+i y servicios jurídicos.
- Cómo trabajamos: proceso de ocho fases desde sesión inicial hasta cobro.
- CBI: pestaña propia para el área privada de business intelligence, sin bloque promocional en la home.
- Clientes y sectores: prueba de transversalidad.
- Pro bono y convenios: captación de startups, emprendedores y colaboraciones.
- Contacto: teléfono, correos y dirección.

## Decisión CBI

El proyecto CBI existente no desaparece: pasa a vivir como área dentro de Conasoc.

Estado aplicado en esta primera versión:

- Se crea ruta `/cbi`.
- Se copian las pantallas estáticas actuales a `cbi/interfaces/`.
- La home mantiene CBI solo como pestaña de navegación, sin bloque destacado ni reclamo comercial.
- El sitio queda preparado como HTML/CSS estático para publicarse en GitHub Pages.

Siguiente fase técnica:

- Decidir si CBI seguirá como HTML estático o se convertirá más adelante en una aplicación con autenticación real.
- Mantener convocatorias, usuarios, permisos, evaluaciones y CSV dentro de una arquitectura versionada y documentada.
- Evitar que CBI condicione la home corporativa mientras no sea un producto público.

## Tono y diseño

- Tono: directo, experto, cercano, sin exceso institucional.
- Visual: limpio y corporativo, más cercano a la web Wix previa: fotografía arquitectónica, blanco, azul profundo y navegación clásica.
- Componentes: secciones editoriales, listas y líneas de separación antes que grids de tarjetas simétricas.
- Imágenes: logo actual y fondo de edificios de la web Wix previa. Se descarta la pieza visual de muñecos azules.
- Pasada anti-“web IA”: se eliminan hero con gradiente, CTA doble protagonista, tarjetas uniformes, paneles tipo SaaS, sombras blandas y protagonismo artificial de CBI.

## Contenido base

Mensajes que deben mantenerse:

- “Dedícate a lo que sabes: tu empresa.”
- “Nosotros conseguimos tu financiación.”
- “Más de 30 años de experiencia.”
- “Más de 300 millones de euros en financiación pública obtenidos.”
- “Especialistas en subvenciones y financiación pública.”
