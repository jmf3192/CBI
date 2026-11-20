"""Traceable FEDER enrichment; never changes grant amounts or creates PAIP awards.

Rebuild: python3 scripts/paid-aragon/enrich_history.py
The dated official PDF is authoritative. Matching requires a unique beneficiary,
year/programme and reconciliation of all operation costs with the PAIP grant.
FEDER beneficiary identifiers are NOT tax identifiers.
"""
from pathlib import Path
import bisect, collections, csv, hashlib, json, re, unicodedata
from datetime import datetime, timezone
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'cbi/data/paid-aragon'
PDF = 'feder-aragon-2014-2020-20250529.pdf'
URL = 'https://www.dgfc.sepg.hacienda.gob.es/sitios/dgfc/es-ES/loFEDER1420/porFEDER/Documents/LO-AR.pdf'


def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


def norm(s):
    s = ''.join(c for c in unicodedata.normalize('NFD', s.upper()) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'SOCIEDAD\s+ANONIMA', 'SA', s)
    s = re.sub(r'SOCIEDAD\s+LIMITADA', 'SL', s)
    s = re.sub(r'[^A-Z0-9]', '', s)
    return re.sub(r'SLU$', 'SL', s)


def export(name, rows):
    if not rows:
        return
    keys = list(dict.fromkeys(k for r in rows for k in r))
    with (D / name).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else '\r\n'.join(line.rstrip() for line in v.replace('\r\n', '\n').replace('\r', '\n').split('\n')) if isinstance(v, str) else v for k, v in row.items()})


def parse_operations():
    cache = D / 'sources' / (PDF + '.txt')
    offsets_file = D / 'sources' / (PDF + '.pages.json')
    if not cache.exists():
        chunks = [p.extract_text() or '' for p in PdfReader(D / 'sources' / PDF).pages]
        offsets, at = [], 0
        for t in chunks:
            offsets.append(at)
            at += len(t) + 1
        cache.write_text('\n'.join(chunks))
        offsets_file.write_text(json.dumps(offsets))
    content = cache.read_text()
    offsets = json.loads(offsets_file.read_text())
    starts = list(re.finditer('Programa_operativo-Operational_Programme:', content))
    rows = []
    for i, match in enumerate(starts):
        text = content[match.start():starts[i + 1].start() if i + 1 < len(starts) else len(content)]
        if 'INDUSTRIA' not in text.split('Beneficiario-Beneficiary:')[0]:
            continue
        def field(label, end):
            m = re.search(re.escape(label) + r'\s*(.*?)\s*' + re.escape(end), text, re.S)
            return clean(m.group(1)) if m else ''
        operation = field('Operación:', 'Operation:')
        m = re.match(r'([DV]?)(20\d\d)(\d+)\s+(.+)', operation)
        if not m:
            continue
        beneficiary = field('Beneficiario-Beneficiary:', 'Operación:')
        bm = re.match(r'(ES\w+)\s+(.+)', beneficiary)
        cost = field('Coste_total_subvencionable-Total_elegible_cost:', 'Cofinanciación_ue-Cofinancing_rates:')
        rate = field('Cofinanciación_ue-Cofinancing_rates:', 'Localizaciones:')
        municipality = field('Municipio-Municipality:', 'Código_postal-Operation_postcode:')
        location = field('Localizaciones:', 'Municipio-Municipality:')
        province = next((p for p in ['Huesca', 'Teruel', 'Zaragoza'] if p.lower() in location.lower()), '')
        page = bisect.bisect_right(offsets, match.start())
        rows.append(dict(operation_code=m.group(1)+m.group(2)+m.group(3), year=int(m.group(2)), line='IDIS-REACT' if m.group(1) else 'TDI-FEDER (antecedente)',
            beneficiary=bm.group(2) if bm else beneficiary, feder_beneficiary_id=bm.group(1) if bm else '',
            operation_name=m.group(4), description=field('Resumen:', 'Summary:'),
            start_date=field('Fecha_inicio-Operation_start_date:', 'Fecha_fin-Operation_end_date:'),
            end_date=field('Fecha_fin-Operation_end_date:', 'Coste_total_subvencionable-Total_elegible_cost:'),
            feder_operation_cost=float(cost.replace('.', '').replace(',', '.')) if re.fullmatch(r'[\d.,]+', cost) else None,
            eu_cofinancing_percent=float(rate.replace(',', '.')) if re.fullmatch(r'[\d.,]+', rate) else None,
            province=province, municipality=re.sub(r'^\d+\s+', '', municipality), municipality_code=municipality.split(' ')[0] if municipality else '',
            intervention=field('Campos_intervención:', 'Tipos_financiación:'),
            source_url=URL+f'#page={page}', source_file=PDF, source_page=page, source_updated='2025-05-29'))
    assert len({r['operation_code'] for r in rows}) == len(rows), 'Duplicate operation code'
    return rows


