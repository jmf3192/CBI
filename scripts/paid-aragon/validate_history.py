"""Independent consistency checks against source counts and source document hashes."""
from pathlib import Path
import json,csv,hashlib,collections
D=Path(__file__).resolve().parents[2]/'cbi/data/paid-aragon'
data=json.loads((D/'history.json').read_text());rows=data['projects'];summary=data['summary']
assert len(rows)==2323
assert len({r['id'] for r in rows})==len(rows)
assert len({(r['year'],r['line'],r['case_id']) for r in rows})==len(rows)
assert all(r['beneficiary'] for r in rows)
assert all(r['source_page']>0 for r in rows)
assert all(r['granted_amount']==0 for r in rows if r['status']!='concedida')
assert all(r['financial_validated'] for r in rows if r['status']=='concedida')
assert all(abs(r['granted_amount']-r['minimis_amount']-r['rgec_amount'])<.02 for r in rows if r['status']=='concedida')
# The 2024 final decision explicitly publishes these annex counts.
assert collections.Counter(r['status'] for r in rows if r['year']==2024)==dict(concedida=120,lista_espera=299,no_elegible=46,desistida=29,anulada=11)
assert len([r for r in rows if r['year']==2026 and r['case_id']=='0257/2026/TDII'])==1
assert next(r for r in rows if r['year']==2026 and r['case_id']=='0257/2026/TDII')['granted_amount']==124000
assert next(r for r in rows if r['year']==2025 and r['case_id']=='0192/2025/TDII')['waiting_amount']==219435
assert sum(r['granted_amount'] for r in rows if r['year']==2021 and r['subline']=='digital')==5381900
for source in json.loads((D/'sources.json').read_text()):
 if source['status']=='downloaded':assert hashlib.sha256((D/'sources'/source['file']).read_bytes()).hexdigest()==source['sha256']
with (D/'historico_expedientes.csv').open(encoding='utf-8-sig',newline='') as f:
 csvrows=list(csv.DictReader(f));assert len(csvrows)==len(rows);assert abs(sum(float(r['granted_amount'] or 0) for r in csvrows)-summary['granted_amount'])<.01
with (D/'historico_eventos.csv').open(encoding='utf-8-sig',newline='') as f:assert len(list(csv.DictReader(f)))==2384
print(json.dumps(dict(status='passed',projects=len(rows),events=summary['records'],granted_amount=summary['granted_amount'],downloaded_pdfs=sum(s['status']=='downloaded' for s in json.loads((D/'sources.json').read_text())),checks='unique cases, source hashes, source annex counts, grants vs waiting, tranches, partial grants, CSV roundtrip, OCR digital total'),ensure_ascii=False))
