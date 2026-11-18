# Regional catalogues and Brazilian Portuguese

## Decision

Keep Brazilian Portuguese as a distinct quote locale. In the original import
received on 2026-11-17, 1,279 of 3,640 passages differ from pt-PT (35.1%);
2,361 are identical. Of the changed passages, 1,136 have at least 95% character
similarity, 139 have 80–95%, and four fall below 80%, using Python
`SequenceMatcher(..., autojunk=False)`. Similarity measures edit size, not quality.
For comparison, the existing en-US catalogue differs from en-GB in 390 passages
(10.7%). Percentages refer to the imported passages before repairs.

The differences include useful localization: `comboio → trem` (0600-018),
`telemóvel → celular` (0821-000), `estava a fazer → estava fazendo` (0745-007),
pronoun placement, vocabulary and forms of address. They also include regressions:
0725-003 changed washing one's face to brushing it. A second translation pass
can propagate existing pt-PT errors or introduce new meaning changes, so a
changed passage is not automatically an improvement and an unchanged passage
is not automatically approved.

Research supports treating the varieties separately for localization:
[the University of Lisbon comparative grammar study](https://repositorio.ulisboa.pt/entities/publication/d0828de6-e72a-435a-a4c7-6654549cb3a9)
describes word order and clitic placement differences.
[Unicode CLDR](https://cldr.unicode.org/translation/translation-guide-general/default-content)
uses shared language data with regional differences, but its default Portuguese
content is Brazilian. This project's existing pt-PT and en-GB defaults are
editorial choices; they are not claims about CLDR defaults or linguistic priority.

## Attribution policy: shared base, regional exceptions

Resolve book and author independently:

| Requested locale | First choice | Editorial parent | Last fallback |
| --- | --- | --- | --- |
| pt-BR | pt-BR entry | pt-PT entry | Canonical source field |
| en-US | en-US entry | en-GB entry | Canonical source field |
| pt-PT / en-GB | Exact entry | None | Canonical source field |

The mapping lives in `scripts/attribution_localizations.py`. Do not guess a
parent by finding any locale with the same language. A Brazilian work override
does not require a Brazilian author override. Store regional forms only where
the displayed name differs, including an explicit canonical value when that
must override the parent's translated title. Preserve sources on verified
forms; an inherited Portuguese source is not evidence of a Brazilian edition.

The first four Brazilian work overrides were verified against publishers:

| Canonical work | Brazilian display | Source |
| --- | --- | --- |
| Emma | Emma | [Companhia das Letras](https://www.companhiadasletras.com.br/livro/9788582851050/emma) |
| One Flew Over the Cuckoo’s Nest | Um estranho no ninho | [Record](https://www.record.com.br/products/um-estranho-no-ninho) |
| Harry Potter and the Half-Blood Prince | Harry Potter e o Enigma do Príncipe | [Rocco](https://rocco.com.br/marca/harry-potter/) |
| The Curious Incident of the Dog in the Night-Time | O estranho caso do cachorro morto | [Record](https://www.record.com.br/products/o-estranho-caso-do-cachorro-morto) |

The Haddon pt-PT entry incorrectly used `cachorro` despite linking to a Portuguese
edition titled `cão`; it is corrected to `O estranho caso do cão morto`, with
[edition evidence](https://www.bertrand.pt/livro/o-estranho-caso-do-cao-morto-mark-haddon/24702773).
The Brazilian title now requires an exception rather than a duplicate.

Web generation and both native saver packagers use the same resolver. The Mac
app bundles generated Web catalogues, so it receives the same resolved forms.
Runtime renderers do not need separate fallback implementations.

## Quote policy: full identities, independent review

Each regional CSV continues to contain all 3,640 canonical IDs once. Only Quote
and Quote time vary; Time, Id, Title, Author, SFW and Source locale retain their
canonical values. The intermediate translation language is not the quote's
Source locale. Identical passages are valid and do not need cosmetic edits to
justify a regional locale. Do not rewrite an original-language literary passage
solely to impose another region's spelling; source fidelity takes priority.

Sparse quote overrides could reduce repeated CSV text, but they would require
materialization and explicit inheritance/review semantics throughout the importer,
administrator, validators, source union, generation, native packagers and tests.
They would also need rules for parent edits invalidating inherited approvals and
for regional-only original quotes. Keep full CSVs for this integration; attribution
overrides already solve the independent bibliographic duplication problem.

## Current pt-BR stage

The CSV has been normalized with an explicit Draft status for every row.
All 3,640 passages are now Draft=false at the user’s request. Editorial review
remains complete for 1,208 passages; 2,432 still await review.
The locale is enabled with the full catalogue, including passages awaiting review. The raw import and translated
attribution candidates are preserved locally under `.translation-work/pt-BR/`.
No imported author or title candidate has been accepted automatically.

Initial repairs include the truncated 0200-010 passage and missing metadata,
26 unmatched time highlights, the face-washing regression, the school-clothes instruction
at 0800-024, the broken age at 0003-000, and lost minutes at 1906-000, 1935-002
and 2312-000. Structural checks also run against all rows with the draft exemption
disabled, so draft status cannot hide broken highlights or lost source markup.

Next review each passage against its declared source as well as pt-PT, including
unchanged passages. Review regional book exceptions by quote impact. Inherited
coverage is currently 989 authors and 1,517 works, with eleven explicit work forms;
this is fallback availability, not a completed regional bibliographic audit.
The Brazilian interface is now integrated in Web, both screensavers and the Mac
app/widget at the user's request. The regular pt-BR catalogue now contains all
3,640 published rows; 1,208 have been reviewed and 2,432 await editorial review.
The catalogue covers 1,438 minutes. Minutes without a quotation use the existing
translated fallback. The separate pt-BR-draft preview is no longer generated
because there are no remaining Draft=true rows.



## Review checkpoint: 2026-11-17

The first targeted pass has checked 111 passages in full against their declared
sources. Those 111 rows are now approved in the review catalogue; enabling the
locale remains a separate step. This pass has corrected
midnight conversion (12:09 a.m. is 0h09), seconds, train departure notation,
secondary times, dialogue instructions, narrative omissions and false friends.
Repeated passages in different minute slots retain the same text where the
source text is identical. Source inconsistencies are preserved rather than
silently repaired: 0610-000 and 0720-001 both say getting up at 7:20 and calling
Tony at 6:10; the Brazilian import incorrectly changed the latter to 18:10 in one
copy, and now both faithfully retain 6:10.

Examples include the request to contact the Secret Service chief (0710-000 and
0815-000), a television news broadcast (2125-001), electoral results in the 21st
district rather than the twenty-first century (0516-000), the two leading jets
rather than jets made of lead (2307-001), and a train delayed from 6:25 to 6:44
rather than decimal numbers (0625-001). These are editorial corrections, not
excerpts taken from published Brazilian translations.

Four additional regional exceptions have edition evidence:

| Work | Brazilian display | Evidence |
| --- | --- | --- |
| Cloud Atlas | Atlas de nuvens | [Companhia das Letras](https://www.companhiadasletras.com.br/livro/9788535927580/atlas-de-nuvens) |
| Infinite Jest | Graça infinita | [Companhia das Letras](https://www.companhiadasletras.com.br/livro/9788535925043/graca-infinita) |
| The Undomestic Goddess | Samantha Sweet, executiva do lar | [Record](https://www.record.com.br/products/samantha-sweet-executiva-do-lar) |
| Shall We Tell the President? | Vamos contar ao presidente? | [AABB library's Record edition record](https://www.aabbportoalegre.com.br/biblioteca/detalhes/vamos-contar-ao-presidente/3379) |

The parent catalogue also had incomplete or mistranslated titles. It now uses
[Mrs. Dalloway](https://www.relogiodagua.pt/produto/mrs-dalloway/) rather than
“Sra.”, [1Q84](https://static.fnac-static.com/multimedia/PT/pdf/9789724620534.pdf)
rather than “1T84”, [A Piada Infinita](https://www.quetzaleditores.pt/produtos/ficha/a-piada-infinita/32590563)
rather than “Brincadeira infinita”, and [Atlas das Nuvens](https://www.bertrand.pt/livro/atlas-das-nuvens-david-mitchell/196788)
rather than “Atlas da Nuvem”. Mrs. Dalloway and 1Q84 are inherited by pt-BR,
without duplicate regional entries.

Brazilian UI translations have been prepared for all 11 existing artifact
bundles (432 entries, including two fallback quote records), plus 30 native
widget labels that use literal English keys. They were initially staged under
`.translation-work/pt-BR/ui/` and are now merged
into `src/strings`, with matching keys and placeholders. Native strings and
project resources include pt-BR; language selectors distinguish both variants.

## Expanded review checkpoint

The original automated triage flagged 214 Brazilian passages. All 214 have now
been reviewed, along with eight related passages from The Voices of Time. The
222 approved rows had been read in full against their declared sources at that
checkpoint. The other 3,418 rows still awaited review; the later checkpoint below
records subsequent progress. Automated findings are triage only: unflagged passages have not been
approved by exclusion.

Four Ballard passages were initially held for context. Inspection of the
[original serial publication](https://eyeofmidas.com/scifi/Ballard_VoicesTime.pdf)
(printed pages 96–97 and 111–112) resolves the diary notation: it records the
clock time of falling asleep, not a duration until sleep. The explicit narrative
identifies eight o'clock as his bedtime, and later diary entries move that time
progressively earlier in the afternoon. All twelve catalogue excerpts from this
story have now been reviewed together. Repeated passages share corrected text;
lead screening is shielding made of lead, not sorting clues.

The Kaldren excerpt is used at both 06:36 and 18:36 in the existing source
catalogue. Its standalone source wording does not state AM/PM, so the Brazilian
text retains the twelve-hour wording “seis e trinta e seis”; no canonical time
or ID has been silently changed. In other diary entries, contextual afternoon
bedtimes are explicit in the translation. The July 3 passage retains the source
CSV's 530 cm target distance, even though the serial scan has 350 cm: this
translation follows the declared canonical version rather than silently
substituting another edition's number.

Previous questions were resolved: 1336-000 now retains the sitting action using
an ungendered construction; 1034-000 uses the editorial term “linha solar” for
the fictional sunline, without inventing its mechanism; and the author/publisher
synopses establish that the 9/11 reference in 2046-000 concerns the September 11
attacks ([author](https://jeffreyarcher.com/book/false-impression-by-jeffrey-archer/),
[publisher](https://www.panmacmillan.com/authors/jeffrey-archer/false-impression/9780330464611)).
Its source time remains in the original 12-hour notation.

Additional corrections include 17:32 becoming 17:02 (1732-000), 15:08 becoming
15:20 (1508-001 and 1459-002), square miles becoming square kilometres without
conversion (1102-000), railway station names translated as street directions,
a portcullis becoming a drawbridge (1943-001), the New York Forties becoming the
1940s (2000-007), and Sherlock Holmes being moved from the year ’83 to 1983
(0715-003). The relative-time ambiguity shared by the identical midnight/noon
Enclave excerpts is preserved through “doze e vinte e cinco”, rather than
inventing an AM/PM distinction. The five-pound notes in 1240-001 remain notes
of that denomination; no note count is inferred.

Localize the language without relocating events: the February 14 reference in
0651-000 is Dia de São Valentim, and does not move to Brazil's June 12 Dia dos
Namorados. The numeric English slogan in 2010-001 has a meaning-preserving
Portuguese adaptation with the same line breaks; literal “2 VELHO” does not
convey the English two/too pun. The six-pack reference is retained. The stray
70 in the supplied Gatsby passage is still omitted, as in the imported
translation; canonical English source text is unchanged.

The audit tool now recognizes Brazilian number spellings, Portuguese h-based
clock notation (including seconds), midnight/noon arithmetic, and madrugada.
It can compare 2,844 source/target time-phrase pairs in pt-BR; none of these
currently triggers a time or explicit-day-period discrepancy. This limited parser
does not prove whole-passage fidelity or certify the remaining catalogue.

Three further work exceptions have been added:

| Work | Brazilian display | Status |
| --- | --- | --- |
| The Tommyknockers | Os Estranhos | Verified in a contemporary Francisco Alves edition notice, [Correio da Lavoura, October 1990](https://rima.im.ufrrj.br/jspui/bitstream/20.500.14407/7672/1/Correio_da_Lavoura_3816_Outubro_1990.pdf) |
| A Matter of Honor | Um Caso de Honra | Verified in a contemporary Bertrand Brasil listing, [Brazilian National Library newspaper archive](https://hemeroteca-pdf.bn.gov.br/325538/per325538_1988_02022.pdf) |
| Kitchens of the Great Midwest | Cozinhas do Grande Meio-Oeste | Reviewed descriptive form; a published Brazilian edition title has not been confirmed. “Meio-Oeste” identifies the US region in Brazilian usage. |

There are now eleven Brazilian work overrides (ten with edition evidence and
one editorial form). All 989 author forms and 1,517 remaining work forms inherit
from pt-PT. Matching forms such as Falsa impressão are not duplicated merely to
attach another regional key.

## Broader reading checkpoint: 2026-11-18

The first pass beyond automatic findings reviewed 300 previously pending short
passages in full. This included every declared Spanish source in those batches,
rather than treating its English translation as the original. Finishing the
remaining 17 Haddon passages completed all 54 catalogue rows from The Curious
Incident of the Dog in the Night-Time. Source metadata remains unchanged.

This pass repaired idioms, named entities, narrative actions and omitted words:
Mrs. Peters was missing her surname (1050-001); Newsnight and Hello! were being
translated as generic words (2215-001, 2035-000); mail became email despite the
physical envelope (1000-017); “I wanna favour” became wanting to favour someone
rather than asking for a favour (0702-000); and the Jingo clock's spoken p.m.
became an invented instruction about urination (1300-014). Romeo and Juliet's
Nurse is the ama, not a hospital nurse. Christopher's orange squash is a fruit
refresco, not a pumpkin, and his watch has a mostrador, not a face (0207-000,
0347-000). The 18:00 “have tea” timetable item is interpreted as the evening meal,
consistent with [Cambridge's definition](https://dictionary.cambridge.org/dictionary/english/have-tea),
and expressed as jantar. These are editorial translations, not quotations from
a specific Brazilian edition.

The Portuguese time parser now also handles “horas” and “minutos” in whole
clock expressions. This exposed thirteen further incorrect highlighted times,
including 00:38 becoming 00:08, 05:21 becoming 05:01 and 22:28 becoming 22:08.
Reading those passages together with their repetitions reviewed seventeen more
rows. The Fogg routine now retains 08:23, 09:37 and 09:40; the school interval
passage retains 09:20–09:27, 11:25–11:28 and 14:50–14:58, including the secondary
times that are not highlighted in each row. The school senior is an older pupil,
not an elderly man (1458-002).

The nautical reference in 0919-000 means high water at full and new moon, not
“full and loads”. Its reading was checked against the
[Australian Hydrographic Office glossary](https://www.hydro.gov.au/hydrography/tidal-information/tidal-glossary).
No lunar phase, current direction or clock time has been changed from the
supplied source.

The catalogue now has 556 reviewed rows and 3,084 drafts. Absence of an automated
finding did not approve any passage; only the rows read in these batches were
marked Draft=false. The regional UI has since been integrated; the eleven attribution exceptions
are unchanged in this pass.

The review ledger is `.translation-work/pt-BR/reviewed-ids.json`. These IDs are
also recorded below as a durable checkpoint; their CSV rows are Draft=false.
This is an editorial first pass, not a native-speaker literary certification.

```text
0000-025 0000-026 0000-035 0000-038 0000-040 0000-051 0003-000 0006-000
0007-000 0008-000 0009-000 0016-000 0018-001 0024-000 0025-000 0025-002
0028-000 0035-000 0036-000 0037-000 0038-001 0047-000 0052-000 0055-000
0100-007 0100-010 0104-001 0110-002 0112-001 0116-000 0116-001 0118-000
0120-002 0122-000 0123-000 0127-000 0127-001 0128-000 0129-000 0143-000
0143-001 0156-000 0200-002 0200-020 0205-001 0207-000 0207-001 0207-002
0208-000 0210-003 0213-000 0221-001 0225-001 0226-000 0228-000 0229-000
0230-001 0230-004 0231-000 0236-001 0237-001 0243-000 0244-000 0245-002
0255-002 0256-000 0300-002 0300-011 0300-032 0300-047 0303-000 0310-001
0310-003 0314-000 0317-001 0317-004 0318-000 0319-000 0320-000 0323-000
0325-000 0334-000 0339-000 0347-000 0354-000 0355-000 0358-001 0400-022
0417-000 0423-001 0430-007 0443-000 0444-000 0457-000 0500-016 0502-000
0505-000 0508-000 0509-001 0512-000 0516-000 0518-002 0521-000 0543-002
0552-000 0558-001 0600-016 0600-018 0602-000 0609-001 0610-000 0611-001
0613-000 0619-000 0625-000 0625-001 0627-003 0630-010 0631-000 0633-000
0636-000 0647-000 0649-000 0651-000 0652-000 0655-001 0657-000 0702-000
0703-003 0705-002 0710-000 0710-003 0712-001 0715-001 0715-003 0717-000
0720-001 0720-003 0725-003 0727-001 0729-002 0730-004 0732-000 0735-003
0735-004 0736-000 0738-000 0740-000 0745-006 0749-000 0751-000 0753-000
0753-001 0755-003 0756-004 0759-002 0800-001 0800-024 0800-025 0804-001
0805-000 0808-000 0809-001 0810-002 0810-003 0815-000 0817-003 0819-001
0820-003 0823-002 0823-003 0824-000 0826-001 0827-001 0827-002 0830-001
0830-008 0830-011 0830-012 0831-000 0832-001 0832-003 0843-002 0845-000
0845-001 0847-000 0847-001 0849-001 0851-001 0852-000 0855-006 0856-001
0859-003 0900-016 0900-022 0900-023 0900-025 0900-034 0901-003 0902-002
0903-000 0904-000 0905-001 0905-002 0906-002 0907-003 0908-002 0909-000
0910-000 0911-001 0911-002 0912-003 0913-000 0914-001 0915-004 0915-005
0916-001 0917-001 0918-001 0919-000 0919-001 0921-000 0922-001 0923-000
0926-000 0927-002 0930-007 0932-000 0933-000 0936-003 0937-001 0939-001
0940-000 0940-004 0940-005 0943-000 0945-002 0947-006 0947-008 0950-002
0950-005 0956-000 0959-005 1000-017 1000-025 1000-028 1000-032 1000-034
1000-038 1001-002 1002-000 1003-002 1006-001 1006-002 1009-000 1010-003
1011-001 1013-001 1014-000 1018-001 1021-000 1023-000 1025-003 1027-000
1030-002 1030-004 1030-005 1033-000 1034-000 1037-000 1040-003 1043-000
1047-001 1050-000 1050-001 1054-003 1055-000 1057-000 1100-024 1100-025
1102-000 1102-001 1105-000 1105-001 1106-000 1106-001 1107-000 1109-000
1114-000 1118-000 1120-001 1122-000 1128-000 1130-007 1130-010 1134-001
1138-000 1140-001 1141-000 1143-000 1145-001 1145-004 1155-002 1156-001
1158-002 1200-033 1208-000 1212-001 1217-001 1218-000 1220-005 1221-001
1225-000 1225-002 1225-003 1226-001 1227-000 1228-000 1230-002 1233-001
1240-001 1246-000 1252-001 1253-000 1255-002 1257-000 1258-001 1259-002
1300-011 1300-014 1300-015 1300-016 1300-017 1300-020 1301-002 1306-000
1308-001 1310-003 1314-000 1316-000 1322-000 1323-000 1324-000 1326-000
1329-000 1330-003 1336-000 1339-000 1342-001 1346-000 1354-000 1400-023
1400-026 1400-028 1403-000 1407-000 1413-000 1415-003 1425-003 1430-000
1430-003 1430-007 1432-000 1435-000 1438-000 1445-003 1450-002 1458-002
1459-002 1500-019 1500-024 1500-026 1500-027 1500-030 1504-002 1506-000
1508-001 1515-005 1516-000 1527-001 1529-000 1530-006 1533-001 1534-001
1545-002 1545-004 1547-001 1548-000 1549-000 1549-001 1550-001 1555-000
1556-000 1600-018 1600-023 1600-025 1600-026 1600-028 1600-030 1603-002
1614-000 1615-004 1618-000 1619-000 1620-001 1625-002 1626-000 1629-000
1631-000 1637-000 1637-002 1639-001 1643-000 1647-000 1657-002 1700-001
1700-014 1700-021 1732-000 1740-001 1743-001 1744-000 1748-000 1749-000
1754-000 1800-022 1800-027 1800-028 1800-029 1801-000 1805-001 1808-000
1810-000 1812-000 1815-000 1815-001 1817-000 1818-001 1825-003 1830-004
1832-002 1835-001 1836-000 1838-000 1851-000 1858-001 1900-001 1900-020
1900-025 1906-000 1912-000 1912-001 1915-004 1916-001 1927-001 1930-006
1930-008 1935-002 1935-004 1939-002 1941-000 1943-001 1945-005 1945-006
1947-000 1951-001 1953-000 1953-001 1958-001 2000-007 2000-016 2000-017
2000-022 2005-001 2007-000 2010-000 2010-001 2015-001 2015-002 2019-001
2020-002 2020-003 2022-000 2030-003 2030-007 2034-000 2035-000 2035-001
2036-000 2040-004 2045-002 2046-000 2048-000 2050-001 2050-002 2050-004
2100-002 2100-014 2100-015 2100-016 2100-023 2104-001 2109-000 2110-003
2115-002 2120-003 2122-001 2125-001 2128-000 2130-005 2134-000 2142-000
2151-001 2157-003 2200-019 2200-024 2202-000 2209-000 2213-000 2215-001
2217-002 2218-001 2219-000 2221-000 2224-000 2225-003 2226-000 2227-001
2228-000 2231-001 2234-000 2239-000 2243-000 2246-000 2248-000 2300-017
2300-022 2300-023 2300-027 2302-000 2305-001 2305-004 2307-000 2307-001
2311-001 2312-000 2316-001 2318-000 2318-001 2322-000 2324-000 2328-000
2330-004 2332-001 2343-000 2352-000
```


## UI integration validation: 2026-11-18

All eleven Brazilian UI/fallback bundles are integrated, with non-empty strings
and preserved format placeholders. Native project registration includes pt-BR
strings for both app and widget, and its 556 approved quotes in 435 minutes.
Web locale tests cover exact, underscore, mixed-case, Unicode-extension and draft
identifiers, with pt and pt-AO still resolving to pt-PT. Windows explicitly
preserves the en-GB and pt-PT defaults independently of resource sort order.

Validation passed: web type checking, production build, 669 web unit tests,
quote-cache test, 179 Python tests, and preparation/inspection of all sixteen
Windows resource catalogues. Windows compilation was unavailable without the
.NET SDK. The macOS saver build was blocked by the missing Xcode Metal
Toolchain. The macOS app build compiled widget Swift sources and copied pt-BR
resources, but failed exporting the existing AppIconBookClock.icon (status 255).
These native build limitations do not constitute successful platform builds.


## Book review checkpoint: 2026-11-18

Read all catalogue passages from Honor Among Thieves (49 rows, including four
previous approvals) and Blind Willow, Sleeping Woman (43 rows) against their
declared source passages. This adds 88 reviewed rows: 644 reviewed, 2,996 drafts.
Corrections affected 63 rows, including repeated passages. All source metadata
is unchanged. No regional attribution exceptions were added in this pass.

Honor Among Thieves repairs include duty officer versus telephone attendant
(0422-000), the aircraft armrest (0727-000 and 1927-000), requesting a telephone
connection to a checkpoint (1639-000), and the lost meeting in 0817-000.
The truck retains forty miles per hour rather than an inaccurate conversion
(0409-000). Marine Air Terminal is retained as a name, without claiming a Navy
connection (0643-001). The 08:26 highlight now includes the source's twenty
seconds. Unspecified twelve-hour expressions retain their source ambiguity.

Blind Willow repairs include the Doors band mistaken for literal doors
(0400-013), a portable cooler mistaken for a refrigerator (1000-010), telephone
rings mistaken for jewellery (1800-010), restaurant staff and crib sheets
(1700-007), and pretending to watch television versus deciding to watch it
(2200-007). High school, the spaghetti pot, vomiting one's breakfast, and
several broken sentences are repaired. The source typo “starting at the ceiling”
is read contextually as looking at the ceiling (1520-002); canonical source text
is unchanged. The repeated 12:20 passage uses “doze e vinte” rather than
inventing noon or midnight, and retains the same friend's gender throughout.

These are editorial translations of the supplied source catalogue, not
transcriptions from Brazilian published editions. Newly reviewed IDs:

```text
0020-001 0120-000 0132-000 0157-000 0215-001 0227-000 0300-016 0300-017
0300-018 0300-019 0321-000 0357-000 0400-013 0409-000 0422-000 0519-000
0611-000 0643-001 0727-000 0739-000 0800-010 0803-000 0817-000 0819-000
0826-000 0833-000 0843-000 0900-008 0901-001 0912-000 0927-000 0930-003
0936-000 0937-000 0951-000 1000-010 1000-011 1000-012 1007-000 1010-001
1020-002 1024-000 1029-000 1032-001 1100-013 1135-000 1145-000 1220-003
1332-000 1357-000 1400-010 1453-000 1459-000 1500-010 1500-011 1520-002
1530-002 1630-005 1639-000 1700-007 1719-000 1725-000 1746-000 1757-000
1759-000 1800-009 1800-010 1830-001 1922-001 1927-000 1935-000 1939-000
2019-000 2043-000 2100-007 2126-001 2127-000 2136-000 2151-000 2200-007
2207-000 2220-001 2225-002 2229-000 2232-000 2240-000 2300-004 2355-000
```


## Cross-checking the Portuguese parent: 2026-11-18

At the user's request, meaning repairs are now checked in both Portuguese
catalogues. In this pass, 61 rows in pt-PT shared errors from the two-book review
and were corrected locally without copying whole Brazilian passages. Regional
forms such as geleira, ensino secundário, empregados de mesa, camião and
contacto are retained or used in the repaired phrases. Canonical source metadata
and existing approval states are unchanged.

A targeted follow-up also checked earlier documented Brazilian findings against
pt-PT and the declared sources, including exact repeated source passages. This
repairs the wrong 17:32 and 15:08 times, secondary school intervals, square-mile
units, the portcullis, the year ’83, the Peters surname, Newsnight and Hello!,
physical mail, the favour request, spoken p.m., orange squash, the watch dial
and the tidal phrase. This is a targeted cross-check, not a complete new review
of the Portuguese parent or all 556 previously approved Brazilian passages.

Additional corrected pt-PT IDs:

```text
0207-000 0347-000 0702-000 0715-003 0919-000 0927-002 1000-017 1050-001
1102-000 1128-000 1300-014 1458-002 1459-002 1508-001 1732-000 1943-001
2000-007 2035-000 2215-001
```

Validation for this checkpoint: 179 Python tests pass; all 3,640 rows in each
Portuguese CSV pass strict source-metadata, formatting and highlight checks,
including Brazilian drafts. Attribution coverage remains complete through the
regional fallback. Regenerated Web data and Mac bundles agree with every
approved CSV passage; the Brazilian bundle contains 644 quotes in 477 minutes.
There are 80 corrected pt-PT rows across the two targeted checks. All work
remains local, without commits, pushes or publication.


## Further two-book review: 2026-11-18

Read the catalogue excerpts from Project Cyclops and Shall We Tell the President?
against the declared sources, checking pt-PT alongside pt-BR. Seventy-one new
Brazilian rows are approved: 715 reviewed, 2,925 pending. Corrections affect 42
Brazilian rows (including earlier approvals) and 45 Portuguese rows. No canonical
metadata, bibliographic exceptions or UI strings are changed in this pass.

Repairs include midnight versus noon at 0021-001; a reversed caller at 1001-003;
a small aircraft mistaken for a puddle (2333-000); assuming military attention
versus attracting attention (1946-000); killing a stranger versus wasting one
(2026-001); and yards changed to metres without conversion (1321-000). In
pt-PT, the secondary call in 0720-001 is restored from 18:10 to the source's
06:10. The source's independent 07:20 getting-up time remains unchanged in
both repeated excerpts. The military-radio acknowledgement, tracer shot,
uranium isotope and expected-arrival expression are also repaired in pt-PT
where Brazilian corrections had already been made in an earlier pass.

Other meaning repairs restore the Wheaties name, a better necktie, parking in
a double row, a hospital doctor's treatment, descending a hill rather than
tripping on it, the gantry rails, an arm's plasma infusion, and the distinction
between a fighter aircraft and a Hind combat helicopter. The 10:03/10:05
repetitions now consistently retain both source times, including the source's
editorial square brackets. Regional wording is preserved in each catalogue.

Two passages remain drafts: 1934-000 needs context for “if I fail ... jump on
top of you”, and 2146-000 needs context for the fictional “trajectory-default
analysis” and the interrupted reply. No speculative repair is approved.
The inconsistent ninety-seven minutes remaining in 0829-000 is present in the
source and is retained; this review does not silently repair source chronology.

Newly reviewed Brazilian IDs:

```text
0021-001 0235-000 0451-000 0519-001 0535-000 0626-001 0627-000 0632-000
0634-000 0635-000 0639-001 0643-002 0646-000 0648-000 0658-001 0659-000
0708-000 0711-001 0718-000 0722-000 0723-000 0731-001 0735-000 0747-001
0748-000 0758-000 0801-001 0804-000 0814-001 0825-000 0829-000 0839-000
0927-001 0951-001 1001-000 1001-003 1003-000 1005-000 1006-000 1011-000
1012-000 1056-000 1059-000 1104-000 1201-000 1226-000 1321-000 1327-001
1415-000 1418-000 1437-001 1442-002 1443-002 1448-000 1518-000 1521-000
1529-001 1931-000 1944-000 1946-000 1952-000 1958-000 2004-000 2006-000
2026-001 2039-000 2143-000 2152-000 2159-001 2249-001 2333-000
```

Validation: 179 Python tests pass, and strict structural checks pass for all
3,640 rows in both Portuguese catalogues, including drafts. Web data is
regenerated, and both Mac bundles match every approved CSV passage. The
Brazilian bundle now contains 715 quotes in 532 minutes, with no draft rows.
The review ledger matches the CSV approval set. All changes remain local.


## Kesey and Stradal review: 2026-11-18

Read the catalogue passages from One Flew Over the Cuckoo’s Nest and Kitchens
of the Great Midwest alongside their declared English sources and pt-PT forms.
This adds 64 approvals: 779 reviewed Brazilian rows and 2,861 drafts. Corrections
affect 54 Brazilian rows and 58 Portuguese rows, including earlier approvals
used to cross-check the Portuguese parent. Canonical metadata is unchanged.

Kesey repairs include “on the button” and “on the nose” as exactness;
the stopped clock hands; Wheelers and Walkers as patients' mobility groups;
a patient in the Acutes rather than “acute mentions”; the residents' elbow
patches; clearing space rather than cleaning the floor; a person on the
telephone rather than a group; the smaller attendant rather than a racial
comparison; and a cap rather than a lid over the eyes. The source's black
attendants remain identified as black, without adding the imported translation's
stronger racial epithet. Mechanical and institutional metaphors remain.
The sedative passage now retains who swallowed the pills and who might have
installed devices during the resulting unconsciousness. “Farting around” means
wasting time here. Day room and ward are kept distinct where repaired.

Stradal repairs include a ringing telephone rather than a running person;
bleaching underwear rather than ironing already bleached underwear; a
female cousin and two female visitors; the Mazda's possessive construction;
strings, horns and keys as musical instruments; the fishing float; voicemail;
a pink toilet cubicle rather than a pink toilet bowl; and retaining Stucco
Palace as a name. Corrections shared by pt-PT include the female pronouns in
1939-002 and the The Truth name and numeric slogan in 2010-001. Regional
forms such as registos, casa de banho and palavras-passe are used in Portuguese
repairs rather than copying entire Brazilian passages.

Highlights now retain the source's half minute in 0729-001/1929-001 and the
nine seconds in 1915-003. The source's night wording in 0200-016 is retained
without assigning a different calendar day. No approximation is made exact.

Three read passages remain Brazilian drafts: 1000-019 needs a careful review
of the idiom and ignition metaphor; 1010-002 needs context for the vulgar
metaphor; and 1300-024 retains the source's inconsistent watching pronoun
until its context is established. The window-watching clause is retained in
both translations, not silently removed to simplify that ambiguity. These
three passages were not counted as approved. Previously pending 1934-000
and 2146-000 remain pending as well.

Newly reviewed Brazilian IDs:

```text
0000-022 0200-016 0258-000 0530-004 0600-009 0630-000 0630-002 0630-003
0645-000 0645-001 0700-014 0700-016 0700-017 0725-002 0729-001 0730-003
0745-003 0800-015 0800-017 0800-030 0803-002 0825-002 0830-006 0851-000
0900-036 1000-021 1030-000 1100-022 1250-002 1259-001 1300-009 1300-010
1335-001 1342-000 1356-000 1400-014 1400-015 1400-016 1458-001 1510-001
1600-019 1615-001 1630-008 1656-001 1657-003 1715-002 1730-003 1800-017
1845-000 1915-003 1925-002 1929-001 1930-003 1930-004 1945-003 2000-011
2025-001 2030-006 2037-001 2059-002 2130-003 2150-003 2200-016 2330-002
```

Validation: 179 Python tests pass, strict checks pass for every row in both
Portuguese CSVs (including Brazilian drafts), and attribution coverage remains
complete through the regional fallback. Regenerated Brazilian Web data contains
779 approved quotes across 550 minutes. The approval ledger matches the CSV.
All changes remain local, without commits, pushes or publication.

Both synchronized Mac bundles match every approved CSV passage; Brazilian drafts
remain excluded.


## Holmes and Doctor Sleep checkpoint: 2026-11-18

Read all catalogue excerpts from The Adventures of Sherlock Holmes and Doctor
Sleep against their declared English sources and both Portuguese forms. All 47
previously pending Brazilian passages in these two groups are now approved:
826 reviewed, 2,814 pending. Repairs affect 37 Brazilian and 38 Portuguese rows.
No metadata, attribution exceptions, source catalogues or UI strings change.

Holmes repairs include a groom as a cavalariço rather than a bridegroom; a
bonnet as a hat rather than a car bonnet; a bird's crop as its papo rather than
a harvest; and “to a man” as agreement without exception. The telegram
summons Holmes rather than telegraphing him as an object, and the departure
is explicitly a train. Lestrade comes to collect them rather than calling
them with a carriage. “In contemplation” concerns a planned crime.
The source's nearly-one, nearly-four and nearly-eleven qualifiers are now
retained in the highlighted phrases in every related excerpt.

Doctor Sleep repairs include the deadline for back rent (by 17:00 yesterday,
not starting at 17:00 yesterday), retaining Red Apple as a store name,
reading a hundred pages rather than putting pages into a book, and the
idiomatic government-work expression rather than inventing a government job.
The broken Kappy's sentence now retains the shop name and the figurative
vacant stare; it does not turn the thousand-yard metaphor into a metric
distance. The examination room contains the family rather than hiding it,
and the poet's BU clothing is described coherently. The death euphemism in
0400-012 and the alternating breathing periods are preserved.

The source catalogue places the breakfast/11:15-train excerpt at 23:15
(2315-001). Both translations keep the supplied source wording and clock
notation without inventing an evening breakfast or changing canonical Time.
Likewise, repeated twelve-hour excerpts are not assigned an invented AM/PM
period. Earlier unresolved passages outside these books remain drafts.

Newly reviewed Brazilian IDs:

```text
0059-002 0100-006 0130-001 0150-000 0200-008 0200-009 0345-001 0400-010
0400-011 0400-012 0425-000 0600-003 0730-001 0815-002 0830-003 0855-004
0900-013 0915-002 1100-018 1115-002 1200-022 1350-000 1400-009 1520-001
1559-002 1600-009 1600-014 1700-003 1700-005 1706-001 1800-008 1800-013
1830-002 1900-009 1900-011 1930-001 1945-002 2030-004 2100-006 2100-011
2115-000 2115-001 2200-012 2300-008 2300-009 2300-010 2315-001
```

Validation: 179 Python tests pass; strict source-metadata, formatting and
highlight checks pass for every row in both Portuguese CSVs, including drafts.
The review ledger exactly matches the 826 Brazilian approvals. Generated Web
data contains 826 Brazilian quotes in 560 minutes. All changes remain local.

Mac catalogue synchronization completed; both Portuguese bundles match every
approved CSV passage and exclude Brazilian drafts.


## Kinsella and Moshfegh checkpoint: 2026-11-18

Read all catalogue passages from The Undomestic Goddess and My Year of Rest
and Relaxation against their declared English sources and pt-PT. The 41
previously pending Brazilian rows are approved: 867 reviewed, 2,773 drafts.
Corrections affect 37 Brazilian and 38 Portuguese rows, including a previously
approved Brazilian excerpt used to repair the Portuguese VCR passage. No
metadata, attribution catalogue or UI changes are made in this pass.

The Kinsella review restores 18:10 from “ten past” after the six-o'clock party
in 1740-002, rather than ten o'clock. The primary 17:40 expression is unchanged.
It also restores bleach nearly reaching an eye (1232-001), actual product names
Stain Away and Vanish (1038-001), a Hoover vacuum sucking something up rather
than a person climbing up it (1142-001), being behind on work rather than walking
behind others (1016-000), and the cream colour of a cardigan rather than a
cream substance (1026-000). Newspaper sections, the coffee tray, the Geiger
family bed and a cleaning brush are repaired. The firm's partners remain
sócios, and travelling halfway across town does not mean standing halfway
through the city. Samantha's first-person feminine agreement is consistent.

The Moshfegh review restores relatives visiting rather than having “ended”,
clearing a desk rather than cleaning it, a friendly check-in phone message,
a bedraggled visitor without invented mud, and cassette tapes rather than
putting VCR machines in their cases. The Portuguese VCR passage now retains
unplugging/replugging and the heel of the hand, matching the earlier Brazilian
repair. The female narrator's agreement is consistent. Fictional medication
names, quantities and the narrator's unusual actions are retained as supplied
in the source; this is translation editing, not health guidance.

No unresolved passage from earlier books is approved in this checkpoint.
Newly reviewed Brazilian IDs:

```text
0000-013 0200-010 0437-001 0500-011 0700-009 0756-003 0800-012 0816-000
0817-004 0830-005 0845-004 0900-011 0936-002 0942-000 0954-001 0955-004
1005-002 1012-002 1016-000 1026-000 1038-001 1112-001 1142-001 1224-000
1232-001 1305-000 1315-001 1330-001 1400-011 1600-010 1740-002 1919-000
1930-002 1942-004 2030-005 2045-001 2053-000 2100-009 2100-010 2200-010
2300-006
```

Validation: 179 Python tests pass. Strict checks pass for all 3,640 rows in
both Portuguese catalogues, including Brazilian drafts. Generated Web data
contains 867 approved Brazilian quotes across 577 minutes, and the review
ledger matches the CSV approval set. All changes remain local.

Both synchronized Mac bundles match the approved CSV passages exactly;
Brazilian drafts remain excluded.


## Gatsby and two Archer books: 2026-11-18

Read all catalogue passages from The Great Gatsby, Nothing Ventured and
Not a Penny More, Not a Penny Less against the declared sources and pt-PT.
Fifty previously pending Brazilian rows are approved: 917 reviewed and 2,723
drafts. Corrections affect 29 Brazilian rows and 30 Portuguese rows. Canonical
metadata, attribution entries and UI strings remain unchanged.

Gatsby repairs include the train's missing preposition, the Pennsylvania Station
name, the rainy-day construction, the poolside telephone message rather than
a person being taken to the pool, holiday festivities rather than vacations,
and low/high drum sounds rather than tall drums. The roaring-noon image is
retained with coherent Portuguese word order. Earlier editorial treatment of
the source's stray 70 remains unchanged.

Archer repairs include speeding along the M4 rather than slowing down; a
driveway rather than a pavement; the exact inch and yard units in 0058-001;
the trip to work versus other commuters returning home; and idiomatic
“action stations”. Horse-racing boxes and the Members' Enclosure are not
containers and a parliamentary enclosure; runners and riders are horses and
jockeys in the two-o'clock race. The race's King George VI and Queen Elizabeth
Stakes name, the Romeo y Julieta cigar name and Prospecta Oil remain names.
The Piccadilly end of a street is not the end of Piccadilly itself. Small dogs
are not automatically puppies. The Portuguese 1958-001 highlight and text now
retain the source's explicit 19:58; its earlier Brazilian repair remains.

The casket in 1236-000 needs more context to distinguish a small chest from
a coffin; this Brazilian row remains a draft with its imported wording rather
than approving a speculative interpretation. Other earlier unresolved rows
remain drafts. Source times and timezone labels are preserved.

Newly reviewed Brazilian IDs:

```text
0058-001 0107-000 0115-000 0200-011 0400-016 0400-019 0543-001 0609-000
0637-000 0714-000 0729-000 0817-001 0900-014 0900-015 0900-028 0947-000
1007-002 1054-001 1100-019 1112-000 1116-000 1200-034 1220-001 1221-000
1240-000 1245-000 1308-002 1345-000 1400-022 1445-000 1450-000 1520-000
1603-000 1611-001 1623-001 1625-001 1633-001 1700-011 1800-014 1820-000
1822-000 1900-012 1900-023 2000-006 2009-000 2200-013 2206-002 2219-001
2316-000 2327-000
```

Validation: 179 Python tests pass; every row in both Portuguese CSVs passes
strict metadata, markup and highlight validation, including Brazilian drafts.
Web data and Mac bundles are regenerated; every bundled passage matches its
approved CSV text. The Brazilian catalogue contains 917 quotes in 593 minutes,
and its approval ledger matches the CSV. All work remains local.


## Billy Summers and two more Archer groups: 2026-11-18

Read the catalogue excerpts from Billy Summers, Be Careful What You Wish For
and The Sins of the Father against the declared sources and both Portuguese
forms. Fifty-one new Brazilian rows are approved: 968 reviewed, 2,672 drafts.
Corrections affect 35 Brazilian and 33 Portuguese rows. No canonical metadata,
source catalogue, attribution entry or UI text changes.

Billy Summers repairs include quarter to midnight as 23:45 wording rather than
“meia-noite um quarto”; twelve-hour lobby excerpts use doze rather than adding
noon, preserving the supplied source ambiguity and both canonical time slots.
A cartoon boy is not a cartoonist, a picture in the movie discussion is a film
rather than a photograph, and a tall man's feet extend beyond the sofa rather
than his taking too long. Boots-on-the-ground checks are in-person checks, not
immediate checks. The Staples passage retains one notebook and a personal
laptop; the source typo “on of” is read contextually as “one of”. A sweatshirt's
I LOVE LAS VEGAS inscription and the Spanish TODOS COMEN slogan are retained.
The parking garage is no longer used rather than newly ready for use.

The Archer repairs retain Cedric's name, the first stroke of twelve rather
than twelve strokes, and the elapsed thirteen years since Attlee's government
rather than an invented thirteen-year term. The lieutenant-colonel's audience
stands at attention and is signalled to sit rather than paying attention and
being told to get down. Filing cabinets are furniture containing documents,
not “archives full of archives”. The Portuguese bluff excerpt is repaired from
the earlier reviewed Brazilian form. Secondary times in the Barrington House
repetitions remain six minutes and two minutes before ten.

1000-008 remains a Brazilian draft: the summerhouse needs contextual review
before choosing between an outbuilding/pavilion and a holiday house. The
imported passage is retained. Earlier unresolved drafts remain pending.

Newly reviewed Brazilian IDs:

```text
0002-000 0004-000 0115-001 0200-007 0259-000 0321-001 0335-000 0400-009
0500-010 0518-001 0555-001 0629-000 0643-000 0659-001 0853-000 0859-001
0901-000 0903-001 0912-002 0915-001 0923-001 0925-000 0951-002 0952-001
0954-002 0958-000 0959-000 0959-001 1022-000 1040-002 1115-000 1127-000
1129-000 1130-003 1134-000 1157-000 1202-000 1204-002 1220-000 1438-001
1534-000 1812-001 1829-000 1859-000 1900-008 1910-000 2103-000 2150-000
2230-001 2240-003 2345-002
```

Validation: 179 Python tests pass; strict metadata, markup and highlight checks
pass for all 3,640 rows in both Portuguese CSVs, including Brazilian drafts.
The approval ledger matches the 968 Brazilian approvals. Generated Web data
contains 968 Brazilian quotes across 615 minutes. All changes remain local.

Both Mac bundles are synchronized and match every approved CSV passage;
Brazilian drafts remain excluded.


## A Matter of Honor and As the Crow Flies: 2026-11-18

Read all 32 pending Brazilian excerpts from these two books against the
declared English sources and pt-PT. All are now approved: 1,000 reviewed
Brazilian rows, 2,640 drafts. Corrections affect 20 Brazilian and 19 Portuguese
rows. No canonical metadata, source CSV, UI string or attribution entry changes.

Repairs include the coach carrying musical instruments as a bus rather than
a trainer; a BEA Viscount aircraft rather than a viscount title; advancing
watches to Central European Time rather than one hour beyond it; and the
idiom about hurrying and missing the number 14. The number itself is retained
without inventing its referent. A night train carriage is a vagão in pt-BR;
the Portuguese carruagem is retained. A human crocodile is a single-file
procession, not an animal. A porter wheels the luggage rather than merely
carrying it. “Going over the top” retains the military attack meaning, and
Lance is no longer an invented first name: the original lance-corporal rank
is retained alongside cabo to avoid asserting an exact regional equivalence.

The purchase settlement is the final payment and freehold is propriedade
plena rather than “perfect property”. The source's two-mile boundary is
restored rather than an inaccurate three-kilometre conversion. The picture
carried by Charlie is described as an imagem, without deciding that an
unspecified picture must be a photograph. Day periods, quantities, names and
secondary times remain as supplied.

1550-000 retains both the source's three-fifty wording and its straight-line hand
description. That clock geometry is a source inconsistency; this translation
review does not silently replace either the narrative or canonical Time.
Earlier unresolved passages from other books remain drafts.

Newly reviewed Brazilian IDs:

```text
0040-000 0310-000 0445-000 0454-000 0543-000 0553-000 0553-001 0707-000
0720-000 0820-000 0950-000 0955-000 0957-000 1007-001 1055-001 1120-000
1121-000 1125-000 1137-000 1440-000 1455-000 1517-000 1547-000 1550-000
1612-000 1635-000 1654-001 1853-001 1907-000 2059-000 2135-000 2235-000
```

Validation: 179 Python tests pass, and strict metadata, markup and highlight
checks pass for all 3,640 rows in both Portuguese CSVs, including Brazilian
drafts. The review ledger matches the 1,000 approvals. Generated Brazilian
Web data contains 1,000 quotes in 634 minutes. All changes remain local.

Both Mac bundles are synchronized and match every approved CSV passage;
Brazilian drafts remain excluded.


## King, James and Fitzgerald: 2026-11-18

Read all catalogue excerpts from Full Dark, No Stars, Original Sin and This
Side of Paradise against the declared sources and both Portuguese forms.
Forty-nine previously pending Brazilian rows are approved: 1,049 reviewed and
2,591 drafts. Corrections affect 37 rows in each Portuguese catalogue. Canonical
metadata, attributions and UI strings are unchanged.

King repairs include a paid crew rather than a crew paying; a recovering body
rather than a healing body as agent; sleeping late rather than a last sleep;
and turning a clock face back towards someone rather than adjusting its time.
The four-word note remains four words in Portuguese (Amanhã cedo. Duas horas),
rather than changing the narrated count to six. The two Tylenol tablets are
retained without adding a strength or dosage instruction. A video store not
having a film is not its not having performed an action. The distinguished
author parking space, Marine haircut and implacable handshake are coherent.

The gold described as depthless was checked against the
[Collins dictionary](https://www.collinsdictionary.com/dictionary/english/depthless),
which gives both a literary immeasurably-deep sense and a shallow sense. The
existing profundo reading is retained as an editorial choice in this light
image; the word alone does not justify mechanically reversing the meaning.

James repairs include patches of light rather than swimming pools; one minute
before 11:30; the witnesses rather than the person addressed swearing to what
they saw; washing oneself rather than unspecified washing; and listlessness
rather than indifference. The half-mile is retained without metric conversion,
and the suspension in the driving passage is the car's suspension.

Fitzgerald repairs include an alegre party rather than a modern sexual-identity
reading of gay; two motorcars rather than unspecified machines; the secondary
two-o'clock time rather than two people finding the party; gambling dice; a
divan rather than another room; spoken words rather than a telephone call;
and figurative lesser lights as people. Three-o'clock suppers and the five-
o'clock return train are retained. The bobbing-party passage is now a group
sleigh outing rather than dancing: the surrounding winter journey, the bobs
ordered for five and the party travelling through snowy streets were checked
in the [publisher's excerpt](https://www.simonandschuster.com/books/This-Side-Of-Paradise/F-Scott-Fitzgerald/9780684843780).
This is contextual interpretation of the passage, not a Brazilian edition quote.

2000-013 remains a Brazilian draft pending context for the grandfather's-clock
wording (clock type versus possession). Other unresolved passages from previous
books remain drafts. No source period or canonical time is silently changed.

Newly reviewed Brazilian IDs:

```text
0000-028 0100-008 0200-012 0200-013 0200-014 0200-019 0245-001 0300-031
0315-001 0400-017 0600-007 0627-001 0730-002 0810-001 0820-002 0915-000
0935-002 0945-001 0948-001 1000-016 1015-001 1025-000 1045-000 1129-002
1136-000 1320-000 1400-018 1445-001 1458-000 1500-017 1500-023 1530-004
1600-015 1700-013 1700-017 1700-018 1700-019 1800-019 1800-020 1825-001
1827-000 1940-000 1942-001 2020-000 2135-001 2148-001 2200-017 2225-001
2300-015
```

Validation: 179 Python tests pass. Strict metadata, markup and highlight checks
pass for every row in both Portuguese CSVs, including Brazilian drafts. The
review ledger matches all 1,049 approvals. Generated Brazilian Web data contains
1,049 approved quotes across 644 minutes. All changes remain local.

Both Mac bundles are synchronized and match every approved CSV passage;
Brazilian drafts remain excluded.


## Tommyknockers and Miller checkpoint: 2026-11-18

Read all catalogue passages from The Tommyknockers and Tropic of Cancer
against their declared English sources and pt-PT forms. Forty-four previously
pending Brazilian rows are approved: 1,093 reviewed, 2,547 drafts. Corrections
affect 30 Brazilian and 31 Portuguese rows, including the earlier Brazilian
approval used to repair pt-PT's 0104-001. Canonical metadata, attribution entries
and UI strings remain unchanged.

The Tommyknockers repairs include the storm not starting until nine, rather
than ending at nine; people searching rather than researchers; a hand used
for balance rather than a steady hand; and both hunger and exhaustion rather
than being “almost twice”. The news programme, the exhausted woman's appearance
and grammatical gender are restored. Troy remains a town name rather than
being relocated through an unnecessary translated form. The earlier reviewed
Brazilian death idiom clarifies snuff it in pt-PT without implying suicide.
The two digging tools are distinguished descriptively instead of “pá e pá”.

Miller repairs include umbrella ribs rather than human ribs; pigeons picking
up crumbs rather than piling them up; a shoe-making workbench and producing
two pairs rather than removing pairs; and stopping a passer-by rather than
arresting him. The source's pair of women and bare floor are retained.
The eye image remains something before the narrator, rather than his owning
a prosthetic eye. Eugene's name is restored as the possessor of the French
angoisse and tristesse, keeping the existing emphasis tags. The source typo
“left work with Carl that I am to help him move” in 0130-002 is read contextually
as leaving word with Carl; the canonical source is not edited.

The market's truck is vegetables rather than a motor vehicle, consistent with
[Collins's produce sense](https://www.collinsdictionary.com/dictionary/english/truck).
The bags of produce remain wrapped in newspapers. Figurative voices are
infantile voices, rather than invented actual babies, and narrative details
are told piecemeal rather than physically given in drops. Earlier unresolved
passages from other books remain drafts.

Newly reviewed Brazilian IDs:

```text
0000-011 0000-012 0130-002 0300-020 0300-021 0315-000 0600-004 0700-005
0800-011 0830-000 0845-002 0845-003 0900-003 0900-004 0900-009 0900-010
0945-000 1000-013 1000-014 1030-001 1100-003 1100-014 1200-020 1245-001
1300-007 1330-000 1400-005 1500-002 1504-001 1505-001 1515-001 1630-006
1700-008 1700-009 1900-003 1930-000 2030-002 2045-000 2100-001 2100-008
2200-008 2200-009 2300-005 2358-000
```

Validation: 179 Python tests pass; strict checks pass for all 3,640 rows in
both Portuguese CSVs, including Brazilian drafts. Web data and Mac bundles
are regenerated and match every approved passage. The Brazilian catalogue
contains 1,093 quotes in 646 minutes; its review ledger matches the CSV.
All changes remain local, without commits, pushes or publication.


## Daedalus and Christie checkpoint: 2026-11-18

Read all catalogue passages from Project Daedalus and And Then There Were
None against the declared English sources and both Portuguese forms. Forty-one
new Brazilian rows are approved: 1,134 reviewed and 2,506 drafts. Corrections
affect 24 Brazilian rows and 26 Portuguese rows, including earlier Brazilian
approvals used to cross-check the parent. Canonical metadata, attribution
entries, source CSVs and UI strings are unchanged.

Daedalus repairs include stoking the embers; cold morning air rather than
strong air; the underbelly of an aircraft rather than a weak point; telephone
calls to Paris and Zurich rather than visits; and a pint of lager rather than
a litre. The confidential-information idiom does not mean keeping things
under control, and how Michael will play a situation concerns his actions
rather than interpretation. A radio acknowledgement is not copying someone;
the aircraft's fifty-degree bank is lateral, and a kill confirmation is an
abate in the air-combat passage. The broken recovery-of-vision sentence is
repaired without inventing a different helmet mechanism.

The source's LDP acronym, five-foot sword length, two pilots and names are
retained. The previously documented stray maitre in the supplied inn excerpt
is omitted in pt-PT as in the earlier reviewed Brazilian text; no replacement
adjective is invented. The inverted word order in the
Portuguese “meu americano amigo” is corrected.

Christie repairs include the clock striking one rather than hitting an object;
a wristwatch rather than “pulso— assistir”; and Owen rather than the listener
being unable to arrive. The comfortable silence follows the group's satiation.
Earlier Brazilian tide and invitation passages were checked alongside pt-PT
without inventing a count of five-pound notes. The Portuguese tide passage
retains the storm abating rather than asserting it stopped. Source line breaks
and all existing emphasis markup are preserved.

Earlier unresolved passages from other books remain drafts. Newly reviewed
Brazilian IDs:

```text
0100-009 0109-000 0117-001 0121-000 0147-001 0251-000 0628-000 0648-002
0733-001 0800-000 0800-022 0837-001 0853-001 0900-021 0916-000 0930-006
0931-001 0935-004 0943-001 0944-000 0950-004 0957-001 1018-000 1019-000
1055-007 1300-012 1303-000 1400-019 1428-001 1718-001 1727-001 1731-001
1812-002 1938-000 2000-014 2008-000 2120-002 2130-004 2150-004 2243-001
2255-003
```

Validation: 179 Python tests pass; strict metadata, markup and highlight checks
pass for every row in both Portuguese CSVs, including Brazilian drafts. The
review ledger matches all 1,134 approvals. Generated Brazilian Web data contains
1,134 approved quotes in 665 minutes. All changes remain local.

Both Mac bundles are synchronized and match every approved CSV passage;
Brazilian drafts remain excluded.


## Nightingale, The Hammer of God and If It Bleeds: 2026-11-18

Read every catalogue passage from these three works against the declared
English sources and both Portuguese forms. Forty-five previously pending
Brazilian rows are approved: 1,179 reviewed, 2,461 drafts. Corrections affect
33 Brazilian and 34 Portuguese rows. Canonical metadata, source CSVs,
attribution entries and UI strings are unchanged.

Nightingale repairs include explicit 00:17 and 00:38 wording rather than
ambiguous twelve-hour daytime readings; the missing Collins surname and
reciprocal observation of the female suspects; and six feet two inches rather
than an inaccurate 1.80 metres. The bottle-of-milk passage retains drinking
a little from the top rather than “off the top” as a physical displacement.
The tin of polish is described generically as a product for polishing, without
inventing nail varnish or a specific surface. The solicitor allocates time to
the police rather than sparing the police, Sister is a nursing title rather
than an invented religious role, and constable is not an invented forename.
The 12:32 repeated reports do not acquire a new AM/PM period.

The Hammer of God repairs include an application by letter rather than an
app; civil clothing rather than “civilized elegance”; coloured socks; and an
old parish rector rather than a former rector. Torvik is already standing at
the post office rather than newly stopping there. The remaining twenty-two
minutes and the source's less-than-fifteen-minute preparation window remain.
The after-twelve passage uses doze without adding an unsupported day period.
The housemaster is described neutrally as the person responsible for the house,
without inventing ownership.

If It Bleeds repairs include someone buried in the ground rather than lying
on the floor; a turnpike as a toll road rather than a tollbooth; a driveway
reversed out of rather than a garage doorway; and Holly getting out of bed
rather than a new assertion about when she woke. The source's unspecified
“seventy” remains unspecified, without inventing a speed unit or converting it.
The arrival by five-twenty remains a deadline, and the caffeine restriction
retains the source's explicit 08:00 A.M., however unusual it may seem.

Earlier unresolved passages remain drafts. Newly reviewed Brazilian IDs:

```text
0000-052 0000-053 0017-000 0032-000 0038-000 0100-001 0200-001 0230-000
0300-001 0300-003 0520-000 0549-000 0559-001 0655-000 0724-001 0750-001
0759-001 0800-004 0825-001 0900-001 0929-001 0938-000 1008-000 1110-000
1200-013 1200-014 1200-015 1220-002 1225-001 1232-000 1300-002 1300-003
1400-003 1419-000 1434-000 1720-001 1900-002 1959-000 2208-000 2256-001
2302-001 2310-001 2330-000 2348-000 2353-001
```

Validation: 179 Python tests pass; strict source-metadata, markup and highlight
checks pass for every row in both Portuguese CSVs, including Brazilian drafts.
Web data and Mac bundles are regenerated and match every approved passage.
The Brazilian bundle contains 1,179 quotes in 685 minutes, with no drafts.
The review ledger matches its CSV approval set. All changes remain local.


## Review checkpoint: Crichton and Mehran

Read all 29 catalogue passages from Jurassic Park and Pomegranate Soup against
the declared English sources and both Portuguese variants. All 29 Brazilian
rows are now approved: 1,208 reviewed, 2,432 drafts. Corrections affect 28 rows
in each variant. Canonical metadata, source CSVs, attributions and UI strings
are unchanged.

Jurassic Park repairs include the missing full stop after 05:00; past rather
than present remaining time; agreement with the electrified fences; travel by
raft rather than carrying a raft; habitual animal behaviour rather than a
single completed event; and nine-thirty expressed as a time rather than
"Foi apenas". The diffuse shadows are no longer described as blunt. The source
explicitly identifies the hatchling as female. Repeated passages at 07:15 and
19:15, 09:20 and 21:20, and 09:30 and 21:30 keep their unqualified twelve-hour
wording; the source does not justify adding a day period.

Pomegranate Soup repairs include 146 pounds rather than 146 kilograms;
"on my watch" as a reading on a clock rather than a work shift; Marjan's feminine
agreement; a new batch of bread as a fornada; a food order rather than a command;
and a restriction on priests' relationships rather than an assertion that women
are absent. The kitchen passage now has a complete sentence with transparent
containers filled with vegetables and brine, rather than transparent metal cans
and an unattached verb. Angelica modifies the lentil salad as an ingredient.
The eight-o'clock early hour is no longer called the middle of the night.
The narrator's unusual rhubarb-gray eye description is preserved without trying
to correct the English image.

The contextual reading of "tinker" is itinerant people, rather than an assertion
that the girl herself practises metalwork. The descriptive translation retains
the metalworking term and adds itinerancy, without assigning a different ethnic
identity. See the [Cambridge traveller sense](https://dictionary.cambridge.org/dictionary/english/tinker)
and [Collins usage](https://www.collinsdictionary.com/dictionary/english/tinker).
This is a contextual editorial interpretation, not a verified published wording.

Earlier unresolved passages remain drafts. Newly approved Brazilian IDs:

```text
0000-023 0200-018 0400-018 0500-002 0500-003 0500-014 0513-000 0530-003
0700-006 0715-000 0800-006 0800-007 0800-019 0830-007 0840-001 0900-017
0920-003 0930-002 1000-020 1445-002 1453-001 1500-003 1800-018 1915-001
2000-002 2100-003 2120-001 2130-001 2300-014
```

Validation: 179 Python tests pass; strict metadata, markup and highlight checks
pass for all 3,640 rows in each Portuguese CSV, including drafts. Web data and
Mac bundles are regenerated. Every approved passage matches its bundled text,
and Brazilian approvals match the local review ledger exactly. The Brazilian
bundle contains 1,208 quotes in 688 minutes, with no drafts. All changes remain local.


## Full-catalogue publication decision

At the user’s explicit request, clear Draft on all 2,432 remaining Brazilian
passages so the regular locale includes all 3,640 rows. Publication status no
longer indicates editorial approval. The review ledger and historical ID lists
continue to identify the 1,208 actually reviewed passages; do not add the other
IDs to that ledger merely because they are published. Earlier checkpoints above
describe the draft status at those historical stages. Further review should use
the review ledger rather than filtering CSV Draft=true.

Validation after clearing draft status: all 3,640 Brazilian rows pass strict
translation validation, 179 Python tests pass, and Web and Mac catalogues
contain the same 3,640 passages across 1,438 minutes. The obsolete pt-BR-draft
Web output is removed by generation. The editorial ledger still has 1,208 IDs.
