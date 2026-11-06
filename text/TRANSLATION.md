# Text to translate

English is written once, in [en_us/lshuf-text.xml](en_us/lshuf-text.xml). The game has eleven other languages, and
each key below needs a translation in all of them before release:

`de_DE`, `es_ES`, `fr_FR`, `it_IT`, `ja_JP`, `ko_KR`, `pl_PL`, `pt_BR`, `ru_RU`, `zh_Hans_CN`, `zh_Hant_HK`

Status: English only. No language has been started, and machine translation isn't wanted; the translations wait until
the mechanics have been watched in a game, so the English won't keep moving under them.

Notes for translators:

- Keep each `{1_Name}` placeholder as written. The game fills it in.
- Option names, value names and heading names are quoted inside other lines (for example "Random from pool 1" in the
  pool tooltip, "Not re-dealt" in a reason). Use the same words in both places.
- The reasons are read after a leader's name and a colon ("Nearl: its mod now runs a gameplay script"), so they start
  lower case in English.
- The ability bullet points (`LOC_LSHUF_PIECE_<PieceId>`) aren't here. They're split from the game's own text in each
  language when the mod is built, so translators can skip them.
- When a key's English changes meaning, delete that key from each language file so the stale translation isn't kept.

120 keys to translate.

## The mod

| Key | English |
| --- | --- |
| `LOC_LSHUF_MOD_NAME` | Re-dealable Leader Abilities, Attributes, and Start Biases |
| `LOC_LSHUF_MOD_DESCRIPTION` | Re-deals leader abilities, attributes and start biases for a new game. Swap whole abilities or whole leaders, or break abilities into their bullet points and deal them out, and switch any of the three off for a game on equal footing. It's built for multiplayer through the game's own lobby, and the game's leader screens show what each leader got, with a line for where they like to start. |

## The window

| Key | English |
| --- | --- |
| `LOC_LSHUF_OPEN_BUTTON` | Re-dealable Leaders... |
| `LOC_LSHUF_WINDOW_TITLE` | Re-dealable Leaders |
| `LOC_LSHUF_CLOSE` | Close |
| `LOC_LSHUF_HOST_ONLY` | Only the host can change these settings. You'll see them here as the host sets them. |
| `LOC_LSHUF_LIST_ALL_ON` | All on |
| `LOC_LSHUF_LIST_ALL_OFF` | All off |
| `LOC_LSHUF_LIST_COUNT` | {1_On} of {2_Total} on |
| `LOC_LSHUF_LIST_SHOW` | Show list |
| `LOC_LSHUF_LIST_HIDE` | Hide list |
| `LOC_LSHUF_SEED_NEW` | New number |
| `LOC_LSHUF_SEED_RANGE` | Any whole number from {1_Min} to {2_Max} |
| `LOC_LSHUF_POOL_EMPTY` | This pool is empty. A slot set to Random from this pool gets an ordinary random leader. |
| `LOC_LSHUF_MODDED_NONE_INSTALLED` | You don't have any of the listed modded leaders installed and turned on, so modded leaders play as their mods ship them. |

## Window headings

| Key | English |
| --- | --- |
| `LOC_LSHUF_HEADING_DEAL` | The deal |
| `LOC_LSHUF_HEADING_LEADERS` | Leaders in the deal |
| `LOC_LSHUF_HEADING_MODDED` | Modded leaders |
| `LOC_LSHUF_HEADING_POOLS` | Leader pools |
| `LOC_LSHUF_ADVANCED_SHOW` | Show advanced settings |
| `LOC_LSHUF_ADVANCED_HIDE` | Hide advanced settings |

