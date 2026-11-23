const ns='http://www.w3.org/2000/svg';
function showCriterion(criterion,total,color,trigger){
 document.querySelector('#score-criterion-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='score-criterion-dialog';dialog.className='criterion-dialog';dialog.style.setProperty('--criterion-color',color);dialog.setAttribute('aria-labelledby','score-criterion-title');
 const close=document.createElement('button');close.type='button';close.className='dialog-close';close.textContent='×';close.setAttribute('aria-label','Cerrar criterio');close.onclick=()=>dialog.close();
 const points=document.createElement('p');points.className='criterion-dialog-points';points.textContent=`Criterio ${criterion.id.toUpperCase()} · ${criterion.points} puntos de ${total}`;
 const title=document.createElement('h2');title.id='score-criterion-title';title.textContent=criterion.title;
 const condition=document.createElement('p');condition.className='criterion-dialog-condition';condition.textContent=criterion.condition;
 const evidenceTitle=document.createElement('h3');evidenceTitle.textContent='Cómo acreditarlo';
 const evidence=document.createElement('p');evidence.textContent=criterion.evidence||'Revisar la documentación exigida por la convocatoria.';
 const source=document.createElement('a');source.href=criterion.source_url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='Consultar orden · página '+criterion.page;
 dialog.append(close,points,title,condition,evidenceTitle,evidence,source);document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();trigger.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.showModal();
}
export function renderScoreCircle(rules,score){
 const root=document.querySelector('#score-weight-track');
 if(!root.children.length){
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 300 300');svg.setAttribute('role','group');svg.setAttribute('aria-label','Reparto de los 425 puntos por criterio');
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const length=2*Math.PI*112,total=rules.max_score,colors=['#2563eb','#0d9488','#f59e0b','#e11d48','#7c3aed','#0284c7','#16a34a','#ea580c','#db2777','#4f46e5','#0891b2','#65a30d','#d97706','#c026d3','#059669'];let offset=0;
  rules.criteria.forEach((criterion,index)=>{
   const span=criterion.points/total*length;
   const start=(offset+1)/length*2*Math.PI-Math.PI/2,end=(offset+span-1)/length*2*Math.PI-Math.PI/2;
   const d=`M ${150+112*Math.cos(start)} ${150+112*Math.sin(start)} A 112 112 0 0 1 ${150+112*Math.cos(end)} ${150+112*Math.sin(end)}`;
   const color=colors[index%colors.length],arc=add('path',{d,fill:'none',stroke:color,'stroke-width':23,tabindex:0,role:'button','aria-haspopup':'dialog','aria-controls':'score-criterion-dialog','aria-label':`${criterion.id.toUpperCase()} · ${criterion.title}: ${criterion.points} puntos`});
   const title=document.createElementNS(ns,'title');title.textContent=arc.getAttribute('aria-label');arc.append(title);
   const inspect=()=>{document.querySelector('#score-weight-detail').textContent=criterion.title+' · '+criterion.points+' puntos de '+total;showCriterion(criterion,total,color,arc);};arc.addEventListener('click',inspect);arc.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect();}});
   const angle=(offset+span/2)/length*2*Math.PI-Math.PI/2,label=add('text',{x:150+140*Math.cos(angle),y:154+140*Math.sin(angle),'text-anchor':'middle',fill:'#42576a','font-size':11,'aria-hidden':'true'},criterion.id.toUpperCase());label.style.cursor='pointer';label.addEventListener('click',inspect);offset+=span;
  });
  add('text',{x:150,y:125,'text-anchor':'middle',fill:'#687483','font-size':10},'PUNTUACIÓN MÁXIMA');add('text',{x:150,y:163,'text-anchor':'middle',fill:'#001426','font-size':37,'font-weight':500},total);add('text',{x:150,y:190,'text-anchor':'middle',fill:'#687483','font-size':12,id:'score-circle-own'});
  root.append(svg);
 }
 document.querySelector('#score-circle-own').textContent='Nuestro proyecto: '+score;
}
