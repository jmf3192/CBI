/* PAIP TDI-FEDER 2027. Deterministic preflight and self-assessment, not an official decision. */
export const SIZE = ['micro','small','medium','large'];
export const ZONES = ['huesca','zaragoza_city','zaragoza_rest','teruel'];
const minimisInvestment = {huesca:[.6,.5,.4,.3],zaragoza_city:[.5,.4,.3,.2],zaragoza_rest:[.6,.5,.4,.3],teruel:[.7,.6,.5,.4]};
const rgecInvestment = {huesca:[.35,.35,.25,.15],zaragoza_city:[.2,.2,.1,null],zaragoza_rest:[.35,.35,.25,.15],teruel:[.4,.4,.3,.2]};
const minimisOther = {research:[.7,.6,.5,.35],process:[.7,.6,.5,.35],ip:[.8,.7,.6,.4],consulting:[.8,.7,.6,.4]};
const rgecOther = {research:[.45,.45,.35,.25],process:[.45,.45,.35,null],ip:[.5,.5,.5,null],consulting:[.5,.5,.5,null]};
export function intensity(category, regime, size, zone) {
  const index=SIZE.indexOf(size);
  if (index<0 || !ZONES.includes(zone) || !['minimis','rgec'].includes(regime)) return null;
  if(category==='investment')return (regime==='minimis'?minimisInvestment:rgecInvestment)[zone][index];
  return (regime==='minimis'?minimisOther:rgecOther)[category]?.[index] ?? null;
}
const amount = value => value === '' || value === null || value === undefined ? null : Number(value);
const validMoney = value => Number.isFinite(value) && value >= 0;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value||'') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

