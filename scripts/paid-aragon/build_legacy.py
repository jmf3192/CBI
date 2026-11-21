"""Expose 2017–2020 FEDER operations without turning costs into PAIP awards."""
from pathlib import Path
import collections, csv, hashlib, json, re, unicodedata

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'cbi/data/paid-aragon'


def export(name, rows):
    keys = list(dict.fromkeys(k for row in rows for k in row))
    with (D / name).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else '\r\n'.join(line.rstrip() for line in v.replace('\r\n', '\n').split('\n')) if isinstance(v, str) else v for k, v in row.items()})


def run():
    archive = json.loads((D / 'history.json').read_text())
    with (D / 'operaciones_feder_2017_2022.csv').open(encoding='utf-8-sig', newline='') as f:
        operations = [row for row in csv.DictReader(f) if 2017 <= int(row['year']) <= 2020]
    overrides = json.loads((ROOT / 'scripts/paid-aragon/legacy-sector-overrides.json').read_text())
    rules = json.loads((ROOT / 'scripts/paid-aragon/sector-rules.json').read_text())
    rows = []
    source_hashes = {file: hashlib.sha256((D / 'sources' / file).read_bytes()).hexdigest() for file in {op['source_file'] for op in operations}}
    for operation in operations:
        op = dict(operation)
        op['year'] = int(op['year'])
        op['source_page'] = int(op['source_page'])
        for k in ['feder_operation_cost', 'eu_cofinancing_percent']:
            op[k] = float(op[k]) if op[k] != '' else None
        company = ''.join(c for c in unicodedata.normalize('NFD', op['beneficiary'].upper()) if unicodedata.category(c) != 'Mn')
        classification = next((r for r in rules if re.search(r['pattern'], company)), None)
        override = overrides.get(op['operation_code'])
        sector = override['sector'] if override else classification['sector'] if classification else 'otros'
        basis = override['basis'] if override else classification['basis'] if classification else 'Sin clasificación sectorial específica.'
        sector_url = (override['url'] if override else classification['url'] if classification else '') or (op['source_url'] if sector != 'otros' else '')
        row = dict(id='feder-' + op['operation_code'], record_type='feder_operation', year=op['year'],
            line='FEDER · antecedente', source_line=op['line'], case_id=op['operation_code'], operation_code=op['operation_code'],
            beneficiary=op['beneficiary'], project_title='', project_description=op['description'],
            province=op['province'], municipality=op['municipality'], project_start_dates=op['start_date'], project_end_dates=op['end_date'],
            status='operacion_feder', score=None, granted_amount=None, eligible_budget=None, investment_reference=None,
            waiting_amount=None, minimis_amount=None, rgec_amount=None, nif='',
            feder_operation_cost=op['feder_operation_cost'], eu_cofinancing_percent=op['eu_cofinancing_percent'],
            sector=sector, sector_confidence='confirmado_proyecto' if override else classification['confidence'] if classification else 'sin_clasificar',
            sector_scope='project' if override else 'entity', sector_basis=basis, sector_source_url=sector_url,
            sector_evidence_urls=list(dict.fromkeys([op['source_url']] + ([sector_url] if sector_url else []))),
            source_url=op['source_url'], source_file=op['source_file'], source_page=op['source_page'],
            source_sha256=source_hashes[op['source_file']],
            notes='Operación FEDER publicada; su coste no equivale a ayuda concedida ni acredita un expediente PAIP completo.',
            operation=op)
        rows.append(row)
    rows.sort(key=lambda row: (-row['year'], row['operation_code']))
    assert len(rows) == 310 and len({row['id'] for row in rows}) == len(rows)
    summary = dict(as_of='2026-11-21', records=len(rows), annual_counts=dict(sorted(collections.Counter(r['year'] for r in rows).items())),
        sector_records=sum(r['sector'] in ['fertilizantes', 'nutricion_animal'] for r in rows),
        note='Cobertura parcial de operaciones FEDER 2017–2020, separadas de los expedientes PAIP y de sus ayudas concedidas.')
    (D / 'legacy-history.json').write_text(json.dumps(dict(summary=summary, records=rows), ensure_ascii=False, separators=(',', ':')))
    for year in range(2017, 2021):
        export(f'historico_{year}.csv', [r for r in rows if r['year'] == year])
    combined = sorted(archive['projects'] + rows, key=lambda row: (-row['year'], row['case_id']))
    export('todos_registros_2017_2026.csv', combined)
    export('sectores_prioritarios.csv', [r for r in combined if r['sector'] in ['fertilizantes', 'nutricion_animal']])
    print(json.dumps(summary, ensure_ascii=False))
    return rows


if __name__ == '__main__':
    run()
