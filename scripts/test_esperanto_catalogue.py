import json
import unittest

from quote_sources import source_catalogue
from validate_translation import ROOT, read_catalogue, validate, is_draft


class EsperantoCatalogueTests(unittest.TestCase):
    def test_every_draft_preserves_identity_and_can_be_previewed(self):
        rows = read_catalogue(ROOT / 'quotes/quotes.eo.csv', require_source=True)
        source = source_catalogue(ROOT / 'quotes')
        # Preview readiness includes draft text, not just published-row validation.
        self.assertEqual(validate(source, [{**row, 'Draft': 'false'} for row in rows]), [])
        titles = {row['Id']: row['Title'] for row in source}
        self.assertTrue(all(row['Title'] == titles[row['Id']] for row in rows))

    def test_pending_catalogue_does_not_enable_the_language(self):
        rows = read_catalogue(ROOT / 'quotes/quotes.eo.csv')
        self.assertTrue(any(is_draft(row) for row in rows))
        self.assertTrue(any(not is_draft(row) for row in rows))
        enabled = json.loads((ROOT / 'src/strings/translations.json').read_text())
        self.assertNotIn('eo', enabled)

    def test_corrected_times_keep_minutes_and_before_after_meaning(self):
        from audit_translation_quality import clock_phrase
        rows = {row['Id']: row for row in read_catalogue(ROOT / 'quotes/quotes.eo.csv')}
        for identifier, expected in [('0030-001', 30), ('0745-000', 465),
                                     ('0845-002', 525), ('1044-000', 644),
                                     ('1110-000', 670), ('1605-000', 245),
                                     ('1807-000', 367), ('2005-000', 485),
                                     ('2206-001', 606), ('2310-003', 670),
                                     ('0114-000', 74), ('0131-000', 91),
                                     ('0415-000', 255), ('1214-000', 14),
                                     ('1315-000', 75), ('1929-000', 449),
                                     ('2027-000', 507), ('2205-000', 605),
                                     ('2235-001', 635)]:
            with self.subTest(identifier=identifier):
                self.assertEqual(clock_phrase(rows[identifier]['Quote time'], 'eo'), expected)
