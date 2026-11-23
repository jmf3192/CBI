from pathlib import Path
import json,csv,re,collections,hashlib,unicodedata
from nutrition import classify_nutrition, NUTRITION_SECTORS
ROOT=Path(__file__).resolve().parents[2];D=ROOT/'cbi/data/paid-aragon'
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.upper()) if unicodedata.category(c)!='Mn')
rules=json.loads((ROOT/'scripts/paid-aragon/sector-rules.json').read_text())
records=json.loads((D/'extracted-records.json').read_text())+json.loads((D/'ocr-records.json').read_text())
# Document order matters: additions are actual later grants, not replacements for every case.
priority={'2023_decision_70b7ff1eed.pdf':10,'2023_decision_737fc8aa9e.pdf':20,'2025_decision_62247b59d7.pdf':10,'2025_decision_b47cb342bc.pdf':20,'2025_decision_e18d974c0d.pdf':30,'2026_decision_ab7268d2a4.pdf':10,'2026_decision_57c46672a4.pdf':20,'2026_decision_8996b7809c.pdf':30}
for row in records:
 row['original_case_id']=row['case_id']
 row['case_id']=re.sub(r'/TDI$','/TDII',row['case_id']);row['case_id']=re.sub(r'/IDI$','/IDIS',row['case_id'])
 if row['case_id']=='0360/2022/IDIS' and not row['beneficiary']:row['beneficiary']='CREALMAT, S.L.';row['correction_note']='Nombre recuperado del texto de la tabla en la página original.'
 row['sector']='otros';row['sector_confidence']='sin_clasificar';row['sector_basis']='No identificado en la revisión sectorial';row['sector_source_url']=''
 for rule in rules:
  if re.search(rule['pattern'],norm(row['beneficiary'])):
   row.update(sector=rule['sector'],sector_confidence=rule['confidence'],sector_basis=rule['basis'],sector_source_url=rule['url'] or row['source_url']);break
 if row['sector'] in ['fertilizantes','nutricion_animal']:row['sector_basis']+=' Clasificación de la empresa; la resolución no publica el título/contenido del proyecto.'
 classify_nutrition(row)
# Explicit later withdrawals concern the waiting list, not necessarily an earlier partial grant.
withdrawals={2025:{'0089/2025/TDII','0043/2025/TDII','0318/2025/TDII','0351/2025/TDII'},2026:{'0160/2026/TDII','0109/2026/TDII','0226/2026/TDII'}}
# Group by administrative case; source events remain in a separate CSV and source_refs.
groups=collections.defaultdict(list)
for row in records:groups[(row['year'],row['line'],row['case_id'])].append(row)
projects=[]
for key,events in groups.items():
 events.sort(key=lambda r:(priority.get(r['source_file'],10),r['source_page']))
 grants=[r for r in events if r['status']=='concedida'];wait=[r for r in events if r['status']=='lista_espera'];last=events[-1]
 row=dict(last);row['id']=hashlib.sha256('|'.join(map(str,key)).encode()).hexdigest()[:24]
 row['source_refs']=[dict(status=e['status'],url=e['source_url'],file=e['source_file'],page=e['source_page'],amount=e['amount']) for e in events]
 row['event_count']=len(events);row['province']='';row['project_title']=''
 if grants:
  row['status']='concedida';row['granted_amount']=round(sum(r['amount'] for r in grants),2) if all(r['financial_validated'] for r in grants) else None
  row['eligible_budget']=round(sum(r['eligible_budget'] for r in grants),2) if all(r['eligible_budget'] is not None for r in grants) else None
  row['score']=max((r['score'] for r in grants if r['score'] is not None),default=None)
  row['source_url']=grants[-1]['source_url'];row['source_file']=grants[-1]['source_file'];row['source_page']=grants[-1]['source_page']
  row['waiting_amount']=wait[-1]['amount'] if wait and priority.get(wait[-1]['source_file'],10)>=priority.get(grants[-1]['source_file'],10) and (wait[-1]['source_file']!=grants[-1]['source_file'] or wait[-1]['source_page']>=grants[-1]['source_page']) else 0
  row['financial_validated']=all(r['financial_validated'] for r in grants)
 else:row['granted_amount']=0;row['waiting_amount']=wait[-1]['amount'] if wait else None
 row['notes']=''
 if row['case_id'] in withdrawals.get(row['year'],set()):
  row['waiting_amount']=0;row['notes']='Renuncia posterior a la parte pendiente de lista de espera; no se elimina una concesión inicial parcial si existía.'
  if not grants:row['status']='renuncia_lista_espera'
 if len(events)>1:row['notes']+=' Expediente consolidado; consultar los eventos para distinguir importes y fases.'
 row['source_amount_last']=row.pop('amount',None)
 row['minimis_amount']=round(sum(e['minimis_amount'] for e in grants),2) if grants and all(e['minimis_amount'] is not None for e in grants) else None
 row['rgec_amount']=round(sum(e['rgec_amount'] for e in grants),2) if grants and all(e['rgec_amount'] is not None for e in grants) else None
 sublines=sorted(set(e['subline'] for e in events));row['subline']=';'.join(sublines)
 projects.append(row)
