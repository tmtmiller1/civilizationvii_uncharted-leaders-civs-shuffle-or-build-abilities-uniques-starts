# Text to translate

English is written once, in [en_us/lshuf-text.xml](en_us/lshuf-text.xml). The game has eleven other languages, and
each key below needs a translation in all of them before release:

`de_DE`, `es_ES`, `fr_FR`, `it_IT`, `ja_JP`, `ko_KR`, `pl_PL`, `pt_BR`, `ru_RU`, `zh_Hans_CN`, `zh_Hant_HK`

Status: English only. No language has been started, and machine translation isn't wanted; the translations wait until
the mechanics have been watched in a game, so the English won't keep moving under them.

[agenda/](agenda/) isn't ours to translate: it holds the game's own agenda text in all twelve languages, copied by
`scripts/setup-copy/build-agenda-text.mjs` so the AI behavior cards can read it in the shell.

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
| `LOC_LSHUF_MOD_DESCRIPTION` | Shuffles leader abilities, attributes and start terrain at the start of a game. Leaders can swap abilities, swap everything, or have the separate bonuses inside each ability mixed between them, and you can turn abilities, attributes or start terrain off for everyone. It works in multiplayer through the game's own lobby, and the game's leader screens show what each leader ended up with, including where they like to start. |

## The window

