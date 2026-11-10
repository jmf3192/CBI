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
 for(const f of ['cbi-data-workspace.js','admin-data-panel.js'])new vm.Script(fs.readFileSync(root+'/cbi/assets/'+f,'utf8').replace(/^import .*?;$/gm,''));
 for(const f of ['convocatorias.html','admin.html','innovae-frio-dashboard.html']){
  const html=fs.readFileSync(root+'/cbi/interfaces/'+f,'utf8');
  for(const [,script] of html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g))new vm.Script(script.replace(/^\s*import .*?;$/gm,''));
  assert.ok(html.includes('admin.html')||html.includes('admin-data-panel.js'));
 }
 const html=fs.readFileSync(root+'/cbi/interfaces/innovae-frio-dashboard.html','utf8');assert.ok(!html.includes('data-scenario='));assert.ok(!html.includes('export-population'));assert.ok(html.includes('CBIData.load(sessionStorage)'));
});
