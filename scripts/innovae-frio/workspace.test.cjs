const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),D=require(root+'/cbi/assets/cbi-data-workspace.js'),M=require(root+'/cbi/assets/innovae-frio-model.js'),dir=root+'/cbi/data/innovae-frio/';
const config=JSON.parse(fs.readFileSync(dir+'calibration.json'));
test('catalog files parse and validate including archived Spanish booleans',()=>{for(const d of D.datasets){const data=D.parse(fs.readFileSync(dir+d.file,'utf8'));assert.deepEqual(D.validate(data,d.id),[],d.id);assert.deepEqual(D.parse(D.csv(data.headers,data.records)),data);}});
test('CSV handles quotes, embedded delimiters, multiline fields, BOM and CRLF',()=>{
 const data=D.parse('\uFEFFid;title\r\nA;"un; \"\"título\"\"\ncon dos líneas"\r\n');
 assert.equal(data.records[0].title,'un; "título"\ncon dos líneas');
 for(const s of ['id;id\na;b','id;cost\na','id;cost\na;"bad'])assert.throws(()=>D.parse(s));
});
test('reference validation prevents duplicate IDs, inconsistent units and missing provenance',()=>{
 const original=D.parse(fs.readFileSync(dir+'referencias_observadas.csv','utf8'));
 for(const patch of [{savingKwh:'1'},{page:'0'},{group:'new'},{classificationReason:''},{sourceUrl:'javascript:alert(1)'}]){
  const data=structuredClone(original);Object.assign(data.records[0],patch);assert.ok(D.validate(data,'references').length);
 }
 const repeated=structuredClone(original);repeated.records[1].id=repeated.records[0].id;assert.ok(D.validate(repeated,'references').length);
 assert.equal(D.number('1.234,56'),1234.56);assert.ok(Number.isNaN(D.number('')));
});
test('applied reference CSV retains default simulation and accepts changed working pairs',()=>{
 const data=D.parse(fs.readFileSync(dir+'referencias_observadas.csv','utf8')),refs=D.references(data);
 assert.equal(M.csv(M.generate(refs,config)),fs.readFileSync(dir+'simulacion_solicitudes.csv','utf8'));
 const changed=structuredClone(data);const row=changed.records.find(r=>r.group==='equipo'&&D.number(r.cost)>100000);row.cost=String(D.number(row.cost)*1.2);
 assert.deepEqual(D.validate(changed,'references'),[]);
 assert.notDeepEqual(M.generate(D.references(changed),config),M.generate(refs,config));
});
test('draft is isolated by aid and version; scenario values checked before use',()=>{
 assert.equal(D.load({getItem:()=>null}),null);
 assert.throws(()=>D.load({getItem:()=>JSON.stringify({version:1,call:'other'})}));
 assert.deepEqual(D.validateOptions(config.defaults),config.defaults);
 assert.throws(()=>D.validateOptions({...config.defaults,admission:2}));
});
test('editor scripts and inline scripts parse; simulator delegates data configuration',()=>{
 for(const f of ['cbi-data-workspace.js','cbi-data-workspace-page.js'])new vm.Script(fs.readFileSync(root+'/cbi/assets/'+f,'utf8'));
 for(const f of ['convocatorias.html','admin.html','innovae-frio-dashboard.html']){
  const html=fs.readFileSync(root+'/cbi/interfaces/'+f,'utf8');
  for(const [,script] of html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g))new vm.Script(script.replace(/^\s*import .*?;$/gm,''));
  assert.ok(html.includes('datos-ayuda.html'));
 }
 const html=fs.readFileSync(root+'/cbi/interfaces/innovae-frio-dashboard.html','utf8');assert.ok(!html.includes('data-scenario='));assert.ok(!html.includes('export-population'));assert.ok(html.includes('CBIData.load(sessionStorage)'));
});
test('workspace loads after access, saves an edited reference and applies a reproducible snapshot',async()=>{
 const html=fs.readFileSync(root+'/cbi/interfaces/datos-ayuda.html','utf8'),nodes=new Map(),events={};
 for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+id,{value:'',textContent:'',innerHTML:'',disabled:true,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.innerHTML='';}});
 const form=nodes.get('#scenario-form');form.elements=Object.fromEntries(Object.entries(config.defaults).map(([k,v])=>[k,{value:String(v)}]));
 const storage=new Map(),sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const doc={querySelector:s=>nodes.get(s),querySelectorAll:()=>[],addEventListener:(e,fn)=>events[e]=fn};
 let fetches=0;
 const context={window:{CBIData:D,FrioModel:M,addEventListener(){}},document:doc,sessionStorage,location:{search:''},URLSearchParams,FormData:class{constructor(f){this.form=f;}*[Symbol.iterator](){for(const [k,v]of Object.entries(this.form.elements))yield [k,v.value];}},fetch:async url=>{fetches++;return {ok:true,text:async()=>fs.readFileSync(path.resolve(root+'/cbi/interfaces',url),'utf8'),json:async()=>JSON.parse(fs.readFileSync(path.resolve(root+'/cbi/interfaces',url),'utf8'))};},console};
 vm.runInNewContext(fs.readFileSync(root+'/cbi/assets/cbi-data-workspace-page.js','utf8'),context);
 assert.equal(fetches,0);await events['cbi:access-granted']();assert.equal(fetches,4);
 assert.ok(nodes.get('#validation').textContent.includes('Validación correcta'));
 const editor=nodes.get('#csv-editor'),data=D.parse(editor.value),r=data.records.find(r=>r.group==='equipo'&&D.number(r.cost)>100000);
 r.cost=String(D.number(r.cost)*1.2);editor.value=D.csv(data.headers,data.records);editor.listeners.input();
 await nodes.get('#save-copy').listeners.click();
 await form.listeners.submit({preventDefault(){}});
 const draft=D.load(sessionStorage);assert.ok(draft.applied);assert.equal(draft.applied.records.find(x=>x.id===r.id).cost,D.number(r.cost));
 const snapshot=JSON.stringify(draft.applied);
 editor.value='bad';editor.listeners.input();await form.listeners.submit({preventDefault(){}});
 assert.equal(JSON.stringify(D.load(sessionStorage).applied),snapshot);
 await nodes.get('#restore').listeners.click();assert.equal(D.load(sessionStorage).applied,null);assert.ok(D.load(sessionStorage).copies.references);
});
