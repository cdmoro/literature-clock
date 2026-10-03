import unittest
from arabic_time import clock_phrase


class ArabicTimeTest(unittest.TestCase):
    def test_complete_clock_expressions(self):
        cases={'الواحدة':60,'الثانية عشرة':0,'الساعة الثانية عشرة والنصف':30,
               'الثانية إلا دقيقتين':118,'الواحدة وإحدى وثلاثين دقيقة':91,
               'الثانية عشرة وخمس وعشرين دقيقة':25,'الواحدة وثمان وثلاثين دقيقة':98,
               'بعد منتصف الليل بأربع دقائق':4,'دقيقة واحدة بعد منتصف الليل':1,
               'الدقيقة السادسة بعد منتصف الليل':6,'الواحدة وست دقائق':66,
               '٠٠:٠٠':0,'١٢:٢٦ صباحًا':26,'01:34':94,'13:37':97,
               'الثامنة إلا الربع':465,'الواحدة والنصف صباحًا':90,'الساعة التاسعة بعد الظهر':540}
        for phrase,value in cases.items():
            with self.subTest(phrase=phrase): self.assertEqual(clock_phrase(phrase),value)

    def test_rejects_context_ranges_and_wrong_units(self):
        for phrase in ['الثانية إلا عشر دقائق أو خمس عشرة دقيقة','تقارب الواحدة',
                       'الساعة السادسة عشرة بعد منتصف الليل','دقيقتان إلا ثلاث',
                       'في الدقيقة 12:00','الثانية وخمس وستون دقيقة','24:00','12:60',
                       'بعد منتصف الليل','خمس دقائق','الشمس عند الظهر','١٢:٠٥:٣٠']:
            with self.subTest(phrase=phrase): self.assertIsNone(clock_phrase(phrase))


if __name__ == '__main__': unittest.main()
