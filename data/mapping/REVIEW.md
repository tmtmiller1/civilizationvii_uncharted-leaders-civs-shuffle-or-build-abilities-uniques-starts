# Mapping review list

Built 2026-11-06 by scripts/mapping/build-mapping.mjs from the compiled Debug databases and the listed leader mods'
files on tp-share. Nothing in the game's data links an ability bullet to its modifiers, so every match below with more
than one bullet is a guess drafted from the bullet text against the modifiers' arguments and requirements
(scripts/mapping/vanilla-draft.mjs and modded-draft.mjs). Every row ships Reviewed = 0, so the split modes deal each
of these leaders whole until you confirm its rows. Nothing here has been watched in a game.

To confirm a leader, check each bullet's modifiers and value below, fix the draft file if something's wrong, rerun the
script, and then mark its rows reviewed. Value runs 1 (small) to 5 (large) and is a rough feel for the Balanced deal;
drawbacks score 1 because the scale has no negatives.

## Totals

- 38 base game and DLC leaders, 27 listed modded leaders.
- 258 pieces (195 bullets, 63 agenda pieces); 198 of them are guesses.
- 554 ability modifiers: 533 placed in a piece, 21 unplaced (they stay in the leader's remainder).
- 153 legend-node unlocks recorded (base game and DLC only).
- 47 base game and DLC modifiers (92 with the modded ones) name a specific civ, unit, unit class, building,
  improvement or project; 51 pieces carry a SpecificTo flag.
- 2 pieces set Movable = 0; 2 modded abilities have no bullets and can only be dealt whole.

## Things to decide first

- Agenda modifiers. CONTRACTS 4.3 names DIPLOMACY_AGENDA_TIMED_UPDATE, but three leaders carry agenda rows with other
  effects: Harriet Tubman's Veracity is EFFECT_DIPLOMACY_AGENDA_ON_WAR_START (her only agenda row), Tecumseh's first
  Suzerain of the World row is EFFECT_DIPLOMACY_AGENDA_ON_DISPERSE_IP, and Franklin's FRANKLIN_MOD_AGENDA_CIVIC_VIRTUE
  is EFFECT_BASIC_DIPLOMACY_MODS carrying the agenda's own name (ModName LOC_DIPLOMACY_AGENDA_CIVIC_VIRTUE_NAME). The
  script puts all three on the agenda piece and marks those pieces Guess = 1. That makes 40 agenda rows across 38
  leaders, where SPEC 2 counts 37.
- Ibn Battuta's Wildcard bullet. Its modifier, IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE, is EFFECT_DO_NOTHING, and nothing
  in the database or the game's scripts grants the two Wildcard points, so the engine keys the grant to something
  else. Whether another leader holding this piece gets the points needs a lab check. His two hidden Expansionist
  unlocks and his three legend-node unlocks ride with this piece.
- Yi Sun-sin's first bullet. The free Fleet Commander moves, but building them in Antiquity needs
  TRAIT_UNLOCK_FLEET_COMMANDER, which stays with Yi (CONTRACTS 12.4), and so does the Discipline civic unlock when he
  keeps most of his pieces. Another leader may get one free commander and no way to build more.
- Genghis Khan. One modifier (GENGHIS_KHAN_ARMY_COMMANDER_ABILITY) carries bullets 2 and 3 and the +5 of bullet 1. The
  draft puts it on bullet 2 and sets bullet 3 to Movable = 0 since it has no modifier of its own.
- Shipped start biases that no bullet explains: Confucius Grassland, Hatshepsut Desert, Jose Rizal Tropical, Xerxes
  and Xerxes (alt) Desert, Ibn Battuta Flat, Charlemagne River, Trung Trac Vegetated. In Split random these leaders'
  bias tags come only from their bullets, so these leanings drop out. Coast tags on naval bullets are drafted from
  text; the data only names coasts through requirements, and none of the base game's ability modifiers has one.
- SpecificTo holds every civ, unit, unit class, building, improvement or project type a piece reaches, as |A|B|,
  because several pieces name more than one. Going by the data, every base game and DLC piece still works on another
  leader, so only two bullets set Movable = 0, both with no modifier at all (Genghis Khan bullet 3, Akyuu bullet 3).

## Base game and DLC leaders

### Ada Lovelace (LEADER_ADA_LOVELACE)

Ability TRAIT_LEADER_ADA_LOVELACE_ABILITY; frontend LeaderItems agrees; 3 modifiers, 2 bullets; no shipped leader
biases.

- Agenda (LEADER_ADA_LOVELACE__AGENDA), Analytical Engine: ADA_LOVELACE_MOD_AGENDA_ANALYTICAL_ENGINE.
- Bullet 1 (LEADER_ADA_LOVELACE__B01), value 3, guess: "Cities receive +2 Science per Age when you complete a Civic
  Mastery. This resets at the start of each Age."
  - Modifiers: ADA_LOVELACE_MOD_CIVIC_MASTERY.
  - Why: Science per unlocked civic depth node (SYSTEM_CULTURE): the civic-mastery bullet.
- Bullet 2 (LEADER_ADA_LOVELACE__B02), value 3, guess: "Gain Culture equal to 100% of your total Science per turn when
  you complete a Technology Mastery."
  - Modifiers: ADA_LOVELACE_MOD_TECH_MASTERY.
  - Why: Culture from Science on tech depth 2 (SYSTEM_TECH): the tech-mastery bullet.
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Alexander (LEADER_ALEXANDER)

Ability TRAIT_LEADER_ALEXANDER_ABILITY; frontend LeaderItems agrees; 12 modifiers, 4 bullets; no shipped leader
biases.

- Agenda (LEADER_ALEXANDER__AGENDA), Godlike Basileus: ALEXANDER_MOD_AGENDA_GODLIKE_BASILEUS.
- Bullet 1 (LEADER_ALEXANDER__B01), value 3, guess: "Cities other than your Capital with a Wonder get +10% Production
  and Culture, doubled if they are on a different Continent than your Capital."
  - Modifiers: ALEXANDER_YIELD_BONUS_WITH_WONDER_CAPITAL_CONT, ALEXANDER_YIELD_BONUS_WITH_WONDER_NOT_CAPITAL_CONT.
  - Why: +10% / +20% Production and Culture in non-capital cities with a wonder, split by capital continent.
- Bullet 2 (LEADER_ALEXANDER__B02), value 3, guess: "+2 Combat Strength for Land Military Units. +1 Combat Strength
  for Unique Military Units for every City with a Wonder other than your Capital (max 6)."
  - Modifiers: ALEXANDER_COMBAT_BONUS_BASE, ALEXANDER_WONDER_COMBAT_STRENGTH_1, ALEXANDER_WONDER_COMBAT_STRENGTH_2,
    ALEXANDER_WONDER_COMBAT_STRENGTH_3, ALEXANDER_WONDER_COMBAT_STRENGTH_4, ALEXANDER_WONDER_COMBAT_STRENGTH_5,
    ALEXANDER_WONDER_COMBAT_STRENGTH_6.
  - Why: Land-unit combat base plus the six counted steps (1 to 6 wonder cities) on UNIT_CLASS_UNIQUE units.
  - SpecificTo: |UNIT_CLASS_UNIQUE|
- Bullet 3 (LEADER_ALEXANDER__B03), value 2, guess: "+2 Dominion for every City with a Wonder other than your
  Capital."
  - Modifiers: ALEXANDER_MOD_SETTLEMENT_MILITARY_VICTORY.
  - Why: Activates VICTORY_TRACKER_SETTLEMENT_ALEXANDER, the Dominion-per-wonder-city tracker.
- Bullet 4 (LEADER_ALEXANDER__B04), value 1, guess: "Towns converted into Cities are renamed after Alexander."
  - Modifiers: ALEXANDER_MOD_ALEXANDRIA_RENAME.
  - Why: City rename on REQUIREMENT_TOWN_WAS_UPGRADED_TO_CITY.
  - Note: Flavor only. Another leader holding it renames upgraded towns after Alexander.
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_MILITARISTIC 1).

### Amina (LEADER_AMINA)

Ability TRAIT_LEADER_AMINA_ABILITY; frontend LeaderItems agrees; 4 modifiers, 3 bullets; shipped leader biases: Biomes
BIOME_PLAINS 20, Biomes BIOME_DESERT 20.

- Agenda (LEADER_AMINA__AGENDA), Desert of the Warrior Queen: AMINA_MOD_AGENDA_DESERT_OF_THE_WARRIOR_QUEEN.
- Bullet 1 (LEADER_AMINA__B01), value 3, guess: "+1 Resource Capacity in Cities."
  - Modifiers: AMINA_MOD_RESOURCE_CAPACITY.
  - Why: EFFECT_CITY_ADJUST_RESOURCE_CAP +1 in cities.
- Bullet 2 (LEADER_AMINA__B02), value 2, guess: "+1 Gold per Age for each Resource assigned to Cities."
  - Modifiers: AMINA_MOD_RESOURCE_GOLD.
  - Why: Gold per assigned resource in cities.
- Bullet 3 (LEADER_AMINA__B03), value 2, guess: "+5 Combat Strength for Land Units in Plains and Desert."
  - Modifiers: AMINA_LEAD_MOD_CHECK_FOR_BIOME.
  - Why: Grants ABILITY_AMINA_CHECK_FOR_BIOME, the Plains/Desert combat ability.
  - Bias tags: BIOME_DESERT, BIOME_PLAINS read from requirements or adjacencies.
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_MILITARISTIC 1).

### Ashoka, World Renouncer (LEADER_ASHOKA)

Ability TRAIT_LEADER_ASHOKA_ABILITY; frontend LeaderItems agrees; 8 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_ASHOKA__AGENDA), Without Sorrow: ASHOKA_MOD_AGENDA_WITHOUT_SORROW.
- Bullet 1 (LEADER_ASHOKA__B01), value 3, guess: "+1 Food in Cities for every 5 excess Happiness."
  - Modifiers: ASHOKA_MOD_HAPPINESS_FOOD.
  - Why: Food per 5 surplus Happiness (Divisor 5).
- Bullet 2 (LEADER_ASHOKA__B02), value 2, guess: "+10% Food in Happy Settlements during a Celebration, or 15% in
  Joyous Settlements, or 20% in Ecstatic Settlements."
  - Modifiers: ASHOKA_MOD_CELEBRATION_FOOD_HAPPY, ASHOKA_MOD_CELEBRATION_FOOD_JOYOUS,
    ASHOKA_MOD_CELEBRATION_FOOD_ECSTATIC.
  - Why: +10% / +5% / +5% Food in a celebration by happiness stage, which stacks to the bullet's 10/15/20%.
- Bullet 3 (LEADER_ASHOKA__B03), value 3, guess: "Unique, Happiness, and Food Buildings gain a +1 Happiness adjacency
  for all Improvements."
  - Modifiers: ASHOKA_MOD_WILDCARD_UNIQUE_BUILDING_ADJACENCY_TO_IMPROVEMENTS,
    ASHOKA_MOD_WILDCARD_HAPPINESS_BUILDING_ADJACENCY_TO_IMPROVEMENTS,
    ASHOKA_MOD_WILDCARD_FOOD_BUILDING_ADJACENCY_TO_IMPROVEMENTS.
  - Why: The three adjacency activations (unique, Happiness and Food buildings next to improvements).
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_EXPANSIONIST 1).

### Ashoka, World Conqueror (LEADER_ASHOKA_ALT)

Ability TRAIT_LEADER_ASHOKA_ALT_ABILITY; frontend LeaderItems agrees; 5 modifiers, 4 bullets; no shipped leader
biases.

- Agenda (LEADER_ASHOKA_ALT__AGENDA), Without Regret: ASHOKA_ALT_MOD_AGENDA_WITHOUT_REGRET.
- Bullet 1 (LEADER_ASHOKA_ALT__B01), value 3, guess: "+1 Production for every 5 excess Happiness in Cities."
  - Modifiers: ASHOKA_ALT_MOD_HAPPINESS_PRODUCTION.
  - Why: Production per 5 surplus Happiness in cities.
- Bullet 2 (LEADER_ASHOKA_ALT__B02), value 2, guess: "+10% Production in Settlements not founded by you."
  - Modifiers: ASHOKA_ALT_MOD_CAPTURED_SETTLEMENT_PRODUCTION.
  - Why: +10% Production where NOT REQUIREMENT_CITY_IS_ORIGINAL_OWNER.
- Bullet 3 (LEADER_ASHOKA_ALT__B03), value 3, guess: "Declaring a Formal War grants a Celebration."
  - Modifiers: ASHOKA_ALT_MOD_WAR_CELEBRATION.
  - Why: Golden age on declaring a formal war.
- Bullet 4 (LEADER_ASHOKA_ALT__B04), value 2, guess: "+5 Combat Strength against Fortified Districts for all Units
  during a Celebration."
  - Modifiers: ASHOKA_ALT_MOD_CONQUEROR_ABILITY.
  - Why: Unit combat modifier attached while in a golden age (celebration).
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Augustus (LEADER_AUGUSTUS)

Ability TRAIT_LEADER_AUGUSTUS_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_AUGUSTUS__AGENDA), Restitutor Orbis: AUGUSTUS_MOD_AGENDA_RESTITUTOR_ORBIS.
- Bullet 1 (LEADER_AUGUSTUS__B01), value 4, guess: "+2 Production in the Capital for every Town."
  - Modifiers: AUGUSTUS_MOD_CAPITAL_PRODUCTION_PER_TOWN.
  - Why: +2 Production in the capital per town.
- Bullet 2 (LEADER_AUGUSTUS__B02), value 2, guess: "Can purchase Culture Buildings in Towns with any Focus."
  - Modifiers: AUGUSTUS_MOD_TOWN_CULTURE_BUILDING.
  - Why: Towns can purchase CULTURE-tagged constructibles.
- Bullet 3 (LEADER_AUGUSTUS__B03), value 2, guess: "+15% Gold towards purchasing Buildings in Towns. Doubled if that
  Building is present in your Capital."
  - Modifiers: AUGUSTUS_MOD_TOWN_PURCHASE_RATE, AUGUSTUS_MOD_TOWN_PURCHASE_RATE_SAME_BUILDING_IN_CAPITAL.
  - Why: 15% town building purchase efficiency, plus 15% more when the capital has the same building.
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_EXPANSIONIST 1).

### Benjamin Franklin (LEADER_BENJAMIN_FRANKLIN)

Ability TRAIT_LEADER_BENJAMIN_FRANKLIN_ABILITY; frontend LeaderItems agrees; 7 modifiers, 4 bullets; no shipped leader
biases.

- Agenda (LEADER_BENJAMIN_FRANKLIN__AGENDA), Civic Virtue, check: FRANKLIN_MOD_AGENDA_CIVIC_VIRTUE,
  FRANKLIN_MOD_AGENDA_CIVIC_VIRTUE_DESCRIPTION.
  - Agenda rows read from data, FRANKLIN_MOD_AGENDA_CIVIC_VIRTUE by ModName LOC_DIPLOMACY_AGENDA_CIVIC_VIRTUE_NAME,
    which isn't EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE.
- Bullet 1 (LEADER_BENJAMIN_FRANKLIN__B01), value 3, guess: "+1 Science per Age on Production and Science Buildings in
  Cities."
  - Modifiers: FRANKLIN_MOD_PRODUCTION_BUILDING_SCIENCE, FRANKLIN_MOD_SCIENCE_BUILDING_SCIENCE.
  - Why: +1 Science on PRODUCTION- and SCIENCE-tagged buildings in cities.
- Bullet 2 (LEADER_BENJAMIN_FRANKLIN__B02), value 2, guess: "+5% Production towards constructing Buildings for active
  Endeavors you have started or supported."
  - Modifiers: FRANKLIN_MOD_PRODUCTION_BUILDING_RATE_PER_NUM_ACTIVE_DIPLOMATIC_ACTIONS.
  - Why: Building production per active endeavor started or supported.
- Bullet 3 (LEADER_BENJAMIN_FRANKLIN__B03), value 2, guess: "+2 Science per Age from active Endeavors you started or
  supported."
  - Modifiers: FRANKLIN_MOD_DIPLO_EVENT_SCIENCE.
  - Why: +2 Science per endeavor the player is involved in.
- Bullet 4 (LEADER_BENJAMIN_FRANKLIN__B04), value 1, guess: "Can have two Endeavors of the same type active at a
  time."
  - Modifiers: FRANKLIN_MOD_EXTRA_SINGLE_INSTANT_DIPLO_ACTIONS.
  - Why: DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE_ENDEAVOR: two endeavors of one type.
- Legend and leader-only unlocks: 7 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Simón Bolívar (LEADER_BOLIVAR)

Ability TRAIT_LEADER_BOLIVAR_ABILITY; frontend LeaderItems agrees; 4 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_BOLIVAR__AGENDA), Cornerstone of Freedom: BOLIVAR_MOD_AGENDA_CORNERSTONE_FREEDOM.
- Bullet 1 (LEADER_BOLIVAR__B01), value 2, guess: "Gain 2 War Support on Wars you declare."
  - Modifiers: BOLIVAR_MOD_WAR_SUPPORT_AGGRO.
  - Why: +2 war support as the aggressor.
- Bullet 2 (LEADER_BOLIVAR__B02), value 3, guess: "When you conquer a Settlement for the first time the Settlement can
  purchase 1 Building or Improvement for free."
  - Modifiers: BOLIVAR_MOD_FREE_BUILDING.
  - Why: Attached free purchase on a first-time settlement occupation.
- Bullet 3 (LEADER_BOLIVAR__B03), value 1, guess: "Unrest does not prevent Purchasing."
  - Modifiers: BOLIVAR_MOD_PURCHASE_UNREST.
  - Why: EFFECT_CITY_ADJUST_CAN_PURCHASE_IN_UNREST.
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_EXPANSIONIST 1, TREE_ATTRIBUTE_MILITARISTIC 1).

### Catherine the Great (LEADER_CATHERINE)

Ability TRAIT_LEADER_CATHERINE_ABILITY; frontend LeaderItems agrees; 4 modifiers, 3 bullets; shipped leader biases:
Biomes BIOME_TUNDRA 10.

- Agenda (LEADER_CATHERINE__AGENDA), Dusha: CATHERINE_MOD_AGENDA_DUSHA.
- Bullet 1 (LEADER_CATHERINE__B01), value 3, guess: "+2 Culture per Age on displayed Great Works."
  - Modifiers: CATHERINE_MOD_GREAT_WORK_CULTURE.
  - Why: +2 Culture per great work.
- Bullet 2 (LEADER_CATHERINE__B02), value 3, guess: "Buildings and Wonders with Great Work slots gain 1 additional
  slot."
  - Modifiers: CATHERINE_MOD_CONSTRUCTIBLE_GREAT_WORK_SLOTS.
  - Why: +1 slot on constructibles that have a great work slot.
