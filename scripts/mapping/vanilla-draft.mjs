// The drafted bullet-to-modifier match for the base game and DLC leaders. Nothing in the data links a bullet to
// its modifiers, so every entry here was read off the bullet text against the modifiers' arguments and
// requirements (scripts/mapping/dump-abilities.mjs prints both) on 2026-11-06, and ships as a guess for the owner
// to confirm. The build script checks it against the live data: the bullet count must match splitBullets() on the
// live English text, and every non-agenda modifier on the ability must be named exactly once.
//
// Per bullet:
//   mods    the modifiers this bullet's effect comes from (Role 'effect')
//   hidden  modifiers with no bullet text of their own that travel with this bullet (Role 'hidden')
//   value   rough strength, 1 (small) to 5 (large)
//   bias    start-bias tags drafted from the text; tags read from requirements and adjacencies are added by the
//           build script on its own and shown apart in the review list
//   why     the reason for the match, for the review list
//   movable 0 only where the piece does nothing away from its leader (then note says why)
//   note    anything else the reviewer should see

export const VANILLA_DRAFT = {
  LEADER_ADA_LOVELACE: [
    { mods: ["ADA_LOVELACE_MOD_CIVIC_MASTERY"], value: 3, why: "Science per unlocked civic depth node (SYSTEM_CULTURE): the civic-mastery bullet." },
    { mods: ["ADA_LOVELACE_MOD_TECH_MASTERY"], value: 3, why: "Culture from Science on tech depth 2 (SYSTEM_TECH): the tech-mastery bullet." }
  ],
  LEADER_ALEXANDER: [
    {
      mods: ["ALEXANDER_YIELD_BONUS_WITH_WONDER_CAPITAL_CONT", "ALEXANDER_YIELD_BONUS_WITH_WONDER_NOT_CAPITAL_CONT"],
      value: 3,
      why: "+10% / +20% Production and Culture in non-capital cities with a wonder, split by capital continent."
    },
    {
      mods: [
        "ALEXANDER_COMBAT_BONUS_BASE",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_1",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_2",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_3",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_4",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_5",
        "ALEXANDER_WONDER_COMBAT_STRENGTH_6"
      ],
      value: 3,
      why: "Land-unit combat base plus the six counted steps (1 to 6 wonder cities) on UNIT_CLASS_UNIQUE units."
    },
    { mods: ["ALEXANDER_MOD_SETTLEMENT_MILITARY_VICTORY"], value: 2, why: "Activates VICTORY_TRACKER_SETTLEMENT_ALEXANDER, the Dominion-per-wonder-city tracker." },
    {
      mods: ["ALEXANDER_MOD_ALEXANDRIA_RENAME"],
      value: 1,
      why: "City rename on REQUIREMENT_TOWN_WAS_UPGRADED_TO_CITY.",
      note: "Flavor only. Another leader holding it renames upgraded towns after Alexander."
    }
  ],
  LEADER_AMINA: [
    { mods: ["AMINA_MOD_RESOURCE_CAPACITY"], value: 3, why: "EFFECT_CITY_ADJUST_RESOURCE_CAP +1 in cities." },
    { mods: ["AMINA_MOD_RESOURCE_GOLD"], value: 2, why: "Gold per assigned resource in cities." },
    { mods: ["AMINA_LEAD_MOD_CHECK_FOR_BIOME"], value: 2, why: "Grants ABILITY_AMINA_CHECK_FOR_BIOME, the Plains/Desert combat ability." }
  ],
  LEADER_ASHOKA: [
    { mods: ["ASHOKA_MOD_HAPPINESS_FOOD"], value: 3, why: "Food per 5 surplus Happiness (Divisor 5)." },
    {
      mods: ["ASHOKA_MOD_CELEBRATION_FOOD_HAPPY", "ASHOKA_MOD_CELEBRATION_FOOD_JOYOUS", "ASHOKA_MOD_CELEBRATION_FOOD_ECSTATIC"],
      value: 2,
      why: "+10% / +5% / +5% Food in a celebration by happiness stage, which stacks to the bullet's 10/15/20%."
    },
    {
      mods: [
        "ASHOKA_MOD_WILDCARD_UNIQUE_BUILDING_ADJACENCY_TO_IMPROVEMENTS",
        "ASHOKA_MOD_WILDCARD_HAPPINESS_BUILDING_ADJACENCY_TO_IMPROVEMENTS",
        "ASHOKA_MOD_WILDCARD_FOOD_BUILDING_ADJACENCY_TO_IMPROVEMENTS"
      ],
      value: 3,
      why: "The three adjacency activations (unique, Happiness and Food buildings next to improvements)."
    }
  ],
  LEADER_ASHOKA_ALT: [
    { mods: ["ASHOKA_ALT_MOD_HAPPINESS_PRODUCTION"], value: 3, why: "Production per 5 surplus Happiness in cities." },
    { mods: ["ASHOKA_ALT_MOD_CAPTURED_SETTLEMENT_PRODUCTION"], value: 2, why: "+10% Production where NOT REQUIREMENT_CITY_IS_ORIGINAL_OWNER." },
    { mods: ["ASHOKA_ALT_MOD_WAR_CELEBRATION"], value: 3, why: "Golden age on declaring a formal war." },
    { mods: ["ASHOKA_ALT_MOD_CONQUEROR_ABILITY"], value: 2, why: "Unit combat modifier attached while in a golden age (celebration)." }
  ],
  LEADER_AUGUSTUS: [
    { mods: ["AUGUSTUS_MOD_CAPITAL_PRODUCTION_PER_TOWN"], value: 4, why: "+2 Production in the capital per town." },
    { mods: ["AUGUSTUS_MOD_TOWN_CULTURE_BUILDING"], value: 2, why: "Towns can purchase CULTURE-tagged constructibles." },
    {
      mods: ["AUGUSTUS_MOD_TOWN_PURCHASE_RATE", "AUGUSTUS_MOD_TOWN_PURCHASE_RATE_SAME_BUILDING_IN_CAPITAL"],
      value: 2,
      why: "15% town building purchase efficiency, plus 15% more when the capital has the same building."
    }
  ],
  LEADER_BENJAMIN_FRANKLIN: [
    {
      mods: ["FRANKLIN_MOD_PRODUCTION_BUILDING_SCIENCE", "FRANKLIN_MOD_SCIENCE_BUILDING_SCIENCE"],
      value: 3,
      why: "+1 Science on PRODUCTION- and SCIENCE-tagged buildings in cities."
    },
    { mods: ["FRANKLIN_MOD_PRODUCTION_BUILDING_RATE_PER_NUM_ACTIVE_DIPLOMATIC_ACTIONS"], value: 2, why: "Building production per active endeavor started or supported." },
    { mods: ["FRANKLIN_MOD_DIPLO_EVENT_SCIENCE"], value: 2, why: "+2 Science per endeavor the player is involved in." },
    { mods: ["FRANKLIN_MOD_EXTRA_SINGLE_INSTANT_DIPLO_ACTIONS"], value: 1, why: "DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE_ENDEAVOR: two endeavors of one type." }
  ],
  LEADER_BOLIVAR: [
    { mods: ["BOLIVAR_MOD_WAR_SUPPORT_AGGRO"], value: 2, why: "+2 war support as the aggressor." },
    { mods: ["BOLIVAR_MOD_FREE_BUILDING"], value: 3, why: "Attached free purchase on a first-time settlement occupation." },
    { mods: ["BOLIVAR_MOD_PURCHASE_UNREST"], value: 1, why: "EFFECT_CITY_ADJUST_CAN_PURCHASE_IN_UNREST." }
  ],
  LEADER_CATHERINE: [
    { mods: ["CATHERINE_MOD_GREAT_WORK_CULTURE"], value: 3, why: "+2 Culture per great work." },
    { mods: ["CATHERINE_MOD_CONSTRUCTIBLE_GREAT_WORK_SLOTS"], value: 3, why: "+1 slot on constructibles that have a great work slot." },
    { mods: ["CATHERINE_MOD_CITY_SCIENCE"], value: 2, why: "25% Culture to Science in cities on BIOME_TUNDRA." }
  ],
  LEADER_CHARLEMAGNE: [
    {
      mods: ["CHARLEMAGNE_MOD_MILITARY_BUILDING_ADJACENCY", "CHARLEMAGNE_MOD_SCIENCE_BUILDING_ADJACENCY"],
      value: 3,
      why: "The military and science building Happiness adjacencies."
    },
    { mods: ["CHARLEMAGNE_MOD_UNITS_ON_GOLDEN_AGE"], value: 3, why: "Two UNIT_CLASS_CAVALRY units on entering a golden age." },
    { mods: ["CHARLEMAGNE_MOD_CAVALRY_ABILITY"], value: 2, why: "ABILITY_CHARLEMAGNE_CAVALRY (+5 strength) while in a golden age." }
  ],
  LEADER_CONFUCIUS: [
    { mods: ["CONFUCIUS_MOD_CITY_GROWTH"], value: 4, why: "+25% growth in cities." },
    { mods: ["CONFUCIUS_MOD_WORKER_SCIENCE"], value: 4, why: "+2 Science per specialist (worker yield)." }
  ],
  LEADER_EDWARD_TEACH: [
    {
      mods: [
        "EDWARD_TEACH_MOD_ALL_NAVAL_UNITS_PIRATES",
        "EDWARD_TEACH_MOD_ENTER_FOREIGN_MOD_ADJUST_UNIT_ENTER_FOREIGN_LANDS",
        "EDWARD_TEACH_MOD_PLUNDER_TRADE_ROUTES_BETWEEN_OTHER_CIVS"
      ],
      value: 3,
      bias: ["COAST"],
      why: "Privateer flag, entering foreign lands and plundering others' routes, all on sea combat and fleet units."
    },
    { mods: ["EDWARD_TEACH_MOD_GOLD_KILLS", "EDWARD_TEACH_MOD_CAPTURE"], value: 3, bias: ["COAST"], why: "Gold on naval kills and capturing the defeated unit." },
    {
      mods: ["EDWARD_TEACH_MOD_NAVAL_MAINTENANCE"],
      value: 1,
      bias: ["COAST"],
      why: "Unit maintenance efficiency -1 on UNIT_CLASS_NAVAL.",
      note: "A drawback (+1 Gold maintenance). The 1 to 5 scale has no negative, so it's a 1."
    }
  ],
  LEADER_ELIZABETH: [
    { mods: ["ELIZABETH_MOD_TRADE_ROUTE_UNLIMITED_LAND_RANGE", "ELIZABETH_MOD_TRADE_ROUTE_UNLIMITED_SEA_RANGE"], value: 3, why: "Land and sea trade range +999999." },
    { mods: ["ELIZABETH_MOD_GREAT_WORK"], value: 2, bias: ["COAST"], why: "Great work for a settlement on a new continent." },
    {
      mods: [
        "ELIZABETH_MOD_MERCHANT_SETTLER_EMBARKED_MOVEMENT",
        "ELIZABETH_MOD_NAVAL_MOVEMENT",
        "ELIZABETH_MOD_SETTLER_PURCHASE_COST",
        "ELIZABETH_MOD_MERCHANT_PURCHASE_COST"
      ],
      value: 3,
      bias: ["COAST"],
      why: "Embarked movement for settlers and merchants, naval movement, and the two 15% purchase discounts."
    },
    {
      mods: ["ELIZABETH_MOD_LAND_COMBAT_STRENGTH"],
      value: 1,
      why: "-2 strength on DOMAIN_LAND.",
      note: "A drawback; scored 1."
    }
  ],
  LEADER_FRIEDRICH: [
    { mods: ["FRIEDRICH_MOD_COMMANDER_COMMENDATION"], value: 2, why: "Grants PROMOTION_COMMENDATION_ARMY_MERIT to army commanders." },
    { mods: ["FRIEDRICH_MOD_INFANTRY_TECH", "FRIEDRICH_MOD_INFANTRY_CONSTRUCT_SCIENCE"], value: 3, why: "Infantry on tech mastery and on building a SCIENCE building." },
    { mods: ["FRIEDRICH_MOD_COMMENDATION_SCIENCE_YIELD"], value: 2, why: "+2 Science per commendation (CommendationsOnly)." }
  ],
  LEADER_FRIEDRICH_ALT: [
    { mods: ["FRIEDRICH_ALT_MOD_GREATWORK"], value: 2, why: "Great work on a first-time settlement occupation." },
    { mods: ["FRIEDRICH_ALT_MOD_GREAT_WORK_CULTURE"], value: 2, why: "+1 Culture per great work." },
    { mods: ["FRIEDRICH_ALT_MOD_INFANTRY_CIVIC", "FRIEDRICH_ALT_MOD_INFANTRY_CONSTRUCT_CULTURE"], value: 3, why: "Infantry on civic mastery and on building a CULTURE building." }
  ],
  LEADER_GENGHIS_KHAN: [
    {
      mods: ["GENGHIS_KHAN_CAVALRY_COMBAT_STRENGTH"],
      value: 3,
      why: "ABILITY_GENGHIS_KHAN_NO_COMMAND_RADIUS_COMBAT on UNIT_CLASS_CAVALRY (the +3).",
      note: "The +5 inside a command radius comes from ABILITY_GENGHIS_KHAN_COMMAND_RADIUS_COMBAT, which bullet 2's modifier grants."
    },
    {
      mods: ["GENGHIS_KHAN_ARMY_COMMANDER_ABILITY"],
      value: 3,
      why: "ABILITY_GENGHIS_KHAN_ARMY_COMMANDER: always-full movement, the convert-independents charge and the command-radius combat ability.",
      note: "One modifier does bullets 2 and 3 (and the +5 of bullet 1), so whoever holds this piece gets all three."
    },
    {
      mods: [],
      value: 1,
      movable: 0,
      why: "No modifier of its own: the convert charge is inside bullet 2's unit ability.",
      note: "Dealt alone it does nothing; it stays in Genghis Khan's remainder. If bullet 2 moves, the effect moves with it."
    }
  ],
  LEADER_GILGAMESH: [
    { mods: ["GILGAMESH_SINGLE_ALLY_WAR_SUPPORT"], value: 2, why: "+2 declare-war tokens with exactly one alliance." },
    { mods: ["GILGAMESH_INFLUENCE"], value: 2, why: "Influence from defeating units, attached to combat units." },
    {
      mods: ["GILGAMESH_MOD_ULOCK_ALL_ENDEAVORS", "GILGAMESH_ENDEAVORS_WITH_ALLIES_HAVE_NO_LIMIT_PER_TYPE", "GILGAMESH_ALLIES_CAN_SUPPORT_ENDEAVORS_FOR_FREE"],
      value: 3,
      why: "Grants the six basic endeavors, lifts the per-type limit with allies, free support for allies."
    }
  ],
  LEADER_HARRIET_TUBMAN: [
    { mods: ["HARRIET_TUBMAN_MOD_ADJUST_ESPIONAGE", "HARRIET_TUBMAN_MOD_ESPIONAGE_MIGRANT"], value: 3, why: "+100% espionage efficiency and a Migrant on undetected espionage." },
    { mods: ["HARRIET_TUBMAN_MOD_WAR_SUPPORT"], value: 2, why: "+5 war support when targeted (OnlyWhenTarget)." },
    { mods: ["HARRIET_TUBMAN_MOD_IGNORE_VEGETATION"], value: 2, why: "Land units ignore the FEATURE_CLASS_VEGETATED movement obstacle." }
  ],
  LEADER_HATSHEPSUT: [
    { mods: ["HATSHEPSUT_MOD_CULTURE_FROM_RESOURCES"], value: 3, why: "+1 Culture per unique resource." },
    { mods: ["HATSHEPSUT_MOD_BUILDING_PRODUCTION_RIVER"], value: 4, why: "+15% constructible production adjacent to a navigable river." }
  ],
  LEADER_HIMIKO: [
    { mods: ["HIMIKO_MOD_FRIEND_OF_WA"], value: 3, why: "Grants DIPLOMACY_ACTION_FRIEND_OF_WA." },
    { mods: ["HIMIKO_MOD_SCIENCE_BONUS_FRIENDLY", "HIMIKO_MOD_SCIENCE_BONUS_HELPFUL"], value: 3, why: "+4 Science per Friendly and per Helpful leader." },
    {
      mods: ["HIMIKO_MOD_NO_COST_ENDEAVOR_ACCEPT", "HIMIKO_MOD_DIPLOMATIC_RESPONSE_REJECT_COST_INCREASE"],
      value: 2,
      why: "Free endeavor support, and rejecting costs +100% (Reverse)."
    }
  ],
  LEADER_HIMIKO_ALT: [
    { mods: ["HIMIKO_ALT_MOD_HAPPINESS_BUILDING_HAPPINESS", "HIMIKO_ALT_MOD_DIPLOMACY_BUILDING_HAPPINESS"], value: 3, why: "+2 Happiness on HAPPINESS- and DIPLOMACY-tagged buildings." },
    { mods: ["HIMIKO_ALT_MOD_HAPPINESS_BUILDING_PRODUCTION_RATE", "HIMIKO_ALT_MOD_DIPLOMACY_BUILDING_PRODUCTION_RATE"], value: 2, why: "+50% production toward the same two building tags." },
    {
      mods: [
        "HIMIKO_ALT_MOD_CULTURE_BOOST",
        "HIMIKO_ALT_MOD_SCIENCE_PENALTY",
        "HIMIKO_ALT_MOD_CULTURE_BOOST_CELEBRATION",
        "HIMIKO_ALT_MOD_SCIENCE_PENALTY_CELEBRATION"
      ],
      value: 3,
      why: "+15% Culture / -15% Science outside a golden age, +30% / -30% inside one."
    }
  ],
  LEADER_IBN_BATTUTA: [
    {
      mods: ["IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE"],
      hidden: ["MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_01", "MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_EXPANSIONIST_02"],
      value: 3,
      why: "The Wildcard modifier; CONTRACTS 4.3 puts his two hidden Expansionist action unlocks here.",
      note: "IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE is EFFECT_DO_NOTHING. Nothing in the data or the game's scripts grants the points, so the engine must key the grant to something else; whether another leader holding this modifier gets the points is a lab check."
    },
    { mods: ["IBN_BATTUTA_MOD_UNIT_SIGHT"], value: 2, why: "+1 sight for all units." },
    { mods: ["IBN_BATTUTA_MOD_TRADE_MAP"], value: 2, why: "Grants DIPLOMACY_ACTION_TRADE_MAP." }
  ],
  LEADER_ISABELLA: [
    { mods: ["ISABELLA_MOD_NATURAL_WONDER_DISCOVERY"], value: 3, bias: ["NATURAL_WONDER"], why: "Gold on finding a wonder, doubled in distant lands." },
    { mods: ["ISABELLA_MOD_DOUBLE_NATURAL_WONDERS_ABILITY"], value: 3, why: "+50% natural wonder plot yields per natural wonder." },
    { mods: ["ISABELLA_MOD_NAVAL_UNIT_PURCHASE"], value: 2, bias: ["COAST"], why: "+50% naval unit purchase efficiency." },
    { mods: ["ISABELLA_MOD_NAVAL_UNIT_MAINTENANCE"], value: 1, bias: ["COAST"], why: "Naval maintenance efficiency +1 (-1 Gold maintenance)." }
  ],
  LEADER_JOSE_RIZAL: [
    {
      mods: ["RIZAL_MOD_NARRATIVE_EVENT_CULTURE", "RIZAL_MOD_NARRATIVE_EVENT_GOLD", "RIZAL_MOD_NARRATIVE_EVENT_INFLUENCE"],
      value: 3,
      why: "+20 Culture, Gold and Influence per completed narrative event."
    },
    { mods: ["RIZAL_MOD_EXTRA_STORIES", "RIZAL_MOD_EXTRA_STORIES2"], value: 2, why: "Bonus stories and bypassing narrative suppression." },
    { mods: ["RIZAL_MOD_CELEBRATION_LENGTH"], value: 2, why: "+50% golden age duration." },
    {
      mods: ["RIZAL_MOD_CELEBRATION_HAPPINESS"],
      value: 2,
      why: "+50% Happiness (EFFECT_PLAYER_ADJUST_YIELD) is the only other modifier; read as Happiness toward celebrations.",
      note: "The modifier is a plain +50% Happiness yield with no celebration requirement. Check the bullet means the same thing."
    }
  ],
  LEADER_LAFAYETTE: [
    { mods: ["LAFAYETTE_MOD_TRADITION_SLOT"], value: 4, why: "Grants DIPLOMACY_ACTION_GRANT_POLICY_SLOT (the Reform endeavor)." },
    { mods: ["LAFAYETTE_MOD_COMBAT_ABILITY_TRADITION"], value: 2, why: "ABILITY_LAFAYETTE_TRADITION: +1 strength per civ-unique tradition." },
    {
      mods: ["LAFAYETTE_MOD_CULTURE_SETTLEMENTS_HOMELANDS", "LAFAYETTE_MOD_CULTURE_SETTLEMENTS_DISTANT_LANDS"],
      value: 3,
      bias: ["COAST"],
      why: "+1 / +2 Culture and Happiness by homeland and distant lands."
    }
  ],
  LEADER_LAKSHMIBAI: [
    { mods: ["LAKSHMIBAI_MOD_CS_INCORPORATE"], value: 2, why: "+50% efficiency on DIPLOMACY_ACTION_CS_INCORPORATE." },
    { mods: ["LAKSHMIBAI_MOD_CS_INCORPORATE_UNITS"], value: 2, why: "Keeps the city-state's units on incorporation." },
    { mods: ["LAKSHMIBAI_INFLUENCE"], value: 3, why: "Influence from land combat units defeating enemies." }
  ],
  LEADER_MACHIAVELLI: [
    { mods: ["MACHIAVELLI_MOD_INFLUENCE"], value: 3, why: "+3 Influence." },
    { mods: ["MACHIAVELLI_MOD_GOLD_ACTION_ACCEPT", "MACHIAVELLI_MOD_GOLD_ACTION_REJECT"], value: 3, why: "50 / 100 Gold on accepted / rejected proposals." },
    { mods: ["MACHIAVELLI_MOD_FORMAL_WAR"], value: 2, why: "Ignores formal war requirements." },
    { mods: ["MACHIAVELLI_MOD_CITY_STATE_LEVY"], value: 2, why: "Levy from all city-states." }
  ],
  LEADER_NAPOLEON: [
    { mods: ["NAPOLEON_MOD_ULOCK_ALL_SANCTIONS"], value: 2, why: "Grants the six sabotage actions." },
    { mods: ["NAPOLEON_MOD_LOWER_COST_SANCTIONS"], value: 2, why: "+50% efficiency on the sanction action group." },
    { mods: ["NAPOLEON_MOD_CULTURE_PER_SANCTIONED_PLAYER", "NAPOLEON_MOD_GOLD_PER_SANCTIONED_PLAYER"], value: 3, why: "+5 Culture and Gold per sanctioned player." },
    { mods: ["NAPOLEON_MOD_COMBAT_STRENGTH_PER_ACTIVE_SANCTION"], value: 2, why: "Land units +1 per active sanction." }
  ],
  LEADER_NAPOLEON_ALT: [
    { mods: ["NAPOLEON_ALT_MOD_LAND_UNIT_MOVEMENT"], value: 4, why: "+1 movement on DOMAIN_LAND." },
    { mods: ["NAPOLEON_ALT_MOD_CULTURE_ON_UNIT_DEFEAT"], value: 3, why: "Culture equal to 100% of defeated strength." },
    { mods: ["NAPOLEON_ALT_MOD_SPAWN_ARMY"], value: 3, why: "Commander with infantry, ranged, siege and cavalry on the first war declared on him." }
  ],
  LEADER_PACHACUTI: [
    { mods: ["PACHACUTI_MOD_WILDCARD_ADJACENCY_MOUNTAINS"], value: 3, why: "Activates the PachacutiMountainFood adjacency." },
    { mods: ["PACHACUTI_MOD_MOUNTAIN_SPECIALIST_HAPPINESS", "PACHACUTI_MOD_MOUNTAIN_SPECIALIST_HAPPINESS_INVERSE"], value: 2, why: "-2 / +1 specialist Happiness maintenance next to / away from mountains (SPEC 2 example)." },
    { mods: ["PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD"], value: 3, why: "10% Food to Production in cities (probe 1's copied bullet)." }
  ],
  LEADER_SAYYIDA_AL_HURRA: [
    { mods: ["SAYYIDA_MOD_FREE_NAVAL_UNIT"], value: 3, bias: ["COAST"], why: "Naval unit with ocean access on a completed espionage action." },
    { mods: ["SAYYIDA_MOD_STATIONED_ON_DISTRICT_YIELDS"], value: 3, bias: ["COAST"], why: "Culture and Influence attached to naval units stationed on districts." },
    { mods: ["SAYYIDA_MOD_NO_INFLUENCE_PENALTY_REVEALED_SPIES"], value: 1, why: "No Influence penalty for revealed spies." },
    { mods: ["SAYYIDA_MOD_NO_COUNTERSPY_AGAINST"], value: 2, why: "No opposing counter-espionage." }
  ],
  LEADER_TECUMSEH: [
    { mods: ["TECUMSEH_MOD_SUZERAIN_FOOD", "TECUMSEH_MOD_SUZERAIN_PRODUCTION"], value: 3, why: "Food in towns and Production in cities per suzerainty." },
    { mods: ["TECUMSEH_MOD_SUZERAIN_ABILITY"], value: 2, why: "ABILITY_TECUMSEH_SUZERAIN: +1 strength per suzerainty." },
    { mods: ["TECUMSEH_MOD_SUZERAIN_MILITARY_VICTORY"], value: 2, why: "Activates VICTORY_TRACKER_TECUMSEH_SUZERAIN (Dominion per suzerainty)." },
    { mods: ["TECUMSEH_MOD_IP_FRIENDLY"], value: 3, why: "Sets every independent relationship to FRIENDLY." }
  ],
  LEADER_TOYOTOMI_HIDEYOSHI: [
    { mods: ["TOYOTOMI_HIDEYOSHI_MOD_DOUBLE_DAMAGE_ATTACK", "TOYOTOMI_HIDEYOSHI_MOD_OPPONENTS_DOUBLE_DAMAGE_ATTACK"], value: 3, why: "Land units deal 200%, opponents deal 200% to his units." },
    { mods: ["TOYOTOMI_HIDEYOSHI_MOD_HEAL_ANYWHERE", "TOYOTOMI_HIDEYOSHI_MOD_HEAL_CULTURE_OR_WONDER"], value: 2, why: "+5 heal anywhere, +5 more on a CULTURE building or wonder." },
    {
      mods: ["TOYOTOMI_HIDEYOSHI_MOD_ORIGINAL_CULTURE_BUILDING_PRODUCTION_TOWARDS", "TOYOTOMI_HIDEYOSHI_MOD_CONQUERED_CULTURE_BUILDING_PRODUCTION_TOWARDS"],
      value: 2,
      why: "+25% / +50% toward CULTURE buildings in original / conquered cities."
    }
  ],
  LEADER_TRUNG_TRAC: [
    {
      mods: ["TRUNG_TRAC_MOD_TRUNG_NHI", "TRUNG_TRAC_MOD_TRUNG_NHI_FASTER_RESPAWN", "TRUNG_TRAC_MOD_TRUNG_NHI_GRANT_HEROIC_ASSAULT"],
      value: 4,
      why: "Grants UNIT_TRUNG_NHI after the first land unit, plus her respawn speed and attack ability on UNIT_CLASS_TRUNG_NHI.",
      note: "UNIT_TRUNG_NHI has no TraitType, so another leader can be given the unit. Her unique promotion tree and age-transition persistence are on the unit, not this trait; a lab check should confirm they come along."
    },
    { mods: ["TRUNG_TRAC_MOD_COMMANDER_XP"], value: 2, why: "+20% experience on UNIT_CLASS_COMMAND." },
    { mods: ["TRUNG_TRAC_MOD_TROPICAL_SCIENCE", "TRUNG_TRAC_MOD_TROPICAL_SCIENCE_AT_WAR"], value: 2, why: "+10% Science in BIOME_TROPICAL cities, +10% more in a formal war." }
  ],
  LEADER_WASHINGTON: [
    { mods: ["WASHINGTON_MOD_MIGRANT_ON_GOLDEN_AGE"], value: 2, why: "UNIT_MIGRANT on entering a golden age." },
    {
      mods: ["WASHINGTON_MOD_FREE_POLICY_SLOT", "WASHINGTON_MOD_STARTING_POLICY_CONTINENTAL_AMBITION", "WASHINGTON_MOD_STARTING_POLICY_BILL_OF_RIGHTS"],
      value: 4,
      why: "+1 policy slot and the two starting policies (TRADITION_CONTINENTAL_AMBITION, TRADITION_BILL_OF_RIGHTS)."
    },
    { mods: ["WASHINGTON_MOD_TOWN_FOOD_PER_POLICY", "WASHINGTON_MOD_CITY_HAPPINESS_PER_POLICY"], value: 3, why: "Food in towns and Happiness in cities per slotted policy (Invert: policies, not traditions)." }
  ],
  LEADER_XERXES: [
    { mods: ["XERXES_MOD_UNIT_ATTACK_ABILITY"], value: 3, why: "ABILITY_XERXES_UNIT_FOREIGN_TERRITORY: +3 attacking in neutral or enemy land." },
    { mods: ["XERXES_MOD_CULTURE_ON_CAPTURE_SETTLEMENT", "XERXES_MOD_GOLD_ON_CAPTURE_SETTLEMENT"], value: 2, why: "100 Culture and Gold on a first-time occupation." },
    { mods: ["XERXES_MOD_SETTLEMENT_GOLD", "XERXES_MOD_CAPTURED_SETTLEMENT_GOLD"], value: 3, why: "+10% Gold, +20% in conquered settlements." },
    { mods: ["XERXES_MOD_SETTLEMENT_CAP"], value: 4, why: "+1 settlement cap (Ageless)." }
  ],
  LEADER_XERXES_ALT: [
    { mods: ["XERXES_ALT_MOD_TRADE_ROUTE_CAP"], value: 3, why: "+1 trade capacity with majors." },
    { mods: ["XERXES_ALT_MOD_TRADE_RANGE_EXTEND_LAND", "XERXES_ALT_MOD_TRADE_RANGE_EXTEND_SEA"], value: 1, why: "+10 land and sea trade range." },
    {
      mods: ["XERXES_ALT_MOD_TRADE_ROUTE_CULTURE", "XERXES_ALT_MOD_TRADE_ROUTE_GOLD", "XERXES_ALT_MOD_ROAD_CULTURE", "XERXES_ALT_MOD_ROAD_GOLD"],
      value: 3,
      why: "Culture and Gold command awards for making a trade route and connecting a road."
    },
    { mods: ["XERXES_ALT_MOD_UNIQUE_BUILDING_YIELD", "XERXES_ALT_MOD_UNIQUE_IMPROVEMENT_YIELD"], value: 2, why: "+1 Culture and Gold on UNIQUE and UNIQUE_IMPROVEMENT constructibles." }
  ],
  LEADER_YI_SUN_SIN: [
    {
      mods: ["YI_MOD_FREE_NAVAL_COMMANDER"],
      value: 2,
      bias: ["COAST"],
      why: "Fleet commander on Discipline plus a Harbor (the only modifier naming either).",
      note: "Building fleet commanders in Antiquity comes from TRAIT_UNLOCK_FLEET_COMMANDER (UNIT_FLEET_COMMANDER's TraitType) and the Discipline civic unlock, which both stay with Yi Sun-sin (CONTRACTS 12.4). Another leader holding this piece may get the free commander without being able to build more; whether the grant works without the trait is a lab check."
    },
    { mods: ["YI_MOD_SCIENCE_KILLS"], value: 2, bias: ["COAST"], why: "Science on naval kills (attached modifier)." },
    { mods: ["YI_MOD_SCIENCE_BUILDING_XP"], value: 2, why: "Fleet commander XP on building a SCIENCE building." },
    { mods: ["YI_MOD_GOLD_PER_XP"], value: 2, why: "+3 Gold per XP earned on UNIT_CLASS_FLEET_COMMANDER." }
  ]
};
