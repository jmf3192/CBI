/* INNOVAE frío v2. Shared deterministic engine for browser, worker and Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FrioModel = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const VERSION = '2.0.0', KWH_PER_KTEP = 11630000, MIN_COST = 100000, MAX_AID = 2000000;
  const innovationPoints = c => ({baja:2.5, incremental:7.5, intermedia:14, disruptiva:21.5}[c] ?? 0);
  function rng(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
  }
  const uniform = (r, bounds) => bounds[0] + r() * (bounds[1] - bounds[0]);
  function choice(r, values, weights) {
    let x = r();
    for (let i=0; i<values.length; i++) { x -= weights[i]; if (x<0) return values[i]; }
    return values.at(-1);
  }
  function aidLimit({cost, size='large', zone='general', aidMode='reference', referenceCost=0}) {
    if (!(Number.isFinite(cost) && cost>=0)) throw new Error('Coste inválido');
    if (!['large','medium','small','nonEconomic'].includes(size) || !['general','c','a'].includes(zone)
        || !['reference','half','exclusive'].includes(aidMode)) throw new Error('Régimen de ayuda inválido');
    if (!Number.isFinite(referenceCost) || referenceCost<0 || referenceCost>cost) throw new Error('Inversión de referencia inválida');
    const intensity = size==='nonEconomic' ? .7 : ({large:.3,medium:.4,small:.5}[size] + {general:0,c:.05,a:.15}[zone]);
    const base = aidMode==='reference' ? cost-referenceCost : cost;
    return Math.min(MAX_AID, base*intensity*(aidMode==='half' && size!=='nonEconomic' ? .5 : 1));
  }
  function eligiblePool(records, scope) {
    if (!['equipo','ampliada'].includes(scope)) throw new Error('Muestra desconocida');
    const groups=scope==='ampliada' ? ['equipo','optimizacion'] : ['equipo'];
    return records.filter(r=>groups.includes(r.group) && r.cost>=MIN_COST && r.savingKwh>0);
  }
  function generate(records, config, options={}, iteration=0) {
    const o={...config.defaults,...options};
    const count=Math.round(o.demand*o.admission);
    if (!(Number.isFinite(count) && count>=0 && count<=1000) || !(o.admission>=0 && o.admission<=1)
        || ![1,1.35].includes(o.tail) || ![1,2,4].includes(o.scale)
        || !(o.bonusRate>=0 && o.bonusRate<=1) || !config.innovationProfiles[o.innovationProfile]) throw new Error('Escenario inválido');
    const pool=eligiblePool(records,o.scope);
    if (!pool.length) throw new Error('Sin referencias comparables');
    const r=rng((config.seed + Math.imul(iteration,2654435761))>>>0);
    const ratios=pool.map(p=>p.cost/p.savingKwh).sort((a,b)=>a-b);
    const upper=ratios[Math.floor((ratios.length-1)*.75)];
    const rows=[];
    for(let i=0;i<count;i++) {
      const source=pool[Math.floor(r()*pool.length)];
      // Condition the common scaling factor on the known minimum; do not clip cost to it.
      const lower=Math.max(config.pairedScaleRange[0],MIN_COST/source.cost/o.scale);
      const factor=uniform(r,[lower,config.pairedScaleRange[1]])*o.scale;
      const perturbation=uniform(r,config.savingPerturbationRange);
      const tailFactor=source.cost/source.savingKwh>=upper ? o.tail : 1;
      const cost=Math.round(source.cost*factor*100)/100;
      const savingKwh=Math.round(source.savingKwh*factor*perturbation/tailFactor*100)/100;
      const size=choice(r,['large','medium','small'],config.sizeWeights);
      const zone=choice(r,['general','c','a'],config.zoneWeights);
      const referenceCost=Math.round(cost*uniform(r,config.counterfactualShareRange)*100)/100;
      const requestShare=uniform(r,config.requestShareRange);
      const aidMode='reference';
      const cap=aidLimit({cost,size,zone,aidMode,referenceCost});
      rows.push({id:`SIM-${String(i+1).padStart(4,'0')}`,own:false,manual:false,
        archetype:source.group,sector:'industrial',cost,savingKwh,aid:Math.floor(cap*requestShare*100)/100,
        innovation:choice(r,['baja','incremental','intermedia','disruptiva'],config.innovationProfiles[o.innovationProfile]),
        bonus:r()<o.bonusRate,size,zone,aidMode,referenceCost,requestShare,
        technicalEligibility:'supuesta_admitida',powerKw:null,savingPct:null,
        sourceId:source.id,sourcePdf:source.pdf,sourcePage:source.page,sourceUrl:source.sourceUrl,
        factor,perturbation,tailFactor,arrival:r(),origin:'SINTETICO_CALIBRADO',seed:config.seed,iteration,modelVersion:VERSION});
    }
    return rows;
  }
  function scale(values) {
    const sorted=[...values].sort((a,b)=>a-b);
    if(!sorted.length) return {min:0,max:0,range:0};
    const cut=sorted.length>=20 ? Math.floor(sorted.length*.05) : 0;
    const min=sorted[cut],max=sorted[sorted.length-1-cut];
    return {min,max,range:max-min};
  }
  function points(value,s,steps) {
    if(s.range<=0) return steps[0];
    for(let i=0;i<4;i++) if(value<=s.min+(i+1)*.2*s.range) return steps[i];
    return steps[4];
  }
  function scoreRows(input,budget=25000000) {
    if(!Number.isFinite(budget)||budget<0) throw new Error('Presupuesto inválido');
    const rows=input.map(row=>{
      const x={...row,exclusionReasons:[],rank:null,result:'excluida'};
      delete x.total;
      x.savingKtep=x.savingKwh/KWH_PER_KTEP;
      x.rpa=x.savingKtep>0 ? x.cost/1e6/x.savingKtep : 0;
      x.rpe=x.savingKtep>0 ? x.aid/1e6/x.savingKtep : 0;
      if(!Number.isFinite(x.cost)||x.cost<MIN_COST) x.exclusionReasons.push('coste elegible inferior a 100.000 €');
      if(!Number.isFinite(x.savingKwh)||x.savingKwh<=0) x.exclusionReasons.push('ahorro anual inválido');
      if(!Number.isFinite(x.aid)||x.aid<=0||x.aid>MAX_AID) x.exclusionReasons.push('ayuda fuera de límites');
      if(!innovationPoints(x.innovation)) x.exclusionReasons.push('sin innovación');
      if(x.powerKw!=null && x.powerKw<100) x.exclusionReasons.push('potencia de compresores < 100 kW');
      if(x.savingPct!=null && x.savingPct<=20) x.exclusionReasons.push('ahorro no supera el 20 %');
      if(x.size && x.aid>aidLimit(x)+.01) x.exclusionReasons.push('ayuda superior al máximo aplicable');
      return x;
    });
    // Known ineligible applications do not alter the scale for admitted applications.
    const admitted=rows.filter(r=>!r.exclusionReasons.length);
    const rpaScale=scale(admitted.map(r=>r.rpa)), rpeScale=scale(admitted.map(r=>r.rpe));
    rows.forEach(r=>{
      r.c1=points(r.rpa,rpaScale,[40,32,24,16,8]);
      r.c2=points(r.rpe,rpeScale,[25,20,15,10,6]);
      r.c3=innovationPoints(r.innovation);r.c4=r.bonus?10:0;
      r.total=r.exclusionReasons.length?0:r.c1+r.c2+r.c3+r.c4;
      if(!r.exclusionReasons.length && r.total<50) r.exclusionReasons.push('no alcanza 50 puntos');
    });
    const ranked=rows.filter(r=>!r.exclusionReasons.length).sort((a,b)=>b.total-a.total || b.c1-a.c1 || b.c2-a.c2 || b.c3-a.c3 || b.c4-a.c4 || (a.arrival??.5)-(b.arrival??.5) || a.id.localeCompare(b.id));
    let used=0;
    ranked.forEach((r,i)=>{r.rank=i+1;if(used+r.aid<=budget+.001){used+=r.aid;r.result='concedida';}else r.result='lista_reserva';});
    const funded=ranked.filter(r=>r.result==='concedida');
    const constrained=ranked.some(r=>r.result==='lista_reserva');
    // This is only the lowest funded score, not a universal cutoff (ties and budget gaps).
    const cutoff=constrained && funded.length ? Math.min(...funded.map(r=>r.total)) : null;
    return {rows,ranked,cutoff,constrained,used,rpaScale,rpeScale};
  }
  function quantiles(values) {
    if(!values.length) return {p5:null,p50:null,p95:null};
    const a=[...values].sort((a,b)=>a-b);
    return Object.fromEntries([['p5',.05],['p50',.5],['p95',.95]].map(([k,p])=>[k,a[Math.floor((a.length-1)*p)]]));
  }
  function monteCarlo(records,config,options,own,manual=[]) {
    let funded=0,reserve=0,excluded=0,constrained=0;
    const scores=[],ranks=[],budgets=[];
    for(let i=0;i<config.runs;i++) {
      const result=scoreRows([...generate(records,config,options,i),...manual,own],config.budget);
      const project=result.rows.find(r=>r.own);
      if(project.result==='concedida')funded++; else if(project.result==='lista_reserva')reserve++; else excluded++;
      if(result.constrained)constrained++;
      scores.push(project.total);if(project.rank)ranks.push(project.rank);budgets.push(result.used);
    }
    return {runs:config.runs,funded,reserve,excluded,constrained,frequency:100*funded/config.runs,
      scores:quantiles(scores),ranks:quantiles(ranks),rankedRuns:ranks.length,budgets:quantiles(budgets)};
  }
  function csv(rows) {
    const columns={id:'id',origen_dato:'origin',arquetipo:'archetype',sector:'sector',coste_elegible_eur:'cost',ayuda_solicitada_eur:'aid',ahorro_kwh_ano:'savingKwh',categoria_innovacion:'innovation',bonus_socioeconomico:'bonus',tamano_empresa:'size',zona:'zone',modo_ayuda:'aidMode',inversion_referencia_eur:'referenceCost',fraccion_maximo_solicitada:'requestShare',elegibilidad_tecnica:'technicalEligibility',potencia_kw:'powerKw',ahorro_pct:'savingPct',expediente_fuente:'sourceId',pdf_fuente:'sourcePdf',pagina_fuente:'sourcePage',url_fuente:'sourceUrl',factor_escala:'factor',perturbacion_ahorro:'perturbation',factor_cola:'tailFactor',orden_simulado:'arrival',semilla:'seed',iteracion:'iteration',version:'modelVersion'};
    const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
    return '\uFEFF'+[Object.keys(columns),...rows.map(r=>Object.values(columns).map(k=>r[k]))].map(r=>r.map(quote).join(';')).join('\n')+'\n';
  }
  return {VERSION,KWH_PER_KTEP,innovationPoints,rng,aidLimit,eligiblePool,generate,scale,points,scoreRows,monteCarlo,csv,quantiles};
});