- Bullet 3 (LEADER_CATHERINE__B03), value 2, guess: "Cities settled in Tundra gain Science equal to 25% of their
  Culture per turn."
  - Modifiers: CATHERINE_MOD_CITY_SCIENCE.
  - Why: 25% Culture to Science in cities on BIOME_TUNDRA.
  - Bias tags: BIOME_TUNDRA read from requirements or adjacencies.
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Charlemagne (LEADER_CHARLEMAGNE)

Ability TRAIT_LEADER_CHARLEMAGNE_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; shipped leader biases:
Rivers 10.

- Agenda (LEADER_CHARLEMAGNE__AGENDA), The Golden Shepherd: CHARLEMAGNE_MOD_AGENDA_THE_GOLDEN_SHEPHERD.
- Bullet 1 (LEADER_CHARLEMAGNE__B01), value 3, guess: "Military and Science Buildings receive a +1 Happiness adjacency
  for Fortifications."
  - Modifiers: CHARLEMAGNE_MOD_MILITARY_BUILDING_ADJACENCY, CHARLEMAGNE_MOD_SCIENCE_BUILDING_ADJACENCY.
  - Why: The military and science building Happiness adjacencies.
- Bullet 2 (LEADER_CHARLEMAGNE__B02), value 3, guess: "Gain 2 free Cavalry Units, once unlocked, when entering a
  Celebration."
  - Modifiers: CHARLEMAGNE_MOD_UNITS_ON_GOLDEN_AGE.
  - Why: Two UNIT_CLASS_CAVALRY units on entering a golden age.
  - SpecificTo: |UNIT_CLASS_CAVALRY|
- Bullet 3 (LEADER_CHARLEMAGNE__B03), value 2, guess: "+5 Combat Strength for Cavalry Units during a Celebration."
  - Modifiers: CHARLEMAGNE_MOD_CAVALRY_ABILITY.
  - Why: ABILITY_CHARLEMAGNE_CAVALRY (+5 strength) while in a golden age.
  - SpecificTo: |UNIT_CLASS_CAVALRY|
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_MILITARISTIC 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Confucius (LEADER_CONFUCIUS)

Ability TRAIT_LEADER_CONFUCIUS_ABILITY; frontend LeaderItems agrees; 3 modifiers, 2 bullets; shipped leader biases:
Biomes BIOME_GRASSLAND 10.

- Agenda (LEADER_CONFUCIUS__AGENDA), Guanxi: CONFUCIUS_MOD_AGENDA_GUANXI.
- Bullet 1 (LEADER_CONFUCIUS__B01), value 4, guess: "+25% Growth Rate in Cities."
  - Modifiers: CONFUCIUS_MOD_CITY_GROWTH.
  - Why: +25% growth in cities.
- Bullet 2 (LEADER_CONFUCIUS__B02), value 4, guess: "+2 Science from Specialists."
  - Modifiers: CONFUCIUS_MOD_WORKER_SCIENCE.
  - Why: +2 Science per specialist (worker yield).
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_EXPANSIONIST 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Edward Teach (LEADER_EDWARD_TEACH)

Ability TRAIT_LEADER_EDWARD_TEACH_ABILITY; frontend LeaderItems agrees; 7 modifiers, 3 bullets; shipped leader biases:
AdjacentToCoasts 200.

- Agenda (LEADER_EDWARD_TEACH__AGENDA), Queen Anne’s Revenge: EDWARD_TEACH_MOD_AGENDA.
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Bullet 1 (LEADER_EDWARD_TEACH__B01), value 3, guess: "All Naval Units gain the Pirate Ability, allowing them to
  cross borders of other Civilizations, Plunder Trade Routes from non-Allied Civilizations, and attack Units of
  non-Allied Civilizations without declaring War."
  - Modifiers: EDWARD_TEACH_MOD_ALL_NAVAL_UNITS_PIRATES,
    EDWARD_TEACH_MOD_ENTER_FOREIGN_MOD_ADJUST_UNIT_ENTER_FOREIGN_LANDS,
    EDWARD_TEACH_MOD_PLUNDER_TRADE_ROUTES_BETWEEN_OTHER_CIVS.
  - Why: Privateer flag, entering foreign lands and plundering others' routes, all on sea combat and fleet units.
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_COMBAT|UNIT_CLASS_FLEET_COMMANDER|
- Bullet 2 (LEADER_EDWARD_TEACH__B02), value 3, guess: "Defeating any Naval Unit with your own Naval Units provides
  Gold equal to 50% of its Combat Strength and captures that Unit under your control."
  - Modifiers: EDWARD_TEACH_MOD_GOLD_KILLS, EDWARD_TEACH_MOD_CAPTURE.
  - Why: Gold on naval kills and capturing the defeated unit.
  - Bias tags: COAST drafted from the text (a guess).
- Bullet 3 (LEADER_EDWARD_TEACH__B03), value 1, guess: "+1 Gold Maintenance for Naval Units."
  - Modifiers: EDWARD_TEACH_MOD_NAVAL_MAINTENANCE.
  - Why: Unit maintenance efficiency -1 on UNIT_CLASS_NAVAL.
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_NAVAL|
  - Note: A drawback (+1 Gold maintenance). The 1 to 5 scale has no negative, so it's a 1.
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_MILITARISTIC 1).

### Elizabeth (LEADER_ELIZABETH)

Ability TRAIT_LEADER_ELIZABETH_ABILITY; frontend LeaderItems agrees; 9 modifiers, 4 bullets; shipped leader biases:
AdjacentToCoasts 200.

- Agenda (LEADER_ELIZABETH__AGENDA), Trade Agreement: ELIZABETH_MOD_AGENDA.
- Bullet 1 (LEADER_ELIZABETH__B01), value 3, guess: "Unlimited Trade Route Range."
  - Modifiers: ELIZABETH_MOD_TRADE_ROUTE_UNLIMITED_LAND_RANGE, ELIZABETH_MOD_TRADE_ROUTE_UNLIMITED_SEA_RANGE.
  - Why: Land and sea trade range +999999.
- Bullet 2 (LEADER_ELIZABETH__B02), value 2, guess: "When you found a Settlement on a different Continent than your
  Capital, receive a Great Work."
  - Modifiers: ELIZABETH_MOD_GREAT_WORK.
  - Why: Great work for a settlement on a new continent.
  - Bias tags: COAST drafted from the text (a guess).
- Bullet 3 (LEADER_ELIZABETH__B03), value 3, guess: "+2 Movement to Naval Units, Embarked Settlers, and Embarked
  Merchants. Merchants and Settlers are 15% cheaper to purchase."
  - Modifiers: ELIZABETH_MOD_MERCHANT_SETTLER_EMBARKED_MOVEMENT, ELIZABETH_MOD_NAVAL_MOVEMENT,
    ELIZABETH_MOD_SETTLER_PURCHASE_COST, ELIZABETH_MOD_MERCHANT_PURCHASE_COST.
  - Why: Embarked movement for settlers and merchants, naval movement, and the two 15% purchase discounts.
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_CREATE_TOWN|UNIT_CLASS_MAKE_TRADE_ROUTE|UNIT_CLASS_NAVAL|
- Bullet 4 (LEADER_ELIZABETH__B04), value 1, guess: "-2 Combat Strength to Land Combat Units per Age."
  - Modifiers: ELIZABETH_MOD_LAND_COMBAT_STRENGTH.
  - Why: -2 strength on DOMAIN_LAND.
  - Note: A drawback; scored 1.
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_ECONOMIC 2).

### Friedrich, Oblique (LEADER_FRIEDRICH)

Ability TRAIT_LEADER_FRIEDRICH_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_FRIEDRICH__AGENDA), To Arms!: FRIEDRICH_MOD_AGENDA_TO_ARMS.
- Bullet 1 (LEADER_FRIEDRICH__B01), value 2, guess: "Army Commanders start with the Merit Commendation, granting them
  +1 Command Radius."
  - Modifiers: FRIEDRICH_MOD_COMMANDER_COMMENDATION.
  - Why: Grants PROMOTION_COMMENDATION_ARMY_MERIT to army commanders.
  - SpecificTo: |UNIT_CLASS_ARMY_COMMANDER|
- Bullet 2 (LEADER_FRIEDRICH__B02), value 3, guess: "Gain an Infantry Unit in your Capital when you complete a
  Technology Mastery, and in Settlements where you construct a Science Building."
  - Modifiers: FRIEDRICH_MOD_INFANTRY_TECH, FRIEDRICH_MOD_INFANTRY_CONSTRUCT_SCIENCE.
  - Why: Infantry on tech mastery and on building a SCIENCE building.
  - SpecificTo: |UNIT_CLASS_INFANTRY|
- Bullet 3 (LEADER_FRIEDRICH__B03), value 2, guess: "+2 Science per Age for each Commendation earned by your
  Commanders."
  - Modifiers: FRIEDRICH_MOD_COMMENDATION_SCIENCE_YIELD.
  - Why: +2 Science per commendation (CommendationsOnly).
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_MILITARISTIC 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Friedrich, Baroque (LEADER_FRIEDRICH_ALT)

Ability TRAIT_LEADER_FRIEDRICH_ALT_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_FRIEDRICH_ALT__AGENDA), Baroque: FRIEDRICH_ALT_MOD_AGENDA_BAROQUE.
- Bullet 1 (LEADER_FRIEDRICH_ALT__B01), value 2, guess: "Gain a Great Work when you capture a Settlement for the first
  time."
  - Modifiers: FRIEDRICH_ALT_MOD_GREATWORK.
  - Why: Great work on a first-time settlement occupation.
- Bullet 2 (LEADER_FRIEDRICH_ALT__B02), value 2, guess: "+1 Culture per Age on displayed Great Works."
  - Modifiers: FRIEDRICH_ALT_MOD_GREAT_WORK_CULTURE.
  - Why: +1 Culture per great work.
- Bullet 3 (LEADER_FRIEDRICH_ALT__B03), value 3, guess: "Gain an Infantry Unit in your Capital when you complete a
  Civic Mastery, and in Settlements where you construct a Culture Building."
  - Modifiers: FRIEDRICH_ALT_MOD_INFANTRY_CIVIC, FRIEDRICH_ALT_MOD_INFANTRY_CONSTRUCT_CULTURE.
  - Why: Infantry on civic mastery and on building a CULTURE building.
  - SpecificTo: |UNIT_CLASS_INFANTRY|
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_CULTURAL 2, TREE_ATTRIBUTE_MILITARISTIC 1).

### Genghis Khan (LEADER_GENGHIS_KHAN)

Ability TRAIT_LEADER_GENGHIS_KHAN_ABILITY; frontend LeaderItems agrees; 3 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_GENGHIS_KHAN__AGENDA), Tümen: GENGHIS_KHAN_MOD_AGENDA_TUMEN.
  - SpecificTo: |UNIT_CLASS_CAVALRY|
- Bullet 1 (LEADER_GENGHIS_KHAN__B01), value 3, guess: "+3 Combat Strength for Cavalry Units, or +5 when in an Army
  Command Radius."
  - Modifiers: GENGHIS_KHAN_CAVALRY_COMBAT_STRENGTH.
  - Why: ABILITY_GENGHIS_KHAN_NO_COMMAND_RADIUS_COMBAT on UNIT_CLASS_CAVALRY (the +3).
  - SpecificTo: |UNIT_CLASS_CAVALRY|
  - Note: The +5 inside a command radius comes from ABILITY_GENGHIS_KHAN_COMMAND_RADIUS_COMBAT, which bullet 2's
    modifier grants.
- Bullet 2 (LEADER_GENGHIS_KHAN__B02), value 3, guess: "Army Commanders have +1 Movement even when no Units are packed
  into them."
  - Modifiers: GENGHIS_KHAN_ARMY_COMMANDER_ABILITY.
  - Why: ABILITY_GENGHIS_KHAN_ARMY_COMMANDER: always-full movement, the convert-independents charge and the
    command-radius combat ability.
  - SpecificTo: |UNIT_CLASS_CAVALRY|
  - Note: One modifier does bullets 2 and 3 (and the +5 of bullet 1), so whoever holds this piece gets all three.
- Bullet 3 (LEADER_GENGHIS_KHAN__B03), value 1, guess, Movable = 0: "Once per Age, Army Commanders can use the Convert
  Independents Action to convert adjacent Independent Military Units to your control."
  - Modifiers: none.
  - Why: No modifier of its own: the convert charge is inside bullet 2's unit ability.
  - Note: Dealt alone it does nothing; it stays in Genghis Khan's remainder. If bullet 2 moves, the effect moves with
    it.
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_EXPANSIONIST 1, TREE_ATTRIBUTE_MILITARISTIC 1).

### Gilgamesh (LEADER_GILGAMESH)

Ability TRAIT_LEADER_GILGAMESH_ABILITY; frontend LeaderItems agrees; 6 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_GILGAMESH__AGENDA), Ally of Enkidu: GILGAMESH_MOD_AGENDA_ALLY_OF_ENKIDU.
- Bullet 1 (LEADER_GILGAMESH__B01), value 2, guess: "+2 War Support when in only one Alliance."
  - Modifiers: GILGAMESH_SINGLE_ALLY_WAR_SUPPORT.
  - Why: +2 declare-war tokens with exactly one alliance.
- Bullet 2 (LEADER_GILGAMESH__B02), value 2, guess: "When one of your Military Units defeats an enemy Unit, gain
  Influence equal to 50% of the defeated Unit's Combat Strength."
  - Modifiers: GILGAMESH_INFLUENCE.
  - Why: Influence from defeating units, attached to combat units.
  - SpecificTo: |UNIT_CLASS_COMBAT|
- Bullet 3 (LEADER_GILGAMESH__B03), value 3, guess: "All basic Endeavors are automatically unlocked. Endeavors with
  Allies don’t count against the limit of having one Endeavor of a given type active at a time. Allies can support
  your Endeavors for free."
  - Modifiers: GILGAMESH_MOD_ULOCK_ALL_ENDEAVORS, GILGAMESH_ENDEAVORS_WITH_ALLIES_HAVE_NO_LIMIT_PER_TYPE,
    GILGAMESH_ALLIES_CAN_SUPPORT_ENDEAVORS_FOR_FREE.
  - Why: Grants the six basic endeavors, lifts the per-type limit with allies, free support for allies.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Harriet Tubman (LEADER_HARRIET_TUBMAN)

Ability TRAIT_LEADER_HARRIET_TUBMAN_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; shipped leader
biases: FeatureClasses FEATURE_CLASS_VEGETATED 20.

- Agenda (LEADER_HARRIET_TUBMAN__AGENDA), Veracity, check: HARRIET_TUBMAN_MOD_AGENDA_VERACITY.
  - Agenda rows read from data, HARRIET_TUBMAN_MOD_AGENDA_VERACITY by EFFECT_DIPLOMACY_AGENDA_ON_WAR_START, which
    isn't EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE.
- Bullet 1 (LEADER_HARRIET_TUBMAN__B01), value 3, guess: "+100% Influence towards initiating Espionage Actions. Gain a
  Migrant in the Capital whenever you complete an Espionage Action without being detected."
  - Modifiers: HARRIET_TUBMAN_MOD_ADJUST_ESPIONAGE, HARRIET_TUBMAN_MOD_ESPIONAGE_MIGRANT.
  - Why: +100% espionage efficiency and a Migrant on undetected espionage.
  - SpecificTo: |UNIT_MIGRANT|
- Bullet 2 (LEADER_HARRIET_TUBMAN__B02), value 2, guess: "Gain 5 War Support on all Wars declared against you."
  - Modifiers: HARRIET_TUBMAN_MOD_WAR_SUPPORT.
  - Why: +5 war support when targeted (OnlyWhenTarget).
- Bullet 3 (LEADER_HARRIET_TUBMAN__B03), value 2, guess: "Vegetated Terrain does not end Unit Movement."
  - Modifiers: HARRIET_TUBMAN_MOD_IGNORE_VEGETATION.
  - Why: Land units ignore the FEATURE_CLASS_VEGETATED movement obstacle.
  - Bias tags: FEATURE_CLASS_VEGETATED read from requirements or adjacencies.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Hatshepsut (LEADER_HATSHEPSUT)

Ability TRAIT_LEADER_HATSHEPSUT_ABILITY; frontend LeaderItems agrees; 3 modifiers, 2 bullets; shipped leader biases:
Biomes BIOME_DESERT 10, Terrains TERRAIN_NAVIGABLE_RIVER 20.

- Agenda (LEADER_HATSHEPSUT__AGENDA), Wonders of Iteru: HATSHEPSUT_MOD_AGENDA_WONDERS_OF_ITERU.
- Bullet 1 (LEADER_HATSHEPSUT__B01), value 3, guess: "+1 Culture per Age for every unique Resource."
  - Modifiers: HATSHEPSUT_MOD_CULTURE_FROM_RESOURCES.
  - Why: +1 Culture per unique resource.
- Bullet 2 (LEADER_HATSHEPSUT__B02), value 4, guess: "+15% Production towards constructing Buildings and Wonders in
  Cities adjacent to Navigable Rivers."
  - Modifiers: HATSHEPSUT_MOD_BUILDING_PRODUCTION_RIVER.
  - Why: +15% constructible production adjacent to a navigable river.
  - Bias tags: TERRAIN_NAVIGABLE_RIVER read from requirements or adjacencies.
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_ECONOMIC 2).

### Himiko, Queen of Wa (LEADER_HIMIKO)

Ability TRAIT_LEADER_HIMIKO_ABILITY; frontend LeaderItems agrees; 6 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_HIMIKO__AGENDA), Yamatai: HIMIKO_MOD_AGENDA_YAMATAI.
- Bullet 1 (LEADER_HIMIKO__B01), value 3, guess: "Gain a unique Endeavor called Friend of Wei that can be performed in
  an Alliance to grant you and your ally +25% Science."
  - Modifiers: HIMIKO_MOD_FRIEND_OF_WA.
  - Why: Grants DIPLOMACY_ACTION_FRIEND_OF_WA.
- Bullet 2 (LEADER_HIMIKO__B02), value 3, guess: "+4 Science per Age for every Leader you are Friendly or Helpful
  with."
  - Modifiers: HIMIKO_MOD_SCIENCE_BONUS_FRIENDLY, HIMIKO_MOD_SCIENCE_BONUS_HELPFUL.
  - Why: +4 Science per Friendly and per Helpful leader.
- Bullet 3 (LEADER_HIMIKO__B03), value 2, guess: "Can Support Endeavors for free, but Rejecting Diplomatic Actions
  costs +100% Influence."
  - Modifiers: HIMIKO_MOD_NO_COST_ENDEAVOR_ACCEPT, HIMIKO_MOD_DIPLOMATIC_RESPONSE_REJECT_COST_INCREASE.
  - Why: Free endeavor support, and rejecting costs +100% (Reverse).
- Legend and leader-only unlocks: 7 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_SCIENTIFIC 3).

### Himiko, High Shaman (LEADER_HIMIKO_ALT)

