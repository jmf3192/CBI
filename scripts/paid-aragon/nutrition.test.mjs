import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const data=new URL('../../cbi/data/paid-aragon/',import.meta.url);
const awards=JSON.parse(await readFile(new URL('history.json',data),'utf8')).projects;
const legacy=JSON.parse(await readFile(new URL('legacy-history.json',data),'utf8')).records;
const rows=[...awards,...legacy];
test('Nutrition includes food projects across the available historical annualities',()=>{
 const human=rows.filter(r=>r.sector==='nutricion_humana');
 assert.equal(human.length,219);
 for(const[year,count]of [[2017,0],[2018,7],[2019,8],[2020,10],[2021,29],[2022,39],[2023,29],[2024,41],[2025,29],[2026,27]])assert.equal(human.filter(r=>r.year===year).length,count);
 assert.equal(rows.filter(r=>['fertilizantes','nutricion_animal','nutricion_humana'].includes(r.sector)).length,261);
 assert.ok(human.every(r=>r.sector_source_url&&r.sector_basis&&r.sector_confidence));
 assert.ok(legacy.filter(r=>r.sector==='nutricion_humana').every(r=>r.granted_amount===null&&r.score===null));
});
test('Food names, supplements, animal feed and unrelated suppliers stay distinct',()=>{
 assert.ok(rows.filter(r=>r.beneficiary.startsWith('HERBETOM')).every(r=>r.sector==='nutricion_humana'));
 assert.ok(rows.filter(r=>r.beneficiary.startsWith('CHELATS SARRATE')).every(r=>r.sector==='nutricion_humana'));
 assert.ok(rows.filter(r=>r.beneficiary.startsWith('MURILLO FRESH FOODS')).every(r=>r.sector==='nutricion_animal'));
 assert.ok(rows.filter(r=>r.beneficiary.startsWith('VEOS IBERICA')).every(r=>r.sector==='nutricion_animal'));
 assert.ok(rows.filter(r=>r.beneficiary.startsWith('BEST FEED')).every(r=>r.sector==='fertilizantes'));
 for(const name of ['CEMENTOS EL MOLINO','EL MOLINO AUDIOVISUAL','LABORATORIOS ENOSAN','NUEVAS TECNOLOGIAS PARA EL DESARROLLO DEL PACKAGING'])assert.ok(rows.filter(r=>r.beneficiary.startsWith(name)).every(r=>r.sector!=='nutricion_humana'));
 assert.equal(awards.find(r=>r.case_id==='0217/2023/TDII').sector,'nutricion_humana');
 assert.equal(awards.find(r=>r.case_id==='0395/2024/TDII').sector,'otros','A food study does not classify all subsequent technology projects');
 assert.equal(awards.find(r=>r.case_id==='0406/2023/TDII').sector,'otros','Mixed OCR names need source review before sector attribution');
});
