from pathlib import Path
import json,re,hashlib,collections,os
D=Path(__file__).resolve().parents[2]/'cbi/data/paid-aragon'
source=next(s for s in json.loads((D/'sources.json').read_text()) if s['file']=='2021_decision_946fb3742a.pdf')
pages=json.loads(Path(os.environ.get('PAIP_OCR_PAGES',str((D/'sources'/source['file']).with_suffix('.pages.json')))).read_text())
prefix=os.environ.get('PAIP_OCR_PREFIX','')
def normal_id(s):
 m=re.search(r'(\d{4})/2021[/A-Za-z0-9]*',s)
 return m[1]+'/2021/IDIS' if m else None
def number(s,integer=False):
 s=s.strip('|:;€ ').replace('O','0').replace('l','1')
 if integer:
  return float(s) if re.fullmatch(r'\d{1,3}',s) else None
 s=re.sub(r'[Ll|]+$','',s)
 m=re.fullmatch(r'(\d[\d.,]*[.,]\d{2})',s)
 if m:return float(re.sub(r'[.,]','',s[:-3])+'.'+s[-2:])
 if re.fullmatch('0+',s):return 0.
 return None
def join(words):
 lines=[]
 for w in sorted(words,key=lambda w:(w['top'],w['x0'])):
  line=next((l for l in reversed(lines[-5:]) if abs(l[0]-w['top'])<4),None)
  if line:line[1].append(w)
  else:lines.append([w['top'],[w]])
 return ' '.join(' '.join(w['text'].strip('|') for w in sorted(l[1],key=lambda w:w['x0'])) for l in lines).strip()
rows=[];qa=[];subline='verde'
corrections=json.loads((D.parents[2]/'scripts/paid-aragon/ocr-corrections.json').read_text())
for pg in pages:
 pn=pg['page'];words=pg['words']
 if not 3<=pn<=22:continue
 anchors=[dict(w,case_id=normal_id(w['text'])) for w in words if normal_id(w['text']) and w['x0']<180]
 anchors.sort(key=lambda w:w['top']);centers=[(w['top']+w['bottom'])/2 for w in anchors]
 for i,w in enumerate(anchors):
  cy=centers[i];lo=(centers[i-1]+cy)/2 if i else w['top']-18;hi=(cy+centers[i+1])/2 if i<len(centers)-1 else w['bottom']+18
  band=[x for x in words if lo<(x['top']+x['bottom'])/2<hi]
  mixed=pn>12 or (pn==12 and cy>355)
  if pn>=15:mixed=False
  subline=('mixta' if mixed else 'digital' if pn>=6 else 'verde') if pn<15 else 'general'
  name_left=185 if mixed else 195 if pn<15 else 145
  name_right=320 if mixed else 365 if pn<15 else 255
  if pn==4 and w['case_id']=='0735/2021/IDIS':w['case_id']='0755/2021/IDIS'
  company=join([x for x in band if name_left<x['x0']<name_right and x['top']>60])
  row=dict(record_id=hashlib.sha256(f"{source['file']}:{pn}:{i}:{w['case_id']}".encode()).hexdigest()[:24],year=2021,line='IDIS-REACT',subline=subline,case_id=w['case_id'],beneficiary=company,project_title='',status='concedida' if pn<15 else 'no_elegible',investment_reference=None,reference_basis='solicitada',eligible_budget=None,score=None,minimis_amount=None,rgec_amount=None,amount=None,reason='',source_file=source['file'],source_page=pn,source_url=source['url']+f'#page={pn}',source_sha256=source['sha256'],extraction='ocr_vision',financial_validated=False)
  if pn<15:
   if mixed:bounds=[320,365,417,480,549,610,666,720,770];keys=['score','investment_reference','eligible_budget','amount','green_amount','digital_amount','minimis_amount','rgec_amount']
   else:bounds=[365,415,480,550,625,695,770];keys=['score','investment_reference','eligible_budget','amount','minimis_amount','rgec_amount']
   raw={}
   for j,key in enumerate(keys):
    candidates=[x for x in band if bounds[j]<=x['x0']<bounds[j+1] and number(x['text'],key=='score') is not None]
    candidates.sort(key=lambda x:abs((x['top']+x['bottom'])/2-cy))
    if candidates:row[key]=number(candidates[0]['text'],key=='score');raw[key]=candidates[0]['text']
   row['raw_financial_values']=json.dumps(raw,ensure_ascii=False)
   if row['case_id'] in corrections:
    row.update(corrections[row['case_id']]);row['correction_note']='Corrección contrastada visualmente con la página original; ver ocr-corrections.json'
   row['financial_validated']=all(row[k] is not None for k in ['amount','minimis_amount','rgec_amount']) and abs(row['amount']-row['minimis_amount']-row['rgec_amount'])<.02
   if not row['financial_validated']:qa.append(dict(page=pn,case_id=w['case_id'],values=raw))
  else:row['reason']=join([x for x in band if x['x0']>=name_right])
  rows.append(row)
(D/(prefix+'ocr-records.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2));(D/(prefix+'ocr-qa.json')).write_text(json.dumps(qa,ensure_ascii=False,indent=2))
print('OCR rows',len(rows),'financial QA',len(qa),collections.Counter(r['status'] for r in rows));print(json.dumps(qa[:12],ensure_ascii=False,indent=2))
