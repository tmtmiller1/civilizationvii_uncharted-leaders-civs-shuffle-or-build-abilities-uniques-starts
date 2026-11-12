// The drafted bullet-to-modifier match for the civilizations' abilities (CONTRACTS 14, 16). Nothing in the data
// links a bullet to its modifiers, so every entry was read off the bullet text (the ability's description for the
// civilization's own age: _DESCRIPTION, or the _AQ_/_EX_/_MO_DESCRIPTION the game keeps per age) against the
// modifiers' effects, arguments and requirements as the civilization's own age loads them: the Antiquity gameplay
// database for Antiquity civilizations, scripts/mapping/civ-age-source.mjs (base-standard + the age module + the
// DLC modules) for Exploration and Modern ones.
//
// Per bullet: mods (Role 'effect'), hidden (Role 'hidden', no text of its own), value 1..5, bias (tags read off the
// text; data tags are added by the build script), why, movable 0 where the piece does nothing away from its
// civilization, keep (a Movable 0 piece that stays its own row instead of merging into the bullet before it), note.
// unplaced: modifiers no bullet describes, with unplacedWhy (one string, or one per modifier id).
//
// Every "+30% Production towards constructing <wonder>" bullet has MOD_CIV_WONDER_PRODUCTION_<CIV> behind it, an
// EFFECT_CITY_ADJUST_FAVORED_WONDER_PRODUCTION that only fires for a player with the civilization's own base trait.
// The piece is dealt like any other (wonder: true): when the civilization deal runs, the apply swaps the modifier for
// one of the mod's own that names the civilization's favored wonder (CONTRACTS 31), so it works for whoever holds it.
// A piece the game implements outside the ability (Assyria's codices) moves as a rule piece (rule: the home trait and
// the modifiers whose exception names it); one that explains the bullet before it joins that bullet (joins: true);
// one the game ties to a civic or a unique shows on the build screen as going with it (goesWith: a build card id).
// MOD_REVEAL_CIV_CULTURE_TREE_<CIV> (Exploration and Modern) reveals the civilization's own civics tree; it goes
// with the civics (CONTRACTS 18), not with an ability bullet, so it's listed unplaced.

const WONDER = (civ) => ({
  mods: [`MOD_CIV_WONDER_PRODUCTION_${civ}`],
  value: 1,
  wonder: true,
  why: "+30% favored wonder production.",
  note: "Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31)."
});
// A line the game ties to a civic or a unique: it stays with them and shows on the build screen as going with them.
const GOES_WITH = (id, what) => ({ mods: [], value: 1, movable: 0, goesWith: id, why: `Goes with ${what}.`,
  note: `Goes with ${what} (CONTRACTS 31).` });
// A line that explains the bullet before it: its text joins that bullet's card.
const JOINS = (what) => ({ mods: [], value: 1, movable: 0, joins: true, why: what, note: what });
const REVEAL_WHY = "Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.";
// An Exploration or Modern entry: the bullets, with the civics-tree reveal (and any other unplaced modifiers) listed
// unplaced.
const withReveal = (civ, bullets, unplaced = [], why = "") => ({
  bullets,
  unplaced: [`MOD_REVEAL_CIV_CULTURE_TREE_${civ}`, ...unplaced],
  unplacedWhy: { [`MOD_REVEAL_CIV_CULTURE_TREE_${civ}`]: REVEAL_WHY, ...Object.fromEntries(unplaced.map((id) => [id, why])) }
});

