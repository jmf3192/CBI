import { CBI } from './cbi-supabase.js?v=20261120';
import { evaluate, intensity } from './paid-aragon-model.js?v=20261120-4';
import { initHistory } from './paid-aragon-history.js?v=20261120-4';
import { initForecast } from './paid-aragon-forecast.js?v=20261120-4';
const $=selector=>document.querySelector(selector);
const form=$('#application-form');
import { initCompetition, updateCompetition } from './paid-aragon-competition.js?v=20261120-4';
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
let rules;
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
const steps=[...document.querySelectorAll('#application-fields > section.card')];
function selectStep(index){steps.forEach((section,i)=>{section.id='request-step-'+i;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','request-step-tab-'+i);section.hidden=i!==index;section.setAttribute('aria-label',['Proyecto','Presupuesto','Elegibilidad','Criterios'][i]);});document.querySelectorAll('[data-step]').forEach((button,i)=>{button.id='request-step-tab-'+i;button.setAttribute('aria-controls','request-step-'+i);button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});}
document.querySelectorAll('[data-step]').forEach(button=>{button.addEventListener('click',()=>selectStep(Number(button.dataset.step)));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?3:(Number(button.dataset.step)+(event.key==='ArrowRight'?1:3))%4;selectStep(next);document.querySelector(`[data-step="${next}"]`).focus();});});
selectStep(0);
form.addEventListener('invalid',event=>{const index=steps.findIndex(section=>section.contains(event.target));if(index>=0)selectStep(index);},true);
const gateOptions=[['unknown','Pendiente de revisar'],['yes','Cumple / contrastado'],['no','No cumple']];
function buildForm(){
 rules.categories.forEach(category=>{
  const tr=document.createElement('tr');const title=document.createElement('td');title.textContent=category.title;tr.append(title);
  ['minimis','rgec'].forEach(regime=>{
   const cell=document.createElement('td');const input=document.createElement('input');input.type='number';input.min='0';input.max='999999999999.99';input.step='.01';input.value='0';input.dataset.cost=category.id;input.dataset.regime=regime;input.setAttribute('aria-label',`${category.title}: coste ${regime}`);cell.append(input);tr.append(cell);
   const rate=document.createElement('td');rate.className='rate';rate.dataset.rate=`${category.id}_${regime}`;rate.textContent='—';tr.append(rate);
  });$('#cost-rows').append(tr);
 });
 rules.eligibility.forEach(rule=>{
  const div=document.createElement('div');div.className='check-row';const info=document.createElement('div');const title=document.createElement('h3');title.id=`gate-label-${rule.id}`;title.textContent=rule.title;
  const p=document.createElement('p');p.textContent=rule.detail;const link=document.createElement('a');link.href=rule.source_url;link.target='_blank';link.rel='noopener';link.textContent=`Orden · ${rule.section} · p. ${rule.page} ↗`;info.append(title,p,link);
  const control=select(gateOptions,'gate',rule.id);control.setAttribute('aria-labelledby',title.id);div.append(info,control);$('#eligibility-rows').append(div);
 });
 rules.criteria.forEach(rule=>{
  const div=document.createElement('div');div.className='criterion';const head=document.createElement('div');head.className='criterion-head';const id=document.createElement('span');id.className='criterion-id';id.textContent=rule.id;
  const title=document.createElement('h3');title.id=`criterion-label-${rule.id}`;title.textContent=rule.title;const points=document.createElement('span');points.className='points';points.textContent=`${rule.points} puntos`;head.append(id,title,points);
  const controls=document.createElement('div');controls.className='criterion-controls';const choice=select([['unknown','Por revisar'],['yes','Cumple'],['no','No cumple']],'criterion',rule.id);choice.setAttribute('aria-labelledby',title.id);controls.append(choice);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Condiciones';const condition=document.createElement('p');condition.textContent=rule.condition;const source=document.createElement('a');source.href=rule.source_url;source.target='_blank';source.rel='noopener';source.textContent='Orden · p. '+rule.page+' ↗';details.append(summary,condition,source);div.append(head,controls,details);$('#criteria-rows').append(div);
 });
}
function readApplication(){
 const assessment={version:rules.version,mode:'meeting',eligibility:{},criteria:{},costs:{}};
 document.querySelectorAll('[data-input]').forEach(input=>{assessment[input.dataset.input]=input.value;});
 document.querySelectorAll('[data-gate]').forEach(input=>{assessment.eligibility[input.dataset.gate]=input.value;});
 document.querySelectorAll('[data-criterion]').forEach(input=>{const id=input.dataset.criterion;assessment.criteria[id]={value:input.value,evidence:''};});
 document.querySelectorAll('[data-cost]').forEach(input=>{const id=input.dataset.cost;assessment.costs[id]??={};assessment.costs[id][input.dataset.regime]=input.value;});
 return {application_year:2027,assessment};
}
function updateEvaluation(){
 if(!rules)return;
 const application=readApplication(),result=evaluate(application,rules);updateCompetition(result);
 $('#eligibility-result').textContent=result.status==='no_elegible'?'Revisar incumplimientos':result.status==='pendiente'?'Elegibilidad pendiente':'Compatible según tus datos';
 $('#eligibility-count').textContent=`${result.checks.filter(c=>c.status==='pass').length} comprobaciones confirmadas · ${result.pending.length} pendientes · ${result.failed.length} incumplimientos`;
 $('#score-result').replaceChildren(document.createTextNode(String(result.score)+' '));const em=document.createElement('em');em.textContent=`/ ${result.maxScore}`;$('#score-result').append(em);
 $('#score-potential').textContent=`Hasta ${result.potential} puntos si se acreditan los criterios pendientes.`;$('#score-meter').style.width=`${result.score/result.maxScore*100}%`;
 $('#aid-result').textContent=result.aid===null?'Pendiente de datos':eur.format(result.aid);
 $('#budget-result').textContent=`Coste declarado elegible: ${eur.format(result.totalCost)}`;
 const issues=$('#assessment-issues');issues.replaceChildren();
 result.failed.slice(0,4).forEach(issue=>{const p=document.createElement('p');p.className='issue fail';p.textContent=issue.title;issues.append(p);});
 result.warnings.filter(warning=>!warning.startsWith('Estimación sobre costes')).forEach(warning=>{const p=document.createElement('p');p.className='issue';p.textContent=warning;issues.append(p);});
 document.querySelectorAll('[data-rate]').forEach(cell=>{
  const [category,regime]=cell.dataset.rate.split('_');const rate=intensity(category,regime,application.assessment.size,application.assessment.zone);
  cell.textContent=rate===null?(application.assessment.size&&application.assessment.zone?'No aplica':'—'):`${Math.round(rate*100)} %`;
 });
 const breakdown=$('#criteria-breakdown');breakdown.replaceChildren();result.scoring.forEach(c=>{const row=document.createElement('div');row.className='criterion-summary';const label=document.createElement('span');label.textContent=c.title;const points=document.createElement('strong');points.textContent=c.score+' / '+c.points;const track=document.createElement('div');track.className='criterion-track';const bar=document.createElement('i');bar.style.width=(c.score/c.points*100)+'%';track.append(bar);row.append(label,points,track);breakdown.append(row);});
}
form.addEventListener('input',updateEvaluation);
form.addEventListener('change',updateEvaluation);
form.addEventListener('submit',event=>event.preventDefault());
document.addEventListener('cbi:access-granted',async()=>{
 try{
  const response=await fetch('../data/paid-aragon/rules-2027.json');if(!response.ok)throw Error('No se pudo cargar la convocatoria.');rules=await response.json();
  buildForm();$('#application-fields').disabled=false;updateEvaluation();
 }catch(error){message(error.message);}
 const demand=await initForecast();
 try{const projects=await initHistory(request);if(demand){initCompetition(projects,demand);if(rules)updateEvaluation();}}catch(error){$('#history-status').textContent='No se han podido cargar los históricos: '+error.message;}
},{once:true});
