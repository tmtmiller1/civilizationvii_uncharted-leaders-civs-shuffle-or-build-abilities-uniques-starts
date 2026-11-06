# SQLite features the mod's SQL uses

The tests run the mod's SQL on Node's SQLite (3.50.2 on 2026-11-06). The game runs it on its own copy, which is older,
so a statement can pass every test and still fail at game creation. This file lists what the SQL uses, so each item can
be checked against the game's SQLite in a lab run (CONTRACTS section 11).

## The game's SQLite

The game's Debug copies (`Debug/gameplay-copy.sqlite`, `Debug/frontend-copy.sqlite`, written 2026-11-06 11:05) carry
3040001 in header bytes 96-99, the version of the library that last wrote the file. That's SQLite 3.40.1, the game's
own library. It's read from the file header, not watched in a game; the cheap lab check is one
`Database.query("gameplay", "SELECT sqlite_version()")` from a game-scope script.

What 3.40.1 means for the SQL:

- It has window functions (3.25), UPSERT (3.24), `UPDATE ... FROM` (3.33), `RETURNING` (3.35), `iif()` (3.32),
  `NULLS FIRST/LAST` and aggregate `FILTER` (3.30), and JSON built in (3.38).
- It doesn't have `string_agg()` or `concat()`/`concat_ws()` (3.44), so those fail in the game even though Node runs
  them. `sqlite-features.mjs` fails the build on any feature newer than 3.40.1.
- Math functions (`floor`, `pow`, `mod` and the rest) depend on a build option the game may not have set. Integer
  arithmetic with `%` and `CAST(a / b AS INTEGER)` covers what the deal needs.

## What CONTRACTS rules out

CONTRACTS section 5.1 keeps the SQL and `computeDeal()` in step, so whatever the version:

- no window functions (rank is a correlated `COUNT(*)` of smaller ids);
- no `random()` (all randomness is `lshufKeySql`);
- no floating point (integer division as `CAST(a / b AS INTEGER)` on non-negative values).

`sqlite-features.mjs` fails on any of the three.

## The scanner

`tests/_sqlite-features.mjs` reads every `.sql` file under `data/` (generated deal SQL, the mapping, the setup copy, the
parameters, the schema), blanks out comments and string literals, and matches each feature in its list. To refresh
the table below after the SQL changes:

```
node tests/_sqlite-features.mjs --write
```

The test fails while the table is out of date, so a regenerated deal that starts using something new shows up here.
The table below was written on 2026-11-06 from 513 SQL files, workstream B's first generated deal included.

## Found in the SQL

<!-- @FOUND-BEGIN -->
| Feature | Since | Files |
| --- | --- | --- |
| Common table expressions (WITH ... AS) | 3.8.3 | `data/text-generated/lshuf-piece-text.sql` |
| WITH RECURSIVE | 3.8.3 | `data/text-generated/lshuf-piece-text.sql` |
| INSERT OR IGNORE / OR REPLACE | 3.0.0 | `data/frontend/parameters.sql`, `data/generated/deal/deal-3-attributes.sql`, `data/generated/deal/deal-6-apply.sql` and 249 more |
| REPLACE INTO | 3.0.0 | `data/generated/options/opt-Abilities-LSHUF_OFF.sql`, `data/generated/options/opt-Abilities-LSHUF_REDEALT.sql`, `data/generated/options/opt-Attributes-LSHUF_OFF.sql` and 20 more |
| INSERT ... SELECT | 3.0.0 | `data/frontend/parameters.sql`, `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql` and 5 more |
| Multi-row VALUES | 3.7.11 | `data/frontend/parameters.sql`, `data/generated/known-leaders.sql`, `data/mapping/lshuf-mapping.sql` and 2 more |
| Correlated subqueries (COUNT(*) rank) | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` and 2 more |
| EXISTS / NOT EXISTS | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` and 3 more |
| UNION / UNION ALL / INTERSECT / EXCEPT | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-4-biases.sql`, `data/generated/deal/deal-6-apply.sql` and 1 more |
| CASE expressions | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` and 4 more |
| instr() | 3.7.15 | `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-4-biases.sql`, `data/text-generated/lshuf-piece-text.sql` |
| substr / replace / trim / upper / lower / length | 3.0.0 | `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-4-biases.sql`, `data/text-generated/lshuf-piece-text.sql` |
| % (modulo) and integer arithmetic | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` and 1 more |
| Multi-argument min() / max() | 3.0.0 | `data/generated/deal/deal-4-biases.sql` |
| coalesce / ifnull / nullif | 3.0.0 | `data/generated/deal/deal-1-prepare.sql`, `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-4-biases.sql` and 2 more |
| CREATE INDEX | 3.0.0 | `data/generated/deal/deal-2-ability.sql` |
| CREATE VIEW | 3.0.0 | `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` |
| DROP TABLE / VIEW / INDEX / TRIGGER | 3.0.0 | `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql` |
| LIMIT / OFFSET | 3.0.0 | `data/generated/deal/deal-2-ability.sql`, `data/generated/deal/deal-3-attributes.sql`, `data/generated/deal/deal-5-results.sql` |
<!-- @FOUND-END -->

## Lab checks owed

Everything in the table above is in SQLite 3.40.1, and none of it needs a build option, so the version alone doesn't
rule anything out. What a lab run still has to show is the game's loader taking these statements inside a mod's
`UpdateDatabase` file. One probe mod with one small file per row, each writing a row the probe reads back, covers it
in one run. The rows most worth watching:

| Feature | Used in | Why it's worth a look |
| --- | --- | --- |
| `CREATE VIEW` and `DROP VIEW` in a gameplay file | B's `deal-2-ability.sql`, `deal-3-attributes.sql` | No base-game or probe file has done this in the game's loader yet |
| `CREATE INDEX` on our own work tables | B's `deal-2-ability.sql` | Same |
| `LIMIT` inside a subquery | B's deal files | Plain SQL, but the deal leans on it to pick one row per step |
| Correlated `COUNT(*)` ranks at the deal's size | B's deal files | Fine in any version; the cost shows as load time, so time a game start with the mod on |
| `WITH RECURSIVE` | D's `lshuf-piece-text.sql` (`UpdateText`, the localization database) | Runs in a different database from the gameplay SQL; check the piece text appears |
| `REPLACE INTO` | B's option files | Replaces an `LShufOptions` row; check the option reads back in `LShufOptions` |
| 64-bit products in `lshufKeySql` | B's deal files | Values stay under 2^53 (`tests/key.mjs`), well inside SQLite's 64-bit integers |

Ruled out by the tests, so they don't need a lab check: window functions, `random()`, floating point, and anything
newer than 3.40.1 (`string_agg`, `concat`).