export const CIV_DRAFT = {
  CIVILIZATION_ABBASID: withReveal("ABBASID", [
    { mods: ["TRAIT_MOD_GOLD_SPECIALISTS"], value: 3, why: "30 Gold per assigned worker when a specialist is created (EFFECT_PLAYER_GRANT_YIELD_ASSIGNED_WORKERS)." },
    { mods: ["MOD_TRAIT_ABBASID_PRODUCTION_SPECIALISTS"], value: 2, why: "+20% building production in cities with MinWorkerPopulation 5." },
    WONDER("ABBASID")
  ]),
  CIVILIZATION_AKSUM: [
    { mods: ["TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_RESOURCE"], value: 3, bias: ["COAST"], why: "Warehouse Gold on resources in settlements whose center is adjacent to coast." },
    {
      mods: ["TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_CAP_SELF", "TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_CAP_OTHERS"],
      value: 3,
      why: "+1 trade capacity for you and +1 for routes to you (RoutesToPlayer)."
    },
    { mods: ["TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_UNLIMITED_RANGE"], value: 2, why: "UnlimitedRange=true on trade routes." },
    WONDER("AKSUM")
  ],
  CIVILIZATION_AMERICA: withReveal("AMERICA", [
    { mods: ["TRAIT_MOD_FRONTIER_EXPANSION_GOLD_ON_IMPROVED_RESOURCES"], value: 3, why: "Gold per improved resource (EFFECT_ADJUST_PLAYER_YIELD_FOR_RESOURCE)." },
    { mods: ["TRAIT_MOD_FRONTIER_EXPANSION_PRODUCTION_ON_RESOURCES"], value: 3, why: "+1 Production on resource plots." },
    WONDER("AMERICA")
  ]),
  CIVILIZATION_ASSYRIA: [
    { mods: ["MOD_CIV_FIRST_TIME_CONQUER", "MOD_CIV_FIRST_TIME_CONQUER_CODEX"], value: 3, why: "A tech node and a writing great work on first-time settlement occupation." },
    {
      mods: [], value: 1, rule: { home: "TRAIT_ASSYRIA", targets: ["MOD_AQ_CODEX_REDUX", "MOD_AQ_MATHEMATICS_CODEX_REDUX"] },
      why: "Technologies award no codex: the codex rewards skip TRAIT_ASSYRIA.",
      note: "Rule: the codex rewards' exception follows whoever holds this piece (CONTRACTS 31)."
    },
    WONDER("ASSYRIA")
  ],
  CIVILIZATION_BABYLON: [
    {
      mods: ["TRAIT_GROWTH_EVENT_FOOD_BUILDINGS", "TRAIT_GROWTH_EVENT_CULTURE_BUILDINGS", "TRAIT_GROWTH_EVENT_WONDERS"],
      value: 3,
      why: "An extra growth event on Food buildings, Culture buildings and wonders in cities."
    },
    { mods: ["TRAIT_LESS_SETTLEMENT_CAP"], value: 1, why: "-2 settlement cap (a drawback, scored 1)." },
    WONDER("BABYLON")
  ],
  CIVILIZATION_BUGANDA: withReveal("BUGANDA", [
    { mods: ["TRAIT_MOD_RIVER_RAIDS_PILLAGING_ABILITY"], value: 2, why: "ABILITY_RIVER_RAIDS on land units: Culture on pillaging." },
    { mods: ["TRAIT_MOD_AMPHIBIOUS_ABILITY"], value: 2, why: "ABILITY_AMPHIBIOUS on land units." },
    {
      mods: ["TRAIT_MOD_RIVER_RAIDS_LAKE_YIELDS", "TRAIT_MOD_BUGANDA_LAKE_TOURISM"],
      value: 3,
      bias: ["LAKE"],
      why: "Culture and Food on lake plots (REQSET_PLOT_IS_BUGANDA_LAKE) and the lakes Tourism tracker."
    },
    WONDER("BUGANDA")
  ]),
  CIVILIZATION_BULGARIA: withReveal("BULGARIA", [
    { mods: ["MOD_CIV_PRODUCTION_PILLAGE_IMPROVEMENT"], value: 3, why: "50% of improvement pillage yields as city Production (PLUNDER_PRODUCTION_CITY) for land units." },
    { mods: ["MOD_CIV_COMBAT_VS_FORTIFIED_DISTRICTS"], value: 1, why: "-3 strength when the opponent is a district (a drawback)." },
    WONDER("BULGARIA")
  ]),
  CIVILIZATION_CARTHAGE: [
    { mods: ["MOD_FORBID_CITIES_FROM_TOWNS", "MOD_TOWN_WATER_BUILDING"], value: 2, why: "City limit 1 and towns buying WATER buildings with any focus." },
    {
      mods: ["MOD_CIV_DOUBLE_COLONISTS", "MOD_CIV_DOUBLE_MERCHANTS"],
      hidden: ["TRAIT_MOD_COLONIST_POP"],
      value: 4,
      why: "An extra copy of each Colonist and Merchant; the hidden +1 Population for Colonist-founded settlements rides with them.",
      note: "A card of its own on the build screen; in the random deal it goes with the Colonist (LShufBoundPieces, CONTRACTS 29)."
    },
    WONDER("CARTHAGE")
  ],
  CIVILIZATION_CHOLA: withReveal("CHOLA", [
    { mods: ["MOD_TOT_CHANGE_TRADE_ROUTE_CAPACITY"], value: 2, why: "+1 trade route capacity from the diplomacy action (EFFECT_PLAYER_DIPLOMACY_CHANGE_TRADE_ROUTE_CAPACITY)." },
    { mods: ["TRAIT_MOD_TOT_EX_TRADE_ROUTE_GOLD", "TRAIT_MOD_TOT_EX_TRADE_ROUTE_INFLUENCE"], value: 3, why: "+3 Gold and +2 Influence per trade route." },
    { mods: ["TRAIT_MOD_CHOLA_MERCHANT_MOVEMENT"], value: 1, why: "+1 movement for UNIT_CLASS_MAKE_TRADE_ROUTE units." },
    { mods: ["TRAIT_MOD_CHOLA_IMPORTED_RESOURCE_GDP"], value: 2, why: "Activates the imported-resources economic victory tracker (VICTORY_TRACKER_CHOLA_IMPORTED_RESOURCES)." },
    WONDER("CHOLA")
  ]),
  CIVILIZATION_DAI_VIET: withReveal("DAI_VIET", [
    { mods: ["MOD_CIV_WALL_EX_YIELD"], value: 3, why: "25 Culture per urban population when a defense constructible completes." },
    { mods: ["MOD_DAI_VIET_EX_FORTIFICATION_CULTURE", "MOD_DAI_VIET_EX_FORTIFICATION_FOOD"], value: 3, bias: ["BIOME_TROPICAL"], why: "+2 Culture and +2 Food on fortifications in Tropical plots." },
    WONDER("DAI_VIET")
  ], ["TRAIT_MOD_VIET_KIEU_BIOME_YIELD"], "Culture per Tropical plot for cities founded by the Viet Kieu; it rides on the unique unit, no bullet describes it."),
  CIVILIZATION_EGYPT: [
    { mods: ["TRAIT_MOD_GIFTS_OF_OSIRIS_NAVIGABLE_RIVER"], value: 3, bias: ["TERRAIN_NAVIGABLE_RIVER"], why: "+2 Production on districts on navigable rivers." },
    { mods: ["TRAIT_MOD_GIFTS_OF_OSIRIS_UNITS_IGNORE_MINOR_RIVER"], value: 2, why: "Units ignore RIVER_MINOR as a movement obstacle." },
    WONDER("EGYPT")
  ],
  CIVILIZATION_ENGLAND: withReveal("ENGLAND", [
    {
      mods: ["MOD_CIV_EX_CULTURE_GOLD_BUILDINGS", "MOD_CIV_EX_GOLD_CULTURE_BUILDINGS", "MOD_CIV_EX_CULTURE_GOLD_BUILDINGS_DOUBLE", "MOD_CIV_EX_GOLD_CULTURE_BUILDINGS_DOUBLE"],
      value: 4,
      bias: ["ISLAND"],
      why: "Culture on Gold buildings and Gold on Culture buildings, with the doubled island / distant-lands rows."
    },
    { mods: ["MOD_TOWN_GOLD_BUILDING"], value: 2, bias: ["ISLAND"], why: "Island towns buy GOLD buildings with any focus." },
    WONDER("ENGLAND")
  ]),
  CIVILIZATION_FRENCH_EMPIRE: withReveal("FRENCH_EMPIRE", [
    { mods: ["TRAIT_MOD_LIBERTE_GOVERNMENT_CHANGE"], value: 3, why: "Adds every Modern government's celebration choices (EFFECT_PLAYER_ADD_GOLDEN_AGE_CHOICE)." },
    WONDER("FRENCH_EMPIRE")
  ]),
  CIVILIZATION_GAUL: {
    bullets: [
      { mods: ["TRAIT_MOD_NOT_NEARBY_PRODUCTION"], value: 3, why: "+2 Production with no own city center within 6 tiles." },
      { mods: ["TRAIT_MOD_NEARBY_GOLD"], value: 2, why: "+2 Gold with another civilization's city within 6 tiles." },
      { mods: ["TRAIT_MOD_TOWN_FORTIFICATION_BUILDING"], value: 2, why: "Towns buy FORTIFICATION buildings with any focus." },
      WONDER("GAUL")
    ],
    unplaced: ["TRAIT_MOD_DRUID_PURCHASE_CHARGE"],
    unplacedWhy: "A purchase charge for Druid-founded cities on high-appeal plots; no bullet describes it, and it only matters with Gaul's own Druid unit."
  },
  CIVILIZATION_GORYEO: withReveal("GORYEO", [
    { mods: ["TRAIT_MOD_ENDEAVOR_CULTURE"], value: 3, why: "Culture per endeavor you're involved in (the data says Amount 2 where the text says +3).", note: "The data gives +2 Culture per endeavor; the text says +3." },
    { mods: ["TRAIT_MOD_TOWN_UNIQUE_IMPROVEMENT_CULTURE"], value: 2, why: "+1 Culture on UNIQUE_IMPROVEMENT constructibles in towns." },
    { mods: ["TRAIT_MOD_CITY_UNIQUE_IMPROVEMENT_INFLUENCE"], value: 2, why: "+1 Influence on UNIQUE_IMPROVEMENT constructibles in cities." },
    WONDER("GORYEO")
  ]),
  CIVILIZATION_GREAT_BRITAIN: withReveal("GREAT_BRITAIN", [
    { mods: ["TRAIT_GB_MOD_BUILDING_CHEAPER_PURCHASE", "TRAIT_GB_MOD_BUILDING_PRODUCTION"], value: 4, why: "+25% building purchase efficiency and +25% building production." },
    { mods: ["TRAIT_MOD_CITY_PROJECT_MORE_EXPENSIVE"], value: 1, why: "-50% town upgrade discount (a drawback)." },
    { mods: ["TRAIT_GB_MOD_COASTAL_BUILDING_SCIENCE_A", "TRAIT_GB_MOD_COASTAL_BUILDING_SCIENCE_B"], value: 3, bias: ["COAST"], why: "Science on coastal urban plots with one and two current-age buildings." },
    WONDER("GREAT_BRITAIN")
  ]),
  CIVILIZATION_GREECE: [
    { mods: ["TRAIT_MOD_DEMOKRATIA_INFLUENCE"], value: 2, why: "+3 Influence on BUILDING_PALACE." },
    {
      mods: ["TRAIT_MOD_DEMOKRATIA_CULTURE_ENDEAVOR", "TRAIT_MOD_DEMOKRATIA_CULTURE_SANCTION", "TRAIT_MOD_DEMOKRATIA_CULTURE_PROJECT"],
      value: 3,
      why: "Culture per endeavor, sanction and project you're involved in."
    },
    { mods: ["TRAIT_MOD_DEMOKRATIA_CITY_STATE_TOURISM"], value: 2, why: "Activates VICTORY_TRACKER_GREECE_SUZERAIN, the tourism-per-suzerainty tracker." },
    WONDER("GREECE")
  ],
  CIVILIZATION_HAN: [
    { mods: ["TRAIT_MOD_NINE_PROVINCES_POP_IN_CAPITAL_ON_SCIENCE_BUILDING"], value: 3, why: "+1 Population in the capital on a SCIENCE building." },
    { mods: ["TRAIT_MOD_NINE_PROVINCES_CAPITAL", "TRAIT_MOD_NINE_PROVINCES_TOWN"], value: 3, why: "+1 Population for the original capital and new towns." },
    WONDER("HAN")
  ],
  CIVILIZATION_HAWAII: withReveal("HAWAII", [
    { mods: ["TRAIT_MOD_HAWAII_IMPROVE_OCEAN"], value: 3, bias: ["BIOME_MARINE"], why: "Unlocks IMPROVEMENT_HAWAII_FISHING_BOAT, so Ocean plots can be worked." },
    { mods: ["TRAIT_MOD_HAPPINESS_WAREHOUSE"], value: 3, bias: ["BIOME_MARINE"], why: "The Hawaii warehouse yields on Coast and Ocean plots (Happiness, Culture, Food, Gold)." },
    WONDER("HAWAII")
  ]),
  CIVILIZATION_HEIAN: [
    { mods: ["TRAIT_MOD_APPEALING_CULTURE"], value: 3, why: "+2 Culture on rural plots with breathtaking appeal." },
    WONDER("HEIAN")
  ],
  CIVILIZATION_ICELAND: withReveal("ICELAND", [
    { mods: ["ICELAND_MOD_NAVAL_SIGHT"], value: 1, why: "+1 sight for UNIT_CLASS_NAVAL." },
    { mods: ["ICELAND_MOD_NATURAL_WONDER_DISCOVERY"], value: 3, bias: ["NATURAL_WONDER"], why: "Culture on finding a natural wonder, 500 in distant lands (DistantLandBonus)." },
    { mods: ["ICELAND_MOD_MISSIONARY_RELIC_CIVIC_MASTERY"], value: 2, why: "A relic per civic tree mastery (EFFECT_ADJUST_PLAYER_RELIC_FOR_CIVIC_TREE_MASTERY)." },
    { mods: ["ICELAND_MOD_MISSIONARY_PRODUCTION", "ICELAND_MOD_MISSIONARY_PURCHASE"], value: 1, why: "-50% production and -100% purchase efficiency for religious units (a drawback)." },
    WONDER("ICELAND")
  ]),
  CIVILIZATION_INCA: withReveal("INCA", [
    { mods: ["TRAIT_MOD_APUS_IMPROVE_MOUNTAINS"], value: 3, bias: ["TERRAIN_MOUNTAIN"], why: "Unlocks IMPROVEMENT_INCA_MOUNTAIN, so Mountain plots can be worked." },
    { mods: ["TRAIT_MOD_APUS_MOUNTAIN_FOOD", "TRAIT_MOD_APUS_MOUNTAIN_PRODUCTION"], value: 3, bias: ["TERRAIN_MOUNTAIN"], why: "+2 Food and +1 Production on rural Mountain plots." },
    GOES_WITH("CIVNODE_NODE_CIVIC_EX_INCA_QHAPAQ_NAN", "the Qhapaq Ñan civic, whose own modifiers make the convoys"),
    WONDER("INCA")
  ]),
  CIVILIZATION_JOSEON: withReveal("JOSEON", [
    { mods: ["MOD_JOSEON_CAPITAL_SPECIALIST_LIMIT_LARGE_INCREASE"], value: 2, why: "+2 worker cap in the capital." },
    {
      mods: ["MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_SEOWON_INCREASE", "MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_NO_SEOWON_DECREASE"],
      value: 1,
      why: "+1 worker cap in cities with a Seowon quarter, -1 without; away from Joseon only the -1 can apply.",
      movable: 0,
      keep: true,
      goesWith: "CIVNODE_NODE_CIVIC_MO_JOSEON_IHAK",
      note: "Goes with the Seowon: both modifiers are in LShufBoundModifiers and follow the quarter (CONTRACTS 23 R4)."
    },
    { mods: ["MOD_JOSEON_CITY_LIMIT_LARGE_INCREASE"], value: 2, why: "+2 city limit (the text's initial limit of 2)." },
    { mods: ["MOD_TOWN_TIER1_BUILDINGS"], value: 2, why: "Towns buy JOSEON-tagged buildings with any focus." },
    WONDER("JOSEON")
  ]),
  CIVILIZATION_KHMER: [
    { mods: ["TRAIT_MOD_KSEKAM_CHAMNON_MINOR_RIVER", "TRAIT_MOD_KSEKAM_CHAMNON_NAVIGABLE_RIVER"], value: 3, bias: ["RIVER"], why: "Natural yields kept under districts on minor and navigable rivers." },
    { mods: ["TRAIT_MOD_KSEKAM_CHAMNON_CAPITAL_GROWTH", "TRAIT_MOD_KSEKAM_CHAMNON_CITY_HAPPINESS_PENALTY"], value: 3, why: "+50% capital growth with -5 Happiness in other cities." },
    WONDER("KHMER")
  ],
  CIVILIZATION_MAJAPAHIT: withReveal("MAJAPAHIT", [
    { mods: ["TRAIT_MOD_NEGARA_CULTURE_BUILDING_ADJACENCY"], value: 3, bias: ["COAST"], why: "Activates the NegaraCultureBuildingCoastCulture adjacency." },
    { mods: ["TRAIT_MOD_NEGARA_SPECIALIST_CAP_INCREASE"], value: 3, bias: ["COAST"], why: "+1 district worker cap on or next to coast." },
    JOINS("Explains the specialist-limit bullet before it, so it joins that card."),
    WONDER("MAJAPAHIT")
  ]),
  CIVILIZATION_MAURYA: {
    bullets: [
      {
        mods: ["TRAIT_MOD_DHAMMA_THAMBHA_AQ_HAPPINESS_BUILDING_HAPPINESS", "TRAIT_MOD_DHAMMA_THAMBHA_AQ_MILITARY_BUILDING_HAPPINESS", "TRAIT_MOD_DHAMMA_THAMBHA_AQ_SCIENCE_BUILDING_HAPPINESS"],
        value: 3,
        why: "+2 Happiness on HAPPINESS, MILITARY and SCIENCE buildings."
      },
      { mods: ["TRAIT_MOD_DHAMMA_THAMBHA_CELEBRATION_HEAL"], value: 2, why: "Full healing for land units on entering a celebration." },
      WONDER("MAURYA")
    ],
    unplaced: ["TRAIT_MOD_NAGARIKA_ALTAR_PURCHASE"],
    unplacedWhy: "A free Altar purchase charge in newly settled towns; no bullet describes it."
  },
  CIVILIZATION_MAYA: [
    { mods: ["TRAIT_MOD_SKIES_OF_ITZAMNA_CULTURE_FOR_TECH"], value: 3, why: "Culture at 10% of a tech's cost on research." },
    { mods: ["TRAIT_MOD_SKIES_OF_ITZAMNA_SCIENCE_FOR_CIVIC"], value: 3, why: "Science at 10% of a civic's cost on study." },
    WONDER("MAYA")
  ],
  CIVILIZATION_MEIJI: withReveal("MEIJI", [
    { mods: ["TRAIT_MOD_GOISSHIN_SCIENCE_ON_OVERBUILD"], value: 3, why: "Science worth 25% of the cost when a building is overbuilt." },
    WONDER("MEIJI")
  ], ["MOD_JUKOGYO_RESOURCE_CAP"], "+1 resource cap in cities with BUILDING_JUKOGYO; it rides on the unique building, no bullet describes it."),
  CIVILIZATION_MEXICO: withReveal("MEXICO", [
    { mods: ["TRAIT_MOD_REVOLUCION_GOVERNMENT_UNIQUE"], value: 3, why: "Sets GOVERNMENT_REVOLUCION." },
    { mods: ["TRAIT_MOD_REVOLUCION_MO_CELEBRATION_TOURISM"], value: 2, why: "+100% on the celebrations Tourism tracker." },
    WONDER("MEXICO")
  ]),
  CIVILIZATION_MING: withReveal("MING", [
    { mods: ["TRAIT_MOD_CAPITAL_EXTRA_SCIENCE"], value: 4, why: "+50% Science in the capital." },
    { mods: ["TRAIT_MOD_LOSE_SCIENCE_PER_NON_UNIQUE_TRADITION"], value: 1, why: "-15 Science per slotted non-unique policy (CivUnique=true, Invert=true), a drawback." },
    { mods: ["TRAIT_MOD_TOT_MING_TRADITION_SLOT"], value: 3, why: "+1 TRADITION_CULTURE_SLOT." },
    WONDER("MING")
  ], ["MANDARIN_MOD_NAVAL_TRADE_ATTACH_DISTANT", "MANDARIN_MOD_NAVAL_TRADE_ATTACH_HOMELANDS"], "Sea trade route attachments (target Culture, treasure fleets); no bullet in the text describes them."),
  CIVILIZATION_MISSISSIPPIAN: [
    { mods: ["TRAIT_MOD_GOOSE_SOCIETIES"], value: 3, why: "Activates the GooseSocietiesWildcardResourceFood adjacency." },
    { mods: ["TRAIT_MOD_GOOSE_SOCIETIES_BUILDING_PRODUCTION"], value: 2, why: "+10% building production." },
    WONDER("MISSISSIPPIAN")
  ],
  CIVILIZATION_MONGOLIA: withReveal("MONGOLIA", [
    { mods: ["TRAIT_MOD_CONQUER_UNIT"], value: 3, why: "A UNIT_CLASS_CAVALRY unit on capturing a city." },
    { mods: ["TRAIT_MOD_EXPENSIVE_SETTLER"], value: 1, why: "-50% Settler production (a drawback)." },
    WONDER("MONGOLIA")
  ]),
  CIVILIZATION_MUGHAL: withReveal("MUGHAL", [
    { mods: ["TRAIT_MOD_PARADISE_OF_NATIONS_GOLD"], value: 4, why: "+100% Gold." },
    { mods: ["TRAIT_MOD_PARADISE_OF_NATIONS_CITY_YIELD_PENALTY", "TRAIT_MOD_PARADISE_OF_NATIONS_YIELD_PENALTY"], value: 1, why: "-25% to the other yields (a drawback)." },
    { mods: ["TRAIT_MOD_PARADISE_OF_NATIONS_WONDER_PURCHASE_ABILITY"], value: 2, why: "Wonder purchase at -150% efficiency." },
    WONDER("MUGHAL")
  ], ["TRAIT_MOD_ZAMINDAR_POPULATION_BONUS"], "+1 Population for cities founded by the Zamindar; it rides on the unique unit, no bullet describes it."),
  CIVILIZATION_NEPAL: withReveal("NEPAL", [
    {
      mods: ["MOD_NEPAL_MOUNTAIN_WAREHOUSES", "MOD_EXPENSIVE_WAREHOUSE_BUILDINGS"],
      value: 3,
      bias: ["TERRAIN_MOUNTAIN"],
      why: "Warehouse yields on mountains with the +1 Gold and Happiness maintenance."
    },
    { mods: ["TRAIT_MOD_NEPAL_MOUNTAIN_TOURISM"], value: 2, bias: ["TERRAIN_MOUNTAIN"], why: "Activates the mountains Tourism tracker (VICTORY_TRACKER_NEPAL_MOUNTAINS)." },
    WONDER("NEPAL")
  ]),
  CIVILIZATION_NORMAN: withReveal("NORMAN", [
    { mods: ["TRAIT_MOD_ADJACENT_TO_COAST_COMBAT", "TRAIT_MOD_NORMANNITAS_DISTRICT_ADJACENT_TO_COAST_COMBAT"], value: 3, bias: ["COAST"], why: "Combat strength for land units and districts adjacent to coast." },
    { mods: ["TRAIT_MOD_NORMANNITAS_WALL_HEALTH"], value: 2, why: "+25 district health with a fortification." },
    WONDER("NORMAN")
  ], ["TRAIT_MOD_SOKEMAN_WALLS"], "Free Medieval Walls in cities founded by the Sokeman; it rides on the unique unit, no bullet describes it."),
  CIVILIZATION_OTTOMANS: withReveal("OTTOMANS", [
    { mods: ["MOD_CIV_OTTOMAN_ARTIFACTS"], value: 2, why: "+1 artifact when one is excavated in your territory." },
    { mods: ["MOD_CIV_OTTOMAN_COMBAT"], value: 3, why: "Attaches the infantry and siege attack bonus." },
    WONDER("OTTOMANS")
  ]),
  CIVILIZATION_PERSIA: [
    { mods: ["TRAIT_MOD_HAMARANA_COUNCIL"], value: 3, why: "ABILITY_HAMARANA_COUNCIL on infantry: +3 attacking." },
    { mods: ["TRAIT_MOD_HAMARANA_COMMANDER_PROMOTION"], value: 2, why: "A free promotion for army commanders." },
    WONDER("PERSIA")
  ],
  CIVILIZATION_PIRATE_REPUBLIC: withReveal("PIRATE_REPUBLIC", [
    { mods: ["MOD_CIV_NAVAL_UNITS_FOREIGN_TERRITORY"], value: 2, why: "Naval, fleet commander and treasure units enter foreign lands." },
    {
      mods: ["MOD_CIV_PIRATE_REPUBLIC_FLEET_COMMANDER_LAND_CLAIM_CHARGE"], value: 2,
      why: "A land-claim charge for fleet commanders with one promotion.",
      note: "A card of its own on the build screen; in the random deal it goes with the Buccaneer (LShufBoundPieces, CONTRACTS 29)."
    },
    {
      mods: ["MOD_CIV_PIRATE_REPUBLIC_DISABLE_SETTLERS", "MOD_CIV_PIRATE_REPUBLIC_CAPTURE_SETTLERS"], value: 2,
      why: "No settlers of your own; capture others'.",
      note: "A card of its own on the build screen; in the random deal it goes with the Buccaneer and the settle charge (LShufBoundPieces, CONTRACTS 29)."
    },
    { mods: ["MOD_CIV_PIRATE_REPUBLIC_CAPTURE_NAVAL_GDP"], value: 2, why: "+5 economic victory points per naval kill." },
    WONDER("PIRATE_REPUBLIC")
  ]),
  CIVILIZATION_PRUSSIA: withReveal("PRUSSIA", [
    { mods: ["TRAIT_MOD_BLOOD_AND_IRON_COMBAT_STRENGTH"], value: 3, why: "+1 combat strength per unfriendly or hostile relationship." },
    { mods: ["TRAIT_MOD_ZOLLVEREIN_TRADE_DURING_WAR"], value: 2, why: "TradeDuringWar=true." },
    WONDER("PRUSSIA")
  ]),
  CIVILIZATION_QAJAR: withReveal("QAJAR", [
    { mods: ["MOD_CIV_QAJAR_DIPLOMACY"], value: 2, why: "+50% support response efficiency." },
    { mods: ["MOD_CIV_QAJAR_YIELDS_UNDER_SETTLEMENT_CAP_MO"], value: 3, why: "Food and Production in the capital per settlement under the cap." },
    WONDER("QAJAR")
  ]),
  CIVILIZATION_QING: withReveal("QING", [
    {
      mods: ["TRAIT_MOD_SHENGSHI_GOLD_PER_IMPORTED_RESOURCE", "TRAIT_MOD_SHENGSHI_CULTURE_PER_IMPORTED_RESOURCE", "TRAIT_MOD_SHENGSHI_SCIENCE_MALUS_PER_TRADE_ROUTE"],
      value: 3,
      why: "Gold and Culture per imported resource with the Science loss per trade route."
    },
    { mods: ["TRAIT_MOD_QING_IMPORTED_RESOURCE_GDP"], value: 2, why: "Activates the imported-resources economic victory tracker (VICTORY_TRACKER_QING_IMPORTED_RESOURCES)." },
    { mods: ["TRAIT_MOD_SHENGSHI_COMBAT_STRENGTH"], value: 2, why: "ABILITY_SHENGSHI on land units: strength per trade partner." },
    WONDER("QING")
  ]),
  CIVILIZATION_ROME: [
    { mods: ["TRAIT_MOD_TWELVE_TABLES_CAPITAL", "TRAIT_MOD_TWELVE_TABLES_TOWNS"], value: 3, why: "Culture on districts in the capital and town centers (attached modifiers)." },
    { mods: ["TRAIT_MOD_TWELVE_TABLES_TOWN_INFANTRY"], value: 3, why: "A free infantry unit in newly founded towns." },
    WONDER("ROME")
  ],
  CIVILIZATION_RUSSIA: withReveal("RUSSIA", [
    { mods: ["PROSVESHCHENIE_CITY_YIELDS"], value: 3, bias: ["BIOME_TUNDRA"], why: "Attaches Culture on quarters and Science on Tundra quarters in cities." },
    { mods: ["PROSVESHCHENIE_TOWN_FOOD", "PROSVESHCHENIE_TOWN_PRODUCTION"], value: 3, bias: ["BIOME_TUNDRA"], why: "Warehouse Food on farms in towns, and Production in Tundra." },
    WONDER("RUSSIA")
  ]),
  CIVILIZATION_SENGOKU: withReveal("SENGOKU", [
    {
      mods: ["SENGOKU_MOD_COMMANDER_XP_INFLUENCE_EXPLORATION", "SENGOKU_MOD_COMMANDER_XP_CULTURE", "SENGOKU_MOD_COMMANDER_XP_SCIENCE"],
      value: 3,
      why: "Influence, Culture and Science per army commander XP (the data gives 1/2/2 where the text says 1/3/3).",
      note: "The data gives +2 Culture and +2 Science per XP; the text says +3."
    },
    { mods: ["SENGOKU_MOD_REMOVE_CULTURE_ADJACENCY"], value: 1, why: "Removes the mountain Culture adjacency (a drawback)." },
    { mods: ["SENGOKU_MOD_REMOVE_SCIENCE_ADJACENCY"], value: 1, why: "Removes the resource Science adjacency (a drawback)." },
    WONDER("SENGOKU")
  ]),
  CIVILIZATION_SHAWNEE: withReveal("SHAWNEE", [
    { mods: ["MOD_SHAWNEE_RIVER_FOOD"], value: 3, bias: ["TERRAIN_NAVIGABLE_RIVER"], why: "Attaches the river Food in settlements adjacent to navigable rivers." },
    { mods: ["MOD_SHAWNEE_CITY_STATE_RESOURCES"], value: 2, why: "+1 resource cap in the capital per suzerainty." },
    WONDER("SHAWNEE")
  ]),
  CIVILIZATION_SIAM: withReveal("SIAM", [
    { mods: ["TRAIT_MOD_ITSARAPHAB"], value: 3, why: "Grants DIPLOMACY_ACTION_BECOME_SUZERAIN." },
    { mods: ["TRAIT_MOD_ITSARAPHAB_MO_INFLUENCE_FRIENDLY", "TRAIT_MOD_ITSARAPHAB_MO_INFLUENCE_HELPFUL"], value: 3, why: "Influence per friendly and helpful relationship." },
    { mods: ["TRAIT_MOD_ITSARAPHAB_MO_CITY_STATE_TOURISM"], value: 2, why: "Activates the suzerain Tourism tracker (VICTORY_TRACKER_SIAM_SUZERAIN)." },
    WONDER("SIAM")
  ]),
  CIVILIZATION_SILLA: [
    { mods: ["MOD_SILLA_ALLIANCE_ROUTE"], value: 3, why: "Capital trade routes on alliance (AllianceCapitalRoutes)." },
    { mods: ["MOD_SILLA_INFLUENCE_PER_TRADE_PARTNER"], value: 2, why: "+1 Influence per civilization traded with." },
    WONDER("SILLA")
  ],
  CIVILIZATION_SONGHAI: withReveal("SONGHAI", [
    { mods: ["TRAIT_MOD_NAVIGABLE_RIVER_RESOURCE_CAP"], value: 3, bias: ["TERRAIN_NAVIGABLE_RIVER"], why: "+2 resource cap in cities whose center is on a navigable river." },
    { mods: ["TRAIT_MOD_RESOURCE_PRODUCTION"], value: 3, bias: ["TERRAIN_NAVIGABLE_RIVER"], why: "Production per assigned resource in navigable-river cities." },
    GOES_WITH("CIVNODE_NODE_CIVIC_EX_SONGHAI_KANTA", "the Kanta civic, whose own modifiers make the convoys"),
    WONDER("SONGHAI")
  ]),
  CIVILIZATION_SPAIN: withReveal("SPAIN", [
    {
      mods: ["TRAIT_MOD_COASTAL_SETTLEMENT_YIELDS", "TRAIT_MOD_COASTAL_SETTLEMENT_YIELDS_DISTANT_LANDS", "TRAIT_MOD_RELIGION_SETTLEMENT_YIELDS", "TRAIT_MOD_RELIGION_SETTLEMENT_YIELDS_DISTANT_LANDS"],
      value: 3,
      bias: ["COAST"],
      why: "Food, Gold and Production in coastal settlements and in ones following your religion, doubled in distant lands."
    },
    { mods: ["MOD_TRAIT_SPAIN_ABILITY_TOWN_CONVERSION", "MOD_TRAIT_SPAIN_ABILITY_TOWN_CONVERSION_DISTANT"], value: 2, why: "+15% / +30% (distant lands) on the town-to-city project." },
    WONDER("SPAIN")
  ], ["MOD_OCEAN_CONQUISTADOR"], "Deep-water embarkation for the Conquistador; it rides on the unique unit, no bullet describes it."),
  CIVILIZATION_TONGA: {
    bullets: [
      { mods: ["MOD_TONGA_PALACE_CITY_HALL_INFLUENCE"], value: 2, bias: ["COAST"], why: "+1 Influence on the Palace and City Halls adjacent to coast." },
      { mods: ["MOD_TONGA_CS_TRADE"], value: 3, why: "Suzerain capital routes (EFFECT_ADJUST_PLAYER_SUZERAIN_CAPITAL_ROUTES)." },
      { mods: ["MOD_TONGA_FORBID_INCOPERATE"], value: 1, why: "Forbids city-state incorporation (a drawback)." },
      WONDER("TONGA")
    ],
    unplaced: ["MOD_TONGA_MEET_DISTANT_LAND_CIVS", "MOD_TONGA_OCEAN_TRADE"],
    unplacedWhy: "Meeting distant-lands civilizations and safe deep-water trade units; no bullet describes them."
  }
};

