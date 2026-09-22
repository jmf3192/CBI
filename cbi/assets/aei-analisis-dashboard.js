const DATA = {
  grants: "../data/aei/aei_solicitudes_historicas_v5.csv",
  sector: "../data/aei/aei_sector_frio.json",
  applications: "../data/aei/aei_solicitudes_2026.csv",
};

const state = { view: "all", rows: [], sectorData: { projects: [], coverage: [] }, sectorYear: "all", sectorScope: "all", sectorStatus: "all", sectorSearch: "", sectorSort: "convocatoria", sectorDirection: "desc", estimateModel: { multiplier: 1, byCallLine: new Map(), byCall: new Map(), fallback: null } };
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
function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function requestMultiplier(rows) {
  return median(rows.map((row) => {
    const value = requested(row); const grant = funding(row);
    return value !== null && grant !== null && grant > 0 ? value / grant : null;
  })) || 1;
}
function buildEstimateModel(rows) {
  const byCallLine = new Map(); const byCall = new Map(); const all = [];
  rows.forEach((row) => {
    const value = funding(row); if (value === null) return;
    const call = row.convocatoria || row.anio_convocatoria;
    const callLine = `${call}|${row.codigo_expediente || "sin_linea"}`;
    if (!byCallLine.has(callLine)) byCallLine.set(callLine, []);
    if (!byCall.has(call)) byCall.set(call, []);
    byCallLine.get(callLine).push(value); byCall.get(call).push(value); all.push(value);
  });
  state.estimateModel = {
    multiplier: requestMultiplier(rows),
    byCallLine: new Map([...byCallLine].map(([key, values]) => [key, median(values)])),
    byCall: new Map([...byCall].map(([key, values]) => [key, median(values)])),
    fallback: median(all),
  };
}
function estimatedRequested(row) {
  const published = requested(row);
  if (published !== null) return { value: published, estimated: false };
  const { multiplier, byCallLine, byCall, fallback } = state.estimateModel;
  const publishedFunding = funding(row);
  if (publishedFunding !== null) return { value: publishedFunding * multiplier, estimated: true };
  const call = row.convocatoria || row.anio_convocatoria;
  const benchmark = byCallLine.get(`${call}|${row.codigo_expediente || "sin_linea"}`) || byCall.get(call) || fallback;
  return benchmark === null ? { value: null, estimated: true } : { value: benchmark * multiplier, estimated: true };
}
function estimatedCompanyCount(row) { return row.beneficiaryCount > 0 ? row.beneficiaryCount : 1; }

function normalizeProjectRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const beneficiaryLevel = ["2025", "2025 RETOS"].includes(row.convocatoria) && row.nivel_importe === "beneficiario_en_expediente" && row.expediente;
    const key = beneficiaryLevel ? `project:${row.convocatoria}:${row.expediente}` : `record:${row.id_registro}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...row, id_registro: beneficiaryLevel ? key : row.id_registro, beneficiaryCount: beneficiaryLevel ? 1 : 0 });
      return;
    }
    current.subvencion_eur = String((numeric(current.subvencion_eur) || 0) + (numeric(row.subvencion_eur) || 0));
    current.beneficiaryCount += 1;
  });
  return [...groups.values()].map((row) => row.beneficiaryCount > 1 ? {
    ...row,
    razon_social: `${row.razon_social} y ${row.beneficiaryCount - 1} entidades más`,
    observaciones: `${row.observaciones ? `${row.observaciones} ` : ""}Importe agregado de los beneficiarios publicados para este expediente.`,
  } : row);
}

function sourceRows() {
  if (state.view === "sector") return state.sectorData.projects.filter((row) =>
    (state.sectorYear === "all" || row.convocatoria === state.sectorYear) &&
    (state.sectorScope === "all" || row.ambito === state.sectorScope) &&
    (state.sectorStatus === "all" || (state.sectorStatus === "approved" ? granted(row) : !granted(row))) &&
    fold(`${title(row)} ${row.razon_social} ${row.expediente}`).includes(fold(state.sectorSearch))
  );
  return state.rows.filter((row) => {
    const selected = state.view === "all" || (row.convocatoria || String(row.anio_convocatoria)) === state.view;
    return selected;
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
  root.append(createTab("Agregado", "all", state.view === "all", () => { state.view = "all"; render(); }, "call-tab"));
  const calls = [...new Set(state.rows.map((row) => row.convocatoria || String(row.anio_convocatoria)))].sort((a, b) => {
    const yearA = Number.parseInt(a, 10); const yearB = Number.parseInt(b, 10);
    return yearB - yearA || b.localeCompare(a, "es");
  });
  calls.forEach((call) => root.append(createTab(call, call, state.view === call, () => { state.view = call; render(); }, "call-tab")));
  root.append(createTab("Transporte, distribución y frío", "sector", state.view === "sector", () => { state.view = "sector"; render(); }, "call-tab"));
}

function lineLabel(variant) { return ({ RETOS: "RETOS", b: "Línea b", sin_sufijo: "Línea general", general: "Línea general" })[variant] || variant; }
function renderLinesFootnote(rows) {
  const root = document.querySelector("#lines-footnote");
  const linesFor = (subset) => [...new Set(subset.map(lineOf))].filter(Boolean).sort().map(lineLabel).join(", ");
  if (state.view === "all") {
    const calls = [...new Set(rows.map((row) => row.convocatoria || row.anio_convocatoria))].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
    root.textContent = `Líneas convocadas según los expedientes disponibles: ${calls.map((call) => `${call}: ${linesFor(rows.filter((row) => (row.convocatoria || row.anio_convocatoria) === call))}`).join(" · ")}.`;
    return;
  }
  root.textContent = `Líneas convocadas: ${linesFor(rows) || "sin desglose publicado"}.`;
}

function setMetric(id, value, note = "") { document.querySelector(`#${id}`).textContent = value; document.querySelector(`#${id}-note`).textContent = note; }

