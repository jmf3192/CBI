(()=>{'use strict';
 const D=window.CBIData,M=window.FrioModel,$=s=>document.querySelector(s),form=$('#scenario-form');
 let originals={},draft={version:1,call:D.call,copies:{},applied:null},selected='references',config,dirty=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const feedback=text=>{$('#feedback').textContent=text;};
 function persist(){sessionStorage.setItem(D.key,JSON.stringify(draft));}
 function options(){return D.validateOptions(Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,['scope','innovationProfile'].includes(k)?v:Number(v)])));}
 function current(){return draft.copies[selected]??originals[selected];}
 function validate(text,id){const data=D.parse(text),errors=D.validate(data,id);if(errors.length)throw Error(errors.slice(0,12).join('\n')+(errors.length>12?`\n… ${errors.length} incidencias en total`:''));return data;}
 function preview(){try{const data=validate($('#csv-editor').value,selected);$('#validation').textContent=`Validación correcta · ${data.records.length} filas · ${data.headers.length} columnas`;$('#validation').className='';$('#row-count').textContent=`${data.records.length} filas`;
  $('#preview').innerHTML='<table><thead><tr>'+data.headers.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+data.records.slice(0,15).map(r=>'<tr>'+data.headers.map(h=>`<td title="${esc(r[h])}">${esc(r[h])}</td>`).join('')+'</tr>').join('')+'</tbody></table>';return data;
 }catch(e){$('#validation').textContent=e.message;$('#validation').className='error';$('#preview').replaceChildren();return null;}}
 function show(){const dataset=D.datasets.find(d=>d.id===selected);$('#dataset-title').textContent=dataset.name;$('#dataset-description').textContent=dataset.description;$('#dictionary').textContent=dataset.fields;$('#csv-editor').value=current();$('#csv-editor').readOnly=!dataset.editable;$('#save-copy').disabled=!dataset.editable;$('#import').disabled=!dataset.editable;$('#reset-file').disabled=!dataset.editable;dirty=false;preview();
 $('#catalog').innerHTML=D.datasets.map(d=>`<button class="dataset" type="button" data-dataset="${d.id}" aria-pressed="${selected===d.id}"><strong>${d.name}</strong><span>${d.role}</span><span>${draft.copies[d.id]?'Copia de trabajo':d.editable?'Publicado · editable como copia':'Histórico · lectura'}</span></button>`).join('');$('#draft-state').textContent=draft.applied?'Borrador aplicado en esta pestaña':'Simulador con versión publicada';}
 function refs(){return D.references(validate(draft.copies.references??originals.references,'references'));}
 function summary(){try{const o=options(),pool=M.eligiblePool(refs(),o.scope);$('#config-summary').textContent=`${o.demand} candidatas × ${o.admission*100} % = ${Math.round(o.demand*o.admission)} competidoras. ${pool.length} pares observados disponibles. Los supuestos se aplican al pulsar «Aplicar».`;}catch(e){$('#config-summary').textContent=e.message;}}
 function download(name,text,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function safe(fn){return async e=>{try{await fn(e);}catch(err){feedback(err.message);}};}
 $('#catalog').addEventListener('click',safe(e=>{const b=e.target.closest('[data-dataset]');if(!b)return;if(dirty)throw Error('Guarda la copia de trabajo o recupera el publicado antes de cambiar de archivo.');selected=b.dataset.dataset;show();}));
 $('#csv-editor').addEventListener('input',()=>{dirty=true;$('#validation').textContent='Cambios pendientes de validar y guardar.';});
 $('#validate').addEventListener('click',preview);
 $('#save-copy').addEventListener('click',safe(()=>{if(!preview())return;const next={...draft.copies,[selected]:$('#csv-editor').value};sessionStorage.setItem(D.key,JSON.stringify({...draft,copies:next}));draft.copies=next;dirty=false;show();summary();feedback('Copia guardada en esta pestaña. Para actualizar el simulador, aplica las referencias y la configuración.');}));
 $('#download').addEventListener('click',safe(()=>{if(!preview())return;download(D.datasets.find(d=>d.id===selected).file.split('/').at(-1),$('#csv-editor').value);}));
 $('#import').addEventListener('change',safe(async e=>{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error('El archivo supera 5 MB.');const text=await file.text();validate(text,selected);$('#csv-editor').value=text;dirty=true;preview();feedback('CSV importado en el editor. Guarda la copia para conservarlo en esta pestaña.');e.target.value='';}));
 $('#reset-file').addEventListener('click',safe(()=>{delete draft.copies[selected];persist();show();summary();feedback('Editor restaurado al archivo publicado. La instantánea aplicada al simulador se mantiene hasta volver a aplicar.');}));
 form.addEventListener('change',summary);
 form.addEventListener('submit',safe(e=>{e.preventDefault();if(dirty)throw Error('Guarda primero los cambios del editor.');const records=refs(),o=options();M.generate(records,config,o);draft.applied={version:M.VERSION,records,options:o,savedAt:new Date().toISOString()};persist();show();feedback('Referencias y configuración aplicadas. Abre el simulador desde el enlace de esta página.');}));
 $('#generate').addEventListener('click',safe(()=>{if(dirty)throw Error('Guarda primero los cambios del editor.');const rows=M.generate(refs(),config,options());draft.copies.generated=M.csv(rows);persist();selected='generated';show();feedback(`CSV regenerado con ${rows.length} competidoras. La copia sintética anterior se ha sustituido en esta pestaña.`);}));
 $('#export-config').addEventListener('click',safe(()=>{if(dirty)throw Error('Guarda primero los cambios del editor.');download('innovae-frio-configuracion.json',JSON.stringify({call:D.call,version:M.VERSION,config,options:options(),references:refs()},null,2),'application/json');}));
 $('#restore').addEventListener('click',safe(()=>{draft.applied=null;persist();$('#draft-state').textContent='Simulador con versión publicada';feedback('El simulador volverá a las referencias y configuración publicadas. Las copias de trabajo se conservan.');}));
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 document.addEventListener('cbi:access-granted',safe(async()=>{
  const params=new URLSearchParams(location.search);if(params.has('ayuda')&&params.get('ayuda')!==D.call)throw Error('Esta primera página de datos está configurada para INNOVAE frío.');
  const responses=await Promise.all([...D.datasets.map(d=>fetch('../data/innovae-frio/'+d.file,{cache:'no-store'})),fetch('../data/innovae-frio/calibration.json',{cache:'no-store'})]);
  if(responses.some(r=>!r.ok))throw Error('No se pudieron cargar los archivos de esta ayuda.');
  for(let i=0;i<D.datasets.length;i++)originals[D.datasets[i].id]=await responses[i].text();config=await responses.at(-1).json();
  try{draft=D.load(sessionStorage)??draft;}catch(e){feedback('No se pudo recuperar el borrador: '+e.message);return;}
  for(const [k,v]of Object.entries(draft.applied?.options??config.defaults))if(form.elements[k])form.elements[k].value=v;
  document.querySelectorAll('button:disabled,input:disabled,textarea:disabled').forEach(el=>el.disabled=false);show();summary();feedback('Archivos cargados. Las copias son locales a esta pestaña y pueden exportarse.');
 }),{once:true});
})();
