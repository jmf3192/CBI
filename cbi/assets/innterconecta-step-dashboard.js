import { assess, forecast, criteria, territories } from './innterconecta-step-model.js?v=20261126-2';

const get = (id) => document.getElementById(id);
const make = (tag, text) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  return node;
};
const num = (value) => String(value ?? '').trim() === '' ? NaN : window.CBIData.number(value);
const normal = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const show = (number, formatter = fmt) => Number.isFinite(number) ? formatter.format(number) : '—';
const root = '../data/innterconecta-step/';
const state = { rows: [], members: new Map(), pairs: [], results: [], page: 0, shown: new Map() };

function cellRow(values) {
  const tr = make('tr');
  for (const value of values) {
    const td = make('td');
    td.append(value ?? '—');
    tr.append(td);
  }
  return tr;
}
function link(url, title) {
  if (!url) return make('span', '—');
  try {
    const parsed = new URL(url, location.href);
    if (parsed.protocol === 'https:' || (parsed.origin === location.origin && parsed.protocol === 'http:')) {
      const a = make('a', title);
      a.href = parsed.href;
      return a;
    }
  } catch {
    // A record can lack a source URL.
  }
  return make('span', '—');
}
function renderMetrics(node, values, definition = false) {
  node.replaceChildren(...values.map(([label, value]) => {
    const box = make('div');
    box.append(make(definition ? 'dt' : 'span', label), make(definition ? 'dd' : 'strong', value));
    return box;
  }));
}
function bindTabs() {
  for (const list of document.querySelectorAll('[role=tablist]')) {
    const tabs = [...list.querySelectorAll('[role=tab]')];
    const activate = (tab, focus = false) => {
      for (const item of tabs) {
        item.setAttribute('aria-selected', item === tab);
        item.tabIndex = item === tab ? 0 : -1;
        get(item.getAttribute('aria-controls')).hidden = item !== tab;
      }
      if (focus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        const targets = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
        if (!(e.key in targets)) return;
        e.preventDefault();
        activate(tabs[targets[e.key]], true);
      });
    });
  }
}
const field = (title, control) => {
  const label = make('label', title);
  label.append(control);
  return label;
};
function select(options, placeholder) {
  const input = make('select');
  input.add(new Option(placeholder, ''));
  for (const [value, label] of options) input.add(new Option(label, value));
  return input;
}
function amount() {
  const input = make('input');
  input.type = 'number';
  input.min = '0';
  input.step = '0.01';
  input.inputMode = 'decimal';
  return input;
}
function addPartner() {
  if (get('partners').children.length >= 6) return;
  const fieldset = make('fieldset');
  fieldset.className = 'step-partner';
  const form = make('div');
  form.className = 'step-form';
  const fields = [
    ['name', 'Nombre de empresa', make('input')],
    ['size', 'Tamaño', select([['small', 'Pequeña'], ['medium', 'Mediana'], ['large', 'Grande']], 'Seleccionar')],
    ['region', 'CCAA de ejecución', select(territories.map((r) => [r,r]), 'Seleccionar')],
    ['industrial', 'Investigación industrial (€)', amount()],
    ['experimental', 'Desarrollo experimental (€)', amount()],
    ['group', 'Grupo vinculado o asociado', make('input')],
  ];
  for (const [key, title, input] of fields) {
    input.dataset.partner = key;
    if (key === 'group') input.placeholder = 'Solo si procede';
    form.append(field(title, input));
  }
  const remove = make('button', 'Quitar empresa');
  remove.type = 'button';
  remove.dataset.remove = '';
  remove.addEventListener('click', () => {
    if (get('partners').children.length > 2) {
      fieldset.remove(); updatePartnerControls(); updateAssessment();
      get('add-partner').focus();
    }
  });
  const aid = make('p');
  aid.className = 'muted partner-aid';
  fieldset.append(make('legend'), form, remove, aid);
  get('partners').append(fieldset);
  updatePartnerControls();
  updateAssessment();
}
function updatePartnerControls() {
  const partners = [...get('partners').children];
  get('add-partner').disabled = partners.length >= 6;
  partners.forEach((p, i) => {
    p.querySelector('legend').textContent = 'Empresa ' + (i + 1);
    p.querySelector('[data-remove]').hidden = partners.length <= 2;
  });
}
function partnerData() {
  return [...get('partners').children].map((p) => Object.fromEntries(
    [...p.querySelectorAll('[data-partner]')].map((input) => [
      input.dataset.partner, input.type === 'number' ? input.valueAsNumber : input.value,
    ])
  ));
}
function updateAssessment() {
  const model = assess({
    partners: partnerData(),
    research: get('research').valueAsNumber,
    scope: get('scope').value,
    independent: get('independent').checked || null,
    checked: get('checked').checked,
    scores: [...get('criteria').querySelectorAll('input')].map((p) => p.valueAsNumber),
  });
  const status = (x) => x === true ? 'Cumple' : x === false ? 'No cumple' : 'Pendiente';
  get('eligibility').replaceChildren(...model.eligibility.map(([label, result]) => cellRow([label, status(result)])));
  const failed = model.eligibility.filter(([, r]) => r === false).length;
  const pending = model.eligibility.filter(([, r]) => r === null).length;
  renderMetrics(get('assessment'), [
    ['Elegibilidad orientativa', failed ? failed + ' requisitos por corregir' : pending ? pending + ' requisitos pendientes' : 'Comprobaciones superadas'],
    ['Presupuesto elegible', show(model.total, eur)],
    ['Subvención máxima teórica', show(model.maxAid, eur)],
    ['Puntuación estimada', model.score == null ? '—' : show(model.score) + ' / 100'],
    ['CCAA del consorcio', String(model.regions.length)],
  ], true);
  get('assessment-note').textContent = model.scorePass == null ? 'Completa la autoevaluación para comprobar los mínimos de puntuación.' : model.scorePass ? 'Superas los mínimos de puntuación introducidos.' : 'La puntuación introducida no alcanza todos los mínimos.';
  [...get('partners').children].forEach((p, i) => {
    p.querySelector('.partner-aid').textContent = model.aid ? 'Ayuda máxima de la empresa: ' + show(model.aid[i], eur) : '';
  });
}
function setupApplication() {
  get('criteria').replaceChildren(...criteria.map(([label,max,min]) => {
    const input = amount();
    input.max = max;
    input.setAttribute('aria-label', label);
    return cellRow([label,String(max),min ? String(min) : '—',input]);
  }));
  get('solicitud').addEventListener('input', (event) => {
    if (event.target.id === 'credits' || event.target.id === 'demand') return;
    updateAssessment();
  });
  get('add-partner').addEventListener('click', () => {
    addPartner();
    get('partners').lastElementChild?.querySelector('input')?.focus();
  });
  addPartner();
  addPartner();
}
function updateForecast() {
  const scores = state.results.map((r) => num(r.puntos)).filter(Number.isFinite);
  const grants = state.results.filter((r) => r.resultado === 'Concedido').map((r) => num(r.subvencion_concedida_eur)).filter(Number.isFinite);
  const f = forecast({credits:get('credits').valueAsNumber,demand:get('demand').valueAsNumber,scores,grants});
  if (!f) {
    get('forecast-results').replaceChildren();
    get('forecast-context').textContent = scores.length && grants.length ? 'Introduce un crédito positivo y entre 1 y 2.000 expedientes evaluados.' : 'No hay suficientes registros disponibles para calcular el escenario.';
    return;
  }
  renderMetrics(get('forecast-results'), [
    ['Proyectos financiables · mediana', show(f.seats[1])],
    ['Proyectos financiables · P10–P90', f.seats[0] + '–' + f.seats[2]],
    ['Nota de corte · P10–P90', f.cutoff ? show(f.cutoff[0]) + '–' + show(f.cutoff[2]) : 'Sin corte estimado'],
    ['Escenarios sin corte por crédito', Intl.NumberFormat('es-ES',{style:'percent',maximumFractionDigits:1}).format(f.allFunded)],
  ]);
  get('forecast-context').textContent = scores.length + ' expedientes con nota y ' + grants.length + ' concesiones STEP 2025 en la muestra. Resultados condicionados a los supuestos introducidos.';
}
let forecastTimer;
for (const id of ['credits','demand']) get(id).addEventListener('input', () => {
  clearTimeout(forecastTimer);
  forecastTimer = setTimeout(updateForecast, 120);
});

