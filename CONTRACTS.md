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
| F. Player-facing text and docs | `text/`, `docs/WORKSHOP.md`, `README.md`, `CHANGELOG.md` |

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
| `LShufLeadersOut` | `LShufLeaderValues` | 1 | NULL | `LShufExcludedLeaders` | `LOC_LSHUF_LEADERS_OUT_NAME` / `_DESC` |
| `LShufModdedAbilities` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_ABILITIES_NAME` / `_DESC` |
| `LShufModdedAttributes` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_ATTRIBUTES_NAME` / `_DESC` |
| `LShufModdedBiases` | `bool` | 0 | `0` | | `LOC_LSHUF_MODDED_BIASES_NAME` / `_DESC` |
| `LShufModdedOut` | `LShufModdedLeaderValues` | 1 | NULL | `LShufExcludedModdedLeaders` | `LOC_LSHUF_MODDED_OUT_NAME` / `_DESC` |
| `LShufPool1` | `LShufPoolLeaderValues` | 1 | NULL | | `LOC_LSHUF_POOL1_NAME` / `_DESC` |
| `LShufPool2` | `LShufPoolLeaderValues` | 1 | NULL | | `LOC_LSHUF_POOL2_NAME` / `_DESC` |
| `LShufPersonality` | `LShufPersonalityValues` | 0 | `LSHUF_PERSONA_FOLLOWS` | | `LOC_LSHUF_PERSONALITY_NAME` / `_DESC` |
| `LShufDealing` | `LShufDealingValues` | 0 | `LSHUF_DEAL_BALANCED` | | `LOC_LSHUF_DEALING_NAME` / `_DESC` |
| `LShufReveal` | `LShufRevealValues` | 0 | `LSHUF_REVEAL_START` | | `LOC_LSHUF_REVEAL_NAME` / `_DESC` |
| `LShufSeed` | `text` | 0 | `'1'` | | `LOC_LSHUF_SEED_NAME` / `_DESC` |

In the table, "`LOC_LSHUF_MODE_NAME` / `_DESC`" means `Name = 'LOC_LSHUF_MODE_NAME'` and
`Description = 'LOC_LSHUF_MODE_DESC'`: the `_DESC` key replaces `_NAME`, it isn't appended. For option values
(next table) `_DESC` is appended to the value's key: `LOC_LSHUF_MODE_NONE_DESC`.

`LOC_LSHUF_BIAS_NONE` and `LOC_LSHUF_BIAS_MAP_SETS` are whole lines shown instead of `LOC_LSHUF_BIAS_LINE`, not
values for its `{1_List}`. In the reveal panel, `LOC_LSHUF_REVEAL_LEFT_OUT`'s `{2_Reason}` takes one reason key, or
for a failed modded check one `LOC_LSHUF_WHY_*` key in place of `LOC_LSHUF_REASON_MODDED_NOTOK`.

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
| `StandardLeaders` (added rows) | `LSHUF_RANDOM_POOL_1` (`LOC_LSHUF_RANDOM_POOL_1`, Icon `LEADER_RANDOM`, SortIndex -999), `LSHUF_RANDOM_POOL_2` (`LOC_LSHUF_RANDOM_POOL_2`, Icon `LEADER_RANDOM`, SortIndex -998) |

The leader domains are selected through the frontend `Leaders` table, so a DLC or a mod the player doesn't have
isn't listed (`INSERT ... SELECT ... FROM Leaders WHERE LeaderType IN (...)`).

### Values in the game config

- `LShufSeed` holds the deal number as a decimal string, `"1"` to `"256"`. It's a `text` parameter so the config
  holds a string; a number never matches `ConfigurationValueMatches` (probe 7). The id contains "Seed", so Drongo's
  Random Improvements doesn't restore it (COMPATIBILITY.md).
- Selects hold their value string. `bool` parameters are matched with `<Value>1</Value>` (probe 13: `1` and `true`
  both matched).
- `LShufExcludedLeaders` and `LShufExcludedModdedLeaders` hold arrays of `|LEADER_X|` strings (probe 13).
  `LShufPool1`/`LShufPool2` hold arrays of plain `LEADER_X` strings.

## 3. Game config keys written by script

Written with `Configuration.editGame().setValue(key, value)`, always as strings. All by C, in the `startCampaign`
handler (section 7), on the host only in multiplayer (`Network.isHost()` or no network game), in this order:

1. **Pool slots.** Each slot whose leader is `LSHUF_RANDOM_POOL_1`/`_2` gets a leader from that pool through
   `GameSetup.setPlayerParameterValue(slot, "PlayerLeader", leader)`. Picks use `lshufKey(seed, SALT.Pools, rank)`
   over the pool's leaders sorted by id, skip leaders already in a slot, and never give two slots the same leader. An
   empty or used-up pool leaves the slot as plain `RANDOM`.
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
    argument copied, with the `Tooltip` argument set to the receiving leader's own ability `Name` key (probe 1
    follow-up). An original with no `Tooltip` argument is copied without adding one.
  - Copied AI lists for `TRAIT_LSHUF_<LEADER>`: `ListType` = `LSHUF_<LEADER>__<ORIGINAL_LIST_TYPE>`.
