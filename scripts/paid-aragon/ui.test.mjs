import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PAIP_PLAYWRIGHT_MODULE || homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const history=JSON.parse(await readFile(new URL('../../cbi/data/paid-aragon/history.json',import.meta.url)));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();
const failures=[];page.on('pageerror',error=>failures.push(error.message));
let saved=[],published=false;
const scenarioCSV=await readFile(new URL('../../cbi/data/paid-aragon/escenario_2027.csv',import.meta.url),'utf8');
const user='00000000-0000-4000-8000-000000000001',call='00000000-0000-4000-8000-000000000002';
await page.addInitScript(({user})=>localStorage.setItem('cbi.supabase.session',JSON.stringify({access_token:'test-session-only',refresh_token:'test-only',expires_at:4102444800,user:{id:user}})),{user});
await page.route('https://wtiugprfadlwfpmfnvhe.supabase.co/**',async route=>{
 const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);let data=[];
 if(table==='data_catalog'&&published)data=[{id:'paip-escenario-2027',call_id:call,source_path:'/cbi/data/paid-aragon/escenario_2027.csv',active_version:'version-test',metadata:{connection:'csv'}}];
 if(table==='data_versions'&&published)data=[{id:'version-test',csv_text:scenarioCSV.replace(',2027,5,',',2027,10,'),created_at:'2026-11-20T12:00:00Z'}];
 if(table==='profiles')data=[{id:user,role:'admin',status:'active',full_name:'Prueba local',email:'test@example.invalid'}];
 if(table==='calls')data=[{id:call,code:'PAID-ARAGON',name:'PAIP Aragón · TDI-FEDER',kind:'normal',route_path:'./paid-aragon-dashboard.html'}];
 if(table==='user_call_access')data=[{access_level:'admin'}];
 if(table==='paid_aragon_editions')data=[2021,2022,2023,2024,2025,2026].map(year=>({id:'edition-'+year,year,title:'PAIP '+year}));
 if(table==='paid_aragon_awards'){
  const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);
  data=history.projects.slice(offset,offset+limit).map(row=>({...row,edition_id:'edition-'+row.year,result_status:row.status,extraction_method:row.extraction,import_key:row.id}));
 }
 if(table==='paid_aragon_applications'){
  if(request.method()==='POST'){const row={...request.postDataJSON(),id:'draft-1'};saved=[row];data=[row];}
  else if(request.method()==='PATCH'){saved=[{...saved[0],...request.postDataJSON()}];data=saved;}
  else data=saved;
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
await page.goto('http://127.0.0.1:8765/cbi/interfaces/paid-aragon-dashboard.html');
try { await page.waitForFunction(()=>document.querySelector('#history-status').textContent.includes('2323 expedientes'),{},{timeout:10000}); } catch(e) { console.log(await page.evaluate(()=>({url:location.href,access:document.body.dataset.cbiAccess,status:document.querySelector('#status')?.textContent,history:document.querySelector('#history-status')?.textContent})),failures); await page.screenshot({path:'/tmp/paip-ui-debug.png'}); await browser.close(); throw e; }
assert.equal(await page.locator('#tab-request').getAttribute('aria-selected'),'true');
assert.equal(await page.locator('[data-criterion]').count(),15);
assert.equal(await page.locator('input[name=application_year]').inputValue(),'2027');
await page.locator('[name=company_name]').fill('Empresa de prueba');await page.locator('[name=project_name]').fill('Proyecto de fertilizantes');
await page.locator('[data-input=size]').selectOption('small');await page.locator('[data-input=zone]').selectOption('zaragoza_city');
await page.locator('[data-input=applicationDate]').fill('2026-12-01');await page.locator('[data-input=startDate]').fill('2026-12-02');await page.locator('[data-input=endDate]').fill('2027-06-01');
await page.locator('[data-gate=valid_preapplication]').selectOption('yes');
await page.locator('[data-step="1"]').click();
await page.locator('[data-input=previousMinimis]').fill('0');await page.locator('[data-input=otherAid]').fill('0');
await page.locator('[data-cost=investment][data-regime=minimis]').fill('100000');
await page.locator('[data-step="2"]').click();
for(const gate of await page.locator('#eligibility-rows [data-gate]').all())await gate.selectOption('yes');
await page.locator('[data-step="3"]').click();
await page.locator('[data-criterion=a]').selectOption('yes');await page.locator('[data-evidence=a]').fill('Memoria de transformación, sección 4 y presupuesto de automatización.');
assert.match(await page.locator('#aid-result').textContent(),/40\.000/);assert.match(await page.locator('#score-result').textContent(),/^55/);
assert.equal(await page.locator('#eligibility-result').textContent(),'Compatible según tus datos');
await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('guardadas'));
assert.equal(saved[0].assessment.criteria.a.value,'yes');assert.equal(saved[0].requested_budget,100000);
await mkdir('/tmp/paip-ui',{recursive:true});await page.screenshot({path:'/tmp/paip-ui/request-desktop.png',fullPage:false});
await page.locator('#new-request').click();assert.match(await page.locator('#score-result').textContent(),/^0/);
await page.locator('#draft-select').selectOption('draft-1');assert.match(await page.locator('#score-result').textContent(),/^55/);
await page.locator('#tab-history').click();assert.equal(await page.locator('#history-rows tr').count(),50);assert.equal(await page.locator('#scatter-chart circle').count(),history.projects.filter(r=>r.status==='concedida'&&r.score!==null&&r.granted_amount!==null).length);
await page.locator('#history-year').selectOption('2026');assert.match(await page.locator('#table-count').textContent(),/292/);
await page.locator('[data-sector=fertilizantes]').click();const expected=history.projects.filter(r=>r.year===2026&&r.sector==='fertilizantes').length;assert.equal(await page.locator('#history-rows tr').count(),expected);
await page.locator('[data-sector=all]').click();await page.locator('#history-year').selectOption('');await page.locator('#history-search').fill('ADISSEO');assert.ok((await page.locator('#history-rows tr').count())>0);
const downloadPromise=page.waitForEvent('download');await page.locator('#export-history').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'paip-historico-seleccion.csv');
await page.locator('#history-search').fill('');await page.locator('#history-year').selectOption('2026');
await page.screenshot({path:'/tmp/paip-ui/history-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>Number(document.querySelector('#scatter-chart svg').getAttribute('viewBox').split(' ')[2])<400);await page.screenshot({path:'/tmp/paip-ui/history-mobile.png',fullPage:true});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow on mobile');
published=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#forecast-kpis').textContent.includes('401'));assert.match(await page.locator('#forecast-status').textContent(),/compartida activa/);
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Request page also fits mobile');
await page.screenshot({path:'/tmp/paip-ui/request-mobile.png',fullPage:true});
assert.deepEqual(failures,[]);console.log(JSON.stringify({status:'passed',criteria:15,history:history.projects.length,sectors2026:expected,checks:'auth guard, score, aid, save/reload, pagination, filters, CSV, mobile layout',errors:failures}));
await browser.close();