## Options

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NAME` | How leaders are re-dealt |
| `LOC_LSHUF_MODE_DESC` | Mixes up leader abilities, attributes and start biases for this game. The leader screens show what each leader got. |
| `LOC_LSHUF_BIASES_NAME` | Start biases |
| `LOC_LSHUF_BIASES_DESC` | Where leaders and civilizations like to start. Off: the map places everyone without leaning toward any terrain, whatever the mode. |
| `LOC_LSHUF_ABILITIES_NAME` | Leader abilities |
| `LOC_LSHUF_ABILITIES_DESC` | Off: leaders play without their abilities, and attributes and start biases still follow the mode. |
| `LOC_LSHUF_ATTRIBUTES_NAME` | Leader attributes |
| `LOC_LSHUF_ATTRIBUTES_DESC` | Off: leaders play without attributes, and each leader gets all twelve diplomatic actions the attributes would have unlocked, so everyone has the same set. |
| `LOC_LSHUF_KEEP_MINE_NAME` | Keep my leader as chosen |
| `LOC_LSHUF_KEEP_MINE_DESC` | Each human player keeps the leader they picked as the game ships it: ability, attributes, start bias and personality. The AI leaders are re-dealt among themselves. |
| `LOC_LSHUF_LEADERS_OUT_NAME` | Leaders to re-deal |
| `LOC_LSHUF_LEADERS_OUT_DESC` | A leader switched off here plays as the game ships it. Only the leaders in the game are re-dealt among themselves, including the ones picked for Random slots. In an online game, if another player leaves their own slot on Random, every leader still switched on goes into the deal, so bonuses can come from leaders who aren't playing. |
| `LOC_LSHUF_MODDED_ABILITIES_NAME` | Modded leaders' abilities |
| `LOC_LSHUF_MODDED_ABILITIES_DESC` | Lets the abilities of listed modded leaders into the deal. The leader's mod has to be installed and turned on and pass a check of its files at setup; other modded leaders play as their mods ship them. |
| `LOC_LSHUF_MODDED_ATTRIBUTES_NAME` | Modded leaders' attributes |
| `LOC_LSHUF_MODDED_ATTRIBUTES_DESC` | Lets the attributes of listed modded leaders into the deal. The leader's mod has to be installed and turned on and pass a check of its files at setup; other modded leaders play as their mods ship them. |
| `LOC_LSHUF_MODDED_BIASES_NAME` | Modded leaders' start biases |
| `LOC_LSHUF_MODDED_BIASES_DESC` | Lets the start biases of listed modded leaders into the deal. The leader's mod has to be installed and turned on and pass a check of its files at setup; other modded leaders play as their mods ship them. |
| `LOC_LSHUF_MODDED_OUT_NAME` | Modded leaders to re-deal |
| `LOC_LSHUF_MODDED_OUT_DESC` | The listed modded leaders you have installed. A leader you switch off here plays as its mod ships it. |
| `LOC_LSHUF_POOL1_NAME` | Leader pool 1 |
| `LOC_LSHUF_POOL1_DESC` | Pick the leaders for this pool. A player slot set to Random from pool 1 gets one of them when the game starts, and two slots never get the same leader. |
| `LOC_LSHUF_POOL2_NAME` | Leader pool 2 |
| `LOC_LSHUF_POOL2_DESC` | Pick the leaders for this pool. A player slot set to Random from pool 2 gets one of them when the game starts, and two slots never get the same leader. |
| `LOC_LSHUF_PERSONALITY_NAME` | AI personality |
| `LOC_LSHUF_PERSONALITY_DESC` | How an AI leader behaves: its agendas and the civilizations it likes to pick in each age. |
| `LOC_LSHUF_DEALING_NAME` | Dealing |
| `LOC_LSHUF_DEALING_DESC` | How the split modes hand out the pieces of each ability. |
| `LOC_LSHUF_REVEAL_NAME` | Show what everyone got |
| `LOC_LSHUF_REVEAL_DESC` | When you get to see the other leaders' abilities, attributes and start biases for this game. |
| `LOC_LSHUF_SEED_NAME` | Deal number |
| `LOC_LSHUF_SEED_DESC` | The same number with the same settings and leaders gives the same deal, so you can share it and a friend can play the same roll. Setup picks a new number each time it opens, and the number shows on the loading screen. |

## Option values

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NONE` | Not re-dealt |
| `LOC_LSHUF_MODE_NONE_DESC` | Leaders play as the game ships them. The Off switches still apply. |
| `LOC_LSHUF_MODE_SWAP_ABILITIES` | Swap whole abilities |
| `LOC_LSHUF_MODE_SWAP_ABILITIES_DESC` | Each leader takes another leader's whole ability, two random attributes, and a start bias rolled from scratch. The three aren't tied to each other. |
| `LOC_LSHUF_MODE_SWAP_LEADERS` | Swap whole leaders |
| `LOC_LSHUF_MODE_SWAP_LEADERS_DESC` | Each leader takes another leader's whole package: ability, attributes and start bias together. Amina might play with Pachacuti's mountain bonuses and start beside mountains. |
| `LOC_LSHUF_MODE_SPLIT_MATCHED` | Split abilities, matched starts |
| `LOC_LSHUF_MODE_SPLIT_MATCHED_DESC` | Abilities are broken into their bullet points and dealt out with the attributes. Each leader's start bias comes from the pieces they got, so whoever holds Pachacuti's mountain bullets starts near mountains. Until a leader's bullets have been checked by hand, that leader's ability is dealt whole. |
| `LOC_LSHUF_MODE_SPLIT_RANDOM` | Split abilities, random starts |
| `LOC_LSHUF_MODE_SPLIT_RANDOM_DESC` | Abilities and attributes are dealt out in pieces as in Split abilities, matched starts, and start biases are rolled from scratch. Until a leader's bullets have been checked by hand, that leader's ability is dealt whole. |
| `LOC_LSHUF_REDEALT` | Re-dealt with the mode |
| `LOC_LSHUF_REDEALT_DESC` | Mixed up the way How leaders are re-dealt says. |
| `LOC_LSHUF_OFF` | Off |
| `LOC_LSHUF_OFF_DESC` | Switched off for all leaders, for a game on equal footing. A leader kept as chosen keeps theirs. |
| `LOC_LSHUF_PERSONA_STAYS` | Stays with the leader |
| `LOC_LSHUF_PERSONA_STAYS_DESC` | Each AI leader keeps its own agendas and civilization picks, and still plays the bonuses it was dealt. |
| `LOC_LSHUF_PERSONA_FOLLOWS` | Follows the ability |
| `LOC_LSHUF_PERSONA_FOLLOWS_DESC` | Agendas and civilization picks move with the ability, so the AI acts like the leader whose bonuses it holds. In the split modes they come from the leader who gave it the most pieces. |
| `LOC_LSHUF_PERSONA_REDEALT` | Re-dealt too |
| `LOC_LSHUF_PERSONA_REDEALT_DESC` | Whole personalities are dealt out to random leaders on their own, apart from the abilities. |
| `LOC_LSHUF_DEAL_BALANCED` | Balanced |
| `LOC_LSHUF_DEAL_BALANCED_DESC` | Each leader's pieces add up to about the same strength, so one leader can't end up with all the strong bullets. |
| `LOC_LSHUF_DEAL_CHANCE` | Pure chance |
| `LOC_LSHUF_DEAL_CHANCE_DESC` | Pieces go out at random, strong or weak, the way the cards fall. |
| `LOC_LSHUF_REVEAL_START` | At the start |
| `LOC_LSHUF_REVEAL_START_DESC` | The leader screens show everyone's deal from setup on. |
| `LOC_LSHUF_REVEAL_MET` | As you meet them |
| `LOC_LSHUF_REVEAL_MET_DESC` | You see your own deal at setup. Another leader's deal shows in the diplomacy panel and the Civilopedia once you've met them. |
| `LOC_LSHUF_RANDOM_POOL_1` | Random from pool 1 |
| `LOC_LSHUF_RANDOM_POOL_1_DESC` | A random leader from Leader pool 1, picked when the game starts. If the pool is empty or used up, the slot gets an ordinary random leader. |
| `LOC_LSHUF_RANDOM_POOL_2` | Random from pool 2 |
| `LOC_LSHUF_RANDOM_POOL_2_DESC` | A random leader from Leader pool 2, picked when the game starts. If the pool is empty or used up, the slot gets an ordinary random leader. |

