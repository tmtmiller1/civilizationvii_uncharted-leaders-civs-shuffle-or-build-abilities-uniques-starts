# What needs what

Every link below was found in the game's 1.5.0 data (all three ages, base game and every DLC), by walking each
modifier's arguments and requirements and by sweeping every table for a row that names two different dealt items.
The scan scripts are `scripts/mapping/build-deps.mjs` (the shipped tables) and the sweep notes at the end. Nothing
here comes from reading card text.

A "dealt item" is anything the mod can move on its own: a leader bonus, a civilization bonus or remainder, a unique
unit family, a unique improvement card, a civic of a civilization's tree (with its traditions and what it unlocks).

## The rule

A player never ends up with a unit, building, improvement or tradition they can't build or use because the thing it
needs went to someone else. When one item needs another, they travel as one card: in Swap whole, Split up, Random
roll, the AI deals and every build screen. Taking either half on a build screen takes both. CONTRACTS section 23 has
the mechanics.

## Unbuildable without the other half

These are the cases where a player would hold something they can never make.

| Item | Needs | Why (game data) |
| ---- | ----- | --------------- |
| Logios (Greece, Antiquity great person) | Acropolis quarter (Agoge + Ekklesia civics) | `GreatPersonClasses.UniqueQuarterType = QUARTER_ACROPOLIS`; Arete's action needs a completed Acropolis |
| Tjaty (Egypt) | Necropolis (Scales of Anubis + Arrival of Hapi) | same, `QUARTER_NECROPOLIS` |
| Alim (Abbasid, Exploration) | Ulema (Mawla + Round City) | same, `QUARTER_ULEMA` |
| Conquistador (Spain) | Plaza (Council of the Indies) | same, `QUARTER_PLAZA` |
| Saga Hero (Iceland) | the Thing improvement (Landnámabók civic) | `GreatPersonClasses.ConstructibleType = IMPROVEMENT_THING` |
| Jacobin (French Empire, Modern) | Avenue (Voie Triomphale + Belle Époque) | `QUARTER_AVENUE` |
| Revolucionario (Mexico) | Zócalo (Planes Políticos) | `QUARTER_ZOCALO` |
| Highland Power Station (Nepal) | Sherpa | `Unit_BuildConstructibles`: the Sherpa is the only unit that builds it |
| Man-at-Arms (whoever researches Sengoku's Kinsei civic loses it) | Samurai (Sengoku, Exploration) | `MOD_CIV_SENGOKU_NO_MAN` disables `UNIT_MAN_AT_ARMS` for good; `KINSEI_MOD_MOD_SAMURAI_2` makes the tier 2 Samurai trainable in its place |
| Fleet Commanders in Antiquity (Yi Sun-sin's first bonus) | `TRAIT_UNLOCK_FLEET_COMMANDER` | the unit's `TraitType` is that trait, which stayed with Yi while the bonus could leave |

Today a Split or Shuffled uniques deal hands the first seven to a civilization with no way to build the quarter, and
the Sherpa and its power station can land on two different civilizations.

## A unique's own rules sit on the civilization's ability

The game writes part of some uniques' behaviour as modifiers on the civilization's ability trait rather than on the
unit or building. When the unique moves and the ability doesn't (or the other way round), the unique arrives without
the rule its own text promises, and the ability keeps a rule nobody can trigger.

| Modifier | Belongs to | What it does |
| -------- | ---------- | ------------ |
| `TRAIT_MOD_COLONIST_POP` (in Carthage's second bonus, hidden) | Colonist | +1 Population when founding next to a resource |
| `TRAIT_MOD_DRUID_PURCHASE_CHARGE` (Gaul remainder) | Druid | the Nemeton purchase charge in a settlement the Druid founds |
| `TRAIT_MOD_VIET_KIEU_BIOME_YIELD` (Đại Việt remainder) | Việt Kiều | Culture per Tropical tile when it founds a town |
| `TRAIT_MOD_SOKEMAN_WALLS` (Norman remainder) | Sokeman | free walls in a town it founds |
| `MOD_OCEAN_CONQUISTADOR` (Spain remainder) | Conquistador | crossing Ocean |
| `TRAIT_MOD_ZAMINDAR_POPULATION_BONUS` (Mughal remainder) | Zamindar | +1 Population on founding |
| `MOD_JUKOGYO_RESOURCE_CAP` (Meiji remainder) | Jukōgyō | +1 resource slot in its city |
| both modifiers of Joseon's second bonus | Seowon quarter | +1 specialist limit with a Seowon, -1 without |

These move to whichever civilization ends up holding the unique (`LShufBoundModifiers`). Joseon's second bonus is made
of nothing else, so it stops being a card of its own and goes with the Seowon.

Carthage's second bonus ("Receive a second Merchant or Colonist each time you purchase or train one") goes with the
Colonist in the random deal (owner, 2026-11-10; `LShufBoundPieces`). On the build screen it stays a card of its own,
with a button that takes the Colonist too. The game's two modifiers double any unit that founds
a town or makes a trade route, so the bonus would work for a civilization without the Colonist; it goes with the
Colonist because the two belong together for the player.

The Pirate Republic's second and third bonuses go with the Buccaneer the same way (owner, 2026-11-10). The third
("Settlers cannot be trained or purchased...") is the only dealt bonus that switches something off, and the second
("Buccaneers gain 1 charge to create a new Settlement...") is what replaces Settlers, so a civilization holding the
third alone could only settle by capturing Settlers. The second's modifier gives the charge to any unit tagged
`UNIT_CLASS_FLEET_COMMANDER` with one promotion; its text names the Buccaneer. On the build screen both stay cards:
the second offers the Buccaneer, and the third offers the second.

## Two halves of a quarter

Each unique quarter is two buildings. Where they unlock from two different civics, splitting the civics splits the
quarter, and neither holder can ever complete it:

- Antiquity: Acropolis, Ekallu, Forum, Necropolis, Dunon, Punic Port, Tofi'a, Uaybil K'uh.
- Exploration: Haven, Pura, Ulema.
- Modern: Avenue, Huiguan, Industrial Park, Seowon, Bāgh, Zaibatsu.

The other quarters unlock both buildings from one civic and can't split. The two civics of a quarter now travel
together, so a civilization can collect whole quarters from several civilizations but never half of one. Mixed
quarters built from two civilizations' lone buildings are ruled out (owner, 2026-11-09).

## A tradition that needs another civic's unique

| Tradition (civic) | Needs (civic) |
| ----------------- | ------------- |
| Niwiitikeemekonaaki (Shawnee, Miyaska Latoweki) | Mawaskawe Skote improvement (Wyehi Simekofi) |
| Ng'oma (Buganda, Olutabaalo) | Kabaka's Lake (Nnalubaale) |
| Yangbeobmiui (Joseon, Gyeongguk Daejeon) | Seowon quarter (Ihak + Seonbi) |

Each pair of civics travels together (`LShufCivLinks`).

## Works partly without the other half

These keep working without their partner, so they stay separate cards. The build screen already lists the unique
they mention under the slots with a button to take it (`ui/setup/lshuf-build-needs.js`).

- Buganda's third bonus: Culture and Food on every Lake, more of them with Kabaka's Lake.
- Yi Sun-sin's third and fourth bonuses outside Antiquity: every civilization builds Fleet Commanders from Exploration
  on. They're merged into his first bonus anyway, so the three never split.
- Silla's Sangdaedeung, Babylon's Tamkaru, Assyria's Turtanu, Khmer's Vaishya: their own civic unlocks them, and so
  does a main tree, so whoever holds the unit can still train it.

## Checked and clear

- No leader bonus names another leader's or a civilization's unique. The only leader-trait-gated unit is Yi Sun-sin's
  Fleet Commander.
- No unique unit needs a unique building in its city (`Unit_RequiredConstructibles` names only the shared Temple).
- No unique upgrades into another civilization's unique.
- No wonder or project needs a unique building.
- Bonuses of one leader that share a unit class (cavalry, naval) work on any civilization's units of that class.

## How the sweep was run

`scripts/mapping/build-deps.mjs --report` reloads each age's data through `civ-age-source.mjs`, maps every unique
type to the item that carries it (unit families, civic nodes and what they unlock, quarters by their two buildings,
unit tags only one item's units carry), then:

1. walks every civ bonus, civ remainder, leader bonus, tradition, unique building and adjacency modifier with
   `DataSource.reach` and records each value that resolves to a different item;
2. reads `Unit_RequiredConstructibles`, `Unit_BuildConstructibles`, `UnitUpgrades`, `GreatPersonClasses`,
   `GreatPersonIndividuals` and the tree unlocks;
3. sweeps every other table for a row naming two different items.

A mod that adds a quarter, a great person tied to a quarter, or a unit that alone builds an improvement is picked up
at game load, since those three rules read the game's tables. The modifier links (the two tables named above) come
from the shipped scan and cover base game and DLC only.
