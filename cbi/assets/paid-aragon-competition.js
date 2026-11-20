// Historical bootstrap. Normalised scores are an explicit modelling assumption, not reevaluated merits.
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.floor((a.length-1)/2)]:null;};
export function createCompetition(projects,forecast,{runs=1000,seed=20261120}={}){
 if(!Number.isInteger(forecast.demand)||forecast.demand<1||forecast.demand>5000)throw Error('La simulación admite entre 1 y 5.000 solicitudes previstas.');
 const rng=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const maxima={2023:415,2024:425,2025:425,2026:425};
 let missing=0;
 const pools=forecast.basis.map(b=>{
  const records=projects.filter(r=>r.year===b.year&&r.line==='TDI-FEDER'&&r.status!=='anulada');
  if(!records.length)throw Error('Falta la base histórica '+b.year);
  const amount=r=>Number(r.granted_amount||0)+Number(r.waiting_amount||0);
  const typical=median(records.map(amount).filter(n=>n>0));
  const rows=records.map(r=>{const eligible=['concedida','lista_espera'].includes(r.status)&&r.score!==null&&r.score!==''&&Number.isFinite(Number(r.score));if(eligible&&amount(r)<=0)missing++;return{eligible,score:eligible?Math.min(425,Math.max(0,Number(r.score)/maxima[b.year]*425)):0,aid:eligible?Math.min(500000,amount(r)>0?amount(r):typical||0):0,source:r.case_id,year:r.year};});
  return {...b,rows};
 });
 const populations=[];
 for(let k=0;k<runs;k++){
  const rows=[];
  for(let i=0;i<forecast.demand-1;i++){
   const u=rng();let cumulative=0,pool=pools.at(-1);for(const p of pools){cumulative+=p.share;if(u<cumulative){pool=p;break;}}
   const source=pool.rows[Math.floor(rng()*pool.rows.length)];if(source.eligible&&source.aid>0)rows.push({...source,sampleIndex:i,arrival:rng()});
  }
  rows.sort((a,b)=>b.score-a.score||a.arrival-b.arrival);populations.push({rows,ownArrival:rng()});
 }
 return {populations,budget:forecast.budget,demand:forecast.demand,missing,runs};
}
export function withManualCompetitors(base,manual){
 if(manual.length>Math.min(50,base.demand-1))throw Error('No caben más competidoras dentro de la demanda prevista.');
 if(manual.some(r=>!Number.isFinite(r.score)||r.score<0||r.score>425||!Number.isFinite(r.aid)||r.aid<4000||r.aid>500000))throw Error('Puntuación entre 0 y 425; ayuda entre 4.000 y 500.000 €.');
 const unit=seed=>{let x=Math.imul(seed^seed>>>16,0x45d9f3b);x=Math.imul(x^x>>>16,0x45d9f3b);return((x^x>>>16)>>>0)/4294967296;};
 return {...base,populations:base.populations.map((population,k)=>({...population,rows:[...population.rows.filter(r=>r.sampleIndex<base.demand-1-manual.length),...manual.map((r,j)=>({...r,manual:true,source:r.name,arrival:unit((k+1)*1299709+(r.id||j+1)*104729)}))].sort((a,b)=>b.score-a.score||a.arrival-b.arrival)}))};
}
export function simulateCompetition(model,own){
 if(!Number.isFinite(own.aid)||own.aid<=0||!Number.isFinite(own.score))return null;
 let funded=0;const ranks=[],cutoffs=[];
 for(const population of model.populations){
  const before=population.rows.filter(r=>r.score>own.score||(r.score===own.score&&r.arrival<population.ownArrival));
  const spent=before.reduce((s,r)=>s+r.aid,0);if(!own.failed&&spent+own.aid<=model.budget)funded++;
  ranks.push(before.length+1);
  let remaining=model.budget,last=null;
  const all=[...population.rows];if(!own.failed)all.splice(before.length,0,{score:own.score,aid:own.aid,arrival:population.ownArrival});
  for(const row of all){if(row.aid>remaining)break;remaining-=row.aid;last=row.score;}
  if(last!==null)cutoffs.push(last);
 }
 return {frequency:funded/model.runs*100,funded,runs:model.runs,rank:median(ranks),rankP5:[...ranks].sort((a,b)=>a-b)[Math.floor((ranks.length-1)*.05)],rankP95:[...ranks].sort((a,b)=>a-b)[Math.floor((ranks.length-1)*.95)],cutoff:median(cutoffs)};
}
let model,baseModel,latest,timer,forecastData,manual=[],manualId=0;
const $=s=>document.querySelector(s),n=new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});
export function initCompetition(projects,forecast){
 try{forecastData=forecast;baseModel=createCompetition(projects,forecast);model=withManualCompetitors(baseModel,manual);$('#competition-population').textContent=forecast.demand+' solicitudes previstas';$('#simulation-method').textContent=`Demanda: ${n.format(forecast.average)} × (1 + ${n.format(forecast.growth)} %) = ${forecast.demand} solicitudes, incluido nuestro proyecto. Pesos: ${forecast.basis.map(r=>r.year+' '+n.format(r.share*100)+' %').join(' · ')}. Muestreo con reposición de expedientes TDI-FEDER; conserva la proporción histórica de no elegibles, desistidas y renuncias. Ayuda de referencia: concedida más pendiente de lista de espera, limitada a 500.000 €. ${model.missing} importes ausentes se sustituyen por la mediana del año. Máximos de baremo: 415 (2023), 425 (2024–2027). Semilla 20261120.`;}catch(error){$('#simulation-status').textContent=error.message;}
}
export function updateCompetition(result){latest=result;clearTimeout(timer);timer=setTimeout(render,120);}
function svgFor(container,label,height=290){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');const width=Math.max(280,container.clientWidth||750);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',label);container.replaceChildren(svg);return{width,svg,el:(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;}};}
function render(){
 if(!model||!latest)return;
 const own={score:latest.score,aid:latest.aid,failed:latest.failed.length>0},result=simulateCompetition(model,own),rows=model.populations[0].rows;
 $('#competition-own').textContent=n.format(own.score);$('#competition-mean').textContent=rows.length?n.format(rows.reduce((s,r)=>s+r.score,0)/rows.length):'—';$('#competition-cutoff').textContent=result?.cutoff===null||!result?'—':n.format(result.cutoff);
 $('#approval-rate').textContent=result?n.format(result.frequency)+' %':'—';$('#probability-ring').style.setProperty('--probability',result?.frequency||0);$('#probability-ring').style.setProperty('--ring-color',!result?'#a26207':result.frequency>=80?'#18775b':result.frequency>=40?'#a26207':'#b72d3a');
 $('#simulation-status').textContent=!result?'Completa el presupuesto para simular.':own.failed?'Revisar incumplimientos de elegibilidad.':`${result.funded} de ${result.runs} escenarios financiados${latest.pending.length?' · condicionado a confirmar elegibilidad':''}.`;
 $('#simulation-rank').textContent=result?n.format(result.rank):'—';$('#simulation-rank-note').textContent=result?`Posición P5–P95: ${result.rankP5}–${result.rankP95}`:'';
 const chart=svgFor($('#competition-distribution'),'Distribución de puntos, nuestro proyecto y última financiada');const left=26,right=chart.width-20,plot=right-left,x=v=>left+Math.max(0,Math.min(425,v))/425*plot;
 const cutoff=result?.cutoff;if(cutoff!==null&&cutoff!==undefined)chart.el('rect',{x:x(cutoff),y:18,width:Math.max(0,right-x(cutoff)),height:220,fill:'#e9f6f1'});
 const bins=Array(17).fill(0);rows.forEach(r=>bins[Math.min(16,Math.floor(r.score/25))]++);const peak=Math.max(1,...bins);
 bins.forEach((count,i)=>{const height=count/peak*165;const bar=chart.el('rect',{x:left+i*plot/17+2,y:238-height,width:Math.max(1,plot/17-4),height,fill:'#c9dbe8',rx:2});const title=document.createElementNS(chart.svg.namespaceURI,'title');title.textContent=`${i*25}–${i===16?425:i*25+24} puntos: ${count} competidoras`;bar.append(title);});
 for(const tick of [0,100,200,300,425])chart.el('text',{x:x(tick),y:262,'text-anchor':'middle',fill:'#687483','font-size':11},String(tick));
 for(const[value,label,color,y]of [[cutoff,'Última financiada','#9a6a0a',22],[own.score,'Nuestro proyecto','#001426',52]])if(value!==null&&value!==undefined){const point=x(value);chart.el('line',{x1:point,x2:point,y1:18,y2:238,stroke:color,'stroke-width':2});const box=Math.max(left,Math.min(right-115,point-57));chart.el('rect',{x:box,y,width:115,height:23,rx:3,fill:color});chart.el('text',{x:box+57,y:y+15,'text-anchor':'middle',fill:'#fff','font-size':10},label);}
 const scatter=svgFor($('#competition-scatter'),'Puntuación y ayuda de las competidoras simuladas y nuestro proyecto');const l=66,r=scatter.width-20,top=18,bottom=246,maxAid=Math.max(1,own.aid||0,...rows.map(row=>row.aid)),sx=v=>l+v/425*(r-l),sy=v=>bottom-v/maxAid*(bottom-top);
 for(let i=0;i<=4;i++){const y=sy(maxAid*i/4);scatter.el('line',{x1:l,x2:r,y1:y,y2:y,stroke:'#e5eaf0'});scatter.el('text',{x:l-7,y:y+4,'text-anchor':'end',fill:'#687483','font-size':10},n.format(maxAid*i/4/1000)+' k€');}
 for(const tick of [0,100,200,300,425])scatter.el('text',{x:sx(tick),y:268,'text-anchor':'middle',fill:'#687483','font-size':10},String(tick));
 rows.forEach(row=>{const dot=scatter.el('circle',{cx:sx(row.score),cy:sy(row.aid),r:row.manual?6:4.5,fill:row.manual?'#735b9b':'#8eb6dc',opacity:row.manual?.95:.62,stroke:'#fff','stroke-width':1});const title=document.createElementNS(scatter.svg.namespaceURI,'title');title.textContent=`${row.manual?'Competidora conocida':'Simulada desde'} ${row.source} · ${n.format(row.score)} puntos · ${n.format(row.aid)} €`;dot.append(title);});
 if(own.aid!==null){scatter.el('circle',{cx:sx(own.score),cy:sy(own.aid),r:9,fill:'#001426',stroke:'#fff','stroke-width':3});}
}
if(typeof window!=='undefined')window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(render,100);});
if(typeof document!=='undefined')document.addEventListener('paid:request-visible',()=>{clearTimeout(timer);timer=setTimeout(render,0);});

