import { criteria } from './innterconecta-step-model.js?v=20261126-3';

const oldScores = [
  ['Encaje con los objetivos del programa', 5],
  ['Valoración del consorcio', 15],
  ['Excelencia científico-técnica y viabilidad', 25],
  ['Capacidad económico-financiera', 10],
  ['Mercado potencial', 15],
  ['Impacto socioeconómico', 20],
  ['Internacionalización', 10],
];
const oldBase = ['Orden CIN/1729/2011 · art. 14', 'https://www.boe.es/eli/es/o/2011/06/09/cin1729'];
const oldThemes = 'Admitía cualquier temática de alto nivel tecnológico, valor añadido y creación de empleo cualificado. Las convocatorias destacaban estas áreas por comunidad.';
const andalusia = ['Energía y cambio climático', 'Biotecnología y salud', 'Sector aeroespacial', 'Sociedad de la información', 'Metalmecánica', 'Agroindustria'];
const galicia = ['Agroalimentación y recursos marinos', 'Tecnología biosanitaria', 'TIC', 'Tecnologías de producción', 'Materiales y nanotecnología', 'Energía', 'Construcción', 'Medioambiente', 'Transporte sostenible'];
const extremadura = ['Energía', 'Tecnologías del agua', 'Construcción y obra pública sostenible', 'Biotecnología y salud', 'TIC', 'Metalmecánica', 'Agroindustria', 'Valorización de materiales naturales'];
const oldEdition = {
  scores: oldScores,
  evaluation: 'Hasta 100 puntos. Obtener cero en el criterio de encaje excluía el proyecto.',
  thematicNote: oldThemes,
};

const federScores = [
  ['Excelencia técnica, innovación y solidez económica', 30],
  ['Capacidad técnica y económica del consorcio', 15],
  ['Proyección internacional', 20],
  ['Explotación de resultados y mercado', 20],
  ['Impacto socioeconómico', 15],
];
const socialChallenges = ['Salud, demografía y bienestar', 'Alimentación, agricultura sostenible, recursos naturales y mar', 'Energía limpia y eficiente', 'Transporte sostenible e inteligente', 'Clima, recursos y materias primas', 'Innovación y cambio social', 'Economía y sociedad digital', 'Seguridad, protección y defensa'];
const federEdition = {
  scores: federScores,
  evaluation: 'Cinco bloques que suman 100 puntos. El mayor peso corresponde a la excelencia del proyecto.',
  thematicNote: 'La propuesta debía encajar en uno de los ocho retos sociales.',
  themes: [['Retos sociales', socialChallenges]],
};

const stepEdition = {
  scores: criteria,
  evaluation: 'Mínimo global de 50/100. La evaluación se detiene si la propuesta no alcanza los umbrales del primer o del segundo criterio.',
  thematicNote: 'El proyecto debe encajar en al menos uno de los tres ámbitos STEP. Estos ejemplos resumen el anexo tecnológico.',
  themes: [
    ['Digital y tecnología profunda', ['Semiconductores', 'Inteligencia artificial', 'Computación cuántica', 'Conectividad y navegación', 'Detección avanzada']],
    ['Tecnologías limpias y eficientes en recursos', ['Energías renovables', 'Hidrógeno', 'Almacenamiento de energía', 'Materiales avanzados y reciclaje', 'Eficiencia energética']],
    ['Biotecnología', ['Aplicaciones biotecnológicas', 'Medicamentos esenciales de la UE y sus componentes']],
  ],
};

