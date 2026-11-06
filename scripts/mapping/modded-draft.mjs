// The drafted bullet-to-modifier match for the listed modded leaders, written 2026-11-06 from their files on
// tp-share (scripts/mapping/dump-abilities.mjs --modded prints what the loader read). Same shape as
// vanilla-draft.mjs. A mods entry starting "re:" is a pattern over this leader's own modifier ids, used where a
// mod repeats one effect many times (Hiro's 54 triumph rows); the build script expands it to the live ids and
// checks each id lands in exactly one bullet.
//
// noBullets: the live description has no [LI] bullets, so the ability can only be dealt whole; no bullet rows
// are written for it.
// unplaced: modifiers on the ability that no bullet's text describes. They stay in the leader's remainder
// (CONTRACTS 5.3 `__REST`), and the review list names them.

export const MODDED_DRAFT = {
  LEADER_REMILIA: {
    noBullets: true,
    note: "The description is prose with [N] breaks and hand-typed bullets, no [LI]. Two named skills (Feast of Eternal Night, Mistress of the Sleepless City) could be split if the author switches to [LI]."
  },
  LEADER_QINSHIHUANG: {
    bullets: [
      {
        mods: ["MOD_QINSHIHUANG_COMMANDERY_SETTLEMENT_CAP", "MOD_QINSHIHUANG_FIRST_EMPEROR_TRADITION_SLOT"],
        value: 4,
        why: "Settlement cap +3 and +1 tradition slot. The ids say COMMANDERY and FIRST_EMPEROR the other way round from the text; the effects decide."
      },
      {
        mods: [
          "MOD_QINSHIHUANG_FIRST_EMPEROR_FOOD",
          "MOD_QINSHIHUANG_FIRST_EMPEROR_GOLD",
          "MOD_QINSHIHUANG_COMMANDERY_HAPPINESS_PENALTY",
          "MOD_QINSHIHUANG_COMMANDERY_PRODUCTION_BONUS",
          "MOD_QINSHIHUANG_COMMANDERY_FOOD_BONUS"
        ],
        value: 4,
        why: "+2 Food and Gold per active tradition, and the -5 Happiness / +10% Production and Food lines.",
        note: "The three penalty and bonus lines use REQUIREMENT_CITY_IS_CAPITAL (not inverted) although the text says non-capital settlements. That's the mod's own behavior and moves as is."
      },
      {
        mods: [
          "MOD_QINSHIHUANG_GREAT_WALL_FORTIFICATION_PRODUCTION",
          "MOD_QINSHIHUANG_GREAT_WALL_DEFENSIVE_WONDER_PRODUCTION",
          "MOD_QINSHIHUANG_GREAT_WALL_HAN_PRODUCTION",
          "MOD_QINSHIHUANG_GREAT_WALL_MING_PRODUCTION"
        ],
        value: 2,
        why: "+30% toward FORTIFICATION, WONDER_FORBIDDEN_CITY, and the Han / Ming Great Wall improvements (owner must be Han / Ming)."
      }
    ]
  },
  LEADER_ODA_NOBUNAGA: {
    bullets: [
      {
        mods: [
          "ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_SIEGE_ATTACK_ATTACH",
          "ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_COMMANDER_RANGE_ATTACH",
          "ODA_NOBUNAGA_MOD_DAIROKUTEN_ADJ_COMMANDER_BOMBARD_ATTACH"
        ],
        value: 3,
        why: "The three DAIROKUTEN attachments: defense next to siege, siege range and bombard next to a commander."
      },
      { mods: ["ODA_NOBUNAGA_MOD_RAKUICHI_PRODUCTION_BUILDING_PURCHASE", "ODA_NOBUNAGA_MOD_RAKUICHI_GOLD_BUILDING_PRODUCTION"], value: 2, why: "+40% purchase on PRODUCTION buildings, +40% production on GOLD buildings." },
      { mods: ["ODA_NOBUNAGA_MOD_TENKA_FUBU_TEMPLE_PENALTY", "ODA_NOBUNAGA_MOD_TENKA_FUBU_MILITARY_HAPPINESS_ATTACH"], value: 2, why: "-5 Happiness on the temple line, +1 Happiness per land military unit." }
    ]
  },
  LEADER_Youmu: {
    bullets: [
      {
        mods: [
          "MOD_YOUMU_BUILDING_PRODUCTION",
          "MOD_YOUMU_BUILDING_CULTURE_EX",
          "MOD_YOUMU_BUILDING_SCIENCE_MO",
          "MOD_YOUMU_GARDEN_BONUS_FOOD",
          "MOD_YOUMU_GARDEN_BONUS_HAPPINESS",
          "MOD_YOUMU_PAVILION_BONUS_FOOD",
          "MOD_YOUMU_PAVILION_BONUS_HAPPINESS",
          "MOD_YOUMU_PARK_BONUS_FOOD",
          "MOD_YOUMU_PARK_BONUS_HAPPINESS"
        ],
        value: 4,
        why: "The three warehouse resource adjacencies by age, and the Garden / Pavilion / City Park Food and Happiness."
      },
      {
        mods: ["MOD_YOUMU_INFANTRY_VS_DISTRICT", "MOD_YOUMU_INFANTRY_VS_DISTRICT_CELEBRATION", "MOD_YOUMU_INFANTRY_VS_UNIT_CELEBRATION", "MOD_YOUMU_IGNORE_ROUGH"],
        value: 3,
        why: "The infantry district abilities (plain and in a celebration), the celebration vs-unit ability, and ignoring rough-terrain defense."
      }
    ]
  },
  LEADER_MAOZEDONG: {
    bullets: [
      { mods: ["MAOZEDONG_MOD_1", "MAOZEDONG_MOD_2", "MAOZEDONG_MOD_ABILITY1"], value: 4, why: "Building and specialist maintenance efficiency, and +2 Production per connected settlement." },
      {
        mods: ["MAOZEDONG_MOD_ABILITY2", "MAOZEDONG_MOD_ABILITY3", "MAOZEDONG_MOD_ABILITY4", "MAOZEDONG_MOD_ABILITY5"],
        value: 4,
        why: "Peacetime population yields, +15% town yields with a project, +15% town growth.",
        note: "MAOZEDONG_MOD_ABILITY3 (rural Food) has no peace requirement, unlike the text."
      },
      {
        mods: ["MAOZEDONG_MOD_ABILITY6", "MAOZEDONG_MOD_ABILITY7", "MAOZEDONG_MOD_ABILITY8", "MAOZEDONG_MOD_ABILITY9"],
        value: 3,
        why: "Wartime unit production and purchase +100%, +1 movement, ignore zone of control."
      }
    ]
  },
  LEADER_KingofHeroes: {
    bullets: [
      {
        mods: [
          "MOD_KingofHeroes_GATE_KILL_GOLD_ATTACH",
          "MOD_KingofHeroes_GATE_RESOURCE_CITY_FOOD",
          "MOD_KingofHeroes_GATE_RESOURCE_BONUS_PRODUCTION",
          "MOD_KingofHeroes_GATE_RESOURCE_EMPIRE_GOLD"
        ],
        value: 4,
        why: "Gold on kills and the three resource-class tile yields."
      },
      {
        mods: ["MOD_KingofHeroes_WISE_KING_FREE_REJECT", "MOD_KingofHeroes_WISE_KING_WAR_SUPPORT", "MOD_KingofHeroes_WISE_KING_CAPTURE_INFLUENCE"],
        value: 3,
        why: "Cheaper rejections, +1 aggressor war support, 100 Influence on a first-time occupation."
      },
      { mods: ["MOD_KingofHeroes_OLDEST_KING_CAPITAL_INFLUENCE"], value: 3, why: "+50% Influence in the capital." }
    ]
  },
  LEADER_Houraisan: {
    bullets: [
      {
        mods: [
          "MOD_Houraisan_ETERNAL_FOOD",
          "MOD_Houraisan_ETERNAL_HAPPINESS",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_FOREST",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_RAINFOREST",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_TAIGA",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_SAVANNA",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_SAGEBRUSH",
          "MOD_Houraisan_GRANT_NATURAL_YIELDS_REDWOOD",
          "MOD_Houraisan_VEGETATED_HAPPINESS_DISTRICT",
          "MOD_Houraisan_BUILDING_FOOD"
        ],
        value: 5,
        why: "+15% Food, +10% Happiness, natural yields kept on the six vegetated features, district Happiness on vegetation, building Food adjacency."
      },
      {
        mods: ["MOD_Houraisan_BAMBOO_FOREST", "MOD_Houraisan_IGNORE_VEGETATION_MOVEMENT", "MOD_Houraisan_SEE_THROUGH_VEGETATION"],
        value: 3,
        why: "+3 on vegetated terrain, ignore vegetation movement, see through features."
      },
      {
        mods: [
          "MOD_Houraisan_UNLOCK_PROJECT_BUDDHA_BOWL",
          "MOD_Houraisan_UNLOCK_PROJECT_JEWEL_BRANCH",
          "MOD_Houraisan_UNLOCK_PROJECT_FIRE_RAT_ROBE",
          "MOD_Houraisan_UNLOCK_PROJECT_DRAGON_JEWEL",
          "MOD_Houraisan_UNLOCK_PROJECT_SWALLOW_COWRY"
        ],
        value: 3,
        why: "The five project unlocks.",
        note: "The projects are the mod's own PROJECT_* rows; any requirement on them that names Kaguya would leave them unbuildable elsewhere. Not read."
      }
    ]
  },
  LEADER_MAO_Tanya: {
    bullets: [
      { mods: ["MOD_TANYA_ACTIVATE_FLIGHT_GEAR"], value: 2, why: "ABILITY_TANYA_FLIGHT_GEAR while at war." },
      { mods: ["MOD_TANYA_GRANT_COMMENDATION_DUTY", "re:^MOD_TANYA_IRON_WILL_TIER\\d+$"], value: 3, why: "The Duty commendation on army commanders and the three low-HP defense tiers." },
      { mods: ["re:^MOD_TANYA_WAR_GOLD_\\d+$", "re:^MOD_TANYA_WAR_TRAINING_\\d+$"], value: 3, why: "+10% Gold and +20% unit training per ongoing war, five steps each." }
    ]
  },
  LEADER_OLGA: {
    bullets: [
      { mods: ["MOD_OLGA_TRADE_MAP", "MOD_OLGA_CAPITAL_BREATHTAKING_SCIENCE", "MOD_OLGA_NONCAPITAL_BREATHTAKING_HAPPINESS"], value: 3, why: "Trade map action, and the capital / non-capital breathtaking yields." },
      {
        mods: ["MOD_OLGA_NATURAL_WONDER_YIELD_BONUS", "MOD_OLGA_DISCOVER_WONDER_SCIENCE", "MOD_OLGA_DISCOVER_WONDER_CULTURE", "MOD_OLGA_DISCOVER_WONDER_ATTRIBUTE"],
        value: 3,
        bias: ["NATURAL_WONDER"],
        why: "+50% wonder tile yields, Science and Culture on discovery, and the Wildcard point."
      },
      { mods: ["MOD_OLGA_DEFENSIVE_WAR_SUPPORT"], value: 1, why: "+2 war support when not the aggressor." }
    ]
  },
  LEADER_Yuyuko: {
    noBullets: true,
    note: "The description is prose with [N] breaks and hand-typed bullets, no [LI]. Its three named skills could be split if the author switches to [LI]."
  },
  LEADER_Nearl: {
    bullets: [
      { mods: ["MOD_NEARL_INFLUENCE_ON_KILL_DOMESTIC", "MOD_NEARL_INFLUENCE_ON_KILL_CAVALRY_FOREIGN"], value: 3, why: "Influence on wins in own territory, and for cavalry outside it." },
      { mods: ["MOD_NEARL_CAVALRY_GARRISON_HAPPINESS", "MOD_NEARL_GARRISON_COMBAT"], value: 2, why: "+2 Happiness with a garrison, +5 for garrisoned units." },
      { mods: ["MOD_NEARL_HEAVY_UNIT_COMBAT"], value: 3, why: "+5 while defending." }
    ]
  },
  LEADER_FLAN: {
    bullets: [
      { mods: ["MOD_FLAN_QUADRUPLE_EXISTENCE"], value: 3, why: "The extra commander army, attached on having a first army commander." },
      { mods: ["MOD_FLAN_FINISH_GRANT", "MOD_FLAN_VS_DISTRICT"], value: 3, why: "+20 vs wounded enemies, land units +5 vs districts." },
      {
        mods: ["MOD_FLAN_CONQUEST_HEAL", "MOD_FLAN_RAZE_SPEED", "MOD_FLAN_PILLAGE_BUILDING_PENALTY", "MOD_FLAN_PILLAGE_IMPROVEMENT_PENALTY"],
        value: 2,
        why: "Heal on taking a city, faster razing, -50% pillage yields."
      },
      { mods: ["MOD_FLAN_SOLITUDE_PENALTY", "MOD_FLAN_CONQUEST_SETTLEMENT"], value: 1, why: "-2 settlement cap, +1 per conquered city.", note: "Mostly a drawback; scored 1." }
    ]
  },
  LEADER_Patchouli: {
    bullets: [
      {
        mods: ["MOD_PATCHOULI_SCIENCE_BUILDING_PRODUCTION", "MOD_PATCHOULI_GREAT_LIBRARY_WONDER_PRODUCTION", "MOD_PATCHOULI_LIBRARY_BUILDING_PRODUCTION"],
        value: 3,
        why: "+30% toward SCIENCE buildings, plus +30% more for the Library and the Great Library."
      },
      { mods: ["MOD_PATCHOULI_EXTRA_GREAT_WORK_SLOTS", "MOD_PATCHOULI_GREAT_WORK_SCIENCE", "MOD_PATCHOULI_GREAT_WORK_HAPPINESS"], value: 4, why: "+1 great work slot, Science and Happiness per great work." },
      { mods: ["MOD_PATCHOULI_FUTURE_TECH_EFFICIENCY"], value: 1, why: "+30% on the three future tech nodes." }
    ]
  },
  LEADER_Bocchi: {
    bullets: [
      { mods: ["MOD_BOCCHI_DIPLO_BONUS_ACCEPT", "MOD_BOCCHI_DIPLO_PENALTY_REJECT"], value: 2, why: "+40 / -50 Happiness on accepted / rejected actions." },
      {
        mods: ["MOD_BOCCHI_LONER_HAPPINESS_BONUS", "re:^MOD_BOCCHI_FRIEND_(GOLD|SCIENCE|CULTURE)_(FRIENDLY|HELPFUL)$"],
        value: 3,
        why: "+30% Happiness with no Friendly or Helpful leaders, and the six per-relationship yields."
      },
      {
        mods: ["MOD_BOCCHI_TRADE_CAPACITY_PENALTY", "MOD_BOCCHI_TRADE_RANGE_LAND_PENALTY", "MOD_BOCCHI_TRADE_RANGE_SEA_PENALTY", "MOD_BOCCHI_IMPORTED_RESOURCE_CULTURE"],
        value: 2,
        why: "-1 trade capacity, -50 range, Culture per imported resource."
      }
    ]
  },
  LEADER_MAO_Astolfo: {
    bullets: [
      {
        mods: ["MOD_MAO_Astolfo_NO_SCIENCE", "MOD_MAO_Astolfo_NO_CULTURE", "MOD_MAO_Astolfo_HAPPINESS_BOOST", "MOD_MAO_Astolfo_HAPPINESS_TO_SCIENCE_CULTURE"],
        value: 3,
        why: "-99% Science and Culture, +20% Happiness, 60% Happiness to Science and Culture (the penalties and conversion only for humans)."
      },
      { mods: ["MOD_MAO_Astolfo_COMBAT_STRENGTH", "MOD_MAO_Astolfo_COMBAT_ATTACH_HAPPINESS"], value: 2, why: "Melee +3 and Happiness per melee unit." }
    ]
  },
  LEADER_OKITA_SOUJI: {
    bullets: [
      { mods: ["re:^MOD_OKITA_SOUJI_WOUNDED_TIER\\d+$", "MOD_OKITA_SOUJI_FLANK_ATTACK_DOUBLE"], value: 3, why: "The four wounded-enemy tiers and doubled flanking." },
      { mods: ["re:^MOD_OKITA_SOUJI_INFANTRY_CULTURE_(AQ|EX|MO)$"], value: 2, why: "Culture per infantry unit, one row per age." },
      {
        mods: [
          "MOD_OKITA_SOUJI_COMMANDER_EXPERIENCE",
          "MOD_OKITA_SOUJI_COMMAND_HAPPINESS_FLAT_ATTACH",
          "MOD_OKITA_SOUJI_COMMAND_HAPPINESS_PCT_ATTACH",
          "MOD_OKITA_SOUJI_COMMAND_MIL_PROD_ATTACH"
        ],
        value: 3,
        why: "+30% commander XP and the three commander city attachments."
      }
    ]
  },
  LEADER_EIRIN: {
    bullets: [
      {
        mods: ["MOD_EIRIN_WAREHOUSE_FOOD", "MOD_EIRIN_WAREHOUSE_PRODUCTION", "MOD_EIRIN_WAREHOUSE_GOLD", "MOD_EIRIN_TECH_EFFICIENCY"],
        value: 4,
        why: "+1 Food, Production and Gold on WAREHOUSE buildings, +20% tech efficiency."
      },
      { mods: ["MOD_EIRIN_BUILDING_MAINTENANCE_EFFICIENCY", "MOD_EIRIN_PLAGUE_IMMUNITY"], value: 3, why: "Building maintenance efficiency +100%, plague immunity." },
      { mods: ["MOD_EIRIN_DISTANT_FREE_BUILDING", "MOD_EIRIN_DISTANT_LAND_GROWTH", "MOD_EIRIN_DISTANT_LAND_HAPPINESS"], value: 3, why: "The three REQUIREMENT_CITY_IS_DISTANT_LANDS lines." }
    ]
  },
  LEADER_Ema: {
    bullets: [
      { mods: ["MOD_Ema_VS_COMMANDER_STRENGTH", "MOD_Ema_COMMANDER_KILL_CULTURE"], value: 3, why: "+8 vs commanders, Culture on defeating one." },
      {
        mods: ["MOD_Ema_INFLUENCE_FRIENDLY", "MOD_Ema_INFLUENCE_HELPFUL", "MOD_Ema_INFLUENCE_ALLIANCE", "MOD_Ema_RELATIONSHIP_COMBAT_BONUS", "MOD_Ema_RELATIONSHIP_COMBAT_BONUS_2"],
        value: 3,
        why: "Influence per Friendly / Helpful / Alliance, and +3 per alliance (two steps)."
      },
      {
        mods: ["MOD_Ema_FORTIFICATION_HAPPINESS"],
        hidden: ["MOD_Ema_UNLOCK_WITCH_TRIAL_PACT", "MOD_Ema_UNLOCK_WITCH_VERDICT"],
        value: 2,
        why: "+2 Happiness on FORTIFICATION constructibles.",
        note: "The two special diplomatic actions are named in text that sits inside this bullet (after its [/LIST]), so their unlocks travel here as hidden rows."
      }
    ]
  },
  LEADER_Hiro: {
    bullets: [
      { mods: ["MOD_Hiro_RANGED_RESPAWN_ABILITY", "MOD_Hiro_COMMANDER_RESPAWN_ABILITY", "MOD_Hiro_COMMANDER_RESPAWN_SPEED"], value: 3, why: "Respawn charges for ranged units and commanders, -75% commander respawn time." },
      { mods: ["MOD_Hiro_WAR_SUPPORT_AGGRESSOR", "MOD_Hiro_WAR_SUPPORT_INFLUENCE_EFFICIENCY"], value: 2, why: "+1 aggressor war support, +30% on DIPLOMACY_ACTION_DECLARE_WAR." },
      {
        mods: ["re:^MOD_Hiro_LEGACY_CAP_"],
        value: 3,
        why: "The capital +10% rows, one per completed triumph (54 rows).",
        note: "The text names Witch Trial Pact and Witch Verdict, but Hiro's ability has no modifier that unlocks them."
      }
    ]
  },
  LEADER_Shelly: {
    bullets: [
      {
        mods: ["MOD_Shelly_CRUSHER_NO_REDUCTION", "MOD_Shelly_CRUSHER_DISTRICT_CS", "MOD_Shelly_CRUSHER_IGNORE_ZOC", "MOD_Shelly_CRUSHER_TAKE_HIT", "MOD_Shelly_SCOUT_IGNORE_BORDERS"],
        value: 3,
        why: "The four Crusher lines (no wounded penalty, +5 vs districts, ignore ZOC, 110% damage taken) and recon units entering foreign land."
      },
      { mods: ["MOD_Shelly_FAKE_SPY_SLOW", "MOD_Shelly_FAKE_SPY_INFLUENCE"], value: 2, why: "-50% espionage speed, Influence on a successful action." }
    ],
    unplaced: ["MOD_Shelly_UNLOCK_WITCH_TRIAL_PACT", "MOD_Shelly_UNLOCK_WITCH_VERDICT"],
    unplacedWhy: "The two special diplomatic actions are named in the text after [/BLIST], outside every bullet, so they stay with Shelly."
  },
  LEADER_Yamada: {
    bullets: [
      { mods: ["MOD_Yamada_CULTURE_SCI_ADJ", "MOD_Yamada_BASS_SOLO_GOLD_ON_CULTURE_BUILDING"], value: 3, why: "Science adjacency on culture buildings, Gold per culture building built." },
      { mods: ["MOD_Yamada_COOL_WEIRDO_NEUTRAL_CULTURE"], value: 2, why: "+3 Culture per Neutral relationship." },
      { mods: ["MOD_Yamada_NEGATIVE_GOLD_CULTURE", "MOD_Yamada_NEGATIVE_GOLD_SCIENCE", "MOD_Yamada_POSITIVE_GOLD_CULTURE"], value: 3, why: "+30% / +30% with negative Gold, +15% Culture otherwise." }
    ]
  },
  LEADER_Margatroid: {
    bullets: [
      { mods: ["MOD_MARGATROID_WOODCUTTER_ADJACENCY_PRODUCTION", "MOD_MARGATROID_PRODUCTION_BUILDING_SPEED"], value: 3, why: "Woodcutter Production adjacency on buildings, +50% toward PRODUCTION buildings." },
      {
        mods: ["MOD_MARGATROID_COMMANDER_COMMENDATION", "MOD_MARGATROID_COMMANDER_IGNORE_VEGETATION", "MOD_MARGATROID_FORMATION_HEAL_BOOST"],
        value: 3,
        why: "Valor commendation, commanders ignore vegetation, +10 heal in formation."
      }
    ]
  },
  LEADER_Cirno: {
    bullets: [
      {
        mods: ["MOD_Cirno_BLIZZARD_IMMUNITY", "MOD_Cirno_ENEMY_BLIZZARD_VULNERABILITY", "MOD_Cirno_TUNDRA_COMBAT", "MOD_Cirno_TUNDRA_MOVEMENT", "MOD_Cirno_TUNDRA_HEAL"],
        value: 2,
        why: "Blizzard immunity, extra blizzard damage to others, and the three tundra lines."
      },
      {
        mods: [
          "re:^MOD_Cirno_PERFECT_MATH_",
          "re:^MOD_Cirno_SCIENCE_BUILDING_",
          "MOD_Cirno_TOWN_SCIENCE_RESOURCE_HAPPINESS_ADJ",
          "MOD_Cirno_TOWN_SCIENCE_WONDER_HAPPINESS_ADJ",
          "MOD_Cirno_SPECIALIST_HAPPINESS_MAINTENANCE"
        ],
        value: 4,
        why: "The Perfect Math conversion and penalty (human and AI rows), science building speed and purchase, the town adjacencies, specialist maintenance."
      }
    ]
  },
  LEADER_Akyuu: {
    bullets: [
      { mods: ["MOD_AKYUU_CHRONICLE_TRADITION_SLOT", "MOD_AKYUU_CHRONICLE_UNLOCK_XENIA", "MOD_AKYUU_GUMONJI_CULTURE"], value: 3, why: "+1 tradition slot, TRADITION_XENIA_I, Culture per civ-unique tradition." },
      { mods: ["MOD_AKYUU_STORY_SCIENCE"], value: 2, why: "Science per completed narrative event." },
      {
        mods: [],
        value: 1,
        movable: 0,
        why: "No ability modifier: the storyline lives in the mod's narrative tables.",
        note: "Dealt alone it does nothing; it stays in Akyuu's remainder."
      }
    ]
  },
  LEADER_Koishi: {
    bullets: [
      { mods: ["MOD_KOISHI_IGNORE_BORDERS", "MOD_KOISHI_UNIT_STEALTH"], value: 3, why: "Land units enter foreign land and are hidden." },
      { mods: ["MOD_KOISHI_NO_COUNTER_ESPIONAGE", "MOD_KOISHI_IGNORE_WAR_REQUIREMENTS"], value: 2, why: "No counter-spy against her, formal war ignoring requirements." },
      {
        mods: ["re:^MOD_KOISHI_NO_(FAVOR|GRIEVANCE)_", "MOD_KOISHI_FREE_SUPPORT_ENDEAVOR", "MOD_KOISHI_FREE_REJECT_ENDEAVOR"],
        value: 2,
        why: "The four no-relationship-change rows and free endeavor support / rejection."
      }
    ]
  },
  LEADER_WUZETIAN: {
    bullets: [
      { mods: ["MOD_WUZETIAN_COMMANDER_XP", "re:^MOD_WUZETIAN_SPAWN_"], value: 3, why: "+30% commander XP and the three ranged units on first war declaration (one row per age)." },
      { mods: ["MOD_WUZETIAN_ESPIONAGE_EFFICIENCY", "MOD_WUZETIAN_NO_INFLUENCE_PENALTY_SPIES"], value: 2, why: "+50% espionage, no penalty when spies are revealed." },
      { mods: ["MOD_WUZETIAN_POPULATION_GROWTH", "MOD_WUZETIAN_WORKER_SCIENCE", "MOD_WUZETIAN_WORKER_CULTURE"], value: 4, why: "+25% growth, +1 Science and Culture per specialist." }
    ],
    unplaced: ["MOD_WUZETIAN_ATTRIBUTE_DIPLOMATIC"],
    unplacedWhy: "A +1 ATTRIBUTE_DIPLOMATIC point with no bullet text; it stays with Wu Zetian. ATTRIBUTE_DIPLOMATIC isn't one of the seven attribute kinds in LShufAttributeTraits."
  },
  LEADER_Aya: {
    bullets: [
      { mods: ["MOD_Aya_SCOOP_INFLUENCE", "MOD_Aya_SCOOP_GOLD", "MOD_Aya_WONDER_SCOOP", "MOD_Aya_STORY_REWARD"], value: 3, bias: ["NATURAL_WONDER"], why: "Exploration yields, Influence on finding a wonder, Gold per narrative event." },
      { mods: ["MOD_Aya_FANTASY_WIND", "MOD_Aya_IGNORE_ROUGH_TERRAIN", "MOD_Aya_IGNORE_MINOR_RIVER", "MOD_Aya_MOUNTAIN_SIGHT"], value: 3, why: "Land movement obstacles ignored, +2 sight next to mountains." },
      { mods: ["MOD_Aya_DIPLOMACY_EFFICIENCY"], value: 2, why: "+50% on the endeavor action group." }
    ]
  }
};