Ability TRAIT_LEADER_HIMIKO_ALT_ABILITY; frontend LeaderItems agrees; 9 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_HIMIKO_ALT__AGENDA), Miko of Amaterasu: HIMIKO_ALT_MOD_AGENDA_SHAMAN_QUEEN.
- Bullet 1 (LEADER_HIMIKO_ALT__B01), value 3, guess: "+2 Happiness per Age on Happiness and Diplomacy Buildings,
  doubled if a Building is both."
  - Modifiers: HIMIKO_ALT_MOD_HAPPINESS_BUILDING_HAPPINESS, HIMIKO_ALT_MOD_DIPLOMACY_BUILDING_HAPPINESS.
  - Why: +2 Happiness on HAPPINESS- and DIPLOMACY-tagged buildings.
- Bullet 2 (LEADER_HIMIKO_ALT__B02), value 2, guess: "+50% Production towards constructing Happiness and Diplomacy
  Buildings, doubled if a Building is both."
  - Modifiers: HIMIKO_ALT_MOD_HAPPINESS_BUILDING_PRODUCTION_RATE, HIMIKO_ALT_MOD_DIPLOMACY_BUILDING_PRODUCTION_RATE.
  - Why: +50% production toward the same two building tags.
- Bullet 3 (LEADER_HIMIKO_ALT__B03), value 3, guess: "+15% Culture but -15% Science, and these effects are doubled
  while in a Celebration."
  - Modifiers: HIMIKO_ALT_MOD_CULTURE_BOOST, HIMIKO_ALT_MOD_SCIENCE_PENALTY, HIMIKO_ALT_MOD_CULTURE_BOOST_CELEBRATION,
    HIMIKO_ALT_MOD_SCIENCE_PENALTY_CELEBRATION.
  - Why: +15% Culture / -15% Science outside a golden age, +30% / -30% inside one.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_POLITICAL 4).

### Ibn Battuta (LEADER_IBN_BATTUTA)

Ability TRAIT_LEADER_IBN_BATTUTA_ABILITY; frontend LeaderItems agrees; 6 modifiers, 3 bullets; shipped leader biases:
Terrains TERRAIN_FLAT 10.

- Agenda (LEADER_IBN_BATTUTA__AGENDA), Far and Wide: IBN_BATTUTA_MOD_AGENDA_FAR_AND_WIDE.
- Bullet 1 (LEADER_IBN_BATTUTA__B01), value 3, guess: "Gains 2 Wildcard Attribute Points after the first Civic in
  every Age."
  - Modifiers: IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE. Hidden: MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_01,
    MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_02.
  - Why: The Wildcard modifier; CONTRACTS 4.3 puts his two hidden Expansionist action unlocks here.
  - Note: IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE is EFFECT_DO_NOTHING. Nothing in the data or the game's scripts grants
    the points, so the engine must key the grant to something else; whether another leader holding this modifier gets
    the points is a lab check.
- Bullet 2 (LEADER_IBN_BATTUTA__B02), value 2, guess: "+1 Sight for all Units."
  - Modifiers: IBN_BATTUTA_MOD_UNIT_SIGHT.
  - Why: +1 sight for all units.
- Bullet 3 (LEADER_IBN_BATTUTA__B03), value 2, guess: "Gain a unique Endeavor called Trade Maps that allows you to
  gradually see other Leaders' claimed territory."
  - Modifiers: IBN_BATTUTA_MOD_TRADE_MAP.
  - Why: Grants DIPLOMACY_ACTION_TRADE_MAP.
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_EXPANSIONIST 1), all following
  LEADER_IBN_BATTUTA__B01.

### Isabella (LEADER_ISABELLA)

Ability TRAIT_LEADER_ISABELLA_ABILITY; frontend LeaderItems agrees; 5 modifiers, 4 bullets; shipped leader biases:
AdjacentToCoasts 200, NaturalWonders 1000.

- Agenda (LEADER_ISABELLA__AGENDA), Wonderlust: ISABELLA_MOD_AGENDA_WONDERLUST.
- Bullet 1 (LEADER_ISABELLA__B01), value 3, guess: "Gain 100 Gold per Age every time you discover a Natural Wonder.
  This is doubled if the Natural Wonder is in Distant Lands."
  - Modifiers: ISABELLA_MOD_NATURAL_WONDER_DISCOVERY.
  - Why: Gold on finding a wonder, doubled in distant lands.
  - Bias tags: NATURAL_WONDER drafted from the text (a guess).
- Bullet 2 (LEADER_ISABELLA__B02), value 3, guess: "+50% tile yields from Natural Wonders for every Natural Wonder in
  your Empire."
  - Modifiers: ISABELLA_MOD_DOUBLE_NATURAL_WONDERS_ABILITY.
  - Why: +50% natural wonder plot yields per natural wonder.
  - Bias tags: NATURAL_WONDER read from requirements or adjacencies.
- Bullet 3 (LEADER_ISABELLA__B03), value 2, guess: "+50% Gold towards purchasing Naval Units."
  - Modifiers: ISABELLA_MOD_NAVAL_UNIT_PURCHASE.
  - Why: +50% naval unit purchase efficiency.
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Bullet 4 (LEADER_ISABELLA__B04), value 1, guess: "-1 Gold maintenance for Naval Units."
  - Modifiers: ISABELLA_MOD_NAVAL_UNIT_MAINTENANCE.
  - Why: Naval maintenance efficiency +1 (-1 Gold maintenance).
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_EXPANSIONIST 1).

### José Rizal (LEADER_JOSE_RIZAL)

Ability TRAIT_LEADER_JOSE_RIZAL_ABILITY; frontend LeaderItems agrees; 8 modifiers, 4 bullets; shipped leader biases:
Biomes BIOME_TROPICAL 10.

- Agenda (LEADER_JOSE_RIZAL__AGENDA), Kapwa: RIZAL_MOD_AGENDA_KAPWA.
- Bullet 1 (LEADER_JOSE_RIZAL__B01), value 3, guess: "When gaining rewards from a Narrative Event, gain an additional
  20 Culture, Gold and Influence per Age."
  - Modifiers: RIZAL_MOD_NARRATIVE_EVENT_CULTURE, RIZAL_MOD_NARRATIVE_EVENT_GOLD, RIZAL_MOD_NARRATIVE_EVENT_INFLUENCE.
  - Why: +20 Culture, Gold and Influence per completed narrative event.
- Bullet 2 (LEADER_JOSE_RIZAL__B02), value 2, guess: "Has additional Narrative Events."
  - Modifiers: RIZAL_MOD_EXTRA_STORIES, RIZAL_MOD_EXTRA_STORIES2.
  - Why: Bonus stories and bypassing narrative suppression.
- Bullet 3 (LEADER_JOSE_RIZAL__B03), value 2, guess: "+50% Celebration duration."
  - Modifiers: RIZAL_MOD_CELEBRATION_LENGTH.
  - Why: +50% golden age duration.
- Bullet 4 (LEADER_JOSE_RIZAL__B04), value 2, guess: "+50% Happiness towards Celebrations."
  - Modifiers: RIZAL_MOD_CELEBRATION_HAPPINESS.
  - Why: +50% Happiness (EFFECT_PLAYER_ADJUST_YIELD) is the only other modifier; read as Happiness toward
    celebrations.
  - Note: The modifier is a plain +50% Happiness yield with no celebration requirement. Check the bullet means the
    same thing.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_POLITICAL 4).

### Lafayette (LEADER_LAFAYETTE)

Ability TRAIT_LEADER_LAFAYETTE_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; shipped leader biases:
AdjacentToCoasts 200.

- Agenda (LEADER_LAFAYETTE__AGENDA), French Quarters: LAFAYETTE_MOD_AGENDA_FRENCH_QUARTERS.
- Bullet 1 (LEADER_LAFAYETTE__B01), value 4, guess: "Gains a unique Endeavor called Reform, which grants an additional
  Tradition slot. Supporting this Endeavor also grants the other Leader an additional Tradition slot, otherwise they
  are granted a Social Policy slot. Reform is usable once with each other Leader."
  - Modifiers: LAFAYETTE_MOD_TRADITION_SLOT.
  - Why: Grants DIPLOMACY_ACTION_GRANT_POLICY_SLOT (the Reform endeavor).
- Bullet 2 (LEADER_LAFAYETTE__B02), value 2, guess: "+1 Combat Strength for every Tradition, but not Social Policy,
  slotted in the Government."
  - Modifiers: LAFAYETTE_MOD_COMBAT_ABILITY_TRADITION.
  - Why: ABILITY_LAFAYETTE_TRADITION: +1 strength per civ-unique tradition.
- Bullet 3 (LEADER_LAFAYETTE__B03), value 3, guess: "+1 Culture and Happiness per Age in Settlements, doubled in
  Distant Lands."
  - Modifiers: LAFAYETTE_MOD_CULTURE_SETTLEMENTS_HOMELANDS, LAFAYETTE_MOD_CULTURE_SETTLEMENTS_DISTANT_LANDS.
  - Why: +1 / +2 Culture and Happiness by homeland and distant lands.
  - Bias tags: COAST drafted from the text (a guess).
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_POLITICAL 4).

### Lakshmibai (LEADER_LAKSHMIBAI)

Ability TRAIT_LEADER_LAKSHMIBAI_ABILITY; frontend LeaderItems agrees; 4 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_LAKSHMIBAI__AGENDA), Eternal Glory: LAKSHMIBAI_MOD_AGENDA_ETERNAL_GLORY.
- Bullet 1 (LEADER_LAKSHMIBAI__B01), value 2, guess: "+50% Influence towards initiating the City-State - Incorporate
  Action."
  - Modifiers: LAKSHMIBAI_MOD_CS_INCORPORATE.
  - Why: +50% efficiency on DIPLOMACY_ACTION_CS_INCORPORATE.
- Bullet 2 (LEADER_LAKSHMIBAI__B02), value 2, guess: "When you incorporate a City-State, you gain all of their Units."
  - Modifiers: LAKSHMIBAI_MOD_CS_INCORPORATE_UNITS.
  - Why: Keeps the city-state's units on incorporation.
- Bullet 3 (LEADER_LAKSHMIBAI__B03), value 3, guess: "When one of your Land Military Units defeats an enemy Unit, gain
  Influence equal to 100% of the defeated Unit's Combat Strength."
  - Modifiers: LAKSHMIBAI_INFLUENCE.
  - Why: Influence from land combat units defeating enemies.
  - SpecificTo: |UNIT_CLASS_COMBAT|
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Machiavelli (LEADER_MACHIAVELLI)

Ability TRAIT_LEADER_MACHIAVELLI_ABILITY; frontend LeaderItems agrees; 6 modifiers, 4 bullets; no shipped leader
biases.

- Agenda (LEADER_MACHIAVELLI__AGENDA), The Spider: MACHIAVELLI_MOD_AGENDA_THE_SPIDER.
- Bullet 1 (LEADER_MACHIAVELLI__B01), value 3, guess: "+3 Influence per Age."
  - Modifiers: MACHIAVELLI_MOD_INFLUENCE.
  - Why: +3 Influence.
- Bullet 2 (LEADER_MACHIAVELLI__B02), value 3, guess: "Gains 50 Gold per Age when your Diplomatic Action proposals are
  accepted, or 100 Gold when they are rejected."
  - Modifiers: MACHIAVELLI_MOD_GOLD_ACTION_ACCEPT, MACHIAVELLI_MOD_GOLD_ACTION_REJECT.
  - Why: 50 / 100 Gold on accepted / rejected proposals.
- Bullet 3 (LEADER_MACHIAVELLI__B03), value 2, guess: "Ignores Relationship requirements for declaring Formal Wars."
  - Modifiers: MACHIAVELLI_MOD_FORMAL_WAR.
  - Why: Ignores formal war requirements.
- Bullet 4 (LEADER_MACHIAVELLI__B04), value 2, guess: "Can Levy Troops from City-States you are not Suzerain of."
  - Modifiers: MACHIAVELLI_MOD_CITY_STATE_LEVY.
  - Why: Levy from all city-states.
- Legend and leader-only unlocks: 6 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_ECONOMIC 2).

### Napoleon, Emperor (LEADER_NAPOLEON)

Ability TRAIT_LEADER_NAPOLEON_ABILITY; frontend LeaderItems agrees; 6 modifiers, 4 bullets; no shipped leader biases.

- Agenda (LEADER_NAPOLEON__AGENDA), Napoleonic Code: NAPOLEON_MOD_AGENDA_NAPOLEONIC_CODE.
- Bullet 1 (LEADER_NAPOLEON__B01), value 2, guess: "All basic Sanctions are automatically unlocked."
  - Modifiers: NAPOLEON_MOD_ULOCK_ALL_SANCTIONS.
  - Why: Grants the six sabotage actions.
- Bullet 2 (LEADER_NAPOLEON__B02), value 2, guess: "+50% Influence towards initiating Sanctions."
  - Modifiers: NAPOLEON_MOD_LOWER_COST_SANCTIONS.
  - Why: +50% efficiency on the sanction action group.
- Bullet 3 (LEADER_NAPOLEON__B03), value 3, guess: "+5 Culture and Gold per Age for each Leader you have an active
  Sanction on, except Denouncement."
  - Modifiers: NAPOLEON_MOD_CULTURE_PER_SANCTIONED_PLAYER, NAPOLEON_MOD_GOLD_PER_SANCTIONED_PLAYER.
  - Why: +5 Culture and Gold per sanctioned player.
- Bullet 4 (LEADER_NAPOLEON__B04), value 2, guess: "+1 Combat Strength for Land Units for every Sanction you have
  active, except Denouncement."
  - Modifiers: NAPOLEON_MOD_COMBAT_STRENGTH_PER_ACTIVE_SANCTION.
  - Why: Land units +1 per active sanction.
- Legend and leader-only unlocks: 6 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_ECONOMIC 2).

### Napoleon, Revolutionary (LEADER_NAPOLEON_ALT)

Ability TRAIT_LEADER_NAPOLEON_ALT_ABILITY; frontend LeaderItems agrees; 4 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_NAPOLEON_ALT__AGENDA), Culture from Conquest: NAPOLEON_ALT_MOD_AGENDA_CULTURE_FROM_CONQUEST.
- Bullet 1 (LEADER_NAPOLEON_ALT__B01), value 4, guess: "+1 Movement for all Land Units."
  - Modifiers: NAPOLEON_ALT_MOD_LAND_UNIT_MOVEMENT.
  - Why: +1 movement on DOMAIN_LAND.
- Bullet 2 (LEADER_NAPOLEON_ALT__B02), value 3, guess: "Defeating an enemy Unit provides Culture equal to 100% of its
  Combat Strength."
  - Modifiers: NAPOLEON_ALT_MOD_CULTURE_ON_UNIT_DEFEAT.
  - Why: Culture equal to 100% of defeated strength.
- Bullet 3 (LEADER_NAPOLEON_ALT__B03), value 3, guess: "The first time each Age that a War is declared against you,
  gain an Army Commander in your Capital packed with 1 Infantry Unit, 1 Cavalry Unit, 1 Ranged Unit, and 1 Siege Unit,
  even if those Units have not been unlocked."
  - Modifiers: NAPOLEON_ALT_MOD_SPAWN_ARMY.
  - Why: Commander with infantry, ranged, siege and cavalry on the first war declared on him.
  - SpecificTo: |UNIT_ARMY_COMMANDER|UNIT_CLASS_INFANTRY|UNIT_CLASS_RANGED|UNIT_CLASS_SIEGE|UNIT_CLASS_CAVALRY|
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_MILITARISTIC 1).

### Pachacuti (LEADER_PACHACUTI)

Ability TRAIT_LEADER_PACHACUTI_ABILITY; frontend LeaderItems agrees; 5 modifiers, 3 bullets; shipped leader biases:
Terrains TERRAIN_MOUNTAIN 40.

- Agenda (LEADER_PACHACUTI__AGENDA), Mountain King: PACHACUTI_MOD_AGENDA_MOUNTAIN_KING.
- Bullet 1 (LEADER_PACHACUTI__B01), value 3, guess: "All Buildings receive a +1 Food Adjacency for Mountains."
  - Modifiers: PACHACUTI_MOD_WILDCARD_ADJACENCY_MOUNTAINS.
  - Why: Activates the PachacutiMountainFood adjacency.
  - Bias tags: TERRAIN_MOUNTAIN read from requirements or adjacencies.
- Bullet 2 (LEADER_PACHACUTI__B02), value 2, guess: "-2 Maintenance on Specialists adjacent to Mountains. +1
  Maintenance on Specialists not adjacent to Mountains."
  - Modifiers: PACHACUTI_MOD_MOUNTAIN_SPECIALIST_HAPPINESS, PACHACUTI_MOD_MOUNTAIN_SPECIALIST_HAPPINESS_INVERSE.
  - Why: -2 / +1 specialist Happiness maintenance next to / away from mountains (SPEC 2 example).
  - Bias tags: TERRAIN_MOUNTAIN read from requirements or adjacencies.
- Bullet 3 (LEADER_PACHACUTI__B03), value 3, guess: "Cities gain a bonus to Production equal to 10% of that City’s
  Food."
  - Modifiers: PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD.
  - Why: 10% Food to Production in cities (probe 1's copied bullet).
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_EXPANSIONIST 1).

### Sayyida al Hurra (LEADER_SAYYIDA_AL_HURRA)

Ability TRAIT_LEADER_SAYYIDA_AL_HURRA_ABILITY; frontend LeaderItems agrees; 5 modifiers, 4 bullets; shipped leader
biases: AdjacentToCoasts 200.

- Agenda (LEADER_SAYYIDA_AL_HURRA__AGENDA), Wattasid Dynasty: SAYYIDA_MOD_AGENDA.
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Bullet 1 (LEADER_SAYYIDA_AL_HURRA__B01), value 3, guess: "Receive the strongest Naval Unit every time you succeed in
  an Espionage Action, if you can place a Naval Unit."
  - Modifiers: SAYYIDA_MOD_FREE_NAVAL_UNIT.
  - Why: Naval unit with ocean access on a completed espionage action.
  - Bias tags: COAST drafted from the text (a guess).
- Bullet 2 (LEADER_SAYYIDA_AL_HURRA__B02), value 3, guess: "+2 Culture and +1 Influence per Age for every Naval Unit
  stationed on a District."
  - Modifiers: SAYYIDA_MOD_STATIONED_ON_DISTRICT_YIELDS.
  - Why: Culture and Influence attached to naval units stationed on districts.
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Bullet 3 (LEADER_SAYYIDA_AL_HURRA__B03), value 1, guess: "No Influence penalty for your Espionage being revealed."
  - Modifiers: SAYYIDA_MOD_NO_INFLUENCE_PENALTY_REVEALED_SPIES.
  - Why: No Influence penalty for revealed spies.
- Bullet 4 (LEADER_SAYYIDA_AL_HURRA__B04), value 2, guess: "Opponents cannot use Counter Spy against you."
  - Modifiers: SAYYIDA_MOD_NO_COUNTERSPY_AGAINST.
  - Why: No opposing counter-espionage.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Tecumseh (LEADER_TECUMSEH)

Ability TRAIT_LEADER_TECUMSEH_ABILITY; frontend LeaderItems agrees; 7 modifiers, 4 bullets; no shipped leader biases.

