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
function lineOf(row) { return ["", "general", "sin_sufijo"].includes(row.variante_convocatoria) ? "general" : row.variante_convocatoria; }
function is2026(row) { return String(row.anio_convocatoria) === "2026"; }
function title(row) { return row.titulo_proyecto || row.razon_social || "Proyecto sin título publicado"; }
function granted(row) { return ["concedida_segun_listado", "propuesta_provisional_aprobada"].includes(row.estado_en_fuente); }
function requested(row) { return numeric(row.solicitado_eur); }
function funding(row) { return numeric(row.subvencion_eur ?? row.subvencion_columna_fuente_eur); }

function sourceRows() {
  if (state.view === "sector") return [];
  return state.rows.filter((row) => {
    const selected = state.view === "all" || (row.convocatoria || String(row.anio_convocatoria)) === state.view;
    const variant = state.line === "all" || lineOf(row) === state.line;
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
  const calls = [...new Set(state.rows.map((row) => row.convocatoria || String(row.anio_convocatoria)))].sort((a, b) => {
    const yearA = Number.parseInt(a, 10); const yearB = Number.parseInt(b, 10);
    return yearB - yearA || b.localeCompare(a, "es");
  });
  calls.forEach((call) => root.append(createTab(call, call, state.view === call, () => { state.view = call; state.line = "all"; render(); }, "call-tab")));
  root.append(createTab("Frío, logística y distribución", "sector", state.view === "sector", () => { state.view = "sector"; render(); }, "call-tab"));
}

function renderLineTabs(rows) {
  const root = document.querySelector("#line-tabs"); root.textContent = "";
  const variants = [...new Set(rows.map(lineOf))].filter(Boolean).sort();
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
  const maximum = Math.max(...bins, 1); const favorableScores = rows.filter(granted).map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const cutoff = Math.min(...favorableScores); const admittedAverage = favorableScores.reduce((total, value) => total + value, 0) / favorableScores.length;
  const overallAverage = values.reduce((total, value) => total + value, 0) / values.length;
  const marker = (value, className, label) => Number.isFinite(value) ? `<i class="reference ${className}" style="left:${Math.max(1, Math.min(99, value))}%" data-label="${label}: ${score.format(value)}"></i>` : "";
  root.innerHTML = `<div class="histogram">${bins.map((count, index) => `<span data-bin="${index}" style="height:${Math.max(4, (count / maximum) * 100)}%" title="${index * 10}–${index * 10 + 9,9}: ${count}"></span>`).join("")}<i class="cursor-marker" hidden></i><b class="cursor-tooltip" hidden></b>${marker(cutoff, "cutoff", "Corte")}${marker(admittedAverage, "admitted", "Media admitidas")}${marker(overallAverage, "average", "Media muestra")}</div><div class="axis"><span>0</span><span>50</span><span>100 puntos</span></div>`;
  const histogram = root.querySelector(".histogram"); const cursor = histogram.querySelector(".cursor-marker"); const tooltip = histogram.querySelector(".cursor-tooltip");
  histogram.addEventListener("mousemove", (event) => { const rect = histogram.getBoundingClientRect(); const value = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)); cursor.hidden = false; tooltip.hidden = false; cursor.style.left = `${value}%`; tooltip.style.left = `${value}%`; tooltip.textContent = `${score.format(value)} ptos.`; histogram.querySelectorAll("[data-bin]").forEach((bar) => bar.className = ""); histogram.querySelectorAll(".reference").forEach((reference) => { const active = Math.abs(Number.parseFloat(reference.style.left) - value) < 1.4; reference.classList.toggle("active", active); if (active) { const bin = histogram.querySelector(`[data-bin="${Math.min(9, Math.floor(Number.parseFloat(reference.style.left) / 10))}"]`); if (bin) bin.className = `${reference.classList.contains("cutoff") ? "cutoff-bar" : reference.classList.contains("admitted") ? "admitted-bar" : "average-bar"}`; } }); });
  histogram.addEventListener("mouseleave", () => { cursor.hidden = true; tooltip.hidden = true; histogram.querySelectorAll(".reference").forEach((reference) => reference.classList.remove("active")); histogram.querySelectorAll("[data-bin]").forEach((bar) => bar.className = ""); });
  histogram.addEventListener("click", (event) => { const rect = histogram.getBoundingClientRect(); const value = Math.max(0, Math.min(99.99, ((event.clientX - rect.left) / rect.width) * 100)); const lower = Math.floor(value / 10) * 10; const members = rows.filter((row) => { const itemScore = numeric(row.puntuacion); return itemScore !== null && itemScore >= lower && itemScore < lower + 10; }).sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion)); showScoreDetail(lower, members, cutoff, admittedAverage, overallAverage); });
  note.textContent = Number.isFinite(cutoff) ? `Referencias: corte ${score.format(cutoff)}, media de admitidas ${score.format(admittedAverage)} y media de la muestra ${score.format(overallAverage)}.` : "No hay resultados favorables con puntuación publicada en esta selección.";
}