function renderMetrics(rows) {
  document.querySelector("#metric-companies").hidden = state.view !== "all";
  document.querySelector("#metric-cutoff").hidden = ["all", "sector"].includes(state.view);
  const projects = unique(rows, "id_registro");
  const requestEstimates = rows.map((row) => estimatedRequested(row));
  const requestedValue = requestEstimates.reduce((total, item) => total + (item.value || 0), 0);
  const requestedPublished = requestEstimates.filter((item) => item.value !== null && !item.estimated).length;
  const requestedEstimated = requestEstimates.filter((item) => item.value !== null && item.estimated).length;
  const favorable = rows.filter(granted);
  const confirmed = favorable.filter((row) => row.estado_en_fuente === "concedida_segun_listado");
  const provisional = favorable.filter((row) => row.estado_en_fuente === "propuesta_provisional_aprobada");
  const approvedScores = favorable.map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  setMetric("m-projects", number.format(projects), `${number.format(unique(rows, "expediente"))} expedientes con código publicado`);
  setMetric("m-aei", number.format(unique(rows, "nif")), "Entidades con NIF publicado; no equivale a empresas miembro");
  setMetric("m-companies", number.format(rows.reduce((total, row) => total + estimatedCompanyCount(row), 0)), "Estimación mínima: una entidad por proyecto; en 2025 se usa el número de beneficiarios publicado");
  setMetric("m-requested", requestedValue ? `${requestedEstimated ? "≈ " : ""}${eur.format(requestedValue)}` : "Sin base para estimar", `${number.format(requestedPublished)} importes publicados · ${number.format(requestedEstimated)} estimados desde importe concedido o mediana de su línea`);
  const confirmedValue = sum(confirmed, "subvencion_eur"); const provisionalValue = sum(provisional, "subvencion_eur");
  const awardLabel = confirmedValue && provisionalValue ? `${eur.format(confirmedValue)} + ${eur.format(provisionalValue)}` : eur.format(confirmedValue || provisionalValue);
  setMetric("m-awarded", favorable.length ? awardLabel : "No publicado", provisionalValue ? "Importes de concesión y propuesta provisional; consultar el resultado de cada expediente" : "Importe según listado de concesión");
  setMetric("m-cutoff", approvedScores.length ? `${score.format(Math.min(...approvedScores))} ptos.` : "No publicado", approvedScores.length ? "Menor puntuación favorable disponible" : "No hay puntuaciones publicadas en esta selección");
  if (state.view === "all") setMetric("m-cutoff", "Por convocatoria", "El agregado no tiene una nota de corte única");
  setMetric("m-average", approvedScores.length ? `${score.format(approvedScores.reduce((a, b) => a + b, 0) / approvedScores.length)} ptos.` : "No publicado", approvedScores.length ? "Media de puntuaciones favorables disponibles" : "No hay puntuaciones publicadas en esta selección");
}

