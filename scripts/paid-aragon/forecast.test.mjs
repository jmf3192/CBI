import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast } from '../../cbi/assets/paid-aragon-forecast.js';
const rows=[445,494,351,290].map((n,i)=>({anio:2023+i,solicitudes:n,peso:i+1}));
const settings=[{ejercicio:2027,incremento_demanda_pct:5,credito_inicial_eur:10025158.5}];
test('Recent years weigh more, 5% applies to weighted base, round only at the end',()=>{const f=forecast(rows,settings);assert.equal(f.average,364.6);assert.equal(f.demand,383);assert.ok(Math.abs(f.estimate-382.83)<1e-8);assert.deepEqual(f.basis.map(r=>r.share),[.1,.2,.3,.4]);});
test('Published edits affect output',()=>{assert.equal(forecast(rows,[{...settings[0],incremento_demanda_pct:10}]).demand,401);assert.equal(forecast(rows.map((r,i)=>({...r,peso:i===3?1:0})),settings).demand,305);});
test('Reject malformed inputs rather than render misleading estimates',()=>{for(const bad of [[...rows,rows[0]],rows.map(r=>({...r,peso:0})),rows.map(r=>({...r,solicitudes:''})),rows.map(r=>({...r,solicitudes:-1}))])assert.throws(()=>forecast(bad,settings));assert.throws(()=>forecast(rows,[{...settings[0],incremento_demanda_pct:'abc'}]));});
