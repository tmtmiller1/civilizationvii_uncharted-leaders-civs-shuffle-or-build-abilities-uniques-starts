# Build contracts

The single source every workstream builds against, for the first full build (2026-11-06). Names here are exact.
If something you need isn't here, or something here is wrong, stop and report it to the lead; don't invent a name.
The design is [docs/SPEC.md](docs/SPEC.md); where this file and the spec differ, section 12 says why.

The lead owns this file and the files marked "lead" below. Code mirrors of these names:
[shared/lshuf-constants.js](shared/lshuf-constants.js), [shared/lshuf-known-leaders.js](shared/lshuf-known-leaders.js),
[shared/lshuf-key.js](shared/lshuf-key.js), [shared/lshuf-text.js](shared/lshuf-text.js). Import them; don't retype
their strings.

## 1. Who owns what

Write only inside your own paths. Everyone may read everything.

| Owner | Paths |
| --- | --- |
| Lead | `CONTRACTS.md`, `shared/lshuf-*.js`, `data/schema/`, `modinfo.template.xml`, the `.modinfo`, `scripts/build-modinfo.mjs`, `scripts/check-syntax.mjs`, `package.json`, `eslint.config.js`, `.gitignore`, `tests/run-all.mjs`, `tests/loader.mjs`, `tests/register-loader.mjs` |
| A. Mapping data | `scripts/mapping/`, `data/mapping/` |
| B. Deal engine and gameplay SQL | `shared/deal/`, `scripts/generate/`, `data/generated/` |
| C. Setup window and setup scripts | `ui/setup/`, `data/frontend/` |
| D. In-game display | `ui/game/`, `ui/display/`, `data/text-generated/`, `data/setup-copy/`, `scripts/setup-copy/` |
| E. Tests and fixtures | `tests/` (apart from the three lead files), `scripts/fixtures/` |
| F. Player-facing text and docs | `text/`, `docs/steam-workshop-description.txt` and the descriptions built from it, `README.md`, `CHANGELOG.md` |

Tests belong to E. Other workstreams check their own work with scripts inside their own `scripts/` folder (for
example `scripts/generate/selfcheck.mjs`) and say in their report what ran.

Nobody launches the game or runs a lab, probe, deploy, db build or sim command. Nobody commits.

## 2. Setup parameters (frontend `Parameters`)

Written by C in `data/frontend/parameters.sql` (shell scope). Every one: `ConfigurationGroup = 'Game'`,
`GroupID = 'GameOptions'`, `Hidden = 1`, `ReadOnly = 0`, `Supports{SinglePlayer,LANMultiplayer,InternetMultiplayer,
HotseatMultiplayer} = 1`, `ChangeableAfterGameStart = 0`. `SortIndex` 2300 upward in the order below (SR uses
2100-2104, Economics 2200-2213). `ConfigurationKey` equals `ParameterID` unless the table says otherwise. No option
stays on the advanced screen, so the mod adds **no `ParameterGroups` row**.