function refreshManual(){
 if(!baseModel)return;model=withManualCompetitors(baseModel,manual);$('#competition-population').textContent=forecastData.demand+' solicitudes · '+manual.length+' conocidas';
 const list=$('#manual-competitor-list');list.replaceChildren();manual.forEach(row=>{const item=document.createElement('div');item.className='manual-competitor';const caption=document.createElement('div'),strong=document.createElement('strong'),detail=document.createElement('small');strong.textContent=row.name;detail.textContent=n.format(row.score)+' puntos · '+n.format(row.aid)+' €';caption.append(strong,detail);const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Quitar '+row.name);remove.onclick=()=>{manual=manual.filter(r=>r.id!==row.id);refreshManual();};item.append(caption,remove);list.append(item);});render();
}
if(typeof document!=='undefined')$('#manual-competitor-form').addEventListener('submit',event=>{
 event.preventDefault();const status=$('#manual-error');status.textContent='';
 try{if(!baseModel)throw Error('Espera a que se cargue la simulación.');const score=Number($('#manual-score').value),aid=window.CBINumbers.parse($('#manual-aid').value);if($('#manual-score').value.trim()===''||$('#manual-aid').value.trim()==='')throw Error('Completa puntuación y ayuda.');const candidate={id:manualId+1,name:$('#manual-name').value.trim()||'Competidora '+(manualId+1),score,aid};withManualCompetitors(baseModel,[...manual,candidate]);manualId++;manual.push(candidate);$('#manual-name').value='';refreshManual();}catch(error){status.textContent=error.message;}
});