| Key | English |
| --- | --- |
| `LOC_LSHUF_WINDOW_TITLE` | Re-dealable Leaders |
| `LOC_LSHUF_CLOSE` | Close |
| `LOC_LSHUF_HOST_ONLY` | Only the host can change these settings. You'll see them update here as the host changes them. |
| `LOC_LSHUF_LIST_ALL` | All |
| `LOC_LSHUF_LIST_NONE` | None |
| `LOC_LSHUF_SECTION_TITLE` | Re-dealable Leaders Settings |
| `LOC_LSHUF_BTN_LEADERS` | Choose which leaders are shuffled... |
| `LOC_LSHUF_BTN_POOLS` | Leader pool... |
| `LOC_LSHUF_BTN_MODDED` | Leaders from other mods... |
| `LOC_LSHUF_BTN_CIVS` | Civilization pool... |
| `LOC_LSHUF_BTN_BUILD` | Build your own leader... |
| `LOC_LSHUF_BTN_BUILD_CIV` | Build your own civilization... |
| `LOC_LSHUF_BUILD_CIV_TITLE` | Build your own civilization |
| `LOC_LSHUF_BUILD_YOUR_CIV` | Your civilization: {1_Name} |
| `LOC_LSHUF_BUILD_NO_CIV` | Pick a civilization on the civilization select screen first; a Random civilization can't be built. |
| `LOC_LSHUF_BUILD_CIV_INTRO` | Fill your civilization's slots from the cards below: an ability, its uniques and its start terrain, from any civilization of this age. |
| `LOC_LSHUF_BUILD_FOR` | Building for |
| `LOC_LSHUF_BUILD_FOR_YOU` | You: {1_Name} |
| `LOC_LSHUF_BUILD_FOR_AI` | AI: {1_Name} |
| `LOC_LSHUF_BUILD_FOR_FULL` | Up to {1_Total} leaders can be built in one game. Clear another leader's slots to build this one. |
| `LOC_LSHUF_BUILD_FOR_RANDOM` | This slot is on Random. Give it a leader in Advanced Settings to build it. |
| `LOC_LSHUF_BUILD_AGENDA` | Agenda: {1_Name} |
| `LOC_LSHUF_BUILD_LIKES` | Likes: {1_Text} |
| `LOC_LSHUF_BUILD_DISLIKES` | Dislikes: {1_Text} |
| `LOC_LSHUF_BUILD_FAVORS` | Favorite civilizations: {1_List} |
| `LOC_LSHUF_BUILD_ATTRIBUTE_DESC` | +2 {1_Kind} attribute points when the Exploration and Modern Ages begin, and the diplomatic actions {2_Actions}. |
| `LOC_LSHUF_BUILD_HELD_BY` | Held by {1_List}. |
| `LOC_LSHUF_BUILD_NO_OWN_TERRAIN` | No start terrain of their own: they start where their civilization likes to. |
| `LOC_LSHUF_BUILD_HIDE_NO_TERRAIN` | Hide leaders without start terrain |
| `LOC_LSHUF_BUILD_KIND_GENERIC` | Start terrain of your choosing |
| `LOC_LSHUF_BUILD_GENERIC_DESC` | Your leader starts near {1_Terrain}, the way a leader with that start terrain of their own would. |
| `LOC_LSHUF_BUILD_KIND_CIVABILITY` | Civilization ability |
| `LOC_LSHUF_BUILD_KIND_CIVUNIQUE` | Unique |
| `LOC_LSHUF_BUILD_SLOT_CIV_ABILITY` | Ability |
| `LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES` | Uniques |
| `LOC_LSHUF_BUILD_CIV_SWAP_NOTE` | Taking a civilization's ability gives that civilization yours in return. A unique moves, and its civilization goes without it. |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_UNIT` | Unique unit |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_BUILDING` | Unique building |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_QUARTER` | Unique quarter (with its two buildings) |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_IMPROVEMENT` | Unique improvement |
| `LOC_LSHUF_BTN_AI` | AI leaders... |
| `LOC_LSHUF_AI_TITLE` | Build the AI leaders |
| `LOC_LSHUF_AI_INTRO` | Each AI player can be built the way you build your own leader and civilization. Up to {1_Total} AI leaders can be built in one game; the rest are shuffled. |
| `LOC_LSHUF_AI_NONE` | No AI players in this game. |
| `LOC_LSHUF_AI_BUILD_LEADER` | Build leader... |
| `LOC_LSHUF_AI_BUILD_CIV` | Build civilization... |
| `LOC_LSHUF_AI_CLEAR` | Clear |
| `LOC_LSHUF_AI_PICKED` | {1_Count} cards picked |
| `LOC_LSHUF_AI_NOT_BUILT` | Shuffled with the others |
| `LOC_LSHUF_AI_RANDOM` | Random leader: give this slot a leader in the player rows to build it. |
| `LOC_LSHUF_AI_NO_CIV` | No civilization picked for this slot yet. |
| `LOC_LSHUF_BUILD_LINK_AI` | Build the AI leaders... |
| `LOC_LSHUF_BUILD_LINK_BACK` | Back to the AI leaders |
| `LOC_LSHUF_BUILD_FOR_AI_LEADER` | AI leader: {1_Name} |
| `LOC_LSHUF_BUILD_FOR_AI_CIV` | AI civilization: {1_Name} |
| `LOC_LSHUF_BUILD_TITLE` | Build your own leader |
| `LOC_LSHUF_BUILD_INTRO` | Fill your leader's slots from the cards below. Whatever you don't take is shuffled among the AI leaders. |
| `LOC_LSHUF_BUILD_YOUR_LEADER` | Your leader: {1_Name} |
| `LOC_LSHUF_BUILD_NO_LEADER` | Pick a leader on the leader select screen first; a Random slot can't be built. |
| `LOC_LSHUF_BUILD_MODE_OFF` | The preset is Base game, so these picks won't be used. Pick a preset above to build. |
| `LOC_LSHUF_BUILD_HOST_ONLY` | Only the host builds a leader in this version. |
| `LOC_LSHUF_BUILD_SLOTS_ABILITY` | Ability |
| `LOC_LSHUF_BUILD_SLOTS_ATTRIBUTES` | Attributes |
| `LOC_LSHUF_BUILD_SLOT_BEHAVIOR` | AI behavior |
| `LOC_LSHUF_BUILD_SLOT_TERRAIN` | Start terrain |
| `LOC_LSHUF_BUILD_SLOT_CIV_TERRAIN` | Civilization start terrain |
| `LOC_LSHUF_BUILD_SLOT_EMPTY` | Empty slot |
| `LOC_LSHUF_BUILD_SLOTS_FULL` | All slots are full. Click a slot to empty it. |
| `LOC_LSHUF_BUILD_SEARCH` | Search |
| `LOC_LSHUF_BUILD_FILTER_KIND` | Show: {1_Kind} |
| `LOC_LSHUF_BUILD_FILTER_TYPE` | Type: {1_Type} |
| `LOC_LSHUF_BUILD_FILTER_LEADER` | Leader: {1_Leader} |
| `LOC_LSHUF_BUILD_FILTER_ALL` | All |
| `LOC_LSHUF_BUILD_WHOLE_ABILITIES` | Whole abilities |
| `LOC_LSHUF_BUILD_KIND_BULLET` | Ability bonuses |
| `LOC_LSHUF_BUILD_KIND_WHOLE` | Whole abilities |
| `LOC_LSHUF_BUILD_KIND_ATTRIBUTE` | Attributes |
| `LOC_LSHUF_BUILD_KIND_PERSONA` | AI behavior |
| `LOC_LSHUF_BUILD_KIND_BIAS` | Start terrain |
| `LOC_LSHUF_BUILD_KIND_CIVBIAS` | Civilization start terrain |
| `LOC_LSHUF_BUILD_CARD_FROM` | From {1_Name} |
| `LOC_LSHUF_BUILD_CARD_TAKEN` | In a slot |
| `LOC_LSHUF_BUILD_CARD_UNREVIEWED` | This bonus can't be taken on its own yet. |
| `LOC_LSHUF_BUILD_CARD_OWN` | Your leader's own |
| `LOC_LSHUF_BUILD_BEHAVIOR_DESC` | {1_Name}'s agendas and favorite civilizations. |
| `LOC_LSHUF_BUILD_TERRAIN_DESC` | Where {1_Name} likes to start: {2_List} |
| `LOC_LSHUF_BUILD_CLEAR` | Clear all slots |
| `LOC_LSHUF_BUILD_DONE` | Done |
| `LOC_LSHUF_REVEAL_BUILT` | {1_Name} built this leader by hand. |
| `LOC_LSHUF_REASON_BUILT` | built by hand |
| `LOC_LSHUF_BTN_ADVANCED` | Advanced settings... |
| `LOC_LSHUF_ADVANCED_TITLE` | Re-dealable Leaders advanced settings |
| `LOC_LSHUF_CIVS_OUT_NAME` | Civilization pool |
| `LOC_LSHUF_CIVS_OUT_DESC` | AI players and Random slots only get civilizations ticked in this pool. A civilization a player picks by hand stays as picked. For now this only applies to the first age. |
| `LOC_LSHUF_LIST_COUNT` | {1_On} of {2_Total} on |
| `LOC_LSHUF_SEED_NEW` | New number |
| `LOC_LSHUF_SEED_RANGE` | A number from {1_Min} to {2_Max} |
| `LOC_LSHUF_POOL_EMPTY` | No leaders in this pool yet. A slot set to Random from this pool gets a normal random leader. |
| `LOC_LSHUF_MODDED_NONE_INSTALLED` | None of the leader mods this mod supports are installed and turned on, so leaders from other mods play normally. |

