# Re-dealable Leader Abilities, Attributes, and Start Biases: spec

Status: specced 2026-11-06 with the owner's answers folded in the same day; probes 1, 7, 8 and 10 watched in lab games;
nothing built. Mod id and folder: `re-dealable-leader-abilities-attributes-and-start-biases`. Earlier drafts
called it Leader Shuffle. Ideas parked for later are in [FUTURE.md](FUTURE.md).

A game-setup option that randomizes leader abilities, leader attributes and start biases for a new game. It offers four
modes: two move whole abilities, and two break abilities and attributes into pieces and deal those out to random leaders.
Separate switches turn start biases, abilities or attributes off for a game on equal footing. It works in multiplayer
through the game's own lobby, and the shuffled abilities, attributes and start biases show on the game's own leader
screens.

## 1. What the player sees

At game setup, under the advanced options, a **Leader Shuffle** dropdown:

| Mode | In the game |
| --- | --- |
| Normal | The game as shipped |
| Full random | Each leader has another leader's whole ability, two random attributes, and a start bias rolled from scratch. None of the three is tied to the others |
| Paired random | Each leader takes another leader's whole package: ability, attributes and start bias together. Amina might play with Pachacuti's mountain bonuses and start beside mountains |
| Split random | Abilities are broken into their bullet points and dealt out to random leaders along with the attributes. Each leader's start bias is built from the pieces they got, so a leader holding Pachacuti's mountain bullets starts near mountains |
| Split full random | The same deal as Split random, with start biases rolled from scratch as in Full random |

Next to it, under the mod's own "Re-dealable Leaders" heading (section 3, "The setup screen", has the full list,
order and wording):

| Option | Values | Default |
| --- | --- | --- |
| Start biases / Leader abilities / Leader attributes | Re-dealt with the mode / Off | Re-dealt with the mode |
| Keep my leader as chosen | Check box | Off |
| Leaders to re-deal | List of leaders | The leaders in the game |
| Modded leaders' abilities / attributes / start biases | Three check boxes | Off |
| Modded leaders to re-deal | List of listed modded leaders the player has installed | All on |
| Leader pool 1 / Leader pool 2 | Lists of leaders; a slot set to "Random from pool 1/2" gets a leader from that pool | Empty |
| AI personality | Stays with the leader / Follows the ability / Re-dealt too | Follows the ability |
| Dealing | Balanced / Pure chance | Balanced |
| Show what everyone got | At the start / As you meet them | At the start |
| Deal number | A number; the same number gives the same deal | A new number each setup |

- **Start biases: Off.** Leaders and civs start with no terrain pull at all, in any mode. With the mode on Normal,
  it's the game as shipped apart from where people start.
- **Leader abilities: Off.** Leaders have no ability. Attributes and start biases follow the mode.
- **Leader attributes: Off.** No leader has attributes. Each leader gets all twelve diplomatic actions the attributes
  would have unlocked (section 2), so everyone has the same set and the actions stay in the game. Abilities and start
  biases follow the mode.
- With all three Off, it's the base game with all leaders on equal footing. When abilities or attributes are off,
  the mode still decides start biases (Normal, shuffled, or rolled from scratch).
- **Keep my leader as chosen.** Each human player keeps the leader they picked, as shipped: ability, attributes, bias and
  personality. Their pieces stay out of the deal. The AI leaders are shuffled among themselves.

Civ biases are in the mix in all shuffle modes (section 3).

### Where the player sees what they got

The shuffled ability, attributes and start bias show in the places the game already shows a leader's ability and
attributes, in the same style:

| Screen | Today | With the mod |
| --- | --- | --- |
| Leader select (setup) | Ability name and text, two attribute icons | The leader's shuffled ability and attribute icons for the current seed, plus a start bias line |
| Loading screen | Your leader's ability and attribute icons | Your shuffled ability, attributes and start bias |
| Diplomacy screen, leader panel | The leader's ability | The leader's shuffled ability, attributes and start bias |
| Civilopedia, leader page | The leader's ability | The shuffled ability, attributes and start bias for this game |

The game doesn't show start biases anywhere today. No text in any language names one, and no UI script reads the bias
tables. The mod adds a short line under the attributes, in the game's wording and icons, for example "Starts near:
Mountains". It's in the same spot on each screen, and it shows normal games' biases too when the mode is Normal.

With Reveal on As you meet them, the diplomacy panel and Civilopedia show another leader's shuffled ability once you've
met them, and the leader-select screen shows only your own. The seed shows on the loading screen, so a player can share
it and a friend can play the same roll.

## 2. What the game's data holds

Read from the compiled `Debug/gameplay-copy.sqlite`, `Debug/frontend-copy.sqlite` and the 1.5.0 `modules/` tree on
2026-11-06.

### Start biases

Nine tables, about 100 rows, each keyed to a leader or a civilization:

| Table | Rows | Example |
| --- | --- | --- |
| `StartBiasBiomes` | 39 | Amina: Plains 20, Desert 20 |
| `StartBiasTerrains` | 21 | Pachacuti: Mountain 40; Hatshepsut: Navigable River 20 |
| `StartBiasAdjacentToCoasts` | 20 | Isabella 200, Lafayette 200, Aksum 150 |
| `StartBiasFeatureClasses` | 8 | Harriet Tubman: Vegetated 20; Khmer: Floodplain 40 |
| `StartBiasRivers` | 6 | Charlemagne 10, America 5 |
| `StartBiasLakes` | 1 | Buganda 150 |
| `StartBiasNaturalWonders` | 1 | Isabella 1000 |
| `StartBiasIslands` | 1 | England 50000 |
| `StartBiasResources` | 0 in Antiquity | Exploration and Modern add 9 rows between them |

`base-standard/maps/assign-starting-plots.js` (`adjustScoreByStartBias`, `updateRegionsForStartBias`) reads these tables
from `GameInfo` once, when the map is made. Changing the rows changes where people start, and the map script stays
untouched. The Earth maps place starts by their own routine and don't read start biases, so the bias part of the mod has
no effect there. A civ's bias only counts for the civ a player starts the game with, so Exploration and Modern civ
biases like England's matter only in games started in those ages.

### Leader attributes

Each leader has two gameplay traits, `TRAIT_LEADER_ATTRIBUTE_<KIND>` (Cultural, Economic, Expansionist, Militaristic,
Political, Scientific; one Wildcard), apart from Ibn Battuta. He has none: his ability grants Wildcard attribute points
and carries the two Expansionist unlock modifiers (`MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_01`/`_02`) with no
bullet for them. The mapping table keeps those two with his Wildcard bullet, and he's dealt no attributes in the split
modes since he gave up none. The attributes do three things:

- Each kind grants two diplomatic actions through `EFFECT_DIPLOMACY_GRANT_DIPLOMATIC_ACTION`: Economic gives Minor Trade
  and Sabotage Treasury, Scientific gives Research Collaboration and Sabotage Research, and so on. These twelve actions
  have `RequiresUnlock = 1`, and the attribute traits are the only thing in the data that unlocks them. Removing
  attributes without a replacement would take the twelve actions out of the game.
- They steer the AI through `AiLists`: "<Kind> Attribute Biases" (`ProgressionTreeBiases`, which attribute trees it
  spends points in) and, for Militaristic and Political, `DiplomaticGroupBiases`.
- The base game's AI victory strategies (`StrategyConditions`, `CD_VICTORY_STRATEGY_*` in `AI_Victories.xml`) key off
  them, so a shuffle carries into the AI's choice of victory.

### Leader abilities

The 38 leader abilities (`TRAIT_LEADER_<NAME>_ABILITY`) hold 222 modifiers between them.

- Each description is a bullet list (`[BLIST][LI]...[/BLIST]`) in all 12 languages. The bullets are the natural pieces,
  and their text can be reused as written.
