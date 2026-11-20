"""Extract official decision rows by PDF coordinates; keep decisions separate from consolidated projects."""
from pathlib import Path
from decimal import Decimal
import json,re,csv,hashlib,unicodedata,collections
ROOT=Path(__file__).resolve().parents[2];DATA=ROOT/'cbi/data/paid-aragon'
ID=re.compile(r'^\d{3,4}/20\d\d/(?:TDII?|IDIS?|PAIP)$')
MONEY=re.compile(r'^\d{1,3}(?:\.\d{3})*,\d{2}(?:\d)?$|^\d+,\d{2}(?:\d)?$')
def clean(s):return re.sub(r'\s+',' ',s).strip()
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.upper()) if unicodedata.category(c)!='Mn')
def num(s):
 s=s.replace('€','').strip()
 if not s:return None
 m=re.match(r'^(\d[\d.]*,\d{2})',s)
 if m:s=m[1].replace('.','').replace(',','.')
 elif re.fullmatch(r'\d+',s):pass
 else:return None
 return float(Decimal(s))
def text(words):
 lines=[]
 for w in sorted(words,key=lambda x:(x['top'],x['x0'])):
  match=next((line for line in reversed(lines[-4:]) if abs(line[0]-w['top'])<3),None)
  if match:match[1].append(w)
  else:lines.append([w['top'],[w]])
 result=' '.join(' '.join(w['text'] for w in sorted(line[1],key=lambda x:x['x0'])) for line in lines)
 return re.sub(r'(?<=[A-Za-zÁÉÍÓÚÑáéíóúñ])-\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])','',clean(result))
