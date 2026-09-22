const DATA = {
  grants: "../data/aei/aei_solicitudes_historicas_v5.csv",
  applications: "../data/aei/aei_solicitudes_2026.csv",
};

const state = { view: "all", rows: [], estimateModel: { multiplier: 1, byCallLine: new Map(), byCall: new Map(), fallback: null } };
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
  if (state.view === "sector") return [];
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
  root.append(createTab("Frío, logística y distribución", "sector", state.view === "sector", () => { state.view = "sector"; render(); }, "call-tab"));
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
  setMetric("m-requested", requestedValue ? `≈ ${eur.format(requestedValue)}` : "Sin base para estimar", `${number.format(requestedPublished)} importes publicados · ${number.format(requestedEstimated)} estimados desde importe concedido o mediana de su línea`);
  const confirmedValue = sum(confirmed, "subvencion_eur"); const provisionalValue = sum(provisional, "subvencion_eur");
  const awardLabel = confirmedValue && provisionalValue ? `${eur.format(confirmedValue)} + ${eur.format(provisionalValue)}` : eur.format(confirmedValue || provisionalValue);
  setMetric("m-awarded", favorable.length ? awardLabel : "No publicado", provisionalValue ? "Primer importe: concedido; segundo: propuesta provisional 2026" : "Importe según listado de concesión");
  setMetric("m-cutoff", approvedScores.length ? `${score.format(Math.min(...approvedScores))} ptos.` : "No publicado", approvedScores.length ? "Menor puntuación favorable disponible" : "No hay puntuaciones publicadas en esta selección");
  if (state.view === "all") setMetric("m-cutoff", "Por convocatoria", "El agregado no tiene una nota de corte única");
  setMetric("m-average", approvedScores.length ? `${score.format(approvedScores.reduce((a, b) => a + b, 0) / approvedScores.length)} ptos.` : "No publicado", approvedScores.length ? "Media de puntuaciones favorables disponibles" : "No hay puntuaciones publicadas en esta selección");
}

function renderScoreChart(rows) {
  const values = rows.map((row) => numeric(row.puntuacion)).filter((value) => value !== null);
  const root = document.querySelector("#score-chart"); const note = document.querySelector("#score-note");
  document.querySelector("#score-sample").textContent = values.length ? `${number.format(values.length)} puntuaciones` : "Sin muestra";
  if (!values.length) {
    const calls = [...new Set(rows.map((row) => row.convocatoria || row.anio_convocatoria))];
    const explanation = calls.length === 1 && calls[0] === "2023"
      ? "La propuesta provisional de 2023 publica el estado de cada expediente, pero no la puntuación individual."
      : `Los anexos disponibles de ${calls.join(", ")} no publican puntuaciones individuales comparables.`;
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
  const cutoff = state.view === "all" ? NaN : Math.min(...favorableScores); const admittedAverage = favorableScores.reduce((total, value) => total + value, 0) / favorableScores.length;
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
  if (state.view === "all") note.textContent = "Cada convocatoria tiene su propio corte. Las líneas muestran las medias de las puntuaciones disponibles.";
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
  document.querySelector("#euro-sample").textContent = requestedValue ? "Importes publicados y estimados" : "Cobertura insuficiente";
  document.querySelector("#euro-chart").innerHTML = [
    ["Solicitado estimado", requestedValue, ""], ["Concedido / propuesto", awardValue, "awarded"],
  ].map(([label, value, type]) => `<div class="euro-row"><div class="euro-label"><span>${label}</span><strong>${value ? `${label.startsWith("Solicitado") ? "≈ " : ""}${eur.format(value)}` : "Sin base para estimar"}</strong></div><div class="bar-track"><div class="bar-fill ${type}" style="width:${(value / maximum) * 100}%"></div></div></div>`).join("");
  document.querySelector("#euro-note").textContent = `${number.format(estimatedCount)} solicitudes se estiman con el importe concedido/propuesto o la mediana de expedientes de la misma convocatoria y línea. Las cifras estimadas no sustituyen al importe solicitado publicado.`;
}

function rowHtml(row, requestedColumn = false) { const estimate = requestedColumn ? estimatedRequested(row) : { value: funding(row), estimated: false }; const amount = estimate.value; return `<tr><td><span class="project-name" title="${title(row)}">${title(row)}</span><span class="entity">${row.razon_social || "Entidad no publicada"}</span></td><td>${numeric(row.puntuacion) === null ? "—" : score.format(numeric(row.puntuacion))}</td><td title="${estimate.estimated ? "Estimación" : "Importe publicado"}">${amount === null ? "—" : `${estimate.estimated ? "≈ " : ""}${eur.format(amount)}`}</td></tr>`; }
function fillTable(id, rows, requestedColumn = false) { document.querySelector(`#${id}`).innerHTML = rows.length ? rows.slice(0, 5).map((row) => rowHtml(row, requestedColumn)).join("") : '<tr><td colspan="3" class="empty-cell">No hay registros comparables en esta selección.</td></tr>'; }
function renderTables(rows) {
  document.querySelector(".tables-section").hidden = state.view === "all";
  if (state.view === "all") return;
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

function render() {
  renderCallTabs();
  const sector = state.view === "sector";
  document.querySelector("#analysis").hidden = sector; document.querySelector("#sector-placeholder").hidden = !sector;
  if (sector) return;
  const rows = sourceRows();
  const selection = state.view === "all" ? "Todas las convocatorias disponibles" : `Convocatoria ${state.view}`;
  document.querySelector("#context-label").textContent = selection;
  document.querySelector("#context-note").textContent = `${number.format(rows.length)} registros tras aplicar la selección. Los participantes y los importes solicitados se completan con estimaciones identificadas cuando la fuente no los publica.`;
  renderLinesFootnote(rows); renderMetrics(rows); renderScoreChart(rows); renderEuroChart(rows); renderAggregateCharts(rows); renderTables(rows);
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
  buildEstimateModel(state.rows);
  render();
}

document.addEventListener("cbi:access-granted", () => load().catch((error) => { document.querySelector("#analysis").hidden = false; document.querySelector("#context-label").textContent = "No se han podido cargar los datos"; document.querySelector("#context-note").textContent = error.message; }), { once: true });
