import {CBI} from './cbi-supabase.js';
export async function installDataConsumer(access){
 const catalog=await CBI.dataCatalog(access.session),paths=new Map(catalog.filter(d=>d.call_id===access.call.id&&d.active_version&&['csv','generador'].includes(d.metadata.connection)).map(d=>[d.source_path,d]));
 if(!paths.size)return;const original=window.fetch.bind(window),cache=new Map();window.CBIActiveDatasets={};
 window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href),d=url.origin===location.origin?paths.get(url.pathname):null;if(!d||init?.method&&init.method!=='GET')return original(input,init);if(!cache.has(d.id))cache.set(d.id,CBI.dataVersion(access.session,d.active_version));const v=await cache.get(d.id);if(!v)throw Error('Versión activa no disponible: '+d.name);window.CBIActiveDatasets[d.id]=v;return new Response(v.csv_text,{headers:{'Content-Type':'text/csv;charset=utf-8'}});};
}
