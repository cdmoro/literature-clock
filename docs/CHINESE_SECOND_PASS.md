# Segunda revisión del catálogo chino

Se revisaron las 305 alertas numéricas iniciales, el único caso de longitud y las 946 parejas de expresiones horarias que no cubría el analizador. Se corrigieron 73 filas adicionales. Quedan 3.639 citas habilitadas y una en borrador.

La revisión numérica compara cantidades, edades, fechas, unidades y horas con el original. La revisión horaria compara los fragmentos resaltados y consulta el pasaje cuando hay un problema; no certifica la calidad literaria de todas las citas.

## Correcciones representativas

| ID | Error anterior | Corrección |
| --- | --- | --- |
| 0008-000 | Medianoche pasada a las ocho | Ocho minutos después de medianoche |
| 0025-001 | 25 minutos y 20 segundos | 25 minutos |
| 0030-001 | Se perdió la media hora | Media hora después de medianoche |
| 0646-001 | 06:59 | Un minuto después de las 06:45 |
| 0845-003 / 2045-000 | 09:45 | Menos cuarto para las nueve |
| 0925-000 | Hora secundaria 09:50 | 09:52 |
| 1317-001 | 17:00 y segundos | 13:17:04 y 13:17:40 |
| 1654-003 | Año 1654 | Hora local 16:54 |
| 2010-002 | Año 2010 inventado | Conservar Y.D.A.U.; la hora es 20:10 |
| 2314-000 | 23:15 | 23:14 |
| 0320-000 | Edad omitida | Restituir 16 años |
| 1520-003 | Ocho repeticiones | Restituir las nueve del original |
| 0810-003 | Cantidad de teléfonos | Recuento de células |
| 2030-000 | Temperatura negativa inventada | Conservar 20 grados sin añadir signo ni unidad |
| 2316-001 | Una multiplicación de 2 por 2 | Doblar repetidamente hasta 2 elevado a 15 |

También se repararon otras expresiones de minutos restantes, separadores de horas, relojes militares traducidos como duraciones, duplicaciones accidentales, una salida del puerto convertida en fondeo, un lapso de memoria convertido en limpiar una cara y otros errores de sentido claros. Se conservaron aproximaciones, segundos y repeticiones intencionales.

## Alertas que no eran errores

De las 311 decisiones numéricas/de longitud (306 iniciales y cinco alertas nuevas tras las reparaciones), 274 conservan una localización válida, 35 registran correcciones, una conserva una traducción compacta y una necesita contexto del original. La frase breve de 2230-006 conserva la administración tardía de la dosis y el comienzo de los efectos a las diez y media; su menor longitud no implica omisión.

El valor de 297 pulgadas del barómetro en 0817-003 también aparece en la [edición inglesa publicada por Lit2Go](https://etc.usf.edu/lit2go/222/the-journey-to-the-center-of-the-earth/5666/chapter-xviii-the-wonders-of-terrestrial-depths/). Se conserva fielmente, sin normalizar una posible errata de la edición.

Algunos contextos del original siguen siendo ambiguos: 0557-000 dice 05.57 pero describe preparar la cena; la traducción conserva 5:57 sin añadir AM/PM. En 1240-001, five pound notes permite ambigüedad entre cantidad y denominación; la traducción conserva billetes de cinco libras, sin especificar un total. Estas observaciones no se clasifican como errores chinos confirmados.

## Límite y caso pendiente

El analizador ampliado compara 3.369 parejas horarias sin discrepancias. Las otras 271 contienen formas fuera de esa gramática, aproximaciones, intervalos, precisión en segundos o aritmética narrativa. Sus resaltados fueron examinados; sigue siendo útil una revisión literaria completa por una persona conocedora del chino.

0000-032 requiere verificar la edición: el original dice 12.00 pm y está asignado a medianoche. Queda en borrador y se describe en CHINESE_PENDING_REVIEW.md.

## Evidencia reproducible

`chinese-corrections.json` conserva los cambios anteriores/nuevos y sus razones. `chinese-second-pass.json` conserva todas las decisiones, junto con huellas de los campos de origen y traducción; una modificación posterior invalida la decisión. El reporte conserva las alertas automáticas y agrega la resolución humana.

```sh
python3 scripts/review_chinese.py --output docs/chinese-review.json
python3 scripts/review_chinese_second_pass.py
python3 -m unittest discover -s scripts -p 'test_*.py'
```
