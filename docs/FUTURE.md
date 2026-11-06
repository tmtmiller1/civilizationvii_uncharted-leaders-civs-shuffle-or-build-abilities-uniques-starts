# Parked for later

Ideas the owner set aside on 2026-11-06. Nothing here is planned for the first release, nothing is built, and the
engine notes below come from reading the game's data, not from a running game.

## Earning attributes in play

What the player would see: finishing one of their civ's unique civics (or some other milestone) gives them a new
attribute partway through the game, with its two diplomatic actions, perhaps some attribute points, and its icon on the
leader screens.

What the game's data offers:

- **The attribute itself can't be added mid-game.** Attributes are leader traits (`TRAIT_LEADER_ATTRIBUTE_<KIND>` rows
  in `LeaderTraits`), and leader traits are fixed when the game starts.
- **Its two diplomatic actions can be.** Civic nodes unlock diplomatic actions directly through
  `ProgressionTreeNodeUnlocks` with `TargetKind = 'KIND_DIPLOMATIC_ACTION'`; vanilla does this six times (Code of Laws
  unlocks Improve Trade Relations and Steal Civic). A unique civic could unlock, say, Research Collaboration and Sabotage
  Research, the Scientific attribute's pair. The unlock can also be limited to one leader's trait
  (`RequiredTraitType`).
- **Attribute points can be.** `EFFECT_PLAYER_ATTRIBUTE` grants points: the Future Civic and Future Tech each give
  one (`MOD_AQ_FUTURE_CIVIC_ATTRIBUTE`, `Amount=1`). Whether a grant can be aimed at one attribute tree isn't known.
- **The icon on the leader screens can be.** A game-scope script can add a `LeaderTags` row in `config` when the civic
  completes; probe 8 watched a runtime write reach the Civilopedia and the diplomacy panel.
- **The AI only half-follows.** It would use the unlocked actions, but its lean toward an attribute tree comes from the
  `AiLists` tied to its traits at game start, so an attribute earned mid-game wouldn't change how it spends points.

First step if this is picked up: one probe, a civic that unlocks an attribute's two actions and grants a point,
watched in a lab game, before any design.

## Choosing attributes at setup

What the player would see: a picker on the setup screen where each player chooses their leader's two attributes.

This needs no new engine lever. The picker writes one string key per chosen attribute into the game config, a
`ConfigurationValueMatches` action group per key adds the attribute trait (the per-leader key route watched in probe 7),
and the setup screen writes the matching `LeaderTags` rows so the leader screens show the choice (probe 8). Multiplayer
needs the keys to reach each player through the lobby, the same open question as probe 9.