- Nothing in the data links a bullet to its modifiers. Pachacuti's "-2 Maintenance on Specialists near Mountains" bullet
  is two modifiers, `PACHACUTI_MOD_MOUNTAIN_SPECIALIST_HAPPINESS` and `_HAPPINESS_INVERSE`.
- 40 of the 222 are AI agendas, like Pachacuti's "Mountain King": 37 use `EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE`, and
  Tubman, Tecumseh and Franklin have one more each, on `EFFECT_DIPLOMACY_AGENDA_ON_WAR_START`,
  `EFFECT_DIPLOMACY_AGENDA_ON_DISPERSE_IP` or `EFFECT_BASIC_DIPLOMACY_MODS` with an agenda name. They aren't bullets;
  section 5 covers them.
- 47 modifiers name a specific civ, unit, building, improvement or project in their arguments or requirements. Moved to
  another leader, some of these could do nothing.
- 8 modifiers name a terrain, biome, feature or resource directly. Others reach terrain through the adjacency tables
  (Pachacuti's `PachacutiMountainFood` adjacency).
- No unit, building, improvement, tradition, unique quarter or legacy is tied to an ability trait, so moving a trait
  doesn't drag other content with it.
- Each ability also has its own AI lists ("Amina Yield Biases", "Amina Diplomacy Biases") keyed to the trait type.
- Each leader's legend nodes in the attribute trees are unlocked only for that leader's ability trait
  (`ProgressionTreeNodeUnlocks.RequiredTraitType`: 153 rows across all 38 abilities). They sit in the leader's own
  attribute trees: Amina's are in Economic and Militaristic, her two attributes. The exceptions are Ibn Battuta, who has
  no attributes and whose legend nodes sit in Economic and Expansionist, and Yi Sun-sin, whose ability also gates an
  unlock in the Antiquity civic tree (`TREE_CIVICS_AQ_MAIN`). The table is keyed on node and target, not on the trait,
  so each unlock has one holder; moving it means rewriting its `RequiredTraitType`. Section 3 says where they go under
  each setup option.

### What the leader screens read

The screens in section 1 read the frontend `config` database, not the gameplay traits:

| Screen | Script | Reads |
| --- | --- | --- |
| Leader select | `core/ui-next/screens/create-game/leader-select-model.js`, `create-game-hub.js` | `LeaderItems` (ability), `LeaderTags` + `Tags` (attribute icons, `TAG_TRAIT_*`) |
| Loading screen | `base-standard/ui-next/screens/load-screen/load-screen-model.js` | `LeaderItems`, `LeaderTags` |
| Diplomacy leader panel | `base-standard/ui/diplomacy-actions/panel-diplomacy-actions.js` | `LeaderItems` |
| Civilopedia | `base-standard/ui/civilopedia/screen-civilopedia.js` | `LeaderItems` |

`LeaderItems` has one row per leader ability (`Type`, `Kind`, `Name`, `Description`, `SortIndex`). Moving the gameplay
traits alone leaves these screens showing the vanilla ability and attributes, so the display needs its own work
(section 3).

### Load criteria

The base game's modinfo files gate content only on `AgeInUse`, `ModInUse` and `RuleSetInUse`; mods also use
`ConfigurationValueMatches`. Nothing in them loads data by which leaders are in the game or which ones the humans
picked. Your leader: As chosen needs the human leaders written into the game config (section 3).

## 3. How it's built

### The setup options and the seed

The dropdowns are game-setup parameters. A setup parameter is the one switch that can gate compiled data
(`ConfigurationValueMatches`).

Rolling in SQL with `random()` won't hold. The database is rebuilt at each age transition and, as far as we know, when a
save loads, so the abilities would re-roll mid-game. In multiplayer each machine would also roll its own. So:

- The seed is a setup parameter of its own. When setup opens, the frontend picks a number and sets it as the
  parameter's value, so it sits in the lobby like any other setting and the host can change it. In multiplayer it reaches
  each player through the lobby's own sync.
- The mod ships one action group per seed value (for example 256). Each group's criteria matches its value, and its only
  file inserts the seed into a small table. A later, always-on group runs the shuffle and reads the seed from that table,
  using an arithmetic shuffle with no `random()`.
- The result is then the same after a load, at each new age, and on each machine in multiplayer.

### The setup screen

Owner decisions 2026-11-06 (second round): the lists start closed; leaders for the game can be picked the way
Civilization VI did it, with re-dealing inside that set; modded leaders get separate choices instead of one tick box;
headings and option names say plainly what they do; and our other mods' setup options get the same tidy layout (see
tools/plans/setup-options-layout-plan.md).

**One heading for the mod.** All of the mod's options sit in their own section, a `ParameterGroups` row named
"Re-dealable Leaders", the way Settlement Limit Settings has its own. The advanced screen draws a group as an accordion
with that heading (`AdvancedOptionsAccordian`, `advanced-options.js` line 871).

**Option names.** The window's layout is in CONTRACTS.md 12.6 (main choices first, the rest under Advanced settings,
owner 2026-11-06); this table lists the names:

| Option | Kind | Replaces |
| --- | --- | --- |
| How leaders are re-dealt | Dropdown: Not re-dealt / Swap whole abilities / Swap whole leaders / Split abilities, matched starts / Split abilities, random starts | Mode (Normal, Full random, Paired random, Split random, Split full random) |
| Start biases | Dropdown: Re-dealt with the mode / Off | Start biases: As the mode sets / None |
| Leader abilities | Dropdown: Re-dealt with the mode / Off | Leader abilities |
| Leader attributes | Dropdown: Re-dealt with the mode / Off | Leader attributes |
| Keep my leader as chosen | Check box | Your leader: As chosen |
| Leaders to re-deal | List of leaders, all on | Leaders in the deal |
| Modded leaders' abilities | Check box, off | Include modded leaders (split three ways) |
| Modded leaders' attributes | Check box, off | |
| Modded leaders' start biases | Check box, off | |
| Modded leaders to re-deal | List; shown when any of the three modded boxes is on and two or more listed modded leaders are installed | Modded leaders in the deal |
| AI personality | Dropdown: Stays with the leader / Follows the ability / Re-dealt too | AI Personality |
| Dealing | Dropdown: Balanced / Pure chance | Deal |
| Show what everyone got | Dropdown: At the start / As you meet them | Reveal |
| Deal number | Number, the same number gives the same deal | Seed |

The three modded check boxes are separate (owner decision): a player can let modded leaders' start biases into the deal
while keeping their abilities and attributes as shipped, for example. Each box gates its own part of the SQL for the
listed modded leaders that pass the setup check.

**Lists start closed.** The game's `Accordian` takes `initialCollapsed`, but `AdvancedOptionsAccordian` doesn't pass it,
so every list on the advanced screen opens expanded, and `Accordian` is a plain import that can't be swapped through
`ComponentRegistry`. The list's body is only drawn while it's open (`Show when={!isCollapsed()}`), and its header
toggles it. So a shell script watches the advanced screen and, the first time each of our lists or our section appears,
activates its header once, leaving it closed with nothing else changed. If a later update or another mod's
`advanced-options.js` replacement changes that screen, our lists simply start open again. Probe 14 watches it. The
other route, a "Choose leaders..." row that opens our own window with the lists, stays as the fallback if the in-place
collapse can't be made reliable.

