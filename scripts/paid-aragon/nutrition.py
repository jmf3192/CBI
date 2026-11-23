"""Reviewed nutrition classifications shared by canonical and legacy rebuilds.

Corporate evidence describes the beneficiary; only explicit case overrides
describe a particular project. Unverified food-specific names stay provisional.
"""
from pathlib import Path
import json
import re
import unicodedata

DIRECTORY = Path(__file__).resolve().parent
RULES = json.loads((DIRECTORY / 'nutrition-rules.json').read_text())
OVERRIDES = json.loads((DIRECTORY / 'nutrition-project-overrides.json').read_text())
NUTRITION_SECTORS = {'fertilizantes', 'nutricion_animal', 'nutricion_humana'}


def classify_nutrition(row):
    company = ''.join(c for c in unicodedata.normalize('NFD', row['beneficiary'].upper()) if unicodedata.category(c) != 'Mn')
    # Two OCR rows merge multiple companies; do not assign their full amounts
    # to one food producer without resolving the original source first.
    if company in {'JAMONES EUTIQUIO, S.L. INSTALACIONES Y MONTAJES',
                   'CARNES, S.L.U. SOLUCIONES MULTIPLEXADAS DE INGENIERIA, S.L.'}:
        return row
    override = OVERRIDES.get(str(row['year']) + '|' + row['case_id'])
    rule = override or next((r for r in RULES if re.search(r['pattern'], company)), None)
    if rule:
        row.update(sector=rule['sector'], sector_confidence=rule['confidence'],
                   sector_basis=rule['basis'], sector_source_url=rule['url'] or row['source_url'])
        if row.get('record_type') == 'feder_operation':
            row['sector_scope'] = 'project' if override else 'entity'
            row['sector_evidence_urls'] = list(dict.fromkeys([row['source_url'], row['sector_source_url']]))
    return row
