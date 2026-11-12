# Changelog

Changes to Uncharted Leaders & Civs for Civilization VII. The format follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

## [0.1.0] - Unreleased

Named Uncharted Leaders & Civs (Re-dealable Leader Abilities, Attributes, and Start Biases while in development),
with the mod id `uncharted-leaders-and-civs`. The first version. Much of it has been seen in lab games; the rest is on the watch list.

### Setup options
- A Uncharted Leaders & Civs Settings section in Advanced Settings. The options save with the game and reach the other
  players through the lobby like any other setup option, and only the host changes them.
- Leader mode and Civilization mode, with the same choices: No shuffle, Swap whole, Swap partial and Mix bonuses
  (plus Mix bonuses, random start for leaders). Swap whole moves everything from one leader or civilization. Swap
  partial swaps a leader's ability and deals its attributes and start terrain separately, and swaps a civilization's
  ability, uniques and civics each whole, from different civilizations. Change a row by hand and its mode reads Custom.
- The build screens show the page's mode, with an Advanced button for the other rows.
- Leader abilities, Leader attributes and Leader start terrain, each with Base game, Swap whole, Split up, Follows
  ability, Logical with bonuses, Random roll or Off entirely, as that row allows. Split up breaks abilities into
  their bonuses and deals them out; every leader gets back as many as it gave, and bonuses that only work together
  are dealt as one. With attributes off, every leader gets all twelve diplomatic actions instead.
- A bonus from a civilization of another age works at the strength the game gives it in the age you're playing:
  Spain's coastal yields are +1 in Antiquity, +2 in Exploration and +3 in Modern. A bonus the game drops in an age
  (Spain's cheaper town conversion in Antiquity) stays out of that age's deal and build cards. A yield line from a
  dealt bonus, a leader's or a civilization's, names the ability it came from ("Siglo de Oro (Coastal)").
- Every civilization bonus can be dealt or built. A civilization's "+30% Production towards <wonder>" now moves
  and names its wonder for whoever holds it: holding Egypt's means +30% towards the Pyramids. Assyria's "Codices are
  not awarded from Technologies" goes to whoever holds it, and Assyria gets its codices back. The Inca's and
  Songhai's treasure convoys and Joseon's Seowon rule go with the civic or quarter they come from; their cards say
  so, and clicking one takes that civic.
- A civilization's attribute tags (Cultural, Economic and the rest) go with its ability: whoever is dealt Greece's
  ability is Cultural and Political, earns those attribute quests' points and, in Test of Time, gets those
  traditions. With abilities on Split up the tag sets are shuffled among the age's civilizations.
- Civilization abilities, Civilization uniques and Civilization civics do the same for civilizations, within each
  age. Civics move with their traditions and everything they unlock.
- AI agendas: an AI leader keeps its own agendas, plays by the leader its bonuses came from, or gets someone else's.
- Human players keep their own leader, and Keep my built civilization for a player who built one.
- Reveal who got what: from the start, or once you've met a leader.
- Choose which leaders are shuffled. A Leader pool and a Civilization pool narrow who can appear: Random slots
  only get the leaders and civilizations you leave ticked, with or without a shuffle. Random civilizations follow the
  game's Random Civ Selection setting: from every age with Time-Tested Allowed, from the starting age with Apex Only.
- Split fairness (Fair shares or Pure luck) and a Shuffle number from 1 to 256: the same number with the same
  settings and leaders gives the same shuffle, after a load, in each age and on each machine.
- 25 leader mods built like the base game's leaders can join the shuffle through three check boxes, after a check
  of the mod's files at setup. Every other modded leader plays as its mod made it.

### Build your own leader and civilization
- Build your own leader: fill your leader's slots from cards for every leader's bonuses or whole ability, attributes,
  AI behavior and start terrain, plus start terrain of your own choosing. Whatever you don't take is shuffled among
  the AI leaders. Taking a card with Mode on No shuffle switches the leader rows to Mix bonuses, random start and says so. A card from a
  leader nobody is playing is copied to you.
- Build your own civilization: a civilization's ability or single bonuses, its unique units, single civics or a
  whole civics tree, and its start terrain. Every age opens other ages' abilities, bonuses and start terrain. It works
  with the leader rows on Base game. Your own uniques stay and the ones you take are added, except with Civilization
  uniques on Split up or Off entirely, and the screen says which.
- Both build screens keep their explanations in tooltips: a "?" by the title, and on each slot heading. The settings
  sit behind a Settings button with a one-line summary.
- AI players: a window with a Leader and a Civilization dropdown for each AI player. Random draws from the
  pools. AI players aren't built card by card; the shuffle settings cover them.
- Nobody is left with something they can't build. Two things that need each other are one card: a quarter's two
  civics, the great people that come from a quarter (Logios, Tjaty, Alim, Conquistador, Saga Hero, Jacobin,
  Revolucionario), the Sherpa and the Highland Power Station, and three traditions with the civic they rely on. A
  unique's own rules that the game keeps on its civilization's ability (the Conquistador crossing Ocean, the
  Zamindar's extra Population and six more) go with the unique. Yi Sun-sin's three Fleet Commander bonuses are one
  piece, and whoever holds it can build Fleet Commanders in Antiquity. Whoever holds Ibn Battuta's Wildcard bonus
  gets his 2 Wildcard points after the first civic of each age.
- In the shuffle, Carthage's "second Merchant or Colonist" bonus goes wherever the Colonist goes. On the build
  screen they're two cards, and taking the bonus offers a button to take the Colonist too.
- Sengoku's Samurai goes wherever the Kinsei civic goes: Kinsei switches Man-at-Arms off and lets you train the
  tier 2 Samurai in its place, so the two are never dealt apart. The Samurai is listed with the civic, not as a
  unique card of its own.
- The Pirate Republic's "no Settlers" bonus and its Buccaneer settle charge go wherever the Buccaneer goes, so
  whoever loses Settlers can still settle. On the build screen each is its own card: the settle charge offers the
  Buccaneer, and "no Settlers" offers the settle charge.
- The build screens show whole abilities or single bonuses as the settings say: a part set to Split up shows its
  single pieces.
- The civilization select and civilization details screens between ages carry the same Build your own
  civilization button, and what you build there reaches the next age.

### In the game
- The leader select, loading screen, diplomacy leader panel and Civilopedia show each leader's shuffled ability,
  attributes and start terrain, with "Starts near:" for start terrain, in normal games too.
- Each shuffled bonus in the leader screen says which leader it came from, with a short Who got what section for
  attributes, start terrain, AI agendas and the shuffle number.
- The loading screen's pages follow the shuffle for your leader and civilization, on a new game and a loaded save.
- The diplomacy leader panel and the Civilopedia list each civilization's traditions and uniques where the shuffle
  put them.
- In Exploration and Modern, a civilization's own civics tree opens for whoever holds its civics, whatever happened
  to its ability: a built civilization made only of other civilizations' bonuses still researches the civics dealt
  into its tree.
- City Details names the percentage bonuses the game lists as "Other".
- Drongo's Syncretism Revealer start terrain panel is hidden while start terrain is shuffled, since it shows the
  game's own.

### Known limits
- Every time the game loads, it works the shuffle out again from the setup choices, so an update to this mod can
  change a campaign already under way. From the first release on, a change that would do that only applies to games
  set up after it.
- The Civilization pool only applies when the game starts.
- English only for now.
