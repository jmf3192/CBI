"""OCR the scanned 2021 decision using macOS Vision. Requires ocr.swift compiled."""
from pathlib import Path
from pypdf import PdfReader,PdfWriter
import subprocess,json
root=Path(__file__).resolve().parents[2]/'cbi/data/paid-aragon/sources'
p=root/'2021_decision_946fb3742a.pdf';reader=PdfReader(p);writer=PdfWriter()
for i,page in enumerate(reader.pages):
 if 2<=i<=13:page.rotate(90)
 writer.add_page(page)
tmp=Path('/tmp/paid-ocr');tmp.mkdir(exist_ok=True)
with (tmp/'2021-rotated.pdf').open('wb') as f:writer.write(f)
pages=[]
for i in range(len(reader.pages)):
 num=i+1;prefix=tmp/f'ocr-{num}';img=Path(str(prefix)+f'-{num:02}.png');out=tmp/f'ocr-{num}.json'
 if not out.exists():
  subprocess.run(['pdftoppm','-f',str(num),'-l',str(num),'-scale-to','3000','-png',str(tmp/'2021-rotated.pdf'),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  w,h=(842,595) if 2<=i<=13 else (595,842)
  with out.open('w') as f:subprocess.run([str(tmp/'recognize'),str(img),str(w),str(h)],stdout=f,check=True)
  img.unlink(missing_ok=True)
 words=json.loads(out.read_text());w,h=(842,595) if 2<=i<=13 else (595,842)
 words.sort(key=lambda x:(round(x['top']/4),x['x0']))
 pages.append(dict(page=num,width=w,height=h,words=words,text=' '.join(w['text'] for w in words),ocr=True))
 print('OCR page',num,len(words),flush=True)
p.with_suffix('.pages.json').write_text(json.dumps(pages,ensure_ascii=False))
