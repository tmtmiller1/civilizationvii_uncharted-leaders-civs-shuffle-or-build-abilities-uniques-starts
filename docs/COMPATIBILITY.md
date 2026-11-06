# Re-dealable Leader Abilities, Attributes, and Start Biases: compatibility

Status: read-only audit, 2026-11-06, against the [SPEC](SPEC.md) and the probe results of the same day. This audit
wasn't watched in a game. The findings come from reading the other mods' files (tp-share corpus, the Workshop folder, our
own sources), the change catalog (`other_peoples_mods_analysis/_change-catalog.sqlite`, 1,397 mods), the dossiers, and
the compiled `Debug/gameplay-copy.sqlite` and `frontend-copy.sqlite` from this morning's lab run. Items that need a
running game say "needs a lab check" and name the cheapest test.

Severity scale: **breaks a game start**, **wrong result** (the player sees or plays something other than what the mod
promises), **cosmetic**, **none**.

## What needs a design change

None of the mods read here would stop a game from starting with ours on. The changes below keep our mod from undoing
theirs, or theirs from quietly undoing ours.

1. **Move only the ability and attribute rows, never a leader's whole `LeaderTraits` set.** Cultural Diffusion gives each
   major leader `TRAIT_CD_FLIP_<LEADER>` and Partisans gives `TRAIT_PARTISANS_<LEADER>`. Both are per-leader machinery:
   the trait's modifier hands a flipping city, or spawns rebels, for that leader's player. If the shuffle rewrote "leader
   X now has leader Y's traits", a culture flip meant for Amina would go to whoever got Amina's rows. The base game has
   more rows of this kind: `TRAIT_LEADER_MAJOR_CIV` (the AI lists of Strategic Resources, Canals and Player Only Cheat
   Projects hang off it), `TRAIT_LEADER_MINOR_CIV`, `TRAIT_LEADER_AGGRESSIVE` (6 leaders), Yi Sun-sin's
   `TRAIT_UNLOCK_FLEET_COMMANDER`, and 114 `TRAIT_AQ|EX|MO_*_VICTORY` rows. A pattern like `TRAIT_LEADER_%` catches
   several of these. Severity if missed: wrong result.
2. **Find the ability by data, not by its name.** 17 of the 302 leaders that corpus mods add have an ability trait that
   doesn't match `TRAIT_LEADER_<X>_ABILITY` (`TRAIT_HFSX_HAOTIAN_ABILITY`, `TRAIT_LEADER_TITO`, `TRAIT_BIG_D_ABILITY`).
   Two rules hold for the vanilla 38 and for the modded leaders sampled: in `config`, the leader's `LeaderItems` row with
   `Kind = 'KIND_TRAIT'` names the ability trait; in `gameplay`, the ability is the leader's trait whose `Traits.Name` is
   set (attribute, victory and mechanism traits all have a null `Name`). Use those. Severity if missed: the leader's
   ability stays put while its attributes move, or it's dealt twice.
