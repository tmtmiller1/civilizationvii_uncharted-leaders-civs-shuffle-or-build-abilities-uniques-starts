# Changelog

Changes to Re-dealable Leader Abilities, Attributes, and Start Biases for Civilization VII. The format follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

## [0.1.0] - Unreleased

The first build. It hasn't been watched in a game yet; the lab runs come next.

### Added
- A Re-dealable Leaders button in Advanced Settings opens a window with the mod's setup options. They save with the
  game and reach the other players through the lobby like any other setup option, and only the host can change them.
- How leaders are re-dealt: Not re-dealt, Swap whole abilities, Swap whole leaders, Split abilities with matched
  starts, and Split abilities with random starts. The split modes break each ability into its bullet points and deal
  them out with the attributes, and each leader gets back as many pieces as it gave.
  Until a leader's bullets have been checked by hand, its ability is dealt whole. None have been checked in this
  version, so for now the split modes deal whole abilities and single attributes.
- Start biases, Leader abilities and Leader attributes each switch Off on their own, for a game on equal footing. With
  attributes off, each leader gets all twelve diplomatic actions the attributes would have unlocked.
- Keep my leader as chosen, so human players keep the leader they picked while the AI leaders are re-dealt.
- Leaders to re-deal, a list of the base game and DLC leaders. When each slot names a leader, only the leaders in the
  game are re-dealt among themselves.
- Leader pool 1 and Leader pool 2, as in Civilization VI: a slot set to Random from pool 1 or 2 gets a leader from that
  pool when the game starts.
- AI personality (Stays with the leader, Follows the ability, Re-dealt too), Dealing (Balanced, Pure chance) and Show
  what everyone got (At the start, As you meet them).
- A deal number from 1 to 256. The same number with the same settings gives the same deal, after a load and in each
  age, and on each machine in multiplayer. It shows on the loading screen.
- The leader select screen, loading screen, diplomacy leader panel and Civilopedia show each leader's re-dealt ability,
  attributes and start bias. A new "Starts near:" line shows the start bias, in normal games too.
- A Who got what panel in the game, naming any leader left out of the deal and why.
- City Details shows percentage bonuses the game lists as "Other" by name under their yield.
- 25 leader mods built like the base game's leaders can join the deal through three check boxes (abilities,
  attributes, start biases), after a check of the mod's files at setup.
- Drongo's Syncretism Revealer start bias panel is hidden in the shuffle modes, since it shows the game's own biases.
- English text. The other languages come after the lab runs.
