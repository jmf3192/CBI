"""Download official TDI/IDIS sources with a reproducible source manifest."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
import requests,json,hashlib,re,time,gzip
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'cbi/data/paid-aragon/sources'; OUT.mkdir(parents=True,exist_ok=True)
class Portal(HTMLParser):
 def __init__(self):super().__init__();self.heading=None;self.h=[];self.url=None;self.text=[];self.section='';self.year=None;self.links=[]
 def handle_starttag(self,t,a):
  if t in ('h2','h3'):self.heading=t;self.h=[]
  if t=='a':self.url=dict(a).get('href');self.text=[]
 def handle_data(self,s):
  if self.heading:self.h.append(s)
  if self.url:self.text.append(s)
 def handle_endtag(self,t):
  if t==self.heading:
   title=' '.join(' '.join(self.h).split());self.heading=None
   if title.startswith('Ayudas ') or title.startswith('Legislación'):self.section=title;self.year=None
   m=re.search(r'Convocatoria (20\d\d)',title)
   if m:self.year=int(m[1])
  if t=='a' and self.url:
   title=' '.join(' '.join(self.text).split());url=urljoin('https://www.aragon.es',self.url).replace('http:','https:')
   if self.year and ('Transformación y Desarrollo Industrial' in self.section or 'Industria Digital, Innovadora y Sostenible' in self.section) and ('boa.aragon' in url or '/documents/' in url):
    if any(k in title.lower() for k in ['orden','propuesta','criterios']):self.links.append(dict(year=self.year,line='TDI-FEDER' if 'Transformación' in self.section else 'IDIS-REACT',title=title,url=url))
   self.url=None
if not (OUT/'portal.html').exists():(OUT/'portal.html').write_bytes(gzip.decompress((OUT/'portal.html.gz').read_bytes()))
p=Portal();p.feed((OUT/'portal.html').read_text());seen=set();manifest=[]
extras=json.loads((ROOT/'scripts/paid-aragon/extra-sources.json').read_text())
for item in p.links+extras:
 if item['url'] in seen:continue
 seen.add(item['url'])
 title=item['title'].lower();kind=item.get('kind') or 'guide' if 'criterios' in title else 'provisional' if 'propuesta' in title else 'call' if 'boa.aragon' in item['url'] else 'decision'
 filename=f"{item['year']}_{kind}_{hashlib.sha256(item['url'].encode()).hexdigest()[:10]}.pdf"
 dest=OUT/filename
 try:
  if not dest.exists():
   r=requests.get(item['url'],timeout=60);r.raise_for_status()
   if not r.content.startswith(b'%PDF'):raise ValueError(f'Not PDF: {r.headers.get("content-type")}')
   dest.write_bytes(r.content)
  item.update(kind=kind,file=filename,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,status='downloaded')
 except Exception as e:item.update(kind=kind,file=filename,status='error',error=str(e))
 manifest.append(item);print(item['year'],kind,item['status'],filename,flush=True)
 (OUT.parent/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