// Since 1.5.1 a civilization's great person can't be trained; modifiers on the ability grant it. No bullet describes
// them, so they're unplaced. The ones whose requirement names the civ's quarter or improvement are bound to it
// (LShufBoundModifiers, scripts/mapping/build-deps.mjs) and go to whoever holds that.
const GP_GRANT_WHY = "Grants the civilization's great person (1.5.1); no bullet describes it.";
const GP_GRANTS = {
  CIVILIZATION_EGYPT: ["TRAIT_MOD_GRANT_TJAY"],
  CIVILIZATION_GREECE: ["TRAIT_MOD_GRANT_LOGIOS_QUARTER", "TRAIT_MOD_GRANT_LOGIOS_SUZERAIN"],
  CIVILIZATION_HAN: ["TRAIT_MOD_GRANT_SHI_DAFU_SCIENCE"],
  CIVILIZATION_HEIAN: ["TRAIT_MOD_GRANT_SHIJIN", "TRAIT_MOD_GRANT_SHIJIN_HAPPINESS"],
  CIVILIZATION_ABBASID: ["TRAIT_MOD_GRANT_ALIM_QUARTER"],
  CIVILIZATION_ICELAND: ["TRAIT_MOD_GRANT_SAGA_HERO_IMPROVEMENT", "TRAIT_MOD_GRANT_SAGA_HERO_NATURAL_WONDER"],
  CIVILIZATION_SPAIN: ["TRAIT_MOD_GRANT_CONQUISTADOR_DISTANT_LANDS", "TRAIT_MOD_GRANT_CONQUISTADOR_QUARTER"],
  CIVILIZATION_FRENCH_EMPIRE: ["TRAIT_MOD_GRANT_JACOBIN_CELEBRATION", "TRAIT_MOD_GRANT_JACOBIN_QUARTER"],
  CIVILIZATION_MEXICO: ["TRAIT_MOD_GRANT_REVOLUCIONARIO_CELEBRATION", "TRAIT_MOD_GRANT_REVOLUCIONARIO_QUARTER"],
  CIVILIZATION_SIAM: ["TRAIT_MOD_GRANT_UPARAT"]
};
for (const [civ, mods] of Object.entries(GP_GRANTS)) {
  const was = CIV_DRAFT[civ];
  const entry = Array.isArray(was) ? { bullets: was } : was;
  const before = entry.unplaced || [];
  const whyOf = (id) => (typeof entry.unplacedWhy === "object" ? entry.unplacedWhy[id] : entry.unplacedWhy);
  entry.unplacedWhy = Object.fromEntries([
    ...before.map((id) => [id, whyOf(id)]), ...mods.map((id) => [id, GP_GRANT_WHY])
  ]);
  entry.unplaced = [...before, ...mods];
  CIV_DRAFT[civ] = entry;
}

