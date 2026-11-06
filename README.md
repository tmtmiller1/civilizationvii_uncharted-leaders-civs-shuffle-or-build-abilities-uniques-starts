# Re-dealable Leader Abilities, Attributes, and Start Biases

A Civilization VII mod, in development. At game setup you pick how leaders are mixed up for the game: each leader takes
another leader's ability, attributes and start bias, or the abilities are broken into their bullet points and dealt out
at random. You can also switch abilities, attributes or start biases off for a game where all leaders start on equal
footing. The game's own leader screens show what each leader got, with a new line for the start bias.

Status: first build (0.1.0, unreleased). The code and data are written and checked offline with lint and tests, but
none of it has been watched in a running game yet. Until the lab runs show it working, treat each feature as built,
not as working. What still has to be seen goes on the workspace [WATCH_LIST.md](../../WATCH_LIST.md).

## What it does

- A Re-dealable Leaders button in Advanced Settings opens the mod's own window. It opens on the main choices, and the
  fine-tuning, leader lists, pools and modded leaders sit behind Show advanced settings. The options are hidden setup
  parameters, so they save with the game and travel through the multiplayer lobby.
- Five modes: Not re-dealt, Swap whole abilities, Swap whole leaders, Split abilities with matched starts, and Split
  abilities with random starts.
- Off switches for start biases, leader abilities and leader attributes, plus Keep my leader as chosen, the leaders to
  re-deal, two Civilization VI-style leader pools, AI personality, Balanced or Pure chance dealing, when the deal is
  revealed, and a deal number from 1 to 256.
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

These all run offline. Anything in a running game (lab games, deploys, logs) goes through Tower Bench, as the
workspace rules say.
