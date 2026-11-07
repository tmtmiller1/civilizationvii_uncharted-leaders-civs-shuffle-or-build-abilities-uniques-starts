# Re-dealable Leader Abilities, Attributes, and Start Biases

A Civilization VII mod, in development. At game setup you pick what gets shuffled between leaders: another leader's
whole ability, another leader's whole package, or a random hand of the separate bonuses inside every ability. You can also turn
abilities, attributes or start terrain off for everyone, so all leaders start even. The game's own leader screens show
what each leader got, with a new line for where they like to start.

Status: first build (0.1.0, unreleased). The code and data are written and checked offline with lint and tests, but
none of it has been watched in a running game yet. Until the lab runs show it working, treat each feature as built,
not as working. What still has to be seen goes on the workspace [WATCH_LIST.md](../../WATCH_LIST.md).

## What it does

- The seven main settings, AI behavior among them, are ordinary rows in a Re-dealable Leaders Settings section of
  Advanced Settings, followed by Leader pool..., Civilization pool..., Build your own leader... and Advanced settings... buttons. Build
  your own leader is a memento-style card screen: your leader's slots along the top, every piece in the shuffle as a
  card below, and the rest shuffled among the AI. The advanced
  window has Split fairness, the shuffle number, and the lists of leaders that are shuffled and leaders from
  other mods. Every list has All and None. Everything saves with the game and travels through the multiplayer lobby.
- Build your own leader and Build your own civilization: memento-style card screens (the leader's ability bonuses,
  attributes, AI behavior and start terrain; the civilization's ability, uniques and start terrain), for you and up to
  three AI leaders, with the rest shuffled among the others.
- Presets (Base game, Full random, Paired random, Logical split random, Split random) over one setting per
  part: leader abilities, leader attributes, start terrain, civilization abilities and civilization uniques.
- Off entirely values for leader abilities, leader attributes and start terrain, plus Human players keep their
  own leader, a Civilization VI-style leader pool, AI behavior, Fair shares or Pure luck, when other leaders'
  bonuses are shown, and a shuffle number from 1 to 256.
- The deal runs in SQL at load time, gated on the setup values, so it comes out the same after a load, in each age and
  on each machine. The setup screen works out the same deal in JS to show it before the game starts.
- The leader screens, a Who got what panel and City Details show the result.

[docs/WORKSHOP.md](docs/WORKSHOP.md) has the player-facing description (a draft, not pushed anywhere).

## How it's laid out

[CONTRACTS.md](CONTRACTS.md) is the build's source of names: setup parameters, config keys, tables, text keys, the
modinfo groups and who owns which folder. [docs/SPEC.md](docs/SPEC.md) is the design, and CONTRACTS.md section 12 says
where the build departs from it.

| Path | Holds |
| --- | --- |
| `shared/` | Names, the deal key, bullet splitting, the known leaders, and `shared/deal/lshuf-deal.js`, the deal itself in plain JS |
| `scripts/generate/` | Turns the deal into the gameplay SQL in `data/generated/` |
| `scripts/mapping/`, `data/mapping/` | The bullet-to-modifier mapping for each ability |
| `scripts/setup-copy/`, `data/setup-copy/` | The setup-side copy of the game rows the deal reads before a game exists |
| `data/schema/`, `data/frontend/` | The mod's tables and the setup parameters |
| `data/text-generated/` | Each ability bullet's text in all the game's languages, split from the game's own text |
| `ui/setup/` | The setup window, the leader pools and the start-of-game config writes |
| `ui/display/`, `ui/game/` | The leader screens, the Who got what panel and the City Details names |
| `text/` | English text; [text/TRANSLATION.md](text/TRANSLATION.md) lists what the other languages need |
| `tests/` | Tests, including the check that the SQL and the JS give the same deal |
| `docs/` | The spec, the compatibility audit, the modded leader list and ideas parked for later |
| `devtools/` | The lab probes behind the design and the modded leader scan |

## Running the checks

From this folder, after `npm install`:

```sh
npm run lint            # ESLint over ui, shared, scripts and tests
npm run check           # node --check on each JS file
npm test                # runs tests/run-all.mjs
npm run build:modinfo   # builds the .modinfo from modinfo.template.xml and the generated groups
npm run verify          # check, lint and test in one go
```

The tests build their databases from `tests/fixtures/source-db/` (not committed): copy a gameplay, frontend and
localization `-copy.sqlite` set there from an in-game Debug folder with the Tower mods on. Without it they read the
live Debug folder, which a launch that stops at the main menu leaves nearly empty.

These all run offline. Anything in a running game (lab games, deploys, logs) goes through Tower Bench, as the
workspace rules say.
