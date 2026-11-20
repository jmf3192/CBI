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
assert.equal(await page.locator('#draft-select').count(),0);
assert.equal(await page.locator('[name=company_name]').count(),0);
assert.equal(await page.locator('#status').isHidden(),true);
assert.match(await page.locator('#forecast-kpis').textContent(),/383/);
assert.ok((await page.locator('.brand img').getAttribute('src')).includes('../../assets/logo-conasoc.png'));
assert.equal(await page.locator('.source-actions a').count(),2);
await page.locator('[data-input=size]').selectOption('small');await page.locator('[data-input=zone]').selectOption('zaragoza_city');
await page.locator('[data-input=applicationDate]').fill('2026-12-01');await page.locator('[data-input=foundationDate]').fill('2025-01-01');await page.locator('[data-input=startDate]').fill('2026-12-02');await page.locator('[data-input=endDate]').fill('2027-06-01');
await page.locator('[data-gate=valid_preapplication]').selectOption('yes');
await page.locator('[data-step="1"]').click();
await page.locator('[data-input=previousMinimis]').fill('0');await page.locator('[data-input=otherAid]').fill('0');
await page.locator('[data-cost=investment][data-regime=minimis]').fill('100000');
await page.locator('[data-step="2"]').click();for(const button of await page.locator('#eligibility-rows .segmented-choice [data-answer=yes]').all())await button.click();
await page.locator('[data-step="3"]').click();await page.locator('.criterion').first().locator('[data-answer=yes]').click();
assert.match(await page.locator('#aid-result').textContent(),/40\.000/);assert.match(await page.locator('#score-result').textContent(),/^55/);
assert.equal(await page.locator('#eligibility-result').textContent(),'Compatible según tus datos');
for(const button of await page.locator('.criterion .segmented-choice [data-answer=yes]').all())await button.click();
assert.match(await page.locator('#score-result').textContent(),/^425/);
await page.waitForFunction(()=>document.querySelector('#approval-rate').textContent==='100 %');
assert.ok(await page.locator('#competition-scatter circle').count()>150);
assert.equal(await page.locator('#score-weight-track button').count(),15);
await page.locator('#score-weight-track button').first().click();assert.match(await page.locator('#score-weight-detail').textContent(),/55 puntos/);
await page.locator('[data-step="4"]').click();await page.locator('#manual-name').fill('Competidora prueba');await page.locator('#manual-score').fill('425');await page.locator('#manual-aid').fill('500000');await page.locator('#manual-competitor-form button[type=submit]').click();
await page.waitForFunction(()=>document.querySelector('#competition-population').textContent.includes('1 conocidas'));assert.equal(await page.locator('.manual-competitor').count(),1);assert.match(await page.locator('#manual-aid').inputValue(),/500\.000/);
await page.locator('.manual-competitor button').click();assert.equal(await page.locator('.manual-competitor').count(),0);
await page.locator('[data-step="1"]').click();assert.equal(await page.locator('[data-cost=investment][data-regime=minimis]').inputValue(),'100.000');
await page.locator('#own-aid-range').fill('20000');assert.match(await page.locator('#aid-result').textContent(),/20\.000/);await page.locator('#own-aid-range').fill('40000');
await page.locator('[data-step="3"]').click();
await page.evaluate(()=>window.scrollTo(0,0));await mkdir('/tmp/paip-ui',{recursive:true});await page.screenshot({path:'/tmp/paip-ui/request-desktop.png',fullPage:true});
await page.locator('#tab-history').click();assert.equal(await page.locator('#history-rows tr').count(),50);
assert.equal(await page.locator('#history-kpis .kpi').count(),7);assert.equal(await page.locator('#history-comparisons').isVisible(),true);assert.equal(await page.locator('.composition-row').count(),6);assert.ok(await page.locator('.heatmap-cell').count()>50);
await page.locator('#history-comparisons').screenshot({path:'/tmp/paip-ui/history-comparisons.png'});
await page.locator('.heatmap-cell').nth(5).click();assert.equal(await page.locator('#score-members').isVisible(),true);await page.keyboard.press('Escape');
await page.locator('#history-histogram [role=button]').nth(5).click();assert.equal(await page.locator('#score-members').isVisible(),true);await page.keyboard.press('Escape');
assert.equal(await page.locator('#export-history').count(),0);assert.equal(await page.locator('[data-sector]').count(),0);
await page.locator('[data-year="sector"]').click();assert.match(await page.locator('#table-count').textContent(),/29/);assert.equal(await page.locator('#history-year').inputValue(),'sector');
await page.locator('#history-search').fill('ADISSEO');assert.equal(await page.locator('#history-rows tr').count(),1);
await page.locator('.open-project').first().click();assert.equal(await page.locator('#project-detail').isVisible(),true);assert.match(await page.locator('#project-detail').textContent(),/Inversión subvencionable/);assert.match(await page.locator('#project-detail').textContent(),/No publicado/);assert.match(await page.locator('#project-detail').textContent(),/ADISSEO/);assert.equal(await page.locator('.project-events tbody tr').count(),1);assert.match(await page.locator('.project-events').textContent(),/300\.000/);
await page.screenshot({path:'/tmp/paip-ui/project-detail.png',fullPage:false});await page.keyboard.press('Escape');
await page.locator('#history-search').fill('');await page.locator('[data-year="2026"]').click();assert.match(await page.locator('#table-count').textContent(),/292/);assert.equal(await page.locator('#history-comparisons').isHidden(),true);assert.equal(await page.locator('#history-score-legend span').count(),3);
assert.match(await page.locator('#history-kpis').textContent(),/25,9 %/);
const histogram=page.locator('#history-histogram svg');await histogram.hover({position:{x:180,y:150}});assert.equal(await histogram.locator('line[visibility=visible]').count(),1);
await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'/tmp/paip-ui/history-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>Number(document.querySelector('#scatter-chart svg').getAttribute('viewBox').split(' ')[2])<400);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.open-project').first().click();await page.screenshot({path:'/tmp/paip-ui/project-mobile.png',fullPage:false});await page.keyboard.press('Escape');
await page.locator('#tab-request').click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.screenshot({path:'/tmp/paip-ui/request-mobile.png',fullPage:true});
published=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#forecast-kpis').textContent.includes('401'));
assert.equal(saved.length,0,'Meeting inputs are never persisted');assert.deepEqual(failures,[]);
console.log(JSON.stringify({status:'passed',criteria:15,history:history.projects.length,sectorCases:29,checks:'meeting controls, no persistence, declaration scores, 1000 bootstrap scenarios, combined sector tab, project details, published CSV, desktop and mobile',errors:failures}));await browser.close();