3. **Another mod's change to a vanilla ability wins.** The mapping table is a snapshot of vanilla bullets and modifier
   ids. All-Traits Confucius (529 subscribers) copies every ability's modifiers onto Confucius; Confucius Enhanced,
   EpsMod and Ibn Battuta Wildcard Rework add or delete modifiers on vanilla ability traits and rewrite their
   `LeaderItems`. In the split modes, any `TraitModifiers` row on an ability trait that the mapping table doesn't list
   has to travel as a remainder piece with that ability's largest receiver, or the whole ability has to be dealt as one
   piece. Bullet text should come from the live description key at runtime, so a mod's rewritten text is the text that
   gets split. Severity if missed: wrong result (bonuses dropped or text that doesn't match the bonuses).
4. **Our setup-side bias table needs its own name, and Drongo's bias display needs a decision.** Drongo's Syncretism
   Revealer creates `StartBiasBiomes` and the other eight tables in `config` and fills them with vanilla rows. A
   `CREATE TABLE IF NOT EXISTS` of ours with the same names would share his schema and his rows. Keep ours as `LShuf*`
   (the probe's `LShufSetupBias` is fine). His panel and ours would sit at the same spot on the leader-select details
   panel and show different biases in any shuffle mode. Owner decision; options are in the Drongo section.
5. **Name the seed parameter with "seed" in its id.** Drongo's Random Improvements (2,772 subscribers) remembers the
   setup parameters and puts them back every half second until it matches, for up to a minute, except parameters whose id
   contains "seed". An id like `LShufSeed` gets a fresh number each setup as the spec wants; an id without it would come
   back as the last game's seed.
6. **Write the As chosen keys from the final pick, at start.** The same sticky-setup script restores `PlayerLeader` by
   calling the `GameSetup.setPlayerParameterValue` it captured when it loaded. A wrapper of ours on that setter can miss
   the restored pick. Read each human slot's `PlayerLeader` once, just before `startGame`, and write the
   `LShufKeep_<LEADER>` keys then.
7. **The attribute deal has to finish for odd leaders.** Modded leaders hold 0, 1, 2, 3, 4 or 6 attributes (Han Li,
   Silver Wolf and Xilian hold all six). With "can't hold the same kind twice" and "skip and draw again", a leader that
   needs six different kinds near the end of the deck can loop forever, which is the Civ V randomizer's hang. The deal
   needs a bound (a matching pass, or a fixed number of redraws and then a swap with an earlier leader).
8. **Leave observer leaders out of the deal.** Zatygold's Observer Mode and Multiplayer Toolkit add `LEADER_ZOM_OBSERVER`
   and `LEADER_MPT_OBSERVER` for a human who only watches. Their trait carries no modifiers and they hold no attributes.
   In the deal, an AI would get the observer's empty ability and the observer would get a real one. A leader whose
   ability trait has no `TraitModifiers` rows and who holds no attributes can stay out of the pool.
9. **Modded leaders with script parts: an owner choice.** 65 of the 204 leader mods listen to game events from UI
   scripts, and some key that logic to their own leader type (Sparkle's government-tradition filter checks
   `LEADER_SPARKLE`). When such an ability moves, its data half goes to the new holder and its script half stays with
   the old leader. A setup option "Modded leaders: In the deal / As shipped" would let the player avoid it. Severity:
   wrong result for those leaders only.
10. **Our own per-leader tuning follows the name, not the ability.** Emigration's `BY_LEADER` table and Cultural
    Diffusion's (Xerxes only) nudge a leader for an ability it may no longer hold. They should key on the ability trait
    the leader holds in `GameInfo.LeaderTraits` (whole modes) and fall back to neutral in the split modes. Severity:
    wrong result, small (the nudges are bounded).

Spec corrections found on the way, for section 2 and 5:

- `CD_VICTORY_STRATEGY_*` is the base game's (`base-standard/data/AI_Victories.xml`), not Cultural Diffusion's. Our CD
  mod has no `StrategyConditions` rows. The shuffle still carries those strategies with the attributes, since they use
  `HasLeaderTrait`. `TRIUMPH_STRATEGY_ALLAGES_ESPIONAGE` also keys on `TRAIT_LEADER_ATTRIBUTE_POLITICAL`. With
  Leader attributes: None, these conditions match nobody and the AI picks its victory plan from government and victory
  points alone.
- The personality in section 5 also lives in the `TRAIT_AQ|EX|MO_*_VICTORY` rows (3 per leader) and
  `TRAIT_LEADER_AGGRESSIVE`. Yi Sun-sin's `TRAIT_UNLOCK_FLEET_COMMANDER` is part of his ability and isn't in the
  mapping yet.
- `StartBiasResources` is empty only in the Antiquity database. The Exploration and Modern civilization files add 9 rows
  (Abbasid camels, Mongolia horses, and so on), and Drongo's copy carries them.
- The registry still has the probe mod `lshuf-probe-cd` switched on, so it loads into each game started on this Mac,
  and the compiled DB from this morning carries its `TRAIT_LSHUF_LABEL_AMINA` row.

## 1. Drongo's mods

Drongo has 16 Workshop mods in the corpus. Two touch what ours touches; the rest were read and don't.

### Syncretism Revealer (3735281916, 7,708 subscribers)

What it does, read in its 1.3 source:

- A shell action at load order 10000 runs `data/start-bias-config.sql`: `CREATE TABLE IF NOT EXISTS` for the nine
  `StartBias*` tables in `config`, filled with vanilla and DLC rows generated by `tools/generate-start-bias-config.mjs`.
- `leader-select-syncretism-revealer.js` watches the whole document with a `MutationObserver`. For the leader the local
  player has picked (`PlayerLeader`), it collects bias rows from `GameInfo`, then `config`, then `gameplay`, dedupes
  them, caches them per leader for the rest of the session, and inserts `#drongos-leader-bias-panel` right after the visible
  ability text (`.leader-select-leader-details .create-game-markup.mb-2`). On civ select it adds
  `.drongos-civilization-spawn-bias-overlay` badges with each civ's biases.
- When the player opens its civic tree preview, it assigns `globalThis.GameInfo`, `globalThis.Players` and
  `globalThis.GameContext` in the shell.
- It has a hard-coded fallback for Amina (Plains 20, Desert 20) when no rows are found.

With ours on:

| What happens | Severity | Design response |
| --- | --- | --- |
| In any shuffle mode his panel shows the vanilla biases from his copy, and ours shows the shuffled ones, one under the other on the same leader. Civ cards show vanilla civ biases. | Wrong result (setup screen) | Owner decision. Option A: in shuffle modes our script hides `#drongos-leader-bias-panel` and the civ-card overlays with a style rule, and puts them back in Normal. Option B: leave his panel and label ours "This game". In Normal mode, skip our own line when his panel is there, so the leader doesn't show two lists that agree. |
| After a game, the shell's `gameplay` database holds that game's bias rows (probe 10). With ours, those are the last game's shuffled rows. He merges them with his vanilla copy, so his list becomes a mix of vanilla and the previous roll. | Wrong result (setup screen) | Our own setup script reads only our `LShuf*` table, never the shell's `gameplay` tables. Needs a lab check: after leaving a shuffled game, `Database.query("gameplay", "select * from StartBiasBiomes where LeaderType='LEADER_AMINA'")` in the shell. |
| Writing shuffled rows into his `config` tables wouldn't reach his display: he caches each leader's list for the session once it has rows. | None, if we don't try it | Don't write into his tables. |
| His shell `GameInfo` stand-in exists only after the civic tree preview is opened. | None, if we avoid the trap | Our shell code shouldn't use `typeof GameInfo` to tell shell from game. |
| Both mods observe DOM changes in the details panel. His update leaves the DOM alone when the leader and signature haven't changed, so the two don't feed each other. | None (read in code) | Our observer ignores mutations inside elements whose id starts with `drongos-`. |
| Biography hiding walks the ability element's previous siblings. Our line goes after the ability, so it doesn't shift his targets. | None | Keep our line after the ability element, or inside our own written description text. |

Appending the start bias line as a paragraph of the `LeaderItems` description we already write at runtime avoids most
of this. The line then shows on the screens that read `LeaderItems`, including the forked screens in section 3, and our
script doesn't have to place anything in the page. His panel would sit under our text, which is the Option B layout.

### Random Improvements (3735303648, 2,772 subscribers)

What it does: `ui/sticky-setup.js` (shell, load order 100000) saves the game and player setup parameters to its own
settings and restores them when setup opens, every 500 ms for up to 120 tries, through the `GameSetup` setters it
wrapped at load. Parameters whose id contains "seed" (case-insensitive) are skipped both ways.

With ours on:

| What happens | Severity | Design response |
| --- | --- | --- |
| Our mode, switches and Reveal setting come back as the player last left them. | None; likely welcome | None |
| A seed parameter without "seed" in its id would come back as the last game's number and keep being put back while setup is open, over our "new number each setup". | Wrong result (same roll every game) | Give it an id with "seed" in it, `LShufSeed`. |
| A restored `PlayerLeader` reaches the game through the setter he captured, so a wrapper of ours installed later doesn't see it. | Wrong result (As chosen keeps the wrong leader) | Read `PlayerLeader` for each human just before start (design change 6). |

Needs a lab check: open setup twice with both mods on, read `GameSetup.findGameParameter("LShufSeed")` each time, and
pick a leader with the sticky restore on, then start and read the `LShufKeep_*` keys.

### The other fourteen

Read through their modinfo, dossiers and a grep of their files for the tables and screens above. They don't touch
leader traits, start biases, `LeaderItems`/`LeaderTags`, City Details' model or the create-game screens, so they play
the same with ours on.

| Mod | Id | What it touches | With ours |
| --- | --- | --- | --- |
| City Planner | 3734169112 | Decorates `panel-sub-system-dock`, its own panel | None |
| Colour Boost | 3734195174 | Options only | None |
| Top Panel | 3734234006 | Imports `panel-yield-banner.js` | None |
| Leader Ribbons | 3734152860 | Replaces the diplo ribbon files; reads attribute point events, not attribute traits | None |
| Cheat Panel | 3734207916 | Its own `panel-cheat` | None |
| Relationship Preview | 3736711944 | Decorates `panel-other-player-diplomacy-actions` | None |
| Mod Manager | 3734141337 | Add-ons screens | None |
| Notification Filter | 3734202749 | Notification train | None |
| Wonder Screen, and its Rescaled copy | 3734274579, 3750140779 | Its own screen | None |
| Compact Production | 3734579243 | Replaces the production chooser; opens City Details as vanilla does | None |
| Adjacency Lens | 3737207667 | A lens | None |
| Policy Screen | 3737805794 | Replaces `policies-and-traditions.js` | None |
| Gameplay Improvements | 3750635683 | Founder movement and sight, warehouse yields | None |

## 2. Our usual set

The registry has 67 mods on: the Tower mods, the DLC, Resource Re-sorts, Aging Warehouses, Settlement Limit Settings,
and the probe mod `lshuf-probe-cd`. `interactions` shows none of them touching `model-city-details.js`,
`leader-select-model.js`, `load-screen-model.js`, `screen-civilopedia.js` or `panel-diplomacy-actions.js`; they only
import shared utilities those files also import.

| Mod | What it does on our ground | With ours on | Severity | Design response |
| --- | --- | --- | --- | --- |
| Cultural Diffusion | `cd-city-flip.sql` adds `TRAIT_CD_FLIP_<LEADER>` to `LeaderTraits` for each major leader (game, load order 60); its modifier hands a city to that leader's player. Decorates `panel-city-details`. `cd-civ-tuning.js` nudges Xerxes. | Fine if the shuffle moves only ability and attribute rows. A whole-row rewrite would send flips to the wrong player. The Xerxes nudge stays with Xerxes whatever he holds. | Wrong result if missed; small for the nudge | Design changes 1 and 10. Our wrap is on the model, so its panel decorator keeps working (probe 11 checks this). |
| Partisans | `partisans-muster.sql` adds `TRAIT_PARTISANS_<LEADER>` per major leader (game, load order 10000); its modifier spawns that leader's rebels. Decorates `panel-city-details`. | Same as CD: fine if only ability and attribute rows move. | Wrong result if missed | Design change 1. Our shuffle's load order has to sit above 10000 to see these rows at all, and must leave them alone. |
| Emigration | `emigration-civ-tuning.js` `BY_LEADER`: 20 leader nudges, each written against that leader's ability. `emigration-ai-host.js` reads the leader's traits from `GameInfo.LeaderTraits`, then the `YieldBiases` lists bound to them. | The AI host follows the shuffle on its own, as long as each `TRAIT_LSHUF_<LEADER>` gets its `YieldBiases` lists (spec section 3 already says the lists are rebuilt). The nudges stay with the leader's name. | Wrong result, bounded | Design change 10: key `BY_LEADER` on the ability trait held. A change in Emigration, owner's call. |
| Economics | Government biases on civ traits; AI lists keyed to its own strategies (`LeaderType` null); agenda reads from relationship events. | Civ traits don't move, and agendas are read wherever they end up. | None | Leave `AiLists` rows with a null `LeaderType` or `TRAIT_LEADER_MAJOR_CIV` alone when rebuilding lists. |
| Strategic Resources | AI lists on `TRAIT_LEADER_MAJOR_CIV`; units tagged `TRAIT_LEADER_MINOR_CIV`; Samurai legend-style unlocks with a civ `RequiredTraitType`; UI reads the local player's `LeaderTraits` live. | Reads follow the shuffle. Its `RequiredTraitType` rows name civ traits. | None, if our legend-node rewrite only touches rows whose `RequiredTraitType` is a leader ability trait | Filter the rewrite on ability traits (153 vanilla rows), never on "any `RequiredTraitType`". |
| Canals, National Parks | AI lists on `TRAIT_LEADER_MAJOR_CIV` or strategy lists | Untouched | None | As above |
| Dams | A trigger on `ModifierArguments` appends its flood classes to any inserted `RandomEventClass` argument holding `CLASS_FLOOD`. | Our copied modifiers come from rows Dams already extended, so the trigger skips them; a fresh copy would get the same classes as the original. | None (read in the trigger) | None |
| Demographics | Shows leader names and portraits; Hall of Fame records the leader type. | No ability text or attributes shown. | None | None |
| Mod Commons | Records `Controls.define`, `ComponentRegistry` and `ModelRegistry` registrations and lets the player pick a winner. | Our routes are data writes and a wrap of the City Details singleton, which it doesn't record. | None | If the display ever falls back to registering screen models, Mod Commons would list us and a player could pick vanilla. |
| Readable Tooltips, Geographic Labels, Numpad, Zoom Tilt Rotate, Build Wonders Over Antiquated Buildings, Settings Keeper, Universal Auto Explore, All Display Options | UI and map tools | Separate ground | None | None |
| Resource Re-sorts, Aging Warehouses, Settlement Limit Settings | Commerce screen, warehouse ages, settlement cap | Separate ground | None | None |
| Setup parameters | SR uses `GameOptions` 2100 to 2104 and Economics 2200 to 2209. | | None | Start ours at 2300. |

## 3. Popular Workshop mods

Top 42 by current subscribers from `_workshop-cache/details.json` (Leonardfactory's Policy Yield Previews, the top one,
isn't in the corpus and wasn't read). 35 of them stay off our ground. The rest, with the corpus mods that replace
files we read or write the tables we change:

### City Details

| Mod | Subs | What it does | With ours on | Severity |
| --- | --- | --- | --- | --- |
| City Hall (3507102289) | 64,587 | Decorates `panel-city-details`, replaces its `renderYieldsSlot` with a bug-fixed empty container, keeps its own model `g_bzCityDetails` for growth and warehouse tables. The yields breakdown is still filled by the vanilla panel from `model-city-details.js`. | Our named lines come from the vanilla model, so they reach City Hall's yields tab. | None, needs a lab check: probe 11 with City Hall on, capture the Production breakdown. |
| F1rstDan's Cool UI (3510572267) | 9,312 | Its city yields tooltip imports `CityDetails` and converts `CityDetails.yields[].children` into its own table. | Lines we add as children show in its tooltip too, if they carry `name`, `value` and `icon` like the vanilla children. | None (read in code) |

No corpus mod replaces `model-city-details.js`. `nasuellia-loyalty` (161) replaces `panel-city-details.js`; the
panel still reads the model, so our lines should show there too.

### Start positions

| Mod | Subs | What it does | With ours on | Severity |
| --- | --- | --- | --- | --- |
| More Diverse Maps (3522217155) | 10,822 | Its own `assign-starting-plots-unevenly.js` and `map-utilities.js` read all nine `GameInfo.StartBias*` tables at map time, including "does a human need a tropical start". | Follows our rows. | None |
| Scapeh's Player Limits, Natural Wonder Manager, Human Player Natural Wonder Start | 4,967 / 4,170 / 2,959 | Replace `assign-starting-plots.js` with an older copy that reads eight of the tables but not `StartBiasIslands`. | A moved or rolled islands bias does nothing on those setups. The other eight follow our rows. | Wrong result, islands only. Note it in the docs; our side can't fix it. |
| YnAMP, Massive Earth Map TSL, YAMEM, Custom Start Locations & Team Mode | 9,822 / 8,425 / 8,065 / 10,342 | True start locations or a chosen start plot. The TSL loaders' own "bias" reads `TypeTags`, not our tables. | Our biases have no effect there, as on the Earth maps. | Cosmetic: the "Starts near" line promises a start the map won't give. The loading screen can say so when the map is a known TSL map. |
| Tuned Start Bias, Adjusted Start Biases, Better Balanced Game, Multiplayer Balanced Game | 336 and fewer | Update or delete vanilla bias rows. | Their rows enter our pool, since the shuffle reads the tables at build. The leader-select prediction, built from our vanilla copy, shows the vanilla values. | Cosmetic, already in spec section 3 ("the deal changed because of another mod"). |

### Advanced options and the create-game screens

| Mod | Subs | What it does | With ours on | Severity |
| --- | --- | --- | --- | --- |
| YnAMP, More Diverse Maps, Custom Start Locations, Scrum Lord's Advanced Options Menu Tweaks | 9,822 / 10,822 / 10,342 / 518 | Replace `advanced-options.js`; Custom Start Locations also replaces `game-parameters-model.js` (254 hunks); More Diverse Maps and Enable Custom Map Type Icons replace `create-game-setup-model.js`. | Our dropdowns are ordinary `Parameters` rows, which these screens list by group. Whether each one lists them, and whether any re-applies defaults over our seed, isn't readable without running it. | Needs a lab check: open Advanced Options with each on, capture, read the seed parameter. If our options don't draw, the player can't pick a mode (the game still starts). |
| Mav's UI Overhaul (772), Monkey D. Luffy Leader (71) | | Replace `leader-select-screen.js` | They render the model, which reads `config` through a cache that clears on any database change, so our runtime writes show. A DOM-inserted line may miss their layout. | Cosmetic. The data route (bias line in the written description) avoids it. |
| Handheld UI Fixes (142), zh_chunqiu (246) | | Replace `create-game-hub.js`, `load-screen.js`, `load-screen-model.js` | Still read `LeaderItems` and `LeaderTags` from `config`. | None |
| Mattifus's Memento Editor (3508036392) | 10,081 | Loads its own copy of `create-game-hub.js` and the memento screens; its `load-screen-model.js` copy is commented out of the modinfo. | Its hub reads leader tags from the leader-select model, so it follows our writes. | None |
| Unlock All Mementos (3507405328) | 28,961 | Memento select only | | None |
| 2D Leader Framework (3699863935) | 7,843 | Portrait and diplomacy art for custom leaders; patches `Database.query` in the shell to answer one `LegacyCivilizationTraits` query from `gameplay`, and passes other SQL through. | Our `UPDATE`/`INSERT` calls pass through. | None (read in code) |

### Diplomacy panel and Civilopedia

MAO ACG Mementos (510), nasuellia-diplomacy-screens (119) and Naxt's Unique Independent Powers (104) replace
`panel-diplomacy-actions.js`; Friends and Rivals (11,637), Leugi's mods and Sib's Classic Leader Screens decorate or
restyle it. They render the ability from `LeaderItems` as vanilla does, so our runtime write reaches them. No corpus mod
replaces `screen-civilopedia.js`. Severity: none, apart from the DOM line covered above.

### Modifiers read by other UI

| Mod | Subs | What it does | With ours on | Severity |
| --- | --- | --- | --- | --- |
| Detailed Map Tacks (3507297712) | 107,635 | Caches the local player's `LeaderTraits` and `TraitModifiers`, then scans all modifiers by effect to preview yields. For adjacency unlocks it keeps one modifier id per adjacency (`adjacencyModifiers[adjacencyId] = modifierId`, last one in table order wins). | Whole modes: follows the moved traits. Split modes: a copied `EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_ADJACENCY` modifier and the original both name the adjacency, and only one is kept; if it keeps the original, the receiving leader's tack preview leaves out the moved adjacency. | Wrong result in a preview. Design: attach the original adjacency-unlock modifier to the new trait instead of copying it (one modifier on two traits is allowed; 21 vanilla modifiers do it). Adjacency lines are usually named by the adjacency itself, so the copy's `Tooltip` may not be needed there (unwatched). Needs a lab check either way: a tack preview for Amina holding Pachacuti's mountain adjacency. |
| Wonder Panel (3656705275) | 12,862 | Skips unlock rows that have a `RequiredTraitType` | | None |
| Player Only Cheat Projects (3507349297) | 13,230 | A modifier on `TRAIT_LEADER_MAJOR_CIV` | Untouched if we leave that trait alone | None |

### Other corpus mods that change leader data

| Mod | Subs | What it does | With ours on | Severity |
| --- | --- | --- | --- | --- |
| All-Traits Confucius (3635931047) | 529 | Copies every `TRAIT_LEADER_%_ABILITY` modifier onto Confucius's ability, adds an `AFTER UPDATE ON TraitModifiers` trigger that copies any later change too, and rewrites his `LeaderItems` text. | Whole modes: whoever gets Confucius's ability gets everything, as that mod intends. Split modes: most of his modifiers aren't in the mapping table. The trigger only fires on `UPDATE` to `TRAIT_LEADER_%_ABILITY`, so `INSERT`s into our `TRAIT_LSHUF_*` traits don't trip it. | Wrong result in split modes without design change 3. Use `INSERT`, not `UPDATE`, on `TraitModifiers`. |
| Confucius Enhanced (113), EpsMod (637), EpsTweak for Commanders (264), Bear's Built In Mementos (820) | | Add modifiers to vanilla ability traits and rewrite `LeaderItems` | Same as above | Design change 3 |
| Ibn Battuta Wildcard Rework (126) | | Deletes the two Expansionist unlock rows from Ibn's ability and his Expansionist tag | Spec section 2 keeps those two with his Wildcard bullet; after this mod they're gone. `Leader attributes: None` still works, since the twelve `MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_*` modifiers themselves remain. | None, if pieces are inserted only for rows that exist (spec section 3, data safety) |
| Balance of Power (54) | | Updates and deletes `LeaderTraits` rows | Its changes come first; our shuffle reads what's left | None, given the late load order |

## 4. Mods that add leaders or civilizations

204 corpus mods add 302 leaders (the MAO and FGO character leaders lead by subscribers, 1,100 to 1,900 each). What
survives our rules, read from the change catalog and a sample of their files:

| Shape | Count | With ours | Response |
| --- | --- | --- | --- |
| A `config` `LeaderItems` row for the ability | All 204 mods write one | The setup screen can read the modded leader's ability name and text and its attribute tags, so the whole-mode deal and display can include them before the game exists. | Build the leader pool from `config` `Leaders` that also have `IsMajorLeader = 1` in `gameplay`, sorted by type, so both sides deal over the same list and a modded leader doesn't change the prediction. |
| Ability trait named `TRAIT_LEADER_<X>_ABILITY` | 285 of 302 | Found by the spec's pattern | Design change 2 covers the other 17. |
| Two attributes | 288 of 302 | As vanilla | 0, 1, 3, 4 and 6 also occur; design change 7. |
| Observer leaders with an empty ability | 2 (Zatygold's Observer Mode, Multiplayer Toolkit) | An AI would get the empty ability | Design change 8 |
| Script logic keyed on the leader type | 65 mods listen to engine events; at least some key ability parts to their leader (MAO Sparkle) | The script part stays behind | Design change 9 |
| Their own `StartBias*` rows | 83 leader mods, and 120 civ mods (Tang, Zhou, Portugal, Ireland lead) | Enter the pool at build; missing from our setup-side copy | Already in spec section 3. Rows only move between leaders and civs that exist, so the foreign keys (`Leaders`, `Civilizations`, `Biomes`) stay satisfied. |
| Legend nodes on their own ability trait | Common (Frieren has seven) | Follow the ability under spec section 3, if the ability is found by data | Design change 2 |
| Bullet-list descriptions | Of 320 ability-like traits, 227 English descriptions use `[LI]`, 55 are plain prose (some mods ship German as the base text), 38 weren't found | A modded ability without `[LI]` bullets can't be split | Already in spec section 3: an unknown leader is dealt as one whole piece. Read the text through `Locale` at runtime, since the base text may not be English. |

## 5. Lab checks this audit leaves

Cheapest first. None is a release blocker by itself; 1, 2 and 4 decide design choices above.

1. Syncretism Revealer with a shuffle mode: one capture of the leader-select details panel with both bias readouts, and
   after leaving a shuffled game, one shell read of `gameplay` `StartBiasBiomes` for Amina.
2. Random Improvements: the seed parameter's value on two setup opens, and the `LShufKeep_*` keys after a sticky
   leader restore.
3. Advanced Options with YnAMP, More Diverse Maps and Custom Start Locations, one launch each: our dropdowns draw, the
   seed holds.
4. Detailed Map Tacks: the tack preview for a moved adjacency (with the original modifier attached, and with a copy).
5. City Hall: probe 11's capture with City Hall on.
6. Offline, once the SQL exists: diff `LeaderTraits` before and after the shuffle and confirm the `TRAIT_CD_FLIP_%`,
   `TRAIT_PARTISANS_%`, `TRAIT_LEADER_MAJOR_CIV`, `TRAIT_LEADER_MINOR_CIV`, `TRAIT_LEADER_AGGRESSIVE` and victory rows
   are unchanged. That needs a database build, so it waits for a free lab slot.