| ParameterID | Domain | Array | Default | ConfigurationKey | Name / Description keys |
| --- | --- | --- | --- | --- | --- |
| `LShufMode` | `LShufModeValues` | 0 | `LSHUF_MODE_NONE` | | `LOC_LSHUF_MODE_NAME` / `_DESC` |
| `LShufBiases` | `LShufOnOffValues` | 0 | `LSHUF_REDEALT` | | `LOC_LSHUF_BIASES_NAME` / `_DESC` |
| `LShufAbilities` | `LShufOnOffValues` | 0 | `LSHUF_REDEALT` | | `LOC_LSHUF_ABILITIES_NAME` / `_DESC` |
| `LShufAttributes` | `LShufOnOffValues` | 0 | `LSHUF_REDEALT` | | `LOC_LSHUF_ATTRIBUTES_NAME` / `_DESC` |
| `LShufKeepMine` | `bool` | 0 | `0` | | `LOC_LSHUF_KEEP_MINE_NAME` / `_DESC` |
| `LShufKeepBuiltCiv` | `bool` | 0 | `1` | | `LOC_LSHUF_KEEP_BUILT_CIV_NAME` / `_DESC` |
| `LShufLeadersOut` | `LShufLeaderValues` | 1 | NULL | `LShufExcludedLeaders` | `LOC_LSHUF_LEADERS_OUT_NAME` / `_DESC` |
| `LShufModdedAbilities` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_ABILITIES_NAME` / `_DESC` |
| `LShufModdedAttributes` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_ATTRIBUTES_NAME` / `_DESC` |
| `LShufModdedBiases` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_BIASES_NAME` / `_DESC` |
| `LShufModdedOut` | `LShufModdedLeaderValues` | 1 | NULL | `LShufExcludedModdedLeaders` | `LOC_LSHUF_MODDED_OUT_NAME` / `_DESC` |
| `LShufLeaderPoolOut` | `LShufPoolLeaderValues` | 1 | NULL | `InvertSelection` | `LOC_LSHUF_POOL_NAME` / `_DESC` (the Leader pool: a ticked list, the unticked leaders are stored; section 27) |
| `LShufPersonality` | `LShufPersonalityValues` | 0 | `LSHUF_PERSONA_FOLLOWS` | | `LOC_LSHUF_PERSONALITY_NAME` / `_DESC` |
| `LShufDealing` | `LShufDealingValues` | 0 | `LSHUF_DEAL_BALANCED` | | `LOC_LSHUF_DEALING_NAME` / `_DESC` |
| `LShufReveal` | `LShufRevealValues` | 0 | `LSHUF_REVEAL_START` | | `LOC_LSHUF_REVEAL_NAME` / `_DESC` |
| `LShufSeed` | `text` | 0 | `'1'` | | `LOC_LSHUF_SEED_NAME` / `_DESC` |

In the table, "`LOC_LSHUF_MODE_NAME` / `_DESC`" means `Name = 'LOC_LSHUF_MODE_NAME'` and
`Description = 'LOC_LSHUF_MODE_DESC'`: the `_DESC` key replaces `_NAME`, it isn't appended. For option values
(next table) `_DESC` is appended to the value's key: `LOC_LSHUF_MODE_NONE_DESC`.

`LOC_LSHUF_BIAS_NONE` and `LOC_LSHUF_BIAS_MAP_SETS` are whole lines shown instead of `LOC_LSHUF_BIAS_LINE`, not
values for its `{1_List}`. A leader's reason line takes one reason key, or for a failed modded check one `LOC_LSHUF_WHY_*` key in place of
`LOC_LSHUF_REASON_MODDED_NOTOK`.

Array parameters carry `UxHint = 'InvertSelection'` for the two "left out" lists (the stored list holds the leaders
switched off) and no `UxHint` for the pools (the stored list holds the leaders in the pool).

`DomainValues` (C), each value with `Name` = the key shown and `Description` = that key + `_DESC`:

| Domain | Values in order (Name key) |
| --- | --- |
| `LShufModeValues` | `LSHUF_MODE_NONE` (`LOC_LSHUF_MODE_NONE`), `LSHUF_MODE_SWAP_ABILITIES`, `LSHUF_MODE_SWAP_LEADERS`, `LSHUF_MODE_SPLIT_MATCHED`, `LSHUF_MODE_SPLIT_RANDOM`; Name key = `LOC_` + value |
| `LShufOnOffValues` | `LSHUF_REDEALT` (`LOC_LSHUF_REDEALT`), `LSHUF_OFF` (`LOC_LSHUF_OFF`) |
| `LShufPersonalityValues` | `LSHUF_PERSONA_STAYS`, `LSHUF_PERSONA_FOLLOWS`, `LSHUF_PERSONA_REDEALT`; Name key = `LOC_` + value |
| `LShufDealingValues` | `LSHUF_DEAL_BALANCED`, `LSHUF_DEAL_CHANCE`; Name key = `LOC_` + value |
| `LShufRevealValues` | `LSHUF_REVEAL_START`, `LSHUF_REVEAL_MET`; Name key = `LOC_` + value |
| `LShufLeaderValues` | `'|' \|\| LeaderType \|\| '|'` for each frontend `Leaders` row (Domain `StandardLeaders`) whose type is in `VANILLA_LEADERS`; Name/Description = `LeaderName` |
| `LShufModdedLeaderValues` | the same for types in `MODDED_LEADER_TYPES` (only installed mods have a `Leaders` row) |
| `LShufPoolLeaderValues` | plain `LeaderType` for every `Leaders` row (Domain `StandardLeaders`), vanilla and modded; Name = `LeaderName` |
| `StandardLeaders` (added rows) | none (section 27: the pool entry is gone) |

The leader domains are selected through the frontend `Leaders` table, so a DLC or a mod the player doesn't have
isn't listed (`INSERT ... SELECT ... FROM Leaders WHERE LeaderType IN (...)`).

### Values in the game config

- `LShufSeed` holds the deal number as a decimal string, `"1"` to `"256"`. It's a `text` parameter so the config
  holds a string; a number never matches `ConfigurationValueMatches` (probe 7). The id contains "Seed", so Drongo's
  Random Improvements doesn't restore it (COMPATIBILITY.md).
- Selects hold their value string. `bool` parameters are matched with `<Value>1</Value>` (probe 13: `1` and `true`
  both matched).
- `LShufExcludedLeaders` and `LShufExcludedModdedLeaders` hold arrays of `|LEADER_X|` strings (probe 13).
  `LShufLeaderPoolOut` holds an array of plain `LEADER_X` strings (the leaders unticked in the Leader pool).

## 3. Game config keys written by script

Written with `Configuration.editGame().setValue(key, value)`, always as strings. All by C, in the `startCampaign`
handler (section 7), on the host only in multiplayer (`Network.isHost()` or no network game), in this order:

1. **Random slots.**
   Then each plain `RANDOM` slot gets one of the leaders its own `PlayerLeader` list offers as valid
   (`invalidReason == Valid`, so owned and unlocked), skipping leaders already in a slot, picked with `Math.random`
   (the engine's own pick isn't tied to the deal number either). In a network game the host picks only for AI slots
   and its own; a remote human's Random is left to the engine. A slot with nothing left, or a pick the engine
   refuses, stays plain `RANDOM`.
2. **`LShufKeep_<LEADER>`**: `"1"` for each human slot's final `PlayerLeader` when `LShufKeepMine` is on, read from
   `Configuration.getPlayer(id).leaderTypeName` just before start (not from a wrapper on the setter). `"0"` for every
   other leader in `KNOWN_LEADERS`, so a key left from an earlier setup can't match.
3. **`LShufModOK_<LEADER>`**: `"1"` for each listed modded leader that passes the live check (SPEC section 3,
   "Modded leaders", check 1). Written only when at least one of the three modded boxes is on; with all three off
   nothing is written. A failing leader gets `"0"`.
4. **`LShufNotInGame`**: an array of `|LEADER_X|` for each leader in `KNOWN_LEADERS` that isn't in any slot. Written
   as an empty array when any slot is still plain `RANDOM` after step 1, because the engine picks that leader after
   `startCampaign` and the script can't know it (section 12).
5. **`LShufPreview`**: written by D's `lshuf-setup-final` listener (section 7), not by C: a JSON string of the
   preview deal, so the game can tell when the real deal differs. Format is D's; only D reads it.

The modded check's reason for a failing leader is also kept for the reveal panel: C writes `LShufModWhy_<LEADER>` =
one of `REASON.ModdedNotOK` text codes (`"script"`, `"uiscript"`, `"importjs"`, `"missing"`) when the check fails.

## 4. Tables

### 4.1 Gameplay (`data/schema/gameplay-tables.sql`, lead)

Read the file for columns. What each holds:

| Table | Filled by | Holds |
| --- | --- | --- |
| `LShufSeed(Seed)` | B's per-seed groups | One row, the deal number as an integer. No row: treat as 1 |
| `LShufOptions(Name, Value)` | B's per-value groups | Names are the keys of `OPTION_DEFAULTS`; `KeepMine` and the three `Modded*` hold `'1'` when on. No row: the default |
| `LShufKept(LeaderType)` | B's keep groups | Kept leaders |
| `LShufOut(LeaderType, Reason)` | B's list groups | `Reason` = `list` (`LShufExcludedLeaders`), `moddedlist` (`LShufExcludedModdedLeaders`), `notingame` (`LShufNotInGame`) |
| `LShufModOK(LeaderType)` | B's mod-check groups | Listed modded leaders that passed the setup check |
| `LShufKnownLeaders(LeaderType, IsModded, ModId)` | B's generator, from `shared/lshuf-known-leaders.js` | The 38 + 27 known leaders |
| `LShufAttributeTraits(TraitType, AttributeType, TagType)` | lead, rows in the schema file | The seven attribute traits, their `Attributes` row and their frontend tag |
| `LShufMapping`, `LShufMappingModifiers`, `LShufMappingUnlocks`, `LShufReviewedSets` | A, `data/mapping/lshuf-mapping.sql` | Section 4.3 |
| `LShufResult*` | B's deal SQL | Section 5.3 |
| `LShufWork_*` tables, views `LShufWork_NextPiece`, `LShufWork_NextASlot` | B's deal SQL | The deal's working state; nobody else reads them |

### 4.2 Frontend (`config`)

The shell group loads `data/schema/gameplay-tables.sql` too, so every `LShuf*` table above also exists in `config`
(the result tables stay empty there), and A's mapping SQL fills the same mapping tables in both databases.
`data/schema/frontend-tables.sql` (lead) adds `LShufSetup_<Table>`: copies of the gameplay rows the deal reads, same
table name after the prefix, same column names, only the columns the deal reads. D's generator
(`scripts/setup-copy/`) fills them into `data/setup-copy/setup-copy.sql` from `Debug/gameplay-copy.sqlite`, plus the
listed modded leaders' rows read from their files on tp-share. The deal reads these tables and no others:

`Leaders`, `LeaderTraits`, `Traits`, `TraitModifiers`, `Modifiers`, `RequirementSetRequirements`, `Requirements`,
`LegacyCivilizations`, `LeaderCivPriorities`, `ProgressionTreeNodeUnlocks`, `ProgressionTreeNodes`, `Attributes`, and
the nine `StartBias*` tables (`BIAS_TABLES`), plus the mod's own `LShufMapping*`, `LShufReviewedSets`,
`LShufKnownLeaders`, `LShufAttributeTraits`.

If B finds the deal needs another table or column, B reports it and the lead adds it to both schema files.

Our setup tables all carry the `LShuf` prefix; never write to Drongo's `config` `StartBias*` tables, and never read
the shell's `gameplay` tables (they hold the last game's rows after a game, probe 10).

### 4.3 The mapping (A)

`LShufMapping`, one row per piece:

| Column | Meaning |
| --- | --- |
| `PieceId` | `pieceId.bullet(leader, n)` = `<LeaderType>__B<nn>` (two digits, 1-based), or `pieceId.agenda(leader)` = `<LeaderType>__AGENDA` |
| `LeaderType`, `AbilityTrait` | The source leader and its ability trait, found from data (SPEC "Find the ability from data") |
| `Kind` | `bullet` or `agenda` |
| `BulletIndex` | n for a bullet, as `splitBullets()` in `shared/lshuf-text.js` counts on the live English description; NULL for agenda |
| `BulletText` | That bullet's English text, for the review list only (the game shows live text, section 8) |
| `BiasTags` | `|TAG|TAG|`: a target type (`BIOME_*`, `TERRAIN_*`, `FEATURE_CLASS_*`, `RESOURCE_*`) or one of `COAST`, `RIVER`, `LAKE`, `NATURAL_WONDER`, `ISLAND` (`biasTableOfTag()`); NULL for none |
| `Value` | Rough strength, integer 1 (small) to 5 (large) |
| `SpecificTo` | The civ, unit, building, improvement or project types the piece names, as `|A|B|` like `BiasTags`, else NULL (47 vanilla modifiers by the data rule, against the spec's 42) |
| `Movable` | 1 if the piece can be dealt alone; 0 if it does nothing away from its leader, and then it travels in that leader's remainder |
| `Reviewed` | 0 until the owner confirms the row. Every row ships 0 |
| `Guess` | 1 when the bullet-to-modifier match is drafted from text and arguments, 0 when read from data |
| `IsModded`, `ModId`, `Note` | Modded leader flag and mod id; free note for the reviewer |

`LShufMappingModifiers(PieceId, ModifierId, Role)`: `Role` = `effect` (the bullet's own modifiers), `hidden` (rows
with no bullet that travel with this piece: Ibn Battuta's `MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_01`/`_02` on
his Wildcard bullet), `agenda` (the leader's agenda modifiers, on the `__AGENDA` piece: any whose effect starts `EFFECT_DIPLOMACY_AGENDA_`
or whose `ModName` argument is a `LOC_DIPLOMACY_AGENDA_*` key; 40 vanilla rows, against the spec's 37, because
Harriet Tubman, Tecumseh and Franklin use other effects). A leader with no agenda rows has no `__AGENDA` piece. An
ability with no `[LI]` bullets (Remilia, Yuyuko) has no bullet pieces and can only be dealt whole.

`LShufMappingUnlocks(ProgressionTreeNodeType, TargetType, RequiredTraitType, ProgressionTree, PieceId)`: each
legend-node unlock in vanilla with its tree, for review. `PieceId` is set only where an unlock follows one piece (Ibn
Battuta's to his Wildcard bullet); NULL means "the rule in SPEC section 3 decides". The deal reads unlocks live from
`ProgressionTreeNodeUnlocks` (rows whose `RequiredTraitType` is a leader's ability trait) and uses this table only for
the `PieceId` overrides, so nodes a DLC or another mod adds follow the same rule.

`LShufReviewedSets(AbilityTrait, ModifierSet)`: for each listed modded leader, its ability's modifier ids as reviewed,
sorted, as `|A|B|C|`. Check 3 compares the live set with it.

## 5. The deal

### 5.1 One module, two runners

`shared/deal/lshuf-deal.js` (B) is pure JS: no game globals, no imports outside `shared/`. The generator
(`scripts/generate/`) turns the same algorithm into SQL. **The SQL and `computeDeal()` give the same result rows for
the same tables and the same config.** E tests it on fixture databases for a sample of seeds and options.

To keep that true:

- All randomness comes from `lshufKey(seed, salt, rank)` in `shared/lshuf-key.js` (SQL form: `lshufKeySql`).
  Integer arithmetic only, no `random()`, no floating point. Divide with integer division in both (`CAST(a / b AS
  INTEGER)` in SQL, `Math.floor(a / b)` in JS, both on non-negative values).
- `rank` is the 0-based position of an item in its list sorted by id ascending, BINARY order. JS sorts with plain
  `<` on strings, which matches BINARY for these ids. SQL computes rank with a correlated `COUNT(*)` of smaller ids,
  not window functions (whether the game's SQLite has them is a lab check).
- Ties in a key break by id ascending.
- Loops are bounded and unrolled by the generator to a fixed count (the attribute redraw cap, the balanced deal's
  steps), so the SQL is plain statements.
- Every list the deal walks is defined by the input tables only. Nothing depends on row order in a table.

### 5.2 Exports

```js
// shared/deal/lshuf-deal.js
export const DEAL_VERSION;                    // integer; bump when the algorithm changes
export function buildDealInput(readTable, config);   // -> DealInput
export function computeDeal(input);           // -> DealResult
```

- `readTable(name)` returns an array of plain row objects for a table name in section 4.2's list, with the gameplay
  column names. In the game and in tests it reads the gameplay table `name`; in the shell D passes a reader of
  `LShufSetup_<name>` (and the plain `LShuf*` mapping tables), filtered to leaders that have a `config` `Leaders` row.
- `config` is `{ seed, options, kept, out, modOK }`: `seed` an integer; `options` an object with every key of
  `OPTION_DEFAULTS` (missing keys take the default); `kept` and `modOK` arrays of leader types; `out` an array of
  `{ LeaderType, Reason }`. It mirrors `LShufSeed`, `LShufOptions`, `LShufKept`, `LShufModOK` and `LShufOut` exactly.
- `DealResult` is `{ leaders, pieces, attributes, biases, unlocks, meta }`, arrays of row objects whose keys are the
  columns of `LShufResultLeaders`, `LShufResultPieces`, `LShufResultAttributes`, `LShufResultBiases`,
  `LShufResultUnlocks` and `LShufResultMeta`.

### 5.3 What the result tables hold

The final state for **every** leader with `IsMajorLeader = 1`, dealt or not, so readers never have to fall back to
the shipped tables:

- `LShufResultLeaders`: `Status` `dealt` (in at least one axis) or `asshipped`. `Axes` = `|ABILITY|ATTRIBUTES|BIASES|`,
  the axes this leader was dealt in (NULL when none). `Reason` for an `asshipped` leader, or for an axis left out, from
  `REASON`. `AbilityFrom`: the leader whose whole ability it holds (whole modes), the largest donor (split modes),
  itself when as shipped, NULL when abilities are Off. `PersonaFrom`: whose agendas and `LeaderCivPriorities` it
  plays with. `BiasFrom`: the leader whose bias rows it holds (Swap whole leaders), itself when as shipped, NULL when
  rolled, built from tags, or Off.
- `LShufResultPieces`: one row per piece a leader holds, in description order (`SortIndex` from 0). `Kind` `bullet`
  (a mapping piece), `remainder` (`<Leader>__REST`: modifiers on a source ability that the mapping doesn't list, or
  pieces with `Movable = 0`), `whole` (`<Leader>__WHOLE`: a whole ability, including a leader's own when as shipped).
  No rows for a leader whose ability is Off.
- `LShufResultAttributes`: each leader's final attribute traits. `FromLeaderType` NULL for `TRAIT_LSHUF_EQUAL_ACTIONS`.
  `Copy` is 0 for a leader's first card of a kind and n for its (n+1)th. `LeaderTraits` holds a trait once per leader,
  so copy n > 0 is applied as `TRAIT_LSHUF_EXTRA<n>_<TraitType>`, a trait made only when a deal uses it, carrying
  copies (`LSHUF_EXTRA<n>__<ModifierId>`) of every modifier on the attribute trait except its diplomatic-action
  unlocks, read from the live tables.
- `LShufResultBiases`: every start-bias row after the deal, leaders and civs, one row per bias. `TargetType` NULL for
  tables with no target column. `Origin`: `shipped`, `moved`, `rolled`, `tags`.
- `LShufResultUnlocks`: each ability-gated unlock: `FromTraitType` its shipped `RequiredTraitType`; `ToLeaderType` and
  `ToTraitType` its holder after the deal (unchanged for as-shipped leaders; NULL both when abilities are Off and the
  unlock is removed).
- `LShufResultMeta`: `Seed`, `Mode`, `DealVersion`, and `Fallback` = `too-few` for each axis with fewer than two
  leaders (Name `Fallback_ABILITY` / `Fallback_ATTRIBUTES` / `Fallback_BIASES`, Value `too-few`).

### 5.4 Who is in the deal

Per axis (ability, attributes, biases), a leader is in that axis's pool when all hold:

- it has `IsMajorLeader = 1` in `Leaders` and is in `LShufKnownLeaders`;
- it isn't in `LShufKept` and has no `LShufOut` row;
- it isn't an observer (an ability with no `TraitModifiers` rows and no attribute traits);
- a modded leader also needs `LShufModOK`, that axis's modded box on (`ModdedAbilities` / `ModdedAttributes` /
  `ModdedBiases` = `'1'`), and no modifier on its ability using `REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES` (check 2).
  In the split modes, a modded leader whose live ability modifier set differs from `LShufReviewedSets` goes in as
  one whole piece (check 3).
- In the split modes, a leader with any mapping row `Reviewed = 0` goes in as one whole piece too, so the modes work
  before review finishes.

The Off switches act on the same pools: they change the leaders in that axis's pool and leave the others as
shipped. With `Mode` `LSHUF_MODE_NONE` nothing is dealt but the Off switches still apply. Everything else (the five
modes, biases, legend nodes, AI personality, Balanced and Pure chance) is SPEC sections 1, 3, 5 and 6.

## 6. What the gameplay SQL changes (B)

SPEC section 3, "Living with other mods" and "Data safety", are binding. In short:

- Touch only a leader's ability row and attribute rows in `LeaderTraits`. Never select by a `TRAIT_LEADER_%` pattern;
  find the ability as the leader's trait whose `Traits.Name` is set, and attributes through `LShufAttributeTraits`.
- Don't delete rows from `Traits` or `Modifiers` (their delete triggers cascade into `TraitModifiers` and other
  tables). Remove `LeaderTraits` rows instead.
- `TraitModifiers` gets INSERTs only, never UPDATE (a Confucius mod has an UPDATE trigger on it).
- Insert only rows whose parents exist (`... WHERE ModifierId IN (SELECT ModifierId FROM Modifiers)`, leaders through
  `Leaders`, civs through `Civilizations`).
- New gameplay ids (each first inserted into `Types` with `Kind = 'KIND_TRAIT'` where it's a trait):
  - `TRAIT_LSHUF_<LEADER>` (`TRAIT.dealt`): the split modes' dealt ability. `Name` = the leader's own ability `Name`
    key, read live; `Description` = `LOC_LSHUF_TRAIT_DEALT_DESCRIPTION`; `InternalOnly = 1`.
  - `TRAIT_LSHUF_PERSONA_<LEADER>` (`TRAIT.persona`): agendas kept apart from an ability (abilities Off, or a
    personality setting that separates them). `Name` NULL, `InternalOnly = 1`.
  - `TRAIT_LSHUF_EQUAL_ACTIONS`: attributes Off; carries the twelve `MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_*` modifiers.
    `Name` NULL, `InternalOnly = 1`.
  - Copied modifiers: `LSHUF_<RECEIVER_LEADER>__<ORIGINAL_MODIFIER_ID>` (`copiedModifierId`), every column and
    argument copied as it is. The `Tooltip` stays the giver's, so a yield line names the ability the bonus came
    from (the swap to the receiving leader's ability name came out 2026-11-11 at the owner's ask).
  - Copied AI lists for `TRAIT_LSHUF_<LEADER>`: `ListType` = `LSHUF_<LEADER>__<ORIGINAL_LIST_TYPE>`.
- In whole modes, leader X's ability row becomes leader Y's ability trait (X's own row removed). Text and AI lists
  come with the trait; legend unlocks need no rewrite.
- In split modes, X's ability row is removed and `TRAIT_LSHUF_<X>` added; unlocks are rewritten by
  `UPDATE ProgressionTreeNodeUnlocks SET RequiredTraitType = ...` on rows selected by their shipped ability trait only.
- AiLists rows with a NULL `LeaderType` or `TRAIT_LEADER_MAJOR_CIV` are never touched.

## 7. JS modules shared across workstreams

Import paths in shipped code start with `/uncharted-leaders-and-civs/` (`MOD_PATH`).
Every `.js`/`.css` under `ui/` and `shared/` is listed in both scopes' `ImportFiles` by the modinfo builder.

| File | Owner | Scope | Exports / role |
| --- | --- | --- | --- |
| `shared/lshuf-constants.js` | lead | both | Every name in this file |
| `shared/lshuf-known-leaders.js` | lead | both | `VANILLA_LEADERS`, `MODDED_LEADERS`, `MODDED_LEADER_TYPES`, `KNOWN_LEADERS`, `isModdedLeader`, `moddedEntry` |
| `shared/lshuf-key.js` | lead | both | `lshufKey`, `lshufKeySql`, `SALT`, `KEY_PRIME` |
| `shared/lshuf-text.js` | lead | both | `splitBullets`, `bulletAt`, `joinBullets` |
| `shared/deal/lshuf-deal.js` | B | both | `DEAL_VERSION`, `buildDealInput`, `computeDeal` |
| `ui/setup/lshuf-setup.js` | C | shell, UIScripts entry | Button, window, defaults, `startCampaign` handler |
| `ui/setup/lshuf-setup-config.js` | C | shell | `readDealConfigFromSetup()` → the `config` object of 5.2 as the setup stands now, computing `kept`, `out` and `modOK` the same way the `startCampaign` handler writes them; `isLocalHost()` |
| `ui/setup/lshuf-mod-check.js` | C | shell | `checkModdedLeader(entry)` → `Promise<{ ok, why }>`; `checkModinfoText(xml, readFile)` and `isPortraitOnlyScript(text)`, pure, for E's tests; `WHY`, `modinfoActions`; `startModdedChecks()`, `moddedCheckResult(leaderType)`, `moddedChecksPending()`. The file reads are async and `startCampaign` is synchronous, so checks run when the script loads, when setup opens and when the window opens, and the handler reads the cached result (a check not finished counts as `missing`) |
| `ui/display/lshuf-setup-display.js` | D | shell, UIScripts entry | Leader-select preview and the config writes before start |
| `ui/display/lshuf-display-text.js` | D | both | `assembleDescription(pieces, lookups)`, `biasLine(biasRows, lookups)`; pure, for E |
| `ui/game/lshuf-game.js` | D | game, UIScripts entry | Config writes for a loaded save, reveal panel, City Details names |
| `ui/game/lshuf-city-details-names.js` | D | game | `nameStepsInTree(tree, ctx)` pure, for E; the model wrap |

Events, dispatched on `window` with `CustomEvent`:

- `lshuf-setup-changed` (`EVENT.SetupChanged`): C sends it after any of our parameters changes in the window. D
  redraws the preview.
- `lshuf-setup-final` (`EVENT.SetupFinal`), `detail` = the final `config` object: C sends it synchronously at the
  end of its `startCampaign` handler, after writing every key in section 3. D's listener writes `LShufPreview` and the
  `config` `LeaderItems`/`LeaderTags` rows, still before `startGame`.

C registers the only `startCampaign` listener the mod has.

## 8. Text

- English, written once, in `text/en_us/lshuf-text.xml` (F), `<Database><EnglishText><Row Tag="..."><Text>...`
  rows. Loaded by `UpdateText` in the shell and in the game. Other languages wait; F lists what needs translating.
- Generated text (D) in `data/text-generated/lshuf-piece-text.sql`: `LOC_LSHUF_PIECE_<PieceId>` for each bullet
  piece, in every language the game has, split from the live `LocalizedText` of the source ability's description
  with the same rule as `splitBullets()`. Loaded by `UpdateText` in the game.
- A leader's dealt description is assembled at runtime by D from its `LShufResultPieces` rows (the composed piece
  keys, the whole ability's own description, the remainder line) plus the start-bias line, in the player's language,
  and written into `config` `LeaderItems`. Section 12 says why it isn't assembled in SQL.

Keys (F writes the English; C, D and B use them). `_DESC` keys are tooltips.

| Group | Keys |
| --- | --- |
| Mod | `LOC_LSHUF_MOD_NAME` ("Uncharted Leaders & Civs"), `LOC_LSHUF_MOD_DESCRIPTION` |
| Window | `LOC_LSHUF_WINDOW_TITLE`, `LOC_LSHUF_CLOSE`, `LOC_LSHUF_HOST_ONLY`, `LOC_LSHUF_LIST_ALL`, `LOC_LSHUF_LIST_NONE`, `LOC_LSHUF_LIST_COUNT` (`{1_On}`, `{2_Total}`), `LOC_LSHUF_SEED_NEW`, `LOC_LSHUF_SEED_RANGE` (`{1_Min}`, `{2_Max}`), `LOC_LSHUF_MODDED_NONE_INSTALLED` |
| Window headings | `LOC_LSHUF_HEADING_POOLS`, `LOC_LSHUF_HEADING_MODDED`, `LOC_LSHUF_SECTION_TITLE`, `LOC_LSHUF_ADVANCED_TITLE` |
| Window buttons | `LOC_LSHUF_BTN_LEADERS`, `LOC_LSHUF_BTN_POOLS`, `LOC_LSHUF_BTN_MODDED`, `LOC_LSHUF_BTN_CIVS`, `LOC_LSHUF_BTN_ADVANCED`; list buttons `LOC_LSHUF_LIST_ALL`, `LOC_LSHUF_LIST_NONE` |
| Options | the `Name`/`_DESC` keys in section 2 |
| Option values | `LOC_LSHUF_MODE_NONE`, `LOC_LSHUF_MODE_SWAP_ABILITIES`, `LOC_LSHUF_MODE_SWAP_LEADERS`, `LOC_LSHUF_MODE_SPLIT_MATCHED`, `LOC_LSHUF_MODE_SPLIT_RANDOM`, `LOC_LSHUF_REDEALT`, `LOC_LSHUF_OFF`, `LOC_LSHUF_PERSONA_STAYS`, `LOC_LSHUF_PERSONA_FOLLOWS`, `LOC_LSHUF_PERSONA_REDEALT`, `LOC_LSHUF_DEAL_BALANCED`, `LOC_LSHUF_DEAL_CHANCE`, `LOC_LSHUF_REVEAL_START`, `LOC_LSHUF_REVEAL_MET`; each with `_DESC` |
| Leader screens | `LOC_LSHUF_BIAS_LINE` (`{1_List}`: "Starts near: {1_List}"), `LOC_LSHUF_BIAS_NONE`, `LOC_LSHUF_BIAS_MAP_SETS`, `LOC_LSHUF_BIAS_COAST`, `LOC_LSHUF_BIAS_RIVER`, `LOC_LSHUF_BIAS_LAKE`, `LOC_LSHUF_BIAS_NATURAL_WONDER`, `LOC_LSHUF_BIAS_ISLAND`, `LOC_LSHUF_ABILITY_OFF`, `LOC_LSHUF_PIECE_REST` (`{1_Ability}`), `LOC_LSHUF_DEAL_NUMBER` (`{1_Seed}`) |
| Reveal panel | `LOC_LSHUF_REVEAL_TITLE`, `LOC_LSHUF_REVEAL_OPEN`, `LOC_LSHUF_REVEAL_UNMET` |
| Reasons | `LOC_LSHUF_REASON_` + the `REASON` value upper-cased with `-` as `_`: `..._KEPT`, `..._LIST`, `..._NOTINGAME`, `..._MODDEDLIST`, `..._UNKNOWN`, `..._OBSERVER`, `..._MODDED_OFF`, `..._MODDED_NOTOK`, `..._MODDED_LEADERTYPE`, `..._MODDED_CHANGED`, `..._TOO_FEW`, `..._MODE_NONE`; and the check-1 details `LOC_LSHUF_WHY_SCRIPT`, `LOC_LSHUF_WHY_UISCRIPT`, `LOC_LSHUF_WHY_IMPORTJS`, `LOC_LSHUF_WHY_MISSING` |
| Gameplay traits | `LOC_LSHUF_TRAIT_DEALT_DESCRIPTION`, `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_NAME`, `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_DESCRIPTION` |

If a workstream needs a key that isn't listed, it reports it; the lead adds it here and F writes it.

## 9. The modinfo

Built by `npm run build:modinfo` from `modinfo.template.xml` (lead). Read the template for the fixed groups:

| Group | Scope | Criteria | LoadOrder | Holds |
| --- | --- | --- | --- | --- |
| `lshuf-shell` | shell | always | 20000 | Schema, `data/frontend/parameters.sql`, mapping, setup copy, text, `ui/setup/lshuf-setup.js`, `ui/display/lshuf-setup-display.js` |
| `lshuf-game-schema` | game | always | 20000 | `data/schema/gameplay-tables.sql`, `data/mapping/lshuf-mapping.sql` |
| B's generated groups | game | generated | 20010 inputs, 20100 and up the deal | See below |
| `lshuf-game-text` | game | always | 20100 | Text, `data/text-generated/lshuf-piece-text.sql` |
| `lshuf-game-ui` | game | always | 20100 | `ui/game/lshuf-game.js` |

B's generator writes two fragments the builder splices in: `data/generated/modinfo-criteria.xml` (`<Criteria>`
elements) and `data/generated/modinfo-groups.xml` (`<ActionGroup>` elements). Ids start with `lshuf-`:

- `lshuf-seed-<n>` for n = 1..256: `ConfigurationValueMatches` `LShufSeed` = `n`; file `data/generated/seed/seed-<n>.sql`.
- `lshuf-opt-<Name>-<VALUE>` for each non-boolean option value, and `lshuf-opt-<Name>-1` for each bool:
  `ConfigurationValueMatches` on the parameter's ConfigurationKey; file inserts the `LShufOptions` row.
- `lshuf-keep-<LEADER>`: `ConfigurationValueMatches` `LShufKeep_<LEADER>` = `1`.
- `lshuf-out-<LEADER>` (vanilla), `lshuf-moddedout-<LEADER>` (modded), `lshuf-notin-<LEADER>` (all known):
  `ConfigurationValueContains` on `LShufExcludedLeaders` / `LShufExcludedModdedLeaders` / `LShufNotInGame` with
  value `|<LEADER>|`.
- `lshuf-modok-<LEADER>` (modded): `ConfigurationValueMatches` `LShufModOK_<LEADER>` = `1`.
- The always-on deal groups, `lshuf-deal-*`, at LoadOrder 20100 and up, in the order they must run.

Criteria syntax is the probes': `<ConfigurationValueMatches><Group>Game</Group><ConfigurationId>KEY</ConfigurationId>
<Value>V</Value></ConfigurationValueMatches>`, the same shape for `ConfigurationValueContains`. Group ids and
criteria ids may be the same string.

For E's harness, the criteria behave as watched in probes 7 and 13: `ConfigurationValueMatches` is true when the
config value, as a string, equals `Value`; a key that's missing or holds a number never matches; a bool matches
`1`. `ConfigurationValueContains` is true when any entry of the config value (an array, or a string split on commas)
equals any entry of `Value` split on commas.

## 10. Lint and checks

- `npm run lint`: ESLint over `ui shared scripts tests`. `??` mixed with `&&` or `||` without parentheses fails (the
  parser rejects it, and `no-mixed-operators` backs it up). Shipped code (`ui/`, `shared/`) is `ecmaVersion 2022`
  and has the size limits in `eslint.config.js`.
- `npm run check`: `node --check` on every JS file.
- `npm test`: `tests/run-all.mjs` runs every `tests/*.mjs` that doesn't start with `_`.
- In shipped code: no `fetch` (it isn't defined in the game's UI; use `XMLHttpRequest`, probe 12), no `typeof GameInfo`
  to tell shell from game (Drongo's mod defines one in the shell), `GameInfo` tables have no `some`/`every`/`map`/
  `reduce` (use `for...of`, `find`, `filter`).

## 11. Known lab checks (go on WATCH_LIST.md at integration)

- `LShufSeed` as a `text` parameter: `setGameParameterValue("LShufSeed", "17")` takes, the config reads back the
  string `"17"`, and `lshuf-seed-17` applies.
- `ConfigurationValueContains` on `LShufNotInGame`, an array written with `editGame().setValue` rather than through a
  parameter.
- Whether the game's SQLite supports what the generated SQL uses (E lists each feature).
- `Locale.compose` on a `LeaderItems.Description` that holds composed text rather than a key (section 8).
- Custom tables read in the game scope through `GameInfo.LShufResult*` (D falls back to `Database.query("gameplay",
  ...)` if not).

## 12. Where this departs from the spec

1. **The deal number runs 1 to 256.** One action group per value, as the spec and the build prompt say (256). A
   larger range would need two keys (for example a high and a low byte, 512 groups); owner's call.
2. **Random slots are picked by our script.** The engine picks a plain Random slot's leader after `startCampaign`, too
   late for `LShufNotInGame`, so step 1 of section 3 picks those slots itself, the same way the pool slots are picked.
   Every slot then names a leader and the deal stays among the leaders in the game. The one gap left is a remote
   human on Random in a network game: that slot stays Random, and every known leader is dealt. The window says so.
3. **Dealt descriptions are assembled at runtime, not in SQL.** `UpdateText` runs against the localization database,
   which can't see the gameplay deal. The per-piece keys are generated in SQL from the live text in every language;
   D joins them per leader at runtime in the player's language.
4. Replaced by section 23 R5 (2026-11-09): the trait now follows the bonus that promises Fleet Commanders.
   **Yi Sun-sin's `TRAIT_UNLOCK_FLEET_COMMANDER` stays with Yi Sun-sin.** SPEC section 3 lists it among the rows that
   stay put; COMPATIBILITY.md calls it part of his ability. Owner decision 2026-11-06: it stays with him. It's the
   only leader trait in the base game and DLC besides abilities, attributes, victory and AI traits; in Antiquity it's
   what lets him build Fleet Commanders (`age-antiquity/data/units.xml` sets `UNIT_FLEET_COMMANDER`'s TraitType to
   it). Unique units, buildings and improvements hang on civilization traits, which the deal doesn't touch.
5. **No `LShufModdedMany` flag.** The Modded leaders window decides itself when to show the modded list. The one
   `ParameterGroups` row is the section's (item 6).
6. **The layout (owner, 2026-11-06).** Advanced Settings has a "Uncharted Leaders & Civs Settings" section, drawn by the
   game like Triumph Settings or Difficulty Settings from one `ParameterGroups` row (`LShufOptions`, single player and
   lobby alike). Its rows are the seven main options as ordinary parameters: Leader shuffle, Leader abilities, Leader
   attributes, Start terrain, AI behavior, Human players keep their own leader, See other leaders' shuffled bonuses.
   Right after them the shell script adds three buttons: Leader pools..., Civilization pool... and Advanced
   settings.... The advanced window holds Fairness of mixed bonuses and the shuffle number, then buttons for leaders
   that are shuffled and leaders from other mods. Every list window has All and None. The other options are hidden. The
   `ParameterGroups` row is inserted before the parameters: `Parameters.GroupID` is a foreign key the game checks per
   statement, and the other order rolled back every mod's setup data in one build.
7. **Multiplayer keys are written at the host's Ready, then kept up to date.** The staging screen sends `startCampaign`
   when the host presses Ready (`mp-staging-new.js` `onReady`); the game starts later, when the all-ready countdown
   ends (`model-mp-staging-new.js` calls `Network.startGame()`). After the host's first write, each `PlayerInfoChanged`
   on the host rewrites the keep keys and `LShufNotInGame` from the slots as they read then (no new picks), writing
   only keys whose value changed, until setup closes. Probe 9 watches whether a rewrite un-readies the lobby.
8. **A leader can hold two of one attribute kind.** The spec has the deal skip a duplicate or leave the slot empty.
   Owner decision 2026-11-06: a slot the greedy pass and the swaps can't fill takes a leftover card even when it
   repeats a kind (`ATTR_FILL_CAP` steps; section 5.3 says how the repeat is applied). A deal with no repeat always
   exists (each leader keeping its own cards is one), so a repeat means the bounded search missed it. That only
   happens when several leaders hold five to seven attributes; no base-game deal sampled repeats.
9. **Civilization pool (owner, 2026-11-06).** `LShufCivsOut` (config `LShufExcludedCivs`, `|CIVILIZATION_X|`
   values, every age's civs from the frontend `Civilizations` table) lists civs switched off. At `startCampaign` the
   host gives each plain Random civ slot an allowed civ from that slot's own valid list, after the leader picks; a
   hand-picked civ stays. Two parts aren't built: hiding a switched-off civ from a human's civ picker, and keeping it
   from AI picks at a new age. The only lead for the first is the setup table `DomainValueFilters`, which no base file,
   mod or UI script uses, so its rules are unknown; the engine makes the age-change AI picks. Both are on the watch
   list.

## 13. Build your own leader (owner, 2026-11-06; SPEC 7b)

**Keys (written by `onStartCampaign` on the host, after the keep keys, through `Configuration.editGame().setValue`,
as lists like the other list keys):** `KEY.Builder` = `LShufBuilder` (`["|LEADER_X|"]`, the host's leader; empty when
the host's slot is Random), `KEY.BuilderCiv` = `LShufBuilderCiv` (`["|CIVILIZATION_X|"]` when the host's civ is
picked by hand, else empty), `KEY.Built` = `LShufBuilt` (`["|id|", ...]`, the picks). The screen stores its picks in
one hidden `text` setup parameter `LShufBuildPicks` (ConfigurationKey `LShufBuildPicks`, value `|id|id|...|`, `""`
for none), so they save with the game and reach the lobby; `splitTags`/`joinTags` read and write it.

**Build piece ids** (`shared/lshuf-constants.js` `BUILD`, `buildKindOf`): `<LEADER>__B<nn>` a bullet, `<LEADER>__WHOLE`
a whole ability, `ATTR_<AttributeTrait>` one attribute of that kind, `PERSONA_<LEADER>` that leader's agendas and
favorite civs, `BIAS_<LEADER>` that leader's start-bias rows, `CIVBIAS_<CIV>` that civilization's start-bias rows.

**Gameplay tables (lead, `data/schema/gameplay-tables.sql`, and `LShufSetup_` copies aren't needed: the setup side
reads the keys):** `LShufBuild (Slot INTEGER PRIMARY KEY, LeaderType TEXT NOT NULL, CivilizationType TEXT)` and
`LShufBuildPieces (Slot INTEGER NOT NULL, PieceId TEXT NOT NULL, PRIMARY KEY (Slot, PieceId))`. Slot is 1 in this
version.

**Action groups (B, `scripts/generate/inputs.mjs`, LoadOrder with the other inputs):** per known leader
`ConfigurationValueContains LShufBuilder |LEADER_X|` -> `INSERT OR IGNORE INTO LShufBuild (Slot, LeaderType) VALUES
(1, 'LEADER_X')`; per civilization in the compiled `Civilizations` table (selected through it, so a missing DLC civ
is skipped) `ConfigurationValueContains LShufBuilderCiv |CIV|` -> `UPDATE LShufBuild SET CivilizationType = 'CIV'
WHERE Slot = 1 AND 'CIV' IN (SELECT CivilizationType FROM Civilizations)`; per build piece id (every bullet and whole
in the mapping, the 7 attribute traits, PERSONA_ and BIAS_ per known leader, CIVBIAS_ per civilization in
`shared/lshuf-known-civs.js`, a list B generates from the frontend Civilizations table like the known leaders)
`ConfigurationValueContains LShufBuilt |id|` -> `INSERT OR IGNORE INTO LShufBuildPieces (Slot, PieceId) SELECT 1,
'id' WHERE EXISTS (SELECT 1 FROM LShufBuild WHERE Slot = 1)`.

**The deal (B, JS and SQL alike; `buildDealInput` config gains `builder: { leader, civ, pieces: [] } | null`, read
from the keys on the setup side and from the tables in the game):**
- Applies when the builder leader is a major in the game and eligible. Leader cards also need `f.active` (Leader
  shuffle on); on Base game only the civilization cards (ability, bonus, unique, civics; not civ start terrain) apply,
  and a builder holding none of them is `ModeOff` (2026-11-07). When it doesn't apply, `LShufResultMeta` row `Builder` = `BUILD_WHY.*` and the picks are ignored. When it applies, `Builder` = `ok` and the
  builder's `LShufResultLeaders.Reason` = `built` (new `REASON.Built = "built"`), `Status` dealt.
- Ability axis: the builder's own pieces enter the deck as usual. The builder receives exactly its ticked ability
  pieces (a bullet, or a whole ability; with `BUILD_UNREVIEWED_BULLETS` false an unreviewed leader's bullet id is
  ignored), and those pieces leave the deck before the others are dealt. The builder takes no part in the greedy or
  balanced pass. `AbilityFrom` = the source of its whole ability, or the leader it took the most bullets from, else
  null.
- Attributes: for each `ATTR_<trait>` the builder takes one card of that kind: its own if it gave one, else the first
  in deck order. Those cards leave the deck; the rest deal as usual. The others' conservation still holds; the
  builder's count is what it ticked (a second `ATTR_` of one kind is a repeat, section 5.3).
- Persona: `PERSONA_<L>` -> the builder's `PersonaFrom` = L (and L's persona rows copy to the builder as in the
  Re-dealt-too path); none ticked -> the option's rule.
- Biases: `BIAS_<L>` -> the builder's bias rows are L's shipped rows (`Origin` moved); none -> the mode's rule for the
  builder. `CIVBIAS_<C>` with `LShufBuild.CivilizationType` set -> the builder's civ gets C's rows (moved) in place
  of its own; without a civ it's ignored.
- The setup preview and the game read the same picks, so `LShufPreview` keeps matching.

**The screen (C, `ui/setup/lshuf-build-window.js` and friends, opened from `LOC_LSHUF_BTN_BUILD` in the section's
button row and from nowhere else):** SPEC 7b's layout. Cards are built from the setup-side tables (`LShufSetup_*`,
the mapping, `LShufAttributeTraits`) and the frontend `Leaders`/`Civilizations` rows, with art by name only. The
screen enables only when the host's slot names a leader and Leader shuffle isn't Off; otherwise it shows the matching
`LOC_LSHUF_BUILD_*` note over a disabled grid. Slot counts: ability = the builder's bullet count in the mapping
(whole ability fills them all; a leader with no mapping rows gets one whole slot), attributes = its own count,
behavior 1, start terrain 1, civilization start terrain 1 when its civ is picked by hand.

**Text keys:** `LOC_LSHUF_BTN_BUILD`, `LOC_LSHUF_BUILD_*`, `LOC_LSHUF_REVEAL_BUILT`, `LOC_LSHUF_REASON_BUILT` (in
`text/en_us/lshuf-text.xml`).

**As built (B, 2026-11-06), where it reads the contract its own way:** an axis the builder ticked nothing in deals the
builder as usual (so a one-card build stays sane). The mapping ships every row Reviewed = 1 with dependent bullets merged
(`scripts/mapping/merge-pieces.mjs`, `LShufMapping.BulletCount`), so every bullet is a piece and a card; `BUILD_UNREVIEWED_BULLETS`
only matters if a row is set back to 0. In the split modes the
builder keeps no slot and no remainder, so taking fewer cards than it gave leaves the extra cards with nobody and
taking more leaves some of its own slots empty (the screen's slot budget keeps it even). In Paired random the
builder leaves the package cycle and its own untaken attribute cards go to nobody. `PARAM.BuildPicks` =
`LShufBuildPicks`. Group count: 562 new (65 builder, 50 civ, 447 cards), modinfo about 540 KB.

**Builder slots (owner, 2026-11-06 night):** `BUILD_SLOTS` (4) builders per game. Slot 1 is the host as above. Slots
2..4 are AI leaders the host builds from the same screens: a "Building for" dropdown in the screen header lists the
host and every AI player slot that names a leader; picking one switches the screen to that builder. Keys per slot n:
`KEY.builderN(n)`, `KEY.builderCivN(n)`, `KEY.builtN(n)` (slot 1 keeps the unsuffixed names). The screen's picks per
slot live in hidden text parameters `LShufBuildPicks` (slot 1) and `LShufBuildPicks<n>`; which AI leader a slot
builds lives in `LShufBuildFor<n>` (a hidden text parameter holding `|LEADER_X|` or `""`), so a slot follows its
leader, not its player index. At `startCampaign` the host writes slot n's keys only when `LShufBuildFor<n>` names a
leader that's in the game; otherwise the keys are empty. Tables: `LShufBuild.Slot` = n, `LShufBuildPieces.Slot` = n.
Groups per slot: the builder, civ and card groups of section 13 with the slot number in the id and the keys. The deal
treats every builder the same way (a built leader takes exactly its ticked pieces, the rest shuffle); a piece ticked
for two builders goes to the lower slot. `LShufResultMeta` gains `Builder<n>` rows.

**Later the same night (owner asks, all built and tested, unwatched):**
- An attribute can be taken twice: `BUILD.attribute(trait, 2)` = `ATTR2_<trait>` is a second card of the kind; the
  deal takes two cards (own first, then deck order; copy 1 before copy 2), the second lands as `Copy` 1 (an extra
  trait, section 5.3). On the screen a third click on an attribute card takes both copies out; any card in as far
  as it goes comes out on a click.
- Generic start terrain cards `GBIAS_<tag>` (`GENERIC_BIASES`: tag and the score a leader's own row of that kind
  usually carries): one row of the tag's table for the builder, `Origin` moved, `BiasFrom` NULL; a leader's card
  wins when both are ticked. Every leader has a start terrain card; one for a leader with no rows says so, and the
  screen's "Hide leaders without start terrain" toggle hides those.
- Whole modes with bullet cards: a builder with bullet cards and no whole card gets exactly those bullets (copied;
  their leaders keep them), walks the copy path, and leaves the cycle: whoever was to take its ability takes what it
  was to take, its own ability goes to nobody, and that ability's legend nodes go with it (`ToLeaderType` NULL).
  `LShufWork_Build.BulletBuild`, `LShufWork_BBullet`.
- Behavior cards carry the agenda name and text, likes, dislikes and favorite civilizations (setup copy tables
  `LShufSetup_LeaderAgendas`, `LShufSetup_LeaderCivPriorities`); attribute cards the points, the two diplomatic actions
  (`LShufSetup_AttributeActions`) and the holders; terrain names come from `LShufSetup_TypeNames`. Every card's text
  is a bullet list in the game's markup, in the card tooltip (`lshuf-build-tooltip.js`, a registered tooltip type)
  and the details pane; the card face is the title. Group count 2,843, modinfo 1.5 MB.

## 14. Build your own civilization: abilities and uniques (owner, 2026-11-06 night)

**What the player sees.** The civ build screen gets two more kinds of card, drawn from the civilizations of the
builder's civ's age (the game's data for another age's uniques isn't loaded): each civilization's **ability** (one
card, the ability's name and text) and each of its **uniques** (a unit, a building, a quarter with its two buildings,
an improvement; one card each, the game's name and text). Slots along the top: Ability (1), Uniques (as many as the
builder's own civ has), Start terrain (1). Taking an ability swaps it: the source civ gets the builder's ability in
return. Taking a unique moves it: the source civ goes without it. The screen says so (`LOC_LSHUF_BUILD_CIV_SWAP_NOTE`).

**Data.** Every civ has `TRAIT_<CIV>` (uniques, traditions and civic unlocks hang on it) and `TRAIT_<CIV>_ABILITY`
(its modifiers; `Traits.Name`/`Description`). Uniques: `Units`, `Buildings`, `Improvements`, `UniqueQuarters`
(`BuildingType1`/`2`) rows with `TraitType = TRAIT_<CIV>`. Traditions and civic-tree unlocks stay with the source
civ in this version.

**Card ids.** `CIVABIL_<CIV>` (`BUILD.civAbility`), `CIVUNQ_<Type>` (`BUILD.civUnique`; the unit, building, quarter or
improvement type). `BUILD_KIND.CivAbility` / `CivUnique`. Picks ride in `LShufBuilt<n>` like every other card; the
builder's civ in `LShufBuilderCiv<n>`. Known ids: `shared/lshuf-known-civ-items.js`, generated for all three ages by
`scripts/setup-copy/build-civ-items.mjs` (civ, age, kind, type), one action group per id per slot.

**Setup copy.** `LShufSetup_CivItems (CivilizationType, Age, Kind, Type, NameKey, DescKey, TraitType)` in
`data/setup-copy/setup-copy-civ.sql` (`scripts/setup-copy/build-civ-items.mjs`; Antiquity from the saved compiled
database, Exploration and Modern from the game's data files for those ages): the ability row per civ (Kind
'ability', the ability trait's keys) and one row per unique card (Kind 'unit' | 'improvement' | 'civics'; name and
description keys from the type's table).

**The deal (JS `shared/deal/lshuf-deal-civ.js`, SQL `deal-7-civ.sql`, both writing `LShufResultCivPieces`):** per
builder slot in order, when the builder's civ is set and the pick's civ is in the same age and is a civ in the game's
data: an ability pick A from civ S: rows (B, CIVABIL_S, S, 'ability') and (S, CIVABIL_B, B, 'ability'); a unique
pick U from S: row (B, CIVUNQ_U, S, 'unique'). A card taken by a lower slot is gone for higher ones; a civ built by a
lower slot can't be a source for an ability swap in a higher one. Civs with no row keep what they ship with (no
rows written for them). `LShufResultMeta` `CivBuilder<n>` = `ok` or a why.

**Apply (`deal-6-apply.sql`, after the leader apply):** for each (B, CIVABIL_S): `UPDATE CivilizationTraits SET
TraitType = TRAIT_S_ABILITY WHERE CivilizationType = B AND TraitType = TRAIT_B_ABILITY`, and the mirror row for S;
for each (B, CIVUNQ_U): a trait `TRAIT_LSHUF_CIV_<B>` (Types + Traits, InternalOnly) in B's `CivilizationTraits`, and
the unique's row(s) `SET TraitType = 'TRAIT_LSHUF_CIV_<B>'` (`Units`, `Buildings`, `Improvements`; a quarter moves
its `UniqueQuarters` row and both buildings). Every statement selects through its parent table.

**Preview (`ui/display`):** the civ select's cards read `CivilizationItems` (config). For a built civ, rewrite its
KIND_TRAIT row's Name/Description to the taken ability and its unique rows to the taken uniques (and the swapped
source civ's ability row), the way the leader rows are rewritten; restore on a change. Game side: the civ's screens
read the gameplay data, which the apply changed.

**Screen (`ui/setup/lshuf-build-cards.js`, `-window.js`, `-parts.js`):** civ scope kinds add CivAbility and
CivUnique; cards from `LShufSetup_CivItems` filtered to the builder civ's age, with the civ card background and the
unique's icon by name (`UI.getIconCSS(type)`); "From <civ>"; slot groups civAbility (1), civUniques (the builder
civ's unique count), civTerrain (1). An ability or unique of the builder's own civ is marked as its own.

**Every age (owner, 2026-11-07).** The civ screen's Every age box lists every civilization, not only the builder's
age. An ability card (swap) and a bonus card (Split) from any age apply; unique and civics cards stay same-age, and so
do `CIV_OWN_AGE_PIECES` (France's B01, Joseon's B02, Mexico's B02, Nepal's B02), whose modifiers the Antiquity
database doesn't have. A civ's start terrain comes from any age. Another age's ability modifier was watched working
on an Antiquity civ (devtools/probes/RESULTS-2026-11-07.md). Cards carry `otherAge` (the age's name) and `ageOnly`;
`cantTake` gives `otherage` for an `ageOnly` card.

**Start age and Test of Time (owner, 2026-11-07).** A builder's civ plays in the game's age, whatever its own:
picking a civ from another age turns on Test of Time and the game loads it in the start age. The setup side reads the
game's `Age` parameter (`startAge()`, and an Age row on the civ build screen); the game side gets
`LShufOptions ('Age', <age>)` from one `AgeInUse` group per age. The deal config carries it as `age`; each applying
builder's civ gets `play` (SQL `LShufWork_CivInfo.Play`) and the same-age checks (civics, uniques, own-age bonuses,
PIECE_AGES) compare play ages. With no age known everything falls back to the civ's own age.

**AI builds and age-bound bonuses (owner, 2026-11-07).** `PIECE_AGES` lists the bonuses whose modifiers only act in
some ages, read card by card. An AI builder (slot 2 up) skips one outside its civ's play age in the deal; the AI build
screens hide those civ cards, and leader cards that only work before the start age. The player's own screens and the
random deal are unchanged; the random civ deal already stays within each age.

**Loading screen (owner, 2026-11-07 night).** The game's loading screen reads once GameCore is initialized
(`Loading.runWhenInitialized`), before any mod UI script loads (those come at `whenLoaded`), so the mod ships its own
copy of `base-standard/ui-next/screens/load-screen/load-screen-bootstrap.js` (a mod's files mount at the root as
well as under the mod's folder, so the copy stands in for the shipped one) with one addition: `prepareLoadScreen()`
from `ui/game/lshuf-load-screen.js`, which registers its work with `Loading.runWhenInitialized` ahead of the
screen's own read. The work: the local leader's and civ's config rows (`writeLocalRows`, with the deal number line),
then `installLoadScreenTraits`: an own `filter` on `GameInfo.Units/Buildings/Improvements/Routes/UniqueQuarters/
Traditions` (`heldFilter`) that answers a `TraitType == <base trait>` test with every trait the civ holds in
`CivilizationTraits`, so taken uniques and a received civics tree show and given-away ones don't; the wrappers come
off at `load-curtain-closed-event`. Shipped civ rows come from `LShufSetup_CivilizationItems`
(`data/frontend/civ-items-copy.sql`, copied once at shell load), never from the live, rewritten table. A unique row
is written once per domain the civ's own uniques sit in. The civ view keeps a builder's own uniques alongside the
ones it took (the game does). Watched 2026-11-07 (devtools/probes/RESULTS-2026-11-07.md), new game and quicksave.

**Civ builds on Base game (owner, 2026-11-07).** A civilization build doesn't need Leader shuffle on: on Base game the
civ screen stays live and `buildStates` keeps only `isCivOnlyPiece` ids (the SQL twin filters `LShufWork_BuildPiece`
the same way). A civ start terrain card counts only while the start terrain part deals, so with Leader start terrain
on Base game or Off it's greyed with `terrainoff`. Both build screens carry a picker for the host's own leader or
civilization (`ui/setup/lshuf-build-pick.js`), writing `PlayerLeader` / `PlayerCivilization` as the game's lists do
and offering only the values those lists mark valid.

**As built (2026-11-06 night):** 162 cards (50 abilities, 94 units, 10 quarters, 8 improvements; every unique
building belongs to a quarter, so there are no building cards). An ability already swapped (as builder or source)
can't be swapped again. `CivBuilder<n>` carries the leader build's why when that isn't ok, `builder-not-in-game`
with no civ or an unknown civ, `no-pieces` when nothing applied. The civ deal is its own step, `deal-5b-civ.sql`
(LoadOrder 20105; the apply moved to 20106). The preview rewrites `CivilizationItems` by the host's picks alone
(civ set, Leader shuffle not Normal) and doesn't read the deal's verdict. Group count 3,492, modinfo 1.86 MB.

## 15. One setting per part, presets on top (owner, 2026-11-06 night)

**What the player sees.** The Uncharted Leaders & Civs Settings rows become: Leader shuffle (a preset: Normal, Full
random, Paired random, Logical split random, Split random, and Custom when the parts don't match a preset), Leader
abilities (Normal / Swapped whole / Split into bonuses / Off for everyone), Leader attributes (Normal / Random /
Paired with the ability / Off for everyone), Start terrain (Normal / Follows the bonuses / Paired with the ability /
Rolled / Off for everyone), AI behavior, Human players keep their own leader, See other leaders' shuffled bonuses.
Picking a preset writes the three part settings (`PRESETS`); changing a part by hand makes the preset read Custom
(`presetOf`). The same three dropdowns sit in the build screens' settings strips.

**Parameters.** `LShufAbilities`, `LShufAttributes`, `LShufBiases` keep their ids and config keys and get the domains
`LShufAValues`, `LShufTValues`, `LShufBValues` (values in `A_MODE`, `T_MODE`, `B_MODE`, text keys `LOC_LSHUF_<value>`
and `_DESC`); their defaults are the Normal preset's. `LShufMode` keeps its domain plus `LSHUF_MODE_CUSTOM` (never
written by the deal; the setup script writes it from `presetOf`). Old saved values (`LSHUF_REDEALT`) read as the
preset's part value when the preset is set, else Normal.

**The deal** reads only the three parts (`options.Abilities/Attributes/Biases`); `options.Mode` is informational.
Flags: `f.A` normal|whole|split|off, `f.T` normal|random|paired|off, `f.B` normal|matched|paired|rolled|off, with
`active` = any part not normal and not off. Rules:
- Abilities: whole = today's whole-mode cycle (trait path when AI behavior follows, else copy path); split = today's
  piece deal; normal = every leader keeps its own (the axis isn't dealt; builders' ability picks don't apply).
- Attributes: random = today's card deal (each leader gets back as many as it gave); paired = each leader takes the
  attributes of `abilityFrom` (whole: the ability's leader; split: the leader it got the most from; abilities normal:
  the attribute axis then falls back to random, since there's no pairing to follow); normal = kept.
- Start terrain: matched = tag rows from the pieces held (abilities split) or the ability's leader's rows (abilities
  whole; normal abilities: falls back to rolled); paired = `abilityFrom`'s rows (same fallback); rolled = today's
  roll; normal = kept; civilizations swap within their age under matched and paired, roll under rolled, keep under
  normal.
- Everything else (kept leaders, left-out lists, builders, the modded boxes, Fair shares, AI behavior, the reveal)
  keeps its meaning; `LShufResultMeta.Mode` holds the preset name or `LSHUF_MODE_CUSTOM`.
- The SQL's config flags (`IsWhole`, `IsPaired`, `IsMatched`, `RollBiases`, `Active`, ...) are derived from the three
  part values in `deal-1-prepare.sql`; one `LShufOptions` group per part value as today.

**Tests.** The five presets must give the same rows as before the change (the JS-equals-SQL and conservation suites
run over presets); custom combinations are added to the self-check and to deal-js-equals-sql.

## 16. Civilizations shuffle too: abilities and uniques (owner, 2026-11-06 night; builds after section 15 lands)

**What the player sees.** Two more rows in Uncharted Leaders & Civs Settings (and in the civ build screen's strip), after
Start terrain: **Civilization abilities** (Normal / Swapped within the age / Off for everyone) and **Civilization
uniques** (Normal / With the ability / Shuffled / Off for everyone). The civ select's cards show what each
civilization ended up with; in the game the civilization has it. A built civilization (section 14) keeps its picks
whatever these say; the shuffle runs over the others.

**Parameters.** `LShufCivAbilities` (domain `LShufCAValues`, `CA_MODE`) and `LShufCivUniques` (`LShufCUValues`,
`CU_MODE`), ordinary rows in the `LShufOptions` group right after `LShufBiases` (SortIndex 2303.5 isn't possible: use
2304/2305 and shift KeepMine/Reveal to 2306/2307), config keys the same as the ids, defaults Normal; one
`LShufOptions` group per value. The presets of section 15 leave these two alone.

**The deal (JS `lshuf-deal-civ.js` grows; SQL `deal-5b-civ.sql`; rows in `LShufResultCivPieces` for every civ that
changes).** Per age (`LegacyCivilizations`), over the civilizations of that age that no builder built and whose
ability no builder took:
- Abilities Swapped: a cycle `cyclicDonors(seed, SALT.CivAbilities, civs)` (a new salt), each civ taking its donor's
  ability (rows (C, CIVABIL_D, D, 'ability')). Off: no rows; `LShufResultMeta` `CivAbilitiesOff` = 1 and the apply
  deletes every civ's ability trait row from `CivilizationTraits`. Normal: nothing.
- Uniques With the ability: each civ gets its ability donor's uniques (rows (C, CIVUNQ_U, D, 'unique') for each of
  D's uniques; with abilities Normal there's no donor, so this reads as Normal). Shuffled: its own cycle
  `SALT.CivUniques`, each civ taking its donor's whole set. Off: `CivUniquesOff` = 1 and the apply retargets every
  unique's TraitType to `TRAIT_LSHUF_NONE` (a trait no civ holds). Normal: nothing.
- Builders first, as in section 14: their rows stand, and their civs and the abilities they took are out of the
  cycles. Civs with no rows keep what they ship with.
- The apply of section 14 already handles any (civ, piece) row; it gains the two Off flags.

**Preview.** `ui/display` rewrites `CivilizationItems` from the deal's `civPieces` for every civ with rows (today
it does the host's build by shape); a civ with no rows is written back to its shipped view.

**Tests.** JS equals SQL for each value of the two rows across the presets; conservation: under Swapped every ability
of an age is held exactly once; under Shuffled every unique set exactly once; builders' rows unchanged by the shuffle.

**Section 15 as built:** visible rows Mode 2300, Abilities 2301, Attributes 2302, Biases 2303, CivAbilities 2304,
CivUniques 2305, Personality 2306, KeepMine 2307, Reveal 2308. `OPTION_DEFAULTS` for the three parts are the Normal
values. Flags: `isWhole` = A Whole, `isSplit` = A Split, `TCycle` = T Paired and A Whole, `TFromA` = T Paired and A
Split (else a live T deals the random card deal), `BCycle` = B Paired-or-Matched and A Whole, `BFromA` = B Paired and
A Split, `IsMatched` = B Matched and A Split, `RollBiases` = B Rolled or B Paired/Matched with A neither Whole nor
Split; `Active` = any part not Normal and not Off. A part with no row or an old value follows the preset. A generic
terrain card beats the terrain cycle. `ui/setup/lshuf-presets.js` keeps the preset and the parts in step.

## 17. The AI leaders have their own place (owner, 2026-11-06 night)

Parked 2026-11-09 (section 28): the AI players aren't hand-built any more. This section is the record of what the
AI leaders window was; the files are in `mod_ideas_tested/re-dealable-ai-leader-builds/`.

The player's own build screens (from the leader select, the civ select and the lobby) build slot 1 only; the
"Building for" dropdown is gone. "AI leaders..." in Uncharted Leaders & Civs Settings opens the AI leaders window
(`ui/setup/lshuf-ai-window.js`): one row per AI player slot with its leader portrait, civ art, names, what it has
picked, and Build leader..., Build civilization... and Clear; a row on Random says to give it a leader in the player
rows. Build leader/civilization gives the leader a builder slot (2..`BUILD_SLOTS`, `slotForLeader`) and opens the
build screen for that slot (`openBuildWindow(scope, slot)`); Clear empties its picks and frees the slot. The build
screens carried a link each way (text keys since removed). The civ build screen's
settings strip shows Civilization abilities and Civilization uniques (section 16) with Start terrain. Generic start
terrain cards sit together at the front of the start terrain cards and draw as a tile in the terrain's colours with
its initial (`lshuf-build__terrain--<family>`).

## 18. Unique civics are their own part, and a unique goes with whatever unlocks it (owner, 2026-11-06 night)

**Data.** `Civilizations.UniqueCultureProgressionTree` names the civ's civics tree (`TREE_CIVICS_AQ_ROME`); its
nodes (`ProgressionTreeNodes.ProgressionTree`) unlock the civ's traditions and its unique buildings and quarters
(`ProgressionTreeNodeUnlocks`, no `RequiredTraitType` on those rows); the traditions carry `Traditions.TraitType =
TRAIT_<CIV>`. Unique units (and improvements) unlock from the main trees with `RequiredTraitType = TRAIT_<CIV>`.

**Rule.** A unique that the civ's own civics unlock belongs to the civics, not to the uniques: it moves with the
civics card or the Civilization civics row. A unique unlocked from a main tree is its own card and moves with its
unlock row's `RequiredTraitType` retargeted to the receiver's trait (`TRAIT_LSHUF_CIV_<B>`), on top of the type's
own `TraitType`. Without both the receiver could never unlock it.

**What the player sees.** Row **Civilization civics** (`LShufCivCivics`, `CC_MODE`: Normal / With the ability /
Shuffled / Off for everyone) after Civilization uniques; card **Unique civics** per civilization (`CIVCIVC_<CIV>`,
`BUILD_KIND.CivCivics`): the tree's name, its civics, its traditions and what they unlock (`LOC_LSHUF_BUILD_CIVICS_DESC`);
slot Civics (1) on the civ build screen. The Uniques cards list only what the main trees unlock (units,
improvements); a quarter or building the civics unlock is named on the civics card instead.

**The deal.** As section 16 for the new part (cycle `SALT.CivCivics`; With the ability follows the ability donor);
rows (C, CIVCIVC_D, D, 'civics') in `LShufResultCivPieces`. Apply: `UPDATE Civilizations SET
UniqueCultureProgressionTree = D's tree WHERE CivilizationType = C`; `Traditions` of D's trait, and the unlock rows of
D's tree's nodes that name a unique building or quarter, plus those buildings'/quarters' own rows, retarget to
`TRAIT_LSHUF_CIV_<C>` (and D's trait rows for its own civics tree go to whoever gets D's, else stay). Off: every
civ's `UniqueCultureProgressionTree` set NULL and `Traditions` of civ traits retargeted to `TRAIT_LSHUF_NONE`.
Builders: `CIVCIVC_` picks as the other civ cards (section 14), taking precedence.

**Setup copy.** `LShufSetup_CivItems` gains rows Kind 'civics' (Type = the tree, NameKey = the tree's Name) and, for
the card text, `LShufSetup_CivCivics (CivilizationType, NodeType, NodeNameKey, UnlockType, UnlockKind, UnlockNameKey)`.

## 19. Civilization abilities atomized (owner, 2026-11-06 night; after sections 16 and 18 land)

**Mapping.** `data/mapping/lshuf-civ-mapping.sql` (`LShufCivMapping`, `LShufCivMappingModifiers`, built by
`scripts/mapping/build-civ-mapping.mjs` from `scripts/mapping/civ-draft.mjs`; `data/mapping/CIV-REVIEW.md`): 170
bullet pieces `<CIV>__B<nn>` for 50 civilizations, 156 of 164 Antiquity-loaded effects placed, 8 unplaced (the
civ's remainder). 49 pieces are `Movable 0`: their effects live in another age's data or in a wonder's own rows; they
stay with their civ and aren't dealt. Piece text: `data/text-generated/lshuf-civ-piece-text.sql`
(`LOC_LSHUF_CIVPIECE_<PieceId>`), loaded in both scopes like the leader piece text. Both mapping files load in both
scopes (shell group and game schema group).

**Setting.** `CA_MODE.Split` = "Split into bonuses" on the Civilization abilities row: within each age, the movable
pieces of the civs no builder built are dealt the way leader bullets are (`dealCards`: each civ gets back as many
pieces as it gave, Fair shares by `Value`, the same seed/salt scheme with `SALT.CivPieces`), unmovable pieces and
unplaced effects stay with their civ as its remainder. Result rows: `LShufResultCivPieces` with `Kind` 'bullet' and
'remainder' (PieceId `<CIV>__REST`).

**Apply.** A civ holding pieces walks a copy path: a trait `TRAIT_LSHUF_CIVA_<C>` (Types, Traits with the civ
ability's Name and `LOC_LSHUF_TRAIT_DEALT_DESCRIPTION`) replaces `TRAIT_<C>_ABILITY` in `CivilizationTraits`, and
each held piece's modifiers are copied under `LSHUF_<C>__<ModifierId>` onto it (`Modifiers`, `ModifierArguments`,
`ModifierStrings`, requirement sets shared), exactly as the leader copy path does; the remainder copies the civ's own
unlisted modifiers. The civ's uniques, civics and biases are untouched by this part.

**Cards.** `BUILD_KIND.CivBullet` cards on the civ build screen (one per movable piece, text from the piece key, "From
<civ>"; a Whole abilities toggle groups them as for leaders), taking the civ Ability slot(s): the builder civ's own
piece count, one wide slot for a whole ability. Builder picks `<CIV>__B<nn>` ride in `LShufBuilt<n>`.

**Setup preview.** `CivilizationItems` KIND_TRAIT Description for a civ with pieces is the held pieces' text joined
as a bullet list, like the leader screens.

**Section 16 as built:** `SALT.CivAbilities` 13, `SALT.CivUniques` 14; unique units are families (a base is a unit
no shorter unit of the same trait prefixes; `UnitType = base OR LIKE base || '_%'` moves together, and the family's
`ProgressionTreeNodeUnlocks` rows move to `TRAIT_LSHUF_CIV_<civ>`); buildings and quarters are not unique cards
(section 18 carries them with the civics); 92 cards (50 abilities, 34 unit families, 8 improvements); Off for
everyone exempts builders; With the ability under Normal abilities reads as Normal; the ability cycle excludes civs
whose ability a builder took; the civ select preview is deal-driven for every civ with rows. 3,232 groups, 1.72 MB.
Rows: Mode 2300, Abilities 2301, Attributes 2302, Biases 2303, CivAbilities 2304, CivUniques 2305, CivCivics 2306,
Personality 2307, KeepMine 2308, Reveal 2309.

**Keep my built civilization (2026-11-08):** `LShufKeepBuiltCiv`, a bool on by default, row 2309 (Reveal moves to
2310). While a builder's leader is kept (Human players keep their own leader), the build still applies with its
civilization cards only; the leader cards on it don't count, and the leader stays as shipped. Off, or with no
civilization card on the build, a kept leader's build is Not in game as before. Being on by default, it has groups
for both `1` and `0`; a missing `LShufOptions` row reads as `1`. `lshuf-deal-build.js` keptCivBuild, `sql-prepare.mjs`
build().

**Section 18, Exploration and Modern (2026-11-10):** there the reveal (`EFFECT_PLAYER_REVEAL_CULTURE_TREE`) is a
modifier on the ability trait whose subject requirement asks for the base trait. When the civ deal runs it moves onto
the base trait (`LShufWork_CivReveal` in `sql-civ.mjs`), so the tree follows the civics, not the ability; before that a
builder holding only other civs' bonuses, or a civ whose ability was swapped or switched off, lost its own tree
(`tests/deal-civ-tree-reveal.mjs`).

**Section 18 as built (2026-11-07):** the lever isn't `Civilizations.UniqueCultureProgressionTree` (NULL for every
civ). The tree is revealed by `MOD_*REVEAL_CIV_CULTURE_TREE_<CIV>` at `NODE_CIVIC_AQ_MAIN_CHIEFDOM`, gated by a
`REQUIREMENT_PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT` whose `TraitType` argument is the civ's base trait
`TRAIT_<CIV>`; that same trait carries the traditions (`Traditions.TraitType`), every unique building and quarter
and all 8 unique improvements (all unlocked inside the civ trees, none from a main tree), plus a few base-trait-gated
modifiers (Assyria's Codex Redux). `Traditions` can't be written at all: the game's `CultureSlotAllowances` foreign
key on `Traditions(CultureSlotType)` is a mismatch, so any UPDATE on `Traditions` fails under foreign keys. So the
civics piece moves as the base trait itself: for each row (C, `CIVCIVC_D`, D, 'civics') the giver D first gets
`TRAIT_LSHUF_CIV_<D>` and its units, main-tree improvements and their unlock rows (`RequiredTraitType`,
`NotTraitType`) move onto it, then `CivilizationTraits` (D, `TRAIT_<D>`) becomes (C, `TRAIT_<D>`). Off for everyone
does the same rescue for every civ with a tree and deletes its base trait row (a builder's swap stays). The builder's
civics card is a swap like the ability (both civs need a tree, same age); Shuffled is a cycle (`SALT.CivCivics` 15)
over the unbuilt civs with a tree nobody took; With the ability follows the ability donor when that donor's tree is
free. Uniques cards are unit families only (101 cards: 50 abilities, 34 unit families, 17 civics; the fixture is an
Antiquity game, so only the 17 Antiquity trees are known, and Exploration/Modern civs have no civics card until the
setup copy is built from a database of those ages). An ability's own guard that asks for the base trait
(`MOD_CIV_WONDER_PRODUCTION_<CIV>`) is retargeted to the ability trait so it follows the ability (section 14 gap). On
the civ select, buildings, quarters and improvements follow the civics row and leave the giver's card. Setup copy:
`LShufSetup_CivItems` Kind 'civics' (Type = tree) and `LShufSetup_CivCivics` (103 rows). `DEAL_VERSION` 9.

**Section 19 as built (2026-11-07):** `SALT.CivPieces` 16, `DEAL_VERSION` 10; both mapping files and both piece-text
files load in the shell group and the game groups. A civ's pieces in play are the mapping's `Movable 1` bullets whose
`Age` is the civ's own (`LegacyCivilizations`); a civ with none, or one whose ability a builder swapped whole, isn't
in the piece deal. A builder's `<CIV>__B<nn>` card takes that piece when its civ is in the game and of the builder's
age, the piece is in play and untaken, and the builder's own ability is still in pieces (a builder that swapped
whole, or whose ability a lower slot took whole, takes no bonus cards); a civ a lower slot took a bonus from can't be
swapped whole afterwards (`LShufWork_CivPieced`). The deck is keyed over every piece in play of every civ in pieces
(builder civs included, so a bullet builder's own pieces go to the others), ordered by Value (Balanced), key, id; the
next card goes to a civ of its age with room: someone else's first, then (Balanced) the lowest value per slot, then
the civ key (`LShufWork_CivNextPiece`, `PIECE_STEP_CAP` steps as the leader deal). Receivers are the civs in pieces
that took no bonus card; each gets as many slots as pieces it put in and a remainder row (always, as the reveal-tree
and any unlisted modifiers ride there); a bullet builder holds exactly its picks and no remainder, like a leader
builder. `SortIndex` runs dealt pieces by giver, bullet index and id, remainder last. Meta `CivPiecesActive` 1 under
Split. Apply: `TRAIT_LSHUF_CIVA_<C>` with the civ ability's Name and `LOC_LSHUF_TRAIT_CIV_DEALT_DESCRIPTION` (a civ
wording of the leader key); copies `LSHUF_<C>__<ModifierId>` with every argument as it is (the Tooltip stays the
giver's, so a yield line names the ability the bonus came from; the swap to the receiver's name came out 2026-11-11
at the owner's ask); a piece's modifiers are its own (`LShufCivMappingModifiers`) and the ones another age attaches
in their place (`LShufCivMappingAgeModifiers`, Test of Time), whichever the loaded database has on the giver's
ability; the remainder copies the civ's ability modifiers not listed under its movable pieces of its own age
(unmovable pieces' modifiers included); a piece the game's age leaves with nothing (`LShufCivPieceDead`) is out of
that age's deal and build cards; then any requirement that asked for `TRAIT_<C>_ABILITY` asks for
`TRAIT_LSHUF_CIVA_<C>` for copy-path civs, so a home-only bonus still fires after the section 18 retarget. No AI
lists hang on civ ability traits, so none are copied. `LShufWork_BuildPiece.Kind` 'civbullet'. Cards: 116 CivBullet
cards (one per movable piece of the civ's own age) with the civ's background and symbol; `slotCounts.civAbility` =
the builder civ's own movable piece count (1 when none); a whole civ ability card fills the group as the leader's
whole card does (`isWholeCard`); the Whole abilities toggle shows on the civ screen and starts off only when
Civilization abilities is Split. Piece groups: every id in the civ mapping file (170, movable or not) per slot.
3,948 groups, 2.11 MB. Not watched in a game: the civ screen's bonus cards, slots and toggle, the civ select
preview's bullet list, and a Split game's traits on the in-game civ panel.

**Section 18, paired unlocks, as built (2026-11-07):** the rule covers every kind. A unit family or an improvement
that only the civ's own civics tree unlocks (no unlock row in any other tree) is part of the civics: it isn't a
card, the uniques part leaves it alone (`LShufWork_CivicUnit` in `deal-5b-civ.sql`, `civicOnlyFamily` in
`lshuf-deal-input.js`), it stays on the base trait and goes wherever the civics go, and the civics card names it.
In the 1.5.0 data that's the Watonathi (Mississippian); Vaishya, Tamkaru, Sangdaedeung and Turtanu are also unlocked
from the main civics tree, so they stay unit cards. Buildings and quarters were already civics-only. Every age's
civ cards now exist: `build-civ-items.mjs` reads Exploration and Modern through `civ-age-source.mjs` (the civics
tree of those civs comes from the GameEffects reveal modifier), so each of the 50 civs has a civics card and its
unit families (99 families, 1 main-tree improvement: Nepal's Highland Power Station). The game's agenda text loads
only in the game scope, so `text/agenda/<locale>.xml` (`scripts/setup-copy/build-agenda-text.mjs`, 12 locales,
158 rows each, the game's own tags) loads in the shell group for the behavior cards. 4,344 groups, 2.33 MB. Not
watched in a game: a Rome that took Mississippian civics training the Watonathi after Earthworks, the Exploration
and Modern civics cards, the agenda text on every behavior card.

**Build screens, 2026-11-07 round (owner asks):** the card tooltip gives every text block its own rem width (the
game's shell tooltips do the same with `max-w-72` on the text itself); the generic start terrain cards show a
picture of the terrain (`ui/img/terrain/<family>.png`, 16 scenes drawn by `scripts/art/build-terrain-art.py`; the
game ships no terrain art; `.png` is now an import type in `build-modinfo.mjs`); the civilization details screen
(the one a civ card opens, `.civ-details-continue-button`) gets a Build your own civilization... bar above its
Select, like the leader screen; the Unique civics card reads in the other cards' detail: the tree's civics, each
tradition with its text (the shell's `Traditions` table by base trait), each building, quarter, improvement and
civics-only unit with `[icon:<type>]` and its text (the shell's `CivilizationItems`), keys
`LOC_LSHUF_BUILD_CIVICS_TREE/_TRADITION/_UNLOCK`; and while the Show filter is Unique civics or a civics card is in
the details, the cards stand in one narrow scrolling column and the details pane draws the civ's civics tree as the
game lays it out (`ui/setup/lshuf-build-tree.js`: one column per prerequisite depth, each civic a box with name,
culture cost and unlocks, L-shaped lines to its prerequisites drawn from the boxes' positions after a frame), from
the new setup table `LShufSetup_CivicNodes (CivilizationType, NodeType, NameKey, Cost, Depth, Prereqs)` written by
`build-civ-items.mjs` (169 nodes). None of it watched in a game.

## 20. Builds at an age transition (owner, 2026-11-07; scope, lab check pending)

**What the player sees.** At the move to Exploration or Modern, the civilization select and civilization details
screens carry the same Build your own civilization... buttons as at game setup (built: `ui/game/lshuf-game-transition.js`
injects them from the game-scope script; the screens are the shell's own create-game screens run inside the game).
The civ build screen opens there with the new age's civilizations, the player's slot is the civilization being
chosen, and the AI leaders window lists each AI leader with the civilization it is taking into the new age, with a
Build civilization... button per leader. Done or Select carries the picks into the new age: the new civilizations
get their built parts when the age's data loads, the way setup picks do at game creation.

**The shuffle needs nothing new.** Civilization abilities, uniques and civics Shuffled/Paired/Split are dealt over
every civilization of the age when its data loads, from the keys written at setup, so a shuffled next age is shuffled
whoever picks what.

**Keys.** The same builder keys as at setup (`LShufBuilder<n>`, `LShufBuilderCiv<n>`, `LShufBuilt<n>`,
`LShufBuildPicks<n>`, `LShufBuildFor<n>`), rewritten during the transition from the game-scope script with
`Configuration.editGame().setValue` (the game's own automation scripts write game configuration in play). For the
human, `LShufBuilderCiv<n>` is the civilization chosen on the transition screen (`Configuration.getPlayer(local)`
once the screen's Select has set it); for an AI leader, the civilization the engine picked for it.

**Settled by the lab check (2026-11-07, see "as checked"):**
1. A key written during Antiquity is read by the Exploration data load (`ConfigurationValueMatches` on it fires).
2. When, during the transition, the AI leaders' next civilizations are readable from `Configuration.getPlayer(id)`
   (before the human's pick, at it, or only after the load). This decides whether the AI window at transition can
   name each AI's civilization, or has to let the player build for a leader whatever civilization it ends up with
   (a per-leader build, resolved to its civilization at load from `LShufBuilder<n>`'s player slot).
3. The build screen's readers in the game scope: the setup copy and the shell's civ tables through
   `Database.query("config")` (the game's syncretism screen reads it there), the game parameters through `GameSetup`.

**Section 20 as checked (lab run 2026-11-07T13-04-47, seed 4242, the usual mod set plus a two-file probe mod):**
1. Yes. `Configuration.editGame().setValue("LShufProbeKey", "1")` from the game console at Antiquity turn 1 read back
   "1" all age, and the Exploration data load ran the probe's action group gated on
   `ConfigurationValueMatches LShufProbeKey = 1` (its marker row was in the Exploration database). So keys written
   during a transition reach the next age's load; the builder keys can be rewritten in play.
2. Open. The lab's Play Now seat is engine-driven, so the age changed with no civ select screen (the engine picked
   Sengoku, Mongolia, Abbasid, Hawaii, Goryeo, Majapahit for the six players); after the load the game configuration
   held every player's new civilization. When the AI picks become readable during a hands-on transition is still to be
   seen: `lshuf-game-transition.js` now logs `[lshuf-game] civ select at turn N: config civs ...` whenever the
   configuration's civilizations change while a transition screen is up, so the owner's next transition answers it.
3. Not reached (no transition screen in the run). `Database.query("config")` works in the game scope (the game's
   syncretism screen uses it); the build screen's other readers are on the watch list.
The mod's own deal ran at the Exploration load (`LShufResultMeta` DealVersion 10, Mode NONE for a Play Now game).

**One leader pool (owner, 2026-11-07):** a slot picks one leader, so one pool is all the human's leader screen or an
AI slot needs; `LShufPool2` and `LSHUF_RANDOM_POOL_2` are gone, the Leader pool... window is one list with All and
None, and the pool entry sorts right after Random (SortIndex -999, the grid sorts by SortIndex then name) with a
"pool" badge in the corner of its icon (`injectPoolBadges` in `lshuf-build-entry.js`: the pool button is a later
`.leader-button-box` whose portrait is the same image as Random's).

**Setting words (owner, 2026-11-07):** every row uses one vocabulary, each word meaning the same thing on every
row: Base game (nothing moves), Swap whole, Split up, Follows ability, Logical with bonuses, Random roll, Off
entirely (taken out of the game for everyone; builders excepted). The row names: Preset (was Leader shuffle; Base game
replaces Normal as its first value), Leader abilities, Leader attributes, Leader start terrain, Civilization
abilities, Civilization uniques, Civilization civics, AI agendas (was AI behavior), Split fairness (was Fairness of
mixed bonuses), Reveal who got what (was See other leaders' shuffled bonuses; From the start / When you meet them).
Keys unchanged; only `text/en_us/lshuf-text.xml` and TRANSLATION.md changed. Earlier sections quote the old words as
they were when built.

**Tooltip widths, measured (2026-11-07, in the owner's running game, build screen open, 222 cards):** the tooltip
type's own element was attached off-screen, each card drawn into it in turn (`inst.id`, `update()`, one frame, then
`getBoundingClientRect` on the frame and every descendant). With 30rem text blocks every card's title row ran 15px
past the frame's right border; the frame (`.tooltip__content`) measured 486px (30rem) whatever width the mod's box
had (518px or 551px), and its own 0.94rem paddings leave 28rem of usable width. With 28rem text blocks (the shipped
`lshuf-build.css`), 0 of 222 cards reached the border. The same CSS was injected into that session, so the fix was
seen with the shipped values, not only reasoned.


## 21. Civics in pieces, and Split up for civics and uniques (owner, 2026-11-07 night)

**What the player sees.** The Build your own civilization screen offers each civic of each same-age civilization as
its own card (Agoge: 150 culture, the tradition Strategoi, the Parthenon), the way a leader's bonuses are cards; the
whole-tree card stays behind the Whole toggle. A civic card taken moves that civic into the builder's tree with its
traditions and whatever it unlocks; the giver keeps the rest of its tree. A civilization from another age playing
this age (Test of Time) can take civics too: they go into the age's Test of Time tree and only that civilization sees
them. The Civilization civics and Civilization uniques rows gain **Split up**: each civic (or each unique) is dealt on
its own among the age's civilizations, every civilization getting back as many as it gave.

**Probe (2026-11-07, devtools/probes/RESULTS-2026-11-07.md).** Greece's Agoge re-parented into the main Antiquity
civics tree with no prerequisites: Heian Japan could set it as research (the Greek omega showed as the research
icon), researched it in 40 turns, and `Culture.isTraditionUnlocked(TRADITION_STRATEGOI)` was true for Heian although
the tradition's `TraitType` is `TRAIT_GREECE`. So a civic moves between trees and its traditions follow the node, not
the trait. Buildings and units the node unlocks hang on the giver's base trait and need re-pointing (below).

**Cards and ids.** `BUILD.civCivic(node)` = `CIVNODE_<node>`, `BUILD_KIND.CivCivic`; one input group per node of
`data/setup-copy/setup-copy-civ.sql` (`LShufSetup_CivicNodes`). The shell reads node data from that copy; the game and
the tests read `ProgressionTreeNodes` through each civ's tree (`civItems` kind `civics`). Deal input: `civNodes`
`{ civ, node, cost }`.

**Deal (JS `lshuf-deal-civ.js`, SQL `sql-civ.mjs`, the same steps):**
- A builder's civic cards apply in every mode, after its ability, civics-tree, unique and bonus cards: the civic
  moves when its civ plays the same age, nobody took it, and neither its tree nor the builder's was swapped whole.
  Rows `Kind = 'civic'`, `PieceId CIVNODE_<node>`, `FromCivilization` the giver, `SortIndex` 1.. by node.
- `CC_MODE.Split`: one pool per age of every civic of every civ whose tree nobody swapped whole (`dealPool`, keyed
  with `SALT.CivNodes`, Balanced by cost, `POOL_STEP_CAP` cards); each civ that took no civic card is a receiver
  with as many slots as civics it had. `CU_MODE.Split`: the same over every unique (`SALT.CivUniquePieces`, value
  1), receivers the civs that took no unique card. Pool rows are numbered per civ by giver and id.
- With civics or uniques on Split up the whole-set shuffles of those rows don't run.

**Apply.** `LShufWork_CivFinalTree`: each civ's tree after the whole swaps (the tree of the civ whose civics it got,
else its own, else for a `TRAIT_ANACHRONISTIC_CIV` holder the age's `TREE_CIVICS_*_TEST_OF_TIME`). Each moved node's
`ProgressionTree` becomes that tree; prerequisite rows that would cross trees are deleted; a receiver with no tree of
its own gets a `ProgressionTreeNodeTraits` row gating the node on `TRAIT_LSHUF_CIV_<C>`, which every civ with a
`civic` row holds. What the node unlocks follows it onto that trait: `Buildings`, `Improvements` and `Units` (the
whole family) whose `TraitType` is a base trait, `ProgressionTreeNodeUnlocks.RequiredTraitType` naming a base trait,
and a `UniqueQuarters` row once both its buildings carry the same `TRAIT_LSHUF_CIV_*`.

**Tests.** `tests/deal-civ-build.mjs`: the Agoge take (tree, prerequisite, Parthenon, foreign keys), civics Split
(every civic held once, conservation per civ, no prerequisite crosses trees, each node in its holder's final tree),
uniques Split with a builder's take, Test of Time America taking Agoge, and the every-value pairs with Split.

**Loading screen pages and civics in pieces (2026-11-07 night).** With civics moving between trees, "what the civ
holds" is no longer only its traits: `lshuf-load-screen.js` `civicUnlockJudge` decides a row some civic unlocks by
where that civic sits now (a tree whose reveal asks for a trait the civ holds; a trait-gated node, the Test of Time
tree's, only when the civ holds one of its traits); a unique quarter goes by its two buildings; rows no civic unlocks
still go by trait. Watched: under civics Split up with Agoge taken, the Traditions page listed Strategoi alone.

## 22. Who got what, in the leader screen (owner, 2026-11-07 night)

The dock button and the separate reveal panel are gone. `ui/game/lshuf-reveal-panel.js` decorates
`panel-player-diplomacy-actions` and `panel-other-player-diplomacy-actions` (both extend the game's
`panel-diplomacy-actions`, which is never an element itself) with `Controls.decorate`; a MutationObserver on the
panel re-applies when the shown player changes. Under the Leader abilities header the game's own bullet paragraphs
(`.list-begin > p`) get an italic "from <Leader>" at the end of each dealt bonus that isn't the leader's own, in
SortIndex order (`markBullets`; as plain text " (from Amina)": an element added to one of the game's inline
paragraphs gets no size and rewriting its markup doubles its icons, watched 2026-11-07); a short "Who got what"
section follows with attributes and their origins, where the
start terrain came from (another leader, matched to the bonuses, or rolled), the AI behavior's origin, and for the
local player the shuffle number. `ui/game/lshuf-reveal-lines.js` builds the lines (pure, tested in
tests/reveal-lines.mjs). With As you meet them, unmet leaders get nothing. The turn-1 dialog (`showRevealNotice`)
opens once, only when a part fell back or the preview differs. Watched 2026-11-07: the bullets' origins on the local leader's ability text, the section under it, and the section
for an unmet AI leader with At the start.

## 23. Pieces that need each other travel together (owner, 2026-11-09)

**What the player sees.** Nobody ends up with a unit, building, improvement or tradition they can't build or use
because what it needs went to another civilization. Two items that need each other are one card: in every mode (Swap
whole, Shuffled, With the ability, Split up), for the AI and on the build screens, where taking one half takes the
other. The breakdown, with the data behind each link, is `docs/DEPENDENCIES.md`.

**R1. Great people tied to a quarter belong to the civics.** A unit family that a `GreatPersonClasses` row names
(`UnitType`, the family base) is a civics family, like the Watonathi (section 18, `LShufWork_CivicUnit` /
`civicOnlyFamily`), when the row's `UniqueQuarterType` is a quarter whose `BuildingType1` the civ's own civics tree
unlocks, or its `ConstructibleType` is something the civ's own civics tree unlocks. Read live from the game's tables.
It's not a unique card, it stays on the base trait and goes wherever the civics go. Under civics in pieces
(Kind 'civic') the family follows the node that unlocks the quarter's `BuildingType1` (or the constructible): the
apply moves its `Units.TraitType` with that node's unlocks. In 1.5.0: Logios, Tjaty, Alim, Conquistador, Saga Hero,
Jacobin, Revolucionario.

A unit family that a civic of the civ's own tree names in a modifier's `UnitType` argument is a civics family the
same way (`LShufCivUnitLinks (UnitType, NodeType, Why)`, static, generated by `build-deps.mjs`; its anchor is the
civic, and under civics in pieces its `Units.TraitType` follows that node through `LShufWork_CivMoved`). In 1.5.0:
Sengoku's Samurai with Kinsei, which lets its holder train the tier 2 Samurai and switches Man-at-Arms off for good
(`MOD_CIV_SENGOKU_NO_MAN`). Before, three shuffles out of three on the Exploration fixture put Kinsei and the Samurai
on different civilizations. `tests/deal-later-ages.mjs`.

**R2. Civic bundles.** Civics of one civ's tree that have to stay together, unioned per civ:
- the nodes unlocking the two buildings of one `UniqueQuarters` row (live: `UniqueQuarters` + `ProgressionTreeNodeUnlocks`
  over civ civics trees);
- the pairs in `LShufCivLinks (NodeType, NeedsNodeType, Why)` (static, generated by `scripts/mapping/build-deps.mjs`
  from the modifier scan: a tradition that needs another civic's unique). Rows whose nodes aren't in the database
  are skipped.
The bundle's lead is its lowest `NodeType`; the others are riders. In the civics Split pool and on builder civic
cards one card stands for the bundle: id `CIVNODE_<lead>`, value the sum of the members' costs, and a receiver's
slot count is the number of bundles it had (a lone node is a bundle of one). A builder pick of any member counts as a
pick of the lead. After the deal, every result row for a lead gets one more row per rider with the same
CivilizationType, FromCivilization, Kind and SortIndex. Whole-tree swaps and Off are unchanged (the tree moves whole).

**R3. Unique bundles.** An improvement or unit card that only one other unique card's unit can build
(`Unit_BuildConstructibles` with exactly one builder unit, both of the same civ, both unique cards) rides with that
unit card: the lead is the unit card. Live. Same pool, builder and rider-row rules as R2, in the uniques Split pool
and builder unique takes. The whole-set shuffles already move both. In 1.5.0: Nepal's Highland Power Station rides
with the Sherpa.

**R4. Bound modifiers.** `LShufBoundModifiers (ModifierId, AnchorType, Why)` (static, generated): a modifier on a
civ's ability trait that acts only on one of the civ's uniques (city founded by that unit, that unit's tag, city has
that building or quarter). `AnchorType` is a unit family base, a building or a quarter. Last step of the civ apply,
after the Split copies: for each row whose modifier and anchor exist, delete every `TraitModifiers` row for the
modifier and for its copies (`LSHUF_<civ>__<ModifierId>`), then add `TraitModifiers (<anchor's TraitType now>,
ModifierId)` when that trait is in `Traits`. The anchor's trait now: `Units.TraitType` of the base,
`Buildings.TraitType`, or `UniqueQuarters.TraitType`. It runs whatever the settings, since moving a modifier between
two traits of the same civ changes nothing. A piece made only of bound modifiers is `Movable 0` (Joseon B02); Carthage
B02 keeps its two effect modifiers and loses the hidden one.

**R5. Yi Sun-sin.** His B01, B03 and B04 merge into one piece (`merge-pieces.mjs`; B03 and B04 work on Fleet
Commanders, which only B01 gives in Antiquity). `TRAIT_UNLOCK_FLEET_COMMANDER` follows that piece: the apply moves
the `LeaderTraits` row to the leader holding it (whole mode: the ability's holder), and an `LShufMappingUnlocks` row
pins `NODE_CIVIC_AQ_MAIN_DISCIPLINE | UNIT_FLEET_COMMANDER` to the piece. This replaces section 12.4 (owner,
2026-11-09: nobody is stranded with a unit they can't build).

**Build screens.** A rider isn't a card of its own; the lead's card names what comes with it ("With: Ekklesia",
"With: Highland Power Station") and its details list them. The civics card and the civ details list R1 units with
the civics, as they do the Watonathi. A bundle takes as many civic slots as it has members when the screen counts
civic slots; a card that doesn't fit is greyed with the reason.

**Unique quarters (owner, 2026-11-09).** A quarter's two buildings always stay together (R2), so a civilization can
hold quarters from several civilizations but never half of one. Mixed quarters (two lone buildings from two
civilizations making a new quarter) are ruled out.

**After the 1.5.1 update (owner, 2026-11-09: the great-people rules are expected to change).** R1 reads
`GreatPersonClasses` at game load, so the game side follows the new data. The setup copy (`build-civ-items.mjs`) and
the static links (`build-deps.mjs`) were made from 1.5.0 and get rebuilt from the 1.5.1 files, with the scan's
report diffed against 1.5.0. If the quarter requirement moves out of `GreatPersonClasses`, R1 changes with it.

**Tests.** Conservation by bundle; no result where a rider and its lead are held by different civs; no R1 unit held
apart from its quarter's nodes; JS equals SQL across every value of the three civ rows; builder picks of a rider; the
bound modifiers on the anchor's trait after the apply, with a foreign-key check.

**Section 23 data, as laid down (2026-11-09).** `data/mapping/lshuf-civ-links.sql` holds `LShufCivLinks` and
`LShufBoundModifiers` (schema in the file, like the civ mapping), loaded in the shell group and the game schema
group. The setup side has no `GreatPersonClasses`, `Unit_BuildConstructibles` or tree unlocks, so
`scripts/setup-copy/build-civ-items.mjs` writes `LShufSetup_CivRiders (Kind TEXT NOT NULL, CivilizationType TEXT NOT
NULL, LeadId TEXT NOT NULL, RiderId TEXT NOT NULL)` (Kind 'civic' with `CIVNODE_` ids, 'unique' with `CIVUNQ_` ids;
R2 and R3 by the same rules) into `setup-copy-civ.sql`, leaves R1 units and R3 riders out of the unique cards
(`LShufSetup_CivItems`), and lists R1 units in `LShufSetup_CivCivics` as a `KIND_UNIT` unlock of the node that
unlocks their quarter's `BuildingType1` (or constructible). `lshuf-deal-input.js` reads `CivRiders` from the copy
when it exists (as it reads `CivItems`), else derives the same rows from the gameplay tables; the deal input carries
`civRiders: [{ kind, civ, lead, rider }]`.

**Section 23 deal, as built (2026-11-09).** JS `lshuf-deal-input.js` (`civicGreatPeople`, `civicOnlyFamily`,
`deriveCivRiders`) and `lshuf-deal-civ.js` (`riderMaps`, `toLead`, `takeWith`, `riderRows`); SQL `sql-civ.mjs`
(`LShufWork_CivicGP`, `riders()` with `LShufWork_CivNodeEdge`, `LShufWork_CivNodeLead`, `LShufWork_CivRider`,
`boundApply()` with `LShufWork_Bound`). Civic bundles are unioned by a lowest-label pass, 8 rounds in SQL
(`BUNDLE_ROUNDS`), so a bundle can't be longer than that; the JS loops until stable. Riders are left out of every
pool, builder take and whole-set shuffle, and added after the deal as copies of their lead's row, so `SortIndex`
numbering only counts cards. A builder pick reaches the SQL through its card's action group, so a unique rider (no
card, no group) can't be picked; every civic node has a group and a civic rider pick counts as its lead. R4 runs only
when the civ deal wrote a row or a civ part is Off, so a game it doesn't touch stays as shipped (deal-data-safety). In the Antiquity fixture: 8 civic riders (the eight two-civic quarters), the Tjaty and Logios with their
quarters, `TRAIT_MOD_COLONIST_POP` and `TRAIT_MOD_DRUID_PURCHASE_CHARGE` bound. Tests: `tests/deal-civ-deps.mjs` (the
unique bundle uses a synthetic `Unit_BuildConstructibles` row, Aksum's Hawelt built only by the Tankwa) and the
updated expectations in `tests/deal-civ-build.mjs` (Logios and the Highland Power Station aren't cards, Agoge brings
Ekklesia and the Logios, conservation counts bundles, the Off rows keep civics families on the base trait).

## 26. A campaign keeps the shuffle it started with (owner, 2026-11-09)

**Why.** The game builds its database again at every load (each age, each saved game), and the deal runs in that
build from the setup keys. So a version of this mod that deals differently changes the leaders and civilizations of
a campaign already under way. A save can't carry the dealt rows themselves: only a setup value can switch data rows
on or off (`ConfigurationValueMatches`), and the rows are far too many to key one by one.

**What's built.** At setup the host writes `LShufDealVersion` (`KEY.DealVersion`) = `DEAL_VERSION`, once, alongside
the other keys (`ui/setup/lshuf-setup-start.js` writeHostKeys). The age-transition writer doesn't touch it. A save
from before 11 has no such key.

**The rule from the first release on.** A change that alters the deal's rows bumps `DEAL_VERSION` and ships behind a
group whose criteria read `LShufDealVersion` (the new behaviour for games set up on the new version, the old one kept
for older keys), so a campaign plays on with the shuffle it began with. A pure fix (a deal that couldn't load, a
broken rule nobody would want kept) may change old campaigns (the first-turn notice that said so came out
2026-11-11 at the owner's ask; the leader panel's Who got what shows the deal as it stands). Before the first release nothing is gated: only the owner's test saves exist.

## 24. Cards from a leader nobody is playing (owner, 2026-11-09)

**Section 24, as built.** A Build your own leader card from a leader outside the game (axis A reason `notingame`, with
an ability) now applies; before, takeBuild and wholeBuild only took cards whose leader was in the dealt pool, so the
slot came out empty while the build still read "ok". Split modes: a bonus card takes that piece and a whole card
takes the leader's whole ability (only while none of it was taken by a lower slot) straight into the builder's hand;
those pieces never join the deck or its key ranking, so every other leader's deal is unchanged. Whole modes: the
lowest whole card among the pool's leaders and the absent ones is the builder's; for an absent one the builder simply
takes it, nobody else's draw changes, and the ability the builder was to take goes to nobody. The copy path copies the
absent leader's modifiers onto `TRAIT_LSHUF_<builder>` as for any other piece. Legend-node unlocks of an absent leader
follow its pieces: whole mode to the builder holding it; split mode to whoever took the piece an `LShufMappingUnlocks`
row pins it to (else it stays with the absent leader, so nobody gets it), otherwise to whoever took most of its
pieces; Yi Sun-sin's Fleet Commander trait follows with the Discipline unlock (section 23 R5). Attribute, AI behavior
and start terrain cards from an absent leader already applied and are unchanged. JS: `isAbsent`, `takeAbsentWhole`,
`takeAbsentBullet`, `absentReceivers` (lshuf-deal-ability.js), `absentRow` (lshuf-deal-unlocks.js). SQL:
`LShufWork_Shape.Absent`, `LShufWork_BuildTake.BI`, the absent inserts in `buildTake`, `wholeSwap`'s pick, and the
absent branches of `LShufWork_U.Holder` in sql-results.mjs. Tests: tests/deal-absent-picks.mjs. Not watched in a game.

**Section 25, as built (2026-11-09): the game's civilization panels and the civ build screen's unique slots.** The
game's own in-game panels that list a civilization's traditions or uniques: the diplomacy leader panel
(`panel-diplomacy-actions.js`: uniques from config `CivilizationItems`, traditions from a gameplay `SELECT ... FROM
Traditions` kept by `TraitType == LegacyCivilizationTraits` base trait), the Civilopedia civilization page and its
sidebars (config `CivilizationItems` only), the loading screen (section 8, already right). The culture/policies
screens (`model-policies.js`) and the age-progress unlocks (`model-unlocks.js`) read the player's unlocked
traditions from the engine and are right as shipped; the next-age unlocks screen (`civ-unlocks-model.js`) lists the
next age's civilizations, whose deal isn't made yet. Fixes: `ui/game/lshuf-game.js` now writes every civilization's
`CivilizationItems` rows from `civDealViews` (before, only the local civ's), with As you meet them showing a playing
civ as shipped until it's met; `ui/game/lshuf-civ-panels.js` wraps `Database.query` while the deal moved civics
(Kind 'civic' or 'civics') and answers any gameplay query `FROM Traditions` with each tradition under the base trait
of the civ in the game that holds it now (`traditionOwners`, using `civicUnlockJudge` from `lshuf-load-screen.js`,
now built over `civicTables()` read once and shared by every civ), or under `TRAIT_LSHUF_NONE` when its own civ is in
the game and gave it away to nobody playing. Build screen: `uniquesStayOwn(CivUniques)` is true except under Split up
and Off entirely (the deal: a unique builder's own uniques go into the Split pool, and Off moves them away, so the
builder holds only its picks; on the other settings builders are outside the shuffles and keep theirs). When true,
the Uniques slots read "Uniques you add" and a "Yours, kept" row shows the builder civ's own uniques (not slots); the
note under the title says which applies. Slot count stays the builder civ's own unique count; the deal doesn't cap
takes, the screen does. Not watched in a game.

**Build screens, 2026-11-09 round (owner: "too much text... more intuitive or better tool tips").** Both build
screens open with the title, a "?" help mark (the old intro paragraph as its tooltip) and the leader/civilization
picker; the swap and keep notes moved into the Ability and Uniques group headings' tooltips and follow the
Civilization uniques setting. The settings strip sits behind one Settings button, closed by default and remembered
for the session, with a one-line summary beside it (`ui/setup/lshuf-build-layout.js` settingsSummary: the preset,
then each civilization row that isn't Base game on the civ screen, or the leader parts when the preset is Custom).
Every slot group heading and its empty slots carry a `LOC_LSHUF_BUILD_GROUP_TIP_*` tooltip; the Whole and Every age
boxes carry one each. A bundle draws in as many slots as it takes (slotLayout): the lead, then a dimmed linked slot
per rider named for it, and a click on either puts the bundle back. Tooltips use the game's `data-tooltip-content`
route (core/ui/tooltips/tooltip-controller.js). Tests: tests/build-layout.mjs.

## 27. The pools only narrow the draw (owner, 2026-11-09)

**What the player sees.** Leader pool... and Civilization pool... each open one ticked list, everything ticked to
start with. A Random slot (AI players, and your own when you leave it on Random) only gets a ticked leader or
civilization. Anything picked by hand stays as picked, ticked or not. The pools work on their own, whatever Mode
says, and building AI leaders stays in its own window (AI leaders...).

**What's gone.** The "Random from the pool" entry in the game's leader list (`LSHUF_RANDOM_POOL_1`), its badge, and
the pool draw by seed. That entry had no 3D model: the leader select asks the engine for `<leaderID>_GAME_ASSET`
when a leader is picked, and picking the entry crashed the game natively (owner's crash 2026-11-09, reproduced in
the lab; with the entry's model swapped for Random's the same clicks didn't crash). No row of ours goes into
`StandardLeaders` any more.

**How.** `LShufLeaderPoolOut` (config key the same, `InvertSelection`, plain `LEADER_X` values) stores the unticked
leaders, as `LShufCivsOut` does for civilizations. `planRandomSlots(slots, choicesOf, pickIndex, canPick, off)` skips
them (`leadersSwitchedOff()`), the way `planRandomCivSlots` skips unticked civilizations. A slot with no ticked
leader left stays plain Random and the engine picks for it. In a network game the host picks for AI slots and its
own; a remote human's Random is theirs.

## 28. Two build pages, the shuffle box, and no AI building (owner, 2026-11-09)

**What the player sees.** The build window has two pages, **Your leader** and **Your civilization**, with a link row
across the top that marks the one on screen; a click draws the other in place, in the same window. Under the header
on both pages the shuffle settings sit in a box titled **Shuffle for everyone**, always shown, with one line saying
they shuffle the whole game at random, AI players included, and need no build (leader rows on the leader page,
civilization rows on the civilization page, and a Leader pool... or Civilization pool... button). The AI players
are never built by hand: they get the shuffle settings and the pools.

**Section buttons.** Leader pool..., Civilization pool..., AI players..., Build your own leader..., Build your own
civilization..., Advanced settings... (`SECTION_BUTTONS`; `build` and `buildciv` open the two pages, `aiplayers` the
AI players window).

**AI players window.** Who the AI players are, for a game of any size (`openSetupWindow("aiplayers")`, a page of the
setup window built by `ui/setup/lshuf-ai-players.js`). Under the title one line, "Random draws from the Leader pool
and Civilization pool.", with Leader pool... and Civilization pool... buttons. Then one compact row per AI player
in player order inside the window's scroll area (`.lshuf-ai-players__row[data-player="<id>"]`): "AI 1", "AI 2"...
(numbered in order, not by player id, `aiRows`), the leader portrait and civilization art when set, and on the same
line a Leader dropdown (`.lshuf-pick--leader fxs-dropdown`) and a Civilization dropdown (`.lshuf-pick--civ
fxs-dropdown`). Each dropdown's first item is Random, a pick of its own that writes `RANDOM` back, then that slot's
valid leaders or civilizations by name (`hostPicker(scope, onChange, { playerId, allowRandom: true })`,
`pickerItems`). Your own build pages call `hostPicker` without options: no Random, and Select until a pick is made.
Host only: another player sees each row's picks as text. No build buttons and no card counts. Text:
`LOC_LSHUF_BTN_AI_PLAYERS`, `LOC_LSHUF_AI_PLAYERS_TITLE`, `LOC_LSHUF_AI_PLAYERS_NOTE`, `LOC_LSHUF_AI_PLAYER_N`
(`{1_Num}`), `LOC_LSHUF_AI_PLAYERS_NONE`.

**Pool icons.** The leader grid keeps its Leader pool icon right after Random (section 27). The civilization select
at game setup gets the same for civilizations: the game's Random there is the round shuffle button in the left column
(`.civ-select-leader-button-base`, not a card), and the icon (`.lshuf-civ-pool-button`) goes right after it, cloned
from its icon, with the same badge ("Pool", or ticked/total once something is unticked, `poolBadge`), the tooltip
`LOC_LSHUF_CIV_POOL_TIP`, and a press that opens the Civilization pool window. It stays off the between-ages
civilization select (`UI.isInGame()`), since the pool applies when the game starts. Both icons answer the
activatable's `action-activate` and a plain `click`, once per press.

**Code.** `ui/setup/lshuf-build-window.js`: `openBuildWindow(scope)`, `setPage(scope)`, `drawLinks()`, the shuffle box
in `render()`. `ui/setup/lshuf-build-layout.js` (pure, tested in `tests/build-layout.mjs`): `BUILD_PAGES`, `pageOf`,
`poolBadge`. `ui/setup/lshuf-build-entry.js`: `injectPoolButton`, `injectCivPoolButton`.
Text: `LOC_LSHUF_BUILD_PAGE_ME_LEADER`, `LOC_LSHUF_BUILD_PAGE_ME_CIV`, `LOC_LSHUF_BUILD_SHUFFLE_TITLE`,
`LOC_LSHUF_BUILD_SHUFFLE_NOTE`, `LOC_LSHUF_BUILD_SHUFFLE_NOTE_CIV`, `LOC_LSHUF_CIV_POOL_TIP`.

**AI building, parked.** The AI leaders window (section 17), its per-AI pickers and the AI pages planned for this
window are out of the mod and kept in `mod_ideas_tested/re-dealable-ai-leader-builds/` with a README (what it was,
why, where it hooked in, what bringing it back needs). Each builder slot costs about 560 modinfo loaders, so only
three AI players could be built, which wasn't worth having. Gone from the UI: `lshuf-ai-window.js`,
`buildTargets`, `slotForLeader`, `setAiWindowOpener`, `aiWorkingCards`, the "AI leaders..." button and the links between the screens, and the `LOC_LSHUF_AI_*`, `LOC_LSHUF_BUILD_LINK_*` and
`LOC_LSHUF_BUILD_FOR_*` text. Still in place, unused by the UI: `BUILD_SLOTS` (4), the `LShufBuildFor<n>` and
`LShufBuildPicks<n>` parameters and the deal's builder slots 2 to 4.

Not watched in a game: the link row, the shuffle box, the Civilization pool icon and its press, the AI players
window.

## 29. Cards follow the settings, and a bonus that travels with its unit (owner, 2026-11-10)

**No whole/single switch.** The "Whole abilities and civics" check box is gone from the build screens: it was a
second filter on top of the settings. `cardsShown(scope, options, values)` (`ui/setup/lshuf-build-layout.js`) decides
on every refresh: Civilization abilities on Split up shows single bonus cards, any other value whole ability cards;
Civilization civics on Split up shows single civics, any other value whole trees; Leader abilities on Swap whole
shows whole abilities, anything else single bonuses. Every age stays beside the Show filter (it filters cards, like
Show).

**Bound pieces.** `LShufBoundPieces (PieceId, AnchorType, Why)` in `data/mapping/lshuf-civ-links.sql`
(`build-deps.mjs` BOUND_PIECES): a whole bonus that goes with a unique in the random deal. The piece stays out of the
Split deck and the receivers' slot counts (`deckPieces` in `lshuf-deal-civ.js`; `NOT IN (SELECT PieceId FROM
LShufBoundPieces)` in `sql-civ.mjs` split), and its modifiers are in `LShufBoundModifiers` with that anchor, so R4
puts them on the trait the unique is on. Rows: Carthage's second bonus ("Receive a second Merchant or Colonist...")
with the Colonist (owner's rule; the game's two modifiers double any unit that founds a town or makes a trade route,
so the bonus works without the Colonist), Joseon's second bonus with the Seowon quarter (`Movable 0`, never a
card), and the Pirate Republic's second and third bonuses with the Buccaneer (owner, 2026-11-10). The third turns
Settlers off (`MOD_CIV_PIRATE_REPUBLIC_DISABLE_SETTLERS`, the only dealt bonus that switches something off) and the
second is the replacement, a settle charge for a promoted Fleet Commander, so the two never part in the random deal;
the second's text names the Buccaneer though its modifier asks for `UNIT_CLASS_FLEET_COMMANDER`.

**Two cards on the build screen (owner, 2026-11-10: not joined into one).** Carthage's second bonus stays a card of
its own (`Movable 1`) and the Colonist stays a unit card. Taking the bonus shows the line "<bonus> goes with the
Colonist." with the button "Take the Colonist too" (`lshuf-build-needs.js`, as before), which fills the unique slot.
A builder who takes the bonus card under Civilization abilities Split up holds it by the copy path; the two
modifiers bound only through the piece (`LShufBoundModifiers.ByPiece`) are then left out of the R4 move, so the
Colonist's holder doesn't get the bonus as well. The Colonist's own rule (`TRAIT_MOD_COLONIST_POP`, `ByPiece` NULL)
always goes with the Colonist. On the civilization screens a Colonist that moved by the deal carries the bonus text
in its row (`BOUND_PIECE_OF`, `withBonus` in `lshuf-civ-views.js`) unless someone holds the bonus as its own card.
`tests/civ-links.mjs` and `tests/deal-civ-deps.mjs` cover the table, the random deal and both builder cases.

The Pirate Republic's two bonuses are cards the same way. The second's text names the Buccaneer, so taking it shows
the Buccaneer line and button. Taking the third without the second shows "<third> goes with <second>." with the
button "Take <second> too" (`PIECE_NEEDS` in `lshuf-constants.js`, `bonus: true` from `uniqueNeeds`,
`LOC_LSHUF_BUILD_NEEDS_BONUS`). `tests/deal-later-ages.mjs` runs the Pirate rows on the Exploration fixture (the
three modifiers only on the Buccaneer's trait in the random deal, and both builder cases); `tests/civ-links.mjs`
covers the table and `tests/build-needs.mjs` the two lines.

**Later-age fixtures.** `tests/fixtures/db/exploration` and `modern` are built from
`tests/fixtures/source-db/exploration/` and `modern/` (not committed, like the Antiquity copies): the Debug database
copies of two mods-off lab games started in those ages on 1.5.0 (2026-11-10). `runBoth({ fixture: "exploration" })`
loads the mod for that age (`fixtureAge` in `build-fixtures.mjs`). `tests/deal-later-ages.mjs` checks JS equal to
SQL in each mode with the civilization rows on Split up in both ages, the Pirate rows, the Sherpa with the Highland
Power Station, and Joseon's Seowon rule.

## 30. Civilization attribute tags follow the deal (owner, 2026-11-10)

**What the player sees.** A civilization plays with the attribute tags (Cultural, Economic, Expansionist,
Militaristic, Political, Scientific) of the ability it was dealt. Rome dealt Greece's ability is Cultural and Political:
the civilization select shows those two, the age's attribute quests pay Rome +1 Political point (an alliance or a
suzerain in Antiquity) rather than +1 Militaristic, and in Test of Time games Rome gets the Political traditions.

**The game's data.** Each civilization holds its tags as `CivilizationTraits` rows: the plain `TRAIT_ATTRIBUTE_<KIND>`
(two per civilization in 1.5.0) that the `ATTRIBUTE_QUEST_*` stories check, and the Test of Time ones
(`TRAIT_ATTRIBUTE_<KIND>_TOT_<AGE>` and their `_TALL`/`_WIDE`/`_HAPPINESS`/`_INFLUENCE` variants,
`TRAIT_ATTRIBUTE_MILITARISTIC_EXPANSIONIST`) that gate the Test of Time civics tree's traditions, limits and wonders.
The setup side shows `CivilizationTags` rows `TAG_TRAIT_<KIND>`. The tags unlock nothing outside Test of Time.

**The deal.** Result rows `Kind 'tags'`, `PieceId CIVTAGS_<giver>`, `SortIndex 0`, in `LShufResultCivPieces`:
- every `ability` row (a builder's whole-ability swap or the Swap whole shuffle) brings a `tags` row with the same
  giver (`abilityTags` in `lshuf-deal-civ.js`; the SQL copies the ability rows in `results()`);
- Civilization abilities on Split up: the civs of an age whose ability no builder took, and that no builder built,
  trade tag sets round a cycle keyed by `SALT.CivTags` (`splitTags`; SQL `cycle("T", ...)` in `shuffle()`);
- Base game and Off entirely: none.
A builder who took bonus cards keeps its own tags.

**The apply.** `tagsApply()` in `sql-civ.mjs`, last: a snapshot of every giver's and receiver's `TRAIT_ATTRIBUTE_*`
rows, then each receiver's rows replaced. The plain tags (and `_TALL`/`_WIDE`, `MILITARISTIC_EXPANSIONIST`) are the
giver's. Test of Time tags exist only for the ages a civ isn't native to, so they're rebuilt rather than copied: for
each age the receiver had them in, `TRAIT_ATTRIBUTE_<KIND>_TOT_<AGE>` for each of the giver's kinds, plus the giver's
variant of that kind where it has one. Copying them instead left Buganda, playing in Antiquity with Greece's ability,
no Antiquity Test of Time tags (found offline 2026-11-10). Watched 2026-11-10: Buganda then unlocked Greece's
Cultural and Political Influence traditions in the Test of Time tree, and the civilization select showed the swapped
tags (`devtools/probes/RESULTS-2026-11-09.md`).

**The screens.** `data/frontend/civ-items-copy.sql` copies the shipped `TAG_TRAIT_*` rows into
`LShufSetup_CivilizationTags`; `readCivItemRows` carries them as `tagRows`, `shippedCivView` and `civDealViews` give
each civ's view `tags` (the giver's for a civ with a `tags` row), and `writeCivItemRows` rewrites the civ's
`CivilizationTags` rows in its shipped domains. `DEAL_VERSION` 14. Tests: `tests/deal-civ-tags.mjs` (Antiquity and
Exploration fixtures: Base game, Swap whole, Split up cycle, a builder's swap, JS equal to SQL, the applied rows,
foreign keys) and `tests/civ-views.mjs`.

## 31. Every civilization bonus moves (owner, 2026-11-10)

**What the player sees.** Each line of a civilization's ability is a card that can be dealt or built, or, where the
game ties it to a civic or a unique, a card that says so and takes that civic or unique when clicked. Nothing stays
behind silently.

**Favored-wonder bonuses (50 pieces, `wonder: true` in `civ-draft.mjs`).** The game's "+30% Production towards
constructing <wonder>" is `MOD_CIV_WONDER_PRODUCTION_<CIV>`, an `EFFECT_CITY_ADJUST_FAVORED_WONDER_PRODUCTION` that
asks for the civilization's base trait and raises whichever wonder its holder favors. The pieces are dealt like any
other. When the civ deal runs (`CIV_DEAL_RAN`, the guard `boundApply` uses), `wonderApply()` in `sql-civ.mjs` gives
every trait row carrying one, or a copy, a modifier of the mod's own instead: `LSHUF_WONDER__<CIV>`, type
`LSHUF_WONDER_PRODUCTION_TYPE` (`COLLECTION_PLAYER_CITIES`, `EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION`), with
`ConstructibleType` = the giver's `CivilizationFavoredWonders` row and the game's `Percent`. Read live, so another
mod's favored wonder or percent comes along; a wonder the age's database lacks leaves the game's modifier in place.
Another age's wonder can't be built, so the pieces are in `CIV_OWN_AGE_PIECES` (`shared/lshuf-civ-wonder-pieces.js`,
written by `build-civ-mapping.mjs`).

**Rule pieces (`LShufCivRulePieces (PieceId, HomeTrait, TargetModifier)`).** A line the game implements as an
exception in its own rows rather than as an ability modifier. Assyria's "Codices are not awarded from Technologies"
(`CIVILIZATION_ASSYRIA__B02`) is the nine Antiquity codex rewards' `NotTraitType TRAIT_ASSYRIA` and a requirement in
their own sets that the player isn't `TRAIT_ASSYRIA`. `ruleApply()` points both at `TRAIT_LSHUF_RULE_<piece>`, held
by the piece's bullet holder, else the holder of its civ's whole ability, else its own civ; nobody with Civilization
abilities Off.

**Joined lines (`joins: true`).** A line that explains the bullet before it joins that card: Majapahit's note about
transitioning away is part of its specialist-limit card (`CIVILIZATION_MAJAPAHIT__B02`, bullets 2-3).

**Goes with (`LShufCivGoesWith (PieceId, GoesWithId)`, `Movable 0`).** Lines the game builds into a civic or a unique:
the Inca's and Songhai's Homelands convoys come from the Qhapaq Ñan and Kanta civics' own modifiers, and Joseon's
Seowon rule is bound to the Seowon (section 23 R4, led by the Ihak civic). They move with that civic or unique. On
the build screen each shows as a card, "Goes with <name>" on its face, with "This comes with <name>. Click to take
<name>." in its details; a click takes that card (`takeGoesWith` in `lshuf-build-window.js`). They take no slot.

**Leaders.** Every leader bonus was already movable; nothing changed there. `DEAL_VERSION` 15. Tests:
`tests/deal-civ-unique-rules.mjs` (the mapping, Base game as shipped, the wonder swap on the Antiquity, Exploration
and Modern fixtures in Split up and Swap whole, the rule by builder, by Split up, by whole swap and with abilities
Off, JS equal to SQL, foreign keys).

**Watched 2026-11-10** (`devtools/probes/RESULTS-2026-11-09.md`): Rome holding Egypt's wonder card had
`LSHUF_WONDER__CIVILIZATION_EGYPT` (Pyramids, 30) live on the player; Rome holding Assyria's rule got no codex reward
at Writing's mastery, while in the control game (the rule dealt to Gaul) Rome got `MOD_AQ_CODEX_REDUX`; the Inca's
convoys card read "Goes with Qhapaq Ñan" and a click took the Qhapaq Ñan civic.

## 32. Leader mode and Civilization mode, and Advanced on the build screens (owner, 2026-11-10)

**What the player sees.** Two modes with the same words. **Leader mode** (`LShufMode`, the old Mode) and
**Civilization mode** (`LShufCivMode`, new) each set their three rows at once: No shuffle, Swap whole, Swap partial,
Mix bonuses (and, for leaders, Mix bonuses, random start); a row changed by hand makes its mode read Custom. On each
build page the settings box shows that page's mode on one line with an Advanced button and the pool button; Advanced
opens the other rows, and stays open or closed across the two pages (`advancedOpen` in `lshuf-build-window.js`).

**The presets.** Leader mode is unchanged in its values and rows; only its names moved: `LSHUF_MODE_SWAP_LEADERS`
reads Swap whole (listed second) and `LSHUF_MODE_SWAP_ABILITIES` Swap partial (third). Civilization mode
(`CIV_PRESETS` in `lshuf-constants.js`, `[Abilities, Uniques, Civics]`):
- `LSHUF_CM_NORMAL` No shuffle: Base game, Base game, Base game;
- `LSHUF_CM_WHOLE` Swap whole: Swap whole, Follows ability, Follows ability (owner: everything for a civilization is
  swapped whole);
- `LSHUF_CM_PARTIAL` Swap partial: Swap whole, Swap whole, Swap whole, each on its own cycle;
- `LSHUF_CM_SPLIT` Mix bonuses: Split up, Split up, Split up;
- `LSHUF_CM_CUSTOM` Custom.
`lshuf-presets.js` watches both groups the same way. The civilization mode is a setup-side preset only: the deal
reads the three rows, so `LShufCivMode` isn't in `OPTION_DEFAULTS`. Main rows renumbered: Leader mode 2300, the three
leader rows 2301-2303, Civilization mode 2304, the three civilization rows 2305-2307, AI agendas 2308, Human players
keep their own leader 2309, Keep my built civilization 2310, Reveal who got what 2311. Tests:
`tests/parameters-and-text.mjs`, `tests/civ-mode.mjs`.