// A civilization played outside its own age (Test of Time) keeps its ability trait, but the game swaps some of the
// modifiers behind a bullet for that age's versions (Spain's coastal yields are +1 in Antiquity, +2 in Exploration,
// +3 in Modern, each under its own modifier id). CIV_AGE_VARIANTS names, per piece and age, the modifiers that stand
// in for the piece's own there, read off each age's ability text and modifier data like the draft above. A piece's
// own modifier that an age still attaches needs no entry. CIV_AGE_EXTRAS lists what an age attaches that no bullet
// of the civilization's own age covers (a bullet the age adds, or a unit's rider); those stay with the civilization.
// The build fails on a modifier an age attaches that is in neither list, so a game update can't slip one past.
const AQ = "AGE_ANTIQUITY";
const EX = "AGE_EXPLORATION";
const MO = "AGE_MODERN";
export const CIV_AGE_VARIANTS = {
  CIVILIZATION_ABBASID: {
    B01: { [AQ]: ["TRAIT_MOD_TOT_AQ_GOLD_SPECIALISTS"], [MO]: ["TRAIT_MOD_TOT_MO_GOLD_SPECIALISTS"] },
    B02: { [MO]: ["MOD_TRAIT_ABBASID_PRODUCTION_MO_SPECIALISTS"] }
  },
  CIVILIZATION_AKSUM: { B01: { [MO]: ["TRAIT_MOD_MO_KINGDOM_OF_NATURAL_WEALTH_RESOURCE"] } },
  CIVILIZATION_ASSYRIA: {
    B01: { [EX]: ["MOD_CIV_FIRST_TIME_CONQUER_RELIC"], [MO]: ["MOD_CIV_FIRST_TIME_CONQUER_ARTIFACT"] }
  },
  CIVILIZATION_CHOLA: {
    B02: {
      [AQ]: ["TRAIT_MOD_TOT_AQ_TRADE_ROUTE_GOLD", "TRAIT_MOD_TOT_AQ_TRADE_ROUTE_INFLUENCE"],
      [MO]: ["TRAIT_MOD_TOT_MO_TRADE_ROUTE_GOLD", "TRAIT_MOD_TOT_MO_TRADE_ROUTE_INFLUENCE"]
    }
  },
  CIVILIZATION_DAI_VIET: {
    B01: { [AQ]: ["MOD_CIV_WALL_AQ_YIELD"], [MO]: ["MOD_CIV_WALL_MO_YIELD"] },
    B02: { [AQ]: ["MOD_DAI_VIET_AQ_FORTIFICATION_CULTURE", "MOD_DAI_VIET_AQ_FORTIFICATION_FOOD"] }
  },
  CIVILIZATION_FRENCH_EMPIRE: {
    B01: { [AQ]: ["TRAIT_MOD_LIBERTE_AQ_GOVERNMENT_CHANGE"], [EX]: ["TRAIT_MOD_LIBERTE_EX_GOVERNMENT_CHANGE"] }
  },
  // Modern's second bullet is "+1 GDP per turn for every Settlement within 6 tiles of another Civilization's border",
  // the age's version of the Gold bullet.
  CIVILIZATION_GAUL: { B02: { [MO]: ["TRAIT_MOD_GAUL_VP"] } },
  CIVILIZATION_GREECE: {
    B01: { [EX]: ["TRAIT_MOD_DEMOKRATIA_INFLUENCE_TOT_EX"], [MO]: ["TRAIT_MOD_DEMOKRATIA_INFLUENCE_TOT_MO"] },
    // Exploration and Modern add Espionage Actions to the same bullet.
    B02: {
      [EX]: ["TRAIT_MOD_DEMOKRATIA_CULTURE_ESPIONAGE"],
      [MO]: ["TRAIT_MOD_DEMOKRATIA_CULTURE_ENDEAVOR_TOT_MO", "TRAIT_MOD_DEMOKRATIA_CULTURE_SANCTION_TOT_MO",
        "TRAIT_MOD_DEMOKRATIA_CULTURE_PROJECT_TOT_MO", "TRAIT_MOD_DEMOKRATIA_CULTURE_ESPIONAGE_TOT_MO"]
    }
  },
  CIVILIZATION_HAN: {
    B01: { [EX]: ["TRAIT_MOD_NINE_PROVINCES_POP_IN_CITIES_ON_SCIENCE_BUILDING"], [MO]: ["TRAIT_MOD_NINE_PROVINCES_POP_ON_SCIENCE_BUILDING"] },
    B02: { [EX]: ["TRAIT_MOD_NINE_PROVINCES_TOT_TOWN"], [MO]: ["TRAIT_MOD_NINE_PROVINCES_TOT_TOWN"] }
  },
  CIVILIZATION_HAWAII: {
    B02: {
      [AQ]: ["TRAIT_MOD_HAWAII_TOT_AQ_CULTURE_ON_MARINE", "TRAIT_MOD_HAWAII_TOT_AQ_CULTURE_WAREHOUSE"],
      [MO]: ["TRAIT_MOD_HAWAII_TOT_MO_HAPPINESS_WAREHOUSE"]
    }
  },
  CIVILIZATION_HEIAN: { B01: { [EX]: ["TRAIT_MOD_APPEALING_MORE_CULTURE"], [MO]: ["TRAIT_MOD_APPEALING_MORE_CULTURE"] } },
  // Modern's second bullet is "+4 Culture on Natural Wonder and Volcano Tiles", the age's version of the discovery one.
  CIVILIZATION_ICELAND: {
    B02: { [AQ]: ["ICELAND_AQ_MOD_NATURAL_WONDER_DISCOVERY"], [MO]: ["ICELAND_MO_MOD_NATURAL_WONDER_CULTURE"] }
  },
  CIVILIZATION_INCA: {
    B02: { [AQ]: ["TRAIT_MOD_TOT_AQ_APUS_MOUNTAIN_FOOD"], [MO]: ["TRAIT_MOD_TOT_MO_APUS_MOUNTAIN_FOOD", "TRAIT_MOD_TOT_MO_APUS_MOUNTAIN_PRODUCTION"] }
  },
  CIVILIZATION_JOSEON: {
    B01: { [AQ]: ["MOD_JOSEON_CAPITAL_SPECIALIST_LIMIT_INCREASE"] },
    B03: { [AQ]: ["MOD_JOSEON_CITY_LIMIT_INCREASE"] }
  },
  CIVILIZATION_MAURYA: {
    B01: { [MO]: ["TRAIT_MOD_DHAMMA_THAMBHA_MO_HAPPINESS_BUILDING_HAPPINESS", "TRAIT_MOD_DHAMMA_THAMBHA_MO_MILITARY_BUILDING_HAPPINESS",
      "TRAIT_MOD_DHAMMA_THAMBHA_MO_SCIENCE_BUILDING_HAPPINESS"] }
  },
  CIVILIZATION_MEIJI: { B01: { [AQ]: ["TRAIT_MOD_GOISSHIN_AQ_SCIENCE_ON_BUILD"] } },
  CIVILIZATION_MEXICO: { B02: { [EX]: ["TRAIT_MOD_REVOLUCION_EX_CELEBRATION_TOURISM"] } },
  CIVILIZATION_MING: {
    B02: { [AQ]: ["TRAIT_MOD_TOT_AQ_LOSE_SCIENCE_PER_NON_UNIQUE_TRADITION"], [MO]: ["TRAIT_MOD_TOT_MO_LOSE_SCIENCE_PER_NON_UNIQUE_TRADITION"] }
  },
  // Antiquity and Exploration open with "Can work Mountain Terrain", which the warehouse bullet needs to do anything.
  CIVILIZATION_NEPAL: { B01: { [AQ]: ["MOD_NEPAL_IMPROVE_MOUNTAINS"], [EX]: ["MOD_NEPAL_IMPROVE_MOUNTAINS"] } },
  // The first bullet is a Codex (Antiquity) or a Relic (Exploration) on a Celebration or a conquered capital, where
  // Modern has the extra Artifact.
  CIVILIZATION_OTTOMANS: {
    B01: {
      [AQ]: ["MOD_CIV_OTTOMAN_GOLDEN_AGE_CODEX", "MOD_CIV_OTTOMAN_CONQUEST_GREATWORK"],
      [EX]: ["MOD_CIV_OTTOMAN_GOLDEN_AGE_RELIC", "MOD_CIV_OTTOMAN_CONQUEST_GREATWORK"]
    }
  },
  CIVILIZATION_QAJAR: {
    B02: { [AQ]: ["MOD_CIV_QAJAR_YIELDS_UNDER_SETTLEMENT_CAP_AQ"], [EX]: ["MOD_CIV_QAJAR_YIELDS_UNDER_SETTLEMENT_CAP_EX"] }
  },
  CIVILIZATION_QING: {
    B01: {
      [AQ]: ["TRAIT_MOD_AQ_SHENGSHI_GOLD_PER_IMPORTED_RESOURCE", "TRAIT_MOD_AQ_SHENGSHI_CULTURE_PER_IMPORTED_RESOURCE",
        "TRAIT_MOD_AQ_SHENGSHI_SCIENCE_MALUS_PER_TRADE_ROUTE"],
      [EX]: ["TRAIT_MOD_EX_SHENGSHI_GOLD_PER_IMPORTED_RESOURCE", "TRAIT_MOD_EX_SHENGSHI_CULTURE_PER_IMPORTED_RESOURCE",
        "TRAIT_MOD_EX_SHENGSHI_SCIENCE_MALUS_PER_TRADE_ROUTE"]
    }
  },
  CIVILIZATION_ROME: { B01: { [MO]: ["TRAIT_MOD_MO_TWELVE_TABLES_CAPITAL", "TRAIT_MOD_MO_TWELVE_TABLES_TOWNS"] } },
  CIVILIZATION_SENGOKU: { B01: { [MO]: ["SENGOKU_MOD_COMMANDER_XP_INFLUENCE_MODERN"] } },
  CIVILIZATION_SIAM: {
    B02: {
      [AQ]: ["TRAIT_MOD_ITSARAPHAB_AQ_INFLUENCE_FRIENDLY", "TRAIT_MOD_ITSARAPHAB_AQ_INFLUENCE_HELPFUL"],
      [EX]: ["TRAIT_MOD_ITSARAPHAB_EX_INFLUENCE_FRIENDLY", "TRAIT_MOD_ITSARAPHAB_EX_INFLUENCE_HELPFUL"]
    }
  },
  CIVILIZATION_SONGHAI: {
    B01: { [AQ]: ["TRAIT_MOD_SONGHAI_TOT_AQ_NAVIGABLE_RIVER_RESOURCE_CAP"] },
    B02: { [MO]: ["TRAIT_MOD_SONGHAI_TOT_MO_RESOURCE_PRODUCTION"] }
  },
  // Antiquity has no Religion, so its second half is "Settlements with an Altar".
  CIVILIZATION_SPAIN: {
    B01: {
      [AQ]: ["TRAIT_MOD_TOT_AQ_COASTAL_SETTLEMENT_YIELDS", "TRAIT_MOD_TOT_AQ_ALTAR_SETTLEMENT_YIELDS"],
      [MO]: ["TRAIT_MOD_TOT_MO_COASTAL_SETTLEMENT_YIELDS", "TRAIT_MOD_TOT_MO_RELIGION_SETTLEMENT_YIELDS",
        "TRAIT_MOD_TOT_MO_COASTAL_SETTLEMENT_YIELDS_DISTANT_LANDS", "TRAIT_MOD_TOT_MO_RELIGION_SETTLEMENT_YIELDS_DISTANT_LANDS"]
    }
  }
};
export const CIV_AGE_EXTRAS = {
  CIVILIZATION_BABYLON: { [MO]: ["TRAIT_MOD_BABYLON_QUARTER_TOURISM"] }, // Modern adds "+1 Tourism for every Quarter"
  CIVILIZATION_EGYPT: { [MO]: ["TRAIT_MOD_GIFTS_OF_OSIRIS_WONDER_TOURISM"] }, // Modern adds "+1 Tourism from Wonders"
  CIVILIZATION_ENGLAND: { [MO]: ["TRAIT_MOD_ENGLAND_GOLD_GDP"] }, // Modern adds "+2 GDP for Island and Distant Lands Settlements"
  CIVILIZATION_GORYEO: { [MO]: ["TRAIT_MOD_GORYEO_IMPROVEMENT_TOURISM"] }, // Modern adds "+1 Tourism from Unique Improvements"
  CIVILIZATION_HEIAN: { [MO]: ["TRAIT_MOD_APPEALING_VP"] }, // Modern adds Tourism on Breathtaking tiles
  // Modern's third bullet (Coastal Raids on Archaeology Sites) needs Iceland's raiders.
  CIVILIZATION_ICELAND: { [MO]: ["ICELAND_MO_MOD_COASTAL_RAID_ARTIFACTS"] },
  // The other cities' -1 Specialist Limit, the age's version of the Seowon bullet that goes with the Ihak civic.
  CIVILIZATION_JOSEON: { [AQ]: ["MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_DECREASE"], [EX]: ["MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_DECREASE"] },
  // The Mandarin's naval trade riders.
  CIVILIZATION_MING: {
    [AQ]: ["MANDARIN_MOD_NAVAL_TRADE_ATTACH_HOMELANDS", "MANDARIN_MOD_NAVAL_TRADE_ATTACH_DISTANT"],
    [MO]: ["MANDARIN_MOD_NAVAL_TRADE_ATTACH_HOMELANDS", "MANDARIN_MOD_NAVAL_TRADE_ATTACH_DISTANT"]
  },
  CIVILIZATION_MONGOLIA: { [MO]: ["TRAIT_MOD_TOT_MO_MONGOLIA_SETTLEMENT_CAP"] }, // Modern adds "+3 Settlement Limit in Advanced Starts"
  // Exploration's third bullet is "Trade Routes can cross Ocean without taking damage"; Modern attaches it too.
  CIVILIZATION_TONGA: { [EX]: ["MOD_TONGA_OCEAN_TRADE"], [MO]: ["MOD_TONGA_OCEAN_TRADE"] }
};

