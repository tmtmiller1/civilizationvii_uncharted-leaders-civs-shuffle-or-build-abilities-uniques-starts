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
| `LOC_LSHUF_MOD_NAME` | Uncharted Leaders & Civs |
| `LOC_LSHUF_MOD_DESCRIPTION` | Shuffles leader abilities, attributes and start terrain at the start of a game. Leaders can swap abilities, swap everything, or have the separate bonuses inside each ability mixed between them, and you can turn abilities, attributes or start terrain off for everyone. It works in multiplayer through the game's own lobby, and the game's leader screens show what each leader ended up with, including where they like to start. |

## The window

| Key | English |
| --- | --- |
| `LOC_LSHUF_WINDOW_TITLE` | Uncharted Leaders & Civs |
| `LOC_LSHUF_CLOSE` | Close |
| `LOC_LSHUF_HOST_ONLY` | Only the host can change these settings. You'll see them update here as the host changes them. |
| `LOC_LSHUF_LIST_ALL` | All |
| `LOC_LSHUF_LIST_NONE` | None |
| `LOC_LSHUF_SECTION_TITLE` | Uncharted Leaders & Civs Settings |
| `LOC_LSHUF_BTN_LEADERS` | Choose which leaders are shuffled... |
| `LOC_LSHUF_BTN_POOLS` | Leader pool... |
| `LOC_LSHUF_BTN_MODDED` | Leaders from other mods... |
| `LOC_LSHUF_BTN_CIVS` | Civilization pool... |
| `LOC_LSHUF_BTN_BUILD` | Build your own leader... |
| `LOC_LSHUF_BTN_BUILD_CIV` | Build your own civilization... |
| `LOC_LSHUF_BUILD_CIV_TITLE` | Build your own civilization |
| `LOC_LSHUF_BUILD_YOUR_CIV` | Your civilization: {1_Name} |
| `LOC_LSHUF_BUILD_NO_CIV` | Pick your civilization to start. |
| `LOC_LSHUF_BUILD_CIV_INTRO` | Click a card to add it. Click a slot to remove it. |
| `LOC_LSHUF_BUILD_FOR` | Building for |
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
| `LOC_LSHUF_BUILD_CIV_SWAP_NOTE` | Taking a whole ability swaps it: that civilization gets yours. |
| `LOC_LSHUF_BUILD_CIV_UNIQUES_ADD_NOTE` | You keep your own uniques. These are added. |
| `LOC_LSHUF_BUILD_CIV_UNIQUES_SPLIT_NOTE` | Your own uniques are shuffled away. You play with these. |
| `LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_ADD` | Added uniques |
| `LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_KEPT` | Your uniques |
| `LOC_LSHUF_BUILD_EVERY_AGE_TIP` | Also show abilities and start terrain from other ages. |
| `LOC_LSHUF_BUILD_SLOT_RIDER` | Comes with {2_Lead}. Click to remove both. |
| `LOC_LSHUF_BUILD_GROUP_TIP_ABILITY` | Single bonuses, or one whole ability. |
| `LOC_LSHUF_BUILD_GROUP_TIP_ATTRIBUTES` | Attributes, one per slot. |
| `LOC_LSHUF_BUILD_GROUP_TIP_BEHAVIOR` | How the AI plays your leader. |
| `LOC_LSHUF_BUILD_GROUP_TIP_TERRAIN` | Where your leader starts. |
| `LOC_LSHUF_BUILD_GROUP_TIP_CIV_ABILITY` | Single bonuses, or one whole ability. |
| `LOC_LSHUF_BUILD_GROUP_TIP_CIV_UNIQUES` | Unique units, one per slot. |
| `LOC_LSHUF_BUILD_GROUP_TIP_CIV_CIVICS` | Single civics, or one whole civics tree. |
| `LOC_LSHUF_BUILD_GROUP_TIP_CIV_TERRAIN` | Where your civilization starts. |
| `LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_KEPT_TIP` | You keep this one. |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_UNIT` | Unique unit |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_BUILDING` | Unique building |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_QUARTER` | Unique quarter (with its two buildings) |
| `LOC_LSHUF_BUILD_UNIQUE_KIND_IMPROVEMENT` | Unique improvement |
| `LOC_LSHUF_BUILD_TITLE` | Build your own leader |
| `LOC_LSHUF_BUILD_INTRO` | Click a card to add it. Click a slot to remove it. The AI leaders share whatever you leave. |
| `LOC_LSHUF_BUILD_SELECT` | Select |
| `LOC_LSHUF_CU_SPLIT_DESC` | Each unique goes to a random civilization. Everyone gets the same number back. |
| `LOC_LSHUF_CC_SPLIT_DESC` | Each civic goes to a random civilization. Everyone gets the same number back. |
| `LOC_LSHUF_BUILD_MODE_AUTO` | Leader mode is No shuffle. Take a card and Leader mode switches to Mix bonuses, random start. |
| `LOC_LSHUF_BUILD_MODE_TURNED_ON` | Leader mode is now Mix bonuses, random start. |
| `LOC_LSHUF_POOL_BADGE` | Pool |
| `LOC_LSHUF_POOL_TIP` | Leader pool: choose which leaders Random can pick. |
| `LOC_LSHUF_BUILD_PAGE_ME_LEADER` | Your leader |
| `LOC_LSHUF_BUILD_PAGE_ME_CIV` | Your civilization |
| `LOC_LSHUF_BUILD_SHUFFLE_TITLE` | Shuffle for everyone |
| `LOC_LSHUF_BUILD_SHUFFLE_NOTE` | These shuffle abilities, attributes and start terrain at random for the whole game, AI players included. You don't need to build anything to use them. |
| `LOC_LSHUF_BUILD_SHUFFLE_NOTE_CIV` | These shuffle civilization abilities, uniques and civics at random for the whole game, AI players included. You don't need to build anything to use them. |
| `LOC_LSHUF_CIV_POOL_TIP` | Civilization pool: choose which civilizations Random can pick. |
| `LOC_LSHUF_BTN_AI_PLAYERS` | AI players... |
| `LOC_LSHUF_AI_PLAYERS_TITLE` | AI players |
| `LOC_LSHUF_AI_PLAYERS_NOTE` | Random draws from the Leader pool and Civilization pool. |
| `LOC_LSHUF_AI_PLAYER_N` | AI {1_Num} |
| `LOC_LSHUF_AI_PLAYERS_NONE` | No AI players in this game. |
| `LOC_LSHUF_BUILD_NONE_YET` | not picked yet |
| `LOC_LSHUF_BUILD_YOUR_LEADER` | Your leader: {1_Name} |
| `LOC_LSHUF_BUILD_NO_LEADER` | Pick your leader to start. |
| `LOC_LSHUF_BUILD_MODE_OFF` | Leader mode is No shuffle, so these picks won't be used. Pick a Leader mode to build. |
| `LOC_LSHUF_BUILD_HOST_ONLY` | Only the host builds a leader in this version. |
| `LOC_LSHUF_BUILD_SLOTS_ABILITY` | Ability |
| `LOC_LSHUF_BUILD_SLOTS_ATTRIBUTES` | Attributes |
| `LOC_LSHUF_BUILD_SLOT_BEHAVIOR` | AI behavior |
| `LOC_LSHUF_BUILD_SLOT_TERRAIN` | Start terrain |
| `LOC_LSHUF_BUILD_SLOT_CIV_TERRAIN` | Civilization start terrain |
| `LOC_LSHUF_BUILD_SLOT_EMPTY` | Empty |
| `LOC_LSHUF_BUILD_SLOTS_FULL` | Slots full. Click a slot to remove it. |
| `LOC_LSHUF_BUILD_SEARCH` | Search |
| `LOC_LSHUF_BUILD_FILTER_KIND` | Show: {1_Kind} |
| `LOC_LSHUF_BUILD_FILTER_TYPE` | Type: {1_Type} |
| `LOC_LSHUF_BUILD_FILTER_LEADER` | Leader: {1_Leader} |
| `LOC_LSHUF_BUILD_FILTER_ALL` | All |
| `LOC_LSHUF_BUILD_KIND_BULLET` | Ability bonuses |
| `LOC_LSHUF_BUILD_KIND_WHOLE` | Leader ability |
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
| `LOC_LSHUF_ADVANCED_TITLE` | Uncharted Leaders & Civs advanced settings |
| `LOC_LSHUF_CIVS_OUT_NAME` | Civilization pool |
| `LOC_LSHUF_CIVS_OUT_DESC` | Random slots only get ticked civilizations. A civilization someone picks by hand stays. Applies at game start. |
| `LOC_LSHUF_LIST_COUNT` | {1_On} of {2_Total} on |
| `LOC_LSHUF_SEED_NEW` | New number |
| `LOC_LSHUF_SEED_RANGE` | A number from {1_Min} to {2_Max} |
| `LOC_LSHUF_MODDED_NONE_INSTALLED` | None of the leader mods this mod supports are installed and turned on, so leaders from other mods play normally. |

## Window headings

| Key | English |
| --- | --- |
| `LOC_LSHUF_HEADING_MODDED` | Leaders from other mods |
| `LOC_LSHUF_HEADING_POOLS` | Leader pool |

## Options

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NAME` | Leader mode |
| `LOC_LSHUF_MODE_DESC` | How leaders get shuffled. Picking one sets the Leader rows below. |
| `LOC_LSHUF_BIASES_NAME` | Leader start terrain |
| `LOC_LSHUF_BIASES_DESC` | Where each leader likes to start. |
| `LOC_LSHUF_ABILITIES_NAME` | Leader abilities |
| `LOC_LSHUF_ABILITIES_DESC` | Where each leader's ability goes. |
| `LOC_LSHUF_ATTRIBUTES_NAME` | Leader attributes |
| `LOC_LSHUF_ATTRIBUTES_DESC` | Where each leader's attributes go. |
| `LOC_LSHUF_KEEP_MINE_NAME` | Human players keep their own leader |
| `LOC_LSHUF_KEEP_BUILT_CIV_NAME` | Keep my built civilization |
| `LOC_LSHUF_KEEP_BUILT_CIV_DESC` | Your built civilization still applies when you keep your own leader. |
| `LOC_LSHUF_KEEP_MINE_DESC` | Human players keep their chosen leader. Only the AI leaders are shuffled. |
| `LOC_LSHUF_LEADERS_OUT_NAME` | Leaders that are shuffled |
| `LOC_LSHUF_LEADERS_OUT_DESC` | Unticked leaders play as normal. |
| `LOC_LSHUF_MODDED_ABILITIES_NAME` | Shuffle their abilities |
| `LOC_LSHUF_MODDED_ABILITIES_DESC` | Lets abilities of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_ATTRIBUTES_NAME` | Shuffle their attributes |
| `LOC_LSHUF_MODDED_ATTRIBUTES_DESC` | Lets attributes of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_BIASES_NAME` | Shuffle their start terrain |
| `LOC_LSHUF_MODDED_BIASES_DESC` | Lets start terrain of supported leaders from other mods into the shuffle. The leader's mod has to be installed, turned on, and pass a check when the game is set up. Other modded leaders play normally. |
| `LOC_LSHUF_MODDED_OUT_NAME` | Modded leaders that are shuffled |
| `LOC_LSHUF_MODDED_OUT_DESC` | The supported modded leaders you have installed. Unticked ones play exactly as their mod made them. |
| `LOC_LSHUF_POOL_NAME` | Leader pool |
| `LOC_LSHUF_POOL_DESC` | Random slots only get ticked leaders. A leader someone picks by hand stays. |
| `LOC_LSHUF_PERSONALITY_NAME` | AI agendas |
| `LOC_LSHUF_PERSONALITY_DESC` | How the AI leaders behave after the shuffle. |
| `LOC_LSHUF_DEALING_NAME` | Split fairness |
| `LOC_LSHUF_DEALING_DESC` | For Split up: whether strong bonuses are shared out evenly. |
| `LOC_LSHUF_REVEAL_NAME` | Reveal who got what |
| `LOC_LSHUF_REVEAL_DESC` | When you can see what other leaders got. |
| `LOC_LSHUF_SEED_NAME` | Shuffle number |
| `LOC_LSHUF_SEED_DESC` | The same number and settings give the same shuffle. Share it to play the same one. |