projects.sort(key=lambda r:(-r['year'],r['case_id']))
# CSVs are UTF-8 BOM, RFC4180, decimal point, blank means unpublished (not zero).
def export(name,rows):
 if not rows:return
 fields=list(dict.fromkeys(k for r in rows for k in r))
 with (D/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()})
export('historico_eventos.csv',records);export('historico_expedientes.csv',projects)
for year in sorted(set(r['year'] for r in projects)):export(f'historico_{year}.csv',[r for r in projects if r['year']==year])
export('sectores_prioritarios.csv',[r for r in projects if r['sector'] in NUTRITION_SECTORS])
export('clasificacion_sectorial.csv',[r for r in projects if r['sector']!='otros'])
sources=json.loads((D/'sources.json').read_text());export('fuentes.csv',sources)
coverage=[]
for y in range(2017,2027):
 ps=[p for p in projects if p['year']==y];ss=[s for s in sources if s['year']==y]
 coverage.append(dict(year=y,projects=len(ps),downloaded_sources=sum(s['status']=='downloaded' for s in ss),unavailable_sources=sum(s['status']=='error' for s in ss),scope='TDI-FEDER' if y>=2023 else 'IDIS-REACT' if y>=2021 else 'Antecedentes PAIP',note='Resoluciones del portal actual: iniciales y ampliaciones publicadas.' if y>=2023 else 'IDIS-REACT. Resolución TDI 2021 adicional localizada, pero enlace oficial 404.' if y==2021 else 'IDIS-REACT: no equivale a TDI-FEDER.' if y==2022 else 'Sin microdatos incorporados: fuentes antiguas no recuperadas. No interpretar como ausencia de ayudas.'))
export('cobertura.csv',coverage)
summary=dict(as_of='2026-11-20',records=len(records),projects=len(projects),granted_projects=sum(p['status']=='concedida' for p in projects),granted_amount=round(sum(p['granted_amount'] or 0 for p in projects),2),coverage=coverage,notes=['Los importes son concesiones publicadas, no pagos ni ejecución final.','Las listas de espera no se suman a las concesiones.','Los títulos y las provincias no publicados quedan vacíos.','La clasificación sectorial es por actividad de la empresa, no acredita el objeto de cada proyecto.','Cobertura completa de documentos TDI-FEDER 2023–2026 enlazados en el portal revisado; no es un censo completo de todo PAIP desde su creación.'],source_reconciliations=[dict(year=2022,line='IDIS-REACT total',published_total=16729097,extracted_total=16729197,difference=100,status='Suma textual por filas 100 € superior a la suma de los tres pies de tabla. No se fuerzan ajustes sin una fila fuente.'),dict(year=2021,line='IDIS-REACT verde',published_total=2580601,extracted_total=2580595,difference=-6,status='Discrepancia de 6 euros entre suma de filas y pie de tabla; no se ajustan filas para forzar el total.'),dict(year=2021,line='IDIS-REACT digital',published_total=5381900,extracted_total=5381900,difference=0,status='Conciliado tras contraste visual de todos los importes digitales y corrección de ERGOMAQ-97 (9.070 €).')])
(D/'history.json').write_text(json.dumps(dict(summary=summary,projects=projects),ensure_ascii=False,separators=(',',':')))
(D/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print('PROJECTS',len(projects),'EVENTS',len(records),'TOTAL',summary['granted_amount']);print(collections.Counter((p['year'],p['status']) for p in projects));print(collections.Counter(p['sector'] for p in projects))

# Reapply the source-backed enrichment on every canonical rebuild.
from enrich_history import run as enrich_history
enrich_history()
