/* Call-scoped data workspace. No server writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CBIData=api;})(typeof self!=='undefined'?self:globalThis,()=>{
  const call='CONV-2026-INNOVAE-FRIO';
  const datasets=[
    {id:'references',name:'Referencias observadas',file:'referencias_observadas.csv',editable:true,role:'Base empírica del generador',description:'320 expedientes documentados. Edita la copia de trabajo para revisar importes o clasificación. El simulador usa los pares de coste y ahorro de las categorías seleccionadas.',fields:'id: expediente único · cost: inversión elegible (€) · grantedAid: ayuda concedida (€) · savingTep: ahorro anual (tep) · savingKwh: ahorro anual (kWh) · group: clasificación · classificationReason: justificación · pdf/page/sourceUrl: trazabilidad. La conversión usa 11.630 kWh/tep.'},
    {id:'generated',name:'Competidoras sintéticas',file:'simulacion_solicitudes.csv',editable:true,role:'Resultado del generador',description:'Población ilustrativa producida con los supuestos. Puedes editar y exportar una variante CSV. La edición manual de este resultado se conserva aparte; el simulador de 1.000 poblaciones utiliza las referencias y la configuración aplicadas.',fields:'coste_elegible_eur y ayuda_solicitada_eur: euros · ahorro_kwh_ano: kWh/año · categoria_innovacion: baja/incremental/intermedia/disruptiva · expediente_fuente: par observado de origen · factor_escala, perturbacion_ahorro y factor_cola: transformaciones. La ayuda solicitada es sintética; no es la ayuda histórica concedida.'},
    {id:'archive',name:'Preliminar de 220 solicitudes',file:'archive/simulacion_preliminar_220.csv',editable:false,role:'Archivo de comparación',description:'Versión preliminar conservada para comparar. No alimenta el simulador actual.',fields:'Costes y ayudas en euros, ahorro en kWh/año. Este archivo no tiene la trazabilidad por expediente de las nuevas filas.'}
  ];
  function parse(text){
    const rows=[];let row=[],cell='',quoted=false;
    const s=text.replace(/^\uFEFF/,'');
    for(let i=0;i<s.length;i++){const c=s[i];
      if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length)throw Error('Comillas dentro de un campo sin delimitar');else quoted=!quoted;}
      else if(c===';'&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw Error('Campo entre comillas sin cerrar');
    row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
    if(rows.length<2)throw Error('Se necesita cabecera y al menos una fila');
    const headers=rows.shift().map(x=>x.trim());
    if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('Cabeceras vacías o repetidas');
    return {headers,records:rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Fila ${i+2}: ${r.length} campos; se esperan ${headers.length}`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));})};
  }
  const number=x=>{const s=String(x??'').trim();return !s?NaN:Number(s.includes(',')?s.replaceAll('.','').replace(',','.'):s);};
  const csv=(headers,records)=>'\uFEFF'+[headers,...records.map(r=>headers.map(h=>r[h]))].map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\n')+'\n';
  function validate(data,id){
    const errors=[],seen=new Set();
    const req=id==='references'?['id','cost','grantedAid','savingTep','savingKwh','group','classificationReason','pdf','page','sourceUrl','sourceSha256']:['id','coste_elegible_eur','ayuda_solicitada_eur','ahorro_kwh_ano','categoria_innovacion','bonus_socioeconomico'];
    for(const key of req)if(!data.headers.includes(key))errors.push(`Falta columna ${key}`);
    if(errors.length)return errors;
    data.records.forEach((r,i)=>{
      const bad=message=>errors.push(`Fila ${i+2}: ${message}`);
      if(!r.id?.trim()||seen.has(r.id))bad('identificador vacío o repetido');seen.add(r.id);
      const keys=id==='references'?['cost','savingTep','savingKwh']:['coste_elegible_eur','ahorro_kwh_ano'];
      for(const key of keys)if(!(number(r[key])>0&&Number.isFinite(number(r[key]))))bad(`${key} debe ser positivo`);
      const cost=number(r[id==='references'?'cost':'coste_elegible_eur']),aid=number(r[id==='references'?'grantedAid':'ayuda_solicitada_eur']);
      if(!Number.isFinite(aid)||aid<0||aid>cost)bad('ayuda inválida o superior al coste');
      if(id==='references'){
        if(!['equipo','optimizacion','mixta','auxiliar','ambigua','fuera_muestra'].includes(r.group))bad('clasificación desconocida');
        if(!r.classificationReason.trim())bad('falta justificación de clasificación');
        if(Math.abs(number(r.savingKwh)-number(r.savingTep)*11630)>.02)bad('savingKwh no coincide con savingTep × 11.630');
        if(!Number.isInteger(number(r.page))||number(r.page)<1||!r.pdf.trim()||!/^https:\/\//.test(r.sourceUrl)||!/^[a-f0-9]{64}$/.test(r.sourceSha256))bad('trazabilidad incompleta');
      }else{
        if(!['baja','incremental','intermedia','disruptiva','sin'].includes(r.categoria_innovacion))bad('innovación desconocida');
        if(!['true','false','si','sí','no','1','0'].includes(r.bonus_socioeconomico.toLowerCase()))bad('bonus desconocido');
      }
    });return errors;
  }
  function references(data){return data.records.map(r=>({...r,cost:number(r.cost),grantedAid:number(r.grantedAid),savingTep:number(r.savingTep),savingKwh:number(r.savingKwh),page:number(r.page),powerKw:null,savingPct:null,technicalEligibility:'desconocida'}));}
  function validateOptions(o){
    if(![40,110,260].includes(o.demand)||![.55,.7,.85].includes(o.admission)||!['equipo','ampliada'].includes(o.scope)||![1,1.35].includes(o.tail)||![1,2,4].includes(o.scale)||!['baja','central','alta'].includes(o.innovationProfile)||![.1,.2,.4].includes(o.bonusRate))throw Error('Configuración de escenario inválida');return o;
  }
  const key=`cbi:data-workspace:${call}:v1`;
  function load(storage){const text=storage.getItem(key);if(!text)return null;const d=JSON.parse(text);if(d.call!==call||d.version!==1)throw Error('Borrador incompatible');return d;}
  return {call,datasets,parse,number,csv,validate,references,validateOptions,key,load};
});