- Agenda (LEADER_TECUMSEH__AGENDA), Suzerain of the World, check: TECUMSEH_MOD_AGENDA_SUZERAIN_OF_THE_WORLD_1,
  TECUMSEH_MOD_AGENDA_SUZERAIN_OF_THE_WORLD_2.
  - Agenda rows read from data, TECUMSEH_MOD_AGENDA_SUZERAIN_OF_THE_WORLD_1 by EFFECT_DIPLOMACY_AGENDA_ON_DISPERSE_IP,
    which isn't EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE.
- Bullet 1 (LEADER_TECUMSEH__B01), value 3, guess: "+1 Food per Age in Towns and +1 Production per Age in Cities for
  every City-State you are Suzerain of."
  - Modifiers: TECUMSEH_MOD_SUZERAIN_FOOD, TECUMSEH_MOD_SUZERAIN_PRODUCTION.
  - Why: Food in towns and Production in cities per suzerainty.
- Bullet 2 (LEADER_TECUMSEH__B02), value 2, guess: "+1 Combat Strength for all Infantry and Ranged units for every
  City-State you are Suzerain of."
  - Modifiers: TECUMSEH_MOD_SUZERAIN_ABILITY.
  - Why: ABILITY_TECUMSEH_SUZERAIN: +1 strength per suzerainty.
  - SpecificTo: |UNIT_CLASS_INFANTRY|UNIT_CLASS_RANGED|
- Bullet 3 (LEADER_TECUMSEH__B03), value 2, guess: "+2 Dominion for every City-State you are Suzerain of."
  - Modifiers: TECUMSEH_MOD_SUZERAIN_MILITARY_VICTORY.
  - Why: Activates VICTORY_TRACKER_TECUMSEH_SUZERAIN (Dominion per suzerainty).
- Bullet 4 (LEADER_TECUMSEH__B04), value 3, guess: "All Independent Powers start Friendly with you."
  - Modifiers: TECUMSEH_MOD_IP_FRIENDLY.
  - Why: Sets every independent relationship to FRIENDLY.
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_MILITARISTIC 1).

### Toyotomi Hideyoshi (LEADER_TOYOTOMI_HIDEYOSHI)

Ability TRAIT_LEADER_TOYOTOMI_HIDEYOSHI_ABILITY; frontend LeaderItems agrees; 7 modifiers, 3 bullets; no shipped
leader biases.

- Agenda (LEADER_TOYOTOMI_HIDEYOSHI__AGENDA), Kampaku: TOYOTOMI_HIDEYOSHI_MOD_AGENDA.
- Bullet 1 (LEADER_TOYOTOMI_HIDEYOSHI__B01), value 3, guess: "Land Units deal Double Damage attacking opposing Units
  but all of your Units take Double Damage when defending."
  - Modifiers: TOYOTOMI_HIDEYOSHI_MOD_DOUBLE_DAMAGE_ATTACK, TOYOTOMI_HIDEYOSHI_MOD_OPPONENTS_DOUBLE_DAMAGE_ATTACK.
  - Why: Land units deal 200%, opponents deal 200% to his units.
- Bullet 2 (LEADER_TOYOTOMI_HIDEYOSHI__B02), value 2, guess: "Your Units Heal an additional 5 HP, this is doubled if
  on a Culture Building or Wonder."
  - Modifiers: TOYOTOMI_HIDEYOSHI_MOD_HEAL_ANYWHERE, TOYOTOMI_HIDEYOSHI_MOD_HEAL_CULTURE_OR_WONDER.
  - Why: +5 heal anywhere, +5 more on a CULTURE building or wonder.
- Bullet 3 (LEADER_TOYOTOMI_HIDEYOSHI__B03), value 2, guess: "+25% Production towards Culture Buildings. This is
  doubled in Captured Cities from any Age."
  - Modifiers: TOYOTOMI_HIDEYOSHI_MOD_ORIGINAL_CULTURE_BUILDING_PRODUCTION_TOWARDS,
    TOYOTOMI_HIDEYOSHI_MOD_CONQUERED_CULTURE_BUILDING_PRODUCTION_TOWARDS.
  - Why: +25% / +50% toward CULTURE buildings in original / conquered cities.
- Legend and leader-only unlocks: 2 (TREE_ATTRIBUTE_CULTURAL 1, TREE_ATTRIBUTE_MILITARISTIC 1).

### Trung Trac (LEADER_TRUNG_TRAC)

Ability TRAIT_LEADER_TRUNG_TRAC_ABILITY; frontend LeaderItems agrees; 7 modifiers, 3 bullets; shipped leader biases:
Biomes BIOME_TROPICAL 10, FeatureClasses FEATURE_CLASS_VEGETATED 20.

- Agenda (LEADER_TRUNG_TRAC__AGENDA), Van Minh: TRUNG_TRAC_MOD_AGENDA_VAN_MINH.
- Bullet 1 (LEADER_TRUNG_TRAC__B01), value 4, guess: "Gain the Unique Army Commander Trung Nhi after obtaining your
  first Land Military Unit of the Age. Trung Nhi persists across Age Transitions, and begins with 2 Promotions in
  Exploration Advanced Starts or 3 Promotions in Modern Advanced Starts, and has a unique Promotion Tree."
  - Modifiers: TRUNG_TRAC_MOD_TRUNG_NHI, TRUNG_TRAC_MOD_TRUNG_NHI_FASTER_RESPAWN,
    TRUNG_TRAC_MOD_TRUNG_NHI_GRANT_HEROIC_ASSAULT.
  - Why: Grants UNIT_TRUNG_NHI after the first land unit, plus her respawn speed and attack ability on
    UNIT_CLASS_TRUNG_NHI.
  - SpecificTo: |UNIT_TRUNG_NHI|UNIT_CLASS_TRUNG_NHI|
  - Note: UNIT_TRUNG_NHI has no TraitType, so another leader can be given the unit. Her unique promotion tree and
    age-transition persistence are on the unit, not this trait; a lab check should confirm they come along.
- Bullet 2 (LEADER_TRUNG_TRAC__B02), value 2, guess: "+20% Commander Experience."
  - Modifiers: TRUNG_TRAC_MOD_COMMANDER_XP.
  - Why: +20% experience on UNIT_CLASS_COMMAND.
  - SpecificTo: |UNIT_CLASS_COMMAND|
- Bullet 3 (LEADER_TRUNG_TRAC__B03), value 2, guess: "+10% Science in Cities in Tropical. This is doubled while in a
  Formal War you declare."
  - Modifiers: TRUNG_TRAC_MOD_TROPICAL_SCIENCE, TRUNG_TRAC_MOD_TROPICAL_SCIENCE_AT_WAR.
  - Why: +10% Science in BIOME_TROPICAL cities, +10% more in a formal war.
  - Bias tags: BIOME_TROPICAL read from requirements or adjacencies.
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_MILITARISTIC 1, TREE_ATTRIBUTE_SCIENTIFIC 3).

### George Washington (LEADER_WASHINGTON)

Ability TRAIT_LEADER_WASHINGTON_ABILITY; frontend LeaderItems agrees; 7 modifiers, 3 bullets; no shipped leader
biases.

- Agenda (LEADER_WASHINGTON__AGENDA), Hearts of his Countrymen: WASHINGTON_MOD_AGENDA_HEARTS_OF_HIS_COUNTRYMEN.
- Bullet 1 (LEADER_WASHINGTON__B01), value 2, guess: "Gain a Migrant in your Capital when entering a Celebration."
  - Modifiers: WASHINGTON_MOD_MIGRANT_ON_GOLDEN_AGE.
  - Why: UNIT_MIGRANT on entering a golden age.
  - SpecificTo: |UNIT_MIGRANT|
- Bullet 2 (LEADER_WASHINGTON__B02), value 4, guess: "Start with two additional Policies and an additional Social
  Policy slot."
  - Modifiers: WASHINGTON_MOD_FREE_POLICY_SLOT, WASHINGTON_MOD_STARTING_POLICY_CONTINENTAL_AMBITION,
    WASHINGTON_MOD_STARTING_POLICY_BILL_OF_RIGHTS.
  - Why: +1 policy slot and the two starting policies (TRADITION_CONTINENTAL_AMBITION, TRADITION_BILL_OF_RIGHTS).
- Bullet 3 (LEADER_WASHINGTON__B03), value 3, guess: "For each Policy, but not Tradition, slotted into your
  Government, get +1 Food per Age in Towns and +2 Happiness per Age in Cities."
  - Modifiers: WASHINGTON_MOD_TOWN_FOOD_PER_POLICY, WASHINGTON_MOD_CITY_HAPPINESS_PER_POLICY.
  - Why: Food in towns and Happiness in cities per slotted policy (Invert: policies, not traditions).
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_POLITICAL 4, TREE_ATTRIBUTE_EXPANSIONIST 1).

### Xerxes, King of Kings (LEADER_XERXES)

Ability TRAIT_LEADER_XERXES_ABILITY; frontend LeaderItems agrees; 7 modifiers, 4 bullets; shipped leader biases:
Biomes BIOME_DESERT 10.

- Agenda (LEADER_XERXES__AGENDA), Lord of Fire: XERXES_MOD_AGENDA_LORD_OF_FIRE.
- Bullet 1 (LEADER_XERXES__B01), value 3, guess: "+3 Combat Strength for Units that are attacking in neutral or enemy
  territory."
  - Modifiers: XERXES_MOD_UNIT_ATTACK_ABILITY.
  - Why: ABILITY_XERXES_UNIT_FOREIGN_TERRITORY: +3 attacking in neutral or enemy land.
- Bullet 2 (LEADER_XERXES__B02), value 2, guess: "Gain 100 Culture and Gold per Age when you capture a Settlement for
  the first time."
  - Modifiers: XERXES_MOD_CULTURE_ON_CAPTURE_SETTLEMENT, XERXES_MOD_GOLD_ON_CAPTURE_SETTLEMENT.
  - Why: 100 Culture and Gold on a first-time occupation.
- Bullet 3 (LEADER_XERXES__B03), value 3, guess: "+10% Gold in all Settlements, doubled in Captured Settlements from
  any Age."
  - Modifiers: XERXES_MOD_SETTLEMENT_GOLD, XERXES_MOD_CAPTURED_SETTLEMENT_GOLD.
  - Why: +10% Gold, +20% in conquered settlements.
- Bullet 4 (LEADER_XERXES__B04), value 4, guess: "+1 Settlement Limit each Age."
  - Modifiers: XERXES_MOD_SETTLEMENT_CAP.
  - Why: +1 settlement cap (Ageless).
- Legend and leader-only unlocks: 3 (TREE_ATTRIBUTE_ECONOMIC 2, TREE_ATTRIBUTE_MILITARISTIC 1).

### Xerxes, the Achaemenid (LEADER_XERXES_ALT)

Ability TRAIT_LEADER_XERXES_ALT_ABILITY; frontend LeaderItems agrees; 10 modifiers, 4 bullets; shipped leader biases:
Biomes BIOME_DESERT 10.

- Agenda (LEADER_XERXES_ALT__AGENDA), Lord of Coin: XERXES_ALT_MOD_AGENDA_LORD_OF_COIN.
- Bullet 1 (LEADER_XERXES_ALT__B01), value 3, guess: "+1 Trade Route Limit with all other Leaders."
  - Modifiers: XERXES_ALT_MOD_TRADE_ROUTE_CAP.
  - Why: +1 trade capacity with majors.
- Bullet 2 (LEADER_XERXES_ALT__B02), value 1, guess: "+10 Trade Range."
  - Modifiers: XERXES_ALT_MOD_TRADE_RANGE_EXTEND_LAND, XERXES_ALT_MOD_TRADE_RANGE_EXTEND_SEA.
  - Why: +10 land and sea trade range.
- Bullet 3 (LEADER_XERXES_ALT__B03), value 3, guess: "Gain 50 Culture and 100 Gold per Age when you create a Trade
  Route or Road."
  - Modifiers: XERXES_ALT_MOD_TRADE_ROUTE_CULTURE, XERXES_ALT_MOD_TRADE_ROUTE_GOLD, XERXES_ALT_MOD_ROAD_CULTURE,
    XERXES_ALT_MOD_ROAD_GOLD.
  - Why: Culture and Gold command awards for making a trade route and connecting a road.
  - SpecificTo: |UNIT_CLASS_MAKE_TRADE_ROUTE|
- Bullet 4 (LEADER_XERXES_ALT__B04), value 2, guess: "+1 Culture and Gold per Age on Unique Buildings and
  Improvements."
  - Modifiers: XERXES_ALT_MOD_UNIQUE_BUILDING_YIELD, XERXES_ALT_MOD_UNIQUE_IMPROVEMENT_YIELD.
  - Why: +1 Culture and Gold on UNIQUE and UNIQUE_IMPROVEMENT constructibles.
- Legend and leader-only unlocks: 4 (TREE_ATTRIBUTE_CULTURAL 2, TREE_ATTRIBUTE_ECONOMIC 2).

### Yi Sun-sin (LEADER_YI_SUN_SIN)

Ability TRAIT_LEADER_YI_SUN_SIN_ABILITY; frontend LeaderItems agrees; 5 modifiers, 4 bullets; shipped leader biases:
AdjacentToCoasts 200.

- Agenda (LEADER_YI_SUN_SIN__AGENDA), 13 Ships: YI_MOD_AGENDA_YI.
  - SpecificTo: |UNIT_CLASS_NAVAL|
- Bullet 1 (LEADER_YI_SUN_SIN__B01), value 2, guess: "Can construct Fleet Commanders after studying Discipline in
  Antiquity. Receive a Fleet Commander once you have discovered Discipline and have a Harbor Building with access to
  the Ocean."
  - Modifiers: YI_MOD_FREE_NAVAL_COMMANDER.
  - Why: Fleet commander on Discipline plus a Harbor (the only modifier naming either).
  - Bias tags: COAST drafted from the text (a guess).
  - SpecificTo: |UNIT_CLASS_FLEET_COMMANDER|BUILDING_HARBOR|
  - Note: Building fleet commanders in Antiquity comes from TRAIT_UNLOCK_FLEET_COMMANDER (UNIT_FLEET_COMMANDER's
    TraitType) and the Discipline civic unlock, which both stay with Yi Sun-sin (CONTRACTS 12.4). Another leader
    holding this piece may get the free commander without being able to build more; whether the grant works without
    the trait is a lab check.
- Bullet 2 (LEADER_YI_SUN_SIN__B02), value 2, guess: "Defeating an enemy with a Naval Unit provides Science equal to
  100% of the defeated unit's Combat Strength."
  - Modifiers: YI_MOD_SCIENCE_KILLS.
  - Why: Science on naval kills (attached modifier).
  - Bias tags: COAST drafted from the text (a guess).
- Bullet 3 (LEADER_YI_SUN_SIN__B03), value 2, guess: "On construction of Science Buildings receive 10 XP to all Fleet
  Commanders."
  - Modifiers: YI_MOD_SCIENCE_BUILDING_XP.
  - Why: Fleet commander XP on building a SCIENCE building.
  - SpecificTo: |UNIT_CLASS_FLEET_COMMANDER|
- Bullet 4 (LEADER_YI_SUN_SIN__B04), value 2, guess: "+3 Gold per Age for every Fleet Commander XP earned in Combat."
  - Modifiers: YI_MOD_GOLD_PER_XP.
  - Why: +3 Gold per XP earned on UNIT_CLASS_FLEET_COMMANDER.
  - SpecificTo: |UNIT_CLASS_FLEET_COMMANDER|
- Legend and leader-only unlocks: 5 (TREE_ATTRIBUTE_MILITARISTIC 1, TREE_ATTRIBUTE_SCIENTIFIC 3, TREE_CIVICS_AQ_MAIN
  1).

## Listed modded leaders

### Remilia Scarlet (LEADER_REMILIA)

Ability TRAIT_LEADER_REMILIA_ABILITY; mod MAO-Leader-REMILIA, Workshop 3635718174; frontend LeaderItems agrees; 8
modifiers, 0 bullets; no shipped leader biases.

- Note: The description is prose with [N] breaks and hand-typed bullets, no [LI]. Two named skills (Feast of Eternal
  Night, Mistress of the Sleepless City) could be split if the author switches to [LI].

- Agenda (LEADER_REMILIA__AGENDA), Eternal Night's Ruler: MOD_REMILIA_LEADER_AGENDA.
- Unplaced: MOD_REMILIA_HUNT_MELEE_GOLD. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_HUNT_RANGED_SCIENCE. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_HUNT_CAVALRY_CULTURE. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_HUNT_SIEGE_PRODUCTION. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_HUNT_NAVAL_GOLD. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_CITY_CULTURE. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_REMILIA_DISTRICT_DEFENSE. The description has no bullets, so the ability is dealt whole.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_REMILIA_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_REMILIA_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_REMILIA_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_REMILIA_L2,
  NODE_REMILIA_POLITICAL_VAMPIRE -> MOD_REMILIA_VAMPIRE_TREE, NODE_REMILIA_CULTURAL_SCARLET ->
  MOD_REMILIA_SCARLET_TREE, NODE_REMILIA_ECONOMIC_DESTINY -> MOD_REMILIA_MISTRESS_TREE,
  NODE_REMILIA_EXPANSIONIST_NIGHT -> MOD_REMILIA_FATE_TREE, NODE_REMILIA_SCIENTIFIC_SPEAR -> MOD_REMILIA_NIGHT_TREE.

### Qin Shi Huang (FGO) (LEADER_QINSHIHUANG)

Ability TRAIT_LEADER_QINSHIHUANG_ABILITY; mod MAO-Leader-QINSHIHUANG, Workshop 3635171494; frontend LeaderItems
agrees; 12 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_QINSHIHUANG__AGENDA), Unification Under Heaven: MOD_QINSHIHUANG_LEADER_AGENDA.
- Bullet 1 (LEADER_QINSHIHUANG__B01), value 4, guess: "First Emperor: Settlement Cap +3. Start with Tradition slot
  +1."
  - Modifiers: MOD_QINSHIHUANG_COMMANDERY_SETTLEMENT_CAP, MOD_QINSHIHUANG_FIRST_EMPEROR_TRADITION_SLOT.
  - Why: Settlement cap +3 and +1 tradition slot. The ids say COMMANDERY and FIRST_EMPEROR the other way round from
    the text; the effects decide.
- Bullet 2 (LEADER_QINSHIHUANG__B02), value 4, guess: "Commandery System: Each Tradition grants all Settlements +2 +2.
  Non-capital Settlements -5, but +10%."
  - Modifiers: MOD_QINSHIHUANG_FIRST_EMPEROR_FOOD, MOD_QINSHIHUANG_FIRST_EMPEROR_GOLD,
    MOD_QINSHIHUANG_COMMANDERY_HAPPINESS_PENALTY, MOD_QINSHIHUANG_COMMANDERY_PRODUCTION_BONUS,
    MOD_QINSHIHUANG_COMMANDERY_FOOD_BONUS.
  - Why: +2 Food and Gold per active tradition, and the -5 Happiness / +10% Production and Food lines.
  - Note: The three penalty and bonus lines use REQUIREMENT_CITY_IS_CAPITAL (not inverted) although the text says
    non-capital settlements. That's the mod's own behavior and moves as is.
