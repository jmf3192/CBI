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
 const $=s=>document.querySelector(s),n=new Intl.NumberFormat('es-ES'),euro=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 try{
  const texts=await Promise.all(['demanda_historica.csv','escenario_2027.csv'].map(async name=>{const r=await fetch('../data/paid-aragon/'+name,{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar '+name);return r.text();}));
  const result=forecast(...texts.map(text=>window.CBIData.parse(text,',').records));
  $('#forecast-kpis').replaceChildren();
  [[n.format(result.demand),'Solicitudes previstas 2027'],[euro.format(result.budget),'Crédito disponible']].forEach(([value,label])=>{const card=document.createElement('article'),caption=document.createElement('span'),strong=document.createElement('strong');caption.textContent=label;strong.textContent=value;card.append(caption,strong);$('#forecast-kpis').append(card);});
  return result;
 }catch(error){$('#status').hidden=false;$('#status').textContent='Previsión no disponible: '+error.message;return null;}
}