## Leader screens

| Key | English |
| --- | --- |
| `LOC_LSHUF_BIAS_LINE` | Starts near: {1_List} |
| `LOC_LSHUF_BIAS_NONE` | Starts anywhere the map puts them |
| `LOC_LSHUF_BIAS_MAP_SETS` | Starts where this map places them; it doesn't use start biases |
| `LOC_LSHUF_BIAS_COAST` | Coast |
| `LOC_LSHUF_BIAS_RIVER` | Rivers |
| `LOC_LSHUF_BIAS_LAKE` | Lakes |
| `LOC_LSHUF_BIAS_NATURAL_WONDER` | Natural Wonders |
| `LOC_LSHUF_BIAS_ISLAND` | Islands |
| `LOC_LSHUF_ABILITY_OFF` | Leader abilities are off for this game. |
| `LOC_LSHUF_PIECE_REST` | The rest of {1_Ability} |
| `LOC_LSHUF_DEAL_NUMBER` | Deal number: {1_Seed} |

## Reveal panel

| Key | English |
| --- | --- |
| `LOC_LSHUF_REVEAL_TITLE` | Who got what |
| `LOC_LSHUF_REVEAL_OPEN` | See who got what |
| `LOC_LSHUF_REVEAL_UNMET` | You haven't met this leader yet. |
| `LOC_LSHUF_REVEAL_TOO_FEW` | Fewer than two leaders were left to re-deal here, so this part stays as the game ships it. |
| `LOC_LSHUF_REVEAL_DIFFERS` | Another mod changed the leaders, so this deal is different from the one the setup screen showed. |
| `LOC_LSHUF_REVEAL_LEFT_OUT` | {1_Leader}: {2_Reason} |

