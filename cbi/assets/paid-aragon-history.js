import { historicalStats, renderHistoricalDistribution, renderHistoricalComparisons } from './paid-aragon-history-analytics.js?v=20261121-2';
import {isLegacyRecord,mergeHistoryRecords} from './paid-aragon-history-records.js?v=20261121-2';
const $=selector=>document.querySelector(selector);
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const integer=new Intl.NumberFormat('es-ES');
const labels={concedida:'Concedida',lista_espera:'Lista de espera',no_elegible:'No elegible',desistida:'Desistida',anulada:'Anulada',renuncia_lista_espera:'Renuncia de espera',operacion_feder:'Operación FEDER'};
const sectorLabels={fertilizantes:'Fertilizantes',nutricion_animal:'Nutrición animal',revision_sectorial:'Por revisar',otros:'Otros'};
const colors={fertilizantes:'#39846a',nutricion_animal:'#637fbe',otros:'#bac5cf',revision_sectorial:'#c8813c'};
const sum=(rows,key)=>rows.reduce((s,r)=>s+(r[key]===null?0:Number(r[key])||0),0);
export function csvText(rows) {
 const keys=[...new Set(rows.flatMap(row=>Object.keys(row)))];
 const cell=value=>{
  let text=value===null||value===undefined?'':typeof value==='object'?JSON.stringify(value):String(value);
  // Keep exported text inert when the CSV is opened in spreadsheet software.
  if(typeof value==='string'&&/^[=+@\-\t\r]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 return '\uFEFF'+[keys.map(cell).join(','),...rows.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\r\n');
}
export function download(name,content,type='text/csv;charset=utf-8') {
 const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function link(url,label) {
 const a=document.createElement('a');
 try{const target=new URL(url);if(!['https:','http:'].includes(target.protocol))return document.createTextNode('—');a.href=target.href;}catch{return document.createTextNode('—');}
 a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
}
export async function initHistory(request) {
 let projects=[],summary,source='Supabase',filtered=[],page=0,archive;
 try{const response=await fetch('../data/paid-aragon/history.json');if(response.ok)archive=await response.json();}catch{}
 try{
  const editions=await request('paid_aragon_editions?select=id,year,title&order=year.desc');
  for(let offset=0;;offset+=500){
   const batch=await request(`paid_aragon_awards?select=*&order=import_key.asc,id.asc&limit=500&offset=${offset}`);
   if(!Array.isArray(batch))throw Error('Respuesta de históricos no válida.');
   projects.push(...batch.map(row=>({...row,year:editions.find(e=>e.id===row.edition_id)?.year,status:row.result_status,extraction:row.extraction_method})));
   if(batch.length<500)break;
  }
  const response=await fetch('../data/paid-aragon/validation.json');if(!response.ok)throw Error('No se pudo cargar la cobertura.');summary=await response.json();
  if(projects.length!==summary.projects)throw Error(`La base contiene ${projects.length} expedientes y el inventario ${summary.projects}.`);
 }catch(error){
  if(!archive)throw error;
  projects=archive.projects;summary=archive.summary;source='Copia CSV versionada (Supabase no disponible o pendiente de sincronizar)';
 }
 if(archive){const index=new Map(archive.projects.map(r=>[r.year+'|'+r.case_id,r]));projects=projects.map(r=>({...index.get(r.year+'|'+r.case_id),...r}));}
 projects=projects.map(r=>({...r,...(r.enrichment?.fields||{})}));
 const eventIndex=new Map();
 try{const response=await fetch('../data/paid-aragon/historico_eventos.csv');if(response.ok){for(const event of window.CBIData.parse(await response.text(),',').records){const key=event.year+'|'+event.case_id;if(!eventIndex.has(key))eventIndex.set(key,[]);eventIndex.get(key).push(event);}}}catch{}
 projects=projects.map(row=>({...row,events:eventIndex.get(row.year+'|'+row.case_id)||[]}));
 let legacyArchive;
 try{const response=await fetch('../data/paid-aragon/legacy-history.json');if(response.ok)legacyArchive=await response.json();}catch{}
 let operations=[];
 try{for(let offset=0;;offset+=500){const batch=await request(`paid_aragon_legacy_operations?select=record&order=operation_code.asc&limit=500&offset=${offset}`);if(!Array.isArray(batch))throw Error('Respuesta de antecedentes no válida.');operations.push(...batch.map(r=>r.record));if(batch.length<500)break;}if(operations.length!==(legacyArchive?.summary.records??310))throw Error('Antecedentes pendientes de sincronizar.');mergeHistoryRecords([],operations);}catch(error){if(!legacyArchive)throw Error('No se han podido cargar las anualidades 2017–2020.');operations=legacyArchive.records;source+=' · antecedentes CSV';}
 projects=mergeHistoryRecords(projects,operations);
 [...new Set(projects.map(r=>r.year))].sort((a,b)=>b-a).forEach(year=>{const option=document.createElement('option');option.value=year;option.textContent=year;$('#history-year').append(option);});
 const years=$('#history-years');
 [['','Todos desde 2017'],['sector','Fertilizantes y nutrición animal'],...[...new Set(projects.map(r=>r.year))].sort((a,b)=>b-a).map(y=>[String(y),String(y)])].forEach(([value,label])=>{const button=document.createElement('button');button.textContent=label;button.dataset.year=value;button.setAttribute('aria-pressed',String(!value));button.addEventListener('click',()=>{$('#history-year').value=value;if(value==='sector')$('#history-line').value='';if(value&&value!=='sector'){const legacy=Number(value)<2021;if(legacy&&$('#history-line').value!=='FEDER · antecedente'||!legacy&&$('#history-line').value==='FEDER · antecedente')$('#history-line').value='';if(legacy&&$('#history-outcome').value!=='operacion_feder'||!legacy&&$('#history-outcome').value==='operacion_feder')$('#history-outcome').value='';}filter();});years.append(button);});
 const coverage=$('#coverage-content');
 summary.coverage.forEach(row=>{const p=document.createElement('p');p.textContent=`${row.year} · ${integer.format(row.projects)} expedientes · ${row.downloaded_sources} documentos descargados. ${row.note}`;coverage.append(p);});
 const enriched=summary.enrichment;
 if(enriched){for(const row of enriched.coverage){const p=document.createElement('p');p.textContent=`${row.year} · ${row.with_project_description} fichas con descripción del proyecto · ${row.with_nif} con NIF contrastado · ${row.with_company_antecedents} con otras actuaciones de la empresa.`;coverage.append(p);}const p=document.createElement('p');p.textContent='Antecedentes FEDER recuperados: '+enriched.legacy_coverage.map(r=>`${r.year}: ${r.operations} operaciones`).join(' · ')+'. Se conservan como información complementaria, sin sumarlos a las concesiones PAIP.';coverage.append(p);}
 const issues=summary.source_reconciliations||[];
 issues.forEach(issue=>{const p=document.createElement('p');p.textContent=`Conciliación ${issue.year}, ${issue.line}: suma de filas ${eur.format(issue.extracted_total)}; total impreso ${eur.format(issue.published_total)}. ${issue.status}`;coverage.append(p);});
 function filter(){
  const year=$('#history-year').value,line=$('#history-line').value,status=$('#history-outcome').value,query=$('#history-search').value.trim().toLocaleLowerCase('es');
  filtered=projects.filter(row=>(!year||(year==='sector'?['fertilizantes','nutricion_animal'].includes(row.sector):String(row.year)===year))&&(!line||row.line===line)&&(!status||row.status===status)&&(!query||`${row.beneficiary} ${row.case_id} ${row.nif||''} ${row.project_description||''} ${row.province||''} ${row.municipality||''}`.toLocaleLowerCase('es').includes(query)));
  const mode=$('#history-sort').value;
  filtered.sort((a,b)=>mode==='aid'?(b.granted_amount??-1)-(a.granted_amount??-1):mode==='score'?(b.score??-1)-(a.score??-1):mode==='beneficiary'?a.beneficiary.localeCompare(b.beneficiary,'es'):b.year-a.year||a.case_id.localeCompare(b.case_id));
  page=0;render();
 }
 function render(){
  document.querySelectorAll('[data-year]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.year===$('#history-year').value)));
  renderHistoricalDistribution(filtered,showProject);renderHistoricalComparisons(filtered,showProject,year=>{$('#history-year').value=year;filter();});
  const granted=filtered.filter(r=>r.status==='concedida');
  const waiting=filtered.filter(r=>r.status==='lista_espera');
  const awards=filtered.filter(r=>!isLegacyRecord(r)),legacyCount=filtered.length-awards.length;
  $('#history-status').textContent=`${integer.format(awards.length)} expedientes${legacyCount?' · '+integer.format(legacyCount)+' operaciones FEDER':''} · ${source} · Fuentes revisadas a ${legacyArchive?.summary.as_of||summary.as_of}.${legacyCount?' Cobertura parcial de 2017–2020; los costes FEDER se muestran separados de las concesiones.':''}${filtered.some(r=>r.year===2021||r.year===2022)?' Consulta las diferencias con los totales impresos en «Cobertura y fuentes».':''}`;
  const kpis=$('#history-kpis');kpis.replaceChildren();
  const stats=historicalStats(filtered);
  [[integer.format(filtered.length),legacyCount?'Registros disponibles':'Expedientes',legacyCount?`${awards.length} expedientes y ${legacyCount} operaciones FEDER`:'Una fila por expediente y convocatoria'],[awards.length?integer.format(granted.length):'—','Concesiones',awards.length?`${integer.format(waiting.length)} en lista de espera`:'No publicadas en el listado de operaciones'],[awards.length?eur.format(sum(granted,'granted_amount')):'—','Ayuda concedida','Solo concesiones PAIP; sin sumar costes FEDER'],[integer.format(new Set(filtered.map(r=>r.beneficiary.toUpperCase().replaceAll(/[.,]/g,''))).size),'Empresas publicadas','Según denominación; sin unificación por NIF'],[stats.rate===null?'—':stats.rate.toLocaleString('es-ES',{maximumFractionDigits:1})+' %','Porcentaje de concesión','Solo expedientes PAIP no anulados'],[stats.comparable?(stats.fundedMean!==null?stats.fundedMean.toLocaleString('es-ES',{maximumFractionDigits:1}):'No publicada'):awards.length?'Por convocatoria':'—','Media financiada','Puntuaciones publicadas de concesiones'],[stats.cutoff===null?(stats.comparable?'No publicada':awards.length?'Por convocatoria':'—'):stats.cutoff.toLocaleString('es-ES',{maximumFractionDigits:1}),'Menor puntuación financiada','Histórica; no es un umbral de 2027']].forEach(([value,label,note])=>{const div=document.createElement('div');div.className='kpi';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;const p=document.createElement('p');p.textContent=note;div.append(small,strong,p);kpis.append(div);});
  $('#year-chart').parentElement.querySelector('h3').textContent=awards.length?'Ayuda concedida por año':'Operaciones FEDER por año';
  renderBars($('#year-chart'),[...new Set((awards.length?awards:filtered).map(r=>r.year))].sort().map(year=>({label:String(year),value:awards.length?sum(granted.filter(r=>r.year===year),'granted_amount'):filtered.filter(r=>r.year===year).length})),Boolean(awards.length));
  $('#outcome-chart').parentElement.querySelector('h3').textContent=awards.length?'Resultados de los expedientes':'Tipo de registro';
  renderBars($('#outcome-chart'),(awards.length?Object.keys(labels):['operacion_feder']).map(status=>({label:labels[status],value:filtered.filter(r=>r.status===status).length,color:status==='concedida'?'#39846a':status==='lista_espera'?'#b98b50':'#91a4b3'})),false);
  renderScatter(granted.filter(r=>r.score!==null&&r.granted_amount!==null));renderTable();
 }
 function renderBars(container,rows,currency){
  container.replaceChildren();const max=Math.max(1,...rows.map(r=>r.value));
  rows.forEach(row=>{const div=document.createElement('div');div.className='bar-row';const label=document.createElement('span');label.textContent=row.label;const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('i');bar.style.width=`${Math.max(0,row.value)/max*100}%`;if(row.color)bar.style.background=row.color;track.append(bar);const value=document.createElement('strong');value.textContent=currency?eur.format(row.value):integer.format(row.value);div.append(label,track,value);container.append(div);});
  if(!rows.length)container.textContent='Sin registros para esta selección.';
 }
 function renderScatter(rows){
  const container=$('#scatter-chart');container.replaceChildren();
  if(!rows.length){container.textContent='Sin concesiones con importe y puntuación en esta selección.';return;}
  const width=Math.max(300,container.clientWidth||1050),left=80,right=width-15,plot=right-left;
  const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} 300`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Dispersión: puntuación horizontal e importe concedido vertical, por sector.');
  const element=(tag,attributes,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const maxY=Math.max(1,...rows.map(r=>Number(r.granted_amount))),maxX=Math.max(50,...rows.map(r=>Number(r.score)));
  for(let i=0;i<=4;i++){const y=245-i*52;element('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#e7edf2'});element('text',{x:left-9,y:y+4,'text-anchor':'end'},eur.format(maxY*i/4));}
  for(let i=0;i<=5;i++){const x=left+i*plot/5;element('text',{x,y:268,'text-anchor':'middle'},String(Math.round(maxX*i/5)));}
  element('text',{x:left+plot/2,y:292,'text-anchor':'middle'},'Puntuación publicada');
  [...rows].sort((a,b)=>(a.sector==='otros'?0:1)-(b.sector==='otros'?0:1)).forEach(row=>{
   const dot=element('circle',{cx:left+Number(row.score)/maxX*plot,cy:245-Number(row.granted_amount)/maxY*208,r:row.sector==='otros'?4.5:6,fill:colors[row.sector]||'#8eb6dc',opacity:row.sector==='otros'?.6:.9,stroke:'#fff','stroke-width':1});
   const title=document.createElementNS(ns,'title');title.textContent=`${row.year} · ${row.beneficiary} · ${row.score} puntos · ${eur.format(row.granted_amount)}`;dot.append(title);dot.setAttribute('tabindex','0');dot.setAttribute('role','button');dot.setAttribute('aria-label',title.textContent+' · Ver ficha');dot.style.cursor='pointer';dot.addEventListener('click',()=>showProject(row));dot.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showProject(row);}});
  });container.append(svg);
 }
 function renderTable(){
  const body=$('#history-rows');body.replaceChildren();const visible=filtered.slice(page*50,(page+1)*50);
  visible.forEach(row=>{
   const tr=document.createElement('tr');tr.className=`sector-${row.sector}`;
   const td=()=>{const c=document.createElement('td');tr.append(c);return c;};
   let c=td();c.textContent=row.year;const line=document.createElement('small');line.textContent=row.line;c.append(line);
   c=td();const title=document.createElement('button');title.className='project-link';title.type='button';title.textContent=row.project_title||row.beneficiary;title.addEventListener('click',()=>showProject(row));const code=document.createElement('small');code.textContent=row.case_id;c.append(title,code);
   if(row.notes){const note=document.createElement('small');note.textContent=row.notes;c.append(note);}
   c=td();const badge=document.createElement('span');badge.className=`pill ${row.sector}`;badge.textContent=sectorLabels[row.sector]||'Otros';badge.title=row.sector_basis||'';c.append(badge);
   if(row.sector_confidence==='indicio_denominacion'){const note=document.createElement('small');note.textContent='Indicio por denominación';c.append(note);}
   if(row.sector_source_url&&row.sector!=='otros'){const note=document.createElement('small');note.append(link(row.sector_source_url,'Evidencia sectorial ↗'));c.append(note);}
   c=td();const status=document.createElement('span');status.className=`pill ${row.status}`;status.textContent=labels[row.status]||row.status;c.append(status);
   if(row.waiting_amount>0){const note=document.createElement('small');note.textContent=`Parte pendiente: ${eur.format(row.waiting_amount)}`;c.append(note);}
   td().textContent=row.score===null?'—':Number(row.score).toLocaleString('es-ES');
   c=td();c.textContent=isLegacyRecord(row)?'No publicada':row.status==='concedida'?(row.granted_amount===null?'Pendiente de validar':eur.format(row.granted_amount)):'—';
   if(isLegacyRecord(row)){const note=document.createElement('small');note.textContent='Coste FEDER: '+eur.format(row.feder_operation_cost);c.append(note);}
   if(row.extraction==='ocr_vision'){const note=document.createElement('small');note.textContent='Fuente escaneada / OCR';c.append(note);}
   c=td();const open=document.createElement('button');open.type='button';open.className='open-project';open.textContent='Ver ficha';open.addEventListener('click',()=>showProject(row));c.append(open,document.createElement('br'));c.append(link(row.source_url,`PDF · p. ${row.source_page} ↗`));
   if(row.source_refs?.length>1){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${row.source_refs.length} eventos`;details.append(summary);row.source_refs.forEach(ref=>{const p=document.createElement('p');p.append(link(ref.url,`${labels[ref.status]||ref.status} · p. ${ref.page}`));details.append(p);});c.append(details);}
   body.append(tr);
  });
  $('#table-count').textContent=`${integer.format(filtered.length)} resultados`;
  $('#history-page').textContent=filtered.length?`${page*50+1}–${Math.min((page+1)*50,filtered.length)} de ${integer.format(filtered.length)}`:'Sin resultados';
  $('#history-prev').disabled=page===0;$('#history-next').disabled=(page+1)*50>=filtered.length;
 }
 ['#history-year','#history-line','#history-outcome','#history-sort'].forEach(selector=>$(selector).addEventListener('change',filter));$('#history-search').addEventListener('input',filter);
 $('#history-prev').addEventListener('click',()=>{page--;renderTable();});$('#history-next').addEventListener('click',()=>{page++;renderTable();});

 const redraw=()=>{if(!$('#panel-history').hidden){renderScatter(filtered.filter(r=>r.status==='concedida'&&r.score!==null&&r.granted_amount!==null));renderHistoricalDistribution(filtered,showProject);}};
 window.addEventListener('resize',redraw);document.addEventListener('paid:history-visible',redraw);
 filter();
 return projects;
}

function showProject(row){
 if(isLegacyRecord(row))return showLegacyProject(row);
 document.querySelector('#project-detail')?.remove();
 const dialog=document.createElement('dialog');dialog.id='project-detail';dialog.className='project-detail';dialog.setAttribute('aria-labelledby','project-detail-title');
 const close=document.createElement('button');close.type='button';close.className='dialog-close';close.textContent='×';close.setAttribute('aria-label','Cerrar ficha');close.addEventListener('click',()=>dialog.close());
 const tag=document.createElement('p');tag.className='eyebrow';tag.textContent='Ficha de proyecto · '+row.year+' · '+row.line;
 const title=document.createElement('h2');title.id='project-detail-title';title.textContent=row.project_title||row.beneficiary;
 const company=document.createElement('p');company.className='project-company';company.textContent=row.project_title?row.beneficiary:row.case_id;
 const money=value=>value===null||value===undefined||value===''?'No publicado':eur.format(Number(value));
 const published=value=>value===null||value===undefined||value===''?'No publicado':String(value);
 const fields=[['Convocatoria',row.year+' · '+row.line],['Expediente',row.case_id],['Entidad solicitante',row.beneficiary],['NIF',published(row.nif)],['Título del proyecto',published(row.project_title)],['Provincia del proyecto',published(row.province)],['Municipio del proyecto',published(row.municipality)],['Inicio publicado en FEDER',published(row.project_start_dates)],['Fin publicado en FEDER',published(row.project_end_dates)],['Resultado',labels[row.status]||row.status],['Motivo publicado',published(row.reason)],['Puntuación publicada',published(row.score)],['Inversión '+(row.reference_basis==='solicitada'?'solicitada':row.reference_basis==='evaluada_preevaluacion'?'evaluada en preevaluación':'de referencia'),money(row.investment_reference)],['Inversión subvencionable',money(row.eligible_budget)],['Ayuda concedida consolidada',row.status==='concedida'?money(row.granted_amount):'Sin concesión'],['Ayuda pendiente en lista de espera',Number(row.waiting_amount)>0?money(row.waiting_amount):'Sin importe pendiente publicado'],['Ayuda concedida · minimis',row.status==='concedida'?money(row.minimis_amount):'Sin concesión'],['Ayuda concedida · RGEC',row.status==='concedida'?money(row.rgec_amount):'Sin concesión'],['Sector',sectorLabels[row.sector]||'Otros'],['Motivo de inclusión sectorial',row.sector==='otros'?'Sin clasificación sectorial específica':published(row.sector_basis)],['Confirmación del sector',row.sector_confidence==='indicio_denominacion'?'Indicio por denominación; pendiente de contraste':row.sector_source_url?'Actividad de la empresa contrastada en fuente pública':'Sin evidencia sectorial adicional'],['Observaciones',published(row.notes)]];
 const facts=document.createElement('dl');facts.className='project-facts';fields.forEach(([label,value])=>{const block=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;block.append(dt,dd);facts.append(block);});
 dialog.append(close,tag,title,company);
 if(row.project_description){const h=document.createElement('h3');h.textContent='Actuaciones del proyecto';const description=document.createElement('p');description.className='project-description';description.textContent=row.project_description;dialog.append(h,description);}
 dialog.append(facts);
 if(row.enrichment){renderEnrichment(dialog,row.enrichment);}
 if(row.events?.length){const h=document.createElement('h3');h.textContent='Detalle por resolución';dialog.append(h);const scroll=document.createElement('div');scroll.className='table-scroll';const table=document.createElement('table');table.className='project-events';const thead=document.createElement('thead'),header=document.createElement('tr');['Resultado','Puntos','Inversión subvencionable','Minimis','RGEC','Ayuda / posible ayuda','Documento'].forEach(text=>{const th=document.createElement('th');th.textContent=text;header.append(th);});thead.append(header);table.append(thead);const body=document.createElement('tbody');row.events.forEach(event=>{const tr=document.createElement('tr');[labels[event.status]||event.status,published(event.score),money(event.eligible_budget),money(event.minimis_amount),money(event.rgec_amount),money(event.amount)].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});const td=document.createElement('td');td.append(link(event.source_url,'PDF · p. '+event.source_page));tr.append(td);body.append(tr);});table.append(body);scroll.append(table);dialog.append(scroll);}
 const h=document.createElement('h3');h.textContent='Resoluciones y fuentes';dialog.append(h);
 const list=document.createElement('ul');const refs=row.source_refs?.length?row.source_refs:[{url:row.source_url,page:row.source_page,status:row.status}];
 refs.forEach(ref=>{const li=document.createElement('li');li.append(link(ref.url,`${labels[ref.status]||ref.status||'Resolución'} · página ${ref.page||'—'}`));if(ref.amount!==null&&ref.amount!==undefined)li.append(document.createTextNode(' · '+money(ref.amount)));list.append(li);});
 if(row.sector_source_url){const li=document.createElement('li');li.append(link(row.sector_source_url,'Evidencia de la actividad de la empresa'));list.append(li);}dialog.append(list);
 const note=document.createElement('p');note.className='small muted';note.textContent='El estado y la ayuda concedida consolidan las resoluciones disponibles. El desglose por resolución distingue ayudas concedidas y posibles ayudas en espera; los importes de distintas fases no se suman automáticamente. Los campos no publicados no se deducen del domicilio ni de la actividad de la empresa.';dialog.append(note);
 document.body.append(dialog);dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.showModal();
}