- Bullet 3 (LEADER_QINSHIHUANG__B03), value 2, guess: "Great Wall: Building Fortifications (Walls, Fortresses, etc.)
  and Defensive Wonders +30%. When playing as Han or Ming, building Great Wall +30% additional."
  - Modifiers: MOD_QINSHIHUANG_GREAT_WALL_FORTIFICATION_PRODUCTION,
    MOD_QINSHIHUANG_GREAT_WALL_DEFENSIVE_WONDER_PRODUCTION, MOD_QINSHIHUANG_GREAT_WALL_HAN_PRODUCTION,
    MOD_QINSHIHUANG_GREAT_WALL_MING_PRODUCTION.
  - Why: +30% toward FORTIFICATION, WONDER_FORBIDDEN_CITY, and the Han / Ming Great Wall improvements (owner must be
    Han / Ming).
  - SpecificTo: |IMPROVEMENT_HAN_GREAT_WALL|CIVILIZATION_HAN|CIVILIZATION_MING|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_QINSHIHUANG_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_QINSHIHUANG_L1,
  NODE_ATTRIBUTE_EXPANSIONIST_LEGEND_QINSHIHUANG_L2 -> MOD_ATTRIBUTE_EXPANSIONIST_LEGEND_QINSHIHUANG_L2.

### Oda Nobunaga(FGO) (LEADER_ODA_NOBUNAGA)

Ability TRAIT_LEADER_ODA_NOBUNAGA_ABILITY; mod MAO_ODA_NOBUNAGA, Workshop 3631520597; frontend LeaderItems agrees; 8
modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_ODA_NOBUNAGA__AGENDA), Romance of Arts Scholars: ODA_NOBUNAGA_MOD_AGENDA_ROMANCE_OF_ARTS_SCHOLARS.
- Bullet 1 (LEADER_ODA_NOBUNAGA__B01), value 3, guess: "Demon King of the Sixth Heaven: Land military units gain +4
  Combat Strength when defending while adjacent to a Siege unit. Land Siege units adjacent to a friendly Army
  Commander gain +1 Range and +3 Bombard Strength (stacked units excluded)."
  - Modifiers: ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_SIEGE_ATTACK_ATTACH,
    ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_COMMANDER_RANGE_ATTACH, ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_COMMANDER_BOMBARD_ATTACH.
  - Why: The three DAIROKUTEN attachments: defense next to siege, siege range and bombard next to a commander.
  - SpecificTo: |UNIT_CLASS_SIEGE|UNIT_CLASS_COMBAT|UNIT_CLASS_ARMY_COMMANDER|
- Bullet 2 (LEADER_ODA_NOBUNAGA__B02), value 2, guess: "Rakuichi-Rakuza: Purchasing Production Buildings costs +40%
  Gold efficiency. Constructing Gold Buildings gains +40% Production efficiency."
  - Modifiers: ODA_NOBUNAGA_MOD_RAKUICHI_PRODUCTION_BUILDING_PURCHASE,
    ODA_NOBUNAGA_MOD_RAKUICHI_GOLD_BUILDING_PRODUCTION.
  - Why: +40% purchase on PRODUCTION buildings, +40% production on GOLD buildings.
- Bullet 3 (LEADER_ODA_NOBUNAGA__B03), value 2, guess: "Tenka Fubu: Temples provide -5 Happiness. Each Land military
  unit provides +1 Happiness."
  - Modifiers: ODA_NOBUNAGA_MOD_TENKA_FUBU_TEMPLE_PENALTY, ODA_NOBUNAGA_MOD_TENKA_FUBU_MILITARY_HAPPINESS_ATTACH.
  - Why: -5 Happiness on the temple line, +1 Happiness per land military unit.
  - SpecificTo: |BUILDING_ALTAR|UNIT_CLASS_COMBAT|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ODA_NOBUNAGA_TEPPO -> MOD_ODA_NOBUNAGA_TEPPO_TREE, NODE_ODA_NOBUNAGA_SIEGE_MARCH ->
  MOD_ODA_NOBUNAGA_SIEGE_MARCH_TREE, NODE_ODA_NOBUNAGA_SANZEN -> MOD_ODA_NOBUNAGA_SANZEN_TREE,
  NODE_ODA_NOBUNAGA_RAKUICHI -> MOD_ODA_NOBUNAGA_RAKUICHI_TREE, NODE_ODA_NOBUNAGA_TENKA ->
  MOD_ODA_NOBUNAGA_TENKA_TREE_01, NODE_ODA_NOBUNAGA_TENKA -> MOD_ODA_NOBUNAGA_TENKA_TREE_02, NODE_ODA_NOBUNAGA_TENKA
  -> MOD_ODA_NOBUNAGA_TENKA_TREE_03.

### Youmu Konpaku (LEADER_Youmu)

Ability TRAIT_LEADER_YOUMU_ABILITY; mod MAO-Leader-Youmu, Workshop 3646519031; frontend LeaderItems agrees; 14
modifiers, 2 bullets; shipped leader biases: Resources RESOURCE_IRON 10, Resources RESOURCE_HORSES 10.

- Agenda (LEADER_Youmu__AGENDA), Way of Two Swords: MOD_YOUMU_LEADER_AGENDA.
- Bullet 1 (LEADER_Youmu__B01), value 4, guess: "Half-Phantom Gardener: Warehouse Buildings gain +1 Production from
  adjacent resources ( Exploration adds +1 Culture, Modern adds +1 Science). Gardens gain +6 Food +6 Happiness,
  Pavilions gain +8 Food +8 Happiness, City Parks gain +12 Food +12 Happiness."
  - Modifiers: MOD_YOUMU_BUILDING_PRODUCTION, MOD_YOUMU_BUILDING_CULTURE_EX, MOD_YOUMU_BUILDING_SCIENCE_MO,
    MOD_YOUMU_GARDEN_BONUS_FOOD, MOD_YOUMU_GARDEN_BONUS_HAPPINESS, MOD_YOUMU_PAVILION_BONUS_FOOD,
    MOD_YOUMU_PAVILION_BONUS_HAPPINESS, MOD_YOUMU_PARK_BONUS_FOOD, MOD_YOUMU_PARK_BONUS_HAPPINESS.
  - Why: The three warehouse resource adjacencies by age, and the Garden / Pavilion / City Park Food and Happiness.
  - SpecificTo: |BUILDING_GARDEN|
- Bullet 2 (LEADER_Youmu__B02), value 3, guess: "Nitoryu: Infantry gains +3 Combat Strength when attacking district
  defenses (+5 during celebrations, also applies to enemy units). All units ignore enemy rough terrain defense
  bonuses. "I sever all illusions—my blade leaves no shadow." —Youmu Konpaku"
  - Modifiers: MOD_YOUMU_INFANTRY_VS_DISTRICT, MOD_YOUMU_INFANTRY_VS_DISTRICT_CELEBRATION,
    MOD_YOUMU_INFANTRY_VS_UNIT_CELEBRATION, MOD_YOUMU_IGNORE_ROUGH.
  - Why: The infantry district abilities (plain and in a celebration), the celebration vs-unit ability, and ignoring
    rough-terrain defense.
  - SpecificTo: |UNIT_CLASS_MELEE|UNIT_CLASS_INFANTRY|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Youmu_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Youmu_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Youmu_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Youmu_L2,
  NODE_Youmu_POLITICAL_BLADE_AUTHORITY -> MOD_Youmu_BLADE_AUTHORITY_TREE, NODE_Youmu_ECONOMIC_GARDENER ->
  MOD_Youmu_GARDENER_TREE, NODE_Youmu_SCIENTIFIC_SWORD_MASTERY -> MOD_Youmu_SWORD_MASTERY_TREE,
  NODE_Youmu_CULTURAL_HAKUGYOKUROU -> MOD_Youmu_HAKUGYOKUROU_TREE, NODE_Youmu_EXPANSIONIST_HALF_PHANTOM ->
  MOD_Youmu_HALF_PHANTOM_TREE.

### Mao Zedong (LEADER_MAOZEDONG)

Ability TRAIT_LEADER_MAOZEDONG_ABILITY; mod Mao Zedong, Workshop 3517202110; frontend LeaderItems agrees; 11
modifiers, 3 bullets; shipped leader biases: NaturalWonders 10000.

- Bullet 1 (LEADER_MAOZEDONG__B01), value 4, guess: "Building and Specialist maintenance efficiency +25%. Cities gain
  +2 Production for each connected settlement, scaling with era."
  - Modifiers: MAOZEDONG_MOD_1, MAOZEDONG_MOD_2, MAOZEDONG_MOD_ABILITY1.
  - Why: Building and specialist maintenance efficiency, and +2 Production per connected settlement.
- Bullet 2 (LEADER_MAOZEDONG__B02), value 4, guess: "During peacetime, each district population in settlements
  provides +0.5 Production, and each rural population provides +0.5 Food, scaling with era. Towns gain +15%
  Development Rate, and specialized towns gain +15% Yields."
  - Modifiers: MAOZEDONG_MOD_ABILITY2, MAOZEDONG_MOD_ABILITY3, MAOZEDONG_MOD_ABILITY4, MAOZEDONG_MOD_ABILITY5.
  - Why: Peacetime population yields, +15% town yields with a project, +15% town growth.
  - Note: MAOZEDONG_MOD_ABILITY3 (rural Food) has no peace requirement, unlike the text.
- Bullet 3 (LEADER_MAOZEDONG__B03), value 3, guess: "During wartime,+100% efficiency when purchase and production
  units.Units gain +1 Movement and ignore Zone of Control."
  - Modifiers: MAOZEDONG_MOD_ABILITY6, MAOZEDONG_MOD_ABILITY7, MAOZEDONG_MOD_ABILITY8, MAOZEDONG_MOD_ABILITY9.
  - Why: Wartime unit production and purchase +100%, +1 movement, ignore zone of control.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_EXPANSIONIST_LEGEND_MAOZEDONG_L1 -> MOD_ATTRIBUTE_EXPANSIONIST_LEGEND_ASHOKA_L2,
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_MAOZEDONG_L2 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_AMINA_L2.

### Gilgamesh (LEADER_KingofHeroes)

Ability TRAIT_LEADER_KingofHeroes_ABILITY; mod MAO-Leader-KingofHeroes, Workshop 3635072993; frontend LeaderItems
agrees; 9 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_KingofHeroes__AGENDA), Judgment of the Hero King: MOD_KingofHeroes_LEADER_AGENDA.
- Bullet 1 (LEADER_KingofHeroes__B01), value 4, guess: "Gate of Babylon: When Combat Units resolve combat, defeating
  an enemy unit grants Gold equal to the defeated unit's full Combat Strength. Resource tiles gain bonus yields by
  class: City Resources +1 Food, Bonus Resources +1 Production, Empire Resources +1 Gold."
  - Modifiers: MOD_KingofHeroes_GATE_KILL_GOLD_ATTACH, MOD_KingofHeroes_GATE_RESOURCE_CITY_FOOD,
    MOD_KingofHeroes_GATE_RESOURCE_BONUS_PRODUCTION, MOD_KingofHeroes_GATE_RESOURCE_EMPIRE_GOLD.
  - Why: Gold on kills and the three resource-class tile yields.
  - SpecificTo: |UNIT_CLASS_COMBAT|
- Bullet 2 (LEADER_KingofHeroes__B02), value 3, guess: "Majesty of the Hero King: Rejecting any Diplomatic Action
  greatly reduces the Influence required. +1 War Support on Wars you declare as the aggressor. Gain 100 Influence
  immediately when you conquer a Settlement (City or Town) (scales with Age and Game Speed)."
  - Modifiers: MOD_KingofHeroes_WISE_KING_FREE_REJECT, MOD_KingofHeroes_WISE_KING_WAR_SUPPORT,
    MOD_KingofHeroes_WISE_KING_CAPTURE_INFLUENCE.
  - Why: Cheaper rejections, +1 aggressor war support, 100 Influence on a first-time occupation.
- Bullet 3 (LEADER_KingofHeroes__B03), value 3, guess: "The Oldest King: Capital +50% Influence."
  - Modifiers: MOD_KingofHeroes_OLDEST_KING_CAPITAL_INFLUENCE.
  - Why: +50% Influence in the capital.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_KingofHeroes_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_KingofHeroes_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_KingofHeroes_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_KingofHeroes_L2.

### Kaguya Houraisan (LEADER_Houraisan)

Ability TRAIT_LEADER_Houraisan_ABILITY; mod MAO-Leader-Houraisan, Workshop 3645230017; frontend LeaderItems agrees; 19
modifiers, 3 bullets; shipped leader biases: FeatureClasses FEATURE_CLASS_VEGETATED 20.

- Agenda (LEADER_Houraisan__AGENDA), Lunar Wisdom: MOD_Houraisan_LEADER_AGENDA.
- Bullet 1 (LEADER_Houraisan__B01), value 5, guess: "Eternal Blessing: All cities gain +15% Food and +10% Happiness.
  Districts on vegetated terrain do not remove the tile's natural yields, and gain +1 Happiness. All Buildings gain +1
  Food from adjacent Resources."
  - Modifiers: MOD_Houraisan_ETERNAL_FOOD, MOD_Houraisan_ETERNAL_HAPPINESS, MOD_Houraisan_GRANT_NATURAL_YIELDS_FOREST,
    MOD_Houraisan_GRANT_NATURAL_YIELDS_RAINFOREST, MOD_Houraisan_GRANT_NATURAL_YIELDS_TAIGA,
    MOD_Houraisan_GRANT_NATURAL_YIELDS_SAVANNA, MOD_Houraisan_GRANT_NATURAL_YIELDS_SAGEBRUSH,
    MOD_Houraisan_GRANT_NATURAL_YIELDS_REDWOOD, MOD_Houraisan_VEGETATED_HAPPINESS_DISTRICT,
    MOD_Houraisan_BUILDING_FOOD.
  - Why: +15% Food, +10% Happiness, natural yields kept on the six vegetated features, district Happiness on
    vegetation, building Food adjacency.
  - Bias tags: FEATURE_CLASS_VEGETATED read from requirements or adjacencies.
- Bullet 2 (LEADER_Houraisan__B02), value 3, guess: "Forest of Hourai: Units gain +3 Combat Strength when fighting on
  vegetated terrain. Vision can see through vegetation, and vegetated terrain does not consume unit Movement."
  - Modifiers: MOD_Houraisan_BAMBOO_FOREST, MOD_Houraisan_IGNORE_VEGETATION_MOVEMENT,
    MOD_Houraisan_SEE_THROUGH_VEGETATION.
  - Why: +3 on vegetated terrain, ignore vegetation movement, see through features.
  - Bias tags: FEATURE_CLASS_VEGETATED read from requirements or adjacencies.
- Bullet 3 (LEADER_Houraisan__B03), value 3, guess: "Five Impossible Requests: Unlock five special projects across
  three ages, each providing unique bonus effects. "To live forever is to witness all of time." —Houraisan Kaguya"
  - Modifiers: MOD_Houraisan_UNLOCK_PROJECT_BUDDHA_BOWL, MOD_Houraisan_UNLOCK_PROJECT_JEWEL_BRANCH,
    MOD_Houraisan_UNLOCK_PROJECT_FIRE_RAT_ROBE, MOD_Houraisan_UNLOCK_PROJECT_DRAGON_JEWEL,
    MOD_Houraisan_UNLOCK_PROJECT_SWALLOW_COWRY.
  - Why: The five project unlocks.
  - SpecificTo:
    |PROJECT_BUDDHA_BOWL|PROJECT_JEWEL_BRANCH|PROJECT_FIRE_RAT_ROBE|PROJECT_DRAGON_JEWEL|PROJECT_SWALLOW_COWRY|
  - Note: The projects are the mod's own PROJECT_* rows; any requirement on them that names Kaguya would leave them
    unbuildable elsewhere. Not read.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Houraisan_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Houraisan_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Houraisan_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Houraisan_L2,
  NODE_HOURAISAN_POLITICAL_MOON_AUTHORITY -> MOD_HOURAISAN_MOON_AUTHORITY_TREE, NODE_HOURAISAN_ECONOMIC_ETERNITY ->
  MOD_HOURAISAN_ETERNITY_TREE, NODE_HOURAISAN_SCIENTIFIC_FIVE_IMPOSSIBLE -> MOD_HOURAISAN_FIVE_IMPOSSIBLE_TREE,
  NODE_HOURAISAN_CULTURAL_EIENTEI -> MOD_HOURAISAN_EIENTEI_TREE, NODE_HOURAISAN_EXPANSIONIST_LUNAR_EXILE ->
  MOD_HOURAISAN_LUNAR_EXILE_TREE.

### Tanya Degurechaff (LEADER_MAO_Tanya)

Ability TRAIT_LEADER_MAO_Tanya_ABILITY; mod MAO-Leader-MAO_Tanya, Workshop 3680373123; frontend LeaderItems agrees; 16
modifiers, 3 bullets; shipped leader biases: Resources RESOURCE_IRON 10, Resources RESOURCE_HORSES 8.

- Agenda (LEADER_MAO_Tanya__AGENDA), Rationalist: MOD_TANYA_LEADER_AGENDA.
- Bullet 1 (LEADER_MAO_Tanya__B01), value 2, guess: "Mage Technology: When at war, all Military Commanders gain Flight
  Gear — they can traverse and stop on Mountains."
  - Modifiers: MOD_TANYA_ACTIVATE_FLIGHT_GEAR.
  - Why: ABILITY_TANYA_FLIGHT_GEAR while at war.
  - Bias tags: TERRAIN_MOUNTAIN read from requirements or adjacencies.
- Bullet 2 (LEADER_MAO_Tanya__B02), value 3, guess: "Iron Discipline: All Military Commanders start with the Duty
  Commendation (Hero Attack). All military units gain up to +6 defense at low HP."
  - Modifiers: MOD_TANYA_GRANT_COMMENDATION_DUTY, MOD_TANYA_IRON_WILL_TIER1, MOD_TANYA_IRON_WILL_TIER2,
    MOD_TANYA_IRON_WILL_TIER3.
  - Why: The Duty commendation on army commanders and the three low-HP defense tiers.
  - SpecificTo: |UNIT_CLASS_ARMY_COMMANDER|
- Bullet 3 (LEADER_MAO_Tanya__B03), value 3, guess: "War Economy: Each ongoing war grants all cities +10% Gold and
  +20% Unit Training Efficiency (up to +50%/100%)."
  - Modifiers: MOD_TANYA_WAR_GOLD_1, MOD_TANYA_WAR_GOLD_2, MOD_TANYA_WAR_GOLD_3, MOD_TANYA_WAR_GOLD_4,
    MOD_TANYA_WAR_GOLD_5, MOD_TANYA_WAR_TRAINING_1, MOD_TANYA_WAR_TRAINING_2, MOD_TANYA_WAR_TRAINING_3,
    MOD_TANYA_WAR_TRAINING_4, MOD_TANYA_WAR_TRAINING_5.
  - Why: +10% Gold and +20% unit training per ongoing war, five steps each.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_MAO_Tanya_PALACE_POWER -> MOD_MAO_Tanya_PALACE_POWER_TREE, NODE_MAO_Tanya_MIND_LINK ->
  MOD_MAO_Tanya_MIND_LINK_TREE, NODE_MAO_Tanya_SWIFT_WIND -> MOD_MAO_Tanya_SWIFT_WIND_TREE, NODE_MAO_Tanya_THIRD_EYE
  -> MOD_MAO_Tanya_THIRD_EYE_TREE, NODE_MAO_Tanya_UNDERGROUND_WISDOM -> MOD_MAO_Tanya_UNDERGROUND_WISDOM_TREE.

