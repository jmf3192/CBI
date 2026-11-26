const byId = (id) => document.getElementById(id);
const tabs = [...document.querySelectorAll('[role="tab"]')];
const pageSize = 20;
const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const points = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const dataRoot = '../data/innterconecta-step/';
let projects = [];
let page = 0;

function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', selected);
    item.tabIndex = selected ? 0 : -1;
    byId(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(tab);
    const target = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectTab(tabs[target], true);
  });
}

const clean = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const number = (value, formatter) => {
  const parsed = window.CBIData.number(value);
  return Number.isFinite(parsed) ? formatter.format(parsed) : '—';
};

function source(url) {
  try {
    const link = new URL(url);
    if (link.protocol === 'https:') {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = 'Consultar';
      return anchor;
    }
  } catch {
    // Unavailable source.
  }
  return '—';
}

function row(values) {
  const tr = document.createElement('tr');
  for (const value of values) {
    const td = document.createElement('td');
    td.append(value ?? '—');
    tr.append(td);
  }
  return tr;
}

function renderProjects() {
  const program = byId('programa').value;
  const year = byId('ejercicio').value;
  const query = clean(byId('buscar').value).trim();
  const selected = projects.filter((item) =>
    (!program || item.programa === program) &&
    (!year || item.anio_convocatoria === year) &&
    clean([item.expediente, item.titulo, item.representante].join(' ')).includes(query)
  );
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  page = Math.min(Math.max(page, 0), pages - 1);
  byId('historico-estado').textContent = selected.length
    ? selected.length + ' proyectos en la selección'
    : 'No hay proyectos incorporados que coincidan con estos filtros. Consulta la cobertura por edición.';
  byId('proyectos').replaceChildren(...selected.slice(page * pageSize, (page + 1) * pageSize).map((item) => {
    const title = document.createElement('div');
    const code = document.createElement('strong');
    code.textContent = item.expediente;
    title.append(code, document.createElement('br'), item.titulo);
    return row([
      item.programa + ' ' + item.anio_convocatoria, title, item.representante || '—',
      number(item.puntos, points), number(item.presupuesto_elegible_eur, money),
      number(item.subvencion_eur, money), source(item.fuente_url),
    ]);
  }));
  byId('paginacion').hidden = pages <= 1;
  byId('pagina').textContent = (page + 1) + ' de ' + pages;
  byId('anterior').disabled = page === 0;
  byId('siguiente').disabled = page >= pages - 1;
}

async function readDataset(file, requiredColumns) {
  const response = await fetch(dataRoot + file);
  if (!response.ok) throw new Error('No se pudo abrir ' + file);
  const data = window.CBIData.parse(await response.text(), ',');
  if (!requiredColumns.every((key) => data.headers.includes(key))) {
    throw new Error('Faltan columnas en ' + file);
  }
  return data.records;
}

function options(id, values) {
  const select = byId(id);
  for (const value of [...new Set(values.filter(Boolean))].sort()) {
    select.add(new Option(value, value));
  }
}

async function loadHistory() {
  const [projectResult, coverageResult] = await Promise.allSettled([
    readDataset('proyectos.csv', ['programa', 'anio_convocatoria', 'expediente', 'titulo', 'representante', 'puntos', 'presupuesto_elegible_eur', 'subvencion_eur', 'fuente_url']),
    readDataset('cobertura.csv', ['programa', 'anio_convocatoria', 'edicion', 'cobertura', 'fuente_url']),
  ]);
  if (coverageResult.status === 'fulfilled') {
    byId('cobertura').replaceChildren(...coverageResult.value.map((item) => row([
      item.programa, item.anio_convocatoria, item.edicion, item.cobertura, source(item.fuente_url),
    ])));
  } else {
    byId('cobertura-estado').textContent = 'No se pudo cargar la cobertura histórica.';
  }
  if (projectResult.status === 'rejected') {
    byId('historico-estado').textContent = 'No se pudo cargar el histórico de proyectos.';
    return;
  }
  projects = projectResult.value;
  const allEditions = [...projects, ...(coverageResult.value ?? [])];
  options('programa', allEditions.map((item) => item.programa));
  options('ejercicio', allEditions.map((item) => item.anio_convocatoria));
  for (const id of ['programa', 'ejercicio', 'buscar']) {
    byId(id).addEventListener(id === 'buscar' ? 'input' : 'change', () => {
      page = 0;
      renderProjects();
    });
  }
  byId('anterior').addEventListener('click', () => { page -= 1; renderProjects(); });
  byId('siguiente').addEventListener('click', () => { page += 1; renderProjects(); });
  renderProjects();
}

if (document.body.dataset.cbiAccess === 'granted') {
  loadHistory();
} else {
  document.addEventListener('cbi:access-granted', loadHistory, { once: true });
}