## Reasons (each follows "Leader: " in the reveal panel)

| Key | English |
| --- | --- |
| `LOC_LSHUF_REASON_KEPT` | kept as chosen |
| `LOC_LSHUF_REASON_LIST` | switched off in Leaders to re-deal |
| `LOC_LSHUF_REASON_NOTINGAME` | not in this game |
| `LOC_LSHUF_REASON_MODDEDLIST` | switched off in Modded leaders to re-deal |
| `LOC_LSHUF_REASON_UNKNOWN` | not on this mod's list yet, so it plays as shipped |
| `LOC_LSHUF_REASON_OBSERVER` | an observer, so it stays out of the deal |
| `LOC_LSHUF_REASON_MODDED_OFF` | the modded leaders' box for this part is off |
| `LOC_LSHUF_REASON_MODDED_NOTOK` | its mod didn't pass the setup check |
| `LOC_LSHUF_REASON_MODDED_LEADERTYPE` | its ability checks for its own leader, so it can't move |
| `LOC_LSHUF_REASON_MODDED_CHANGED` | its ability has changed since it was reviewed, so it's dealt whole |
| `LOC_LSHUF_REASON_TOO_FEW` | fewer than two leaders were left to re-deal |
| `LOC_LSHUF_REASON_MODE_NONE` | How leaders are re-dealt is set to Not re-dealt |
| `LOC_LSHUF_WHY_SCRIPT` | its mod now runs a gameplay script |
| `LOC_LSHUF_WHY_UISCRIPT` | its mod now runs an interface script |
| `LOC_LSHUF_WHY_IMPORTJS` | its mod now loads a script file |
| `LOC_LSHUF_WHY_MISSING` | its mod isn't installed and turned on |

## Gameplay traits

| Key | English |
| --- | --- |
| `LOC_LSHUF_TRAIT_DEALT_DESCRIPTION` | Bonuses dealt to this leader from other leaders' abilities at game setup. The leader screens list each one. |
| `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_NAME` | Equal Footing |
| `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_DESCRIPTION` | Leader attributes are off for this game, so each leader gets all twelve diplomatic actions the attributes would have unlocked. |
