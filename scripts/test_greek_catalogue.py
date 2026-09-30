import unittest
from quote_sources import source_catalogue
from validate_translation import ROOT, read_catalogue, validate


class GreekCatalogueTests(unittest.TestCase):
    def test_drafts_also_satisfy_published_structure(self):
        rows = read_catalogue(ROOT / 'quotes/quotes.el-GR.csv', require_source=True)
        self.assertEqual(validate(source_catalogue(ROOT / 'quotes'),
                                  [{**row, 'Draft': 'false'} for row in rows]), [])