function renderScoreChart(rows, prefix = "score") {
  const values = rows.map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const root = document.querySelector(`#${prefix}-chart`); const note = document.querySelector(`#${prefix}-note`);
  document.querySelector(`#${prefix}-sample`).textContent = values.length ? `${number.format(values.length)} puntuaciones` : "Sin muestra";
  if (!values.length) {
    const calls = [...new Set(rows.map((row) => row.convocatoria || row.anio_convocatoria))];
    const explanation = calls.length === 1 && calls[0] === "2023"
      ? "La propuesta provisional de 2023 publica el estado de cada expediente, pero no la puntuación individual."
      : (prefix !== "score" ? "No hay puntuaciones publicadas en los proyectos de este ámbito y selección." : `Los anexos disponibles de ${calls.join(", ")} no publican puntuaciones individuales comparables.`);
    root.classList.add("score-unavailable");
    root.innerHTML = `<p class="missing-score-note">${explanation}</p><div class="chart-empty">No se puede construir una distribución sin puntuaciones publicadas.</div>`;
    note.textContent = "La ausencia de puntuación no implica ausencia de evaluación.";
    return;
  }
  root.classList.remove("score-unavailable");
  const binSize = 1;
  const bins = Array.from({ length: 100 }, () => 0);
  values.forEach((value) => { bins[Math.min(bins.length - 1, Math.max(0, Math.floor(value / binSize)))] += 1; });
  const maximum = Math.max(...bins, 1); const favorableScores = rows.filter(granted).map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const cutoff = ["all", "sector"].includes(state.view) ? NaN : Math.min(...favorableScores); const admittedAverage = favorableScores.reduce((total, value) => total + value, 0) / favorableScores.length;
  const overallAverage = values.reduce((total, value) => total + value, 0) / values.length;
  const marker = (value, className, label) => Number.isFinite(value) ? `<i class="reference ${className}" style="left:${Math.max(1, Math.min(99, value))}%" data-label="${label}: ${score.format(value)}"></i>` : "";
  const bandwidth = 2.4;
  const density = bins.map((_, index) => values.reduce((total, value) => {
    const distance = ((index + .5) - value) / bandwidth;
    return total + Math.exp(-.5 * distance * distance);
  }, 0));
  const densityMaximum = Math.max(...density, 1);
  const points = density.map((value, index) => ({ x: index + .5, y: 100 - (value / densityMaximum) * 100 }));
  const curve = points.map((point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const before = points[index - 2] || previous;
    const after = points[index + 1] || point;
    return ` C ${previous.x + (point.x - before.x) / 6} ${previous.y + (point.y - before.y) / 6}, ${point.x - (after.x - previous.x) / 6} ${point.y - (after.y - previous.y) / 6}, ${point.x} ${point.y}`;
  }).join("");
  root.innerHTML = `<div class="histogram">${bins.map((count, index) => { const lower = index * binSize; const upper = index === bins.length - 1 ? 100 : lower + binSize - .01; return `<span data-bin="${index}" style="height:${count ? Math.max(2, (count / maximum) * 100) : 0}%" title="${lower}–${upper}: ${count}"></span>`; }).join("")}<svg class="distribution-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${curve}"></path></svg><i class="cursor-marker" hidden></i><b class="cursor-tooltip" hidden></b>${marker(cutoff, "cutoff", "Corte")}${marker(admittedAverage, "admitted", "Media admitidas")}${marker(overallAverage, "average", "Media muestra")}</div><div class="axis"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 puntos</span></div>`;
  const histogram = root.querySelector(".histogram"); const cursor = histogram.querySelector(".cursor-marker"); const tooltip = histogram.querySelector(".cursor-tooltip");
  histogram.addEventListener("mousemove", (event) => { const rect = histogram.getBoundingClientRect(); const value = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)); cursor.hidden = false; tooltip.hidden = false; cursor.style.left = `${value}%`; tooltip.style.left = `${value}%`; tooltip.textContent = `${score.format(value)} ptos.`; let activeClass = ""; histogram.querySelectorAll(".reference").forEach((reference) => { const active = Math.abs(Number.parseFloat(reference.style.left) - value) < 1.4; reference.classList.toggle("active", active); if (active) activeClass = reference.classList.contains("cutoff") ? "cursor-cutoff" : reference.classList.contains("admitted") ? "cursor-admitted" : "cursor-average"; }); cursor.className = `cursor-marker ${activeClass}`; });
  histogram.addEventListener("mouseleave", () => { cursor.hidden = true; tooltip.hidden = true; histogram.querySelectorAll(".reference").forEach((reference) => reference.classList.remove("active")); });
  histogram.addEventListener("click", (event) => { const rect = histogram.getBoundingClientRect(); const value = Math.max(0, Math.min(99.99, ((event.clientX - rect.left) / rect.width) * 100)); const lower = Math.floor(value / binSize) * binSize; const members = rows.filter((row) => { const itemScore = numeric(row.puntuacion); return itemScore !== null && itemScore >= lower && (lower === 99 ? itemScore <= 100 : itemScore < lower + binSize); }).sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion)); showScoreDetail(lower, binSize, members, cutoff, admittedAverage, overallAverage); });
  note.textContent = Number.isFinite(cutoff) ? `Referencias: corte ${score.format(cutoff)}, media de admitidas ${score.format(admittedAverage)} y media de la muestra ${score.format(overallAverage)}.` : "No hay resultados favorables con puntuación publicada en esta selección.";
  if (["all", "sector"].includes(state.view)) note.textContent = "Cada convocatoria tiene su propio corte. Las líneas muestran las medias de las puntuaciones disponibles.";
}