### Olga Marie (LEADER_OLGA)

Ability TRAIT_LEADER_OLGA_ABILITY; mod MAO-Leader-OLGA, Workshop 3637045457; frontend LeaderItems agrees; 9 modifiers,
3 bullets; no shipped leader biases.

- Agenda (LEADER_OLGA__AGENDA), Guardian of Human Order: MOD_OLGA_LEADER_AGENDA.
- Bullet 1 (LEADER_OLGA__B01), value 3, guess: "Director of Chaldea: Unlocks Exchange Map, allowing insight into
  territories explored by other leaders. Breathtaking tiles in your Capital grant +1Science; Breathtaking tiles
  outside your Capital grant +1Happiness."
  - Modifiers: MOD_OLGA_TRADE_MAP, MOD_OLGA_CAPITAL_BREATHTAKING_SCIENCE, MOD_OLGA_NONCAPITAL_BREATHTAKING_HAPPINESS.
  - Why: Trade map action, and the capital / non-capital breathtaking yields.
- Bullet 2 (LEADER_OLGA__B02), value 3, guess: "SHEBA - Near-Future Observation Lens: Natural Wonder tiles yield +50%.
  Discovering a Natural Wonder grants +50Science, +50Culture (scales each Age), and +1Wildcard Attribute Point."
  - Modifiers: MOD_OLGA_NATURAL_WONDER_YIELD_BONUS, MOD_OLGA_DISCOVER_WONDER_SCIENCE,
    MOD_OLGA_DISCOVER_WONDER_CULTURE, MOD_OLGA_DISCOVER_WONDER_ATTRIBUTE.
  - Why: +50% wonder tile yields, Science and Culture on discovery, and the Wildcard point.
  - Bias tags: NATURAL_WONDER read from requirements or adjacencies.
- Bullet 3 (LEADER_OLGA__B03), value 1, guess: "Human Order Preservation Mission: Defensive Wars grant +2War Support."
  - Modifiers: MOD_OLGA_DEFENSIVE_WAR_SUPPORT.
  - Why: +2 war support when not the aggressor.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_OLGA_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_OLGA_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_OLGA_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_OLGA_L2.

### Yuyuko Saigyouji (LEADER_Yuyuko)

Ability TRAIT_LEADER_Yuyuko_ABILITY; mod MAO-Leader-Yuyuko, Workshop 3654327522; frontend LeaderItems agrees; 12
modifiers, 0 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 8, Terrains TERRAIN_HILL 10.

- Note: The description is prose with [N] breaks and hand-typed bullets, no [LI]. Its three named skills could be
  split if the author switches to [LI].

- Agenda (LEADER_Yuyuko__AGENDA), Impermanence of Life: MOD_Yuyuko_LEADER_AGENDA.
- Unplaced: MOD_Yuyuko_GHOST_PASS. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_Yuyuko_FEAST_HAPPINESS. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_Yuyuko_FEAST_CELEBRATION_DURATION. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_Yuyuko_FEAST_CELEBRATION_WONDER_PRODUCTION. The description has no bullets, so the ability is dealt
  whole.
- Unplaced: MOD_Yuyuko_FEAST_CELEBRATION_PROJECT_PRODUCTION. The description has no bullets, so the ability is dealt
  whole.
- Unplaced: MOD_Yuyuko_UNLOCK_MEIKAI_PROJECT. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_Yuyuko_UNLOCK_SHUNSETSU_PROJECT. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_Yuyuko_UNLOCK_SAIGYOU_PROJECT. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_YUYUKO_AS_EX_ACTIVATE_MEIKAI_TOURISM. The description has no bullets, so the ability is dealt whole.
- Unplaced: MOD_YUYUKO_AS_MODERN_ACTIVATE_MEIKAI_TOURISM. The description has no bullets, so the ability is dealt
  whole.
- Unplaced: MOD_YUYUKO_AS_MODERN_ACTIVATE_SHUNSETSU_TOURISM. The description has no bullets, so the ability is dealt
  whole.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Yuyuko_DEATH_BUTTERFLY -> MOD_Yuyuko_DEATH_BUTTERFLY_TREE, NODE_Yuyuko_NETHERWORLD_FEAST ->
  MOD_Yuyuko_NETHERWORLD_FEAST_TREE, NODE_Yuyuko_SAKURA_BLOOM -> MOD_Yuyuko_SAKURA_BLOOM_TREE,
  NODE_Yuyuko_ETERNAL_SLUMBER -> MOD_Yuyuko_ETERNAL_SLUMBER_TREE, NODE_Yuyuko_SAIGYOU_BLESSING ->
  MOD_Yuyuko_SAIGYOU_BLESSING_TREE, NODE_CIVIC_AQ_MAIN_PHILOSOPHY -> PROJECT_YUYUKO_MEIKAI_NO_YOBIGOE,
  NODE_CIVIC_EX_MAIN_SOVEREIGNTY -> PROJECT_YUYUKO_SHUNSETSU_IHEN, NODE_CIVIC_MO_MAIN_HEGEMONY ->
  PROJECT_YUYUKO_SAIGYOU_AYAKASHI.

### Nearl (LEADER_Nearl)

Ability TRAIT_LEADER_NEARL_ABILITY; mod MAO-Leader-Nearl, Workshop 3647483068; frontend LeaderItems agrees; 6
modifiers, 3 bullets; shipped leader biases: Resources RESOURCE_HORSES 10, Resources RESOURCE_IRON 10.

- Agenda (LEADER_Nearl__AGENDA), Chivalry: MOD_NEARL_LEADER_AGENDA.
- Bullet 1 (LEADER_Nearl__B01), value 3, guess: "Pegasus Aura: When you win combat in your territory, gain Influence
  equal to 100% of the defeated unit's production cost; Cavalry Units extend this effect to combat outside your
  territory."
  - Modifiers: MOD_NEARL_INFLUENCE_ON_KILL_DOMESTIC, MOD_NEARL_INFLUENCE_ON_KILL_CAVALRY_FOREIGN.
  - Why: Influence on wins in own territory, and for cavalry outside it.
  - SpecificTo: |UNIT_CLASS_CAVALRY|
- Bullet 2 (LEADER_Nearl__B02), value 2, guess: "Guardian's Oath: Cities with garrisoned units gain +2 Happiness;
  Garrisoned units gain +5 Combat Strength."
  - Modifiers: MOD_NEARL_CAVALRY_GARRISON_HAPPINESS, MOD_NEARL_GARRISON_COMBAT.
  - Why: +2 Happiness with a garrison, +5 for garrisoned units.
- Bullet 3 (LEADER_Nearl__B03), value 3, guess: "Defender Operator: Gain +5 Combat Strength while defending."
  - Modifiers: MOD_NEARL_HEAVY_UNIT_COMBAT.
  - Why: +5 while defending.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Nearl_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Nearl_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Nearl_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Nearl_L2,
  NODE_Nearl_MILITARISTIC_KNIGHT_GLORY -> MOD_Nearl_KNIGHT_GLORY_TREE, NODE_Nearl_CULTURAL_NOBLE_CREED ->
  MOD_Nearl_NOBLE_CREED_TREE, NODE_Nearl_SCIENTIFIC_TACTICAL_MASTERY -> MOD_Nearl_TACTICAL_MASTERY_TREE,
  NODE_Nearl_ECONOMIC_GUARDIAN_BLESSING -> MOD_Nearl_GUARDIAN_BLESSING_TREE, NODE_Nearl_EXPANSIONIST_CAVALRY_CHARGE ->
  MOD_Nearl_CAVALRY_CHARGE_TREE.

### Flandre Scarlet (LEADER_FLAN)

Ability TRAIT_LEADER_FLAN_ABILITY; mod MAO-Leader-Flan, Workshop 3660809274; frontend LeaderItems agrees; 10
modifiers, 4 bullets; shipped leader biases: Resources RESOURCE_IRON 10, Resources RESOURCE_HORSES 8.

- Agenda (LEADER_FLAN__AGENDA), Destructive Instinct: MOD_FLAN_LEADER_AGENDA.
- Bullet 1 (LEADER_FLAN__B01), value 3, guess: "Quadruple Existence: When gaining your first Military Commander,
  receive another Military Commander in your Capital with 1 Melee, 1 Ranged, and 1 Siege unit. These units will appear
  even if not yet unlocked."
  - Modifiers: MOD_FLAN_QUADRUPLE_EXISTENCE.
  - Why: The extra commander army, attached on having a first army commander.
  - SpecificTo: |UNIT_ARMY_COMMANDER|UNIT_CLASS_MELEE|UNIT_CLASS_RANGED|UNIT_CLASS_SIEGE|
- Bullet 2 (LEADER_FLAN__B02), value 3, guess: "Eye of Destruction: +20 Combat Strength vs enemies below 30% HP; Land
  military units +5 Combat Strength vs City Districts."
  - Modifiers: MOD_FLAN_FINISH_GRANT, MOD_FLAN_VS_DISTRICT.
  - Why: +20 vs wounded enemies, land units +5 vs districts.
- Bullet 3 (LEADER_FLAN__B03), value 2, guess: "Caged Bird: Heal 100 HP after capturing cities; Raze progress +1 per
  turn (faster razing), but Pillage yields -50%(Destoryed by Flandre)."
  - Modifiers: MOD_FLAN_CONQUEST_HEAL, MOD_FLAN_RAZE_SPEED, MOD_FLAN_PILLAGE_BUILDING_PENALTY,
    MOD_FLAN_PILLAGE_IMPROVEMENT_PENALTY.
  - Why: Heal on taking a city, faster razing, -50% pillage yields.
  - SpecificTo: |UNIT_CLASS_INFANTRY|
- Bullet 4 (LEADER_FLAN__B04), value 1, guess: "495 Years of Solitude: Settlement cap permanently -2, but +1
  Settlement cap for each conquered city."
  - Modifiers: MOD_FLAN_SOLITUDE_PENALTY, MOD_FLAN_CONQUEST_SETTLEMENT.
  - Why: -2 settlement cap, +1 per conquered city.
  - Note: Mostly a drawback; scored 1.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_FLAN_CRIMSON_POWER -> MOD_FLAN_CRIMSON_POWER_TREE, NODE_FLAN_DESTRUCTION_AURA ->
  MOD_FLAN_DESTRUCTION_AURA_TREE, NODE_FLAN_BASEMENT_WISDOM -> MOD_FLAN_BASEMENT_WISDOM_TREE,
  NODE_FLAN_VAMPIRE_STRENGTH -> MOD_FLAN_VAMPIRE_STRENGTH_TREE, NODE_FLAN_FORBIDDEN_MAGIC ->
  MOD_FLAN_FORBIDDEN_MAGIC_TREE.

### Patchouli Knowledge (LEADER_Patchouli)

Ability TRAIT_LEADER_PATCHOULI_ABILITY; mod MAO-Leader-Patchouli, Workshop 3653306249; frontend LeaderItems agrees; 8
modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 8, Terrains TERRAIN_FLAT 10.

- Agenda (LEADER_Patchouli__AGENDA), Guardian of Knowledge: MOD_PATCHOULI_LEADER_AGENDA.
- Bullet 1 (LEADER_Patchouli__B01), value 3, guess: "Seven Elements Archive: When constructing Libraries and the Great
  Library wonder, gain +60% Production. When constructing other science buildings, gain +30% Production."
  - Modifiers: MOD_PATCHOULI_SCIENCE_BUILDING_PRODUCTION, MOD_PATCHOULI_GREAT_LIBRARY_WONDER_PRODUCTION,
    MOD_PATCHOULI_LIBRARY_BUILDING_PRODUCTION.
  - Why: +30% toward SCIENCE buildings, plus +30% more for the Library and the Great Library.
  - SpecificTo: |WONDER_GREAT_LIBRARY|BUILDING_LIBRARY|
- Bullet 2 (LEADER_Patchouli__B02), value 4, guess: "Power of Knowledge: All buildings with Great Work slots gain +1
  Great Work slot. For each Great Work you own, all cities gain +4/8/16Science, +2/4/8Happiness (scales with Age)."
  - Modifiers: MOD_PATCHOULI_EXTRA_GREAT_WORK_SLOTS, MOD_PATCHOULI_GREAT_WORK_SCIENCE,
    MOD_PATCHOULI_GREAT_WORK_HAPPINESS.
  - Why: +1 great work slot, Science and Happiness per great work.
- Bullet 3 (LEADER_Patchouli__B03), value 1, guess: "Endless Pursuit of Knowledge: Researching Future Tech grants +30%
  efficiency."
  - Modifiers: MOD_PATCHOULI_FUTURE_TECH_EFFICIENCY.
  - Why: +30% on the three future tech nodes.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Patchouli_ELEMENTAL_MASTERY -> MOD_PATCHOULI_ELEMENTAL_MASTERY_TREE, NODE_Patchouli_ELEMENTAL_MASTERY ->
  MOD_PATCHOULI_ELEMENTAL_MASTERY_CULTURE, NODE_Patchouli_GREAT_LIBRARY -> MOD_PATCHOULI_GREAT_LIBRARY_TREE,
  NODE_Patchouli_MAGIC_RESEARCH -> MOD_PATCHOULI_MAGIC_RESEARCH_TREE, NODE_Patchouli_KNOWLEDGE_KEEPER ->
  MOD_PATCHOULI_KNOWLEDGE_KEEPER_TREE, NODE_Patchouli_SEVEN_ELEMENTS -> MOD_PATCHOULI_SEVEN_ELEMENTS_TREE.

### Bocchi (LEADER_Bocchi)

Ability TRAIT_LEADER_BOCCHI_ABILITY; mod MAO-Leader-Bocchi, Workshop 3649901296; frontend LeaderItems agrees; 14
modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 8, Terrains TERRAIN_FLAT 10.

- Agenda (LEADER_Bocchi__AGENDA), Social Anxiety Observer: MOD_BOCCHI_LEADER_AGENDA.
- Bullet 1 (LEADER_Bocchi__B01), value 2, guess: "Heart's Wall: Diplomatic Actions: if accepted, +40/80/160 Happiness;
  if rejected, -50/100/200 Happiness (scales with Age)."
  - Modifiers: MOD_BOCCHI_DIPLO_BONUS_ACCEPT, MOD_BOCCHI_DIPLO_PENALTY_REJECT.
  - Why: +40 / -50 Happiness on accepted / rejected actions.
- Bullet 2 (LEADER_Bocchi__B02), value 3, guess: "Shining Alone: With no Friendly or Helpful relationships, +30%
  Happiness. Each leader with either relationship grants +4/8/16Gold, Science, Culture (scales with Age)."
  - Modifiers: MOD_BOCCHI_LONER_HAPPINESS_BONUS, MOD_BOCCHI_FRIEND_GOLD_FRIENDLY, MOD_BOCCHI_FRIEND_GOLD_HELPFUL,
    MOD_BOCCHI_FRIEND_SCIENCE_FRIENDLY, MOD_BOCCHI_FRIEND_SCIENCE_HELPFUL, MOD_BOCCHI_FRIEND_CULTURE_FRIENDLY,
    MOD_BOCCHI_FRIEND_CULTURE_HELPFUL.
  - Why: +30% Happiness with no Friendly or Helpful leaders, and the six per-relationship yields.
- Bullet 3 (LEADER_Bocchi__B03), value 2, guess: "Closet Life: Trade Route capacity -1, Trade Range -50; each Imported
  Resource grants +2/4/8 Culture (scales with Age)."
  - Modifiers: MOD_BOCCHI_TRADE_CAPACITY_PENALTY, MOD_BOCCHI_TRADE_RANGE_LAND_PENALTY,
    MOD_BOCCHI_TRADE_RANGE_SEA_PENALTY, MOD_BOCCHI_IMPORTED_RESOURCE_CULTURE.
  - Why: -1 trade capacity, -50 range, Culture per imported resource.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Bocchi_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Bocchi_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Bocchi_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Bocchi_L2,
  NODE_Bocchi_CULTURAL_GUITAR_HERO -> MOD_Bocchi_GUITAR_HERO_TREE, NODE_Bocchi_CULTURAL_GUITAR_HERO ->
  MOD_Bocchi_GUITAR_HERO_TREE_SCIENCE, NODE_Bocchi_ECONOMIC_BEDROOM_ECONOMIST -> MOD_Bocchi_BEDROOM_ECONOMIST_TREE,
  NODE_Bocchi_DIPLOMATIC_SOCIAL_ANXIETY -> MOD_Bocchi_SOCIAL_ANXIETY_TREE, NODE_Bocchi_SCIENTIFIC_KESSOKU_BAND ->
  MOD_Bocchi_KESSOKU_BAND_TREE, NODE_Bocchi_SCIENTIFIC_KESSOKU_BAND -> MOD_Bocchi_KESSOKU_BAND_TREE_SCIENCE,
  NODE_Bocchi_EXPANSIONIST_STARRY_NIGHT -> MOD_Bocchi_STARRY_NIGHT_TREE.

### Astolfo (Saber) (LEADER_MAO_Astolfo)

Ability TRAIT_LEADER_MAO_Astolfo_ABILITY; mod MAO-Leader-MAO_Astolfo, Workshop 3677067116; frontend LeaderItems
agrees; 7 modifiers, 2 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 10, Biomes BIOME_PLAINS 8, Terrains
TERRAIN_FLAT 8, Terrains TERRAIN_HILL 6.

- Agenda (LEADER_MAO_Astolfo__AGENDA), Heart of Adventure: MOD_MAO_Astolfo_LEADER_AGENDA.
- Bullet 1 (LEADER_MAO_Astolfo__B01), value 3, guess: "Evaporation of Reason (Saber): City Science and Culture output
  is reduced by -99%. All cities gain +20% Happiness. 60% of your total Happiness is directly added as global Science
  and Culture. (AI: Only +20% Happiness, no penalties or conversion)"
  - Modifiers: MOD_MAO_Astolfo_NO_SCIENCE, MOD_MAO_Astolfo_NO_CULTURE, MOD_MAO_Astolfo_HAPPINESS_BOOST,
    MOD_MAO_Astolfo_HAPPINESS_TO_SCIENCE_CULTURE.
  - Why: -99% Science and Culture, +20% Happiness, 60% Happiness to Science and Culture (the penalties and conversion
    only for humans).
