// Complete synthetic applications. Historical references are calibration, never real 2027 applications.
const maxima={2023:415,2024:425,2025:425,2026:425};
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.floor((a.length-1)/2)]:null;};
export function random(seed=20261120){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function generateApplications(projects,forecast,{seed=20261120}={}){
 if(!Number.isInteger(forecast.demand)||forecast.demand<1||forecast.demand>5000)throw Error('La simulación admite entre 1 y 5.000 solicitudes.');
 const rng=random(seed);let missing=0;
 const pools=forecast.basis.map(b=>{
  const records=projects.filter(r=>r.year===b.year&&r.line==='TDI-FEDER'&&r.status!=='anulada');
  if(!records.length)throw Error('Falta la base histórica '+b.year);
  const amount=r=>Number(r.granted_amount||0)+Number(r.waiting_amount||0),typical=median(records.map(amount).filter(n=>n>0));
  return {...b,rows:records.map(r=>{const eligible=['concedida','lista_espera'].includes(r.status)&&r.score!==null&&r.score!==''&&Number.isFinite(Number(r.score)),imputed=amount(r)<=0;if(eligible&&imputed)missing++;return{eligible,score:eligible?Math.round(Math.min(425,Math.max(0,Number(r.score)/maxima[b.year]*425))*100)/100:0,aid:Math.max(4000,Math.min(500000,amount(r)>0?amount(r):typical||4000)),source:r.case_id,year:r.year,sourceStatus:r.status,sourceUrl:r.source_url||'',imputed};})};
 });
 const rows=Array.from({length:forecast.demand},(_,i)=>{
  const u=rng();let cumulative=0,pool=pools.at(-1);for(const p of pools){cumulative+=p.share;if(u<cumulative){pool=p;break;}}
  return {...pool.rows[Math.floor(rng()*pool.rows.length)],id:'SIM-2027-'+String(i+1).padStart(4,'0'),name:'Solicitud simulada '+(i+1),arrival:i+1};
 });
 return {rows,missing};
}
export const simulationHeaders=['id','ejercicio','tipo','nombre','admisible','puntuacion','ayuda_solicitada_eur','orden_desempate','convocatoria_origen','expediente_origen','estado_origen','importe_imputado','fuente_url'];
export function applicationRecords(rows){return rows.map(r=>({id:r.id,ejercicio:2027,tipo:'simulada',nombre:r.name,admisible:r.eligible?'si':'no',puntuacion:r.score,ayuda_solicitada_eur:r.aid,orden_desempate:r.arrival,convocatoria_origen:r.year,expediente_origen:r.source,estado_origen:r.sourceStatus,importe_imputado:r.imputed?'si':'no',fuente_url:r.sourceUrl}));}
export function parseApplications(records){
 if(!records.length||records.length>5000)throw Error('El CSV 2027 debe contener entre 1 y 5.000 solicitudes.');
 const ids=new Set(),orders=new Set();
 return records.map((r,i)=>{
  if(!r.id||ids.has(r.id))throw Error('Identificador vacío o repetido en el CSV 2027, fila '+(i+1));ids.add(r.id);
  if(Number(r.ejercicio)!==2027||r.tipo!=='simulada'||!['si','no'].includes(r.admisible))throw Error('Revisa ejercicio, tipo y admisibilidad del CSV 2027, fila '+(i+1));
  const eligible=r.admisible==='si',score=Number(r.puntuacion),aid=Number(r.ayuda_solicitada_eur),arrival=Number(r.orden_desempate);
  if(String(r.puntuacion).trim()===''||!Number.isFinite(score)||score<0||score>425||String(r.ayuda_solicitada_eur).trim()===''||!Number.isFinite(aid)||(eligible?(aid<4000||aid>500000):(aid!==0&&(aid<4000||aid>500000))))throw Error('Puntuación o ayuda inválida en el CSV 2027, fila '+(i+1));
  if(!Number.isInteger(arrival)||arrival<1||orders.has(arrival))throw Error('Orden de desempate vacío o repetido en el CSV 2027.');orders.add(arrival);
  return {id:r.id,name:r.nombre||r.id,eligible,score,aid,arrival,year:Number(r.convocatoria_origen)||null,source:r.expediente_origen||'',sourceStatus:r.estado_origen||'',sourceUrl:r.fuente_url||'',imputed:r.importe_imputado==='si'};
 });
}
export function allocateApplications(rows,budget){
 if(!Number.isFinite(budget)||budget<0)throw Error('Crédito no válido para repartir.');
 const ranked=rows.filter(r=>r.eligible&&r.aid>0).sort((a,b)=>b.score-a.score||a.arrival-b.arrival);
 let remaining=budget,last=null,stopped=false;const allocated=[];
 for(const row of ranked){const funded=!stopped&&row.aid<=remaining;if(funded){remaining-=row.aid;last=row.score;}else stopped=true;allocated.push({...row,funded,rank:allocated.length+1});}
 return {rows:allocated,cutoff:last,remaining,spent:budget-remaining,funded:allocated.filter(r=>r.funded).length,total:rows.length};
}