function showScoreDetail(lower, binSize, members, cutoff, admittedAverage, overallAverage) {
  document.querySelector("#score-detail")?.remove();
  const dialog = document.createElement("dialog"); dialog.id = "score-detail"; dialog.className = "score-detail";
  const upper = lower === 99 ? 100 : lower + binSize - .1;
  dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="Cerrar">×</button><p class="eyebrow">Distribución de puntuaciones</p><h2>Tramo ${lower}–${upper} puntos</h2><p class="dialog-note">${members.length} proyectos publicados. Corte: ${Number.isFinite(cutoff) ? score.format(cutoff) : "por convocatoria"} · media admitidas: ${score.format(admittedAverage)} · media muestra: ${score.format(overallAverage)}.</p><div class="dialog-list">${members.slice(0, 12).map((row) => `<div><strong>${title(row)}</strong><span>${row.razon_social || "Entidad no publicada"} · ${score.format(numeric(row.puntuacion))} puntos</span></div>`).join("") || "<p>No hay proyectos en este tramo.</p>"}</div>`;
  document.body.append(dialog); dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close()); dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }); dialog.showModal();
}

function renderEuroChart(rows) {
  const estimates = rows.map((row) => estimatedRequested(row));
  const requestedValue = estimates.reduce((total, item) => total + (item.value || 0), 0);
  const estimatedCount = estimates.filter((item) => item.value !== null && item.estimated).length;
  const awardValue = sum(rows.filter(granted), "subvencion_eur");
  const maximum = Math.max(requestedValue, awardValue, 1);
  document.querySelector("#euro-sample").textContent = requestedValue ? (estimatedCount ? "Importes publicados y estimados" : "Importes publicados") : "Cobertura insuficiente";
  document.querySelector("#euro-chart").innerHTML = [
    [estimatedCount ? "Solicitado (incluye estimaciones)" : "Solicitado publicado", requestedValue, ""], ["Concedido / propuesto", awardValue, "awarded"],
  ].map(([label, value, type]) => `<div class="euro-row"><div class="euro-label"><span>${label}</span><strong>${value ? `${label.startsWith("Solicitado") && estimatedCount ? "≈ " : ""}${eur.format(value)}` : "Sin base para estimar"}</strong></div><div class="bar-track"><div class="bar-fill ${type}" style="width:${(value / maximum) * 100}%"></div></div></div>`).join("");
  document.querySelector("#euro-note").textContent = `${number.format(estimatedCount)} solicitudes se estiman con el importe concedido/propuesto o la mediana de expedientes de la misma convocatoria y línea. Las cifras estimadas no sustituyen al importe solicitado publicado.`;
}

function rowHtml(row, requestedColumn = false) { const estimate = requestedColumn ? estimatedRequested(row) : { value: funding(row), estimated: false }; const amount = estimate.value; return `<tr><td><span class="project-name" title="${title(row)}">${title(row)}</span><span class="entity">${row.razon_social || "Entidad no publicada"}</span></td><td>${numeric(row.puntuacion) === null ? "—" : score.format(numeric(row.puntuacion))}</td><td title="${estimate.estimated ? "Estimación" : "Importe publicado"}">${amount === null ? "—" : `${estimate.estimated ? "≈ " : ""}${eur.format(amount)}`}</td></tr>`; }
function fillTable(id, rows, requestedColumn = false) { document.querySelector(`#${id}`).innerHTML = rows.length ? rows.slice(0, 5).map((row) => rowHtml(row, requestedColumn)).join("") : '<tr><td colspan="3" class="empty-cell">No hay registros comparables en esta selección.</td></tr>'; }
function renderTables(rows) {
  document.querySelector(".tables-section").hidden = ["all", "sector"].includes(state.view);
  if (["all", "sector"].includes(state.view)) return;
  const scored = rows.filter((row) => numeric(row.puntuacion) !== null);
  const favorableScores = rows.filter(granted).map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const cutoff = Math.min(...favorableScores);
  const awarded = scored.filter(granted).sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion));
  const wait = scored.filter(granted).sort((a,b) => numeric(a.puntuacion) - numeric(b.puntuacion));
  const below = scored.filter((row) => !granted(row) && numeric(row.puntuacion) < cutoff).sort((a,b) => numeric(b.puntuacion) - numeric(a.puntuacion));
  fillTable("table-awarded", awarded); fillTable("table-near", wait, true); fillTable("table-below", below, true);
}

