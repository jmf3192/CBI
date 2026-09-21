const DATA = {
  grants: "../data/aei/aei_concesiones_base_v3.csv",
  applications: "../data/aei/aei_solicitudes_2026.csv",
};

const state = { view: "all", line: "all", rows: [] };
const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const score = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const clean = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted && char === '"' && clean[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...values] = rows;
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] || ""])));
}

function numeric(value) { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : null; }
function sum(rows, key) { return rows.reduce((total, row) => total + (numeric(row[key]) || 0), 0); }
function unique(rows, key) { return new Set(rows.map((row) => row[key]).filter(Boolean)).size; }
function is2026(row) { return String(row.anio_convocatoria) === "2026"; }
function title(row) { return row.titulo_proyecto || row.razon_social || "Proyecto sin título publicado"; }
function granted(row) { return ["concedida_segun_listado", "propuesta_provisional_aprobada"].includes(row.estado_en_fuente); }
function requested(row) { return numeric(row.solicitado_eur); }
function funding(row) { return numeric(row.subvencion_eur ?? row.subvencion_columna_fuente_eur); }

function sourceRows() {
  if (state.view === "sector") return [];
  return state.rows.filter((row) => {
    const selected = state.view === "all" || String(row.anio_convocatoria) === state.view;
    const variant = state.line === "all" || (row.variante_convocatoria || "general") === state.line;
    return selected && variant;
  });
}

function createTab(label, value, selected, onClick, className) {
  const button = document.createElement("button");
  button.type = "button"; button.className = className; button.textContent = label;
  button.setAttribute("role", "tab"); button.setAttribute("aria-selected", String(selected));
  button.addEventListener("click", onClick); return button;
}

function renderCallTabs() {
  const root = document.querySelector("#call-tabs"); root.textContent = "";
  root.append(createTab("Agregado", "all", state.view === "all", () => { state.view = "all"; state.line = "all"; render(); }, "call-tab"));
  const years = [...new Set(state.rows.map((row) => String(row.anio_convocatoria)))].sort((a, b) => Number(b) - Number(a));
  years.forEach((year) => root.append(createTab(year, year, state.view === year, () => { state.view = year; state.line = "all"; render(); }, "call-tab")));
  root.append(createTab("Frío, logística y distribución", "sector", state.view === "sector", () => { state.view = "sector"; render(); }, "call-tab"));
}

function renderLineTabs(rows) {
  const root = document.querySelector("#line-tabs"); root.textContent = "";
  const variants = [...new Set(rows.map((row) => row.variante_convocatoria || "general"))].sort();
  root.append(createTab("Todas las líneas", "all", state.line === "all", () => { state.line = "all"; render(); }, "line-tab"));
  variants.forEach((variant) => {
    const label = ({ RETOS: "RETOS", b: "Línea b", sin_sufijo: "Línea general", general: "Línea general" })[variant] || variant;
    root.append(createTab(label, variant, state.line === variant, () => { state.line = variant; render(); }, "line-tab"));
  });
}

function setMetric(id, value, note = "") { document.querySelector(`#${id}`).textContent = value; document.querySelector(`#${id}-note`).textContent = note; }

function renderMetrics(rows) {
  const projects = unique(rows, "id_registro");
  const requestedRows = rows.filter((row) => requested(row) !== null);
  const favorable = rows.filter(granted);
  const confirmed = favorable.filter((row) => row.estado_en_fuente === "concedida_segun_listado");
  const provisional = favorable.filter((row) => row.estado_en_fuente === "propuesta_provisional_aprobada");
  const approvedScores = favorable.map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  setMetric("m-projects", number.format(projects), `${number.format(unique(rows, "expediente"))} expedientes con código publicado`);
  setMetric("m-aei", number.format(unique(rows, "nif")), "Entidades con NIF publicado; no equivale a empresas miembro");
  setMetric("m-companies", "No publicado", "La base no identifica participantes empresariales por proyecto");
  setMetric("m-requested", requestedRows.length ? eur.format(sum(requestedRows, "solicitado_eur")) : "No publicado", requestedRows.length ? `${number.format(requestedRows.length)} solicitudes con importe` : "El histórico no publica este campo de forma homogénea");
  const confirmedValue = sum(confirmed, "subvencion_eur"); const provisionalValue = sum(provisional, "subvencion_eur");
  const awardLabel = confirmedValue && provisionalValue ? `${eur.format(confirmedValue)} + ${eur.format(provisionalValue)}` : eur.format(confirmedValue || provisionalValue);
  setMetric("m-awarded", favorable.length ? awardLabel : "No publicado", provisionalValue ? "Primer importe: concedido; segundo: propuesta provisional 2026" : "Importe según listado de concesión");
  setMetric("m-cutoff", approvedScores.length ? `${score.format(Math.min(...approvedScores))} ptos.` : "No publicado", approvedScores.length ? "Menor puntuación favorable disponible" : "No hay puntuaciones publicadas en esta selección");
  setMetric("m-average", approvedScores.length ? `${score.format(approvedScores.reduce((a, b) => a + b, 0) / approvedScores.length)} ptos.` : "No publicado", approvedScores.length ? "Media de puntuaciones favorables disponibles" : "No hay puntuaciones publicadas en esta selección");
}

