const ns='http://www.w3.org/2000/svg';
export function renderScoreCircle(rules,score){
 const root=document.querySelector('#score-weight-track');
 if(!root.children.length){
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 300 300');svg.setAttribute('role','group');svg.setAttribute('aria-label','Reparto de los 425 puntos por criterio');
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const length=2*Math.PI*112,total=rules.max_score,colors=['#173e59','#476b85','#7390a5','#9eb2c1','#c5d3de'];let offset=0;
  rules.criteria.forEach((criterion,index)=>{
   const span=criterion.points/total*length;
   const start=(offset+1)/length*2*Math.PI-Math.PI/2,end=(offset+span-1)/length*2*Math.PI-Math.PI/2;
   const d=`M ${150+112*Math.cos(start)} ${150+112*Math.sin(start)} A 112 112 0 0 1 ${150+112*Math.cos(end)} ${150+112*Math.sin(end)}`;
   const arc=add('path',{d,fill:'none',stroke:colors[index%colors.length],'stroke-width':23,tabindex:0,role:'button','aria-label':`${criterion.id.toUpperCase()} · ${criterion.title}: ${criterion.points} puntos`});
   const title=document.createElementNS(ns,'title');title.textContent=arc.getAttribute('aria-label');arc.append(title);
   const inspect=()=>{document.querySelector('#score-weight-detail').textContent=criterion.title+' · '+criterion.points+' puntos de '+total;};arc.addEventListener('click',inspect);arc.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect();}});
   const angle=(offset+span/2)/length*2*Math.PI-Math.PI/2;add('text',{x:150+140*Math.cos(angle),y:154+140*Math.sin(angle),'text-anchor':'middle',fill:'#687483','font-size':11},criterion.id.toUpperCase());offset+=span;
  });
  add('text',{x:150,y:125,'text-anchor':'middle',fill:'#687483','font-size':10},'PUNTUACIÓN MÁXIMA');add('text',{x:150,y:163,'text-anchor':'middle',fill:'#001426','font-size':37,'font-weight':500},total);add('text',{x:150,y:190,'text-anchor':'middle',fill:'#687483','font-size':12,id:'score-circle-own'});
  root.append(svg);
 }
 document.querySelector('#score-circle-own').textContent='Nuestro proyecto: '+score;
}