function renderEnrichment(dialog,enrichment,legacy=false){
 const operations=(rows,related)=>{for(const op of rows){const details=document.createElement('details');details.className='project-operation';const summary=document.createElement('summary');summary.textContent=`${op.year} · ${op.operation_code}${op.project_code?' · '+op.project_code:''} · ${op.operation_name}`;details.append(summary);const p=document.createElement('p');p.className='project-description';p.textContent=op.description||'Descripción no publicada';details.append(p);const facts=document.createElement('p');facts.className='small muted';facts.textContent=[op.municipality,op.province,op.start_date&&'Inicio: '+op.start_date,op.end_date&&'Fin: '+op.end_date,op.intervention].filter(Boolean).join(' · ');details.append(facts);const cost=document.createElement('p');cost.className='small';cost.textContent='Coste de la operación FEDER: '+(op.feder_operation_cost===null?'No publicado':eur.format(op.feder_operation_cost))+' · Cofinanciación UE: '+op.eu_cofinancing_percent+' %. Este importe se conserva separado de la inversión y de la ayuda PAIP.';details.append(cost);if(op.indicators?.length){const list=document.createElement('ul');op.indicators.forEach(indicator=>{const li=document.createElement('li');li.textContent=`${indicator.name} · Objetivo: ${indicator.target??'No publicado'} ${indicator.unit||''} · Logro declarado en FEDER: ${indicator.reported_achievement??'No publicado'}`;list.append(li);});details.append(list);}if(op.source_warning){const warning=document.createElement('p');warning.className='small muted';warning.textContent=op.source_warning;details.append(warning);}details.append(link(op.source_url,'Fuente oficial FEDER ↗'));dialog.append(details);}};
 if(enrichment.project_operations?.length){const h=document.createElement('h3');h.textContent='Detalle FEDER vinculado al proyecto';const note=document.createElement('p');note.className='small muted';note.textContent=enrichment.match_method;dialog.append(h,note);operations(enrichment.project_operations,false);}
 if(enrichment.identity_sources?.length){const p=document.createElement('p');p.className='small';p.append(link(enrichment.identity_sources[0],'Fuente del NIF de la entidad ↗'));dialog.append(p);}
 if(enrichment.related_company_operations?.length){const h=document.createElement('h3');h.textContent=legacy?'Operaciones publicadas':'Otras actuaciones de la empresa';const note=document.createElement('p');note.className='small muted';note.textContent=legacy?'Los costes de estas operaciones no se convierten en ayudas concedidas PAIP.':'Referencias complementarias. Estas actuaciones no se atribuyen al proyecto de esta solicitud y no se suman a su ayuda.';dialog.append(h,note);operations([...enrichment.related_company_operations].sort((a,b)=>b.year-a.year),true);}
}


