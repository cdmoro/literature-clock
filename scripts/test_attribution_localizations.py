"""Build-time attribution localization keeps quote data and JSON contracts stable."""
import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from generate_times import generate_catalogue, generate_catalogues
from attribution_localizations import read_attribution_localizations, resolve_attribution, attribution_entry, attribution_locales
from attribution_priorities import priorities
from native_quote_catalogues import build_native_catalogues
from validate_attributions import validate
from validate_translation import ROOT


class AttributionLocalizationTest(unittest.TestCase):
    def setUp(self):
        self.source = {
            'Id': '1200-000', 'Author': 'Jane Austen', 'Title': 'Pride and Prejudice',
        }
        self.target = {
            'Time': '12:00', 'Id': '1200-000', 'Quote time': '正午',
            'Quote': '正午に彼女は手紙を読んだ。', 'Title': 'machine translated title',
            'Author': 'Jane Austen', 'SFW': 'true', 'Source locale': 'en',
        }
        self.localizations = {
            'authors': {
                'Jane Austen': {
                    'ja-JP': {'value': 'ジェイン・オースティン', 'sources': ['https://example.org/author']},
                },
            },
            'works': {
                'Jane Austen': {
                    'Pride and Prejudice': {
                        'ja-JP': {'value': '高慢と偏見', 'sources': ['https://example.org/work']},
                    },
                },
            },
        }

    def write_target(self, path, target=None):
        target = target or self.target
        fields = list(target)
        with path.open('w', encoding='utf-8', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=fields, delimiter='|')
            writer.writeheader()
            writer.writerow(target)

    def test_generation_localizes_author_and_work_without_touching_quote(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'quotes.ja-JP.csv'
            self.write_target(source)
            output = root / 'times'
            generate_catalogue(source, output, source_rows={self.source['Id']: self.source},
                               localizations=self.localizations)
            row = json.loads((output / 'ja-JP/12_00.json').read_text(encoding='utf-8'))[0]

            self.assertEqual(row['title'], '高慢と偏見')
            self.assertEqual(row['author'], 'ジェイン・オースティン')
            self.assertEqual(row['title_original'], 'Pride and Prejudice')
            self.assertEqual(row['author_original'], 'Jane Austen')
            self.assertEqual(row['quote_time_case'], '正午')
            self.assertEqual(row['quote_first'] + row['quote_time_case'] + row['quote_last'],
                             self.target['Quote'])
            self.assertEqual(set(row), {
                'id', 'quote_time_case', 'quote_first', 'quote_last', 'title', 'author',
                'title_original', 'author_original', 'sfw',
            })

    def test_regional_attribution_fallback_is_independent_for_each_field(self):
        catalog = {
            'authors': {'Jane Austen': {'pt-PT': 'Autora base'}},
            'works': {'Jane Austen': {'Pride and Prejudice': {
                'pt-PT': 'Título base',
                'pt-BR': {'value': 'Título brasileiro', 'sources': ['https://example.org/br']},
            }}},
        }
        resolve = lambda locale: resolve_attribution(self.target, locale, {self.source['Id']: self.source}, catalog)
        self.assertEqual(resolve('pt-BR'),
                         ('Título brasileiro', 'Autora base', 'Pride and Prejudice', 'Jane Austen'))
        del catalog['works']['Jane Austen']['Pride and Prejudice']['pt-BR']
        self.assertEqual(resolve('pt-BR')[:2], ('Título base', 'Autora base'))
        del catalog['works']['Jane Austen']['Pride and Prejudice']['pt-PT']
        self.assertEqual(resolve('pt-BR')[:2], ('Pride and Prejudice', 'Autora base'))
        catalog['authors']['Jane Austen'] = {'pt-BR': 'Autora brasileira'}
        self.assertEqual(resolve('pt-BR')[:2], ('Pride and Prejudice', 'Autora brasileira'))
        # Neither reverse inheritance nor arbitrary same-language matching.
        self.assertEqual(resolve('pt-PT')[:2], ('Pride and Prejudice', 'Jane Austen'))
        self.assertEqual(resolve('pt-AO')[:2], ('Pride and Prejudice', 'Jane Austen'))

    def test_english_variant_uses_its_editorial_parent(self):
        catalog = {'authors': {}, 'works': {'Jane Austen': {'Pride and Prejudice': {
            'en-GB': 'British title', 'en-US': 'American title',
        }}}}
        resolve = lambda: resolve_attribution(self.target, 'en-US', {self.source['Id']: self.source}, catalog)
        self.assertEqual(resolve()[0], 'American title')
        del catalog['works']['Jane Austen']['Pride and Prejudice']['en-US']
        self.assertEqual(resolve()[0], 'British title')
        del catalog['works']['Jane Austen']['Pride and Prejudice']['en-GB']
        self.assertEqual(resolve()[0], 'Pride and Prejudice')

    def test_regional_coverage_and_priorities_include_inherited_forms(self):
        catalog = {'authors': {'Jane Austen': {'pt-PT': 'Jane Austen'}},
                   'works': {'Jane Austen': {'Pride and Prejudice': {'pt-PT': 'Orgulho e Preconceito'}}}}
        errors, authors, works = validate(catalog, [self.source], {'pt-PT'})
        self.assertEqual(errors, [])
        self.assertIn('pt-BR', authors['Jane Austen'])
        self.assertIn('pt-BR', works[('Jane Austen', 'Pride and Prejudice')])
        self.assertEqual(priorities([self.source], catalog, 'pt-BR'), ([], []))
        catalog['works']['Jane Austen']['Pride and Prejudice']['pt-BR'] = 'Título brasileiro'
        self.assertEqual(validate(catalog, [self.source], {'pt-PT'})[0], [])
        catalog['works']['Jane Austen']['Pride and Prejudice']['pt-AO'] = 'Unconfigured'
        self.assertTrue(any('unsupported locale pt-AO' in error
                            for error in validate(catalog, [self.source], {'pt-PT'})[0]))

    def test_regional_draft_preview_and_native_payload_resolve_the_same_forms(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'quotes').mkdir()
            (root / 'src/strings/common').mkdir(parents=True)
            (root / 'src/strings/common/translations.json').write_text(
                json.dumps({locale: {} for locale in ('en-GB', 'pt-PT', 'pt-BR')}))
            source = {**self.target, 'Quote': 'At noon, she read.', 'Quote time': 'noon',
                      'Author': 'Jane Austen', 'Title': 'Pride and Prejudice'}
            catalog = {'authors': {'Jane Austen': {'pt-PT': 'Jane Austen'}},
                       'works': {'Jane Austen': {'Pride and Prejudice': {
                           'pt-PT': 'Título base', 'pt-BR': 'Título brasileiro'}}}}
            (root / 'quotes/attribution-localizations.json').write_text(json.dumps(catalog))
            for locale in ('en-GB', 'pt-PT', 'pt-BR'):
                self.write_target(root / f'quotes/quotes.{locale}.csv', source)
            generate_catalogue(root / 'quotes/quotes.pt-BR.csv', root / 'times',
                               include_drafts=True, source_rows={source['Id']: source},
                               localizations=catalog)
            web = json.loads((root / 'times/pt-BR-draft/12_00.json').read_text())[0]
            native = build_native_catalogues(root)['pt-BR']['12:00'][0]
            for field in ('title', 'author', 'title_original', 'author_original'):
                self.assertEqual(web[field], native[field])
            self.assertEqual(web['title'], 'Título brasileiro')
            self.assertEqual(web['author'], 'Jane Austen')

    def test_brazilian_edition_exceptions_and_shared_corrected_titles(self):
        catalog = read_attribution_localizations(ROOT / 'quotes/attribution-localizations.json')
        for author, title, parent_title, brazilian_title in [
            ('David Mitchell', 'Cloud Atlas', 'Atlas das Nuvens', 'Atlas de nuvens'),
            ('David Foster Wallace', 'Infinite Jest', 'A Piada Infinita', 'Graça infinita'),
        ]:
            row = {'Id': 'test', 'Author': author, 'Title': title}
            self.assertEqual(resolve_attribution(row, 'pt-PT', {}, catalog)[0], parent_title)
            self.assertEqual(resolve_attribution(row, 'pt-BR', {}, catalog)[0], brazilian_title)
        for author, title in [('Virginia Woolf', 'Mrs. Dalloway'), ('Haruki Murakami', '1Q84')]:
            row = {'Id': 'test', 'Author': author, 'Title': title}
            self.assertNotIn('pt-BR', catalog['works'][author][title])
            self.assertEqual(resolve_attribution(row, 'pt-BR', {}, catalog)[0], title)

    def test_author_and_work_fallback_independently_to_original_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'quotes.ja-JP.csv'
            self.write_target(source)
            catalog = {
                'authors': {},
                'works': self.localizations['works'],
            }
            generate_catalogue(source, root / 'times', source_rows={self.source['Id']: self.source},
                               localizations=catalog)
            row = json.loads((root / 'times/ja-JP/12_00.json').read_text(encoding='utf-8'))[0]
            self.assertEqual(row['title'], '高慢と偏見')
            self.assertEqual(row['author'], 'Jane Austen')

    def test_work_fallback_does_not_prevent_author_localization(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'quotes.ja-JP.csv'
            self.write_target(source)
            catalog = {'authors': self.localizations['authors'], 'works': {}}
            generate_catalogue(source, root / 'times', source_rows={self.source['Id']: self.source},
                               localizations=catalog)
            row = json.loads((root / 'times/ja-JP/12_00.json').read_text(encoding='utf-8'))[0]
            self.assertEqual(row['title'], 'Pride and Prejudice')
            self.assertEqual(row['author'], 'ジェイン・オースティン')

    def test_output_is_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'quotes.ja-JP.csv'
            self.write_target(source)
            output = root / 'times'
            kwargs = {'source_rows': {self.source['Id']: self.source},
                      'localizations': self.localizations}
            generate_catalogue(source, output, **kwargs)
            first = (output / 'ja-JP/12_00.json').read_bytes()
            generate_catalogue(source, output, **kwargs)
            self.assertEqual((output / 'ja-JP/12_00.json').read_bytes(), first)

    def test_catalogue_pipeline_uses_canonical_source_records(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            quote_dir = root / 'quotes'
            quote_dir.mkdir()
            source = {
                'Time': '12:00', 'Id': '1200-000', 'Quote time': 'noon',
                'Quote': 'At noon, Elizabeth read the letter.', 'Title': 'Pride and Prejudice',
                'Author': 'Jane Austen', 'SFW': 'true', 'Source locale': 'en',
            }
            target = {
                **source, 'Quote time': '正午', 'Quote': '正午にエリザベスは手紙を読んだ。',
                'Title': 'unverified translated title', 'Author': 'unverified author form',
            }
            italian = {
                **source, 'Quote time': 'mezzogiorno',
                'Quote': 'A mezzogiorno Elizabeth lesse la lettera.',
                'Title': 'titolo non verificato', 'Author': 'forma autore non verificata',
            }
            for locale, row in [('en-GB', source), ('ja-JP', target), ('it-IT', italian)]:
                with (quote_dir / f'quotes.{locale}.csv').open('w', encoding='utf-8', newline='') as stream:
                    writer = csv.DictWriter(stream, fieldnames=list(source), delimiter='|')
                    writer.writeheader()
                    writer.writerow(row)
            output = root / 'times'
            validation_sources = {source['Id']: source, '1201-000': {
                **source, 'Id': '1201-000', 'Author': 'Mark Haddon',
                'Title': 'The Curious Incident of the Dog in the Night-Time',
            }}
            generate_catalogues(quote_dir, output, ROOT / 'src/strings/common/translations.json',
                                source_rows=validation_sources)

            japanese = json.loads((output / 'ja-JP/12_00.json').read_text(encoding='utf-8'))[0]
            self.assertEqual((japanese['title'], japanese['author']), ('高慢と偏見', 'ジェイン・オースティン'))
            self.assertEqual(japanese['quote_first'] + japanese['quote_time_case'] + japanese['quote_last'],
                             target['Quote'])
            italian_row = json.loads((output / 'it-IT/12_00.json').read_text(encoding='utf-8'))[0]
            self.assertEqual((italian_row['title'], italian_row['author']),
                             ('Orgoglio e pregiudizio', 'Jane Austen'))

    def test_high_priority_forms_generate_locally_and_keep_source_values(self):
        localizations = read_attribution_localizations(ROOT / 'quotes/attribution-localizations.json')
        cases = [
            ('ko-KR', 'F. Scott Fitzgerald', 'The Great Gatsby', '위대한 개츠비', 'F. 스콧 피츠제럴드'),
            ('ja-JP', 'Thomas Hoover', 'Project Cyclops', 'サイクロプス計画', 'トーマス・フーバー'),
            ('zh-CN', 'Thomas Hoover', 'Project Cyclops', '独眼巨人计划', '托马斯·胡佛'),
            ('fr-FR', 'Ken Kesey', 'One Flew Over the Cuckoo’s Nest',
             'Vol au-dessus d’un nid de coucou', 'Ken Kesey'),
        ]
        for locale, author, title, localized_title, localized_author in cases:
            with self.subTest(locale=locale, work=title), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                source = {'Id': '1200-000', 'Author': author, 'Title': title}
                target = {
                    'Time': '12:00', 'Id': '1200-000', 'Quote time': 'noon',
                    'Quote': 'At noon, the passage stays unchanged.', 'Title': title,
                    'Author': author, 'SFW': 'true', 'Source locale': 'en',
                }
                catalogue = root / f'quotes.{locale}.csv'
                self.write_target(catalogue, target)
                output = root / 'times'
                generate_catalogue(catalogue, output, source_rows={source['Id']: source},
                                   localizations=localizations)
                row = json.loads((output / f'{locale}/12_00.json').read_text(encoding='utf-8'))[0]
                self.assertEqual((row['title'], row['author']), (localized_title, localized_author))
                self.assertEqual((row['title_original'], row['author_original']), (title, author))
                self.assertEqual(row['quote_first'] + row['quote_time_case'] + row['quote_last'], target['Quote'])

    def test_priority_works_cover_every_non_english_locale(self):
        localizations = read_attribution_localizations(ROOT / 'quotes/attribution-localizations.json')
        locales = attribution_locales(json.loads((ROOT / 'src/strings/common/translations.json').read_text())) - {'en-GB', 'en-US'}
        for author, title in [
            ('Jane Austen', 'Pride and Prejudice'),
            ('Thomas Hoover', 'Project Cyclops'),
            ('Jeffrey Archer', 'Honor Among Thieves'),
            ('Ken Kesey', 'One Flew Over the Cuckoo’s Nest'),
        ]:
            with self.subTest(work=title):
                forms = localizations['works'][author][title]
                self.assertTrue(all(attribution_entry(forms, locale) is not None for locale in locales))

    def test_native_catalogue_builder_uses_the_same_localized_attributions(self):
        builders = []
        for name, path in [
            ('mac_native_build', ROOT / 'screensavers/macos-native/build.py'),
            ('windows_native_prepare', ROOT / 'screensavers/windows-native/prepare.py'),
        ]:
            spec = importlib.util.spec_from_file_location(name, path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            builders.append(module.catalogues())
        self.assertEqual(builders[0], builders[1])
        japanese = next(row for row in builders[1]['ja-JP']['03:00'] if row['id'] == '0300-030')
        self.assertEqual((japanese['title'], japanese['author']), ('高慢と偏見', 'ジェイン・オースティン'))
        self.assertEqual(set(japanese), {
            'id', 'first', 'time', 'last', 'title', 'author',
            'title_original', 'author_original', 'sfw',
        })
        project = next(row for row in builders[0]['ja-JP']['00:21'] if row['id'] == '0021-001')
        self.assertEqual((project['title'], project['author']), ('サイクロプス計画', 'トーマス・フーバー'))
        self.assertEqual((project['title_original'], project['author_original']), ('Project Cyclops', 'Thomas Hoover'))
        cuckoo = next(row for row in builders[0]['fr-FR']['13:00'] if row['id'] == '1300-009')
        self.assertEqual(cuckoo['title'], 'Vol au-dessus d’un nid de coucou')
        self.assertEqual(cuckoo['title_original'], 'One Flew Over the Cuckoo’s Nest')

    def test_registry_rejects_unknown_entities_and_non_https_sources(self):
        source_rows = [self.source]
        invalid = {
            'authors': {'Unknown Author': {'ja-JP': {'value': '名', 'sources': ['http://example.org']}}},
            'works': {},
        }
        errors, _, _ = validate(invalid, source_rows, {'ja-JP'})
        self.assertTrue(any('Unknown source author' in error for error in errors))
        self.assertTrue(any('HTTPS source' in error for error in errors))

    def test_reviewed_descriptive_form_can_have_no_external_source(self):
        localizations = {
            'authors': {'Jane Austen': {'ja-JP': 'ジェイン・オースティン'}},
            'works': {},
        }
        errors, _, _ = validate(localizations, [self.source], {'ja-JP'})
        self.assertEqual(errors, [])

    def test_hebrew_attribution_is_supported_when_the_locale_is_enabled(self):
        localizations = {
            'authors': {'Jane Austen': {'he-IL': 'ג׳יין אוסטן'}},
            'works': {},
        }
        errors, author_coverage, _ = validate(localizations, [self.source], {'ja-JP', 'he-IL'})
        self.assertEqual(errors, [])
        self.assertEqual(author_coverage['Jane Austen'], {'he-IL'})

    def test_plain_string_and_sourced_object_are_both_valid_and_resolve(self):
        forms = [
            'ジェイン・オースティン',
            {'value': 'ジェイン・オースティン', 'sources': ['https://example.org/author']},
        ]
        for form in forms:
            with self.subTest(form=form):
                catalog = {'authors': {'Jane Austen': {'ja-JP': form}}, 'works': {}}
                errors, author_coverage, _ = validate(catalog, [self.source], {'ja-JP'})
                self.assertEqual(errors, [])
                self.assertIn('ja-JP', author_coverage['Jane Austen'])
                self.assertEqual(resolve_attribution(
                    self.target, 'ja-JP', {self.source['Id']: self.source}, catalog)[1],
                    'ジェイン・オースティン')

    def test_priority_report_orders_by_quote_coverage_and_locale_gaps(self):
        rows = [
            {'Author': 'Jane Austen', 'Title': 'Pride and Prejudice'},
            {'Author': 'Jane Austen', 'Title': 'Pride and Prejudice'},
            {'Author': 'Mark Haddon', 'Title': 'The Curious Incident'},
        ]
        authors, works = priorities(rows, self.localizations)
        self.assertEqual(authors[0], ('Jane Austen', 2))
        self.assertEqual(works[0], (('Jane Austen', 'Pride and Prejudice'), 2))
        _, remaining_works = priorities(rows, self.localizations, 'ja-JP')
        self.assertEqual(remaining_works, [(('Mark Haddon', 'The Curious Incident'), 1)])


if __name__ == '__main__':
    unittest.main()
