import { CBI } from './cbi-supabase.js?v=20261120';
import { evaluate, intensity } from './paid-aragon-model.js?v=20261120-2';
import { initHistory, csvText, download } from './paid-aragon-history.js?v=20261120-2';
const $=selector=>document.querySelector(selector);
const form=$('#application-form');
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
let access,rules,drafts=[],selectedId=null,canWrite=false,dirty=false,saving=false,lastEvaluation;
const baseFields=['company_name','project_name','application_year','province','notes'];
const message=text=>{$('#status').textContent=text;};
async function request(path,options={}){
 const session=await CBI.getSession();
 if(!session)throw Error('La sesión ha caducado. Inicia sesión de nuevo.');
 return CBI.request(`/rest/v1/${path}`,{...options,session});
}
function selectTab(name,focus=false){
 $('#status').hidden=name==='history';
 document.querySelectorAll('[data-tab]').forEach(button=>{
  const selected=button.dataset.tab===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  if(selected&&focus)button.focus();$(`#panel-${button.dataset.tab}`).hidden=!selected;
 });
 if(name==='history')document.dispatchEvent(new CustomEvent('paid:history-visible'));
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
  const condition=document.createElement('p');condition.textContent=rule.condition;const controls=document.createElement('div');controls.className='criterion-controls';
  const choice=select([['unknown','Por revisar'],['yes','Cumple'],['no','No cumple']],'criterion',rule.id);choice.setAttribute('aria-labelledby',title.id);
  const evidence=document.createElement('textarea');evidence.dataset.evidence=rule.id;evidence.rows=2;evidence.maxLength=4000;evidence.placeholder=rule.evidence;evidence.setAttribute('aria-label',`Evidencia para el criterio ${rule.id}`);controls.append(choice,evidence);
  const source=document.createElement('a');source.href=rule.source_url;source.target='_blank';source.rel='noopener';source.textContent=`Guía oficial · p. ${rule.page} ↗`;div.append(head,condition,controls,source);$('#criteria-rows').append(div);
 });
}
function readApplication(){
 const assessment={version:rules.version,eligibility:{},criteria:{},costs:{}};
 document.querySelectorAll('[data-input]').forEach(input=>{assessment[input.dataset.input]=input.value;});
 document.querySelectorAll('[data-gate]').forEach(input=>{assessment.eligibility[input.dataset.gate]=input.value;});
 document.querySelectorAll('[data-criterion]').forEach(input=>{const id=input.dataset.criterion;assessment.criteria[id]={value:input.value,evidence:$(`[data-evidence="${id}"]`).value};});
 document.querySelectorAll('[data-cost]').forEach(input=>{const id=input.dataset.cost;assessment.costs[id]??={};assessment.costs[id][input.dataset.regime]=input.value;});
 const values=Object.fromEntries(baseFields.map(name=>[name,form.elements[name].value]));
 values.company_name=values.company_name.trim();values.project_name=values.project_name.trim();values.application_year=Number(values.application_year);
 return {...values,assessment,schema_version:2};
}
function updateEvaluation(){
 if(!rules)return;
 const application=readApplication(),result=evaluate(application,rules);lastEvaluation=result;
 $('#eligibility-result').textContent=result.status==='no_elegible'?'Revisar incumplimientos':result.status==='pendiente'?'Elegibilidad pendiente':'Compatible según tus datos';
 $('#eligibility-count').textContent=`${result.checks.filter(c=>c.status==='pass').length} comprobaciones confirmadas · ${result.pending.length} pendientes · ${result.failed.length} incumplimientos`;
 $('#score-result').replaceChildren(document.createTextNode(String(result.score)+' '));const em=document.createElement('em');em.textContent=`/ ${result.maxScore}`;$('#score-result').append(em);
 $('#score-potential').textContent=`Hasta ${result.potential} puntos si se acreditan los criterios pendientes.`;$('#score-meter').style.width=`${result.score/result.maxScore*100}%`;
 $('#aid-result').textContent=result.aid===null?'Pendiente de datos':eur.format(result.aid);
 $('#budget-result').textContent=`Coste declarado elegible: ${eur.format(result.totalCost)}`;
 const issues=$('#assessment-issues');issues.replaceChildren();
 result.failed.slice(0,4).forEach(issue=>{const p=document.createElement('p');p.className='issue fail';p.textContent=issue.title;issues.append(p);});
 result.warnings.forEach(warning=>{const p=document.createElement('p');p.className='issue';p.textContent=warning;issues.append(p);});
 document.querySelectorAll('[data-rate]').forEach(cell=>{
  const [category,regime]=cell.dataset.rate.split('_');const rate=intensity(category,regime,application.assessment.size,application.assessment.zone);
  cell.textContent=rate===null?(application.assessment.size&&application.assessment.zone?'No aplica':'—'):`${Math.round(rate*100)} %`;
 });
 const zone=application.assessment.zone;
 const province=zone==='huesca'?'Huesca':zone==='teruel'?'Teruel':zone.startsWith('zaragoza')?'Zaragoza':'';
 if(province&&form.elements.province.value!==province)form.elements.province.value=province;
}
function renderDrafts(){
 const select=$('#draft-select');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Nueva solicitud 2027';select.append(empty);
 drafts.forEach(draft=>{const option=document.createElement('option');option.value=draft.id;option.textContent=`${draft.application_year} · ${draft.project_name}`;select.append(option);});select.value=selectedId||'';
}
function openDraft(draft=null){
 selectedId=draft?.id||null;form.reset();form.elements.application_year.value=draft?.application_year||2027;
 baseFields.forEach(name=>{if(draft)form.elements[name].value=draft[name]??'';});
 const assessment=draft?.assessment||{};
 document.querySelectorAll('[data-input]').forEach(input=>{input.value=assessment[input.dataset.input]??'';});
 document.querySelectorAll('[data-gate]').forEach(input=>{input.value=assessment.eligibility?.[input.dataset.gate]||'unknown';});
 document.querySelectorAll('[data-criterion]').forEach(input=>{input.value=assessment.criteria?.[input.dataset.criterion]?.value||'unknown';});
 document.querySelectorAll('[data-evidence]').forEach(input=>{input.value=assessment.criteria?.[input.dataset.evidence]?.evidence||'';});
 document.querySelectorAll('[data-cost]').forEach(input=>{input.value=assessment.costs?.[input.dataset.cost]?.[input.dataset.regime]??'0';});
 dirty=false;$('#save-note').textContent=draft?'Borrador recuperado de CBI':'Borrador privado en CBI';renderDrafts();updateEvaluation();
}
function canSwitch(){return !dirty||window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
$('#draft-select').addEventListener('change',event=>{if(saving)return;if(!canSwitch()){event.target.value=selectedId||'';return;}openDraft(drafts.find(d=>d.id===event.target.value));});
$('#new-request').addEventListener('click',()=>{if(saving||!canSwitch())return;openDraft();message('Nueva solicitud 2027. Completa los datos y guarda el borrador.');});
form.addEventListener('input',()=>{dirty=true;$('#save-note').textContent='Cambios sin guardar';updateEvaluation();});
form.addEventListener('change',updateEvaluation);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!access||!canWrite||saving||!form.reportValidity())return;
 const values=readApplication();values.requested_budget=evaluate(values,rules).totalCost;
 if(!values.company_name||!values.project_name){message('Completa empresa y proyecto.');return;}
 saving=true;$('#application-fields').disabled=true;$('#new-request').disabled=true;$('#draft-select').disabled=true;
 try{
  const path=selectedId?`paid_aragon_applications?id=eq.${encodeURIComponent(selectedId)}&select=*`:'paid_aragon_applications?select=*';
  const rows=await request(path,{method:selectedId?'PATCH':'POST',headers:{Prefer:'return=representation'},body:values});
  if(!rows?.[0])throw Error('No se ha guardado el borrador. Revisa los permisos.');
  const draft=rows[0];drafts=[draft,...drafts.filter(d=>d.id!==draft.id)];openDraft(draft);message('Solicitud 2027 y evaluación guardadas en CBI.');
 }catch(error){message(`No se ha podido guardar: ${error.message}`);}
 finally{saving=false;$('#application-fields').disabled=!canWrite;$('#new-request').disabled=!canWrite;$('#draft-select').disabled=false;}
});
$('#export-assessment').addEventListener('click',()=>{
 if(!rules||!lastEvaluation)return;
 const app=readApplication(),r=evaluate(app,rules);
 const rows=[...r.checks.map(c=>({tipo:'elegibilidad',codigo:c.id,concepto:c.title,resultado:c.status,puntos:'',evidencia:c.detail,empresa:app.company_name,proyecto:app.project_name,ejercicio:2027,version:rules.version})),...r.scoring.map(c=>({tipo:'criterio',codigo:c.id,concepto:c.title,resultado:c.supported?'cumple_con_evidencia_declarada':c.answer,puntos:c.score,evidencia:c.evidenceNote,empresa:app.company_name,proyecto:app.project_name,ejercicio:2027,version:rules.version}))];
 rows.push({tipo:'resumen',codigo:'total',concepto:'Autoevaluación; no es resolución oficial',resultado:r.status,puntos:r.score,evidencia:`Ayuda orientativa: ${r.aid??'pendiente'} EUR; máximo potencial: ${r.potential} puntos.`,empresa:app.company_name,proyecto:app.project_name,ejercicio:2027,version:rules.version});download('paip-2027-evaluacion.csv',csvText(rows));
});
document.addEventListener('cbi:access-granted',async event=>{
 access=event.detail;
 try{
  const [response,permissions]=await Promise.all([fetch('../data/paid-aragon/rules-2027.json'),request(`user_call_access?select=access_level&user_id=eq.${encodeURIComponent(access.session.user.id)}&call_id=eq.${encodeURIComponent(access.call.id)}`)]);
  if(!response.ok)throw Error('No se pudo cargar la convocatoria 2027.');rules=await response.json();
  canWrite=['evaluate','admin'].includes(permissions[0]?.access_level);buildForm();openDraft();
  drafts=[];for(let offset=0;;offset+=200){const batch=await request(`paid_aragon_applications?select=*&status=eq.draft&order=updated_at.desc,id.asc&limit=200&offset=${offset}`);drafts.push(...batch);if(batch.length<200)break;}
  renderDrafts();$('#application-fields').disabled=!canWrite;$('#new-request').disabled=!canWrite;
  message(canWrite?'Solicitud 2027 preparada. Completa los requisitos y las evidencias.':'Acceso de consulta. Los borradores requieren permiso de edición.');
 }catch(error){message(`No se ha podido cargar el configurador: ${error.message}`);$('#application-fields').disabled=true;$('#new-request').disabled=true;}
 try{await initHistory(request);}catch(error){$('#history-status').textContent=`No se han podido cargar los históricos: ${error.message}`;}
},{once:true});