REPORT_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNjk4NmRmZjctMzg5Yi00OTQxLTg2ZjgtNTc2NWUyN2I2ZTRjIiwidCI6IjEwNmQ2ZDMyLTU2ODktNGMwZi1hNTdkLTI2MzFmMWZkMWYyOCIsImMiOjl9'
REPORT_FILE = 'feder-aragon-2021-2027-20261001.json'


def parse_indicators():
    data = json.loads((D / 'sources/feder-aragon-indicadores-20261001.json').read_text())['results'][0]['result']['data']
    ds = data['dsr']['DS'][0]
    assert ds.get('IC') is True
    previous, schema, result = [], None, collections.defaultdict(list)
    for r in ds['PH'][0]['DM0']:
        schema = r.get('S', schema)
        cells, raw = iter(r.get('C', [])), []
        for i, column in enumerate(schema):
            raw.append(previous[i] if r.get('R', 0) & (1 << i) else None if r.get('Ø', 0) & (1 << i) else next(cells))
        row = {c['N']: ds['ValueDicts'][c['DN']][v] if isinstance(v, int) and 'DN' in c else v for c, v in zip(schema, raw)}
        previous = raw
        indicator = dict(code=row.get('G17'), name=row.get('G18'), unit=row.get('G19'), target=row.get('G20'), reported_achievement=row.get('M2'))
        if indicator['code'] and indicator not in result[row.get('G8')]:
            result[row.get('G8')].append(indicator)
    return result


def parse_article49():
    """Decode the public report's dictionary/repeat/null compression without summing indicator rows."""
    data = json.loads((D / 'sources' / REPORT_FILE).read_text())['results'][0]['result']['data']
    ds = data['dsr']['DS'][0]
    assert ds.get('IC') is True, 'Incomplete report extraction; pagination required'
    names = {v['Name']: v['Value'] for v in data['descriptor']['Select']}
    schema, previous, operations = None, [], []
    for r in ds['PH'][0]['DM0']:
        schema = r.get('S', schema)
        cells, raw = iter(r.get('C', [])), []
        for i, column in enumerate(schema):
            raw.append(previous[i] if r.get('R', 0) & (1 << i) else None if r.get('Ø', 0) & (1 << i) else next(cells))
        row = {c['N']: ds['ValueDicts'][c['DN']][v] if isinstance(v, int) and 'DN' in c else v for c, v in zip(schema, raw)}
        previous = raw
        def get(name):
            return row.get(names[name])
        code = get('g2.PROY_CODIGO') or ''
        match = re.match(r'TDI(20\d\d)\d+_[ME]_', code)
        if not match:
            continue
        def date(name):
            value = get(name)
            return datetime.fromtimestamp(value/1000, timezone.utc).strftime('%d/%m/%Y') if isinstance(value, (int, float)) else ''
        name = get('G2020_MFP_ORGANISMO Beneficiario.OR_NOMBRE_CONCATENADO') or ''
        location = get('G2020_MFP_OPERACION_V.Localización Operación') or ''
        operations.append(dict(operation_code=get('G2020_MFP_OPERACION.OP_CODIGO_INTERNO'), project_code=code,
            year=int(match[1]), line='TDI-FEDER', beneficiary=name.split('-', 1)[-1], feder_beneficiary_id=name.split('-', 1)[0],
            nif=(get('G2020_MFP_ORGANISMO_V Beneficiario.EL_NIF') or '') if re.fullmatch(r'[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]', get('G2020_MFP_ORGANISMO_V Beneficiario.EL_NIF') or '') else '', operation_name=get('G2020_MFP_OPERACION.OP_NOMBRE') or '',
            description=get('G2020_MFP_OPERACION.OP_DESCRIPCION') or '', start_date=date('G2020_MFP_OPERACION.OP_FECHA_INICIO_OPERCION'),
            end_date=date('G2020_MFP_OPERACION.OP_FECHA_FIN_OPERACION'), award_document_date=date('g1.OP_FECHA_DOC_APOYO'),
            feder_operation_cost=float(get('Sum(G2020_MFP_PROYECTO.PROY_PREVCOSTETOTAL_ADMIS_AYUDAFONDO)') or 0),
            eu_cofinancing_percent=round(float(get('Medidas.Porcentaje contribucion') or 0)*100, 4),
            province=next((p for p in ['Huesca', 'Teruel', 'Zaragoza'] if p in location), ''), municipality='',
            intervention=get('G2020_MFP_PROYECTO.PROY_ART49_AMBI_CONCATENADOS') or '',
            source_url=REPORT_URL, source_file=REPORT_FILE, source_updated='2026-10-01'))
    assert len({r['project_code'] for r in operations}) == len(operations)
    indicators = parse_indicators()
    for op in operations:
        op['indicators'] = indicators.get(op['operation_code'], [])
        op['beneficiary_identity_consistent'] = norm(op['beneficiary']) == norm(op['operation_name'])
        if not op['beneficiary_identity_consistent']:
            op['reported_nif'] = op['nif']
            op['nif'] = ''
            op['source_warning'] = 'El beneficiario y el nombre de la operación no coinciden en la fuente. No se utiliza el NIF de esta fila ni se vincula la actuación por el campo de beneficiario.'
    return operations


