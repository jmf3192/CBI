const ns = 'http://www.w3.org/2000/svg';
const palette = { blue:'#638ca5', navy:'#193a54', green:'#39846a', orange:'#c8813c', gray:'#a8bac9' };
const n = new Intl.NumberFormat('es-ES', {maximumFractionDigits:1});
function element(name, attrs, text) {
  const node = document.createElementNS(ns,name);
  for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
  if (text != null) node.textContent = text;
  return node;
}
function chart(target, label, width, height) {
  const svg = element('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':label,class:'step-chart'});
  target.replaceChildren(svg);
  return svg;
}
function empty(target) {
  const p = document.createElement('p');
  p.className = 'small muted'; p.textContent = 'Sin datos para la selección.';
  target.replaceChildren(p);
}
export function histogram(target, scores, marks = []) {
  if (!scores.length) return empty(target);
  const width=640,height=236,x0=40,y0=198,plot=width-x0-15;
  const step=5, bins=Array.from({length:100/step},()=>0);
  for (const score of scores) bins[Math.max(0,Math.min(bins.length-1,Math.floor(score/step)))]++;
  const max=Math.max(...bins,1);
  const svg=chart(target,'Histograma de puntuaciones de 0 a 100',width,height);
  for(let i=0;i<=4;i++) {
    const y=y0-43*i;
    svg.append(element('line',{x1:x0,x2:width-15,y1:y,y2:y,class:'guide'}),element('text',{x:x0-6,y:y+4,'text-anchor':'end'},n.format(max*i/4)));
  }
  bins.forEach((count,i) => {
    const h=count/max*172;
    const rect=element('rect',{x:x0+i*plot/bins.length+2,y:y0-h,width:plot/bins.length-4,height:h,rx:2,fill:palette.blue});
    rect.append(element('title',{},(i*step)+'–'+((i+1)*step)+' puntos: '+count));
    svg.append(rect);
  });
  for(let i=0;i<=100;i+=10) svg.append(element('text',{x:x0+plot*i/100,y:219,'text-anchor':'middle'},i));
  marks.filter((m)=>Number.isFinite(m.value)).forEach(({value,label,color})=>{
    const x=x0+plot*value/100;
    const line=element('line',{x1:x,x2:x,y1:18,y2:y0,stroke:palette[color],class:'reference'});
    line.append(element('title',{},label+': '+n.format(value)));
    svg.append(line);
  });
}
export function scatter(target, entries) {
  if (!entries.length) return empty(target);
  const width=410,height=245,x0=52,y0=199,plot=width-x0-18;
  const max=Math.max(5e5,Math.ceil(Math.max(...entries.map((r)=>r.aid))/5e5)*5e5);
  const svg=chart(target,'Relación entre puntuación y ayuda en euros',width,height);
  for(let i=0;i<=4;i++) {
    const y=y0-i*41;
    svg.append(element('line',{x1:x0,x2:width-18,y1:y,y2:y,class:'guide'}),element('text',{x:x0-6,y:y+4,'text-anchor':'end'},n.format(max*i/4/1e6)+' M€'));
  }
  for(let i=0;i<=100;i+=20) svg.append(element('text',{x:x0+plot*i/100,y:220,'text-anchor':'middle'},i));
  for(const {score,aid,name,color='blue'} of entries) {
    const dot=element('circle',{cx:x0+plot*score/100,cy:y0-164*aid/max,r:color==='blue'?2.8:4.7,fill:palette[color],opacity:color==='blue'?0.65:1});
    dot.append(element('title',{},name+' · '+n.format(score)+' puntos · '+n.format(aid)+' €'));
    svg.append(dot);
  }
}
export function wheel(target, detail, criteria) {
  const colors=['#7197ab','#637fbe','#39846a','#c8813c'];
  const svg=chart(target,'Peso de los criterios de evaluación',250,250);
  svg.setAttribute('role','group');
  let offset=0;
  criteria.forEach(([label,points],i) => {
    const value=offset; offset+=points;
    const arc=element('circle',{cx:125,cy:125,r:80,fill:'none',stroke:colors[i],
      'stroke-width':24,pathLength:100,'stroke-dasharray':(points-0.7)+' '+(100-points+0.7),
      'stroke-dashoffset':-value,transform:'rotate(-90 125 125)',role:'button',tabindex:0,'aria-label':label+' · '+points+' puntos'});
    const show=()=>{detail.textContent=label+' · '+points+' puntos de 100.';};
    arc.addEventListener('click',show);
    arc.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
    svg.append(arc);
  });
  svg.append(element('text',{x:125,y:132,'text-anchor':'middle',style:'font-size:32px;fill:#001e34'},'100'),element('text',{x:125,y:153,'text-anchor':'middle'},'puntos'));
}