function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts];
}
function bars(id, entries) {
  const max = Math.max(1,...entries.map(([, count]) => count));
  get(id).replaceChildren(...(entries.length ? entries.map(([label,count]) => {
    const item = make('div');
    item.className = 'step-bar';
    const meter = make('meter');
    meter.max = max;
    meter.value = count;
    meter.setAttribute('aria-label', label);
    item.append(make('span',label),meter,make('strong',fmt.format(count)));
    return item;
  }) : [make('p','Sin datos para la selección.')]));
}
const publishedRegions = (r) => (r.ccaa_consorcio_cdti || '').split('|').map((x) => x.trim()).filter(Boolean);
const caseRegions = (r) => publishedRegions(r).length ? publishedRegions(r).join(', ') : r.ccaa_convocatoria ? r.ccaa_convocatoria + ' (ámbito)' : '—';
const caseText = (r) => r.expediente || r.acronimo || r.id_proyecto;
function selectedRows() {
  const filter = Object.fromEntries(['program','year','region','outcome','search','order'].map((id) => [id,get(id).value]));
  const q = normal(filter.search).trim();
  const byYear = (a,b) => Number(b.anio_convocatoria) - Number(a.anio_convocatoria) || String(a.id_proyecto).localeCompare(b.id_proyecto);
  const order = {year:byYear,points:(a,b) => (num(b.puntos) || -1) - (num(a.puntos) || -1) || byYear(a,b),aid:(a,b) => (num(b.subvencion_eur) || -1) - (num(a.subvencion_eur) || -1) || byYear(a,b)};
  return state.rows.filter((r) =>
    (!filter.program || r.programa === filter.program) &&
    (!filter.year || r.anio_convocatoria === filter.year) &&
    (!filter.region || [...publishedRegions(r),r.ccaa_convocatoria].includes(filter.region)) &&
    (!filter.outcome || r.resultado === filter.outcome) &&
    (!q || normal([caseText(r),r.titulo,r.representante,...(state.members.get(r.id_proyecto) || []).map((m) => m.entidad)].join(' ')).includes(q))
  ).sort(order[filter.order]);
}
function renderHistory() {
  const rows = selectedRows();
  const awards = rows.filter((r) => r.resultado === 'Concedido');
  const amounts = awards.map((r) => num(r.subvencion_eur)).filter(Number.isFinite);
  get('history-status').textContent = fmt.format(rows.length) + ' expedientes en la selección';
  renderMetrics(get('history-kpis'), [
    ['Concesiones',fmt.format(awards.length)],
    ['Subvención concedida',show(amounts.length ? amounts.reduce((a,b) => a+b,0) : NaN,eur)],
    ['Con CCAA del consorcio',fmt.format(rows.filter((r) => publishedRegions(r).length).length)],
    ['Con puntuación',fmt.format(rows.filter((r) => Number.isFinite(num(r.puntos))).length)],
  ]);
  bars('by-year',tally(awards.map((r) => r.anio_convocatoria)).sort(([a],[b]) => a.localeCompare(b)));
  const buckets = new Map();
  for (const r of rows) {
    const score = num(r.puntos);
    if (!Number.isFinite(score)) continue;
    const min = Math.min(90,Math.floor(score / 10) * 10);
    buckets.set(min,(buckets.get(min) || 0) + 1);
  }
  bars('by-score',[...buckets].sort(([a],[b]) => a-b).map(([min,n]) => [min + '–' + (min === 90 ? '100' : '<' + (min+10)),n]));
  bars('by-region',tally(awards.flatMap(publishedRegions)).sort((a,b) => b[1]-a[1]));
  const ids = new Set(awards.map((r) => r.id_proyecto));
  bars('by-pair',tally(state.pairs.filter((r) => ids.has(r.id_proyecto)).map((r) => r.ccaa_1 + ' · ' + r.ccaa_2)).sort((a,b) => b[1]-a[1]).slice(0,10));
  const pages = Math.max(1,Math.ceil(rows.length / 20));
  state.page = Math.max(0,Math.min(pages-1,state.page));
  state.shown = new Map(rows.slice(state.page*20,(state.page+1)*20).map((r) => [r.id_proyecto,r]));
  get('cases').replaceChildren(...[...state.shown.values()].map((r) => {
    const title = make('div');
    const code = make('strong',caseText(r));
    code.className = 'case-code';
    title.append(code,r.titulo || '—');
    const button = make('button','Ver ficha');
    button.type = 'button';
    button.dataset.caseId = r.id_proyecto;
    button.setAttribute('aria-label','Ver ficha de ' + caseText(r));
    return cellRow([r.anio_convocatoria + ' · ' + r.programa,title,r.representante,caseRegions(r),r.resultado,show(num(r.puntos)),show(num(r.subvencion_eur),eur),button]);
  }));
  get('pagination').hidden = pages <= 1;
  get('page').textContent = (state.page+1) + ' de ' + pages;
  get('prev').disabled = state.page === 0;
  get('next').disabled = state.page >= pages-1;
}
function openCase(r) {
  const detail = get('case-detail');
  get('case-title').textContent = caseText(r);
  const sources = make('p');
  sources.append(link(r.fuente_url,'Resolución oficial'));
  for (const [urls,label] of [[r.fuente_presupuesto_url,'Presupuesto'],[r.fuente_ccaa_proyecto_url,'CCAA CDTI']]) {
    for (const u of (urls || '').split('|').map((v) => v.trim()).filter(Boolean)) {
      if (u !== r.fuente_url) sources.append(' · ',link(u,label));
    }
  }
  const metrics = make('dl');
  metrics.className = 'step-metrics';
  renderMetrics(metrics,[
    ['Representante',r.representante || '—'],['Resultado',r.resultado],['Puntuación',show(num(r.puntos))],
    ['Presupuesto elegible',show(num(r.presupuesto_elegible_eur),eur)],['Subvención',show(num(r.subvencion_eur),eur)],
    ['CCAA',caseRegions(r)],
  ],true);
  detail.replaceChildren(make('h3',r.titulo),metrics,sources);
  if (r.motivo) detail.append(make('p',r.motivo));
  if (r.estado_cobertura_ccaa) detail.append(make('p',r.estado_cobertura_ccaa));
  if (r.notas_cruce) detail.append(make('p',r.notas_cruce));
  const members = state.members.get(r.id_proyecto) || [];
  if (members.length) {
    detail.append(make('h3','Entidades identificadas'));
    const wrap = make('div'); wrap.className = 'table-scroll';
    const table = make('table'); table.className = 'step-table';
    const head = table.createTHead().insertRow();
    for (const label of ['Entidad','Rol','CCAA CDTI','Presupuesto','Subvención']) {
      const th = make('th',label); th.scope = 'col'; head.append(th);
    }
    table.createTBody().append(...members.map((m) => cellRow([m.entidad,m.rol,m.ccaa_cdti || '—',show(num(m.presupuesto_elegible_eur),eur),show(num(m.subvencion_eur),eur)])));
    wrap.append(table); detail.append(wrap);
  }
  get('case-dialog').showModal();
}
async function read(file) {
  const response = await fetch(root + file);
  if (!response.ok) throw Error('No se pudo cargar ' + file);
  const text = await response.text();
  return { rows:window.CBIData.parse(text,',').records,text };
}
function options(id, values, reverse = false) {
  const unique = [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b,'es'));
  if (reverse) unique.reverse();
  for (const value of unique) get(id).add(new Option(value,value));
}
function addDownload(file,label,data) {
  if (!data) return;
  const url = URL.createObjectURL(new Blob([data.text],{type:'text/csv;charset=utf-8'}));
  const a = make('a',label);
  a.href = url;
  a.download = file;
  get('downloads').append(a);
}
function coverageSources(row) {
  const node = make('div', row.estado || '');
  for (const [index, url] of (row.fuente_url || '').split(' | ').filter(Boolean).entries()) {
    node.append(' · ', link(url, 'Fuente ' + (index + 1)));
  }
  return node;
}
async function load() {
  const files = ['proyectos.csv','socios.csv','pares_ccaa.csv','cobertura.csv','resultados_step_2025.csv','escenario_2027.csv'];
  const fetched = await Promise.allSettled(files.map(read));
  const [projects, members, pairs, coverage, results, scenario] = fetched.map((r) => r.status === 'fulfilled' ? r.value : null);
  const awards = (projects?.rows || []).map((r) => ({...r,id_proyecto:r.id_proyecto || r.expediente}));
  state.results = results?.rows || [];
  state.pairs = pairs?.rows || [];
  for (const member of members?.rows || []) {
    if (!state.members.has(member.id_proyecto)) state.members.set(member.id_proyecto,[]);
    state.members.get(member.id_proyecto).push(member);
  }
  const listed = new Set(awards.map((r) => r.expediente).filter(Boolean));
  state.rows = [...awards,...state.results.filter((r) => !listed.has(r.expediente)).map((r) => ({
    ...r,id_proyecto:r.expediente,anio_convocatoria:'2025',programa:'STEP',subvencion_eur:r.subvencion_concedida_eur,
  }))];
  const editions = coverage?.rows || [];
  get('coverage').replaceChildren(...editions.map((r) => cellRow([
    r.anio_convocatoria,r.programa,r.ccaa_convocatoria || 'Plurirregional',r.proyectos_concedidos,r.proyectos_con_ccaa_cdti,
    coverageSources(r),
  ])));
  options('program',[...state.rows,...editions].map((r) => r.programa));
  options('year',[...state.rows,...editions].map((r) => r.anio_convocatoria),true);
  options('region',state.rows.flatMap((r) => [...publishedRegions(r),r.ccaa_convocatoria]));
  options('outcome',state.rows.map((r) => r.resultado));
  const labels = ['Proyectos CSV','Entidades CSV','Pares de CCAA CSV','Cobertura CSV','Resultados STEP 2025 CSV','Escenario 2027 CSV'];
  fetched.forEach((r,i) => addDownload(files[i],labels[i],r.value));
  for (const id of ['program','year','region','outcome','search','order']) {
    get(id).addEventListener(id === 'search' ? 'input' : 'change',() => {state.page=0;renderHistory();});
  }
  get('prev').onclick = () => {state.page--;renderHistory();};
  get('next').onclick = () => {state.page++;renderHistory();};
  get('cases').addEventListener('click',(e) => {
    const r = state.shown.get(e.target.closest('[data-case-id]')?.dataset.caseId);
    if (r) openCase(r);
  });
  const assumptions = scenario?.rows.find((r) => r.ejercicio === '2027');
  if (assumptions?.credito_eur) get('credits').value = assumptions.credito_eur;
  const scored = state.results.filter((r) => Number.isFinite(num(r.puntos))).length;
  get('demand').value = assumptions?.solicitudes_previstas || scored || '';
  updateForecast();
  renderHistory();
  const missing = fetched.flatMap((r,i) => r.status === 'rejected' ? [labels[i]] : []);
  if (missing.length) {
    const notice = make('p','No se pudieron abrir: ' + missing.join(', ') + '.');
    notice.setAttribute('role','status');
    get('history-status').after(notice);
  }
}

bindTabs();
if (document.body.dataset.cbiAccess === 'granted') {
  setupApplication();
  load();
} else {
  document.addEventListener('cbi:access-granted', () => {setupApplication();load();},{once:true});
}