**A window of the mod's own (owner idea, 2026-11-06).** Probe 14 showed two lists in one section run together, since
the game draws a list inside a section as plain rows with no heading. The owner's idea: one row on the advanced screen,
"Re-dealable Leaders...", that opens a window just for this mod's setup, with its own headings, lists that start closed,
and room for the pools. Emigration already opens a window like this from the Options menu's Mods tab
(`ui/options/emigration-advanced-editor.js`, the way the base game opens its key-remap and language editors). At setup:
the mod's options stay as setup parameters with `Hidden = 1`, so they still save with the game and travel to every
player; the window reads and writes them with `GameSetup.setGameParameterValue`; and a button added to the Advanced
Settings popup (or to the create-game hub) pushes the window. Probe 16 watches it: a hidden parameter set from the
window gates data in the game, the button can be added and opens the window over the create-game screen, and in a
multiplayer lobby only the host can change values while others see them. Watched 2026-11-06 in single player (probe 16):
the button opened the window over create-game, and a hidden option ticked there gated data in the game; the multiplayer
part waits for probe 9. So the window is the layout, and the in-place sections and the start-closed script are the
fallback, and the same window pattern serves Economics and Strategic Resources
(tools/plans/setup-options-layout-plan.md).

**Leader pools, as in Civilization VI.** Civ VI's advanced setup had two leader pools: tick lists of leaders, and any
player slot could be set to "Random (Pool 1)" or "Random (Pool 2)" to get a random leader from that pool. The same here:

- Two options, **Leader pool 1** and **Leader pool 2**, each a list of leaders (base game, DLC, and listed modded
  leaders when installed), stored like the other lists.
- Each player slot's leader choice gains **Random from pool 1** and **Random from pool 2**. The engine picks the leader
  for a plain Random slot itself at `startGame`; no setup script does it. So just before the game starts, our setup
  script gives each pool slot a leader picked from its pool with the deal number (no two slots the same), through
  `GameSetup.setPlayerParameterValue(slot, "PlayerLeader", ...)`, the call probe 7 used to set Amina. Plain Random
  slots get a leader the same way, from the leaders that slot's own list offers (owned, not already playing), since
  the engine's own pick comes too late for the deal to see. The engine then sees ordinary leaders. In a network game
  a remote human's Random slot is left to the engine.
- **Re-dealing inside the set:** "Leaders to re-deal" defaults to the leaders actually in the game, so a game set up
  from a pool re-deals only among that pool's leaders.
- Multiplayer: the pools and the slot choices are setup options; the host's script resolves the slots before launch and
  the chosen leaders reach everyone as ordinary leader picks. Probe 15 watches the launch hook in single player and probe
  9 in multiplayer.

### Leaders in the deal (the accordions)

Owner decision 2026-11-06: an accordion at setup lets the player pick which leaders' abilities, attributes and start
biases go into the deal, for the base game and DLC leaders and, separately, for the listed modded leaders.

The game already draws this. A setup parameter with `Array = 1` and a `Select` domain is drawn on the advanced
setup screen as an accordion (`AdvancedOptionsAccordian` in `core/ui-next/screens/create-game/advanced-options.js`)
with one row per value and an Enabled/Disabled switch on each; Victories, Crises and Legacy Paths use it. With
`UxHint = 'InvertSelection'` the stored list holds the values switched off, as `ExcludeCrises` does. So:

- **Leaders in the deal**: an array parameter whose domain is the base game and DLC leaders in the frontend `Leaders`
  table (selected through that table, so a DLC the player doesn't own isn't listed), stored as a list of left-out
  leaders (`LShufExcludedLeaders`). Default: none left out.
- **Modded leaders in the deal**: the same for the listed modded leaders whose frontend `Leaders` rows exist (only
  installed, enabled mods add them), stored as `LShufExcludedModdedLeaders`. `ParameterDependencies` shows it only while
  Include modded leaders is on and a flag the setup script sets (`LShufModdedMany = "1"`) says two or more are
  installed; with one, the check box alone decides.
- A left-out leader plays as shipped, the same way as a kept human leader: one action group per leader, matched with
  `ConfigurationValueContains` on the stored list, inserts it into the keep table. The list values are written with
  delimiters (`|LEADER_XERXES|`) so a substring match can't confuse `LEADER_XERXES` with `LEADER_XERXES_ALT`. Probe 13
  watched the stored list and the per-leader rules leave out Xerxes and keep his alternate persona.
- Native parameters save with the game and reach every player through the lobby like any other setup option. Probe 13
  (section 7) watched the parameters, the stored lists and the gating; the on-screen accordion is still to be seen, and
  probe 9 covers multiplayer.
- Leaders left out shrink the pool. The deal still gives each dealt leader back as many pieces as it gave, so the
  smaller pool needs no other change. If fewer than two leaders are left in the deal, the mode acts as Normal and the
  reveal panel says so.

### Your leader: As chosen

- When a human picks a leader, the frontend sets a config key for that leader (`LShufKeep_<LEADER>`) to the string
  `"1"`, and clears it when they change their pick. The value has to be a string: `ConfigurationValueMatches` compares
  text and never matches a key written as a number (probe 7, watched). In multiplayer this has to go through the
  lobby's sync like the seed (probe 9).
- The mod ships one action group per known leader, matched on that key with `ConfigurationValueMatches`, whose file
  inserts the leader into a keep table. The shuffle skips kept leaders: their rows, pieces, bias and personality stay as
  shipped.
- A modded leader the mod has no group for can't be kept this way; it's shuffled with the rest, and the loading screen
  says so. A single list-valued key with `ConfigurationValueContains` also applied in probe 7, but whether it compares
  whole entries or substrings isn't settled, so the per-leader keys stay.

### Modes 1 and 2 (whole abilities)

- Rewrite `LeaderTraits` so leader X holds leader Y's ability trait. Its text and AI lists come with it.
- Attribute traits: Paired moves Y's two with the ability. Full random picks two different kinds from the pool.
- Leader biases: Paired moves Y's rows to X. Full random rolls from the shape of the vanilla rows (section 6).
- Civ biases: Paired shuffles each civ's bias set to another civ of the same age, so England's island start might go to
  Prussia. Full random rolls fresh civ biases the same way as leader biases.
- With AI Personality on Follows the ability, `LeaderCivPriorities` moves with the ability too, so the AI picks civs that
  suit its new bonuses in each age.

### Modes 3 and 4 (split abilities and attributes)

- A mapping table, shipped with the mod: one row per bullet, with the source leader, bullet index, its modifier IDs, its
  bias tags and a rough value. About 140 rows, drafted by a script from the data and checked by hand. This table is most
  of the work for these modes.
- The attribute traits go into the deck as pieces of their own, each worth its two diplomatic actions and its AI lists.
  Each leader gets back as many attributes as it gave up (two). The deal skips a duplicate and draws again, because
  `LeaderTraits` is keyed on leader and trait. When nothing but a duplicate is left (odd modded mixes only), the
  leader takes it anyway on a trait of the mod's own that carries a copy of that attribute's modifiers (owner decision
  2026-11-06; CONTRACTS.md 12.8).
- For each leader, a new trait `TRAIT_LSHUF_<LEADER>` gets the modifiers of the ability pieces dealt to it, copied
  through `TraitModifiers`. Its description is assembled from the original bullets, in each language, by splitting on
  `[LI]`. Dealt attributes are written straight into `LeaderTraits`, so their own AI lists come with them.
- The deal: pieces are dealt once, and each leader gets as many as they gave up. Each ability and attribute in the game
  is used once, so the game's total strength stays the same. Balanced evens out the values in the mapping table; Pure
  random doesn't.
- Leader biases in Split random come from the pieces' bias tags (section 6). Civ biases are shuffled among civs of the
  same age, as in Paired random. Split full random rolls both from scratch.
- AI lists for abilities: rebuilt for each leader from the pieces they hold, so the AI plays its new bonuses.

### The None switches

- Start biases: None deletes the rows of the nine bias tables, after the shuffle so it wins in any mode.
- Leader attributes: None removes the `TRAIT_LEADER_ATTRIBUTE_*` rows from `LeaderTraits` and gives each leader one
  trait, `TRAIT_LSHUF_EQUAL_ACTIONS`, carrying the twelve existing `MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_*` modifiers. The AI
  attribute-tree lists go with the attributes, so the AI spends attribute points with no lean.