function renderScoreHeatmap(groups) {
  const root = document.querySelector("#score-heatmap"); const minimumScore = 40; const maximumScore = 80; const binSize = 2;
  const series = groups.map((group) => Array.from({ length: (maximumScore - minimumScore) / binSize }, (_, index) => group.rows.filter((row) => {
    const value = numeric(row.puntuacion); const lower = minimumScore + index * binSize;
    return value !== null && value >= lower && (index === 19 ? value <= maximumScore : value < lower + binSize);
  }).length));
  const maximum = Math.max(...series.flat(), 1);
  root.innerHTML = `${groups.map((group, rowIndex) => `<div class="heatmap-row"><span>${group.label}</span><div class="heatmap-cells">${series[rowIndex].map((count, index) => { const lower = minimumScore + index * binSize; const upper = index === 19 ? maximumScore : lower + binSize - .01; return `<button type="button" class="heat-cell" style="--intensity:${count / maximum}" title="${group.label}: ${lower}–${upper} puntos · ${count} proyectos">${count || ""}</button>`; }).join("")}</div></div>`).join("")}<div class="heatmap-axis"><span></span><div>${[40, 50, 60, 70, 80].map((value) => `<i style="left:${((value - minimumScore) / (maximumScore - minimumScore)) * 100}%">${value}</i>`).join("")}</div></div><p class="chart-note">Cada celda agrupa dos puntos de puntuación.</p>`;
}

function renderResultComposition(groups) {
  const root = document.querySelector("#result-composition");
  const categories = [
    ["favorable", "Concedidos", (row) => granted(row)],
    ["waiting", "Espera", (row) => row.estado_en_fuente === "lista_espera_sin_concesion"],
    ["score-fail", "Por nota", (row) => row.estado_en_fuente === "propuesta_desestimada_puntuacion"],
    ["other-fail", "Otros", (row) => row.estado_en_fuente === "propuesta_desestimada_motivos"],
    ["withdrawn", "Desistidos", (row) => row.estado_en_fuente === "desistida"],
  ];
  const comparable = groups.filter((group) => group.rows.some((row) => !granted(row)));
  if (!comparable.length) { root.innerHTML = '<div class="chart-empty">Todas las convocatorias de esta selección contienen únicamente proyectos aprobados.</div>'; return; }
  root.innerHTML = `${comparable.map((group) => { const counts = categories.map(([, , test]) => group.rows.filter(test).length); const total = counts.reduce((sumValue, value) => sumValue + value, 0); return `<div class="composition-row"><div><strong>${group.label}</strong><span>${number.format(total)} proyectos</span></div><div class="composition-bar">${counts.map((count, index) => count ? `<i class="${categories[index][0]}" style="width:${(count / total) * 100}%" title="${categories[index][1]}: ${count}"></i>` : "").join("")}</div></div>`; }).join("")}<div class="composition-legend">${categories.map(([className, label]) => `<span><i class="${className}"></i>${label}</span>`).join("")}</div><p class="chart-note">Se omiten las convocatorias con solo proyectos aprobados.</p>`;
}

function renderAeiContinuity(rows, groups) {
  const root = document.querySelector("#aei-continuity"); const entities = new Map();
  rows.forEach((row) => {
    const key = row.nif || row.razon_social; if (!key) return;
    if (!entities.has(key)) entities.set(key, { label: row.razon_social || key, calls: new Map() });
    const entity = entities.get(key); const call = row.convocatoria || row.anio_convocatoria;
    const cell = entity.calls.get(call) || { projects: 0, funding: 0 };
    cell.projects += 1; cell.funding += granted(row) ? (funding(row) || 0) : 0; entity.calls.set(call, cell);
  });
  const recurrent = [...entities.values()].filter((entity) => entity.calls.size > 1).sort((a, b) => b.calls.size - a.calls.size || [...b.calls.values()].reduce((sumValue, cell) => sumValue + cell.funding, 0) - [...a.calls.values()].reduce((sumValue, cell) => sumValue + cell.funding, 0)).slice(0, 18);
  const maximum = Math.max(...recurrent.flatMap((entity) => [...entity.calls.values()].map((cell) => cell.funding)), 1);
  root.innerHTML = recurrent.length ? `<div class="continuity-scroll"><div class="continuity-grid" style="grid-template-columns:minmax(130px,1.35fr) repeat(${groups.length},minmax(26px,1fr))"><strong class="continuity-head">AEI</strong>${groups.map((group) => `<strong class="continuity-head">${group.label}</strong>`).join("")}${recurrent.map((entity) => `<span class="continuity-name" title="${entity.label}">${entity.label}</span>${groups.map((group) => { const cell = entity.calls.get(group.label); return cell ? `<i class="continuity-cell" style="--intensity:${cell.funding ? Math.max(.15, cell.funding / maximum) : .1}" title="${entity.label} · ${group.label}: ${cell.projects} proyectos · ${eur.format(cell.funding)}"><b>${cell.projects}</b></i>` : '<i class="continuity-empty"></i>'; }).join("")}`).join("")}</div></div><p class="chart-note">Se muestran las 18 AEI con presencia en más convocatorias. El número es proyectos publicados; la intensidad refleja financiación favorable.</p>` : '<div class="chart-empty">No hay AEI recurrentes identificables en esta selección.</div>';
}

