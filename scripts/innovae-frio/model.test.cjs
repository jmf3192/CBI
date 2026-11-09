const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),M=require(root+'/cbi/assets/innovae-frio-model.js');
const dir=root+'/cbi/data/innovae-frio/';
const config=JSON.parse(fs.readFileSync(dir+'calibration.json'));
const {records}=JSON.parse(fs.readFileSync(dir+'references.json'));
const own={id:'PROYECTO',own:true,cost:720000,savingKwh:940000,aid:158400,innovation:'incremental',bonus:false,powerKw:165,savingPct:24,size:'large',zone:'general',aidMode:'reference',referenceCost:144000,arrival:.5};
const row=(id,overrides={})=>({id,cost:200000,savingKwh:300000,aid:50000,innovation:'intermedia',bonus:false,...overrides});
test('reference counts, unique IDs, conversion and source provenance',()=>{
 assert.equal(records.length,320);assert.equal(new Set(records.map(r=>r.id)).size,320);
 assert.equal(M.eligiblePool(records,'equipo').length,8);assert.equal(M.eligiblePool(records,'ampliada').length,22);
 for(const r of records){assert.equal(r.savingKwh,Math.round(r.savingTep*11630*100)/100);assert.ok(r.sourceSha256.length===64);assert.ok(r.page>=4);assert.equal(r.technicalEligibility,'desconocida');}
 assert.equal(records.find(r=>r.id==='FN-PGESI-MUR-557349-000006').cost,490000);
 assert.equal(records.find(r=>r.id==='FN-PGESI-AND-467517-000075').savingTep,52.7);
});
test('aid calculation respects size, zone, reference, half and project cap',()=>{
 assert.equal(M.aidLimit({cost:1000000,referenceCost:200000}),240000);
 assert.equal(Math.round(M.aidLimit({cost:1000000,size:'small',zone:'a',referenceCost:200000})),520000);
 assert.equal(M.aidLimit({cost:1000000,aidMode:'half'}),150000);
 assert.equal(M.aidLimit({cost:1000000,size:'nonEconomic',aidMode:'exclusive'}),700000);
 assert.equal(M.aidLimit({cost:10000000,size:'small',zone:'a'}),2000000);
 assert.throws(()=>M.aidLimit({cost:100,referenceCost:101}));
});
test('published CSV exactly reproduces default seed and paired provenance',()=>{
 const a=M.generate(records,config);assert.equal(a.length,77);
 assert.equal(M.csv(a),fs.readFileSync(dir+'simulacion_solicitudes.csv','utf8'));
 assert.deepEqual(a,M.generate(records,config));assert.notDeepEqual(a,M.generate(records,config,{},1));
 for(const r of a){const ref=records.find(x=>x.id===r.sourceId);assert.ok(Math.abs(r.cost-ref.cost*r.factor)<.006);assert.ok(Math.abs(r.savingKwh-ref.savingKwh*r.factor*r.perturbation/r.tailFactor)<.006);assert.ok(r.aid<=M.aidLimit(r));assert.equal(r.powerKw,null);assert.equal(r.savingPct,null);}
});
test('all demand/admission combinations and sensitivities',()=>{
 for(const demand of [40,110,260])for(const admission of [.55,.7,.85])for(const scope of ['equipo','ampliada'])for(const scale of [1,2,4]){
  const rows=M.generate(records,config,{demand,admission,scope,scale,tail:1.35});
  assert.equal(rows.length,Math.round(demand*admission));
  for(const r of rows){assert.ok(r.cost>=100000);assert.ok(r.savingKwh>0);assert.ok(r.aid<=M.aidLimit(r));}
 }
 assert.throws(()=>M.generate(records,config,{scope:'unknown'}));
});
test('invalid projects cannot distort admitted scales; technical boundary is strict',()=>{
 const base=[row('a'),row('b',{cost:400000})];
 const r=M.scoreRows([...base,row('invalid',{cost:1e9,powerKw:99}),row('invalid2',{savingPct:20})]);
 assert.deepEqual(r.rpaScale,M.scoreRows(base).rpaScale);
 assert.equal(r.rows[2].result,'excluida');assert.equal(r.rows[3].result,'excluida');
 assert.notEqual(M.scoreRows([row('ok',{powerKw:100,savingPct:20.01})]).rows[0].result,'excluida');
 assert.equal(M.scoreRows([row('aid',{aid:100001,size:'large'})]).rows[0].result,'excluida');
});
test('5% trim starts at n=20, interval equality, no budget overspend and arrival tie',()=>{
 assert.deepEqual(M.scale(Array.from({length:20},(_,i)=>i)),{min:1,max:18,range:17});
 assert.deepEqual(M.scale([1,2,3]),{min:1,max:3,range:2});
 assert.equal(M.points(2,{min:0,range:10},[40,32,24,16,8]),40);
 assert.equal(M.points(2.01,{min:0,range:10},[40,32,24,16,8]),32);
 const result=M.scoreRows([row('later',{arrival:.8}),row('earlier',{arrival:.1})],50000);
 assert.equal(result.ranked[0].id,'earlier');assert.equal(result.used,50000);assert.equal(result.ranked[1].result,'lista_reserva');assert.ok(result.constrained);
 assert.equal(M.scoreRows([row('a')],50000).cutoff,null);
 assert.equal(M.scoreRows([row('a')],100).cutoff,null);assert.equal(M.scoreRows([row('a')],100).constrained,true);
});
test('Monte Carlo is deterministic, accounts for every outcome, excludes failing own',()=>{
 const cfg={...config,runs:30};const a=M.monteCarlo(records,cfg,{},own);
 assert.deepEqual(a,M.monteCarlo(records,cfg,{},own));assert.equal(a.funded+a.reserve+a.excluded,30);
 assert.equal(a.frequency,100*a.funded/30);
 assert.equal(M.monteCarlo(records,cfg,{}, {...own,powerKw:99}).excluded,30);
});
test('inline dashboard script parses and worker uses the same version',()=>{
 const html=fs.readFileSync(root+'/cbi/interfaces/innovae-frio-dashboard.html','utf8');
 for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
 assert.ok(!html.includes('approvalProbability'));assert.ok(html.includes('new Worker('));
 assert.ok(fs.readFileSync(root+'/cbi/assets/innovae-frio-worker.js','utf8').includes('v='+M.VERSION));
});