export const editionRules = {
  '2011': {
    ...oldEdition,
    title: 'FEDER INNTERCONECTA 2011',
    themes: [['Andalucía', andalusia], ['Galicia', galicia]],
    sources: [
      oldBase,
      ['Convocatoria de Andalucía · art. 1', 'https://www.cdti.es/sites/default/files/2023-05/convocatoria_innterconecta_andalucia.pdf'],
      ['Convocatoria de Galicia · art. 1', 'https://www.cdti.es/sites/default/files/2023-05/convocatoria_innterconecta_galicia.pdf'],
    ],
  },
  '2013': {
    ...oldEdition,
    title: 'FEDER INNTERCONECTA 2013',
    themes: [['Andalucía', andalusia], ['Extremadura', extremadura], ['Galicia', galicia]],
    sources: [
      oldBase,
      ['Convocatoria de Andalucía', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-2010'],
      ['Convocatoria de Extremadura', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-2011'],
      ['Convocatoria de Galicia', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-2012'],
    ],
  },
  '2015': {
    ...federEdition,
    title: 'FEDER INNTERCONECTA 2015',
    sources: [['Convocatoria · arts. 2 y 11', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-4493']],
  },
  '2016': {
    ...federEdition,
    title: 'FEDER INNTERCONECTA 2016',
    sources: [
      ['CDTI · retos sociales', 'https://www.cdti.es/ayudas/feder-innterconecta-2016'],
      ['BOE · extracto de la convocatoria', 'https://www.boe.es/diario_boe/txt.php?id=BOE-B-2016-17479'],
      ['AZTI · detalle de ponderaciones', 'https://www.azti.es/wp-content/uploads/2016/05/Resumen-FEDER-Innterconecta-2016.pdf'],
    ],
  },
  '2018': {
    ...federEdition,
    title: 'FEDER INTERCONECTA 2018',
    sources: [['Convocatoria · arts. 2 y 11', 'https://www.cdti.es/sites/default/files/2023-05/2018_convocatoria_feder_interconecta_2018_0.pdf']],
  },
  '2025': {
    ...stepEdition,
    title: 'INNTERCONECTA STEP 2025',
    sources: [
      ['Orden CNU/161/2025 · art. 20.1.b', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-3176'],
      ['Convocatoria · art. 13 y anexo I', 'https://www.cdti.es/sites/default/files/2025-04/convocatoria_cdti-step_2025_v10_firmada_web.pdf'],
    ],
  },
  '2026': {
    ...stepEdition,
    title: 'INNTERCONECTA STEP 2026',
    thematicNote: stepEdition.thematicNote + ' La convocatoria reserva al menos 10 M€ para proyectos STEP sobre patologías con mayor impacto en las mujeres, conforme al anexo II.',
    sources: [
      ['Orden CNU/331/2026 · art. 20.1.b', 'https://www.boe.es/eli/es/o/2026/04/08/cnu331'],
      ['Convocatoria · art. 13 y anexos I y II', 'https://www.cdti.es/sites/default/files/2026-11/1.convocatoria_cdti-step_2026_v08_vade_fdotr.pdf'],
    ],
  },
};

function node(tag, label, className) {
  const element = document.createElement(tag);
  if (label) element.textContent = label;
  if (className) element.className = className;
  return element;
}

export function renderRules(target, rules) {
  const grid = node('div', '', 'step-rule-grid');
  const scores = node('section', '', 'step-rule-scores');
  const criteriaList = node('ol');
  for (const [label, max, min] of rules.scores) {
    const item = node('li');
    const meter = node('meter');
    meter.max = 100;
    meter.value = max;
    meter.setAttribute('aria-hidden', 'true');
    const weight = max + ' pt' + (min ? ' · mín. ' + min : '');
    item.append(node('span', label), node('strong', weight), meter);
    criteriaList.append(item);
  }
  scores.append(node('h3', 'Criterios de evaluación'), node('p', rules.evaluation, 'small muted'), criteriaList);
  const themes = node('section', '', 'step-rule-themes');
  themes.append(node('h3', 'Temáticas prioritarias'), node('p', rules.thematicNote, 'small muted'));
  for (const [title, labels] of rules.themes) {
    const list = node('ul');
    list.append(...labels.map((label) => node('li', label)));
    themes.append(node('h4', title), list);
  }
  grid.append(scores, themes);
  const sources = node('div', '', 'step-rule-sources');
  for (const [label, url] of rules.sources) {
    const anchor = node('a', label);
    anchor.href = url;
    sources.append(anchor);
  }
  target.replaceChildren(grid, node('h3', 'Fuentes'), sources);
}