function renderAggregateCharts(rows) {
  const section = document.querySelector("#aggregate-charts"); section.hidden = state.view !== "all";
  if (state.view !== "all") return;
  const calls = [...new Set(rows.map((row) => row.convocatoria || row.anio_convocatoria))].sort((a,b) => Number.parseInt(b,10) - Number.parseInt(a,10));
  const groups = calls.map((call) => ({ label: call, rows: rows.filter((row) => (row.convocatoria || row.anio_convocatoria) === call) }));
  renderScoreHeatmap(groups); renderResultComposition(groups); renderAeiContinuity(rows, groups);
}

function fold(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]); }
function resultLabel(row) { return ({concedida_segun_listado:"Concedido", propuesta_provisional_aprobada:"Propuesta favorable", lista_espera_sin_concesion:"Lista de espera", propuesta_desestimada_puntuacion:"Puntuación insuficiente", propuesta_desestimada_motivos:"Otros motivos", desistida:"Desistido"})[row.estado_en_fuente] || "Sin resultado identificado"; }
function safeSource(url, label) {
  try { const parsed = new URL(url); return ["https:", "http:"].includes(parsed.protocol) ? `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : ""; } catch { return ""; }
}
function setupSectorControls() {
  const calls = [...new Set(state.rows.map((row) => row.convocatoria || row.anio_convocatoria))].sort((a,b) => String(b).localeCompare(String(a), "es", { numeric: true }));
  document.querySelector("#sector-year").innerHTML = '<option value="all">Todas</option>' + calls.map((call) => `<option value="${escapeHtml(call)}">${escapeHtml(call)}</option>`).join("");
  [["year","sectorYear"], ["scope","sectorScope"], ["status","sectorStatus"], ["search","sectorSearch"], ["sort","sectorSort"], ["direction","sectorDirection"]].forEach(([id,key]) => {
    document.querySelector(`#sector-${id}`).addEventListener(id === "search" ? "input" : "change", (event) => { state[key] = event.target.value; render(); });
  });
  document.querySelector("#sector-coverage").innerHTML = `<table><thead><tr><th>Convocatoria</th><th>Expedientes en base</th><th>Con título en CSV</th><th>Referenciados en anexos legibles</th><th>Frío / transporte y distribución</th></tr></thead><tbody>${state.sectorData.coverage.map((item) => `<tr><td>${escapeHtml(item.convocatoria)}</td><td>${item.total}</td><td>${item.con_titulo}</td><td>${item.en_anexos}</td><td>${item.directos + item.relacionados} / ${item.transporte_distribucion || 0}</td></tr>`).join("")}</tbody></table>`;
}
function sortSectorRows(rows) {
  const values = {convocatoria: row => row.convocatoria, puntuacion: row => numeric(row.puntuacion), importe: funding, proyecto: title, entidad: row => row.razon_social || null, ambito: row => row.ambito, resultado: resultLabel};
  const get = values[state.sectorSort] || values.convocatoria;
  const direction = state.sectorDirection === "asc" ? 1 : -1;
  return [...rows].sort((a,b) => {
    const x = get(a), y = get(b);
    if (x == null && y != null) return 1;
    if (y == null && x != null) return -1;
    const compared = x == null ? 0 : typeof x === "number" ? x-y : String(x).localeCompare(String(y), "es", {numeric:true, sensitivity:"base"});
    return direction * compared || String(a.id_registro).localeCompare(String(b.id_registro));
  });
}
function sectorApproval(rows) {
  const nonApproved = new Set(["lista_espera_sin_concesion", "propuesta_desestimada_puntuacion", "propuesta_desestimada_motivos", "desistida"]);
  const comparableCalls = new Set(state.rows.filter(row => nonApproved.has(row.estado_en_fuente)).map(row => row.convocatoria || row.anio_convocatoria));
  const sample = rows.filter(row => comparableCalls.has(row.convocatoria) && (granted(row) || nonApproved.has(row.estado_en_fuente)));
  return { total: sample.length, approved: sample.filter(granted).length, calls: new Set(sample.map(row => row.convocatoria)).size, omitted: rows.length-sample.length };
}
function renderSectorOverview(rows) {
  const cold = rows.filter(row => row.ambito === "Frío"), transport = rows.filter(row => row.ambito === "Transporte y distribución");
  renderScoreChart(cold, "cold"); renderScoreChart(transport, "transport");
  const values = rows.map(row => numeric(row.puntuacion)).filter(value => value !== null);
  const approval = sectorApproval(rows);
  const metric = (id,value,note) => {document.querySelector(`#s-${id}`).textContent=value;document.querySelector(`#s-${id}-note`).textContent=note;};
  document.querySelector("#sector-total").textContent = `${rows.length} proyectos`;
  metric("cold", number.format(cold.length), `${cold.filter(row => row.relacion === "directa").length} directos · ${cold.filter(row => row.relacion !== "directa").length} relacionados`);
  metric("transport", number.format(transport.length), "Transporte, almacenaje y distribución");
  metric("average", values.length ? score.format(values.reduce((a,b) => a+b,0)/values.length) : "Sin datos", `${values.length} notas publicadas · ambos ámbitos`);
  metric("approval", approval.total ? `${score.format(100*approval.approved/approval.total)} %` : "Sin base comparable", approval.total ? `${approval.approved} favorables / ${approval.total} registros · ${approval.calls} convocatorias con no aprobados; ${approval.omitted} excluidos` : "Solo se incluyen convocatorias con datos de no aprobados");
  document.querySelector("#s-approval-note").title = "Proporción observada en la selección. Incluye propuestas favorables y excluye convocatorias sin registros no aprobados en la base completa. No acredita cobertura completa de todas las solicitudes.";
}

