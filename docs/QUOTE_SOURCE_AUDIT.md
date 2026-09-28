# Quote source migration audit

The migration changes only the new `Source locale` column. All existing fields and row order were compared with the base commit and remain unchanged.

## Evidence and decisions

- Followed the complete local history of `quotes.en-US.csv`, including its previous name `quotes.en.csv`. The initial catalogue was added in `e9ad42ae1` (2024-04-07), renamed in `311f0fa22` (2024-04-14), and copied to British English in `038e6b0d9` (2026-09-13).
- `b284cfb2d` (2024-10-20) adds 57 passages and a batch script explicitly configured with `language_code = es-ES`. The contributor confirmed that all 57 were supplied in Spanish and requested the regional provenance listed below. These regional assignments apply only to this confirmed batch, not automatically to every work by these authors.
- IDs were introduced in `1eb1db8e6`. 49 passages matched current Spanish text exactly at the same time. Seven have minor punctuation, whitespace or wording corrections (similarity above 95%, same time and author). The remaining Cervantes passage matches exactly but moved from 22:57 to 21:57; its current ID is `2157-003`.
- All other passages use general `en`: the catalogue source is English, but an en-US filename or author nationality alone does not establish regional provenance. Joyce therefore uses `en`. Specific English regions can be refined with edition/source evidence later.

## Confirmed Spanish batch

| ID         | Source locale | Book                              | Author                 |
| ---------- | ------------- | --------------------------------- | ---------------------- |
| `0000-054` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0000-055` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0000-056` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0000-057` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `0000-058` | `es-CL`       | El hondero entusiasta             | Pablo Neruda           |
| `0200-025` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0300-049` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `0304-001` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0400-027` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0400-028` | `es-CL`       | Los detectives salvajes           | Roberto Bolaño         |
| `0500-022` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `0500-023` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `0530-008` | `es-AR`       | Rayuela                           | Julio Cortázar         |
| `0559-002` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `0600-018` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `0600-019` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `0600-020` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `0700-023` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `0745-007` | `es-CL`       | Los detectives salvajes           | Roberto Bolaño         |
| `0759-003` | `es-CL`       | Los detectives salvajes           | Roberto Bolaño         |
| `0900-037` | `es-CO`       | Doce cuentos peregrinos           | Gabriel García Márquez |
| `0900-038` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `1000-038` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `1000-039` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `1000-040` | `es-AR`       | Respiración artificial            | Ricardo Piglia         |
| `1020-004` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1158-004` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `1200-039` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `1200-040` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `1200-041` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `1359-001` | `es-AR`       | El juguete rabioso                | Roberto Arlt           |
| `1400-027` | `es-AR`       | El juguete rabioso                | Roberto Arlt           |
| `1400-028` | `es-AR`       | El juguete rabioso                | Roberto Arlt           |
| `1400-029` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1430-008` | `es-AR`       | Rayuela                           | Julio Cortázar         |
| `1500-041` | `es-AR`       | El juguete rabioso                | Roberto Arlt           |
| `1600-041` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `1630-013` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1700-032` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1700-033` | `es-ES`       | Llanto por Ignacio Sánchez Mejías | Federico García Lorca  |
| `1700-034` | `es-AR`       | Rayuela                           | Julio Cortázar         |
| `1800-031` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `1800-032` | `es-AR`       | Rayuela                           | Julio Cortázar         |
| `1900-024` | `es-CO`       | Doce cuentos peregrinos           | Gabriel García Márquez |
| `1900-025` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1900-026` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1900-027` | `es-CO`       | 100 años de soledad               | Gabriel García Márquez |
| `1930-010` | `es-AR`       | Rayuela                           | Julio Cortázar         |
| `2000-027` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `2000-028` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `2000-029` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `2157-003` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `2200-028` | `es-AR`       | Los siete locos                   | Roberto Arlt           |
| `2300-026` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |
| `2300-027` | `es-AR`       | El juguete rabioso                | Roberto Arlt           |
| `2357-002` | `es-CO`       | Doce cuentos peregrinos           | Gabriel García Márquez |
| `2358-002` | `es-ES`       | Don Quijote de la Mancha          | Miguel de Cervantes    |

## Subsequent additions

- `43aa44a40`, `7d947fc6f`, `cf83267d0` (2026-03-02): Joyce (`1145-005`), Laila Lalami (`0607-000`), Henry Adams (`0618-000`).
- `5153f619d` (2026-09-13): five additions. `c9c0366c7` removes the Rod Serling teleplay passage and moves the Hail, California! passage from `1028-000` to `2228-001`; the other surviving IDs are `1146-000`, `1231-000`, `1336-000`.
- `dcd2bc965` (2026-09-14): Lost Tomorrows (`0821-000`).

This audit establishes project reference languages, not original publication languages for all books. No linguistic corrections or retranslations are included.
