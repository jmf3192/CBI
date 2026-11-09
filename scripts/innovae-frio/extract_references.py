"""Extract the five DECA annexes; fail on changed row structure/counts. Requires pypdf==6.10.0."""
import csv, hashlib, json, re
from pathlib import Path
from pypdf import PdfReader
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'Dats proyecto B/Fuentes/resoluciones_historicas_innovae_frio'
OUT = ROOT / 'cbi/data/innovae-frio'
EXPECTED = {'01_andalucia_DECA_01.pdf': 7, '02_catalunya_DECA_01.pdf':179,
            '02_catalunya_DECA_02.pdf':87, '02_catalunya_DECA_03.pdf':17, '03_murcia_DECA_01.pdf':30}
CLASS = json.loads((Path(__file__).with_name('classification.json')).read_text())
urls = dict(re.findall(r'\| \[([^]]+\.pdf)\].*?\[Original\]\(([^)]+)\)', (RAW/'00_INDICE.md').read_text()))
pattern = re.compile(r'FN-PGESI-\s*(?:AND|CAT|MUR)-\s*\d{6}-\s*\d{6}')
num = r'(\d[\d.]*(?:,\d{1,2})?)'
tail = re.compile(r'\s+' + r'\s+'.join([num]*4) + r'\s*$')
rows=[]
for filename, count in EXPECTED.items():
    found=[]
    for p,page in enumerate(PdfReader(RAW/filename).pages,1):
        text=re.split(r'CVS:|CSV:', page.extract_text())[0]
        matches=list(pattern.finditer(text))
        for i,m in enumerate(matches):
            raw=' '.join(text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].split())
            values=tail.search(raw)
            assert values, (filename,p,raw)
            pre=raw[:values.start()].strip()
            nif=re.search(r'\b[A-Z]\d{7}[A-Z\d]\b',pre)
            assert nif, (filename,p,pre)
            regional,beneficiary=pre[:nif.start()].strip().split(maxsplit=1)
            cost,aid,tep,co2=[float(n.replace('.','').replace(',','.')) for n in values.groups()]
            key=re.sub(r'\s','',m.group())
            group,reason=CLASS.get(key,['fuera_muestra','El título no permite identificar una actuación frigorífica comparable; no se usa para generar.'])
            row=dict(id=key,regional=regional,beneficiary=beneficiary,title=pre[nif.end():].strip(),cost=cost,
                grantedAid=aid,savingTep=tep,savingKwh=round(tep*11630,2),co2Avoided=co2,
                group=group,classificationReason=reason,powerKw=None,savingPct=None,technicalEligibility='desconocida',
                pdf=filename,page=p,sourceUrl=urls[filename],sourceSha256=hashlib.sha256((RAW/filename).read_bytes()).hexdigest())
            assert cost>0 and tep>0 and 0<=aid<=cost, row
            found.append(row)
    assert len(found)==count,(filename,len(found))
    rows.extend(found)
assert len(rows)==len({r['id'] for r in rows})==320
assert not (set(CLASS)-{r['id'] for r in rows})
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'references.json').write_text(json.dumps({'version':'2.0.0','records':rows},ensure_ascii=False,indent=2)+'\n')
with (OUT/'referencias_observadas.csv').open('w',newline='',encoding='utf-8-sig') as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter=';',lineterminator='\n');writer.writeheader();writer.writerows(rows)
manifest=[]
for file in sorted(RAW.glob('*.pdf')):
    manifest.append(dict(file=file.name,url=urls[file.name],sha256=hashlib.sha256(file.read_bytes()).hexdigest(),pages=len(PdfReader(file).pages)))
(OUT/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(json.dumps({'records':len(rows),'groups':dict(Counter(r['group'] for r in rows)), 'usable':dict(Counter(r['group'] for r in rows if r['cost']>=100000)), 'pdfs':len(manifest)},ensure_ascii=False))
