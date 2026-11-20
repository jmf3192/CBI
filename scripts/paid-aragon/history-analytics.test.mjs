import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalStats,scoreBins} from '../../cbi/assets/paid-aragon-history-analytics.js';
const base=[{year:2026,line:'TDI-FEDER',status:'concedida',score:225},{year:2026,line:'TDI-FEDER',status:'concedida',score:275},{year:2026,line:'TDI-FEDER',status:'lista_espera',score:150},{year:2026,line:'TDI-FEDER',status:'no_elegible',score:null},{year:2026,line:'TDI-FEDER',status:'anulada',score:null}];
test('Historical rate excludes annulled cases, averages use published scores, cutoff is annual',()=>{const s=historicalStats(base);assert.equal(s.rate,50);assert.equal(s.cutoff,225);assert.equal(s.fundedMean,250);assert.ok(Math.abs(s.mean-650/3)<1e-8);});
test('Mixed calls never assert a common cutoff; missing scores do not become zero',()=>{assert.equal(historicalStats([...base,{...base[0],year:2025}]).cutoff,null);assert.equal(historicalStats([{...base[0],score:''}]).fundedMean,null);assert.equal(historicalStats([]).rate,null);});
test('Bins include the exact upper edge and retain clickable records',()=>{const r=[0,24,25,425].map(score=>({...base[0],score}));const {bins}=scoreBins(r);assert.equal(bins[0].rows.length,2);assert.equal(bins[1].rows.length,1);assert.equal(bins.at(-1).rows[0].score,425);assert.equal(bins.flatMap(b=>b.rows).length,4);});