## Window headings

| Key | English |
| --- | --- |
| `LOC_LSHUF_HEADING_MODDED` | Leaders from other mods |
| `LOC_LSHUF_HEADING_POOLS` | Leader pool |

## Options

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NAME` | Preset |
| `LOC_LSHUF_MODE_DESC` | Sets the six rows below at once. Base game: nothing moves. Full random: leader abilities swap whole, attributes split up, start terrain is a random roll. Paired random: attributes and start terrain follow the ability. Logical split random: abilities and attributes split up, start terrain is logical with the bonuses. Split random: the same, start terrain a random roll. Change a row by hand and this reads Custom. |
| `LOC_LSHUF_BIASES_NAME` | Leader start terrain |
| `LOC_LSHUF_BIASES_DESC` | The terrain each leader prefers to start near (the game calls it a start bias). Off entirely: the map places everyone without any terrain preference. |
| `LOC_LSHUF_ABILITIES_NAME` | Leader abilities |
| `LOC_LSHUF_ABILITIES_DESC` | Where each leader's ability goes. Off entirely: no leader has an ability this game. |
| `LOC_LSHUF_ATTRIBUTES_NAME` | Leader attributes |
| `LOC_LSHUF_ATTRIBUTES_DESC` | Where each leader's attributes go. Off entirely: no leader starts with attributes, and everyone gets all twelve diplomatic actions instead, so it's even. |
| `LOC_LSHUF_KEEP_MINE_NAME` | Human players keep their own leader |
| `LOC_LSHUF_KEEP_MINE_DESC` | Each human player plays their chosen leader exactly as normal. Only the AI leaders are shuffled, among themselves. |
| `LOC_LSHUF_LEADERS_OUT_NAME` | Leaders that are shuffled |
| `LOC_LSHUF_LEADERS_OUT_DESC` | Unticked leaders play exactly as normal. Only leaders in this game are shuffled with each other, Random slots included. In an online game, if another human leaves their slot on Random, every ticked leader joins the shuffle, so a bonus can come from a leader who isn't playing. |
| `LOC_LSHUF_MODDED_ABILITIES_NAME` | Shuffle their abilities |
| `LOC_LSHUF_MODDED_ABILITIES_DESC` | Lets abilities of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_ATTRIBUTES_NAME` | Shuffle their attributes |
| `LOC_LSHUF_MODDED_ATTRIBUTES_DESC` | Lets attributes of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_BIASES_NAME` | Shuffle their start terrain |
| `LOC_LSHUF_MODDED_BIASES_DESC` | Lets start terrain of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_OUT_NAME` | Modded leaders that are shuffled |
| `LOC_LSHUF_MODDED_OUT_DESC` | The supported modded leaders you have installed. Unticked ones play exactly as their mod made them. |
| `LOC_LSHUF_POOL_NAME` | Leader pool |
| `LOC_LSHUF_POOL_DESC` | Tick leaders for the pool. A player slot set to Random from the pool gets one of them when the game starts; a slot on plain Random can still get any leader. |
| `LOC_LSHUF_PERSONALITY_NAME` | AI agendas |
| `LOC_LSHUF_PERSONALITY_DESC` | Whose agendas and favorite civilizations an AI leader plays by after the shuffle. |
| `LOC_LSHUF_DEALING_NAME` | Split fairness |
| `LOC_LSHUF_DEALING_DESC` | Only matters on a row set to Split up: whether each leader or civilization gets a fair share of the strong bonuses. |
| `LOC_LSHUF_REVEAL_NAME` | Reveal who got what |
| `LOC_LSHUF_REVEAL_DESC` | When you can see what the other leaders ended up with. |
| `LOC_LSHUF_SEED_NAME` | Shuffle number |
| `LOC_LSHUF_SEED_DESC` | The same number with the same settings and leaders gives the same shuffle, so a friend can play the same one. A new number is picked each time you set up a game, and it shows on the loading screen. |

