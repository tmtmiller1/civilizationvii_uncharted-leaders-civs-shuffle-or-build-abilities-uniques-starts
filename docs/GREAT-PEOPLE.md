# Great people (game 1.5.1)

Update 1.5.1 took each civilization's great person out of the production queue. A civilization now receives one
automatically when it meets a condition, and the condition differs per civilization: some are tied to a unique quarter
or improvement and some aren't. This page charts all ten, says where each goes when the mod deals things out, and
records what has been watched in a game.

## How the game does it

- The unit has `CanTrain` 0, so nobody can build or buy it.
- One or two modifiers on the civilization's ability grant it (`EFFECT_CITY_GRANT_UNIT`; the Alim's goes through a
  modifier the ability attaches to each city). The condition is the modifier's requirement set.
- The unit keeps its own trait (`Units.TraitType`, the civilization's base trait). The game gives the unit only to a
  player who holds that trait as well as the grant. Watched 2026-11-11: with Iceland's ability on Sengoku and the Saga
  Hero's trait still on Iceland, nobody received a Saga Hero.
- `GreatPersonClasses` no longer names a quarter or constructible (`UniqueQuarterType` and `ConstructibleType` are
  empty), so the tie to a quarter is only in the grant's requirements.

## The chart

"Travels with" is what a player has to hold to receive the great person in a game with this mod.

| Great person | Civilization, age | You receive one when (the game's wording) | Grant modifiers | Tied to | Travels with |
| ------------ | ----------------- | ----------------------------------------- | --------------- | ------- | ------------ |
| Logios | Greece, Antiquity | you complete the Acropolis, or become Suzerain of a City-State | `TRAIT_MOD_GRANT_LOGIOS_QUARTER`, `TRAIT_MOD_GRANT_LOGIOS_SUZERAIN` | Acropolis quarter | the Acropolis (Agoge and Ekklesia civics) |
| Tjaty | Egypt, Antiquity | you complete a Wonder in a City with a Necropolis, or a Necropolis in a City with a Wonder | `TRAIT_MOD_GRANT_TJAY` | Necropolis quarter | the Necropolis (Scales of Anubis and Arrival of Hapi civics) |
| Shi Dafu | Han, Antiquity | you complete a Science Building | `TRAIT_MOD_GRANT_SHI_DAFU_SCIENCE` | no district | Han's ability |
| Shijin | Heian, Antiquity | you build a Building or Wonder with a Great Work slot in a City, or complete a Happiness Building in a City | `TRAIT_MOD_GRANT_SHIJIN`, `TRAIT_MOD_GRANT_SHIJIN_HAPPINESS` | no district | Heian's ability |
| Alim | Abbasid, Exploration | you place a Specialist on an Ulema | `TRAIT_MOD_GRANT_ALIM_QUARTER` (attaches `ATTACH_TRAIT_MOD_GRANT_ALIM_QUARTER`) | Ulema quarter | the Ulema (Mawla and Round City civics) |
| Conquistador | Spain, Exploration | you complete a Plaza, or gain a Settlement in Distant Lands | `TRAIT_MOD_GRANT_CONQUISTADOR_QUARTER`, `TRAIT_MOD_GRANT_CONQUISTADOR_DISTANT_LANDS` | Plaza quarter | the Plaza (Council of the Indies civic) |
| Saga Hero | Iceland, Exploration | you discover a Natural Wonder, or first build a Thing in a Settlement | `TRAIT_MOD_GRANT_SAGA_HERO_NATURAL_WONDER`, `TRAIT_MOD_GRANT_SAGA_HERO_IMPROVEMENT` | the Thing improvement | the Thing (Landnámabók civic) |
| Jacobin | French Empire, Modern | you complete an Avenue, or enter a Celebration | `TRAIT_MOD_GRANT_JACOBIN_QUARTER`, `TRAIT_MOD_GRANT_JACOBIN_CELEBRATION` | Avenue quarter | the Avenue (Voie Triomphale and Belle Époque civics) |
| Revolucionario | Mexico, Modern | you complete a Zócalo, or enter a Celebration | `TRAIT_MOD_GRANT_REVOLUCIONARIO_QUARTER`, `TRAIT_MOD_GRANT_REVOLUCIONARIO_CELEBRATION` | Zócalo quarter | the Zócalo (Planes Políticos civic) |
| Uparat | Siam, Modern | you become Suzerain of a City-State (two at a time) | `TRAIT_MOD_GRANT_UPARAT` | no district | Siam's ability |

John Maynard Keynes (Modern) belongs to the economic legacy path, has no civilization trait, and is left alone.

Some of a great person's individuals can only be used at the quarter: five of the ten Logioi and four of the Alim
need a finished Acropolis or Ulema, two Revolucionarios need a Zócalo, one Tjaty a Necropolis and one Saga Hero a
Thing. That's the reason a great person with a quarter stays with the quarter.

## What the mod does with them

- A great person is never a card of its own. It comes with something else.
- When one of its grants names a unique quarter or improvement, the unit and both of its grants go to whoever holds
  that quarter or improvement. Whoever holds the Acropolis gets a Logios for finishing it and for each suzerainty;
  a player holding only Greece's ability gets neither.
- When none does (Shi Dafu, Shijin, Uparat), the unit and its grants go with the civilization's ability. With
  abilities Split up, they stay with the civilization's own share of the ability.
- A game the civilization options leave alone keeps the game's own rows.

The deal reads all of this from the game's tables when the game loads (`LShufWork_GpGrant` in
`scripts/generate/sql-civ.mjs`): the grant modifiers on each ability, the unit each one names and the quarter or unique
constructible its requirements name. A great person another mod adds the same way, or a grant another mod changes, is
picked up without a list of ours. `LShufBoundModifiers` still names the seven grants tied to a quarter or the Thing, for a database where
the live read finds nothing.

## Checked

Tests (`tests/deal-great-people.mjs`, on copies of the 1.5.1 databases): in all three ages and seven combinations of
the civilization options, one civilization holds each great person's unit family and each of its grants, and that
civilization holds the quarter or improvement when there is one.

Watched in lab games, 2026-11-11 (`tools/plans/night-2026-11-10/`, probes `gp-grant`, `gp-watch-*` and `gp-both`):

- Before the fix, Exploration, abilities swapped: Sengoku held Iceland's ability, had seen five natural wonders and had
  no Saga Hero after six turns. In the same game without the swap, Iceland had one by turn 3.
- A great person tied to an improvement: Spain, given Iceland's Landnámabók civic, had a Saga Hero (Njáll
  Þorgeirsson) by turn 3, and Iceland had none through turn 16.
- A great person with no district: Rome, holding Heian's ability, received a Shijin the moment it finished an Odeon (a
  Happiness building). Heian was in the same game and received none.
- A great person tied to a quarter: Rome, holding Greece's Agoge civic, received a Logios (Arete) the turn its
  Parthenon joined the Odeon and finished the Acropolis. Greece was in the same game and received none.
