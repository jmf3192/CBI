"""Checks attribution boundaries and original award totals against the published base."""
from pathlib import Path
import collections, csv, json, subprocess, sys, unittest
sys.path.insert(0, str(Path(__file__).resolve().parent))
from enrich_history import norm, parse_article49
ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'cbi/data/paid-aragon'


class EnrichmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads((D / 'history.json').read_text())['projects']
        cls.previous = json.loads(subprocess.check_output(['git', 'show', 'HEAD:cbi/data/paid-aragon/history.json'], cwd=ROOT))['projects']

    def test_financial_and_administrative_fields_are_unchanged(self):
        before = {r['id']: r for r in self.previous}
        self.assertEqual(len(self.rows), len(before))
        for row in self.rows:
            for key in ['case_id','year','line','status','score','eligible_budget','granted_amount','waiting_amount','minimis_amount','rgec_amount']:
                self.assertEqual(row[key], before[row['id']][key], (row['case_id'], key))

    def test_project_attribution_is_separate_from_company_references(self):
        for row in self.rows:
            e = row['enrichment']
            self.assertEqual(bool(row['project_description']), bool(e['project_operations']))
            for op in e['project_operations']:
                self.assertEqual((op['year'], op['line']), (row['year'], row['line']))
                self.assertEqual(row['status'], 'concedida')
                self.assertIn(norm(row['beneficiary']), [norm(op['operation_name']), norm(op['beneficiary'])])
            if row['year'] == 2026:
                self.assertFalse(e['project_operations'])
                self.assertEqual(row['province'], '')

    def test_inconsistent_source_identity_is_never_used_as_a_nif(self):
        conflicting = [op for op in parse_article49() if not op['beneficiary_identity_consistent']]
        self.assertGreater(len(conflicting), 100)
        self.assertTrue(all(op['nif'] == '' and op['source_warning'] for op in conflicting))
        for row in self.rows:
            for op in row['enrichment']['project_operations']:
                if op.get('source_warning'):
                    self.assertEqual(norm(row['beneficiary']), norm(op['operation_name']))
            self.assertFalse(row['nif'].startswith('ES'), 'FEDER beneficiary identifiers are not NIFs')

    def test_old_operation_costs_are_not_added_as_awards(self):
        with (D / 'operaciones_feder_2017_2022.csv').open(encoding='utf-8-sig',newline='') as f:
            operations = list(csv.DictReader(f))
        self.assertEqual(len(operations), 1045)
        self.assertEqual(sum(float(p['granted_amount']) for p in self.rows), 76309941)
        self.assertEqual(sum(2017 <= int(o['year']) <= 2020 for o in operations), 310)
        self.assertTrue(all('granted_amount' not in o for o in operations))


if __name__ == '__main__':
    unittest.main()
