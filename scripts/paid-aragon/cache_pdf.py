from pathlib import Path
import pdfplumber,json
root=Path(__file__).resolve().parents[2]/'cbi/data/paid-aragon'
for s in json.loads((root/'sources.json').read_text()):
 p=root/'sources'/s['file'];out=p.with_suffix('.pages.json')
 if out.exists() or s['kind'] not in ('decision','provisional'):continue
 with pdfplumber.open(p) as pdf:
  data=[dict(page=i+1,width=page.width,height=page.height,text=page.extract_text() or '',words=[w for w in page.extract_words(x_tolerance=2) if w['upright']]) for i,page in enumerate(pdf.pages)]
 out.write_text(json.dumps(data,ensure_ascii=False));print(p.name,len(data),flush=True)
