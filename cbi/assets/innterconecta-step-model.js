export const territories = ['Andalucía', 'Baleares', 'Canarias', 'Castilla-La Mancha', 'Castilla y León', 'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Murcia'];
export const criteria = [
  ['Tecnología STEP e innovación', 15, 7],
  ['Calidad, ejecución y explotación', 30, 15],
  ['Capacidad del consorcio', 35, 0],
  ['Impacto socioeconómico y ambiental', 20, 0],
];
const rates = { small: [0.80, 0.60], medium: [0.75, 0.50], large: [0.65, 0.40] };

export function assess({ partners, research, scope, independent, checked, scores }) {
  const validAmount = (value) => Number.isFinite(value) && value >= 0;
  const sum = (values) => values.reduce((a, b) => a + b, 0);
  const costed = partners.every((p) => validAmount(p.industrial) && validAmount(p.experimental));
  const costs = partners.map((p) => costed ? p.industrial + p.experimental : 0);
  const total = sum(costs);
  const groups = new Map();
  partners.forEach((p, i) => {
    const group = p.group.trim().toLocaleLowerCase('es');
    const key = group ? 'grupo:' + group : 'empresa:' + i;
    groups.set(key, (groups.get(key) || 0) + costs[i]);
  });
  const shares = [...groups.values()];
  const regions = new Set(partners.map((p) => p.region).filter((r) => territories.includes(r)));
  const sizing = partners.every((p) => Object.hasOwn(rates, p.size));
  const eligibility = [
    ['Ámbito tecnológico STEP', scope ? true : null],
    ['Consorcio de 2 a 6 empresas', partners.length >= 2 && partners.length <= 6],
    ['Al menos dos empresas autónomas y grupos de vinculación revisados', independent],
    ['Al menos una pyme', sizing ? partners.some((p) => p.size !== 'large') : null],
    ['Al menos dos CCAA elegibles y una por empresa', partners.every((p) => territories.includes(p.region)) ? regions.size >= 2 : null],
    ['Presupuesto total entre 1 y 4 M€ y mínimo de 175.000 € por empresa', costed ? total >= 1e6 && total <= 4e6 && costs.every((a) => a >= 175000) : null],
    ['Participación máxima del 70 % por empresa o grupo vinculado', costed && total > 0 ? shares.every((a) => 10 * a <= 7 * total) : null],
    ['Subcontratación de investigación de al menos el 10 %', total > 0 && validAmount(research) ? 10 * research >= total && research <= total : null],
    ['Resto de condiciones y documentación revisadas', checked ? true : null],
  ];
  const aid = costed && sizing && eligibility[2][1] === true && eligibility[3][1] === true && eligibility[6][1] === true
    ? partners.map((p) => p.industrial * rates[p.size][0] + p.experimental * rates[p.size][1]) : null;
  const scored = scores.length === criteria.length && scores.every((v, i) => validAmount(v) && v <= criteria[i][1]);
  const score = scored ? sum(scores) : null;
  const scorePass = scored ? score >= 50 && scores.every((v, i) => v >= criteria[i][2]) : null;
  return { eligibility, total: costed ? total : null, aid, maxAid: aid ? sum(aid) : null, score, scorePass, regions: [...regions] };
}

function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function forecast({ credits, demand, scores, grants, repetitions = 350 }) {
  if (!(Number.isFinite(credits) && credits > 0 && Number.isInteger(demand) && demand >= 1 && demand <= 2000)) return null;
  if (!scores.length || !grants.length || scores.some((x) => !Number.isFinite(x) || x < 0 || x > 100) || grants.some((x) => !Number.isFinite(x) || x <= 0)) return null;
  const rnd = random(2027);
  const pick = (items) => items[Math.floor(rnd() * items.length)];
  const counts = [], cutoffs = [];
  let allFunded = 0;
  for (let trial = 0; trial < repetitions; trial++) {
    const ranking = Array.from({ length: demand }, () => pick(scores)).filter((s) => s >= 50).sort((a, b) => b - a);
    let available = credits, count = 0;
    for (const score of ranking) {
      const cost = pick(grants);
      if (cost > available) {
        if (count) cutoffs.push(ranking[count - 1]);
        break;
      }
      available -= cost;
      count++;
    }
    if (count === ranking.length) allFunded++;
    counts.push(count);
  }
  const quantile = (values, p) => values[Math.round((values.length - 1) * p)];
  counts.sort((a,b) => a-b);
  cutoffs.sort((a,b) => a-b);
  return {
    seats: [0.1, 0.5, 0.9].map((p) => quantile(counts, p)),
    cutoff: cutoffs.length ? [0.1, 0.5, 0.9].map((p) => quantile(cutoffs, p)) : null,
    allFunded: allFunded / repetitions,
    repetitions,
  };
}