// The text of a piece in an age other than its civilization's own: the game keeps the ability's text per age
// (LOC_TRAIT_<CIV>_ABILITY_AQ/EX/MO_DESCRIPTION), with that age's numbers. The build matches each piece to the age's
// bullet by its words, the same position first; a match that moved or changed a lot has to be listed here with the
// age's bullet number (null: the age has no bullet for it, the piece keeps its own text), read off both texts.
export const CIV_AGE_TEXT_REVIEWED = {
  "CIVILIZATION_ENGLAND__B02|AGE_MODERN": 3, // Modern puts "+2 GDP for Island and Distant Lands Settlements" second
  "CIVILIZATION_GAUL__B02|AGE_MODERN": 2, // the Gold bullet is "+1 GDP per turn" in Modern
  "CIVILIZATION_HAN__B01|AGE_MODERN": 1, // "All Settlements gain a Population"
  "CIVILIZATION_ICELAND__B02|AGE_MODERN": 2, // "+4 Culture on Natural Wonder and Volcano Tiles"
  "CIVILIZATION_INCA__B01|AGE_MODERN": null, // Modern's one bullet is the yields; "Can work Mountain Terrain" isn't said
  "CIVILIZATION_INCA__B02|AGE_MODERN": 1,
  "CIVILIZATION_NEPAL__B01|AGE_ANTIQUITY": 2, // "Can work Mountain Terrain" comes first in Antiquity and Exploration
  "CIVILIZATION_NEPAL__B01|AGE_EXPLORATION": 2,
  "CIVILIZATION_OTTOMANS__B01|AGE_ANTIQUITY": 1, // a Codex on a Celebration or a conquered capital
  "CIVILIZATION_OTTOMANS__B01|AGE_EXPLORATION": 1, // a Relic
  "CIVILIZATION_PIRATE_REPUBLIC__B03|AGE_ANTIQUITY": 2, // the Buccaneer bullet is gone in Antiquity
  "CIVILIZATION_PIRATE_REPUBLIC__B04|AGE_ANTIQUITY": 3,
  "CIVILIZATION_QING__B03|AGE_ANTIQUITY": 2, // the GDP bullet is gone before Modern
  "CIVILIZATION_QING__B03|AGE_EXPLORATION": 2,
  "CIVILIZATION_SPAIN__B01|AGE_ANTIQUITY": 1 // Coastal Settlements and Settlements with an Altar
};