function showScoreDetail(lower, members, cutoff, admittedAverage, overallAverage) {
  document.querySelector("#score-detail")?.remove();
  const dialog = document.createElement("dialog"); dialog.id = "score-detail"; dialog.className = "score-detail";
  dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="Cerrar">×</button><p class="eyebrow">Distribución de puntuaciones</p><h2>Tramo ${lower}–${lower + 9.9} puntos</h2><p class="dialog-note">${members.length} proyectos publicados. Corte: ${score.format(cutoff)} · media admitidas: ${score.format(admittedAverage)} · media muestra: ${score.format(overallAverage)}.</p><div class="dialog-list">${members.slice(0, 12).map((row) => `<div><strong>${title(row)}</strong><span>${row.razon_social || "Entidad no publicada"} · ${score.format(numeric(row.puntuacion))} puntos</span></div>`).join("") || "<p>No hay proyectos en este tramo.</p>"}</div>`;
  document.body.append(dialog); dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close()); dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }); dialog.showModal();
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
  const scored = rows.filter((row) => numeric(row.puntuacion) !== null);
  const favorableScores = rows.filter(granted).map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const cutoff = Math.min(...favorableScores);
  const awarded = [...scored].sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion));
  const wait = scored.filter((row) => numeric(row.puntuacion) > cutoff).sort((a,b) => numeric(a.puntuacion) - numeric(b.puntuacion));
  const below = scored.filter((row) => numeric(row.puntuacion) < cutoff).sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion));
  fillTable("table-awarded", awarded); fillTable("table-near", wait, true); fillTable("table-below", below, true);
}

function renderCallComparison(id, items, formatter, className, legend) {
  const root = document.querySelector(`#${id}`); const maximum = Math.max(...items.map((item) => item.value), 1);
  root.innerHTML = items.length ? `${items.map((item) => `<div class="call-row"><span>${item.label}</span><div class="call-track"><div class="call-fill ${className}" style="width:${(item.value / maximum) * 100}%"></div></div><strong>${formatter(item.value)}</strong></div>`).join("")}<p class="call-legend">${legend}</p>` : '<div class="chart-empty">No hay datos comparables para esta selección.</div>';
}

function renderAggregateCharts(rows) {
  const section = document.querySelector("#aggregate-charts"); section.hidden = state.view !== "all";
  if (state.view !== "all") return;
  const calls = [...new Set(rows.map((row) => row.convocatoria || row.anio_convocatoria))].sort((a,b) => Number.parseInt(b,10) - Number.parseInt(a,10));
  const groups = calls.map((call) => ({ label: call, rows: rows.filter((row) => (row.convocatoria || row.anio_convocatoria) === call) }));
  renderCallComparison("projects-by-call", groups.map((group) => ({ label: group.label, value: unique(group.rows, "id_registro") })), number.format, "", "Registros publicados por convocatoria.");
  renderCallComparison("funding-by-call", groups.map((group) => ({ label: group.label, value: sum(group.rows.filter(granted), "subvencion_eur") })), (value) => eur.format(value), "good", "Importe concedido o propuesto según la fuente.");
  renderCallComparison("scores-by-call", groups.map((group) => { const values=group.rows.map((row) => numeric(row.puntuacion)).filter((value) => value !== null); return { label: group.label, value: values.length ? values.reduce((total,value) => total+value,0)/values.length : 0 }; }).filter((item) => item.value), (value) => `${score.format(value)} ptos.`, "score", "Media de puntuaciones publicadas por convocatoria.");
}

function render() {
  renderCallTabs();
  const sector = state.view === "sector";
  document.querySelector("#analysis").hidden = sector; document.querySelector("#sector-placeholder").hidden = !sector;
  if (sector) return;
  const priorRows = state.view === "all" ? state.rows : state.rows.filter((row) => (row.convocatoria || String(row.anio_convocatoria)) === state.view);
  renderLineTabs(priorRows);
  const rows = sourceRows();
  const selection = state.view === "all" ? "Todas las convocatorias disponibles" : `Convocatoria ${state.view}`;
  document.querySelector("#context-label").textContent = selection;
  document.querySelector("#context-note").textContent = `${number.format(rows.length)} registros tras aplicar la selección. Los campos no publicados se muestran como tales y no se estiman.`;
  renderMetrics(rows); renderScoreChart(rows); renderEuroChart(rows); renderAggregateCharts(rows); renderTables(rows);
}

async function load() {
  const [grantsResponse, applicationsResponse] = await Promise.all([fetch(DATA.grants), fetch(DATA.applications)]);
  if (!grantsResponse.ok || !applicationsResponse.ok) throw new Error("No se han podido cargar los datasets AEI.");
  const grants = parseCsv(await grantsResponse.text()).filter((row) => !is2026(row));
  const applications = parseCsv(await applicationsResponse.text()).map((row) => ({ ...row, variante_convocatoria: "general", subvencion_eur: row.subvencion_columna_fuente_eur }));
  state.rows = [...grants, ...applications];
  render();
}

document.addEventListener("cbi:access-granted", () => load().catch((error) => { document.querySelector("#analysis").hidden = false; document.querySelector("#context-label").textContent = "No se han podido cargar los datos"; document.querySelector("#context-note").textContent = error.message; }), { once: true });