def run():
    archive = json.loads((D / 'history.json').read_text())
    projects = archive['projects']
    legacy_operations = parse_operations()
    recent_operations = parse_article49()
    operations = legacy_operations + recent_operations
    index = collections.defaultdict(list)
    for op in operations:
        for name in ({norm(op['operation_name'])} if op.get('project_code') else {norm(op['beneficiary']), norm(op['operation_name'])}):
            index[(op['year'], op['line'], name)].append(op)
    by_name = collections.defaultdict(list)
    for op in operations:
        for name in ({norm(op['operation_name'])} if op.get('project_code') else {norm(op['beneficiary']), norm(op['operation_name'])}):
            by_name[name].append(op)
    unique = collections.Counter((p['year'], p['line'], norm(p['beneficiary'])) for p in projects)
    for p in projects:
        key = (p['year'], p['line'], norm(p['beneficiary']))
        candidates = index.get(key, [])
        reconciled = bool(candidates) and all(op['feder_operation_cost'] is not None for op in candidates) and abs(sum(op['feder_operation_cost'] for op in candidates) - (p['granted_amount'] or 0)) <= 1
        linked = bool(candidates) and p['status'] == 'concedida' and unique[key] == 1 and (reconciled or p['year'] >= 2023)
        # Deterministic replacement allows safe repeated rebuilds.
        enrichment = dict(version=1, reviewed_at='2026-11-20', project_operations=candidates if linked else [],
            related_company_operations=[op for op in by_name.get(norm(p['beneficiary']), []) if op not in (candidates if linked else [])],
            match_method=('beneficiario exacto normalizado + anualidad + línea' + (' + importe conciliado (tolerancia 1 €)' if reconciled else '; importe FEDER conservado por separado')) if linked else '',
            feder_cost_reconciled_to_grant=reconciled if linked else None,
            scope_note='El coste de la operación FEDER no es la inversión subvencionable del proyecto. Las actuaciones de otros años son antecedentes de la empresa, no el proyecto de esta solicitud.')
        nifs = {op.get('nif') for op in by_name.get(norm(p['beneficiary']), []) if op.get('nif')}
        p['nif'] = next(iter(nifs)) if len(nifs) == 1 else ''
        enrichment['identity_sources'] = list(dict.fromkeys(op['source_url'] for op in by_name.get(norm(p['beneficiary']), []) if op.get('nif') == p['nif'] and p['nif']))
        p['enrichment'] = enrichment
        p['project_description'] = '\n\n'.join(dict.fromkeys(op['description'] for op in candidates if op['description'])) if linked else ''
        p['municipality'] = '; '.join(sorted(set(op['municipality'] for op in candidates if op['municipality']))) if linked else ''
        p['province'] = '; '.join(sorted(set(op['province'] for op in candidates if op['province']))) if linked else ''
        p['project_start_dates'] = '; '.join(sorted(set(op['start_date'] for op in candidates if op['start_date']))) if linked else ''
        p['project_end_dates'] = '; '.join(sorted(set(op['end_date'] for op in candidates if op['end_date']))) if linked else ''
        p['enrichment_source_urls'] = [op['source_url'] for op in candidates] if linked else []
        enrichment['fields'] = {k: p[k] for k in ['nif', 'project_description', 'municipality', 'province', 'project_start_dates', 'project_end_dates']}
        # Project titles are not invented from the beneficiary or summary.
    export('operaciones_feder_2017_2022.csv', legacy_operations)
    export('operaciones_feder_2023_2025.csv', recent_operations)
    export('historico_expedientes.csv', projects)
    for year in sorted(set(p['year'] for p in projects)):
        export(f'historico_{year}.csv', [p for p in projects if p['year'] == year])
    export('sectores_prioritarios.csv', [p for p in projects if p['sector'] in ['fertilizantes', 'nutricion_animal']])
    export('clasificacion_sectorial.csv', [p for p in projects if p['sector'] != 'otros'])
    coverage = []
    for year in sorted(set(p['year'] for p in projects)):
        ps = [p for p in projects if p['year'] == year]
        coverage.append(dict(year=year, projects=len(ps), with_project_description=sum(bool(p['project_description']) for p in ps),
            with_project_location=sum(bool(p['province']) for p in ps), with_nif=sum(bool(p['nif']) for p in ps), with_company_antecedents=sum(bool(p['enrichment']['related_company_operations']) for p in ps),
            note='Antecedentes de empresa separados del proyecto; datos no encontrados permanecen vacíos.'))
    export('cobertura_enriquecimiento.csv', coverage)
    archive['summary']['enrichment'] = dict(as_of='2026-11-20', operation_records=len(operations), coverage=coverage, legacy_coverage=[dict(year=y, operations=sum(op['year']==y for op in legacy_operations)) for y in sorted(set(op['year'] for op in legacy_operations))])
    for row in archive['summary']['coverage']:
        n = sum(op['year'] == row['year'] for op in legacy_operations)
        if row['year'] < 2021 and n:
            row['note'] = f'{n} operaciones FEDER complementarias recuperadas; no equivalen a expedientes ni concesiones PAIP.'
    export('cobertura.csv', archive['summary']['coverage'])
    (D / 'history.json').write_text(json.dumps(archive, ensure_ascii=False, separators=(',', ':')))
    (D / 'validation.json').write_text(json.dumps(archive['summary'], ensure_ascii=False, indent=2))
    sources = json.loads((D / 'sources.json').read_text())
    for file, url, title in [('feder-aragon-indicadores-20261001.json', REPORT_URL, 'Indicadores publicados FEDER Aragón; actualización 01/10/2026'), (REPORT_FILE, REPORT_URL, 'Operaciones TDI FEDER 2021–2027, actualización 01/10/2026'), (PDF, URL, 'Operaciones FEDER Aragón 2014–2020, actualización 29/05/2025'), ('feder-aragon-2014-2020.xlsx', URL.replace('LO-AR.pdf', 'LO-AR.xlsx'), 'Operaciones FEDER Aragón en Excel, actualización 07/03/2024')]:
        blob = (D / 'sources' / file).read_bytes()
        row = dict(year=2026 if file.endswith('.json') else 2020, line='FEDER · información complementaria', title=title, url=url, kind='enrichment', file=file, sha256=hashlib.sha256(blob).hexdigest(), bytes=len(blob), status='downloaded')
        sources = [s for s in sources if s.get('file') != file] + [row]
    for processing in json.loads((D / 'sources/feder-redactions.json').read_text()):
        for source in sources:
            if source.get('file') == processing['file']:
                source.update({k:v for k,v in processing.items() if k != 'file'})
    (D / 'sources.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2))
    export('fuentes.csv', sources)
    print(json.dumps(dict(operations=len(operations), coverage=coverage), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    run()
