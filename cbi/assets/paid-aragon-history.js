const $=selector=>document.querySelector(selector);
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const integer=new Intl.NumberFormat('es-ES');
const labels={concedida:'Concedida',lista_espera:'Lista de espera',no_elegible:'No elegible',desistida:'Desistida',anulada:'Anulada',renuncia_lista_espera:'Renuncia de espera'};
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
 let projects=[],summary,source='Supabase',sector='all',filtered=[],page=0;
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
  const response=await fetch('../data/paid-aragon/history.json');if(!response.ok)throw error;
  const fallback=await response.json();projects=fallback.projects;summary=fallback.summary;source='Copia CSV versionada (Supabase no disponible o pendiente de sincronizar)';
 }
 [...new Set(projects.map(r=>r.year))].sort((a,b)=>b-a).forEach(year=>{const option=document.createElement('option');option.value=year;option.textContent=year;$('#history-year').append(option);});
 const years=$('#history-years');
 [['','Todas las convocatorias'],...[...new Set(projects.map(r=>r.year))].sort((a,b)=>b-a).map(y=>[String(y),String(y)])].forEach(([value,label])=>{const button=document.createElement('button');button.textContent=label;button.dataset.year=value;button.setAttribute('aria-pressed',String(!value));button.addEventListener('click',()=>{$('#history-year').value=value;filter();});years.append(button);});
 const coverage=$('#coverage-content');
 summary.coverage.forEach(row=>{const p=document.createElement('p');p.textContent=`${row.year} · ${integer.format(row.projects)} expedientes · ${row.downloaded_sources} documentos descargados. ${row.note}`;coverage.append(p);});
 const issues=summary.source_reconciliations||[];
 issues.forEach(issue=>{const p=document.createElement('p');p.textContent=`Conciliación ${issue.year}, ${issue.line}: suma de filas ${eur.format(issue.extracted_total)}; total impreso ${eur.format(issue.published_total)}. ${issue.status}`;coverage.append(p);});
 function filter(){
  const year=$('#history-year').value,line=$('#history-line').value,status=$('#history-outcome').value,query=$('#history-search').value.trim().toLocaleLowerCase('es');
  filtered=projects.filter(row=>(!year||String(row.year)===year)&&(!line||row.line===line)&&(!status||row.status===status)&&(sector==='all'||row.sector===sector)&&(!query||`${row.beneficiary} ${row.case_id}`.toLocaleLowerCase('es').includes(query)));
  const mode=$('#history-sort').value;
  filtered.sort((a,b)=>mode==='aid'?(b.granted_amount??-1)-(a.granted_amount??-1):mode==='score'?(b.score??-1)-(a.score??-1):mode==='beneficiary'?a.beneficiary.localeCompare(b.beneficiary,'es'):b.year-a.year||a.case_id.localeCompare(b.case_id));
  page=0;render();
 }
 function render(){
  document.querySelectorAll('[data-year]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.year===$('#history-year').value)));
  const histogram=$('#history-histogram');histogram.replaceChildren();const scores=filtered.filter(r=>r.score!==null&&r.score!==''&&Number.isFinite(Number(r.score))).map(r=>Number(r.score));
  if(scores.length){const width=25,max=Math.max(25,Math.ceil(Math.max(...scores)/width)*width),bins=Array.from({length:max/width+1},(_,i)=>({from:i*width,count:0}));scores.forEach(v=>bins[Math.min(bins.length-1,Math.floor(v/width))].count++);const peak=Math.max(1,...bins.map(b=>b.count));bins.forEach(b=>{const bar=document.createElement('div');bar.className='bin';bar.style.height=Math.max(1,b.count/peak*210)+'px';bar.title=`${b.from}–${b.from+24} puntos: ${b.count} expedientes`;const label=document.createElement('small');label.textContent=b.from;bar.append(label);histogram.append(bar);});}else histogram.textContent='Sin puntuaciones publicadas para esta selección.';
  const granted=filtered.filter(r=>r.status==='concedida');
  const waiting=filtered.filter(r=>r.status==='lista_espera');
  $('#history-status').textContent=`${integer.format(filtered.length)} expedientes · ${source} · Fuentes revisadas a ${summary.as_of}.${filtered.some(r=>r.year===2021||r.year===2022)?' Consulta las pequeñas diferencias con los totales impresos en «Cobertura y fuentes».':''}`;
  const kpis=$('#history-kpis');kpis.replaceChildren();
  [[integer.format(filtered.length),'Expedientes','Una fila por expediente y convocatoria'],[integer.format(granted.length),'Concesiones',`${integer.format(waiting.length)} en lista de espera`],[eur.format(sum(granted,'granted_amount')),'Ayuda concedida','Sin sumar importes posibles de espera'],[integer.format(new Set(filtered.map(r=>r.beneficiary.toUpperCase().replaceAll(/[.,]/g,''))).size),'Empresas publicadas','Según denominación; sin unificación por NIF']].forEach(([value,label,note])=>{const div=document.createElement('div');div.className='kpi';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;const p=document.createElement('p');p.textContent=note;div.append(small,strong,p);kpis.append(div);});
  renderBars($('#year-chart'),[...new Set(filtered.map(r=>r.year))].sort().map(year=>({label:String(year),value:sum(granted.filter(r=>r.year===year),'granted_amount')})),true);
  renderBars($('#outcome-chart'),Object.keys(labels).map(status=>({label:labels[status],value:filtered.filter(r=>r.status===status).length,color:status==='concedida'?'#39846a':status==='lista_espera'?'#b98b50':'#91a4b3'})),false);
  renderScatter(granted.filter(r=>r.score!==null&&r.granted_amount!==null));renderTable();$('#export-history').disabled=!filtered.length;
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
   const dot=element('circle',{cx:left+Number(row.score)/maxX*plot,cy:245-Number(row.granted_amount)/maxY*208,r:row.sector==='otros'?3:5,fill:colors[row.sector]||colors.otros,opacity:row.sector==='otros'?.45:.9});
   const title=document.createElementNS(ns,'title');title.textContent=`${row.year} · ${row.beneficiary} · ${row.score} puntos · ${eur.format(row.granted_amount)}`;dot.append(title);
  });container.append(svg);
 }
 function renderTable(){
  const body=$('#history-rows');body.replaceChildren();const visible=filtered.slice(page*50,(page+1)*50);
  visible.forEach(row=>{
   const tr=document.createElement('tr');tr.className=`sector-${row.sector}`;
   const td=()=>{const c=document.createElement('td');tr.append(c);return c;};
   let c=td();c.textContent=row.year;const line=document.createElement('small');line.textContent=row.line;c.append(line);
   c=td();const title=document.createElement('strong');title.textContent=row.beneficiary;const code=document.createElement('small');code.textContent=row.case_id;c.append(title,code);
   if(row.notes){const note=document.createElement('small');note.textContent=row.notes;c.append(note);}
   c=td();const badge=document.createElement('span');badge.className=`pill ${row.sector}`;badge.textContent=sectorLabels[row.sector]||'Otros';badge.title=row.sector_basis||'';c.append(badge);
   if(row.sector_confidence==='indicio_denominacion'){const note=document.createElement('small');note.textContent='Indicio por denominación';c.append(note);}
   if(row.sector_source_url&&row.sector!=='otros'){const note=document.createElement('small');note.append(link(row.sector_source_url,'Evidencia sectorial ↗'));c.append(note);}
   c=td();const status=document.createElement('span');status.className=`pill ${row.status}`;status.textContent=labels[row.status]||row.status;c.append(status);
   if(row.waiting_amount>0){const note=document.createElement('small');note.textContent=`Parte pendiente: ${eur.format(row.waiting_amount)}`;c.append(note);}
   td().textContent=row.score===null?'—':Number(row.score).toLocaleString('es-ES');
   c=td();c.textContent=row.status==='concedida'?(row.granted_amount===null?'Pendiente de validar':eur.format(row.granted_amount)):'—';
   if(row.extraction==='ocr_vision'){const note=document.createElement('small');note.textContent='Fuente escaneada / OCR';c.append(note);}
   c=td();c.append(link(row.source_url,`PDF · p. ${row.source_page} ↗`));
   if(row.source_refs?.length>1){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${row.source_refs.length} eventos`;details.append(summary);row.source_refs.forEach(ref=>{const p=document.createElement('p');p.append(link(ref.url,`${labels[ref.status]||ref.status} · p. ${ref.page}`));details.append(p);});c.append(details);}
   body.append(tr);
  });
  $('#table-count').textContent=`${integer.format(filtered.length)} resultados`;
  $('#history-page').textContent=filtered.length?`${page*50+1}–${Math.min((page+1)*50,filtered.length)} de ${integer.format(filtered.length)}`:'Sin resultados';
  $('#history-prev').disabled=page===0;$('#history-next').disabled=(page+1)*50>=filtered.length;
 }
 document.querySelectorAll('[data-sector]').forEach(button=>button.addEventListener('click',()=>{sector=button.dataset.sector;document.querySelectorAll('[data-sector]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));
 ['#history-year','#history-line','#history-outcome','#history-sort'].forEach(selector=>$(selector).addEventListener('change',filter));$('#history-search').addEventListener('input',filter);
 $('#history-prev').addEventListener('click',()=>{page--;renderTable();});$('#history-next').addEventListener('click',()=>{page++;renderTable();});
 $('#export-history').addEventListener('click',()=>download('paip-historico-seleccion.csv',csvText(filtered.map(({edition_id,created_at,...row})=>row))));
 const redraw=()=>{if(!$('#panel-history').hidden)renderScatter(filtered.filter(r=>r.status==='concedida'&&r.score!==null&&r.granted_amount!==null));};
 window.addEventListener('resize',redraw);document.addEventListener('paid:history-visible',redraw);
 filter();
}
