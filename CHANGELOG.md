# Changelog

Changes to Uncharted Leaders & Civs for Civilization VII. The format follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

## [1.0.4] - 2026-11-22

### Fixed
- With Your civilization on a choice of its own, like Mix bonuses, the build page showed the AI players' kind of
  cards. It now shows yours: Mix bonuses shows single bonuses even while the AI players swap whole abilities.
- The bonuses you took for your civilization were dropped in the game unless the AI players' civilization abilities
  were also split up. They now count whatever the AI players' setting is, as copies: the civilization each came from
  keeps it.
- A civilization start terrain card was greyed out while start terrain was on Base game. It now counts: your
  civilization starts on that terrain and the others keep theirs.

### Changed
- Your leader and Your civilization's first choice is now called Shuffled like the AI players, and the line under it
  and the build page's notes say plainly what it does.

## [1.0.3] - 2026-11-22

### Changed
- A civilization's unique slots hold two uniques in all, its own included. A civilization with one unique unit takes
  one more; one with two takes one of its own out to take another. 1.0.2 gave every civilization its own uniques plus
  two more, which let any civilization double its uniques without a word. On Custom you can still take more, and the
  line under the slots says when you have.

### Fixed
- On the build pages, the line under each setting ran into the next setting's line. Each one now wraps in its own
  column.

## [1.0.2] - 2026-11-22

### Changed
- Your civilization's own uniques start in its unique slots on Build your own civilization, and you can take them out.
  A unique you take out goes to another civilization of the age. This applies when Civilization uniques is on Base
  game, Follows ability or Swap whole.
- Every civilization has room for its own uniques plus two more, so a civilization with one unique unit can still take
  another's pair. (Changed in 1.0.3.)
- With a page set to Custom, you can take as many cards as you like into every part but start terrain and AI behavior.
  A line under the slots says when a part holds more than its normal number, since that makes your build stronger.

### Fixed
- The build window flickered on the setup screens.
- The setting names on the build pages overlapped their dropdowns.
- A card's tooltip stayed on screen after a click, covering the window's tabs.
- Two-line card names sat on the leader's portrait, a card's number could wrap onto a line of its own, and the main
  menu's text showed through behind the cards.

## [1.0.1] - 2026-11-21

### Changed
- The settings section asks two questions. **AI players' leaders** and **AI players' civilizations** say how the AI
  players are shuffled, and **Your leader** and **Your civilization** say how you are: Same as the AI players, or a
  choice of your own. A line under each dropdown says what the current pick does. This replaces the Follow the AI
  players' settings box on the build pages.
- The choices are renamed to say what happens: Play as normal, Trade places (everything from one other leader or
  civilization), Mixed swap (an ability from one, the rest from others), Mix bonuses (single bonuses from several,
  with starts that suit them) and, for leaders, Mix bonuses with a random start, New personalities, and New
  personalities and attributes. Saved games keep their settings.
- AI agendas is now **Leader personalities**: As the game made them, Follow their bonuses or Shuffled. The New
  personalities choices set it to Shuffled.
- The rows for each part (abilities, attributes, start terrain, and the civilization rows) moved behind the
  Advanced settings... button.
- Human players keep their own leader and Keep my built civilization are gone from the screen. Your leader on Play
  as normal keeps your own leader, and cards you build always count.
- A note wherever things come together or one choice sets another: on build cards and slots (whole abilities,
  merged bonuses, a bonus that goes with a unique, the great person a civic or ability brings), on the settings whose
  pick sets or depends on another row, and in Who got what for bonuses that came together.

### Fixed
- Build your own civilization between ages offered only the cards of the age you were leaving. It now offers the
  next age's abilities, uniques and civics, and marks the rest as another age.
- Between ages you couldn't take out the cards you picked at setup, and new cards didn't stick. Both work now, and
  Clear all slots leaves your slots empty.
- The civilization select between ages showed the next age's civilizations with a swapped ability but their own
  uniques and civics. They now show the uniques and civics they'll be dealt in that age.
- The civilization you pick between ages takes your built cards into the new age. Before, they stayed with the
  civilization you were leaving.

## [1.0.0] - 2026-11-12

The first release.

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
- Every civilization bonus can be dealt or built. A civilization's "+30% Production towards <wonder>" moves
  and names its wonder for whoever holds it: holding Egypt's means +30% towards the Pyramids. Assyria's "Codices are
  not awarded from Technologies" goes to whoever holds it, and a civilization without it, Assyria included, earns
  codices from Technologies. The Inca's and Songhai's treasure convoys and Joseon's Seowon rule go with the civic or
  quarter they come from; their cards say so, and clicking one takes that civic.
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

- Your own mode. Both build pages have a **Follow the AI players' settings** box, ticked by default, and your own
  Leader mode or Civilization mode. Pick a mode of your own and the box unticks: you're shuffled by your mode, and
  the AI players by the settings in Advanced Settings. Your share is laid on top as copies, so an AI player whose
  bonus you took keeps it too. Cards you build stay yours either way. Ticking the box again puts you back on the AI
  players' settings.
- Two Leader modes for agendas, **Agendas only** (abilities, attributes and start terrain stay; AI agendas are
  shuffled) and **Agendas and attributes** (abilities and start terrain stay; attributes and AI agendas are
  shuffled). Picking one also sets AI agendas to Swap whole, and AI agendas on Swap whole shuffle even while leader
  abilities stay on Base game.
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
- When this mod updates, a campaign keeps the shuffle it started with; if a fix has to change it, a notice on the next
  turn says so.
- The Civilization pool only applies when the game starts.
- English only for now.