- Bullet 2 (LEADER_MAO_Astolfo__B02), value 2, guess: "Grandiose Triumphant Return: Melee units gain +3 Combat
  Strength. Each melee unit provides +2 Happiness."
  - Modifiers: MOD_MAO_Astolfo_COMBAT_STRENGTH, MOD_MAO_Astolfo_COMBAT_ATTACH_HAPPINESS.
  - Why: Melee +3 and Happiness per melee unit.
  - SpecificTo: |UNIT_CLASS_MELEE|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_MAO_Astolfo_PALACE_POWER -> MOD_MAO_Astolfo_PALACE_POWER_TREE, NODE_MAO_Astolfo_MIND_LINK ->
  MOD_MAO_Astolfo_MIND_LINK_TREE, NODE_MAO_Astolfo_SWIFT_WIND -> MOD_MAO_Astolfo_SWIFT_WIND_TREE,
  NODE_MAO_Astolfo_THIRD_EYE -> MOD_MAO_Astolfo_THIRD_EYE_TREE, NODE_MAO_Astolfo_UNDERGROUND_WISDOM ->
  MOD_MAO_Astolfo_UNDERGROUND_WISDOM_TREE.

### Okita Sōji (FGO) (LEADER_OKITA_SOUJI)

Ability TRAIT_LEADER_OKITA_SOUJI_ABILITY; mod MAO-Leader-OKITA_SOUJI, Workshop 3642496682; frontend LeaderItems
agrees; 13 modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_OKITA_SOUJI__AGENDA), Way of Makoto: MOD_OKITA_SOUJI_LEADER_AGENDA.
- Bullet 1 (LEADER_OKITA_SOUJI__B01), value 3, guess: "Sandanzuki: Gain Combat Strength when attacking wounded enemies
  based on their damage (1%→+3, 25%→+4, 50%→+5, 75%→+6). Additionally, flanking bonuses are doubled when attacking."
  - Modifiers: MOD_OKITA_SOUJI_WOUNDED_TIER1, MOD_OKITA_SOUJI_WOUNDED_TIER2, MOD_OKITA_SOUJI_WOUNDED_TIER3,
    MOD_OKITA_SOUJI_WOUNDED_TIER4, MOD_OKITA_SOUJI_FLANK_ATTACK_DOUBLE.
  - Why: The four wounded-enemy tiers and doubled flanking.
- Bullet 2 (LEADER_OKITA_SOUJI__B02), value 2, guess: "Banner of Makoto: Each Infantry unit provides +1 Culture
  (scales with Age)."
  - Modifiers: MOD_OKITA_SOUJI_INFANTRY_CULTURE_AQ, MOD_OKITA_SOUJI_INFANTRY_CULTURE_EX,
    MOD_OKITA_SOUJI_INFANTRY_CULTURE_MO.
  - Why: Culture per infantry unit, one row per age.
  - SpecificTo: |UNIT_CLASS_INFANTRY|
- Bullet 3 (LEADER_OKITA_SOUJI__B03), value 3, guess: "First Unit Captain: Military Commanders gain +30% experience.
  All Military Commanders provide +10, +5% Happiness, and +20% Military Unit training speed to their city."
  - Modifiers: MOD_OKITA_SOUJI_COMMANDER_EXPERIENCE, MOD_OKITA_SOUJI_COMMAND_HAPPINESS_FLAT_ATTACH,
    MOD_OKITA_SOUJI_COMMAND_HAPPINESS_PCT_ATTACH, MOD_OKITA_SOUJI_COMMAND_MIL_PROD_ATTACH.
  - Why: +30% commander XP and the three commander city attachments.
  - SpecificTo: |UNIT_CLASS_COMMAND|UNIT_CLASS_COMBAT|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_OKITA_SOUJI_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_OKITA_SOUJI_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_OKITA_SOUJI_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_OKITA_SOUJI_L2.

### Eirin Yagokoro (LEADER_EIRIN)

Ability TRAIT_LEADER_EIRIN_ABILITY; mod MAO-Leader-EIRIN, Workshop 3659192739; frontend LeaderItems agrees; 10
modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 8, Biomes BIOME_PLAINS 6, Terrains TERRAIN_FLAT 6.

- Agenda (LEADER_EIRIN__AGENDA), Sage of Eientei: MOD_EIRIN_LEADER_AGENDA.
- Bullet 1 (LEADER_EIRIN__B01), value 4, guess: "Brain of the Moon: All Warehouse buildings gain +1 base yields. +20%
  Science towards researching Technologies."
  - Modifiers: MOD_EIRIN_WAREHOUSE_FOOD, MOD_EIRIN_WAREHOUSE_PRODUCTION, MOD_EIRIN_WAREHOUSE_GOLD,
    MOD_EIRIN_TECH_EFFICIENCY.
  - Why: +1 Food, Production and Gold on WAREHOUSE buildings, +20% tech efficiency.
- Bullet 2 (LEADER_EIRIN__B02), value 3, guess: "Hourai Elixir: All Building Maintenance efficiency +100% (maintenance
  cost halved). All settlements cannot be damaged by Plague."
  - Modifiers: MOD_EIRIN_BUILDING_MAINTENANCE_EFFICIENCY, MOD_EIRIN_PLAGUE_IMMUNITY.
  - Why: Building maintenance efficiency +100%, plague immunity.
- Bullet 3 (LEADER_EIRIN__B03), value 3, guess: "Moon Forsaker: Distant Lands settlements: Growth Rate +30%, Happiness
  +5, first Building is free."
  - Modifiers: MOD_EIRIN_DISTANT_FREE_BUILDING, MOD_EIRIN_DISTANT_LAND_GROWTH, MOD_EIRIN_DISTANT_LAND_HAPPINESS.
  - Why: The three REQUIREMENT_CITY_IS_DISTANT_LANDS lines.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_EIRIN_PALACE_POWER -> MOD_EIRIN_PALACE_POWER_TREE, NODE_EIRIN_MIND_LINK -> MOD_EIRIN_MIND_LINK_TREE,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_CAMELS, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_CRABS,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_FISH, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_FURS,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_HIDES, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_HORSES,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_IVORY, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_LLAMAS,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_PEARLS, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_SILK,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_TRUFFLES, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_TURTLES,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_WHALES, NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_WILD_GAME,
  NODE_EIRIN_PET_BOND -> MOD_EIRIN_PET_BOND_TREE_WOOL, NODE_EIRIN_THIRD_EYE -> MOD_EIRIN_THIRD_EYE_TREE,
  NODE_EIRIN_UNDERGROUND_WISDOM -> MOD_EIRIN_UNDERGROUND_WISDOM_TREE.

### Maho Shojo Witch Trial (LEADER_Ema)

Ability TRAIT_LEADER_Ema_ABILITY; mod MAO-Leader-MahoShojoWitchTrial, Workshop 3655381520; frontend LeaderItems
agrees; 11 modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 10, Biomes BIOME_PLAINS 6, Terrains
TERRAIN_FLAT 8.

- Agenda (LEADER_Ema__AGENDA), Bond Guardian: MOD_Ema_LEADER_AGENDA.
- Bullet 1 (LEADER_Ema__B01), value 3, guess: "Witch Hunt:+8 Combat Strength against enemy Commanders. Gain
  150/300/600Culture when defeating enemy Commanders."
  - Modifiers: MOD_Ema_VS_COMMANDER_STRENGTH, MOD_Ema_COMMANDER_KILL_CULTURE.
  - Why: +8 vs commanders, Culture on defeating one.
  - SpecificTo: |UNIT_CLASS_COMMAND|
- Bullet 2 (LEADER_Ema__B02), value 3, guess: "Heart of Bonds:+5/10/20Influence per Friendly, Helpful, or Alliance
  relationship. All units gain +3 Combat Strength per Alliance (max 2 = +6)."
  - Modifiers: MOD_Ema_INFLUENCE_FRIENDLY, MOD_Ema_INFLUENCE_HELPFUL, MOD_Ema_INFLUENCE_ALLIANCE,
    MOD_Ema_RELATIONSHIP_COMBAT_BONUS, MOD_Ema_RELATIONSHIP_COMBAT_BONUS_2.
  - Why: Influence per Friendly / Helpful / Alliance, and +3 per alliance (two steps).
- Bullet 3 (LEADER_Ema__B03), value 2, guess: "Warmth of Protection: All Defensive Fortifications (including
  Improvements) gain +2Happiness. Special Diplomatic Actions: Witch Trial Pact and Witch Verdict."
  - Modifiers: MOD_Ema_FORTIFICATION_HAPPINESS. Hidden: MOD_Ema_UNLOCK_WITCH_TRIAL_PACT, MOD_Ema_UNLOCK_WITCH_VERDICT.
  - Why: +2 Happiness on FORTIFICATION constructibles.
  - Note: The two special diplomatic actions are named in text that sits inside this bullet (after its [/LIST]), so
    their unlocks travel here as hidden rows.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Ema_BONDS_POWER -> MOD_Ema_BONDS_POWER_TREE, NODE_Ema_WITCH_HUNTER -> MOD_Ema_WITCH_HUNTER_TREE,
  NODE_Ema_GENTLE_HEART -> MOD_Ema_GENTLE_HEART_TREE, NODE_Ema_FRIENDSHIP -> MOD_Ema_FRIENDSHIP_TREE, NODE_Ema_COURAGE
  -> MOD_Ema_COURAGE_TREE.

### Maho Shojo Witch Trial (LEADER_Hiro)

Ability TRAIT_LEADER_Hiro_ABILITY; mod MAO-Leader-MahoShojoWitchTrial, Workshop 3655381520; frontend LeaderItems
agrees; 59 modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 5, Terrains TERRAIN_MOUNTAIN 10,
Terrains TERRAIN_HILL 8.

- Bullet 1 (LEADER_Hiro__B01), value 3, guess: "Death Rewind:Ranged units and Army Commanders gain 1 respawn charge,
  respawning with 1% health. Commander respawn time -75%."
  - Modifiers: MOD_Hiro_RANGED_RESPAWN_ABILITY, MOD_Hiro_COMMANDER_RESPAWN_ABILITY, MOD_Hiro_COMMANDER_RESPAWN_SPEED.
  - Why: Respawn charges for ranged units and commanders, -75% commander respawn time.
  - SpecificTo: |UNIT_CLASS_RANGED|UNIT_CLASS_COMMAND|
- Bullet 2 (LEADER_Hiro__B02), value 2, guess: "Justice Verdict:+1War Support when declaring War. +30% Influence
  efficiency towards adding War Support."
  - Modifiers: MOD_Hiro_WAR_SUPPORT_AGGRESSOR, MOD_Hiro_WAR_SUPPORT_INFLUENCE_EFFICIENCY.
  - Why: +1 aggressor war support, +30% on DIPLOMACY_ACTION_DECLARE_WAR.
- Bullet 3 (LEADER_Hiro__B03), value 3, guess: "Triumph Legacy: Each completed major Triumph gives your Capital +10%
  to that Attribute's yield (stacks on the same Attribute, current Age only). Special Diplomatic Actions: Witch Trial
  Pact and Witch Verdict."
  - Modifiers: MOD_Hiro_LEGACY_CAP_AQ_CULTURAL_1, MOD_Hiro_LEGACY_CAP_AQ_CULTURAL_2,
    MOD_Hiro_LEGACY_CAP_AQ_CULTURAL_3, MOD_Hiro_LEGACY_CAP_AQ_DIPLOMATIC_1, MOD_Hiro_LEGACY_CAP_AQ_DIPLOMATIC_2,
    MOD_Hiro_LEGACY_CAP_AQ_DIPLOMATIC_3, MOD_Hiro_LEGACY_CAP_AQ_ECONOMIC_1, MOD_Hiro_LEGACY_CAP_AQ_ECONOMIC_2,
    MOD_Hiro_LEGACY_CAP_AQ_ECONOMIC_3, MOD_Hiro_LEGACY_CAP_AQ_EXPANSIONIST_1, MOD_Hiro_LEGACY_CAP_AQ_EXPANSIONIST_2,
    MOD_Hiro_LEGACY_CAP_AQ_EXPANSIONIST_3, MOD_Hiro_LEGACY_CAP_AQ_MILITARISTIC_1,
    MOD_Hiro_LEGACY_CAP_AQ_MILITARISTIC_2, MOD_Hiro_LEGACY_CAP_AQ_MILITARISTIC_3, MOD_Hiro_LEGACY_CAP_AQ_SCIENTIFIC_1,
    MOD_Hiro_LEGACY_CAP_AQ_SCIENTIFIC_2, MOD_Hiro_LEGACY_CAP_AQ_SCIENTIFIC_3, MOD_Hiro_LEGACY_CAP_EX_CULTURAL_1,
    MOD_Hiro_LEGACY_CAP_EX_CULTURAL_2, MOD_Hiro_LEGACY_CAP_EX_CULTURAL_3, MOD_Hiro_LEGACY_CAP_EX_DIPLOMATIC_1,
    MOD_Hiro_LEGACY_CAP_EX_DIPLOMATIC_2, MOD_Hiro_LEGACY_CAP_EX_DIPLOMATIC_3, MOD_Hiro_LEGACY_CAP_EX_ECONOMIC_1,
    MOD_Hiro_LEGACY_CAP_EX_ECONOMIC_2, MOD_Hiro_LEGACY_CAP_EX_ECONOMIC_3, MOD_Hiro_LEGACY_CAP_EX_EXPANSIONIST_1,
    MOD_Hiro_LEGACY_CAP_EX_EXPANSIONIST_2, MOD_Hiro_LEGACY_CAP_EX_EXPANSIONIST_3,
    MOD_Hiro_LEGACY_CAP_EX_MILITARISTIC_1, MOD_Hiro_LEGACY_CAP_EX_MILITARISTIC_2,
    MOD_Hiro_LEGACY_CAP_EX_MILITARISTIC_3, MOD_Hiro_LEGACY_CAP_EX_SCIENTIFIC_1, MOD_Hiro_LEGACY_CAP_EX_SCIENTIFIC_2,
    MOD_Hiro_LEGACY_CAP_EX_SCIENTIFIC_3, MOD_Hiro_LEGACY_CAP_MO_CULTURAL_1, MOD_Hiro_LEGACY_CAP_MO_CULTURAL_2,
    MOD_Hiro_LEGACY_CAP_MO_CULTURAL_3, MOD_Hiro_LEGACY_CAP_MO_DIPLOMATIC_1, MOD_Hiro_LEGACY_CAP_MO_DIPLOMATIC_2,
    MOD_Hiro_LEGACY_CAP_MO_DIPLOMATIC_3, MOD_Hiro_LEGACY_CAP_MO_ECONOMIC_1, MOD_Hiro_LEGACY_CAP_MO_ECONOMIC_2,
    MOD_Hiro_LEGACY_CAP_MO_ECONOMIC_3, MOD_Hiro_LEGACY_CAP_MO_EXPANSIONIST_1, MOD_Hiro_LEGACY_CAP_MO_EXPANSIONIST_2,
    MOD_Hiro_LEGACY_CAP_MO_EXPANSIONIST_3, MOD_Hiro_LEGACY_CAP_MO_MILITARISTIC_1,
    MOD_Hiro_LEGACY_CAP_MO_MILITARISTIC_2, MOD_Hiro_LEGACY_CAP_MO_MILITARISTIC_3, MOD_Hiro_LEGACY_CAP_MO_SCIENTIFIC_1,
    MOD_Hiro_LEGACY_CAP_MO_SCIENTIFIC_2, MOD_Hiro_LEGACY_CAP_MO_SCIENTIFIC_3.
  - Why: The capital +10% rows, one per completed triumph (54 rows).
  - Note: The text names Witch Trial Pact and Witch Verdict, but Hiro's ability has no modifier that unlocks them.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Hiro_DEATH_REWIND -> MOD_Hiro_DEATH_REWIND_TREE, NODE_Hiro_PAIN_MEMORY -> MOD_Hiro_PAIN_MEMORY_TREE,
  NODE_Hiro_TRUTH_SEEKER -> MOD_Hiro_TRUTH_SEEKER_TREE, NODE_Hiro_LOOP_MASTER -> MOD_Hiro_LOOP_MASTER_TREE,
  NODE_Hiro_SURVIVOR -> MOD_Hiro_SURVIVOR_TREE.

### Maho Shojo Witch Trial (LEADER_Shelly)

Ability TRAIT_LEADER_Shelly_ABILITY; mod MAO-Leader-MahoShojoWitchTrial, Workshop 3655381520; frontend LeaderItems
agrees; 10 modifiers, 2 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 6, Biomes BIOME_PLAINS 8, Terrains
TERRAIN_COAST 10.

- Agenda (LEADER_Shelly__AGENDA), Always Best Friends: MOD_Shelly_LEADER_AGENDA.
- Bullet 1 (LEADER_Shelly__B01), value 3, guess: "Crusher: Melee units ignore the wounded penalty. +5 Combat Strength
  against Districts, ignore Zone of Control, and take 110% damage. Recon units can ignore borders and enter foreign
  territory."
  - Modifiers: MOD_Shelly_CRUSHER_NO_REDUCTION, MOD_Shelly_CRUSHER_DISTRICT_CS, MOD_Shelly_CRUSHER_IGNORE_ZOC,
    MOD_Shelly_CRUSHER_TAKE_HIT, MOD_Shelly_SCOUT_IGNORE_BORDERS.
  - Why: The four Crusher lines (no wounded penalty, +5 vs districts, ignore ZOC, 110% damage taken) and recon units
    entering foreign land.
  - SpecificTo: |UNIT_CLASS_MELEE|UNIT_CLASS_RECON|
- Bullet 2 (LEADER_Shelly__B02), value 2, guess: "Bumbling Detective: Espionage Actions take +50% time to complete. On
  a successful Espionage Action, gain +50/100/200 Influence."
  - Modifiers: MOD_Shelly_FAKE_SPY_SLOW, MOD_Shelly_FAKE_SPY_INFLUENCE.
  - Why: -50% espionage speed, Influence on a successful action.
- Unplaced: MOD_Shelly_UNLOCK_WITCH_TRIAL_PACT. The two special diplomatic actions are named in the text after
  [/BLIST], outside every bullet, so they stay with Shelly.
- Unplaced: MOD_Shelly_UNLOCK_WITCH_VERDICT. The two special diplomatic actions are named in the text after [/BLIST],
  outside every bullet, so they stay with Shelly.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Shelly_DETECTIVE_EYE -> MOD_Shelly_DETECTIVE_EYE_TREE, NODE_Shelly_DEDUCTION -> MOD_Shelly_DEDUCTION_TREE,
  NODE_Shelly_CURIOSITY -> MOD_Shelly_CURIOSITY_TREE, NODE_Shelly_INSIGHT -> MOD_Shelly_INSIGHT_TREE,
  NODE_Shelly_WISDOM -> MOD_Shelly_WISDOM_TREE.

### Yamada Ryo (LEADER_Yamada)

Ability TRAIT_LEADER_Yamada_ABILITY; mod MAO-Leader-Yamada, Workshop 3650228385; frontend LeaderItems agrees; 7
modifiers, 3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 8, Terrains TERRAIN_FLAT 10.