- Leader abilities: None removes the `TRAIT_LEADER_*_ABILITY` rows. Agendas live inside the ability trait; they move to a
  personality-only trait per leader so the AI keeps its character (section 5). The ability AI lists go.
- Kept human leaders (As chosen) keep their bonuses under all three switches.

### Legend nodes and other leader-only unlocks

Each leader's legend nodes follow the setup options, so they always belong to whoever holds the bonuses they came with:

| Setup | Where a leader's legend nodes go |
| --- | --- |
| Normal | As shipped |
| Full random | With the ability. They're keyed to the ability trait, which moves whole, so they move with it; the receiving leader's random attributes may be other trees, and the nodes are there to unlock all the same |
| Paired random | With the package. Ability and attributes move together, so the nodes stay in the receiving leader's own attribute trees |
| Split random, Split full random | With the attribute piece whose tree they sit in. Whoever is dealt Amina's Economic attribute gets her Economic legend nodes; whoever is dealt her Militaristic attribute gets her Militaristic one. Ibn Battuta's go with his Wildcard bullet, since he has no attributes. Leader-only unlocks outside the attribute trees (Yi Sun-sin's civic unlock) go with the leader who gets most of that ability's pieces |
| Leader abilities: None | Off. They're the leader's own bonuses, so a game on equal footing has none |
| Leader attributes: None | Whole-ability modes: with the ability, as above. Split modes, where no attribute pieces are dealt: with the leader who gets most of that ability's pieces |
| Your leader: As chosen | A kept leader keeps their own |

In the split modes the mod rewrites `RequiredTraitType` on each moved unlock to the receiving leader's new trait
(`TRAIT_LSHUF_<LEADER>`). The mapping table records each legend node's tree, read from `ProgressionTreeNodes` at build
time, so nodes a DLC or another mod adds follow the same rule. Not yet watched: the attribute tree screen showing a
moved legend node as available to the receiving leader.

### Showing the result on the leader screens

All of the screens read `LeaderItems` and `LeaderTags` from the `config` database, and a UI script can rewrite those
rows at runtime with `Database.query("config", "UPDATE ...")` (probe 8, watched). The mod writes them twice:

- **From the setup screen, before the game starts.** The setup screen works out the deal from the lobby's seed and
  writes each leader's shuffled ability name, description and attribute tags into `config`. The loading screen, the
  Civilopedia and the diplomacy panel then show them with no changes to those screens. Watched: Amina's loading screen
  drew a third attribute and moved bullets written this way.
- **From a game-scope script, for a loaded save.** Loading a save skips the setup screen's deal, so a game-scope script
  writes the same rows from the gameplay tables (`GameInfo.LeaderTraits` and the mod's result tables). That reaches the
  Civilopedia and the diplomacy panel (watched); the loading screen has drawn by then (loading state 6), so a loaded
  save's loading screen keeps the vanilla text unless the setup-side route can cover loads too.
- The main menu's `config` is vanilla again after leaving a game (watched), so nothing leaks into the next setup.
- Wrapping each screen's model stays as the fallback if a later game update takes runtime writes away.

### Naming the bonus lines in City Details

The City Details "Yields Breakdown" lists a percentage bonus (such as Pachacuti's 10% of Food as Production) as
"Other", for every leader in the vanilla game. Its model (`base-standard/ui/city-details/model-city-details.js`) builds
"Other" from whatever its known steps don't account for (`LOC_GLOBAL_YIELDS_OTHER`, from the income node's base value
minus the children it named), and it has no case for `GameValueStepTypes.PERCENTAGE`. The engine does name these steps:
`city.Yields.getYields()` gave "Warrior-Queen of Zazzau = 0.5" for the moved bullet.

The mod wraps that model's update so each unnamed percentage step shows as its own line under the yield, named by its
step description, for example "Warrior-Queen of Zazzau +0.5". "Other" stays only for whatever is still unexplained. It
names vanilla bonuses too, so Pachacuti's own line reads "Earth Shaker" in any game with the mod on. The wrap goes on
the model, not the panel: Cultural Diffusion and Partisans both decorate `panel-city-details` and need to keep working.
Each named line gets one child row naming its source, in the game's own format ("Food +10%" with the Food icon), so it
has the expand arrow and lines up with the game's rows. The source comes from `GameInfo`: the conversion modifier whose
`Tooltip` composes to the line's name, converting into this yield at the step's percent; with no single match the line
shows without a child row. Watched in probe 11 and its follow-up (devtools/probes/RESULTS-2026-11-06.md).

Watched in probe 11: the Production line read "From Buildings +5" and "Warrior-Queen of Zazzau +0.5" with no "Other",
and Cultural Diffusion's and Partisans' sections still drew. The build limits the search to the income's base steps,
so a percentage step under the income modifiers (the game's "Bonus" line) isn't also listed; a city with a Bonus line
is still to be checked.

The start bias line is new on all four screens either way. In the game it reads the bias tables from `GameInfo` and
words them with the game's own terrain, biome and feature names and icons.

The leader-select screen comes before the game, so the gameplay tables don't exist yet, and the setup database has no
start bias tables at all (`frontend-copy.sqlite` holds only `MapStartPositions`, `PreviousCivilizationBias` and
`LeaderCivilizationBias`). Drongo's Syncretism Revealer ran into this (section 4). For this screen:

- The mod ships a setup-side copy of the vanilla and DLC bias rows and the mapping table, generated by a build script
  from the compiled database at each game update. A shell-scope `UpdateDatabase` writes it into the setup database.
- With the seed sitting in the lobby, the frontend works out the same deal from that copy and shows each leader's result
  for the current seed. The deal logic lives in one source file that a build script turns into both the SQL and the
  frontend script. A test checks that both give the same deal for a sample of seeds.
- The copy can't see other mods' leader or bias changes, so the leader-select screen can differ from the game when such
  a mod is on. The loading screen reads the game's own result, and when the two differ it says the deal changed because
  of another mod's leaders.
- Drongo's fixed version (section 4) uses the same kind of setup-side copy. Probe 10 reads his source to confirm the
  copy is what fixed it, and watches ours read back on a fresh launch, before any game has been loaded.

### Multiplayer

The mod works in multiplayer through the game's own lobby, with no extra steps for players:

- The host sets the mode, switches and seed in the lobby like any other setting, and each player sees them there.
- Each machine builds its own database from the same seed and the same arithmetic, so the deal matches on each machine.
- Your leader: As chosen covers each human in the game.
- Reveal: As you meet them uses each player's own met list, so it's local to each player.
- Nothing is written outside the game config and the database, so a player joining a saved game gets the same result.

### Living with other mods

The full audit is [COMPATIBILITY.md](COMPATIBILITY.md) (read from code and data on 2026-11-06, nothing watched in a
game). None of the mods read stops a game from starting with ours on. The rules it adds to the build:

- **Move only ability and attribute rows.** `LeaderTraits` also holds rows that belong to the leader's player and must
  stay put: Cultural Diffusion's `TRAIT_CD_FLIP_<LEADER>`, Partisans' `TRAIT_PARTISANS_<LEADER>`, the base game's
  `TRAIT_LEADER_MAJOR_CIV`, `TRAIT_LEADER_MINOR_CIV`, `TRAIT_LEADER_AGGRESSIVE`, Yi Sun-sin's
  `TRAIT_UNLOCK_FLEET_COMMANDER` and the 114 `TRAIT_AQ|EX|MO_*_VICTORY` rows. A `TRAIT_LEADER_%` pattern catches some of
  these, so the SQL never selects by that pattern.
- **Find the ability from data.** 17 of the 302 modded leaders in the corpus don't name it `TRAIT_LEADER_<X>_ABILITY`.
  The ability is the leader's `KIND_TRAIT` row in `config.LeaderItems`, and in `gameplay` the leader's trait whose
  `Traits.Name` is set.
- **Other mods' changes to a vanilla ability win.** Modifiers on an ability that the mapping table doesn't list travel
  as one remainder piece. Bullet text is split from the live description at build time, not from shipped English.
  `TraitModifiers` rows are written with INSERT, never UPDATE (a Confucius mod has an UPDATE trigger on that table).
- **Our own setup tables keep the `LShuf` prefix.** Drongo's Syncretism Revealer creates the nine `StartBias*` tables
  in `config` with vanilla rows.
- **The seed parameter's id contains "Seed"** (for example `LShufSeed`): Drongo's Random Improvements puts setup
  parameters back to their last values for up to a minute after setup opens and skips ids containing "seed".
- **The keep keys are written from each human's final `PlayerLeader`, just before the game starts,** not from a wrapper
  on the leader setter, which Random Improvements can go around.
- **The attribute deal has a limit.** Modded leaders hold 0, 1, 3, 4 or 6 attributes; after a set number of redraws
  the deal takes the next kind that isn't a duplicate, or a duplicate when nothing else is left, so it can't loop and
  every leader gets back as many attributes as it gave.
- **Observer leaders stay out of the deal** (an empty ability and no attributes, as in Observer Mode and Multiplayer
  Toolkit).
- **Our own per-leader tuning follows the ability, not the leader:** Emigration's `BY_LEADER` table and Cultural
  Diffusion's Xerxes entry key on the ability trait the leader holds.
- **The start-bias line goes inside the `LeaderItems` description we already write,** so it shows on any screen that
  draws the ability, including screens other mods replace.
- **Map scripts that ignore biases.** True-start-location maps (YnAMP, Massive Earth TSL, YAMEM, Custom Start
  Locations) and three popular `assign-starting-plots.js` replacements (which skip `StartBiasIslands`) don't honour the
  shuffled biases; on those the bias line says the map sets starts.

- **Drongo's bias panel is hidden in shuffle modes** (owner decision 2026-11-06). His Syncretism Revealer shows the
  vanilla start biases, which would contradict ours. When the mode isn't Normal, our shell script adds a style rule that
  hides `#drongos-leader-bias-panel` and `.drongos-civilization-spawn-bias-overlay`; his syncretism panel stays. If he
  renames those elements, his panel simply shows again. Lab check owed: a capture with his mod on in a shuffle mode.
- **Modded leaders:** see the next section.

### Modded leaders

Owner decisions 2026-11-06: a modded leader plays as shipped unless the player has its mod installed and turned on,
ticks **Include modded leaders** at setup (off by default), and the leader is on the mod's list and passes a live check; the list starts with 25 leader mods built the way the base game's leaders are; the Workshop description tells
modders what a leader needs to be added; and all of it works in multiplayer.

**Why a check at setup.** Some modded leaders keep part of their ability in scripts that check their own leader type,
and that part would stay behind if the ability moved. A list alone can go stale when an author adds a script, and none
of the 25 sets a `<Version>`, so there's nothing to pin to. Probe 12 showed the setup screen can read any installed mod's
modinfo and script files live (`XMLHttpRequest` on `fs://game/<mod id>/<file>`), so the check runs on the files the
player has, each game.

**The list.** Leaders read from their files on 2026-11-06 (see [MODDED-LEADERS.md](MODDED-LEADERS.md)): no gameplay
scripts, the ability an ordinary trait with modifiers, and "leader is X" requirements only on unlocks and leader-level
rewards, as in the base game. Each entry ships with the leader type, the mod id, the ability's modifier set as reviewed,
and its bullet-to-modifier rows, in the same mapping table as the DLC leaders.

| # | Mod | Workshop id | Mod id (modinfo) | Version on scan | Leaders |
| --- | --- | --- | --- | --- | --- |
| 1 | Remilia Scarlet | 3635718174 | `MAO-Leader-REMILIA` | none | `LEADER_REMILIA` |
| 2 | Qin Shi Huang (FGO) | 3635171494 | `MAO-Leader-QINSHIHUANG` | none | `LEADER_QINSHIHUANG` |
| 3 | Oda Nobunaga(FGO) | 3631520597 | `MAO_ODA_NOBUNAGA` | none | `LEADER_ODA_NOBUNAGA` |
| 4 | Youmu Konpaku | 3646519031 | `MAO-Leader-Youmu` | none | `LEADER_Youmu` |
| 5 | Leader: 【Mao Zedong】新领袖：毛泽东 | 3517202110 | `Mao Zedong` | none | `LEADER_MAOZEDONG` |
| 6 | Gilgamesh | 3635072993 | `MAO-Leader-KingofHeroes` | none | `LEADER_KingofHeroes` |
| 7 | Kaguya Houraisan | 3645230017 | `MAO-Leader-Houraisan` | none | `LEADER_Houraisan` |
| 8 | Tanya Degurechaff | 3680373123 | `MAO-Leader-MAO_Tanya` | none | `LEADER_MAO_Tanya` |
| 9 | Olga Marie | 3637045457 | `MAO-Leader-OLGA` | none | `LEADER_OLGA` |
| 10 | Yuyuko Saigyouji | 3654327522 | `MAO-Leader-Yuyuko` | none | `LEADER_Yuyuko` |
| 11 | Nearl | 3647483068 | `MAO-Leader-Nearl` | none | `LEADER_Nearl` |
| 12 | Flandre Scarlet | 3660809274 | `MAO-Leader-Flan` | none | `LEADER_FLAN` |
| 13 | Patchouli Knowledge | 3653306249 | `MAO-Leader-Patchouli` | none | `LEADER_Patchouli` |
| 14 | Bocchi | 3649901296 | `MAO-Leader-Bocchi` | none | `LEADER_Bocchi` |
| 15 | Astolfo (Saber) | 3677067116 | `MAO-Leader-MAO_Astolfo` | none | `LEADER_MAO_Astolfo` |
| 16 | Okita Sōji (FGO) | 3642496682 | `MAO-Leader-OKITA_SOUJI` | none | `LEADER_OKITA_SOUJI` |
| 17 | Eirin Yagokoro | 3659192739 | `MAO-Leader-EIRIN` | none | `LEADER_EIRIN` |
| 18 | Maho Shojo Witch Trial — Leaders Pack | 3655381520 | `MAO-Leader-MahoShojoWitchTrial` | none | `LEADER_Ema`, `LEADER_Hiro`, `LEADER_Shelly` |
| 19 | Yamada Ryo | 3650228385 | `MAO-Leader-Yamada` | none | `LEADER_Yamada` |
| 20 | Alice Margatroid | 3648069483 | `MAO-Leader-Margatroid` | none | `LEADER_Margatroid` |
| 21 | Cirno 2.0 | 3660224019 | `MAO-Leader-Cirno` | none | `LEADER_Cirno` |
| 22 | Hieda no Akyuu | 3661958452 | `MAO-Leader-Akyuu` | none | `LEADER_Akyuu` |
| 23 | Koishi Komeiji | 3646742676 | `MAO-Leader-Koishi` | none | `LEADER_Koishi` |
| 24 | Wu Zetian (FGO) | 3636713096 | `MAO-Leader-WUZETIAN` | none | `LEADER_WUZETIAN` |
| 25 | Aya Shameimaru | 3661417870 | `MAO-Leader-Aya` | none | `LEADER_Aya` |

**The check runs only when Include modded leaders is ticked.** With the box off, the setup script writes no
`LShufModOK_*` keys and every modded leader plays as shipped, listed or not. With it on, for each listed leader whose
mod is installed and enabled (`Modding.getInstalledMods()`, matched on the mod id):

1. *Its mod loads nothing that runs code, apart from portraits.* The setup script reads the mod's modinfo live. Allowed
   actions: `UpdateDatabase`, `UpdateText`, `UpdateIcons`, `UpdateColors`, `UpdateArt`, `UpdateAudio`, `UIAudioRules`,
   `UpdateVisualRemaps`, `ImportFiles` of non-script files, and `UIScripts` whose every file holds nothing but
   `CustomLeaderConfig.registerImageLeader(...)` calls (the portrait registration these mods share; checked by reading
   the file). Any `Scripts`, `ScenarioScripts`, `MapGenScripts`, `UIShortcuts`, other `UIScripts` file, or `.js` in
   `ImportFiles` fails the check.
2. *Its ability is still built in data.* The gameplay SQL confirms no modifier on the leader's ability uses
   `REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES`.
3. *Split modes only: its ability is the one we reviewed.* The ability's modifier set equals the reviewed set. If the
   author changed it, the leader is still dealt in the whole-ability modes but goes into the split modes as one whole
   piece.

A leader that passes gets `LShufModOK_<LEADER> = "1"` written into the game config next to the keep keys, and the SQL
deals a listed leader only when that key is there. A leader that fails, an unlisted modded leader, and a DLC leader
newer than our last update all play as shipped. The reveal panel names any listed leader that was left out and why
("Nearl: its mod now runs a script").

**Multiplayer.** The checks run once, on the host's setup screen, and their results travel as game config keys, the
same way the seed and the keep keys do, so every machine deals the same leaders even if one player's copy of a leader
mod differs. Probe 9 covers it: the keys reach the joining machine, both machines deal a listed leader the same way, and
a joining player whose copy of a listed leader mod differs from the host's (older version, or missing) is handled the
way the game handles any mod mismatch, which the run records.

**For modders (goes in the Workshop description).** Plain-language requirements for a leader to be added, so authors
can build for it and ask:

- Define the leader the usual way: its type, its `Leaders` row and its `LeaderItems` ability row.
- Build the ability as a leader trait whose modifiers do all the work, with the description as a bullet list, one
  bullet per bonus.
- Don't use scripts for gameplay. A script that only registers the leader's portrait is fine.
- Use "player's leader is X" requirements only for unlocks and leader-level rewards, never on an ability's modifiers.
- Then ask us (a Workshop comment or a GitHub issue) to review the leader; once listed, it's dealt in every mode as long
  as the mod keeps meeting these rules, checked each game.

Not yet watched: the whole check in a game with a listed leader mod installed (none of the 25 is installed here), the
portrait-registration file check on a real MAO mod, and probe 9's multiplayer runs.

### Data safety

- Pieces are inserted only when their modifiers exist (`INSERT ... SELECT ... WHERE ModifierId IN (SELECT ModifierId FROM
  Modifiers)`). A missing DLC drops its pieces, and the game still starts.
- A multiplayer game where players own different DLC builds different pools. The game already requires matching content
  in a multiplayer game; probe 9 confirms that holds with the mod on, so the deals match.
- A leader the mapping table doesn't know (from a mod or a DLC newer than our last update) plays as shipped (see
  "Living with other mods").
- The shuffle reads leaders, civs, traits and biases from the tables at build time, so other mods' changes to the base
  game and DLC leaders it deals come along.
- The shuffle runs late in the load order, after other mods have added or changed leaders. A Civ V randomizer had errors
  until other trait mods loaded before it.

## 4. Lessons from earlier attempts

Neither earlier game shipped a randomizer for abilities or start biases. Two close precedents:

- **Civ IV, Random Personalities** (custom game option). It swaps whole AI personalities between leaders, and their
  traits stay put. Players liked the less predictable diplomacy. One argued the standard AI plays better because
  personalities match traits. Players could still work out who was who from the trade screen. A later thread wanted
  personalities that weren't copies of existing leaders; that needed a DLL change and was never built.
- **Civ V, Randomized Unique Components and Traits** (Divine Yuri, 2015-16). It dealt traits and unique units,
  buildings and improvements to random civs, from a named setup that gave the same result each time. Problems reported:
  players rerolled for the strongest combo, and the planned balance system was never built. Pieces written for one civ
  broke on another, and so did script-based abilities. Load order with other trait mods caused errors. Asking for more
  pieces per civ than the pool held hung the generator. A "?" mystery mode was planned and never built. Multiplayer
  never came up in its thread.

One Civ VII mod already shows start biases:

- **Drongo's Syncretism Revealer** (Workshop 3735281916) shows each leader's and civ's start bias ("spawn bias") on the
  setup screens, alongside syncretism pairings.
  - In early June 2026, soon after release, players reported "all my leaders say no spawn bias", one of them on a Mac
    M3. A few saw the biases show up only after loading a game and going back to the menu. The author didn't reply to
    those reports.
  - A change note on June 23 reads "Fixed spawn bias display so leader and civilization spawn preferences now appear
    correctly." The fetched comments show no "no spawn bias" report after it.
  - The version in our dossier (1.3, updated 2026-09-16, after the fix) writes its own copy of the nine bias tables
    (about 100 rows, `StartBiasResources` included) into the setup database from a shell-scope action. A tool script,
    `tools/generate-start-bias-config.mjs`, generates that copy.
  - Our reading, unconfirmed by the author: the early version read the game's tables, which only exist once a game has
    loaded, and the setup-side copy was the fix. Probe 10 checks this in his source.
  - Other reports from its comments: a hard dependency on the Ada Lovelace DLC blocked multiplayer saves for players who
    didn't own it (fixed June 1). Another start-bias mod (Baijen's better civ biases) made its lists wrong. Two players
    asked about the multiplayer lobby and got no answer.
  - Sources: our dossier [3735281916](../../../other_peoples_mods_analysis/mod-dossiers/3735281916.md), the cached Workshop
    comments, and the Workshop change notes and comments pages (read 2026-11-06; the description page returned HTTP
    429). The mod isn't in this Mac's Steam folders, and its files are on tp-share, which wasn't mounted on 2026-11-06.

What this spec takes from them:

| Lesson | Where it lands |
| --- | --- |
| AI personality is its own axis | The AI Personality setting (section 5) |
| The AI plays best when personality matches the bonuses | Follows the ability is the default |
| A named, repeatable roll is worth having | The Seed setting, in the lobby and on the loading screen |
| Players reroll for the strongest combo | Balanced deal in the split modes, from piece values |
| Pieces tied to one civ break when moved | The 47 civ-specific modifiers get checked; ones that can't move stay whole |
| Script-based abilities get lost | Probe 1 checks for Civ VII ability logic in script |
| Load order matters | The shuffle runs late in the load order |
| The pool can run short | The deal is a permutation of the pool, so each leader always gets back as many pieces as it gave |
| Turning biases off feels the same as random ones | Full random rolls biases as strong as vanilla ones; Start biases: None is its own choice |
| Mystery is fun | Reveal: As you meet them |
| The setup screen has no bias data until a game loads (Drongo, before his fix) | A setup-side copy of the bias rows; the cause and our copy both watched in probe 10 |
| A shipped copy can't see other mods' changes (Drongo, Baijen's biases) | The loading screen reads the game's own result and says when another mod changed the deal |
| A DLC dependency blocked multiplayer saves (Drongo, Ada Lovelace) | No DLC dependency in the modinfo; DLC rows are selected through their parent tables |

## 5. AI personality

A Civ VII leader's personality is spread over four things: the agendas inside the ability trait, the AI lists tied to the
ability and attributes, the attribute victory strategies, and `LeaderCivPriorities`.

| Setting | What moves |
| --- | --- |
| Stays with the leader | Agendas and `LeaderCivPriorities` stay; the AI lists follow the bonuses so the AI can play them |
| Follows the ability | Agendas, AI lists and `LeaderCivPriorities` move with the ability (whole modes) or with the largest donor's pieces (split modes) |
| Shuffled | Whole personalities (agendas + civ priorities) are dealt to random leaders, apart from the abilities, as Civ IV does |

With Leader abilities on None, agendas and `LeaderCivPriorities` follow this setting the same way, with no bonus lists
left to follow.

## 6. Rolling a start bias from scratch

Full random and Split full random draw from the shape of the vanilla rows instead of inventing values:

- Pick a bias kind with the odds the vanilla rows give (biomes and terrain are common, lakes and islands rare).
- Pick a target (a biome, terrain or feature class) from the ones that kind uses, and a score from that kind's vanilla
  range (biomes 10 to 20, coasts up to 200).
- One or two biases per leader, as in vanilla. Civs are rolled the same way, with the same share of civs having a bias
  as in vanilla. The islands bias keeps its vanilla score, since anything less doesn't place a player on an island.

In Split random, a leader's bias comes from the bias tags on the pieces it holds, with scores scaled to the vanilla
range. A leader whose pieces carry no terrain tags gets no leader bias.

## 7. Probes before any mod code

Under the feature gate, each runs in a lab game and is reported before the next step. On 2026-11-06 each probe was first
checked offline with Tower Bench private (`binary symbols`, `capability`, `capability corpus`, `saves show`), the
1.5.0 game files, the compiled databases, `engine-closed.md`, our mods' watched runs and the corpus dossiers. What that
settled, and what still needs a running game:

| Probe | Offline result | Lab game 2026-11-06 |
| --- | --- | --- |
| 1. Copied bullet works | Partly settled | Watched: works, and its text shows |
| 2. Moved bias places the start | Code path settled | Not run; folded into the first build game |
| 3. Moved attributes change diplomatic actions | Settled by vanilla data | Not run; folded into the first build game |
| 4. Same result after a load and an age transition | Settled by watched runs | Not needed; an offline test covers our SQL |
| 5. Setup can set the seed | Settled for single player | Not run; the multiplayer half is probe 9 |
| 6. What the leader screens show with a moved ability | Settled by the code | Not needed |
| 7. Keeping the human's leader | Narrowed to two candidates | Watched: the per-leader string key works |
| 8. Writing the leader screens' data | Narrowed to one route | Watched: runtime writes from the setup screen and the game |
| 9. Two-machine multiplayer | Not reachable offline | Still owed |
| 10. Drongo's fix and a setup-side table | Inference strengthened | Watched: cause confirmed, our table reads back |
| 11. Naming the bonus lines in City Details | Lever found in the model | Watched: the line shows by name |
| 12. What the setup screen can learn about another mod | Not needed | Watched: modinfo and scripts read live |
| 14. Lists start closed | Lever found (header toggle) | Watched by page state: our section closed, others open; lists in one section run together |
| 15. Leader pools and the launch hook | Lever found (setPlayerParameterValue) | Watched: pool slots got pool leaders on `startCampaign`, game started |
| 16. A window of the mod's own at setup | Pattern in Emigration (Options), Supercolors (rows in the panel) | Watched: button in Advanced Settings opens our window; a hidden option set there gates data. Multiplayer half owed |
| 13. The leader accordions | Native array parameter found | Watched by script: registered as accordions, modded one hidden until ticked, per-leader rules right; the on-screen draw needs a person |

The lab results for probes 1, 7, 8 and 10 are in [devtools/probes/RESULTS-2026-11-06.md](../devtools/probes/RESULTS-2026-11-06.md), with
captures in `working_screenshots/leader-shuffle-probes-2026-11-06/`. What they change in the design:

- **Probe 1.** A moved bullet works and its assembled text draws on the leader screens. Its line in a city's yield
  breakdown carries the source leader's ability name ("Earth Shaker" for Pachacuti's bullet on Amina), from the
  modifier's `Tooltip` argument. The split modes copy each moved modifier under a new id with the receiving leader's
  ability name as its `Tooltip`; watched the same day, the breakdown then named the leader's own ability ("Warrior-Queen
  of Zazzau"). The City Details panel shows that kind of line as "Other" for every leader, vanilla included.
- **Probe 7.** `LeaderPlayable` matches each leader that's available to play, not the ones in this game, so it can't
  find the human. Both config criteria compare text: a key written as a number never matches. As chosen uses one
  string key per kept leader (`LShufKeep_<LEADER> = "1"`) and `ConfigurationValueMatches`. `ConfigurationValueContains`
  on a list key works too, but whether it compares whole entries or substrings (`LEADER_XERXES` against
  `LEADER_XERXES_ALT`) isn't settled, so it isn't used.
- **Probe 8.** The display uses the runtime route in two places. The setup screen writes the shuffled `LeaderItems` and
  `LeaderTags` rows into `config` before the game starts; that reaches the loading screen (watched: a third attribute
  icon and the moved bullets on Amina) and everything after. A game-scope script writes them again for a loaded save;
  that reaches the Civilopedia and the diplomacy panel but is too late for the loading screen, which has drawn by
  loading state 6. The main menu's `config` is vanilla again after leaving a game, so nothing leaks into the next setup.
  A loaded save's loading screen isn't watched, because its leader slide couldn't be brought up by script.
- **Probe 10.** The shell has no start-bias data on a fresh launch (no `config` table, no `GameInfo`, an empty
  `gameplay` table), and the `gameplay` table fills only after a game has loaded. That's the cause of Drongo's "no spawn
  bias". A shell-scope table of our own read back on a fresh launch, so the setup-side copy is the route.

1. **Copy one Pachacuti mountain bullet onto Amina through a new trait; watch it take effect and show in her ability
   text.** Settled offline:
   - No leader ability is coded in script. Across the base and DLC scripts, leader names appear only for leader music
     (`core/ui-next/reference/audio/audio.js`), the profile page's default and the multiplayer staging placeholders.
   - The binary holds each leader's name only next to an achievement ID (`LEADER_PACHACUTI`, `INV_ACHIEVEMENT_018`), and
     no ability trait name (`capability TRAIT_LEADER_PACHACUTI_ABILITY`: not a string in the binary).
   - One modifier on two traits works in vanilla: 21 modifiers are attached to more than one trait (`TraitModifiers` is
     keyed on modifier and trait), Ibn Battuta's ability among them.

   Still needs the game: the copied bullet taking effect for Amina, and its assembled text on screen. If either fails,
   modes 3 and 4 stop here.
2. **Move Pachacuti's ability and bias onto Amina and watch her start beside mountains; move England's island bias to
   another Modern civ.** The code path is settled. `assign-starting-plots.js` matches each bias row against the
   player's `leaderType` and `civilizationType` when the map is made (`HasStartBiasForPlayer`, `adjustScoreByStartBias`),
   so a moved row counts for whoever holds it. That holds for every shipped map script except the Earth maps, which place
   starts by their own routine (`assignStartPositionsEarthHuge`) and don't read start biases. The islands bias is three
   things: a region weight (score × island tiles in the region), a per-tile score, and a minimum landmass of 4 tiles
   (`g_MinLandmassSizeForIslandBias`). Seeing the starts is the vanilla mechanism at work, so it goes on the watch list
   for the first lab game of the build instead of a run of its own.
3. **Move the attribute traits and watch Amina's diplomatic actions change; give all twelve unlocks through one trait.**
   Settled by vanilla data. Ibn Battuta's ability trait carries the Expansionist unlock modifiers that the Expansionist
   attribute trait also carries, so the unlocks already work from a trait that isn't an attribute. Seeing the list
   change goes on the watch list for the first build game.
4. **Same shuffle after a load and an age transition.** Settled by watched runs:
   - Loading a save rebuilds the gameplay database (`engine-closed.md`, watched 2026-09-30).
   - The age transition reloads it (`engine-closed.md`, watched 2026-07-03 and later).
   - A save holds the game's setup configuration as plain text (`saves show AutoSave_00_0009`: 0.4 MB), so the seed
     travels with it.
   - Strategic Resources gates data on setup values with `ConfigurationValueMatches`. A save loaded from the main menu
     came back with its setup values and its 232 gated modifiers (`sr-reload`), and each age transition loaded that age's
     gated groups (`sr-age1`, `sr-age2`; `tower_mods/strategic_resources_that_matter/docs/verification-runs.md`,
     phase 10).

   What's left is our own SQL giving the same deal twice from one seed. That's an offline test: run the shuffle twice
   against `Debug/gameplay-copy.sqlite` and diff the results.
5. **Setup can set the seed and it reaches the game.** Settled for single player. Strategic Resources sets its setup
   values with `GameSetup.setGameParameterValue` before the start and watched them gate the data. The value has to match
   the parameter's type: a string passed to an integer domain is silently ignored (`engine-closed.md`, YnAMP). Setting
   it as the setup screen opens uses the same call. Whether the host's value reaches the other players goes to probe 9.
6. **What the leader screens show with a moved ability.** Settled by the code. The leader-select screen, loading
   screen, diplomacy leader panel and Civilopedia all read `LeaderItems` and `LeaderTags` from the `config` database by
   leader type (section 2), so with only the gameplay traits moved they'd show the vanilla ability and attributes. No
   capture needed.
7. **Keeping the human's leader.** Narrowed. The binary has 18 load criteria (`binary symbols Criterion`). Two of them
   are candidates the base game and the 1,397-mod corpus never use: `LeaderPlayableCriterion` and
   `ConfigurationValueContainsCriterion` (`capability LeaderPlayable`: CANDIDATE, no run has watched it). Still needs
   the game:
   - what `LeaderPlayable` matches (a leader someone picked for this game, or a leader that's simply available)
   - whether `ConfigurationValueContains` matches one entry of a list-valued key, which would take one group instead of
     one per leader
   - the per-leader key route as the fallback
8. **Writing the leader screens' data.** Narrowed to one route:
   - The modinfo data route looks closed. All 209 corpus mods that write `LeaderItems` write it into the frontend
     database at setup, and none in a game-scope action.
   - The runtime route is open. `Database.query` writes to the `config` database's own tables from a UI script
     (`CREATE TABLE`, `INSERT`; `engine-closed.md`, watched 2026-10-26).
   - Still needs the game: whether an `UPDATE` of `LeaderItems` from a game-scope UI script lands before the loading
     screen reads it, whether the Civilopedia and diplomacy panel then show it, and whether the change carries into the
     main menu after leaving the game (the main menu gets a fresh `config` connection, but whether its tables reload
     isn't recorded). If the update lands too late or carries over, the UI route (wrapping each screen's model) is the
     way.
9. **Two-machine LAN game** (Tower Bench `lan`): the host sets a seed and As chosen; both machines get the same deal,
   the same leader screens and the same starts, and the joining machine sees the lobby settings. Nothing offline reaches
   it.
10. **Drongo's fix and a setup-side table of our own.** Inference strengthened: his dossier shows shell scripts that set
    `globalThis.GameInfo` and `globalThis.Players` themselves, which fits an early version that read game data the setup
    screen doesn't have. The bench's corpus index holds file paths and lines, not contents (his screen script is
    `ui-next/screens/create-game/leader-select-syncretism-revealer.js`), so reading the source still needs tp-share or a
    steamcmd download by the owner. Writing a new setup-side table from a shell-scope action is what his fixed version
    ships. Still needs the game: our table reading back on a fresh launch, before any game is loaded.

11. **Naming the bonus lines in City Details.** Wrap `model-city-details.js` in a lab game so the moved bullet's
    percentage step shows by name under Production, capture the panel with Amina holding it, and check Cultural
    Diffusion's and Partisans' sections still draw beside it.

13. **The leader accordions.** Add an array `Select` parameter with `UxHint = 'InvertSelection'` and a leader domain;
    capture it drawn as an accordion on the advanced setup screen; switch two leaders off (`LEADER_XERXES` among them,
    with `LEADER_XERXES_ALT` left on), start the game, and check which per-leader groups applied, with and without the
    `|...|` delimiters; check a `ParameterDependencies` row hides the modded accordion until its check box is on.

14. **Lists start closed.** A shell script activates each of our list headers once when the advanced screen draws it;
    capture the screen with every list closed, then opened by hand, with Victories and Crises still opening as before.
15. **Leader pools.** Add "Random from pool 1" to an AI slot's leader choice, fill pool 1 with three leaders, start the
    game twice with different deal numbers, and check each time that the slot got a pool leader and the game started;
    find the hook that runs before the game starts for the create-game screen's own Start button.

16. **A window of the mod's own.** Set a `Hidden = 1` setup parameter from a script and check it gates a data group in
    the game; add a "Re-dealable Leaders..." button to the Advanced Settings popup and open a pushed window over the
    create-game screen; in a two-machine lobby (with probe 9) check only the host can change it.

Probes 1, 7, 8 and 10 were watched in a lab game on 2026-11-06 (results above). Still owed:


- **Probe 13's on-screen look**: a person opening New Game, then Advanced Settings, with the probe mod on.
- **The two-machine run** for probe 9.
- **The first lab game of the build** shows probes 2 and 3 on screen (a moved bias placing a start, moved attributes
  changing the diplomatic actions list), a loaded save's loading screen, and a moved legend node showing as available
  in the receiving leader's attribute tree. The breakdown label on a copied modifier was watched the same day.

## 8. Before release

- Test against a database with the DLC rows removed: zero `PRAGMA foreign_key_check` rows, and a game starts.
- Test against tables another mod has changed (a leader added, a bias row removed).
- Two-machine multiplayer, once more on the release build: same deal from one seed, As chosen keeps both humans'
  leaders, and loading a multiplayer save gives the same result.

## 9. Owner decisions

Settled 2026-11-06:

1. Attributes in the split modes are dealt as pieces themselves.
2. Civ biases, England's islands included, are in the mix.
3. A setup option keeps each human's leader as chosen.
4. No start biases is its own choice, and so is no leader bonuses, for a game on equal footing.
5. The mod works in multiplayer through the game's own lobby.
6. The shuffled abilities, attributes and start biases show on the game's own leader screens, the way the normal ones
   do. Start biases get a line of their own, since the game doesn't show them today.
7. With attributes off, each leader gets all twelve diplomatic actions the attributes unlock.
8. Start biases, abilities and attributes each have their own None switch in setup.
9. The mod's name is "Re-dealable Leader Abilities, Attributes, and Start Biases".
10. A bonus line City Details would call "Other" is shown by name under its yield.
11. Legend nodes in the attribute trees follow the setup options (section 3).
12. Earning attributes in play is parked for later (FUTURE.md).
13. Drongo's start-bias panel is hidden in shuffle modes.
14. Modded leaders play as shipped unless the player has the mod installed and on, ticks Include modded leaders (off by
    default), and the leader is listed and passes the live setup check; the list starts with 25 mods built
    like the base game's leaders; the Workshop description tells modders the requirements; multiplayer through the
    host's checks.

15. An accordion at setup picks which leaders go into the deal, for base game and DLC leaders and for the listed
    modded leaders the player has installed (shown when Include modded leaders is on and two or more are installed).
16. The mod's options sit under one "Re-dealable Leaders" heading with the plain names in section 3; lists start closed;
    Civilization VI-style leader pools pick who's in the game, with re-dealing inside that set; modded leaders get three
    separate check boxes (abilities, attributes, start biases).