## Option values

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NONE` | Base game |
| `LOC_LSHUF_MODE_NONE_DESC` | Nothing moves: every leader and civilization plays as shipped. A row set to Off entirely still applies. |
| `LOC_LSHUF_MODE_SWAP_ABILITIES` | Full random |
| `LOC_LSHUF_MODE_SWAP_ABILITIES_DESC` | Leader abilities swap whole, attributes split up, start terrain is a random roll. None of the three is tied to the others. |
| `LOC_LSHUF_MODE_SWAP_LEADERS` | Paired random |
| `LOC_LSHUF_MODE_SWAP_LEADERS_DESC` | Leader abilities swap whole, and the attributes and start terrain follow the ability, so each leader gets another leader's whole package. Amina might play with Pachacuti's mountain bonuses and start beside mountains. |
| `LOC_LSHUF_MODE_SPLIT_MATCHED` | Logical split random |
| `LOC_LSHUF_MODE_SPLIT_MATCHED_DESC` | Leader abilities and attributes split up: every bonus and attribute is dealt out to a random leader, each giving as many as it gets. Start terrain fits the bonuses, so whoever ends up with mountain bonuses starts near mountains. |
| `LOC_LSHUF_MODE_SPLIT_RANDOM` | Split random |
| `LOC_LSHUF_MODE_SPLIT_RANDOM_DESC` | The same deal as Logical split random, with start terrain a random roll instead. |
| `LOC_LSHUF_MODE_CUSTOM` | Custom |
| `LOC_LSHUF_MODE_CUSTOM_DESC` | The rows below were set by hand. |
| `LOC_LSHUF_A_NORMAL` | Base game |
| `LOC_LSHUF_A_NORMAL_DESC` | Each leader keeps its own ability. |
| `LOC_LSHUF_A_WHOLE` | Swap whole |
| `LOC_LSHUF_A_WHOLE_DESC` | Each leader gets another leader's whole ability. |
| `LOC_LSHUF_A_SPLIT` | Split up |
| `LOC_LSHUF_A_SPLIT_DESC` | Abilities are broken into their separate bonuses and dealt out to random leaders; each leader gets back as many as it gave. |
| `LOC_LSHUF_T_NORMAL` | Base game |
| `LOC_LSHUF_T_NORMAL_DESC` | Each leader keeps its own attributes. |
| `LOC_LSHUF_T_RANDOM` | Split up |
| `LOC_LSHUF_T_RANDOM_DESC` | Attributes are dealt out one by one to random leaders; each leader gets back as many as it gave. |
| `LOC_LSHUF_T_PAIRED` | Follows ability |
| `LOC_LSHUF_T_PAIRED_DESC` | The attributes go wherever the ability went: a leader takes the attributes of the leader whose ability it got (with split bonuses, the leader it got the most from). |
| `LOC_LSHUF_B_NORMAL` | Base game |
| `LOC_LSHUF_B_NORMAL_DESC` | Each leader and civilization keeps its own start terrain. |
| `LOC_LSHUF_B_MATCHED` | Logical with bonuses |
| `LOC_LSHUF_B_MATCHED_DESC` | Start terrain that is logical with the bonuses the leader now holds, so whoever has mountain bonuses starts near mountains; civilizations swap start terrain within their age. |
| `LOC_LSHUF_B_PAIRED` | Follows ability |
| `LOC_LSHUF_B_PAIRED_DESC` | The start terrain goes wherever the ability went; civilizations swap start terrain within their age. |
| `LOC_LSHUF_B_ROLLED` | Random roll |
| `LOC_LSHUF_B_ROLLED_DESC` | Start terrain is picked at random for every leader and civilization, from nobody in particular. |
| `LOC_LSHUF_CIV_ABILITIES_NAME` | Civilization abilities |
| `LOC_LSHUF_CIV_ABILITIES_DESC` | Where each civilization's ability goes, always within its own age. Off entirely: no civilization has an ability this game. |
| `LOC_LSHUF_CIV_UNIQUES_NAME` | Civilization uniques |
| `LOC_LSHUF_CIV_UNIQUES_DESC` | Where a civilization's unique units and improvements go (its unique buildings and quarters go with its civics). Off entirely: no civilization can build its uniques this game. |
| `LOC_LSHUF_CA_NORMAL` | Base game |
| `LOC_LSHUF_CA_NORMAL_DESC` | Each civilization keeps its own ability. |
| `LOC_LSHUF_CA_SPLIT` | Split up |
| `LOC_LSHUF_CA_SPLIT_DESC` | Civilization abilities are broken into their separate bonuses and dealt out to random civilizations of the same age; each civilization gets back as many as it gave. |
| `LOC_LSHUF_BUILD_KIND_CIVBULLET` | Civilization bonus |
| `LOC_LSHUF_CA_SWAPPED` | Swap whole |
| `LOC_LSHUF_CA_SWAPPED_DESC` | Each civilization gets another civilization's whole ability, from the same age. |
| `LOC_LSHUF_CU_NORMAL` | Base game |
| `LOC_LSHUF_CU_NORMAL_DESC` | Each civilization keeps its own uniques. |
| `LOC_LSHUF_CU_PAIRED` | Follows ability |
| `LOC_LSHUF_CU_PAIRED_DESC` | The uniques go wherever the civilization's ability went: whoever has Rome's ability also has the Legion. |
| `LOC_LSHUF_CU_SHUFFLED` | Swap whole |
| `LOC_LSHUF_CU_SHUFFLED_DESC` | Each civilization gets another same-age civilization's whole set of uniques, apart from the abilities. |
| `LOC_LSHUF_CIV_CIVICS_NAME` | Civilization civics |
| `LOC_LSHUF_CIV_CIVICS_DESC` | Where a civilization's unique civics go: its civics tree, its traditions, and the unique buildings, quarters and units those civics unlock. Off entirely: no civilization has unique civics this game. |
| `LOC_LSHUF_CC_NORMAL` | Base game |
| `LOC_LSHUF_CC_NORMAL_DESC` | Each civilization keeps its own civics. |
| `LOC_LSHUF_CC_PAIRED` | Follows ability |
| `LOC_LSHUF_CC_PAIRED_DESC` | The civics go wherever the civilization's ability went. |
| `LOC_LSHUF_CC_SHUFFLED` | Swap whole |
| `LOC_LSHUF_CC_SHUFFLED_DESC` | Each civilization gets another same-age civilization's civics, apart from the abilities. |
| `LOC_LSHUF_BUILD_KIND_CIVCIVICS` | Unique civics |
| `LOC_LSHUF_BUILD_SLOT_CIV_CIVICS` | Civics |
| `LOC_LSHUF_TREE_COST` | {1_Cost} [icon:YIELD_CULTURE] Culture |
| `LOC_LSHUF_BUILD_CIVICS_TREE` | [B]{1_Name}[/B] civics tree: {2_Civics}. |
| `LOC_LSHUF_BUILD_CIVICS_TRADITION` | Tradition [B]{1_Name}[/B]: {2_Text} |
| `LOC_LSHUF_BUILD_CIVICS_UNLOCK` | {1_Kind} [B]{2_Name}[/B]: {3_Text} |
| `LOC_LSHUF_REDEALT` | Shuffled |
| `LOC_LSHUF_REDEALT_DESC` | Moves between leaders as the preset says. |
| `LOC_LSHUF_OFF` | Off entirely |
| `LOC_LSHUF_OFF_DESC` | Taken out of the game for everyone, so it's even. A leader or civilization you built by hand keeps what you gave it. |
| `LOC_LSHUF_PERSONA_STAYS` | Base game |
| `LOC_LSHUF_PERSONA_STAYS_DESC` | An AI leader keeps its own agendas and favorite civilizations, while playing the bonuses it got. |
| `LOC_LSHUF_PERSONA_FOLLOWS` | Logical with bonuses |
| `LOC_LSHUF_PERSONA_FOLLOWS_DESC` | An AI leader plays by the agendas and favorite civilizations of the leader its bonuses came from. With split bonuses, the leader it got the most from. |
| `LOC_LSHUF_PERSONA_REDEALT` | Swap whole |
| `LOC_LSHUF_PERSONA_REDEALT_DESC` | Agendas and favorite civilizations swap between the AI leaders on their own, unconnected to the bonuses. |
| `LOC_LSHUF_DEAL_BALANCED` | Fair shares |
| `LOC_LSHUF_DEAL_BALANCED_DESC` | Each leader's bonuses add up to about the same strength, so nobody gets all the strong ones. |
| `LOC_LSHUF_DEAL_CHANCE` | Pure luck |
| `LOC_LSHUF_DEAL_CHANCE_DESC` | Bonuses go out at random, so one leader can end up much stronger than another. |
| `LOC_LSHUF_REVEAL_START` | From the start |
| `LOC_LSHUF_REVEAL_START_DESC` | The leader screens show what everyone got from the moment you set up the game. |
| `LOC_LSHUF_REVEAL_MET` | When you meet them |
| `LOC_LSHUF_REVEAL_MET_DESC` | You see your own at setup. Another leader's shows in the diplomacy panel and the Civilopedia after you've met them. |
| `LOC_LSHUF_RANDOM_POOL` | Random from the pool |
| `LOC_LSHUF_RANDOM_POOL_DESC` | A random leader from the Leader pool, picked when the game starts. If the pool is empty or every leader in it is taken, the slot gets a normal random leader. |
| `LOC_LSHUF_POOL_BADGE` | pool |

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
| `LOC_LSHUF_PIECE_REST` | Everything else from {1_Ability} |
| `LOC_LSHUF_DEAL_NUMBER` | Shuffle number: {1_Seed} |

## Reveal panel

| Key | English |
| --- | --- |
| `LOC_LSHUF_REVEAL_TITLE` | Who got what |
| `LOC_LSHUF_REVEAL_OPEN` | See who got what |
| `LOC_LSHUF_REVEAL_UNMET` | You haven't met this leader yet. |
| `LOC_LSHUF_REVEAL_TOO_FEW` | Fewer than two leaders were left to shuffle here, so this stays as normal. |
| `LOC_LSHUF_REVEAL_DIFFERS` | Another mod changed the leaders, so this shuffle is different from the one the setup screen showed. |
| `LOC_LSHUF_REVEAL_LEFT_OUT` | {1_Leader}: {2_Reason} |

## Reasons (each follows "Leader: " in the reveal panel)

| Key | English |
| --- | --- |
| `LOC_LSHUF_REASON_KEPT` | a human keeping their own leader |
| `LOC_LSHUF_REASON_LIST` | unticked in Leaders that are shuffled |
| `LOC_LSHUF_REASON_NOTINGAME` | not in this game |
| `LOC_LSHUF_REASON_MODDEDLIST` | unticked in Modded leaders that are shuffled |
| `LOC_LSHUF_REASON_UNKNOWN` | not supported by this mod yet, so it plays normally |
| `LOC_LSHUF_REASON_OBSERVER` | an observer, so it isn't shuffled |
| `LOC_LSHUF_REASON_MODDED_OFF` | shuffling this part of modded leaders is off |
| `LOC_LSHUF_REASON_MODDED_NOTOK` | its mod didn't pass the setup check |
| `LOC_LSHUF_REASON_MODDED_LEADERTYPE` | its ability checks for its own leader, so it can't move |
| `LOC_LSHUF_REASON_MODDED_CHANGED` | its ability has changed since it was checked, so it moves as one piece |
| `LOC_LSHUF_REASON_TOO_FEW` | fewer than two leaders were left to shuffle |
| `LOC_LSHUF_REASON_MODE_NONE` | the preset is Base game |
| `LOC_LSHUF_WHY_SCRIPT` | its mod now runs a gameplay script |
| `LOC_LSHUF_WHY_UISCRIPT` | its mod now runs an interface script |
| `LOC_LSHUF_WHY_IMPORTJS` | its mod now loads a script file |
| `LOC_LSHUF_WHY_MISSING` | its mod isn't installed and turned on |

## Gameplay traits

| Key | English |
| --- | --- |
| `LOC_LSHUF_TRAIT_DEALT_DESCRIPTION` | Bonuses this leader got from other leaders' abilities in the shuffle. The leader screens list each one. |
| `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_NAME` | Equal Footing |
| `LOC_LSHUF_TRAIT_EQUAL_ACTIONS_DESCRIPTION` | Leader attributes are off for this game, so each leader gets all twelve diplomatic actions the attributes would have unlocked. |