records=[];qa=[]
for source in json.loads((DATA/'sources.json').read_text()):
 if source['kind']!='decision' or source['status']!='downloaded':continue
 path=DATA/'sources'/source['file'];cache=path.with_suffix('.pages.json')
 if not cache.exists():continue
 pages=json.loads(cache.read_text());status=None;subline='general';order=0
 for pg in pages:
  words=pg['words'];t=pg['text'];upper=norm(t[:700]);year=source['year'];fn=source['file']
  if pg.get('ocr'):continue # OCR is processed after explicit layout and financial validation.
  if 'ANEXO' in upper[:60]:
   if 'NO ELEGIBLES' in upper:status='no_elegible'
   elif 'DESISTIDOS' in upper:status='desistida'
   elif 'ANULADAS' in upper:status='anulada'
   elif 'SIN CREDITO' in upper or 'SIN DISPONIBILIDAD' in upper:status='lista_espera'
   elif 'ELEGIBLES' in upper and ('CON CREDITO' in upper or 'CON DISPONIBILIDAD' in upper):status='concedida'
   subline='activos_tipo_2' if 'ACTIVOS TIPO 2' in upper else 'general'
  if year==2022:
   if 'LINEA VERDE' in norm(t):status='concedida';subline='verde'
   if 'LINEA DIGITAL' in upper:status='concedida';subline='digital'
   if 'LINEA MIXTA' in upper:status='concedida';subline='mixta'
   if 'SEGUNDO. - DENEGAR' in norm(t):status='no_elegible'
   if 'TERCERO.' in norm(t) and 'DESIST' in norm(t):status='desistida'
  if fn=='2026_decision_8996b7809c.pdf' and pg['page']==3:status='concedida'
  anchors=[]
  for w in words:
   s=w['text'].strip('|')
   if ID.fullmatch(s):
    # Exclude mentions in prose: require a numeric financial row or a left-aligned table cell.
    y=(w['top']+w['bottom'])/2
    same=[x for x in words if x['x0']>w['x1'] and abs((x['top']+x['bottom'])/2-y)<4 and MONEY.fullmatch(x['text'])]
    if w['x0']<pg['width']*.45 and (same or ('ANEXO' in norm(t[:120]) or status in ['no_elegible','desistida','anulada'])):
     anchors.append(w)
  if not anchors or status is None:continue
  anchors.sort(key=lambda w:w['top'])
  # The column boundaries come from the actual table headers and numeric cells.
  first=anchors[0];name_left=max(w['x1'] for w in anchors)+4
  financial=status in ['concedida','lista_espera']
  headername=next((w for w in words if w['text'] in ['SOLICITANTE','EMPRESA','NOMBRE'] and w['top']<first['top']),None)
  if not headername:qa.append(dict(file=fn,page=pg['page'],issue='no_name_header'));continue
  nums=[w for w in words if MONEY.fullmatch(w['text']) and w['x0']>name_left+50 and w['top']>=first['top']-3]
  if financial and nums:name_right=min(w['x0'] for w in nums)-4
  else:
   reasonheader=[w for w in words if 'MOTIVO' in w['text'].upper() and w['top']<first['top']]
   name_right=(headername['x0']+headername['x1'])/2+85
   # Most noneligible tables have the reason beginning near x=370.
   reason_starts=[x['x0'] for x in words if x['top']>=first['top']-8 and x['text'] in ['Dispositivo','Dispositivos','Desiste','Renuncia','Presenta','Por','Se'] and x['x0']>name_left+35]
   if reason_starts:name_right=collections.Counter(round(x) for x in reason_starts).most_common(1)[0][0]-1
  centers=[(w['top']+w['bottom'])/2 for w in anchors]
  for i,w in enumerate(anchors):
   cy=centers[i];lo=(centers[i-1]+cy)/2 if i else w['top']-17;hi=(cy+centers[i+1])/2 if i+1<len(centers) else w['bottom']+18
   band=[x for x in words if lo<(x['top']+x['bottom'])/2<hi]
   company=text([x for x in band if x['x0']>=name_left-1 and x['x0']<name_right])
   if not company:qa.append(dict(file=fn,page=pg['page'],id=w['text'],issue='empty_company'))
   numeric=sorted([x for x in words if x['x0']>name_right and abs((x['top']+x['bottom'])/2-cy)<4 and (MONEY.fullmatch(x['text']) or re.fullmatch(r'\d+',x['text']))],key=lambda x:x['x0'])
   values=[num(x['text']) for x in numeric]
   row=dict(record_id=hashlib.sha256(f"{fn}:{pg['page']}:{i}:{w['text']}".encode()).hexdigest()[:24],year=year,line=source['line'],subline=subline,case_id=w['text'],beneficiary=company,project_title='',status=status,investment_reference=None,reference_basis='solicitada',eligible_budget=None,score=None,minimis_amount=None,rgec_amount=None,amount=None,reason='',source_file=fn,source_page=pg['page'],source_url=source.get('resolved_url',source['url'])+f"#page={pg['page']}",source_sha256=source['sha256'],extraction='pdf_text',financial_validated=False)
   if financial:
    if year>=2023 and len(values)==6:
     row.update(zip(['investment_reference','score','eligible_budget','minimis_amount','rgec_amount','amount'],values))
     if year in [2023,2024] and status=='concedida':row['reference_basis']='evaluada_preevaluacion'
    elif year==2023 and status=='lista_espera' and len(values)==1:row['score']=values[0]
    elif year==2022 and len(values) in [6,8]:
     keys=['investment_reference','eligible_budget','amount','score','minimis_amount','rgec_amount'] if len(values)==6 else ['investment_reference','eligible_budget','amount','score','green_amount','digital_amount','minimis_amount','rgec_amount']
     row.update(zip(keys,values))
    else:qa.append(dict(file=fn,page=pg['page'],id=w['text'],issue='numeric_columns',values=values))
    if row['amount'] is not None:
     row['financial_validated']=abs(row['minimis_amount']+row['rgec_amount']-row['amount'])<.02
     if not row['financial_validated']:qa.append(dict(file=fn,page=pg['page'],id=w['text'],issue='tranche_sum',values=values))
   else:row['reason']=text([x for x in band if x['x0']>=name_right])
   if fn=='2025_decision_e18d974c0d.pdf' and row['case_id']=='0192/2025/TDII' and any(r['source_file']==fn and r['case_id']==row['case_id'] for r in records):row['status']='lista_espera'
   records.append(row)
(DATA/'extracted-records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
(DATA/'extraction-qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
print('Records',len(records),'QA',len(qa));print(collections.Counter((r['year'],r['status']) for r in records));print(json.dumps(qa[:20],ensure_ascii=False,indent=2))