- In whole modes, leader X's ability row becomes leader Y's ability trait (X's own row removed). Text and AI lists
  come with the trait; legend unlocks need no rewrite.
- In split modes, X's ability row is removed and `TRAIT_LSHUF_<X>` added; unlocks are rewritten by
  `UPDATE ProgressionTreeNodeUnlocks SET RequiredTraitType = ...` on rows selected by their shipped ability trait only.
- AiLists rows with a NULL `LeaderType` or `TRAIT_LEADER_MAJOR_CIV` are never touched.

## 7. JS modules shared across workstreams

Import paths in shipped code start with `/re-dealable-leader-abilities-attributes-and-start-biases/` (`MOD_PATH`).
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
| Mod | `LOC_LSHUF_MOD_NAME` ("Re-dealable Leader Abilities, Attributes, and Start Biases"), `LOC_LSHUF_MOD_DESCRIPTION` |
| Window | `LOC_LSHUF_OPEN_BUTTON` ("Re-dealable Leaders..."), `LOC_LSHUF_WINDOW_TITLE`, `LOC_LSHUF_CLOSE`, `LOC_LSHUF_HOST_ONLY`, `LOC_LSHUF_LIST_ALL_ON`, `LOC_LSHUF_LIST_ALL_OFF`, `LOC_LSHUF_LIST_COUNT` (`{1_On}`, `{2_Total}`), `LOC_LSHUF_LIST_SHOW`, `LOC_LSHUF_LIST_HIDE`, `LOC_LSHUF_SEED_NEW`, `LOC_LSHUF_SEED_RANGE` (`{1_Min}`, `{2_Max}`), `LOC_LSHUF_POOL_EMPTY`, `LOC_LSHUF_MODDED_NONE_INSTALLED` |
| Window headings | `LOC_LSHUF_HEADING_DEAL`, `LOC_LSHUF_HEADING_LEADERS`, `LOC_LSHUF_HEADING_POOLS`, `LOC_LSHUF_HEADING_MODDED`; the toggle `LOC_LSHUF_ADVANCED_SHOW` / `LOC_LSHUF_ADVANCED_HIDE` |
| Options | the `Name`/`_DESC` keys in section 2 |
| Option values | `LOC_LSHUF_MODE_NONE`, `LOC_LSHUF_MODE_SWAP_ABILITIES`, `LOC_LSHUF_MODE_SWAP_LEADERS`, `LOC_LSHUF_MODE_SPLIT_MATCHED`, `LOC_LSHUF_MODE_SPLIT_RANDOM`, `LOC_LSHUF_REDEALT`, `LOC_LSHUF_OFF`, `LOC_LSHUF_PERSONA_STAYS`, `LOC_LSHUF_PERSONA_FOLLOWS`, `LOC_LSHUF_PERSONA_REDEALT`, `LOC_LSHUF_DEAL_BALANCED`, `LOC_LSHUF_DEAL_CHANCE`, `LOC_LSHUF_REVEAL_START`, `LOC_LSHUF_REVEAL_MET`, `LOC_LSHUF_RANDOM_POOL_1`, `LOC_LSHUF_RANDOM_POOL_2`; each with `_DESC` |
| Leader screens | `LOC_LSHUF_BIAS_LINE` (`{1_List}`: "Starts near: {1_List}"), `LOC_LSHUF_BIAS_NONE`, `LOC_LSHUF_BIAS_MAP_SETS`, `LOC_LSHUF_BIAS_COAST`, `LOC_LSHUF_BIAS_RIVER`, `LOC_LSHUF_BIAS_LAKE`, `LOC_LSHUF_BIAS_NATURAL_WONDER`, `LOC_LSHUF_BIAS_ISLAND`, `LOC_LSHUF_ABILITY_OFF`, `LOC_LSHUF_PIECE_REST` (`{1_Ability}`), `LOC_LSHUF_DEAL_NUMBER` (`{1_Seed}`) |
| Reveal panel | `LOC_LSHUF_REVEAL_TITLE`, `LOC_LSHUF_REVEAL_OPEN`, `LOC_LSHUF_REVEAL_UNMET`, `LOC_LSHUF_REVEAL_TOO_FEW`, `LOC_LSHUF_REVEAL_DIFFERS`, `LOC_LSHUF_REVEAL_LEFT_OUT` (`{1_Leader}`, `{2_Reason}`) |
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
4. **Yi Sun-sin's `TRAIT_UNLOCK_FLEET_COMMANDER` stays with Yi Sun-sin.** SPEC section 3 lists it among the rows that
   stay put; COMPATIBILITY.md calls it part of his ability. Owner decision 2026-11-06: it stays with him. It's the
   only leader trait in the base game and DLC besides abilities, attributes, victory and AI traits; in Antiquity it's
   what lets him build Fleet Commanders (`age-antiquity/data/units.xml` sets `UNIT_FLEET_COMMANDER`'s TraitType to
   it). Unique units, buildings and improvements hang on civilization traits, which the deal doesn't touch.
5. **No `ParameterGroups` row and no `LShufModdedMany` flag.** All options live in the window, which decides itself
   when to show the modded list.
6. **The window opens on the main choices, with the rest under Advanced settings** (owner, 2026-11-06). First view,
   under The deal: How leaders are re-dealt, Leader abilities, Leader attributes, Start biases, Keep my leader as
   chosen, Show what everyone got. A "Show advanced settings" button opens, in order: Dealing, AI personality and Deal
   number with no heading of their own, then Leaders in the deal (Leaders to re-deal), Leader pools, Modded leaders. Advanced
   settings start closed and stay as the player left them for the session. The spec's table is one flat list.
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
