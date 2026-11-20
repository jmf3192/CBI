import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCompetition,simulateCompetition,withManualCompetitors} from '../../cbi/assets/paid-aragon-competition.js';
import {forecast} from '../../cbi/assets/paid-aragon-forecast.js';
import {evaluate} from '../../cbi/assets/paid-aragon-model.js';
const history=JSON.parse(await readFile(new URL('../../cbi/data/paid-aragon/history.json',import.meta.url))).projects;
const rules=JSON.parse(await readFile(new URL('../../cbi/data/paid-aragon/rules-2027.json',import.meta.url)));
const demand=forecast([445,494,351,290].map((n,i)=>({anio:2023+i,solicitudes:n,peso:i+1})),[{ejercicio:2027,incremento_demanda_pct:5,credito_inicial_eur:10025158.5}]);
const model=createCompetition(history,demand);
test('Bootstrap is repeatable, includes our project in total demand and never mixes IDIS',()=>{assert.equal(model.runs,1000);assert.deepEqual(model.populations[0],createCompetition(history,demand).populations[0]);assert.ok(model.populations.every(p=>p.rows.length<=382));assert.ok(model.populations.flatMap(p=>p.rows).every(r=>r.year>=2023&&r.score<=425&&r.aid>0&&r.aid<=500000));assert.equal(model.missing,139);});
test('Unknown aid does not produce a probability; failed eligibility is never funded',()=>{assert.equal(simulateCompetition(model,{score:425,aid:null}),null);assert.equal(simulateCompetition(model,{score:425,aid:40000,failed:true}).frequency,0);});
test('A top scoring low amount project funds in all runs; larger amount and lower score never improve results',()=>{const top=simulateCompetition(model,{score:425,aid:40000});assert.equal(top.frequency,100);assert.equal(top.rank,1);const low=simulateCompetition(model,{score:100,aid:40000});assert.ok(low.frequency<top.frequency);assert.ok(simulateCompetition(model,{score:200,aid:500000}).frequency<=simulateCompetition(model,{score:200,aid:40000}).frequency);});
test('Meeting declarations score immediately while archival assessments still require evidence',()=>{const a={application_year:2027,assessment:{mode:'meeting',size:'small',criteria:{a:{value:'yes'}}}};assert.equal(evaluate(a,rules).score,55);delete a.assessment.mode;assert.equal(evaluate(a,rules).score,0);});
test('Invalid or extreme populations fail explicitly',()=>{assert.throws(()=>createCompetition(history,{...demand,demand:100000000}));});

test('Known competitors replace sample slots, preserve demand, and alter funding',()=>{const manual=[{id:1,name:'Known',score:425,aid:500000}];const adjusted=withManualCompetitors(model,manual);assert.equal(adjusted.demand,383);assert.ok(adjusted.populations.every(p=>p.rows.length<=382&&p.rows.filter(r=>r.manual).length===1));assert.deepEqual(withManualCompetitors(model,[]),model);const tight={...adjusted,budget:40000};assert.equal(simulateCompetition(tight,{score:300,aid:40000}).frequency,0);assert.throws(()=>withManualCompetitors(model,[{id:1,score:426,aid:100000}]));assert.throws(()=>withManualCompetitors(model,[{id:1,score:200,aid:999999}]));});
