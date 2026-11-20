from pathlib import Path
from datetime import datetime,timezone,timedelta
import json,uuid
ROOT=Path(__file__).resolve().parents[2];D=ROOT/'cbi/data/paid-aragon';M=ROOT/'cbi/supabase/migrations'
stamp=datetime.now(timezone.utc)
name=stamp.strftime('%Y%m%d%H%M%S')+'_extend_paid_aragon_2027.sql'
sql="""-- Extend the existing panel; retain PAID-ARAGON as the stable access code.
alter table public.paid_aragon_applications
 add column assessment jsonb not null default '{}'::jsonb check (jsonb_typeof(assessment)='object'),
 add column schema_version integer not null default 2;
alter table public.paid_aragon_awards
 add column import_key text unique,
 add column case_id text,
 add column line text,
 add column result_status text not null default 'concedida' check (result_status in ('concedida','lista_espera','no_elegible','desistida','anulada','renuncia_lista_espera')),
 add column score numeric(8,2),
 add column investment_reference numeric(14,2),
 add column waiting_amount numeric(14,2),
 add column sector text not null default 'otros' check (sector in ('otros','fertilizantes','nutricion_animal','revision_sectorial')),
 add column sector_confidence text not null default 'sin_clasificar',
 add column sector_basis text,
 add column sector_source_url text,
 add column source_file text,
 add column source_page integer,
 add column source_refs jsonb not null default '[]'::jsonb,
 add column extraction_method text,
 add column financial_validated boolean not null default false,
 add column notes text not null default '',
 add column dataset_date date;
create index paid_aragon_awards_sector_idx on public.paid_aragon_awards(sector);
comment on column public.paid_aragon_awards.granted_amount is 'Published grant; not a payment. Waiting-list amounts are in waiting_amount and must not be counted as grants.';
comment on column public.paid_aragon_awards.sector is 'Classification of beneficiary activity, not a verified description of the funded project.';
comment on column public.paid_aragon_applications.assessment is 'Private 2027 preflight inputs and criterion evidence references, versioned by the frontend rules.';
update public.calls set name='PAIP Aragón · TDI-FEDER',description='Solicitud TDI-FEDER 2027: elegibilidad, evaluación e históricos 2021–2026 con foco en fertilizantes y nutrición animal.' where code='PAID-ARAGON';
"""
(M/name).write_text(sql);files=[dict(file=str(M/name),name='extend_paid_aragon_2027')]
projects=json.loads((D/'history.json').read_text())['projects']
cols=['import_key','edition_id','case_id','beneficiary','project_title','province','eligible_budget','granted_amount','source_url','line','result_status','score','investment_reference','waiting_amount','sector','sector_confidence','sector_basis','sector_source_url','source_file','source_page','source_refs','extraction_method','financial_validated','notes','dataset_date']
def lit(x):
 if x is None:return 'null'
 if isinstance(x,bool):return 'true' if x else 'false'
 if isinstance(x,(int,float)):return str(x)
 return "'"+str(x).replace("'","''")+"'"
for n,offset in enumerate(range(0,len(projects),200),1):
 sql=''
 if n==1:
  for y in range(2021,2027):
   line='TDI-FEDER' if y>=2023 else 'IDIS-REACT'
   sql+=f"insert into public.paid_aragon_editions(year,title,source_url,notes) values ({y},'PAIP {y} · {line}','https://www.aragon.es/-/programa-ayudas-industria-pyme','Histórico oficial; consultar cobertura.csv y fuentes.csv para alcance y limitaciones.') on conflict(year) do update set title=excluded.title;\n"
 sql+='insert into public.paid_aragon_awards('+','.join(cols)+') values\n'
 values=[]
 for p in projects[offset:offset+200]:
  row=[p['id'],f"(select id from public.paid_aragon_editions where year={p['year']})",p['case_id'],p['beneficiary'],None,None,p['eligible_budget'],p['granted_amount'],p['source_url'],p['line'],p['status'],p['score'],p['investment_reference'],p['waiting_amount'],p['sector'],p['sector_confidence'],p['sector_basis'],p['sector_source_url'] or None,p['source_file'],p['source_page'],json.dumps(p['source_refs'],ensure_ascii=False,separators=(',',':')),p['extraction'],p['financial_validated'],p['notes'],'2026-11-20']
  values.append('('+','.join(x if i==1 else lit(x) for i,x in enumerate(row))+')')
 sql+=',\n'.join(values)+'\non conflict(import_key) do update set '+','.join(c+'=excluded.'+c for c in cols if c!='import_key')+';\n'
 filename=(stamp+timedelta(seconds=n)).strftime('%Y%m%d%H%M%S')+f'_seed_paid_aragon_history_{n:02}.sql'
 (M/filename).write_text(sql);files.append(dict(file=str(M/filename),name=f'seed_paid_aragon_history_{n:02}'))
(ROOT/'scripts/paid-aragon/migrations-to-apply.json').write_text(json.dumps(files,indent=2));print([(Path(x['file']).name,Path(x['file']).stat().st_size) for x in files])
