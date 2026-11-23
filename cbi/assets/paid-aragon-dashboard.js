import { renderScoreCircle } from './paid-aragon-score-circle.js?v=20261123-1';
import { CBI } from './cbi-supabase.js?v=20261120';
import { evaluate, intensity } from './paid-aragon-model.js?v=20261123-2';
import { initHistory } from './paid-aragon-history.js?v=20261121-2';
import { initForecast } from './paid-aragon-forecast.js?v=20261121-2';
const $=selector=>document.querySelector(selector);
const form=$('#application-form');
import { initCompetition, updateCompetition } from './paid-aragon-competition.js?v=20261121-2';
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
let rules,requestedAid=null;
const message=text=>{$('#status').textContent=text;$('#status').hidden=!text;};
async function request(path,options={}){
 const session=await CBI.getSession();
 if(!session)throw Error('La sesión ha caducado. Inicia sesión de nuevo.');
 return CBI.request(`/rest/v1/${path}`,{...options,session});
}
function selectTab(name,focus=false){
 document.body.dataset.view=name;$('#page-title').textContent=name==='history'?'PAIP Aragón · Data room':'Simulador de solicitud PAIP Aragón';

 document.querySelectorAll('[data-tab]').forEach(button=>{
  const selected=button.dataset.tab===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  if(selected&&focus)button.focus();$(`#panel-${button.dataset.tab}`).hidden=!selected;
 });
 document.dispatchEvent(new CustomEvent(name==='history'?'paid:history-visible':'paid:request-visible'));
}
document.querySelectorAll('[data-tab]').forEach(button=>{
 button.addEventListener('click',()=>selectTab(button.dataset.tab));button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectTab(event.key==='Home'?'request':event.key==='End'?'history':button.dataset.tab==='request'?'history':'request',true);
 });
});
function select(options,dataAttribute,id){
 const s=document.createElement('select');s.dataset[dataAttribute]=id;
 options.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;s.append(option);});return s;
}
const steps=[...document.querySelectorAll('#application-fields > .input-step, #manual-competitors-panel')];
function selectStep(index){$('.request-main').scrollTop=0;steps.forEach((section,i)=>{section.id='request-step-'+i;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','request-step-tab-'+i);section.hidden=i!==index;section.setAttribute('aria-label',['Proyecto y presupuesto','Elegibilidad y criterios','Competidoras'][i]);});document.querySelectorAll('[data-step]').forEach((button,i)=>{button.id='request-step-tab-'+i;button.setAttribute('aria-controls','request-step-'+i);button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});}
document.querySelectorAll('[data-step]').forEach(button=>{button.addEventListener('click',()=>selectStep(Number(button.dataset.step)));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?steps.length-1:(Number(button.dataset.step)+(event.key==='ArrowRight'?1:steps.length-1))%steps.length;selectStep(next);document.querySelector(`[data-step="${next}"]`).focus();});});
selectStep(0);
form.addEventListener('invalid',event=>{const index=steps.findIndex(section=>section.contains(event.target));if(index>=0)selectStep(index);},true);
const gateOptions=[['unknown','Pendiente de revisar'],['yes','Cumple / contrastado'],['no','No cumple']];
function segmented(select,labels){
 const group=document.createElement('div');group.className='segmented-choice';group.setAttribute('role','group');group.setAttribute('aria-labelledby',select.getAttribute('aria-labelledby')||'');
 for(const[value,label]of labels){const button=document.createElement('button');button.type='button';button.dataset.answer=value;button.textContent=label;button.setAttribute('aria-pressed',String(select.value===value));button.onclick=()=>{select.value=value;sync();select.dispatchEvent(new Event('change',{bubbles:true}));};group.append(button);}
 function sync(){group.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.answer===select.value)));}
 select.addEventListener('change',sync);select.hidden=true;select.after(group);
}
const numeric=input=>input.value.trim()===''||/^[-,.]$/.test(input.value.trim())?'':input.hasAttribute('data-number-format')?window.CBINumbers.parse(input.value):input.value;
function buildForm(){
 rules.categories.forEach(category=>{
  const tr=document.createElement('tr');const title=document.createElement('td');title.textContent=category.title;tr.append(title);
  const choice=document.createElement('div');choice.className='cost-regime-choice';choice.dataset.regime='minimis';
  const minimis=document.createElement('span');minimis.textContent='Minimis';const rgec=document.createElement('span');rgec.textContent='RGEC';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='regime-toggle';toggle.dataset.costRegime=category.id;toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked','false');toggle.setAttribute('aria-label','Usar RGEC para '+category.title+'; desactivado: minimis');
  toggle.addEventListener('click',()=>{const checked=toggle.getAttribute('aria-checked')!=='true';toggle.setAttribute('aria-checked',String(checked));choice.dataset.regime=checked?'rgec':'minimis';toggle.dispatchEvent(new Event('change',{bubbles:true}));});choice.append(minimis,toggle,rgec);title.append(choice);
  const cell=document.createElement('td'),input=document.createElement('input');input.type='number';input.min='0';input.max='999999999999.99';input.step='.01';input.value='0';input.dataset.numberFormat='';input.dataset.numberDecimals='2';input.dataset.cost=category.id;input.setAttribute('aria-label',category.title+': coste elegible');
  const range=document.createElement('input');range.type='range';range.min='0';range.max='1000000';range.step='1000';range.value='0';range.dataset.costRange=category.id;range.setAttribute('aria-label','Ajustar '+category.title);range.addEventListener('input',()=>{window.CBINumbers.setValue(input,Number(range.value));input.dispatchEvent(new Event('input',{bubbles:true}));});cell.append(input,range);tr.append(cell);
  const rate=document.createElement('td');rate.className='rate';rate.dataset.rate=category.id;rate.textContent='—';tr.append(rate);$('#cost-rows').append(tr);
 });
 const timing=[{id:'application_window',title:'Solicitud dentro del plazo de la convocatoria',detail:'Presentación entre el 11 de noviembre de 2026 y el 15 de enero de 2027.'},{id:'execution_window',title:'Actuaciones dentro del periodo subvencionable',detail:'Actuaciones elegibles entre el 1 de julio de 2026 y el 30 de junio de 2027.'},{id:'incentive_order',title:'Solicitud o pre-solicitud válida anterior al inicio (RGEC)',detail:'Requerido si se utiliza RGEC; una pre-solicitud válida debe cumplir la orden aplicable.'}].map(rule=>({...rule,source_url:rules.source_url}));
 [...timing,...rules.eligibility].forEach(rule=>{
  const div=document.createElement('div');div.className='check-row';if(['incentive_order','rgec_conditions'].includes(rule.id))div.dataset.rgecGate='';const info=document.createElement('div');const title=document.createElement('h3');title.id=`gate-label-${rule.id}`;title.textContent=rule.title;
  const p=document.createElement('p');p.textContent=rule.detail;const link=document.createElement('a');link.href=rule.source_url;link.target='_blank';link.rel='noopener';link.textContent=rule.page?`Orden · ${rule.section} · p. ${rule.page} ↗`:'Consultar orden ↗';info.append(title,p,link);
  const control=select(gateOptions,'gate',rule.id);control.setAttribute('aria-labelledby',title.id);div.append(info,control);$('#eligibility-rows').append(div);segmented(control,[['yes','Cumple'],['no','No cumple'],['unknown','Pendiente']]);
 });
 rules.criteria.forEach(rule=>{
  const div=document.createElement('div');div.className='criterion';const head=document.createElement('div');head.className='criterion-head';const id=document.createElement('span');id.className='criterion-id';id.textContent=rule.id;
  const title=document.createElement('h3');title.id=`criterion-label-${rule.id}`;title.textContent=rule.title;const points=document.createElement('span');points.className='points';points.textContent=`${rule.points} puntos`;head.append(id,title,points);
  const controls=document.createElement('div');controls.className='criterion-controls';const choice=select([['unknown','Por revisar'],['yes','Cumple'],['no','No cumple']],'criterion',rule.id);choice.setAttribute('aria-labelledby',title.id);controls.append(choice);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Condiciones';const condition=document.createElement('p');condition.textContent=rule.condition;const source=document.createElement('a');source.href=rule.source_url;source.target='_blank';source.rel='noopener';source.textContent='Orden · p. '+rule.page+' ↗';details.append(summary,condition,source);div.append(head,controls,details);$('#criteria-rows').append(div);segmented(choice,[['yes','Cumple'],['no','No cumple'],['unknown','Pendiente']]);
 });
}
function readApplication(){
 const assessment={version:rules.version,mode:'meeting',dateChecks:'declarations',costMode:'per_concept',eligibility:{},criteria:{},costs:{}};
 document.querySelectorAll('[data-input]').forEach(input=>{assessment[input.dataset.input]=numeric(input);});
 document.querySelectorAll('[data-gate]').forEach(input=>{assessment.eligibility[input.dataset.gate]=input.value;});
 document.querySelectorAll('[data-criterion]').forEach(input=>{const id=input.dataset.criterion;assessment.criteria[id]={value:input.value,evidence:''};});
 document.querySelectorAll('[data-cost]').forEach(input=>{const id=input.dataset.cost;assessment.costs[id]={amount:numeric(input),regime:document.querySelector(`[data-cost-regime="${id}"]`).getAttribute('aria-checked')==='true'?'rgec':'minimis'};});
 return {application_year:2027,assessment};
}
function updateEvaluation(){
 if(!rules)return;
 const application=readApplication(),result=evaluate(application,rules);
 $('#minimis-history-field').hidden=result.totalCost>0?!result.rows.some(row=>row.minimisCost>0):![...document.querySelectorAll('[data-cost-regime]')].some(button=>button.getAttribute('aria-checked')==='false');document.querySelectorAll('[data-rgec-gate]').forEach(row=>row.hidden=!result.usesRgec);
 const maximum=result.aid,aid=maximum===null?null:requestedAid===null?maximum:Math.max(0,Math.min(maximum,requestedAid));
 const computed={...result,aid,failed:[...result.failed]};if(aid!==null&&aid<rules.min_aid)computed.failed.push({title:'La ayuda solicitada debe alcanzar 4.000 €.'});
 computed.status=computed.failed.length?'no_elegible':result.status;updateCompetition(computed);
 if(requestedAid!==null&&aid!==null&&requestedAid!==aid)requestedAid=aid;
 const aidInput=$('#own-aid-input'),aidRange=$('#own-aid-range');aidInput.disabled=aidRange.disabled=maximum===null;aidRange.max=String(maximum??0);aidRange.value=String(aid??0);if(document.activeElement!==aidInput)window.CBINumbers.setValue(aidInput,aid??0);$('#own-aid-cap').textContent=maximum===null?'Completa tamaño, zona y presupuesto.':'Máximo calculado: '+eur.format(maximum);
 document.querySelectorAll('[data-cost-range]').forEach(range=>{const input=document.querySelector(`[data-cost="${range.dataset.costRange}"]`),value=Number(numeric(input))||0;range.max=String(Math.max(1000000,Math.ceil(value/100000)*100000));range.value=String(Math.max(0,value));});
 $('#eligibility-result').textContent=computed.status==='no_elegible'?'Revisar incumplimientos':computed.status==='pendiente'?'Elegibilidad pendiente':'Compatible según tus datos';
 $('#eligibility-count').textContent=`${result.checks.filter(c=>c.status==='pass').length} comprobaciones confirmadas · ${result.pending.length} pendientes · ${computed.failed.length} incumplimientos`;
 $('#score-result').replaceChildren(document.createTextNode(String(result.score)+' '));const em=document.createElement('em');em.textContent=`/ ${result.maxScore}`;$('#score-result').append(em);
 $('#score-potential').textContent=`Hasta ${result.potential} puntos si se acreditan los criterios pendientes.`;$('#score-meter').style.width=`${result.score/result.maxScore*100}%`;
 $('#aid-result').textContent=aid===null?'Pendiente de datos':eur.format(aid);
 $('#budget-result').textContent=`Coste declarado elegible: ${eur.format(result.totalCost)}`;
 const issues=$('#assessment-issues');issues.replaceChildren();
 computed.failed.slice(0,4).forEach(issue=>{const p=document.createElement('p');p.className='issue fail';p.textContent=issue.title;issues.append(p);});
 result.warnings.filter(warning=>!warning.startsWith('Estimación sobre costes')).forEach(warning=>{const p=document.createElement('p');p.className='issue';p.textContent=warning;issues.append(p);});
 document.querySelectorAll('[data-rate]').forEach(cell=>{
  const rate=intensity(cell.dataset.rate,application.assessment.costs[cell.dataset.rate].regime,application.assessment.size,application.assessment.zone);
  cell.textContent=rate===null?(application.assessment.size&&application.assessment.zone?'No aplica':'—'):`${Math.round(rate*100)} %`;
 });
 renderScoreCircle(rules,result.score);
 const breakdown=$('#criteria-breakdown');breakdown.replaceChildren();result.scoring.forEach(c=>{const row=document.createElement('div');row.className='criterion-summary';const label=document.createElement('span');label.textContent=c.title;const points=document.createElement('strong');points.textContent=c.score+' / '+c.points;const track=document.createElement('div');track.className='criterion-track';const bar=document.createElement('i');bar.style.width=(c.score/c.points*100)+'%';track.append(bar);row.append(label,points,track);breakdown.append(row);});
}
$('#own-aid-input').addEventListener('input',event=>{requestedAid=numeric(event.target)===''?null:Number(numeric(event.target));});
$('#own-aid-input').addEventListener('blur',updateEvaluation);
$('#own-aid-range').addEventListener('input',event=>{requestedAid=Number(event.target.value);window.CBINumbers.setValue($('#own-aid-input'),requestedAid);});
form.addEventListener('input',updateEvaluation);
form.addEventListener('change',updateEvaluation);
form.addEventListener('submit',event=>event.preventDefault());
document.addEventListener('cbi:access-granted',async()=>{
 try{
  const response=await fetch('../data/paid-aragon/rules-2027.json');if(!response.ok)throw Error('No se pudo cargar la convocatoria.');rules=await response.json();
  document.querySelectorAll('[data-input=previousMinimis],[data-input=otherAid]').forEach(input=>{input.dataset.numberFormat='';input.dataset.numberDecimals='2';});buildForm();window.CBINumbers.init(form);$('#application-fields').disabled=false;updateEvaluation();
 }catch(error){message(error.message);}
 const demand=await initForecast();
 try{const projects=await initHistory(request);if(demand){await initCompetition(projects,demand);if(rules)updateEvaluation();}}catch(error){$('#history-status').textContent='No se han podido cargar los históricos: '+error.message;}
},{once:true});
