import { download } from './paid-aragon-history.js?v=20261120-3';
const number=(value,label)=>{if(String(value).trim()===''||!Number.isFinite(Number(value)))throw Error(`Valor no válido: ${label}`);return Number(value);};
export function forecast(rows,settings){
 if(rows.length!==4||new Set(rows.map(r=>Number(r.anio))).size!==4||rows.some(r=>![2023,2024,2025,2026].includes(Number(r.anio))))throw Error('La base debe contener una fila para cada año TDI 2023–2026.');
 if(settings.length!==1||Number(settings[0].ejercicio)!==2027)throw Error('Se requiere un escenario único para 2027.');
 const growth=number(settings[0].incremento_demanda_pct,'incremento'),budget=number(settings[0].credito_inicial_eur,'crédito');
 if(growth<0||growth>100||budget<0)throw Error('Revisa el incremento (0–100 %) y el crédito (≥0).');
 const basis=rows.map(r=>({...r,year:Number(r.anio),count:number(r.solicitudes,'solicitudes'),weight:number(r.peso,'peso')})).sort((a,b)=>a.year-b.year);
 if(basis.some(r=>r.weight<0||r.count<0||!Number.isInteger(r.count)))throw Error('Pesos no negativos y solicitudes enteras no negativas.');
 const total=basis.reduce((s,r)=>s+r.weight,0);if(total<=0)throw Error('Al menos un peso debe ser positivo.');
 const average=basis.reduce((s,r)=>s+r.count*r.weight,0)/total;
 return {basis:basis.map(r=>({...r,share:r.weight/total})),average,growth,budget,estimate:average*(1+growth/100),demand:Math.round(average*(1+growth/100))};
}
export async function initForecast(){
 const $=s=>document.querySelector(s),n=new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}),euro=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 try{
  const paths=['demanda_historica.csv','escenario_2027.csv'];
  const texts=await Promise.all(paths.map(async name=>{const r=await fetch('../data/paid-aragon/'+name,{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar '+name);return r.text();}));
  const result=forecast(...texts.map(text=>window.CBIData.parse(text,',').records));
  $('#forecast-kpis').replaceChildren();
  [[n.format(result.demand),'Solicitudes previstas 2027','Estimación de demanda presentada'],['+'+n.format(result.growth)+' %','Incremento supuesto','Sobre la media ponderada'],[euro.format(result.budget),'Crédito del escenario','Dotación inicial; no demanda monetaria']].forEach(([value,label,note])=>{const card=document.createElement('article');for(const[tag,text]of[['span',label],['strong',value],['small',note]]){const el=document.createElement(tag);el.textContent=text;card.append(el);}$('#forecast-kpis').append(card);});
  $('#forecast-badge').textContent='Histórico + '+n.format(result.growth)+' %';
  const active=window.CBIActiveDatasets||{};
  $('#forecast-status').textContent=Object.keys(active).some(k=>k.startsWith('paip-'))?'Versión CSV compartida activa · supuestos publicados en CBI.':'CSV original del repositorio · editable y publicable desde Datos y muestras.';
  $('#forecast-method').textContent=`Media ponderada: ${n.format(result.average)} solicitudes. Pesos ${result.basis.map(r=>r.year+': '+n.format(r.share*100)+' %').join(' · ')}. Incremento ${n.format(result.growth)} %: ${n.format(result.estimate)} → ${result.demand} solicitudes (redondeo final). El incremento se aplica a la media, no a 2026.`;
  const chart=$('#demand-chart');chart.replaceChildren();const max=Math.max(1,result.demand,...result.basis.map(r=>r.count));
  [...result.basis,{year:2027,count:result.demand}].forEach(r=>{const col=document.createElement('div');col.className='demand-column'+(r.year===2027?' projected':'');const value=document.createElement('strong');value.textContent=n.format(r.count);const bar=document.createElement('i');bar.style.height=(r.count/max*160)+'px';const label=document.createElement('small');label.textContent=r.year+(r.year===2027?' · prev.':'');col.append(value,bar,label);chart.append(col);});
  const body=$('#forecast-basis');body.replaceChildren();result.basis.forEach(r=>{const tr=document.createElement('tr');[r.year,n.format(r.count),n.format(r.share*100)+' %',n.format(r.count*r.share)].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});body.append(tr);});
  $('#export-forecast').addEventListener('click',()=>download('paip-escenario-2027.csv',texts[1]),{once:true});
 }catch(error){$('#forecast-status').textContent='Previsión no disponible: '+error.message;$('#forecast-kpis').replaceChildren();$('#export-forecast').disabled=true;}
}
