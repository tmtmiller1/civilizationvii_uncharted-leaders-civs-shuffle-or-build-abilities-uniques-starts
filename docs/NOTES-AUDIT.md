# Notes where things come together (audit, 2026-11-12, for 1.0.1)

Owner's rule: a clarification note every time several items are taken together, or one choice sets or needs another.
This lists every such case in the mod, where the player meets it, and the note before and after. Wording is in
`text/en_us/lshuf-text.xml`; tests are in `tests/bundle-notes.mjs` and the files named.

## Build screens (cards, slots, the needs box)

| Case | Where the player meets it | Note before | Note now | File |
| --- | --- | --- | --- | --- |
| A quarter's two civics (riders) | civic card; the rider's slot | "With: Ekklesia" on the card; slot "Comes with Agoge. Click to remove both." | unchanged | `lshuf-build-civics.js`, `lshuf-build-parts.js` |
| An improvement only one unit builds (Sherpa and Highland Power Station) | unique card; rider slot | "With: …" and the rider slot | unchanged | `lshuf-build-civics.js` |
| Sengoku's Samurai with Kinsei | Kinsei civic card | the unit is listed among the civic's unlocks | unchanged | `lshuf-build-civics.js` |
| A bonus the game ties to a civic or unique (Carthage's second Colonist, the Pirate Republic's bonuses) | bonus card | kind line "Goes with Colonist", tip "This comes with … Click to take …" | unchanged | `lshuf-build-cards.js` markGoesWith |
| The unique those bonuses go with (Colonist, Buccaneer) | unique card | none | "Brings Pirate Republic 2 and Pirate Republic 3 with it." | `lshuf-build-notes.js` |
| A bonus that needs another bonus (Pirate Republic 3 needs 2) | bonus card; needs box once taken | only the needs box after taking it | also on the card: "Pirate Republic 3 goes with Pirate Republic 2." | `lshuf-build-notes.js`, `lshuf-build-window.js` |
| A bonus that names a unique the builder lacks (Carthage's Colonist) | needs box once taken | "… goes with the Colonist." with Take the Colonist too | unchanged | `lshuf-build-needs.js` |
| Bonuses merged because they only work together (Yi Sun-sin 1, 3 and 4; civ bonuses with BulletCount > 1) | bonus card | the bonuses' text only | "Bonuses 1, 3 and 4 come as one card because they only work together." | `lshuf-build-notes.js` |
| A whole leader ability, a whole civilization ability | whole card | kind line "Leader ability" | "Every bonus of this ability comes together on one card." | `lshuf-build-notes.js` |
| A whole civics tree | civics tree card | the tree's civics listed | "Every civic of this tree comes together on one card, with what they unlock." | `lshuf-build-notes.js` |
| A great person a quarter or improvement brings (Logios, Tjaty, Alim, Conquistador, Saga Hero, Jacobin, Revolucionario) | the civic that unlocks the quarter, and the tree card | none on 1.5.1 (the setup data read the old great-person class) | "Comes with the Logios great person: whoever holds this receives them." plus the game's own condition text; the unit is listed among the civic's unlocks again | `build-civ-items.mjs` (LShufSetup_CivGreatPeople), `lshuf-build-notes.js` |
| A great person no quarter brings (Shi Dafu, Shijin, Uparat) | civilization ability card | none | the same note, on the ability card | same |
| A card that takes more than one slot | the grid when slots are short | "Takes 2 slots, one for each part that comes with it." | unchanged | `lshuf-build-parts.js` |
| Leader cards while you follow AI players on Play as normal | build page | "Leader mode is No shuffle, so these picks won't be used." / the first card turns it on | "Your leader is Same as the AI players, and they play as normal. Take a card and Your leader turns to Play as normal, with your cards on top." (CONTRACTS 34) | `lshuf-build-window.js` |
| Every age | the toggle | tip "Also show abilities and start terrain from other ages." | unchanged (a filter, nothing comes together) | `lshuf-build-parts.js` |

## Settings (Advanced Settings and the build pages)

| Case | Where | Note before | Note now |
| --- | --- | --- | --- |
| AI players' leaders sets the part rows | row tooltip and line | "Picking one sets the Leader rows below." | "Picking one sets the rows under Advanced settings..., and the two New personalities modes also set AI agendas to Swap whole." plus the line under the row (CONTRACTS 34) |
| New personalities / New personalities and attributes also set AI agendas | value tooltip | what stays and what's shuffled | "Picking it sets AI agendas to Swap whole." |
| Civilization mode sets the three Civilization rows | row tooltip | "Picking one sets the Civilization rows below." | unchanged |
| Your leader / Your civilization off Same means you're shuffled on your own | row description and line | "Picking one stops you following the AI players' settings." | "the same way as the AI players, or a way of your own", and the line under each row (CONTRACTS 34) |
| Follow the AI players' settings | checkbox tooltip | says the AI players keep the settings below | the box is gone (CONTRACTS 34): Your leader and Your civilization decide it |
| Attributes on Follows ability with abilities on Base game | value tooltip | "Attributes go with the ability." | "… With leader abilities on Base game, they're split up at random instead." |
| Start terrain on Follows ability or Logical with bonuses with abilities on Base game | value tooltips | what each does | "… With leader abilities on Base game, it's a random roll instead." |
| AI agendas on Logical with bonuses with abilities on Base game | value tooltip | "Each AI plays like the leader its bonuses came from." | "… With leader abilities on Base game, each AI keeps its own agendas." |
| Civilization uniques / civics on Follows ability | value tooltips | "… go with the ability." | "… Unless civilization abilities are on Swap whole, each civilization keeps its own." |
| Civilization abilities carry attribute tags and some great people | row tooltip | "with its attribute tags" | "with its attribute tags and any great person it grants that no quarter brings" |
| Civilization civics carry traditions, buildings, quarters and great people | row tooltip | traditions, buildings and quarters | "… and the great people a quarter brings" |
| Human players keep their own leader / Keep my built civilization | rows | as shipped | gone from the screen (CONTRACTS 34): Your leader on Play as normal does the first, and cards you build always count |

## In the game

| Case | Where | Note before | Note now |
| --- | --- | --- | --- |
| A merged bonus another leader received | Who got what, diplomacy leader panel | the bonuses' text with "from Yi Sun-sin" | adds "Bonuses 1, 3 and 4 from Yi Sun-sin came together because they only work together." |
| A unique that brought bonuses with it | civilization select and loading screen (the unit's text) | the bonus text appended to the unit's description | "It brings this bonus with it:" before the bonus text |
| A whole ability dealt | Who got what | "Ability from Augustus" | unchanged (one line already says it's the whole ability) |
| Civics that came together, great people with their quarter | civilization select | the civics card lists what the tree unlocks, great people included | unchanged |

Totals: 31 cases. 14 already had a note and keep it (one pair left alone at the owner's ask), 17 get a new or
extended note: 7 on the build screens, 8 in the settings, 2 in the game.
Not yet seen in a game: every note here comes from text and card data covered by the tests; the build-screen notes,
the settings tooltips, the Who got what line and the civilization select line want one menu capture and one game.