function renderSector(rows) {
  const scored = rows.filter((row) => numeric(row.puntuacion) !== null).length;
  document.querySelector("#context-note").textContent = state.sectorError || `${rows.length} expedientes · ${scored} con puntuación publicada. Selección temática, no convocatoria oficial. Las notas no se estiman.`;
  document.querySelector("#sector-count").textContent = `${rows.length} proyectos`;
  const statuses = [...new Set(rows.map((row) => row.estado_en_fuente))];
  document.querySelector("#sector-summary").innerHTML = statuses.map((status) => `<span class="status ${granted({estado_en_fuente:status}) ? "good" : "muted"}">${escapeHtml(resultLabel({estado_en_fuente:status}))}: ${rows.filter((row) => row.estado_en_fuente === status).length}</span>`).join("");
  const sorted = sortSectorRows(rows);
  document.querySelector("#sector-project-rows").innerHTML = sorted.map((row,index) => `<tr><td><button class="sector-title" data-index="${index}">${escapeHtml(title(row))}</button><span class="project-entity">${escapeHtml(row.razon_social || "Entidad no identificada")}</span><small>${escapeHtml(row.expediente)}${row.nota_revision?.includes("Cruce de expediente pendiente") ? " · Cruce pendiente de confirmar" : ""} · ${row.ambito === "Frío" ? (row.relacion === "directa" ? "Frío: relación directa" : "Frío: relacionado") : "Transporte y distribución"}</small></td><td><span class="sector-scope-tag ${row.ambito === "Frío" ? "cold" : "transport"}">${escapeHtml(row.ambito)}</span></td><td>${escapeHtml(row.convocatoria)}</td><td>${numeric(row.puntuacion) === null ? "No publicada" : score.format(numeric(row.puntuacion))}</td><td><span class="status ${granted(row) ? "good" : "muted"}">${escapeHtml(resultLabel(row))}</span></td><td>${funding(row) === null ? "No publicada" : eur.format(funding(row))}<small>${granted(row) ? "" : "Sin concesión en la base"}</small></td><td><button class="sector-open" data-index="${index}">Ver ficha</button></td></tr>`).join("") || '<tr><td colspan="7">No hay proyectos identificados con estos filtros. Consulta la cobertura de la revisión.</td></tr>';
  document.querySelectorAll(".sector-open, .sector-title").forEach((button) => button.addEventListener("click", () => showSectorProject(sorted[Number(button.dataset.index)])));
  document.querySelector("#lines-footnote").textContent = "Esta selección conserva la convocatoria y el estado de cada expediente. Las solicitudes con títulos similares y códigos distintos se muestran por separado. No existe una nota de corte común para el sector.";
  renderSectorOverview(rows);
}
function showSectorProject(row) {
  document.querySelector("#sector-detail")?.remove();
  const dialog = document.createElement("dialog"); dialog.id = "sector-detail"; dialog.className = "score-detail sector-detail";
  const estimate = estimatedRequested(row);
  const fields = [
    ["Convocatoria de origen", row.convocatoria], ["Expediente", row.expediente], ["Presenta / coordina", row.razon_social || "No identificado"], ["NIF", row.nif || "No publicado"],
    ["Resultado", resultLabel(row)], ["Motivo publicado", row.motivo_resultado || "Sin motivo adicional en la ficha"], ["Ayuda propuesta en lista de espera", row.importe_propuesto_eur ? `${eur.format(numeric(row.importe_propuesto_eur))} · no concedida` : "No aplica / no publicada"], ["Puntuación publicada", numeric(row.puntuacion) === null ? "No publicada; no se estima" : `${score.format(numeric(row.puntuacion))} / 100`],
    ["Financiación publicada", funding(row) === null ? "No publicada" : eur.format(funding(row))], ["Importe solicitado", estimate.value === null ? "Sin base para estimar" : `${estimate.estimated ? "≈ " : ""}${eur.format(estimate.value)}${estimate.estimated ? " · estimado" : " · publicado"}`],
    ["Ámbito", row.ambito], ["Relación con el sector", row.ambito === "Frío" ? (row.relacion === "directa" ? "Directa" : "Relacionada; fuera del núcleo de cadena de frío") : "Transporte, distribución o actividad logística"], ["Motivo de inclusión", row.motivo_sector], ["Observaciones de la revisión", row.nota_revision || "Identificado por expediente en el anexo"],
  ];
  dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="Cerrar">×</button><p class="eyebrow">Transporte, distribución y frío · ficha de proyecto</p><h2>${escapeHtml(title(row))}</h2><dl class="sector-facts">${fields.map(([label,value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${row.participantes?.length ? `<h3>Entidades publicadas</h3><ul>${row.participantes.map((item) => `<li>${escapeHtml(item.razon_social)}${item.nif ? ` · ${escapeHtml(item.nif)}` : ""}</li>`).join("")}</ul>` : ""}<h3>Fuentes</h3><ul>${(row.fuentes || []).map((item) => `<li>${safeSource(item.url, item.label)}${item.pagina ? ` · página ${escapeHtml(item.pagina)}` : ""}</li>`).join("")}</ul><p class="dialog-note">Los importes estimados siguen el modelo del data room: importe de ayuda, o mediana de la línea cuando falta. Las propuestas favorables no equivalen a una concesión definitiva.</p>`;
  document.body.append(dialog); dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close()); dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }); dialog.showModal();
}

function render() {
  renderCallTabs();
  const sector = state.view === "sector";
  document.querySelector(".metrics").classList.toggle("sector-metrics", sector);
  document.querySelector("#analysis").hidden = false;
  document.querySelector("#sector-controls").hidden = !sector;
  document.querySelector("#sector-projects").hidden = !sector;
  document.querySelector("#sector-overview").hidden = !sector;
  document.querySelector(".metrics").hidden = sector;
  document.querySelector(".charts").hidden = sector;
  const rows = sourceRows();
  const selection = sector ? "Transporte, distribución y frío · selección transversal" : state.view === "all" ? "Todas las convocatorias disponibles" : `Convocatoria ${state.view}`;
  document.querySelector("#context-label").textContent = selection;
  document.querySelector("#context-note").textContent = `${number.format(rows.length)} registros tras aplicar la selección. Los participantes y los importes solicitados se completan con estimaciones identificadas cuando la fuente no los publica.`;
  renderLinesFootnote(rows);
  if (!sector) { renderMetrics(rows); renderScoreChart(rows); renderEuroChart(rows); }
  renderAggregateCharts(rows); renderTables(rows);
  if (sector) renderSector(rows);
}

async function load() {
  const [grantsResponse, applicationsResponse] = await Promise.all([fetch(DATA.grants), fetch(DATA.applications)]);
  if (!grantsResponse.ok || !applicationsResponse.ok) throw new Error("No se han podido cargar los datasets AEI.");
  const grants = parseCsv(await grantsResponse.text())
    .filter((row) => !is2026(row))
    .map((row) => {
      // La propuesta de 2023 publica ordinales de lista de espera en esta columna,
      // no notas sobre 100. Se ocultan hasta reconciliar la fuente completa.
      if (String(row.anio_convocatoria) === "2023" && numeric(row.puntuacion) !== null && numeric(row.puntuacion) <= 10) {
        return { ...row, puntuacion: "" };
      }
      return row;
    });
  const applications = parseCsv(await applicationsResponse.text()).map((row) => ({ ...row, variante_convocatoria: "general", subvencion_eur: row.subvencion_columna_fuente_eur }));
  state.rows = normalizeProjectRows([...grants, ...applications]);
  try {
    const response = await fetch(DATA.sector);
    if (!response.ok) throw new Error("No se ha podido cargar la selección sectorial.");
    state.sectorData = await response.json();
  } catch (error) { state.sectorError = error.message; }
  setupSectorControls();
  buildEstimateModel(state.rows);
  render();
}

document.addEventListener("cbi:access-granted", () => load().catch((error) => { document.querySelector("#analysis").hidden = false; document.querySelector("#context-label").textContent = "No se han podido cargar los datos"; document.querySelector("#context-note").textContent = error.message; }), { once: true });