- Agenda (LEADER_Yamada__AGENDA), Cool Observer: MOD_Yamada_LEADER_AGENDA.
- Bullet 1 (LEADER_Yamada__B01), value 3, guess: "Bass Solo: All Culture buildings gain Science adjacency; each
  Culture building built grants +100 Gold (scales with Age)."
  - Modifiers: MOD_Yamada_CULTURE_SCI_ADJ, MOD_Yamada_BASS_SOLO_GOLD_ON_CULTURE_BUILDING.
  - Why: Science adjacency on culture buildings, Gold per culture building built.
- Bullet 2 (LEADER_Yamada__B02), value 2, guess: "Cool Weirdo: Each Neutral relationship grants +3 Culture (scales
  with Age)."
  - Modifiers: MOD_Yamada_COOL_WEIRDO_NEUTRAL_CULTURE.
  - Why: +3 Culture per Neutral relationship.
- Bullet 3 (LEADER_Yamada__B03), value 3, guess: "Living on Weeds: When Gold per turn is negative, +30% Culture and
  +30% Science; when positive, +15% Culture only."
  - Modifiers: MOD_Yamada_NEGATIVE_GOLD_CULTURE, MOD_Yamada_NEGATIVE_GOLD_SCIENCE, MOD_Yamada_POSITIVE_GOLD_CULTURE.
  - Why: +30% / +30% with negative Gold, +15% Culture otherwise.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_YAMADA_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_YAMADA_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_YAMADA_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_YAMADA_L2,
  NODE_Yamada_CULTURAL_GUITAR_HERO -> MOD_Yamada_GUITAR_HERO_TREE, NODE_Yamada_CULTURAL_GUITAR_HERO ->
  MOD_Yamada_GUITAR_HERO_TREE_SCIENCE, NODE_Yamada_ECONOMIC_BEDROOM_ECONOMIST -> MOD_Yamada_BEDROOM_ECONOMIST_TREE,
  NODE_Yamada_DIPLOMATIC_SOCIAL_ANXIETY -> MOD_Yamada_SOCIAL_ANXIETY_TREE, NODE_Yamada_SCIENTIFIC_KESSOKU_BAND ->
  MOD_Yamada_KESSOKU_BAND_TREE, NODE_Yamada_SCIENTIFIC_KESSOKU_BAND -> MOD_Yamada_KESSOKU_BAND_TREE_SCIENCE,
  NODE_Yamada_EXPANSIONIST_STARRY_NIGHT -> MOD_Yamada_STARRY_NIGHT_TREE.

### Alice Margatroid (LEADER_Margatroid)

Ability TRAIT_LEADER_MARGATROID_ABILITY; mod MAO-Leader-Margatroid, Workshop 3648069483; frontend LeaderItems agrees;
6 modifiers, 2 bullets; shipped leader biases: FeatureClasses FEATURE_CLASS_VEGETATED 15, Resources RESOURCE_IRON 8,
Resources RESOURCE_HORSES 6.

- Agenda (LEADER_Margatroid__AGENDA), Doll Collector: MOD_MARGATROID_LEADER_AGENDA.
- Bullet 1 (LEADER_Margatroid__B01), value 3, guess: "Doll Workshop: Each adjacent Woodcutter provides Buildings with
  +1 Production. +50% Production towards Production Buildings."
  - Modifiers: MOD_MARGATROID_WOODCUTTER_ADJACENCY_PRODUCTION, MOD_MARGATROID_PRODUCTION_BUILDING_SPEED.
  - Why: Woodcutter Production adjacency on buildings, +50% toward PRODUCTION buildings.
  - SpecificTo: |IMPROVEMENT_WOODCUTTER|
- Bullet 2 (LEADER_Margatroid__B02), value 3, guess: "Puppeteer: Army Commanders start with the Valor Commendation
  (grants "Second Chance" ability). Vegetated Terrain does not end Commander Movement. Units in Commander Formation
  gain +10 Healing per turn. "Leave it to the dolls."—Alice Margatroid"
  - Modifiers: MOD_MARGATROID_COMMANDER_COMMENDATION, MOD_MARGATROID_COMMANDER_IGNORE_VEGETATION,
    MOD_MARGATROID_FORMATION_HEAL_BOOST.
  - Why: Valor commendation, commanders ignore vegetation, +10 heal in formation.
  - Bias tags: FEATURE_CLASS_VEGETATED read from requirements or adjacencies.
  - SpecificTo: |UNIT_CLASS_ARMY_COMMANDER|
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Margatroid_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Margatroid_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Margatroid_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Margatroid_L2,
  NODE_Margatroid_MILITARISTIC_KNIGHT_GLORY -> MOD_Margatroid_KNIGHT_GLORY_TREE, NODE_Margatroid_CULTURAL_NOBLE_CREED
  -> MOD_Margatroid_NOBLE_CREED_TREE, NODE_Margatroid_SCIENTIFIC_TACTICAL_MASTERY ->
  MOD_Margatroid_TACTICAL_MASTERY_TREE, NODE_Margatroid_ECONOMIC_GUARDIAN_BLESSING ->
  MOD_Margatroid_GUARDIAN_BLESSING_TREE, NODE_Margatroid_EXPANSIONIST_CAVALRY_CHARGE ->
  MOD_Margatroid_CAVALRY_CHARGE_TREE.

### Cirno 2.0 (LEADER_Cirno)

Ability TRAIT_LEADER_Cirno_ABILITY; mod MAO-Leader-Cirno, Workshop 3660224019; frontend LeaderItems agrees; 16
modifiers, 2 bullets; shipped leader biases: Biomes BIOME_TUNDRA 15, Biomes BIOME_GRASSLAND 2, Terrains TERRAIN_FLAT
5.

- Agenda (LEADER_Cirno__AGENDA), Confidence of ⑨: MOD_Cirno_LEADER_AGENDA.
- Bullet 1 (LEADER_Cirno__B01), value 2, guess: "Perfect Freeze: Your units are immune to blizzard damage; Units in
  tundra gain +1 Agility +2 Bravery +⑨ Strength = ？"
  - Modifiers: MOD_Cirno_BLIZZARD_IMMUNITY, MOD_Cirno_ENEMY_BLIZZARD_VULNERABILITY, MOD_Cirno_TUNDRA_COMBAT,
    MOD_Cirno_TUNDRA_MOVEMENT, MOD_Cirno_TUNDRA_HEAL.
  - Why: Blizzard immunity, extra blizzard damage to others, and the three tundra lines.
  - Bias tags: BIOME_TUNDRA read from requirements or adjacencies.
- Bullet 2 (LEADER_Cirno__B02), value 4, guess: "Perfect Math: Cities have -90% Science and 500% Happiness converts to
  Science. Towns skip the penalty and conversion; Science buildings gain +1 Happiness adjacency from Resources and
  Wonders. All Science buildings +900% build speed and +90% Gold purchase efficiency. All Specialists gain +200%
  Happiness maintenance efficiency."
  - Modifiers: MOD_Cirno_PERFECT_MATH_CONVERSION, MOD_Cirno_PERFECT_MATH_NO_SCIENCE,
    MOD_Cirno_PERFECT_MATH_CONVERSION_AI, MOD_Cirno_PERFECT_MATH_NO_SCIENCE_AI, MOD_Cirno_SCIENCE_BUILDING_PRODUCTION,
    MOD_Cirno_SCIENCE_BUILDING_PURCHASE, MOD_Cirno_SCIENCE_BUILDING_PURCHASE_AI,
    MOD_Cirno_TOWN_SCIENCE_RESOURCE_HAPPINESS_ADJ, MOD_Cirno_TOWN_SCIENCE_WONDER_HAPPINESS_ADJ,
    MOD_Cirno_SPECIALIST_HAPPINESS_MAINTENANCE.
  - Why: The Perfect Math conversion and penalty (human and AI rows), science building speed and purchase, the town
    adjacencies, specialist maintenance.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Cirno_ICE_POWER -> MOD_Cirno_ICE_POWER_TREE, NODE_Cirno_STRONGEST_PRIDE -> MOD_Cirno_STRONGEST_PRIDE_TREE,
  NODE_Cirno_FROZEN_LAND -> MOD_Cirno_FROZEN_LAND_TREE, NODE_Cirno_FAIRY_BLESSING -> MOD_Cirno_FAIRY_BLESSING_TREE,
  NODE_Cirno_MISTY_LAKE -> MOD_Cirno_MISTY_LAKE_TREE.

### Hieda no Akyuu (LEADER_Akyuu)

Ability TRAIT_LEADER_Akyuu_ABILITY; mod MAO-Leader-Akyuu, Workshop 3661958452; frontend LeaderItems agrees; 5
modifiers, 3 bullets; shipped leader biases: Resources RESOURCE_SILK 10, Resources RESOURCE_JADE 8.

- Agenda (LEADER_Akyuu__AGENDA), Chronicle Collector: MOD_AKYUU_LEADER_AGENDA.
- Bullet 1 (LEADER_Akyuu__B01), value 3, guess: "Gensokyo Chronicle: Start with +1 Tradition slot and unlock Greek
  tradition "Xenia I". Each unique civilization Tradition grants +3/6/12 Culture."
  - Modifiers: MOD_AKYUU_CHRONICLE_TRADITION_SLOT, MOD_AKYUU_CHRONICLE_UNLOCK_XENIA, MOD_AKYUU_GUMONJI_CULTURE.
  - Why: +1 tradition slot, TRADITION_XENIA_I, Culture per civ-unique tradition.
- Bullet 2 (LEADER_Akyuu__B02), value 2, guess: "Perfect Memory: Completing Narrative Events grants +15/30/60 Science.
  Knowledge preserved forever!"
  - Modifiers: MOD_AKYUU_STORY_SCIENCE.
  - Why: Science per completed narrative event.
- Bullet 3 (LEADER_Akyuu__B03), value 1, guess, Movable = 0: "Gumon Shiki: Unique Narrative storyline. Across three
  Ages, chronicle and collect 30 Traditions from civilizations around the world!"
  - Modifiers: none.
  - Why: No ability modifier: the storyline lives in the mod's narrative tables.
  - Note: Dealt alone it does nothing; it stays in Akyuu's remainder.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Akyuu_ORIGIN_COMPILER -> MOD_Akyuu_ORIGIN_COMPILER_TREE, NODE_Akyuu_CHRONICLE_SIGHT ->
  MOD_Akyuu_CHRONICLE_SIGHT_TREE, NODE_Akyuu_ROVING_SCRIBE -> MOD_Akyuu_ROVING_SCRIBE_TREE, NODE_Akyuu_CAPITAL_ANNALS
  -> MOD_Akyuu_CAPITAL_ANNALS_TREE, NODE_Akyuu_NINE_LIVES_LORE -> MOD_Akyuu_NINE_LIVES_LORE_TREE.

### Koishi Komeiji (LEADER_Koishi)

Ability TRAIT_LEADER_KOISHI_ABILITY; mod MAO-Leader-Koishi, Workshop 3646742676; frontend LeaderItems agrees; 11
modifiers, 3 bullets; shipped leader biases: Resources RESOURCE_JADE 10, Resources RESOURCE_SILK 10.

- Agenda (LEADER_Koishi__AGENDA), Closed Eye: MOD_KOISHI_LEADER_AGENDA.
- Bullet 1 (LEADER_Koishi__B01), value 3, guess: "Rose of Unconscious: All Land Units can freely enter foreign
  territory ignoring borders, and gain Stealth, visible only to adjacent enemy units."
  - Modifiers: MOD_KOISHI_IGNORE_BORDERS, MOD_KOISHI_UNIT_STEALTH.
  - Why: Land units enter foreign land and are hidden.
- Bullet 2 (LEADER_Koishi__B02), value 2, guess: "Embryo's Dream: Enemy civilizations cannot use Counter Spy against
  you; may declare Formal War ignoring relationship requirements."
  - Modifiers: MOD_KOISHI_NO_COUNTER_ESPIONAGE, MOD_KOISHI_IGNORE_WAR_REQUIREMENTS.
  - Why: No counter-spy against her, formal war ignoring requirements.
- Bullet 3 (LEADER_Koishi__B03), value 2, guess: "Boundary of Recollection: All diplomatic actions (support, oppose,
  sanctions, etc.) produce no relationship changes; Supporting or Opposing Endeavors costs no Influence."
  - Modifiers: MOD_KOISHI_NO_FAVOR_FROM_SUPPORT, MOD_KOISHI_NO_FAVOR_FROM_ENDEAVOR,
    MOD_KOISHI_NO_GRIEVANCE_FROM_SANCTION, MOD_KOISHI_NO_GRIEVANCE_FROM_REJECTED, MOD_KOISHI_FREE_SUPPORT_ENDEAVOR,
    MOD_KOISHI_FREE_REJECT_ENDEAVOR.
  - Why: The four no-relationship-change rows and free endeavor support / rejection.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_Koishi_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_Koishi_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_Koishi_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_Koishi_L2,
  NODE_Koishi_POLITICAL_BLADE_AUTHORITY -> MOD_Koishi_BLADE_AUTHORITY_TREE, NODE_Koishi_ECONOMIC_GARDENER ->
  MOD_Koishi_GARDENER_TREE, NODE_Koishi_SCIENTIFIC_SWORD_MASTERY -> MOD_Koishi_SWORD_MASTERY_TREE,
  NODE_Koishi_CULTURAL_HAKUGYOKUROU -> MOD_Koishi_HAKUGYOKUROU_TREE, NODE_Koishi_EXPANSIONIST_HALF_PHANTOM ->
  MOD_Koishi_HALF_PHANTOM_TREE.

### Wu Zetian (FGO) (LEADER_WUZETIAN)

Ability TRAIT_LEADER_WUZETIAN_ABILITY; mod MAO-Leader-WUZETIAN, Workshop 3636713096; frontend LeaderItems agrees; 11
modifiers, 3 bullets; no shipped leader biases.

- Agenda (LEADER_WUZETIAN__AGENDA), Authority of Divine Mandate: MOD_WUZETIAN_LEADER_AGENDA.
- Bullet 1 (LEADER_WUZETIAN__B01), value 3, guess: "Imperial Privilege: +30% Commander Experience. Upon first War
  declaration, receive 3 land units in your Capital (Archer / Crossbowman / Field Cannon; swaps to unique
  replacements)."
  - Modifiers: MOD_WUZETIAN_COMMANDER_XP, MOD_WUZETIAN_SPAWN_ARCHER, MOD_WUZETIAN_SPAWN_CROSSBOW,
    MOD_WUZETIAN_SPAWN_FIELD_CANNON.
  - Why: +30% commander XP and the three ranged units on first war declaration (one row per age).
  - SpecificTo: |UNIT_ARCHER|
- Bullet 2 (LEADER_WUZETIAN__B02), value 2, guess: "Book of Denunciations: +50% Espionage efficiency. No Influence
  penalty when your Espionage is revealed."
  - Modifiers: MOD_WUZETIAN_ESPIONAGE_EFFICIENCY, MOD_WUZETIAN_NO_INFLUENCE_PENALTY_SPIES.
  - Why: +50% espionage, no penalty when spies are revealed.
- Bullet 3 (LEADER_WUZETIAN__B03), value 4, guess: "Imperial Examination: Wu Zetian championed the examination system
  and employed capable ministers. +25% Population Growth in all Cities. +1 Science and +1 Culture per Specialist."
  - Modifiers: MOD_WUZETIAN_POPULATION_GROWTH, MOD_WUZETIAN_WORKER_SCIENCE, MOD_WUZETIAN_WORKER_CULTURE.
  - Why: +25% growth, +1 Science and Culture per specialist.
- Unplaced: MOD_WUZETIAN_ATTRIBUTE_DIPLOMATIC. A +1 ATTRIBUTE_DIPLOMATIC point with no bullet text; it stays with Wu
  Zetian. ATTRIBUTE_DIPLOMATIC isn't one of the seven attribute kinds in LShufAttributeTraits.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_ATTRIBUTE_MILITARISTIC_LEGEND_WUZETIAN_L1 -> MOD_ATTRIBUTE_MILITARISTIC_LEGEND_WUZETIAN_L1,
  NODE_ATTRIBUTE_SCIENTIFIC_LEGEND_WUZETIAN_L2 -> MOD_ATTRIBUTE_SCIENTIFIC_LEGEND_WUZETIAN_L2.

### Aya Shameimaru (LEADER_Aya)

Ability TRAIT_LEADER_Aya_ABILITY; mod MAO-Leader-Aya, Workshop 3661417870; frontend LeaderItems agrees; 10 modifiers,
3 bullets; shipped leader biases: Biomes BIOME_GRASSLAND 6, Biomes BIOME_PLAINS 4, Terrains TERRAIN_MOUNTAIN 10,
Terrains TERRAIN_HILL 8.

- Agenda (LEADER_Aya__AGENDA), News Gathering: MOD_Aya_LEADER_AGENDA.
- Bullet 1 (LEADER_Aya__B01), value 3, guess: "Exclusive Scoop: Every 10 tiles explored grants +2 Influence and +2
  Gold. Discovering a Natural Wonder grants +30/60/120 Influence (extra +30/60/120 if distant). Completing Narrative
  Events grants +10/20/40 Gold. News is everywhere!"
  - Modifiers: MOD_Aya_SCOOP_INFLUENCE, MOD_Aya_SCOOP_GOLD, MOD_Aya_WONDER_SCOOP, MOD_Aya_STORY_REWARD.
  - Why: Exploration yields, Influence on finding a wonder, Gold per narrative event.
  - Bias tags: NATURAL_WONDER drafted from the text (a guess).
- Bullet 2 (LEADER_Aya__B02), value 3, guess: "Fantasy Wind: Except Navigable Rivers, all Terrain and Rivers do not
  exhaust unit Movement. Units adjacent to Mountains gain +2 Sight."
  - Modifiers: MOD_Aya_FANTASY_WIND, MOD_Aya_IGNORE_ROUGH_TERRAIN, MOD_Aya_IGNORE_MINOR_RIVER, MOD_Aya_MOUNTAIN_SIGHT.
  - Why: Land movement obstacles ignored, +2 sight next to mountains.
  - Bias tags: TERRAIN_HILL, TERRAIN_MOUNTAIN read from requirements or adjacencies.
- Bullet 3 (LEADER_Aya__B03), value 2, guess: "Fastest Reporter: +50% Diplomatic Endeavor Efficiency. A news network
  that spans the world!"
  - Modifiers: MOD_Aya_DIPLOMACY_EFFICIENCY.
  - Why: +50% on the endeavor action group.
- The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's):
  NODE_Aya_PALACE_POWER -> MOD_Aya_PALACE_POWER_TREE, NODE_Aya_MIND_LINK -> MOD_Aya_MIND_LINK_TREE,
  NODE_Aya_SWIFT_WIND -> MOD_Aya_SWIFT_WIND_TREE, NODE_Aya_THIRD_EYE -> MOD_Aya_THIRD_EYE_TREE,
  NODE_Aya_UNDERGROUND_WISDOM -> MOD_Aya_UNDERGROUND_WISDOM_TREE.