## Option values

| Key | English |
| --- | --- |
| `LOC_LSHUF_MODE_NONE` | No shuffle |
| `LOC_LSHUF_MODE_NONE_DESC` | Every leader plays as normal. |
| `LOC_LSHUF_MODE_SWAP_ABILITIES` | Swap partial |
| `LOC_LSHUF_MODE_SWAP_ABILITIES_DESC` | Each leader gets another leader's whole ability. Attributes are dealt out separately, and start terrain is a random roll. |
| `LOC_LSHUF_MODE_SWAP_LEADERS` | Swap whole |
| `LOC_LSHUF_MODE_SWAP_LEADERS_DESC` | Each leader gets another leader's ability, attributes and start terrain, all from the same leader. |
| `LOC_LSHUF_MODE_SPLIT_MATCHED` | Mix bonuses |
| `LOC_LSHUF_MODE_SPLIT_MATCHED_DESC` | Abilities are split into bonuses, and every bonus and attribute goes to a random leader. Start terrain suits the bonuses each leader got. |
| `LOC_LSHUF_MODE_SPLIT_RANDOM` | Mix bonuses, random start |
| `LOC_LSHUF_MODE_SPLIT_RANDOM_DESC` | Abilities are split into bonuses, and every bonus and attribute goes to a random leader. Start terrain is random. |
| `LOC_LSHUF_MODE_CUSTOM` | Custom |
| `LOC_LSHUF_MODE_CUSTOM_DESC` | You changed a Leader row by hand. |
| `LOC_LSHUF_CIV_MODE_NAME` | Civilization mode |
| `LOC_LSHUF_CIV_MODE_DESC` | How civilizations get shuffled. Picking one sets the Civilization rows below. Civilizations only trade within their age. |
| `LOC_LSHUF_CM_NORMAL` | No shuffle |
| `LOC_LSHUF_CM_NORMAL_DESC` | Every civilization plays as normal. |
| `LOC_LSHUF_CM_WHOLE` | Swap whole |
| `LOC_LSHUF_CM_WHOLE_DESC` | Each civilization gets another civilization's ability, uniques and civics, all from the same civilization. |
| `LOC_LSHUF_CM_PARTIAL` | Swap partial |
| `LOC_LSHUF_CM_PARTIAL_DESC` | Each civilization gets another civilization's whole ability. Its uniques and its civics each come whole from other civilizations. |
| `LOC_LSHUF_CM_SPLIT` | Mix bonuses |
| `LOC_LSHUF_CM_SPLIT_DESC` | Abilities are split into bonuses, and every bonus, unique and civic goes to a random civilization. |
| `LOC_LSHUF_CM_CUSTOM` | Custom |
| `LOC_LSHUF_CM_CUSTOM_DESC` | You changed a Civilization row by hand. |
| `LOC_LSHUF_A_NORMAL` | Base game |
| `LOC_LSHUF_A_NORMAL_DESC` | Each leader keeps its own. |
| `LOC_LSHUF_A_WHOLE` | Swap whole |
| `LOC_LSHUF_A_WHOLE_DESC` | Each leader gets another leader's whole ability. |
| `LOC_LSHUF_A_SPLIT` | Split up |
| `LOC_LSHUF_A_SPLIT_DESC` | Each bonus goes to a random leader. Everyone gets the same number back. |
| `LOC_LSHUF_T_NORMAL` | Base game |
| `LOC_LSHUF_T_NORMAL_DESC` | Each leader keeps its own. |
| `LOC_LSHUF_T_RANDOM` | Split up |
| `LOC_LSHUF_T_RANDOM_DESC` | Each attribute goes to a random leader. Everyone gets the same number back. |
| `LOC_LSHUF_T_PAIRED` | Follows ability |
| `LOC_LSHUF_T_PAIRED_DESC` | Attributes go with the ability. |
| `LOC_LSHUF_B_NORMAL` | Base game |
| `LOC_LSHUF_B_NORMAL_DESC` | Each leader and civilization keeps its own. |
| `LOC_LSHUF_B_MATCHED` | Logical with bonuses |
| `LOC_LSHUF_B_MATCHED_DESC` | Start terrain suits the bonuses each leader got. |
| `LOC_LSHUF_B_PAIRED` | Follows ability |
| `LOC_LSHUF_B_PAIRED_DESC` | Start terrain goes with the ability. |
| `LOC_LSHUF_B_ROLLED` | Random roll |
| `LOC_LSHUF_B_ROLLED_DESC` | Start terrain is random. |
| `LOC_LSHUF_CIV_ABILITIES_NAME` | Civilization abilities |
| `LOC_LSHUF_CIV_ABILITIES_DESC` | Where each civilization's ability goes, with its attribute tags. Civilizations only trade within their age. |
| `LOC_LSHUF_CIV_UNIQUES_NAME` | Civilization uniques |
| `LOC_LSHUF_CIV_UNIQUES_DESC` | Where each civilization's unique units go. |
| `LOC_LSHUF_CA_NORMAL` | Base game |
| `LOC_LSHUF_CA_NORMAL_DESC` | Each civilization keeps its own. |
| `LOC_LSHUF_CA_SPLIT` | Split up |
| `LOC_LSHUF_CA_SPLIT_DESC` | Each bonus goes to a random civilization. Everyone gets the same number back. |
| `LOC_LSHUF_BUILD_KIND_CIVBULLET` | Civilization bonus |
| `LOC_LSHUF_CA_SWAPPED` | Swap whole |
| `LOC_LSHUF_CA_SWAPPED_DESC` | Each civilization gets another's whole ability. |
| `LOC_LSHUF_CU_NORMAL` | Base game |
| `LOC_LSHUF_CU_NORMAL_DESC` | Each civilization keeps its own. |
| `LOC_LSHUF_CU_PAIRED` | Follows ability |
| `LOC_LSHUF_CU_PAIRED_DESC` | Uniques go with the ability. |
| `LOC_LSHUF_CU_SHUFFLED` | Swap whole |
| `LOC_LSHUF_CU_SHUFFLED_DESC` | Each civilization gets another's whole set. |
| `LOC_LSHUF_CIV_CIVICS_NAME` | Civilization civics |
| `LOC_LSHUF_CIV_CIVICS_DESC` | Where each civilization's civics go, with the traditions, buildings and quarters they unlock. |
| `LOC_LSHUF_CC_NORMAL` | Base game |
| `LOC_LSHUF_CC_NORMAL_DESC` | Each civilization keeps its own. |
| `LOC_LSHUF_CC_PAIRED` | Follows ability |
| `LOC_LSHUF_CC_PAIRED_DESC` | Civics go with the ability. |
| `LOC_LSHUF_CC_SHUFFLED` | Swap whole |
| `LOC_LSHUF_CC_SHUFFLED_DESC` | Each civilization gets another's whole civics tree. |
| `LOC_LSHUF_BUILD_KIND_CIVCIVICS` | Civics |
| `LOC_LSHUF_BUILD_SLOT_CIV_CIVICS` | Civics |
| `LOC_LSHUF_TREE_COST` | {1_Cost} [icon:YIELD_CULTURE] Culture |
| `LOC_LSHUF_BUILD_CIVICS_TREE` | [B]{1_Name}[/B] civics tree: {2_Civics}. |
| `LOC_LSHUF_BUILD_TREE_BUTTON` | Tree |
| `LOC_LSHUF_BUILD_TREE_CIV` | Civilization |
| `LOC_LSHUF_BUILD_NEEDS` | {1_Card} goes with the {2_Unique}. |
| `LOC_LSHUF_BUILD_NEEDS_TAKE` | Take the {1_Unique} too |
| `LOC_LSHUF_BUILD_ADVANCED_SHOW` | Advanced |
| `LOC_LSHUF_BUILD_ADVANCED_HIDE` | Hide advanced |
| `LOC_LSHUF_BUILD_GOES_WITH` | Goes with {1_Name} |
| `LOC_LSHUF_BUILD_GOES_WITH_TIP` | This comes with {1_Name}. Click to take {1_Name}. |
| `LOC_LSHUF_BUILD_CARD_GOES_WITH_MISSING` | Comes with a civic or unique that isn't on this screen. |
| `LOC_LSHUF_BUILD_NEEDS_BONUS` | {1_Card} goes with {2_Card}. |
| `LOC_LSHUF_BUILD_NEEDS_BONUS_TAKE` | Take {1_Card} too |
| `LOC_LSHUF_BUILD_WITH` | With: {1_Names} |
| `LOC_LSHUF_BUILD_CARD_BUNDLE_FULL` | Takes {1_Count} slots, one for each part that comes with it. |
| `LOC_LSHUF_BUILD_CIVICS_TRADITION` | Tradition [B]{1_Name}[/B]: {2_Text} |
| `LOC_LSHUF_BUILD_CIVICS_UNLOCK` | {1_Kind} [B]{2_Name}[/B]: {3_Text} |
| `LOC_LSHUF_BUILD_CIVICS_UNLOCK_NAME` | {1_Kind} [B]{2_Name}[/B] |
| `LOC_LSHUF_REDEALT` | Shuffled |
| `LOC_LSHUF_REDEALT_DESC` | Shuffled as the Leader mode says. |
| `LOC_LSHUF_OFF` | Off entirely |
| `LOC_LSHUF_OFF_DESC` | Removed for everyone. Hand-built leaders and civilizations keep their picks. |
| `LOC_LSHUF_PERSONA_STAYS` | Base game |
| `LOC_LSHUF_PERSONA_STAYS_DESC` | Each AI keeps its own agendas. |
| `LOC_LSHUF_PERSONA_FOLLOWS` | Logical with bonuses |
| `LOC_LSHUF_PERSONA_FOLLOWS_DESC` | Each AI plays like the leader its bonuses came from. |
| `LOC_LSHUF_PERSONA_REDEALT` | Swap whole |
| `LOC_LSHUF_PERSONA_REDEALT_DESC` | Agendas are shuffled on their own. |
| `LOC_LSHUF_DEAL_BALANCED` | Fair shares |
| `LOC_LSHUF_DEAL_BALANCED_DESC` | Everyone gets about the same strength. |
| `LOC_LSHUF_DEAL_CHANCE` | Pure luck |
| `LOC_LSHUF_DEAL_CHANCE_DESC` | Purely random. Some leaders end up stronger. |
| `LOC_LSHUF_REVEAL_START` | From the start |
| `LOC_LSHUF_REVEAL_START_DESC` | See everyone's from the start. |
| `LOC_LSHUF_REVEAL_MET` | When you meet them |
| `LOC_LSHUF_REVEAL_MET_DESC` | See another leader's once you've met them. |

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
| `LOC_LSHUF_REASON_MODE_NONE` | Leader mode is No shuffle |
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