function renderScoreChart(rows) {
  const values = rows.map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const root = document.querySelector("#score-chart"); const note = document.querySelector("#score-note");
  document.querySelector("#score-sample").textContent = values.length ? `${number.format(values.length)} puntuaciones` : "Sin muestra";
  if (!values.length) { root.innerHTML = '<div class="chart-empty">Esta convocatoria no publica puntuaciones comparables.</div>'; note.textContent = "La ausencia de puntuación no implica ausencia de evaluación."; return; }
  const bins = Array.from({ length: 10 }, () => 0);
  values.forEach((value) => { bins[Math.min(9, Math.max(0, Math.floor(value / 10)))] += 1; });
  const maximum = Math.max(...bins, 1); const cutoff = Math.min(...rows.filter(granted).map((row) => numeric(row.puntuacion)).filter((value) => value !== null));
  root.innerHTML = `<div class="histogram">${bins.map((count, index) => `<span class="${cutoff >= index * 10 && cutoff < (index + 1) * 10 ? "cut" : ""}" style="height:${Math.max(4, (count / maximum) * 100)}%" title="${index * 10}–${index * 10 + 9,9}: ${count}"></span>`).join("")}</div><div class="axis"><span>0</span><span>50</span><span>100 puntos</span></div>`;
  note.textContent = Number.isFinite(cutoff) ? `La barra oscura sitúa el tramo de la nota de corte (${score.format(cutoff)} puntos).` : "No hay resultados favorables con puntuación publicada en esta selección.";
}

function renderEuroChart(rows) {
  const requestedValue = sum(rows.filter((row) => requested(row) !== null), "solicitado_eur");
  const awardValue = sum(rows.filter(granted), "subvencion_eur");
  const maximum = Math.max(requestedValue, awardValue, 1);
  document.querySelector("#euro-sample").textContent = requestedValue ? "Importes publicados" : "Cobertura parcial";
  document.querySelector("#euro-chart").innerHTML = [
    ["Solicitado", requestedValue, ""], ["Concedido / propuesto", awardValue, "awarded"],
  ].map(([label, value, type]) => `<div class="euro-row"><div class="euro-label"><span>${label}</span><strong>${value ? eur.format(value) : "No publicado"}</strong></div><div class="bar-track"><div class="bar-fill ${type}" style="width:${(value / maximum) * 100}%"></div></div></div>`).join("");
  document.querySelector("#euro-note").textContent = requestedValue ? "Las solicitudes sólo están completas para 2026. Las propuestas de 2026 no son concesiones definitivas." : "El importe solicitado no está publicado de forma homogénea en el histórico disponible.";
}

function rowHtml(row, requestedColumn = false) { const amount = requestedColumn ? requested(row) : funding(row); return `<tr><td><span class="project-name" title="${title(row)}">${title(row)}</span><span class="entity">${row.razon_social || "Entidad no publicada"}</span></td><td>${numeric(row.puntuacion) === null ? "—" : score.format(numeric(row.puntuacion))}</td><td>${amount === null ? "—" : eur.format(amount)}</td></tr>`; }
function fillTable(id, rows, requestedColumn = false) { document.querySelector(`#${id}`).innerHTML = rows.length ? rows.slice(0, 5).map((row) => rowHtml(row, requestedColumn)).join("") : '<tr><td colspan="3" class="empty-cell">No hay registros comparables en esta selección.</td></tr>'; }
function renderTables(rows) {
  const awarded = rows.filter(granted).sort((a,b) => (numeric(b.puntuacion) || -1) - (numeric(a.puntuacion) || -1));
  const wait = rows.filter((row) => row.estado_en_fuente === "lista_espera_sin_concesion").sort((a,b) => (numeric(b.puntuacion) || -1) - (numeric(a.puntuacion) || -1));
  const below = rows.filter((row) => ["propuesta_desestimada_puntuacion", "propuesta_desestimada_motivos", "desistida"].includes(row.estado_en_fuente)).sort((a,b) => (numeric(b.puntuacion) || -1) - (numeric(a.puntuacion) || -1));
  fillTable("table-awarded", awarded); fillTable("table-near", wait, true); fillTable("table-below", below, true);
}

function render() {
  renderCallTabs();
  const sector = state.view === "sector";
  document.querySelector("#analysis").hidden = sector; document.querySelector("#sector-placeholder").hidden = !sector;
  if (sector) return;
  const priorRows = state.view === "all" ? state.rows : state.rows.filter((row) => String(row.anio_convocatoria) === state.view);
  renderLineTabs(priorRows);
  const rows = sourceRows();
  const selection = state.view === "all" ? "Todas las convocatorias disponibles" : `Convocatoria ${state.view}`;
  document.querySelector("#context-label").textContent = selection;
  document.querySelector("#context-note").textContent = `${number.format(rows.length)} registros tras aplicar la selección. Los campos no publicados se muestran como tales y no se estiman.`;
  renderMetrics(rows); renderScoreChart(rows); renderEuroChart(rows); renderTables(rows);
}

async function load() {
  const [grantsResponse, applicationsResponse] = await Promise.all([fetch(DATA.grants), fetch(DATA.applications)]);
  if (!grantsResponse.ok || !applicationsResponse.ok) throw new Error("No se han podido cargar los datasets AEI.");
  const grants = parseCsv(await grantsResponse.text()).filter((row) => !is2026(row));
  const applications = parseCsv(await applicationsResponse.text()).map((row) => ({ ...row, variante_convocatoria: "general", subvencion_eur: row.subvencion_columna_fuente_eur }));
  state.rows = [...grants, ...applications];
  document.querySelector("#updated").textContent = `Actualizado con fuentes consultadas el 21 sep. 2026 · ${number.format(state.rows.length)} registros`;
  render();
}

document.addEventListener("cbi:access-granted", () => load().catch((error) => { document.querySelector("#analysis").hidden = false; document.querySelector("#context-label").textContent = "No se han podido cargar los datos"; document.querySelector("#context-note").textContent = error.message; }), { once: true });