export function evaluate(application, rules) {
  const input=application.assessment || {};
  const meeting=input.mode==='meeting',declaredDates=meeting&&input.dateChecks==='declarations';
  const perConcept=input.costMode==='per_concept',singleRegime=!perConcept&&Object.hasOwn(input,'regime');
  const regimeValid=perConcept?rules.categories.every(c=>{const b=input.costs?.[c.id]||{};return amount(b.amount??0)===0||['minimis','rgec'].includes(b.regime);}):['minimis','rgec'].includes(input.regime);
  const answers=input.eligibility || {}, criteria=input.criteria || {}, checks=[], warnings=[];
  const check=(id,title,value,detail='')=>checks.push({id,title,status:value===true?'pass':value===false?'fail':'pending',detail});
  const rows=rules.categories.map(category=>{
    const budget=input.costs?.[category.id] || {};
    const regime=perConcept?budget.regime:input.regime,declaredCost=amount(budget.amount??0);
    const m=perConcept||singleRegime?amount(regime==='minimis'?budget.amount??0:0):amount(budget.minimis??0),r=perConcept||singleRegime?amount(regime==='rgec'?budget.amount??0:0):amount(budget.rgec??0);
    const mr=intensity(category.id,'minimis',input.size,input.zone),rr=intensity(category.id,'rgec',input.size,input.zone);
    return {...category,regime,declaredCost,minimisCost:m,rgecCost:r,minimisRate:mr,rgecRate:rr,minimisAid:validMoney(m)&&mr!==null?m*mr:0,rgecAid:validMoney(r)&&rr!==null?r*rr:0};
  });
  const usesRgec=rows.some(row=>row.rgecCost>0);
  const costsValid=rows.every(row=>validMoney(row.minimisCost)&&validMoney(row.rgecCost)&&(!perConcept||validMoney(row.declaredCost)));
  const totalCost=rows.reduce((s,r)=>s+(perConcept?(r.declaredCost||0):(r.minimisCost||0)+(r.rgecCost||0)),0);
  check('year','Ejercicio de solicitud 2027',Number(application.application_year)===2027);
  if(singleRegime||perConcept)check('regime',perConcept?'Régimen asignado a cada concepto':'Régimen de ayuda seleccionado',regimeValid?true:null);
  check('size','Tamaño de empresa y zona seleccionados',SIZE.includes(input.size)&&ZONES.includes(input.zone)?true:null);
  check('costs','Presupuesto elegible desglosado',costsValid&&totalCost>0?true:totalCost===0?null:false);
  const declared=id=>answers[id]==='yes'?true:answers[id]==='no'?false:null;
  const applicationDate=validDate(input.applicationDate)?input.applicationDate:null;
  check('application_date','Fecha de presentación entre 11/11/2026 y 15/01/2027',declaredDates?declared('application_window'):applicationDate?applicationDate>=rules.application_start&&applicationDate<=rules.application_end:null);
  const start=validDate(input.startDate)?input.startDate:null,end=validDate(input.endDate)?input.endDate:null;
  check('execution_dates','Actuaciones elegibles entre 01/07/2026 y 30/06/2027',declaredDates?declared('execution_window'):start&&end?start>=rules.execution_start&&end<=rules.execution_end&&end>=start:null,'Fechas de las actuaciones cuyos gastos se incluyen; revisar compromisos firmes y facturas.');
  let incentive=true;
  if(usesRgec){
    const pre=validDate(input.preApplicationDate)?input.preApplicationDate:null;
    incentive=declaredDates?declared('incentive_order'):start&&applicationDate?(start>applicationDate||(answers.valid_preapplication==='yes'&&pre&&pre<start))?true:false:null;
    check('incentive','Efecto incentivador del tramo RGEC',incentive,'Solicitud o pre-solicitud válida anterior al inicio; si solo consta el mismo día, comprobar la hora y orden documental.');
  }
  rows.forEach(row=>{
    if(row.rgecCost>0 && row.rgecRate===null)check('regime_'+row.id,`${row.title}: régimen RGEC aplicable`,false,'No aplicable al tamaño/zona elegido. Revisa la asignación de gastos.');
  });
  const needsMinimis=perConcept?rows.some(row=>row.minimisCost>0):!singleRegime||input.regime!=='rgec',prior=needsMinimis?amount(input.previousMinimis):0,other=amount(input.otherAid);
  if(needsMinimis)check('minimis_history','Ayudas de minimis de la empresa única en los tres años anteriores',validMoney(prior)?true:null,'Comprobar empresa única y periodo móvil de tres años, no solo la sociedad solicitante.');
  check('other_aid','Otras ayudas sobre los mismos costes declaradas',validMoney(other)?true:null);
  const minimisGross=rows.reduce((s,r)=>s+r.minimisAid,0),rgecGross=rows.reduce((s,r)=>s+r.rgecAid,0);
  const minimisRoom=validMoney(prior)?Math.max(0,rules.minimis_cap-prior):null;
  const minimisAid=minimisRoom===null?null:Math.min(minimisGross,minimisRoom);
  const rgecReady=!usesRgec||(incentive===true&&answers.rgec_conditions==='yes');
  const gross=(minimisAid??0)+(rgecReady?rgecGross:0);
  const limited=Math.max(0,Math.min(gross,rules.max_aid,.8*totalCost-(other??0)));
  const estimationReady=(!(singleRegime||perConcept)||regimeValid)&&costsValid&&totalCost>0&&SIZE.includes(input.size)&&ZONES.includes(input.zone)&&validMoney(prior)&&validMoney(other)&&rgecReady&&rows.every(r=>!r.rgecCost||r.rgecRate!==null);
  const aid=estimationReady?Math.round(limited):null;
  rules.eligibility.forEach(rule=>{
    if(rule.id==='rgec_conditions'&&!usesRgec)return;
    if(rule.id==='payment_terms'&&aid!==null&&aid<=30000)return;
    const value=answers[rule.id];
    check(rule.id,rule.title,value==='yes'?true:value==='no'?false:null,rule.detail);
  });
  if(aid!==null)check('minimum_aid','Ayuda calculada de al menos 4.000 €',limited>=rules.min_aid);
  if(minimisRoom!==null&&minimisGross>minimisRoom)warnings.push('El tramo de minimis supera el margen disponible. Se limita al saldo; no se reasigna automáticamente el exceso de gasto a RGEC.');
  if(validMoney(other)&&other>0)warnings.push('Las otras ayudas requieren revisar además las intensidades máximas por coste y régimen. El límite agregado del 80 % no sustituye esa revisión.');
  warnings.push('Estimación sobre costes declarados elegibles. La intensidad y el máximo pueden cambiar en los supuestos del apartado XI.6; la concesión depende de la evaluación y del crédito.');
  const scoring=rules.criteria.map(rule=>{
    const answer=criteria[rule.id] || {};
    let applicable=true;
    if(rule.id==='l'&&['medium','large'].includes(input.size))applicable=false;
    if(rule.id==='m'){
      if(['medium','large'].includes(input.size))applicable=false;
      if(validDate(input.foundationDate)&&applicationDate){const cutoff=new Date(applicationDate);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-3);if(input.foundationDate<=cutoff.toISOString().slice(0,10)||input.foundationDate>applicationDate)applicable=false;}
    }
    const prerequisites=rule.id==='m'?(declaredDates?['micro','small'].includes(input.size):validDate(input.foundationDate)&&applicationDate&&['micro','small'].includes(input.size)):rule.id==='l'?['micro','small'].includes(input.size):rule.id==='o'?answers.documents==='yes'&&!rules.criteria.some(c=>criteria[c.id]?.value==='yes'&&!meeting&&!String(criteria[c.id]?.evidence||'').trim()):true;
    const satisfied=applicable&&prerequisites&&answer.value==='yes'&&(meeting||String(answer.evidence||'').trim().length>0);
    return {...rule,answer:answer.value||'unknown',evidenceNote:answer.evidence||'',supported:satisfied,score:satisfied?rule.points:0,potential:answer.value==='no'||!applicable?0:rule.points};
  });
  const score=scoring.reduce((s,c)=>s+c.score,0),potential=scoring.reduce((s,c)=>s+c.potential,0);
  const failed=checks.filter(x=>x.status==='fail'),pending=checks.filter(x=>x.status==='pending');
  return {version:rules.version,status:failed.length?'no_elegible':pending.length?'pendiente':'compatible_segun_declaracion',checks,warnings,failed,pending,score,potential,maxScore:rules.max_score,scoring,totalCost,aid,rows,minimisGross,rgecGross,minimisRoom,usesRgec};
}