function showLegacyProject(row){
 document.querySelector('#project-detail')?.remove();
 const dialog=document.createElement('dialog');dialog.id='project-detail';dialog.className='project-detail';dialog.setAttribute('aria-labelledby','project-detail-title');
 const close=document.createElement('button');close.type='button';close.className='dialog-close';close.textContent='×';close.setAttribute('aria-label','Cerrar ficha');close.onclick=()=>dialog.close();
 const tag=document.createElement('p');tag.className='eyebrow';tag.textContent='Operación FEDER · '+row.year;
 const title=document.createElement('h2');title.id='project-detail-title';title.textContent=row.beneficiary;
 const description=document.createElement('p');description.className='project-description';description.textContent=row.project_description||'Descripción no publicada';
 const published=value=>value===null||value===undefined||value===''?'No publicado':String(value);
 const fields=[['Tipo de registro','Operación FEDER · antecedente PAIP'],['Identificador de operación',row.operation_code],['Provincia',published(row.province)],['Municipio',published(row.municipality)],['Inicio publicado',published(row.project_start_dates)],['Fin publicado',published(row.project_end_dates)],['Coste de la operación FEDER',row.feder_operation_cost===null?'No publicado':eur.format(row.feder_operation_cost)],['Cofinanciación UE',published(row.eu_cofinancing_percent)+' %'],['Ayuda PAIP concedida','No publicada en este listado'],['Puntuación PAIP','No publicada en este listado'],['Sector',sectorLabels[row.sector]||'Otros'],['Clasificación sectorial',published(row.sector_basis)]];
 const facts=document.createElement('dl');facts.className='project-facts';fields.forEach(([label,value])=>{const block=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;block.append(dt,dd);facts.append(block);});
 const note=document.createElement('p');note.className='small muted';note.textContent=row.notes;
 const sources=document.createElement('ul');[...new Set([row.source_url,...(row.sector_evidence_urls||[])])].forEach((url,i)=>{const li=document.createElement('li');li.append(link(url,i===0?'Listado oficial FEDER · página '+row.source_page:'Evidencia sectorial'));sources.append(li);});
 dialog.append(close,tag,title,description,facts,note,sources);document.body.append(dialog);dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.showModal();
}
