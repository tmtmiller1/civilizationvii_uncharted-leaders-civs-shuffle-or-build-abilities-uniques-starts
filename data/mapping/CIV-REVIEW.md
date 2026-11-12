# Civilization mapping review list

Built 2026-11-12 by scripts/mapping/build-civ-mapping.mjs from scripts/mapping/civ-draft.mjs
against the game's data as each civilization's own age loads it (the Antiquity gameplay database in
tests/fixtures/source-db/ for Antiquity civilizations, the age modules read by scripts/mapping/civ-age-source.mjs
for Exploration and Modern ones). Each bullet of each civilization ability is matched to the modifiers that do it
by their effects, arguments and requirements. A "No effect:" row is a rule the text states that has no modifier
on the ability; a "Home only:" row (the wonder favor) has a modifier that only fires for the civilization's own
base trait. Both keep Movable 0 and stay with their civilization. Every row ships Reviewed = 1.

Merged pieces: CIVILIZATION_MAJAPAHIT__B03 -> CIVILIZATION_MAJAPAHIT__B02.

## CIVILIZATION_ABBASID (AGE_EXPLORATION, TRAIT_ABBASID_ABILITY, text LOC_TRAIT_ABBASID_ABILITY_DESCRIPTION)

- CIVILIZATION_ABBASID__B01 (value 3): Receive 30  Gold for each  Rural Population of the  City when you create a  Specialist. (Scales by Game Speed)
  - Why: 30 Gold per assigned worker when a specialist is created (EFFECT_PLAYER_GRANT_YIELD_ASSIGNED_WORKERS).
  - Modifiers: TRAIT_MOD_GOLD_SPECIALISTS
- CIVILIZATION_ABBASID__B02 (value 2): +20%  Production towards constructing  Buildings in  Cities with at least 5  Specialists.
  - Why: +20% building production in cities with MinWorkerPopulation 5.
  - Modifiers: MOD_TRAIT_ABBASID_PRODUCTION_SPECIALISTS
- CIVILIZATION_ABBASID__B03 (value 1): +30%  Production towards constructing the House of Wisdom.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_ABBASID
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_ABBASID. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_ALIM_QUARTER. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_AKSUM (AGE_ANTIQUITY, TRAIT_AKSUM_ABILITY, text LOC_TRAIT_AKSUM_ABILITY_DESCRIPTION)

- CIVILIZATION_AKSUM__B01 (value 3): +3  Gold on  Resources in Settlements adjacent to Coast.
  - Why: Warehouse Gold on resources in settlements whose center is adjacent to coast.
  - Modifiers: TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_RESOURCE
  - BiasTags: |COAST|
- CIVILIZATION_AKSUM__B02 (value 3): +1  Trade Route Limit with other Civilizations, and all Civilizations have +1  Trade Route Limit with you.
  - Why: +1 trade capacity for you and +1 for routes to you (RoutesToPlayer).
  - Modifiers: TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_CAP_SELF, TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_CAP_OTHERS
- CIVILIZATION_AKSUM__B03 (value 2):  Trade Routes to or from your Settlements have unlimited Range.
  - Why: UnlimitedRange=true on trade routes.
  - Modifiers: TRAIT_MOD_KINGDOM_OF_NATURAL_WEALTH_TRADE_ROUTE_UNLIMITED_RANGE
- CIVILIZATION_AKSUM__B04 (value 1): +30%  Production towards constructing the Great Stele.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_AKSUM
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_AMERICA (AGE_MODERN, TRAIT_AMERICA_ABILITY, text LOC_TRAIT_AMERICA_ABILITY_DESCRIPTION)

- CIVILIZATION_AMERICA__B01 (value 3): Gain 150  Gold every time you improve a  Resource.
  - Why: Gold per improved resource (EFFECT_ADJUST_PLAYER_YIELD_FOR_RESOURCE).
  - Modifiers: TRAIT_MOD_FRONTIER_EXPANSION_GOLD_ON_IMPROVED_RESOURCES
- CIVILIZATION_AMERICA__B02 (value 3): +1  Production on  Resources.
  - Why: +1 Production on resource plots.
  - Modifiers: TRAIT_MOD_FRONTIER_EXPANSION_PRODUCTION_ON_RESOURCES
- CIVILIZATION_AMERICA__B03 (value 1): +30%  Production towards constructing the Statue of Liberty.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_AMERICA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_AMERICA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_ASSYRIA (AGE_ANTIQUITY, TRAIT_ASSYRIA_ABILITY, text LOC_TRAIT_ASSYRIA_ABILITY_DESCRIPTION)

- CIVILIZATION_ASSYRIA__B01 (value 3): Gain a  Technology and a  Codex upon capturing a Settlement for the first time.
  - Why: A tech node and a writing great work on first-time settlement occupation.
  - Modifiers: MOD_CIV_FIRST_TIME_CONQUER, MOD_CIV_FIRST_TIME_CONQUER_CODEX
- CIVILIZATION_ASSYRIA__B02 (value 1):  Codices are not awarded from Technologies.
  - Why: Technologies award no codex: the codex rewards skip TRAIT_ASSYRIA.
  - Note: Rule: the codex rewards' exception follows whoever holds this piece (CONTRACTS 31).
- CIVILIZATION_ASSYRIA__B03 (value 1): +30% Production towards constructing Dur-Sharrukin.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_ASSYRIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_BABYLON (AGE_ANTIQUITY, TRAIT_BABYLON_ABILITY, text LOC_TRAIT_BABYLON_ABILITY_AQ_DESCRIPTION)

- CIVILIZATION_BABYLON__B01 (value 3): Every time you build a  Food Building, Culture Building, or  Wonder in a  City, receive an additional growth event.
  - Why: An extra growth event on Food buildings, Culture buildings and wonders in cities.
  - Modifiers: TRAIT_GROWTH_EVENT_FOOD_BUILDINGS, TRAIT_GROWTH_EVENT_CULTURE_BUILDINGS, TRAIT_GROWTH_EVENT_WONDERS
- CIVILIZATION_BABYLON__B02 (value 1): -2  Settlement Limit at the start of the Age.
  - Why: -2 settlement cap (a drawback, scored 1).
  - Modifiers: TRAIT_LESS_SETTLEMENT_CAP
- CIVILIZATION_BABYLON__B03 (value 1): +30%  Production towards constructing the Hanging Gardens.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_BABYLON
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_BUGANDA (AGE_MODERN, TRAIT_BUGANDA_ABILITY, text LOC_TRAIT_BUGANDA_ABILITY_DESCRIPTION)

- CIVILIZATION_BUGANDA__B01 (value 2): Land Units gain  Culture when  Pillaging Buildings or Improvements equal to the Yield or  Healing gained.
  - Why: ABILITY_RIVER_RAIDS on land units: Culture on pillaging.
  - Modifiers: TRAIT_MOD_RIVER_RAIDS_PILLAGING_ABILITY
- CIVILIZATION_BUGANDA__B02 (value 2): Land Military Units gain the Amphibious ability.
  - Why: ABILITY_AMPHIBIOUS on land units.
  - Modifiers: TRAIT_MOD_AMPHIBIOUS_ABILITY
- CIVILIZATION_BUGANDA__B03 (value 3): +6  Culture and  Food on Lakes, and +1   Tourism from  Districts and  Improvements on Lakes.
  - Why: Culture and Food on lake plots (REQSET_PLOT_IS_BUGANDA_LAKE) and the lakes Tourism tracker.
  - Modifiers: TRAIT_MOD_RIVER_RAIDS_LAKE_YIELDS, TRAIT_MOD_BUGANDA_LAKE_TOURISM
  - BiasTags: |LAKE| (from the text: LAKE)
- CIVILIZATION_BUGANDA__B04 (value 1): +30%  Production towards constructing Muzibu Azaala Mpanga.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_BUGANDA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_BUGANDA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_BULGARIA (AGE_EXPLORATION, TRAIT_BULGARIA_ABILITY, text LOC_TRAIT_BULGARIA_ABILITY_DESCRIPTION)

- CIVILIZATION_BULGARIA__B01 (value 3): Receive  Production in all  Cities when  Pillaging Improvements equal to 50% of the HP or Yields gained.
  - Why: 50% of improvement pillage yields as city Production (PLUNDER_PRODUCTION_CITY) for land units.
  - Modifiers: MOD_CIV_PRODUCTION_PILLAGE_IMPROVEMENT
- CIVILIZATION_BULGARIA__B02 (value 1): -3  Combat Strength for all Combat Units against  Fortified Districts.
  - Why: -3 strength when the opponent is a district (a drawback).
  - Modifiers: MOD_CIV_COMBAT_VS_FORTIFIED_DISTRICTS
- CIVILIZATION_BULGARIA__B03 (value 1): +30% Production towards constructing Rila Monastery.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_BULGARIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_BULGARIA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_CARTHAGE (AGE_ANTIQUITY, TRAIT_CARTHAGE_ABILITY, text LOC_TRAIT_CARTHAGE_ABILITY_DESCRIPTION)

- CIVILIZATION_CARTHAGE__B01 (value 2): Can only have 1  City.  Towns can purchase Water Buildings with any Town Focus, but cannot use Convert to City.
  - Why: City limit 1 and towns buying WATER buildings with any focus.
  - Modifiers: MOD_FORBID_CITIES_FROM_TOWNS, MOD_TOWN_WATER_BUILDING
- CIVILIZATION_CARTHAGE__B02 (value 4): Receive a second  Merchant or  Colonist each time you purchase or train one.
  - Why: An extra copy of each Colonist and Merchant; the hidden +1 Population for Colonist-founded settlements rides with them.
  - Modifiers: MOD_CIV_DOUBLE_COLONISTS, MOD_CIV_DOUBLE_MERCHANTS, TRAIT_MOD_COLONIST_POP (hidden)
  - Note: A card of its own on the build screen; in the random deal it goes with the Colonist (LShufBoundPieces, CONTRACTS 29).
- CIVILIZATION_CARTHAGE__B03 (value 1): +30% Production towards constructing Byrsa.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_CARTHAGE
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_CHOLA (AGE_EXPLORATION, TRAIT_CHOLA_ABILITY, text LOC_TRAIT_CHOLA_ABILITY_DESCRIPTION)

- CIVILIZATION_CHOLA__B01 (value 2): +1  Trade Route from the Improve Trade Relations Action.
  - Why: +1 trade route capacity from the diplomacy action (EFFECT_PLAYER_DIPLOMACY_CHANGE_TRADE_ROUTE_CAPACITY).
  - Modifiers: MOD_TOT_CHANGE_TRADE_ROUTE_CAPACITY
- CIVILIZATION_CHOLA__B02 (value 3): +3  Gold and +2  Influence for every active  Trade Route.
  - Why: +3 Gold and +2 Influence per trade route.
  - Modifiers: TRAIT_MOD_TOT_EX_TRADE_ROUTE_GOLD, TRAIT_MOD_TOT_EX_TRADE_ROUTE_INFLUENCE
- CIVILIZATION_CHOLA__B03 (value 1): +1  Movement for  Merchants.
  - Why: +1 movement for UNIT_CLASS_MAKE_TRADE_ROUTE units.
  - Modifiers: TRAIT_MOD_CHOLA_MERCHANT_MOVEMENT
- CIVILIZATION_CHOLA__B04 (value 2): +1  GDP per turn for imported  Resources assigned to  Cities.
  - Why: Activates the imported-resources economic victory tracker (VICTORY_TRACKER_CHOLA_IMPORTED_RESOURCES).
  - Modifiers: TRAIT_MOD_CHOLA_IMPORTED_RESOURCE_GDP
- CIVILIZATION_CHOLA__B05 (value 1): +30%  Production towards constructing the Brihadeeswarar Temple.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_CHOLA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_CHOLA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_DAI_VIET (AGE_EXPLORATION, TRAIT_DAI_VIET_ABILITY, text LOC_TRAIT_DAI_VIET_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_DAI_VIET__B01 (value 3): When you create a  Fortification Building or Wonder, gain 25  Culture for each  Urban Population in the Settlement.
  - Why: 25 Culture per urban population when a defense constructible completes.
  - Modifiers: MOD_CIV_WALL_EX_YIELD
- CIVILIZATION_DAI_VIET__B02 (value 3): +2  Culture and  Food on  Fortification Constructibles in  Tropical Terrain.
  - Why: +2 Culture and +2 Food on fortifications in Tropical plots.
  - Modifiers: MOD_DAI_VIET_EX_FORTIFICATION_CULTURE, MOD_DAI_VIET_EX_FORTIFICATION_FOOD
  - BiasTags: |BIOME_TROPICAL|
- CIVILIZATION_DAI_VIET__B03 (value 1): +30%  Production towards constructing the Thành Huế.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_DAI_VIET
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_DAI_VIET. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_VIET_KIEU_BIOME_YIELD. Culture per Tropical plot for cities founded by the Viet Kieu; it rides on the unique unit, no bullet describes it.

## CIVILIZATION_EGYPT (AGE_ANTIQUITY, TRAIT_EGYPT_ABILITY, text LOC_TRAIT_EGYPT_ABILITY_DESCRIPTION)

- CIVILIZATION_EGYPT__B01 (value 3): +2  Production on  Improvements and  Districts on Navigable Rivers.
  - Why: +2 Production on districts on navigable rivers.
  - Modifiers: TRAIT_MOD_GIFTS_OF_OSIRIS_NAVIGABLE_RIVER
  - BiasTags: |RIVER|TERRAIN_NAVIGABLE_RIVER| (from the text: TERRAIN_NAVIGABLE_RIVER)
- CIVILIZATION_EGYPT__B02 (value 2): Minor Rivers do not end Unit  Movement.
  - Why: Units ignore RIVER_MINOR as a movement obstacle.
  - Modifiers: TRAIT_MOD_GIFTS_OF_OSIRIS_UNITS_IGNORE_MINOR_RIVER
- CIVILIZATION_EGYPT__B03 (value 1): +30%  Production towards constructing the Pyramids.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_EGYPT
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_GRANT_TJAY. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_ENGLAND (AGE_EXPLORATION, TRAIT_ENGLAND_ABILITY, text LOC_TRAIT_ENGLAND_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_ENGLAND__B01 (value 4): +4  Culture on  Gold Buildings and +4  Gold on  Culture Buildings. This is doubled for Island and Distant Lands Settlements.
  - Why: Culture on Gold buildings and Gold on Culture buildings, with the doubled island / distant-lands rows.
  - Modifiers: MOD_CIV_EX_CULTURE_GOLD_BUILDINGS, MOD_CIV_EX_GOLD_CULTURE_BUILDINGS, MOD_CIV_EX_CULTURE_GOLD_BUILDINGS_DOUBLE, MOD_CIV_EX_GOLD_CULTURE_BUILDINGS_DOUBLE
  - BiasTags: |ISLAND|
- CIVILIZATION_ENGLAND__B02 (value 2): Towns can purchase  Gold Buildings with any  Town Focus in Islands.
  - Why: Island towns buy GOLD buildings with any focus.
  - Modifiers: MOD_TOWN_GOLD_BUILDING
  - BiasTags: |ISLAND|
- CIVILIZATION_ENGLAND__B03 (value 1): +30%  Production towards constructing Globe Theatre.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_ENGLAND
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_ENGLAND. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_FRENCH_EMPIRE (AGE_MODERN, TRAIT_FRENCH_EMPIRE_ABILITY, text LOC_TRAIT_FRENCH_EMPIRE_ABILITY_DESCRIPTION)

- CIVILIZATION_FRENCH_EMPIRE__B01 (value 3): You can select the  Celebration effects of any standard Modern Age  Government.
  - Why: Adds every Modern government's celebration choices (EFFECT_PLAYER_ADD_GOLDEN_AGE_CHOICE).
  - Modifiers: TRAIT_MOD_LIBERTE_GOVERNMENT_CHANGE
- CIVILIZATION_FRENCH_EMPIRE__B02 (value 1): +30%  Production towards constructing the Eiffel Tower.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_FRENCH_EMPIRE
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_FRENCH_EMPIRE. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_JACOBIN_CELEBRATION. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_JACOBIN_QUARTER. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_GAUL (AGE_ANTIQUITY, TRAIT_GAUL_ABILITY, text LOC_TRAIT_GAUL_ABILITY_AQ_DESCRIPTION)

- CIVILIZATION_GAUL__B01 (value 3): +2  Production in Settlements if there is not another of your Settlements’ City Centers within 6 tiles.
  - Why: +2 Production with no own city center within 6 tiles.
  - Modifiers: TRAIT_MOD_NOT_NEARBY_PRODUCTION
- CIVILIZATION_GAUL__B02 (value 2): +2  Gold in Settlements if its City Center is within 6 tiles of another Civilization’s border.
  - Why: +2 Gold with another civilization's city within 6 tiles.
  - Modifiers: TRAIT_MOD_NEARBY_GOLD
- CIVILIZATION_GAUL__B03 (value 2): Can purchase  Fortification Buildings with any  Town Focus.
  - Why: Towns buy FORTIFICATION buildings with any focus.
  - Modifiers: TRAIT_MOD_TOWN_FORTIFICATION_BUILDING
- CIVILIZATION_GAUL__B04 (value 1): +30%  Production towards constructing Vix.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_GAUL
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_DRUID_PURCHASE_CHARGE. A purchase charge for Druid-founded cities on high-appeal plots; no bullet describes it, and it only matters with Gaul's own Druid unit.

## CIVILIZATION_GORYEO (AGE_EXPLORATION, TRAIT_GORYEO_ABILITY, text LOC_TRAIT_GORYEO_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_GORYEO__B01 (value 3): +3  Culture for active  Endeavors you started or supported.
  - Why: Culture per endeavor you're involved in (the data says Amount 2 where the text says +3).
  - Modifiers: TRAIT_MOD_ENDEAVOR_CULTURE
  - Note: The data gives +2 Culture per endeavor; the text says +3.
- CIVILIZATION_GORYEO__B02 (value 2): +1  Culture on  Unique Improvements in  Towns.
  - Why: +1 Culture on UNIQUE_IMPROVEMENT constructibles in towns.
  - Modifiers: TRAIT_MOD_TOWN_UNIQUE_IMPROVEMENT_CULTURE
- CIVILIZATION_GORYEO__B03 (value 2): +1  Influence on  Unique Improvements in  Cities.
  - Why: +1 Influence on UNIQUE_IMPROVEMENT constructibles in cities.
  - Modifiers: TRAIT_MOD_CITY_UNIQUE_IMPROVEMENT_INFLUENCE
- CIVILIZATION_GORYEO__B04 (value 1): +30%  Production towards constructing the Buseoksa.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_GORYEO
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_GORYEO. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_GREAT_BRITAIN (AGE_MODERN, TRAIT_GREAT_BRITAIN_ABILITY, text LOC_TRAIT_GREAT_BRITAIN_ABILITY_MO_DESCRIPTION)

- CIVILIZATION_GREAT_BRITAIN__B01 (value 4): +25% Gold towards purchasing  Buildings and +25%  Production towards constructing  Buildings.
  - Why: +25% building purchase efficiency and +25% building production.
  - Modifiers: TRAIT_GB_MOD_BUILDING_CHEAPER_PURCHASE, TRAIT_GB_MOD_BUILDING_PRODUCTION
- CIVILIZATION_GREAT_BRITAIN__B02 (value 1): It costs 50% more to convert  Towns into  Cities.
  - Why: -50% town upgrade discount (a drawback).
  - Modifiers: TRAIT_MOD_CITY_PROJECT_MORE_EXPENSIVE
- CIVILIZATION_GREAT_BRITAIN__B03 (value 3): +3  Science on Active  Buildings adjacent to Coast.
  - Why: Science on coastal urban plots with one and two current-age buildings.
  - Modifiers: TRAIT_GB_MOD_COASTAL_BUILDING_SCIENCE_A, TRAIT_GB_MOD_COASTAL_BUILDING_SCIENCE_B
  - BiasTags: |COAST|
- CIVILIZATION_GREAT_BRITAIN__B04 (value 1): +30% Production towards constructing Battersea Power Station.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_GREAT_BRITAIN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_GREAT_BRITAIN. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_GREECE (AGE_ANTIQUITY, TRAIT_GREECE_ABILITY, text LOC_TRAIT_GREECE_ABILITY_DESCRIPTION)

- CIVILIZATION_GREECE__B01 (value 2): +3  Influence on the Palace.
  - Why: +3 Influence on BUILDING_PALACE.
  - Modifiers: TRAIT_MOD_DEMOKRATIA_INFLUENCE
- CIVILIZATION_GREECE__B02 (value 3): +2  Culture for active  Endeavors,  Sanctions, and  Diplomatic Projects you started or supported.
  - Why: Culture per endeavor, sanction and project you're involved in.
  - Modifiers: TRAIT_MOD_DEMOKRATIA_CULTURE_ENDEAVOR, TRAIT_MOD_DEMOKRATIA_CULTURE_SANCTION, TRAIT_MOD_DEMOKRATIA_CULTURE_PROJECT
- CIVILIZATION_GREECE__B03 (value 2): +3  Tourism for every  City-State you are Suzerain of.
  - Why: Activates VICTORY_TRACKER_GREECE_SUZERAIN, the tourism-per-suzerainty tracker.
  - Modifiers: TRAIT_MOD_DEMOKRATIA_CITY_STATE_TOURISM
- CIVILIZATION_GREECE__B04 (value 1): +30%  Production towards constructing the Oracle.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_GREECE
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_GRANT_LOGIOS_QUARTER. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_LOGIOS_SUZERAIN. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_HAN (AGE_ANTIQUITY, TRAIT_HAN_ABILITY, text LOC_TRAIT_HAN_ABILITY_DESCRIPTION)

- CIVILIZATION_HAN__B01 (value 3): The  Capital gains a  Population when it completes  Science Buildings.
  - Why: +1 Population in the capital on a SCIENCE building.
  - Modifiers: TRAIT_MOD_NINE_PROVINCES_POP_IN_CAPITAL_ON_SCIENCE_BUILDING
- CIVILIZATION_HAN__B02 (value 3): The  Capital and new  Towns gain an additional  Population with their first growth event.
  - Why: +1 Population for the original capital and new towns.
  - Modifiers: TRAIT_MOD_NINE_PROVINCES_CAPITAL, TRAIT_MOD_NINE_PROVINCES_TOWN
- CIVILIZATION_HAN__B03 (value 1): +30%  Production towards constructing Weiyang Palace.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_HAN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_GRANT_SHI_DAFU_SCIENCE. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_HAWAII (AGE_EXPLORATION, TRAIT_HAWAII_ABILITY, text LOC_TRAIT_HAWAII_ABILITY_DESCRIPTION)

- CIVILIZATION_HAWAII__B01 (value 3): Can work Ocean Terrain.
  - Why: Unlocks IMPROVEMENT_HAWAII_FISHING_BOAT, so Ocean plots can be worked.
  - Modifiers: TRAIT_MOD_HAWAII_IMPROVE_OCEAN
  - BiasTags: |BIOME_MARINE| (from the text: BIOME_MARINE)
- CIVILIZATION_HAWAII__B02 (value 3): +1  Happiness and +2  Culture on all Marine Terrain.
  - Why: The Hawaii warehouse yields on Coast and Ocean plots (Happiness, Culture, Food, Gold).
  - Modifiers: TRAIT_MOD_HAPPINESS_WAREHOUSE
  - BiasTags: |BIOME_MARINE| (from the text: BIOME_MARINE)
- CIVILIZATION_HAWAII__B03 (value 1): +30%  Production towards constructing Hale o Keawe.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_HAWAII
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_HAWAII. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_HEIAN (AGE_ANTIQUITY, TRAIT_HEIAN_ABILITY, text LOC_TRAIT_HEIAN_ABILITY_AQ_DESCRIPTION)

- CIVILIZATION_HEIAN__B01 (value 3): +2  Culture on  Improvements on Breathtaking tiles.
  - Why: +2 Culture on rural plots with breathtaking appeal.
  - Modifiers: TRAIT_MOD_APPEALING_CULTURE
- CIVILIZATION_HEIAN__B02 (value 1): +30%  Production towards constructing the Hoo-do.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_HEIAN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_GRANT_SHIJIN. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_SHIJIN_HAPPINESS. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_ICELAND (AGE_EXPLORATION, TRAIT_ICELAND_ABILITY, text LOC_TRAIT_ICELAND_ABILITY_DESCRIPTION)

- CIVILIZATION_ICELAND__B01 (value 1): +1  Sight for Naval Units.
  - Why: +1 sight for UNIT_CLASS_NAVAL.
  - Modifiers: ICELAND_MOD_NAVAL_SIGHT
- CIVILIZATION_ICELAND__B02 (value 3): Gain 500  Culture when you discover a  Natural Wonder in Distant Lands (On Standard Speed).
  - Why: Culture on finding a natural wonder, 500 in distant lands (DistantLandBonus).
  - Modifiers: ICELAND_MOD_NATURAL_WONDER_DISCOVERY
  - BiasTags: |NATURAL_WONDER| (from the text: NATURAL_WONDER)
- CIVILIZATION_ICELAND__B03 (value 2): Gain a  Relic every time you study a  Civic Mastery.
  - Why: A relic per civic tree mastery (EFFECT_ADJUST_PLAYER_RELIC_FOR_CIVIC_TREE_MASTERY).
  - Modifiers: ICELAND_MOD_MISSIONARY_RELIC_CIVIC_MASTERY
- CIVILIZATION_ICELAND__B04 (value 1): -50%  Production towards training  Missionaries, and  Missionaries cost 100% more  Gold to purchase.
  - Why: -50% production and -100% purchase efficiency for religious units (a drawback).
  - Modifiers: ICELAND_MOD_MISSIONARY_PRODUCTION, ICELAND_MOD_MISSIONARY_PURCHASE
- CIVILIZATION_ICELAND__B05 (value 1): +30% Production towards constructing Reykjaholt.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_ICELAND
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_ICELAND. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_SAGA_HERO_IMPROVEMENT. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_SAGA_HERO_NATURAL_WONDER. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_INCA (AGE_EXPLORATION, TRAIT_INCA_ABILITY, text LOC_TRAIT_INCA_ABILITY_DESCRIPTION)

- CIVILIZATION_INCA__B01 (value 3): Can work Mountain Terrain.
  - Why: Unlocks IMPROVEMENT_INCA_MOUNTAIN, so Mountain plots can be worked.
  - Modifiers: TRAIT_MOD_APUS_IMPROVE_MOUNTAINS
  - BiasTags: |TERRAIN_MOUNTAIN| (from the text: TERRAIN_MOUNTAIN)
- CIVILIZATION_INCA__B02 (value 3): +2  Food and +1  Production on Mountain Terrain.
  - Why: +2 Food and +1 Production on rural Mountain plots.
  - Modifiers: TRAIT_MOD_APUS_MOUNTAIN_FOOD, TRAIT_MOD_APUS_MOUNTAIN_PRODUCTION
  - BiasTags: |TERRAIN_MOUNTAIN|
- CIVILIZATION_INCA__B03 (value 1, not movable): Can generate Homelands  Treasure Convoys in  Cities with 3 Worked Mountains after completing the Qhapaq Ñan  Civic.
  - Why: Goes with the Qhapaq Ñan civic, whose own modifiers make the convoys.
  - Note: Goes with the Qhapaq Ñan civic, whose own modifiers make the convoys (CONTRACTS 31).
- CIVILIZATION_INCA__B04 (value 1): +30%  Production towards constructing Machu Pikchu.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_INCA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_INCA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_JOSEON (AGE_MODERN, TRAIT_JOSEON_ABILITY, text LOC_TRAIT_JOSEON_ABILITY_MO_DESCRIPTION)

- CIVILIZATION_JOSEON__B01 (value 2): +2  Specialist Limit in the  Capital.
  - Why: +2 worker cap in the capital.
  - Modifiers: MOD_JOSEON_CAPITAL_SPECIALIST_LIMIT_LARGE_INCREASE
- CIVILIZATION_JOSEON__B02 (value 1, not movable):  Cities other than the  Capital receive +1  Specialist Limit if they have a  Seowon, but if they don't have a Seowon they receive -1  Specialist Limit.
  - Why: +1 worker cap in cities with a Seowon quarter, -1 without; away from Joseon only the -1 can apply.
  - Modifiers: MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_SEOWON_INCREASE, MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_NO_SEOWON_DECREASE
  - Note: Goes with the Seowon: both modifiers are in LShufBoundModifiers and follow the quarter (CONTRACTS 23 R4).
- CIVILIZATION_JOSEON__B03 (value 2): Has an initial City Limit of 2.
  - Why: +2 city limit (the text's initial limit of 2).
  - Modifiers: MOD_JOSEON_CITY_LIMIT_LARGE_INCREASE
- CIVILIZATION_JOSEON__B04 (value 2):  Towns can purchase Tier 1  Culture and  Science Buildings with any   Town Focus.
  - Why: Towns buy JOSEON-tagged buildings with any focus.
  - Modifiers: MOD_TOWN_TIER1_BUILDINGS
- CIVILIZATION_JOSEON__B05 (value 1): +30% Production towards constructing Hwaseong.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_JOSEON
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_JOSEON. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_KHMER (AGE_ANTIQUITY, TRAIT_KHMER_ABILITY, text LOC_TRAIT_KHMER_ABILITY_DESCRIPTION)

- CIVILIZATION_KHMER__B01 (value 3): Districts on Rivers do not remove the natural yield of the tile.
  - Why: Natural yields kept under districts on minor and navigable rivers.
  - Modifiers: TRAIT_MOD_KSEKAM_CHAMNON_MINOR_RIVER, TRAIT_MOD_KSEKAM_CHAMNON_NAVIGABLE_RIVER
  - BiasTags: |TERRAIN_NAVIGABLE_RIVER|RIVER| (from the text: RIVER)
- CIVILIZATION_KHMER__B02 (value 3): +50%  Growth Rate in the  Capital, but -5  Happiness for every other  City.
  - Why: +50% capital growth with -5 Happiness in other cities.
  - Modifiers: TRAIT_MOD_KSEKAM_CHAMNON_CAPITAL_GROWTH, TRAIT_MOD_KSEKAM_CHAMNON_CITY_HAPPINESS_PENALTY
- CIVILIZATION_KHMER__B03 (value 1): +30%  Production towards constructing Angkor Wat.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_KHMER
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_MAJAPAHIT (AGE_EXPLORATION, TRAIT_MAJAPAHIT_ABILITY, text LOC_TRAIT_MAJAPAHIT_ABILITY_DESCRIPTION)

- CIVILIZATION_MAJAPAHIT__B01 (value 3):  Culture Buildings gain an adjacency for Coast.
  - Why: Activates the NegaraCultureBuildingCoastCulture adjacency.
  - Modifiers: TRAIT_MOD_NEGARA_CULTURE_BUILDING_ADJACENCY
  - BiasTags: |COAST| (from the text: COAST)
- CIVILIZATION_MAJAPAHIT__B02 (value 3): +1  Specialist Limit in  Districts on or adjacent to Coast.If you transition away from the Majapahit, the  Specialist Limit increase goes away.  Specialists ove
  - Why: +1 district worker cap on or next to coast.
  - Modifiers: TRAIT_MOD_NEGARA_SPECIALIST_CAP_INCREASE
  - BiasTags: |COAST|
  - Note: Bullet 3 merged in: one effect serves both.
- CIVILIZATION_MAJAPAHIT__B04 (value 1): +30%  Production towards constructing Borobudur.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MAJAPAHIT
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MAJAPAHIT. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_MAURYA (AGE_ANTIQUITY, TRAIT_MAURYA_ABILITY, text LOC_TRAIT_MAURYA_ABILITY_DESCRIPTION)

- CIVILIZATION_MAURYA__B01 (value 3): +2  Happiness on  Happiness,  Military, and  Science Buildings.
  - Why: +2 Happiness on HAPPINESS, MILITARY and SCIENCE buildings.
  - Modifiers: TRAIT_MOD_DHAMMA_THAMBHA_AQ_HAPPINESS_BUILDING_HAPPINESS, TRAIT_MOD_DHAMMA_THAMBHA_AQ_MILITARY_BUILDING_HAPPINESS, TRAIT_MOD_DHAMMA_THAMBHA_AQ_SCIENCE_BUILDING_HAPPINESS
- CIVILIZATION_MAURYA__B02 (value 2): Land Units are fully  Healed when you enter a  Celebration.
  - Why: Full healing for land units on entering a celebration.
  - Modifiers: TRAIT_MOD_DHAMMA_THAMBHA_CELEBRATION_HEAL
- CIVILIZATION_MAURYA__B03 (value 1): +30%  Production towards constructing Sanchi Stupa.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MAURYA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: TRAIT_MOD_NAGARIKA_ALTAR_PURCHASE. A free Altar purchase charge in newly settled towns; no bullet describes it.

## CIVILIZATION_MAYA (AGE_ANTIQUITY, TRAIT_MAYA_ABILITY, text LOC_TRAIT_MAYA_ABILITY_DESCRIPTION)

- CIVILIZATION_MAYA__B01 (value 3): After researching a  Technology, gain  Culture equal to 10% of its cost.
  - Why: Culture at 10% of a tech's cost on research.
  - Modifiers: TRAIT_MOD_SKIES_OF_ITZAMNA_CULTURE_FOR_TECH
- CIVILIZATION_MAYA__B02 (value 3): After studying a  Civic, gain  Science equal to 10% of its cost.
  - Why: Science at 10% of a civic's cost on study.
  - Modifiers: TRAIT_MOD_SKIES_OF_ITZAMNA_SCIENCE_FOR_CIVIC
- CIVILIZATION_MAYA__B03 (value 1): +30%  Production towards constructing Mundo Perdido.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MAYA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_MEIJI (AGE_MODERN, TRAIT_MEIJI_ABILITY, text LOC_TRAIT_MEIJI_ABILITY_DESCRIPTION)

- CIVILIZATION_MEIJI__B01 (value 3): When you Overbuild a  Building, gain  Science equal to 25% of the Building's  Production cost.
  - Why: Science worth 25% of the cost when a building is overbuilt.
  - Modifiers: TRAIT_MOD_GOISSHIN_SCIENCE_ON_OVERBUILD
- CIVILIZATION_MEIJI__B02 (value 1): +30%  Production towards constructing Dogo Onsen.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MEIJI
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_JUKOGYO_RESOURCE_CAP. +1 resource cap in cities with BUILDING_JUKOGYO; it rides on the unique building, no bullet describes it.
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MEIJI. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_MEXICO (AGE_MODERN, TRAIT_MEXICO_ABILITY, text LOC_TRAIT_MEXICO_ABILITY_DESCRIPTION)

- CIVILIZATION_MEXICO__B01 (value 3): Starts with a unique  Government, Revolución. This Government's passive effect is +6  Happiness in Cities for every Tradition slotted in the Government. It star
  - Why: Sets GOVERNMENT_REVOLUCION.
  - Modifiers: TRAIT_MOD_REVOLUCION_GOVERNMENT_UNIQUE
- CIVILIZATION_MEXICO__B02 (value 2): +100%  Tourism from  Celebrations.
  - Why: +100% on the celebrations Tourism tracker.
  - Modifiers: TRAIT_MOD_REVOLUCION_MO_CELEBRATION_TOURISM
- CIVILIZATION_MEXICO__B03 (value 1): +30%  Production towards constructing Palacio de Bellas Artes.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MEXICO
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MEXICO. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_REVOLUCIONARIO_CELEBRATION. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_REVOLUCIONARIO_QUARTER. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_MING (AGE_EXPLORATION, TRAIT_MING_ABILITY, text LOC_TRAIT_MING_ABILITY_DESCRIPTION)

- CIVILIZATION_MING__B01 (value 4): +50%  Science in the  Capital.
  - Why: +50% Science in the capital.
  - Modifiers: TRAIT_MOD_CAPITAL_EXTRA_SCIENCE
- CIVILIZATION_MING__B02 (value 1): -15  Science per turn for each  Social Policy, but not  Tradition, slotted in the  Government.
  - Why: -15 Science per slotted non-unique policy (CivUnique=true, Invert=true), a drawback.
  - Modifiers: TRAIT_MOD_LOSE_SCIENCE_PER_NON_UNIQUE_TRADITION
- CIVILIZATION_MING__B03 (value 3): +1  Tradition Slot.
  - Why: +1 TRADITION_CULTURE_SLOT.
  - Modifiers: TRAIT_MOD_TOT_MING_TRADITION_SLOT
- CIVILIZATION_MING__B04 (value 1): +30%  Production towards constructing the Forbidden City.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MING
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MANDARIN_MOD_NAVAL_TRADE_ATTACH_DISTANT. Sea trade route attachments (target Culture, treasure fleets); no bullet in the text describes them.
- Unplaced: MANDARIN_MOD_NAVAL_TRADE_ATTACH_HOMELANDS. Sea trade route attachments (target Culture, treasure fleets); no bullet in the text describes them.
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MING. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_MISSISSIPPIAN (AGE_ANTIQUITY, TRAIT_MISSISSIPPIAN_ABILITY, text LOC_TRAIT_MISSISSIPPIAN_ABILITY_DESCRIPTION)

- CIVILIZATION_MISSISSIPPIAN__B01 (value 3): All  Buildings receive a +1  Food Adjacency for  Resources.
  - Why: Activates the GooseSocietiesWildcardResourceFood adjacency.
  - Modifiers: TRAIT_MOD_GOOSE_SOCIETIES
- CIVILIZATION_MISSISSIPPIAN__B02 (value 2): +10%  Production towards constructing  Buildings.
  - Why: +10% building production.
  - Modifiers: TRAIT_MOD_GOOSE_SOCIETIES_BUILDING_PRODUCTION
- CIVILIZATION_MISSISSIPPIAN__B03 (value 1): +30%  Production towards constructing the Monks Mound.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MISSISSIPPIAN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_MONGOLIA (AGE_EXPLORATION, TRAIT_MONGOLIA_ABILITY, text LOC_TRAIT_MONGOLIA_ABILITY_DESCRIPTION)

- CIVILIZATION_MONGOLIA__B01 (value 3): When you capture an opposing Settlement gain the strongest Cavalry Unit you can currently train.
  - Why: A UNIT_CLASS_CAVALRY unit on capturing a city.
  - Modifiers: TRAIT_MOD_CONQUER_UNIT
- CIVILIZATION_MONGOLIA__B02 (value 1): -50%  Production towards training  Settlers.
  - Why: -50% Settler production (a drawback).
  - Modifiers: TRAIT_MOD_EXPENSIVE_SETTLER
- CIVILIZATION_MONGOLIA__B03 (value 1): +30%  Production towards constructing Erdene Zuu.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MONGOLIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MONGOLIA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_MUGHAL (AGE_MODERN, TRAIT_MUGHAL_ABILITY, text LOC_TRAIT_MUGHAL_ABILITY_DESCRIPTION)

- CIVILIZATION_MUGHAL__B01 (value 4): +100%  Gold yields.
  - Why: +100% Gold.
  - Modifiers: TRAIT_MOD_PARADISE_OF_NATIONS_GOLD
- CIVILIZATION_MUGHAL__B02 (value 1): -25% to all other yields except  Food.
  - Why: -25% to the other yields (a drawback).
  - Modifiers: TRAIT_MOD_PARADISE_OF_NATIONS_CITY_YIELD_PENALTY, TRAIT_MOD_PARADISE_OF_NATIONS_YIELD_PENALTY
- CIVILIZATION_MUGHAL__B03 (value 2): You can purchase  Wonders with  Gold, but they are 150% more expensive.
  - Why: Wonder purchase at -150% efficiency.
  - Modifiers: TRAIT_MOD_PARADISE_OF_NATIONS_WONDER_PURCHASE_ABILITY
- CIVILIZATION_MUGHAL__B04 (value 1): +30%  Production towards constructing the Red Fort.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_MUGHAL
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_MUGHAL. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_ZAMINDAR_POPULATION_BONUS. +1 Population for cities founded by the Zamindar; it rides on the unique unit, no bullet describes it.

## CIVILIZATION_NEPAL (AGE_MODERN, TRAIT_NEPAL_ABILITY, text LOC_TRAIT_NEPAL_ABILITY_MO_DESCRIPTION)

- CIVILIZATION_NEPAL__B01 (value 3): All  Warehouse Buildings apply to  Mountain Terrain, but they cost +1  Gold and Happiness Maintenance.
  - Why: Warehouse yields on mountains with the +1 Gold and Happiness maintenance.
  - Modifiers: MOD_NEPAL_MOUNTAIN_WAREHOUSES, MOD_EXPENSIVE_WAREHOUSE_BUILDINGS
  - BiasTags: |TERRAIN_MOUNTAIN| (from the text: TERRAIN_MOUNTAIN)
- CIVILIZATION_NEPAL__B02 (value 2): +1   Tourism from  Unique Improvements on Mountains.
  - Why: Activates the mountains Tourism tracker (VICTORY_TRACKER_NEPAL_MOUNTAINS).
  - Modifiers: TRAIT_MOD_NEPAL_MOUNTAIN_TOURISM
  - BiasTags: |TERRAIN_MOUNTAIN| (from the text: TERRAIN_MOUNTAIN)
- CIVILIZATION_NEPAL__B03 (value 1): +30%  Production towards constructing the Boudhanath.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_NEPAL
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_NEPAL. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_NORMAN (AGE_EXPLORATION, TRAIT_NORMAN_ABILITY, text LOC_TRAIT_NORMAN_ABILITY_DESCRIPTION)

- CIVILIZATION_NORMAN__B01 (value 3): +5  Combat Strength for Land Units and  Fortified Districts adjacent to Coast.
  - Why: Combat strength for land units and districts adjacent to coast.
  - Modifiers: TRAIT_MOD_ADJACENT_TO_COAST_COMBAT, TRAIT_MOD_NORMANNITAS_DISTRICT_ADJACENT_TO_COAST_COMBAT
  - BiasTags: |COAST|
- CIVILIZATION_NORMAN__B02 (value 2): +25  HP on  Fortified Districts.
  - Why: +25 district health with a fortification.
  - Modifiers: TRAIT_MOD_NORMANNITAS_WALL_HEALTH
- CIVILIZATION_NORMAN__B03 (value 1): +30%  Production towards constructing the White Tower.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_NORMAN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_NORMAN. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_SOKEMAN_WALLS. Free Medieval Walls in cities founded by the Sokeman; it rides on the unique unit, no bullet describes it.

## CIVILIZATION_OTTOMANS (AGE_MODERN, TRAIT_OTTOMANS_ABILITY, text LOC_TRAIT_OTTOMANS_ABILITY_MO_DESCRIPTION)

- CIVILIZATION_OTTOMANS__B01 (value 2): When any Leader Excavates an  Artifact in the Ottomans’ territory, they generate an additional  Artifact.
  - Why: +1 artifact when one is excavated in your territory.
  - Modifiers: MOD_CIV_OTTOMAN_ARTIFACTS
- CIVILIZATION_OTTOMANS__B02 (value 3): +3  Combat Strength for Infantry and Siege Units when attacking.
  - Why: Attaches the infantry and siege attack bonus.
  - Modifiers: MOD_CIV_OTTOMAN_COMBAT
- CIVILIZATION_OTTOMANS__B03 (value 1): +30% Production towards constructing Sultanahmet Camii.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_OTTOMANS
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_OTTOMANS. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_PERSIA (AGE_ANTIQUITY, TRAIT_PERSIA_ABILITY, text LOC_TRAIT_PERSIA_ABILITY_DESCRIPTION)

- CIVILIZATION_PERSIA__B01 (value 3): +3  Combat Strength for Infantry Units when attacking.
  - Why: ABILITY_HAMARANA_COUNCIL on infantry: +3 attacking.
  - Modifiers: TRAIT_MOD_HAMARANA_COUNCIL
- CIVILIZATION_PERSIA__B02 (value 2):  Army Commanders start with a free  Promotion.
  - Why: A free promotion for army commanders.
  - Modifiers: TRAIT_MOD_HAMARANA_COMMANDER_PROMOTION
- CIVILIZATION_PERSIA__B03 (value 1): +30%  Production towards constructing the Gate of All Nations.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_PERSIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_PIRATE_REPUBLIC (AGE_EXPLORATION, TRAIT_PIRATE_REPUBLIC_ABILITY, text LOC_TRAIT_PIRATE_REPUBLIC_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_PIRATE_REPUBLIC__B01 (value 2): Naval Units,  Treasure Convoys, and  Buccaneers can move into other Civilization's borders without being at  War or having Open Borders.
  - Why: Naval, fleet commander and treasure units enter foreign lands.
  - Modifiers: MOD_CIV_NAVAL_UNITS_FOREIGN_TERRITORY
- CIVILIZATION_PIRATE_REPUBLIC__B02 (value 2):  Buccaneers gain 1 charge to create a new Settlement after receiving their first  Promotion.
  - Why: A land-claim charge for fleet commanders with one promotion.
  - Modifiers: MOD_CIV_PIRATE_REPUBLIC_FLEET_COMMANDER_LAND_CLAIM_CHARGE
  - Note: A card of its own on the build screen; in the random deal it goes with the Buccaneer (LShufBoundPieces, CONTRACTS 29).
- CIVILIZATION_PIRATE_REPUBLIC__B03 (value 2):  Settlers cannot be trained or purchased, but you can capture other Civilizations'  Settlers.
  - Why: No settlers of your own; capture others'.
  - Modifiers: MOD_CIV_PIRATE_REPUBLIC_DISABLE_SETTLERS, MOD_CIV_PIRATE_REPUBLIC_CAPTURE_SETTLERS
  - Note: A card of its own on the build screen; in the random deal it goes with the Buccaneer and the settle charge (LShufBoundPieces, CONTRACTS 29).
- CIVILIZATION_PIRATE_REPUBLIC__B04 (value 2): +5  GDP from your Naval Units defeating other Units.
  - Why: +5 economic victory points per naval kill.
  - Modifiers: MOD_CIV_PIRATE_REPUBLIC_CAPTURE_NAVAL_GDP
- CIVILIZATION_PIRATE_REPUBLIC__B05 (value 1): +30% Production towards constructing Havana Harbor.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_PIRATE_REPUBLIC
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_PIRATE_REPUBLIC. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_PRUSSIA (AGE_MODERN, TRAIT_PRUSSIA_ABILITY, text LOC_TRAIT_PRUSSIA_ABILITY_DESCRIPTION)

- CIVILIZATION_PRUSSIA__B01 (value 3): +1  Combat Strength for Military Units for every  Unfriendly or  Hostile Relationship with another Leader.
  - Why: +1 combat strength per unfriendly or hostile relationship.
  - Modifiers: TRAIT_MOD_BLOOD_AND_IRON_COMBAT_STRENGTH
- CIVILIZATION_PRUSSIA__B02 (value 2): You may establish and retain  Trade Routes with Civilizations that you are at  War with.
  - Why: TradeDuringWar=true.
  - Modifiers: TRAIT_MOD_ZOLLVEREIN_TRADE_DURING_WAR
- CIVILIZATION_PRUSSIA__B03 (value 1): +30%  Production towards constructing Brandenburg Gate.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_PRUSSIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_PRUSSIA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_QAJAR (AGE_MODERN, TRAIT_QAJAR_ABILITY, text LOC_TRAIT_QAJAR_ABILITY_DESCRIPTION)

- CIVILIZATION_QAJAR__B01 (value 2): +50%  Influence toward supporting  Diplomatic Actions.
  - Why: +50% support response efficiency.
  - Modifiers: MOD_CIV_QAJAR_DIPLOMACY
- CIVILIZATION_QAJAR__B02 (value 3): +10  Food and  Production in the  Capital for every Settlement under the  Settlement Limit.
  - Why: Food and Production in the capital per settlement under the cap.
  - Modifiers: MOD_CIV_QAJAR_YIELDS_UNDER_SETTLEMENT_CAP_MO
- CIVILIZATION_QAJAR__B03 (value 1): +30% Production towards constructing Eram Garden.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_QAJAR
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_QAJAR. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_QING (AGE_MODERN, TRAIT_QING_ABILITY, text LOC_TRAIT_QING_ABILITY_DESCRIPTION)

- CIVILIZATION_QING__B01 (value 3): +3  Gold and +3  Culture for every imported  Resource, but -6  Science for every  Trade Route.
  - Why: Gold and Culture per imported resource with the Science loss per trade route.
  - Modifiers: TRAIT_MOD_SHENGSHI_GOLD_PER_IMPORTED_RESOURCE, TRAIT_MOD_SHENGSHI_CULTURE_PER_IMPORTED_RESOURCE, TRAIT_MOD_SHENGSHI_SCIENCE_MALUS_PER_TRADE_ROUTE
- CIVILIZATION_QING__B02 (value 2): +1  GDP per turn for imported  Resources assigned to  Cities.
  - Why: Activates the imported-resources economic victory tracker (VICTORY_TRACKER_QING_IMPORTED_RESOURCES).
  - Modifiers: TRAIT_MOD_QING_IMPORTED_RESOURCE_GDP
- CIVILIZATION_QING__B03 (value 2): +1  Combat Strength for Land Units for every other Civilization you have a  Trade Route with.
  - Why: ABILITY_SHENGSHI on land units: strength per trade partner.
  - Modifiers: TRAIT_MOD_SHENGSHI_COMBAT_STRENGTH
- CIVILIZATION_QING__B04 (value 1): +30%  Production towards constructing Chengde Mountain Resort.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_QING
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_QING. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_ROME (AGE_ANTIQUITY, TRAIT_ROME_ABILITY, text LOC_TRAIT_ROME_ABILITY_DESCRIPTION)

- CIVILIZATION_ROME__B01 (value 3): +1  Culture on  Districts in the  Capital and City Centers in  Towns.
  - Why: Culture on districts in the capital and town centers (attached modifiers).
  - Modifiers: TRAIT_MOD_TWELVE_TABLES_CAPITAL, TRAIT_MOD_TWELVE_TABLES_TOWNS
- CIVILIZATION_ROME__B02 (value 3): Gain a free Infantry Unit in new  Towns that you found.
  - Why: A free infantry unit in newly founded towns.
  - Modifiers: TRAIT_MOD_TWELVE_TABLES_TOWN_INFANTRY
- CIVILIZATION_ROME__B03 (value 1): +30%  Production towards constructing the Colosseum.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_ROME
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_RUSSIA (AGE_MODERN, TRAIT_RUSSIA_ABILITY, text LOC_TRAIT_RUSSIA_ABILITY_DESCRIPTION)

- CIVILIZATION_RUSSIA__B01 (value 3): +1  Culture on  Quarters in  Cities. +1  Science on  Quarters in  Cities in Tundra.
  - Why: Attaches Culture on quarters and Science on Tundra quarters in cities.
  - Modifiers: PROSVESHCHENIE_CITY_YIELDS
  - BiasTags: |BIOME_TUNDRA| (from the text: BIOME_TUNDRA)
- CIVILIZATION_RUSSIA__B02 (value 3): +1  Food on Farms in  Towns. +1  Production on Farms in  Towns in Tundra, count as  Warehouse Bonus.
  - Why: Warehouse Food on farms in towns, and Production in Tundra.
  - Modifiers: PROSVESHCHENIE_TOWN_FOOD, PROSVESHCHENIE_TOWN_PRODUCTION
  - BiasTags: |BIOME_TUNDRA|
- CIVILIZATION_RUSSIA__B03 (value 1): +30%  Production towards constructing the Hermitage.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_RUSSIA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_RUSSIA. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_SENGOKU (AGE_EXPLORATION, TRAIT_SENGOKU_ABILITY, text LOC_TRAIT_SENGOKU_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_SENGOKU__B01 (value 3): +1  Influence, +3 Culture and +3 Science  for every  Army Commander XP earned in Combat.
  - Why: Influence, Culture and Science per army commander XP (the data gives 1/2/2 where the text says 1/3/3).
  - Modifiers: SENGOKU_MOD_COMMANDER_XP_INFLUENCE_EXPLORATION, SENGOKU_MOD_COMMANDER_XP_CULTURE, SENGOKU_MOD_COMMANDER_XP_SCIENCE
  - Note: The data gives +2 Culture and +2 Science per XP; the text says +3.
- CIVILIZATION_SENGOKU__B02 (value 1):  Culture  Buildings no longer receive an Adjacency with  Mountain Terrain.
  - Why: Removes the mountain Culture adjacency (a drawback).
  - Modifiers: SENGOKU_MOD_REMOVE_CULTURE_ADJACENCY
- CIVILIZATION_SENGOKU__B03 (value 1):  Science  Buildings no longer receive an Adjacency with  Resources.
  - Why: Removes the resource Science adjacency (a drawback).
  - Modifiers: SENGOKU_MOD_REMOVE_SCIENCE_ADJACENCY
- CIVILIZATION_SENGOKU__B04 (value 1): +30% Production towards constructing Himeji Castle.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SENGOKU
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_SENGOKU. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_SHAWNEE (AGE_EXPLORATION, TRAIT_SHAWNEE_ABILITY, text LOC_TRAIT_SHAWNEE_ABILITY_EX_DESCRIPTION)

- CIVILIZATION_SHAWNEE__B01 (value 3): +2  Food on  Improvements and Districts on  Minor and Navigable River Terrain in Settlements adjacent to Navigable Rivers.
  - Why: Attaches the river Food in settlements adjacent to navigable rivers.
  - Modifiers: MOD_SHAWNEE_RIVER_FOOD
  - BiasTags: |TERRAIN_NAVIGABLE_RIVER|
- CIVILIZATION_SHAWNEE__B02 (value 2): +1  Resource Capacity in the  Capital per  City-State you are Suzerain of.
  - Why: +1 resource cap in the capital per suzerainty.
  - Modifiers: MOD_SHAWNEE_CITY_STATE_RESOURCES
- CIVILIZATION_SHAWNEE__B03 (value 1): +30% Production towards constructing Serpent Mound.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SHAWNEE
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_SHAWNEE. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_SIAM (AGE_MODERN, TRAIT_SIAM_ABILITY, text LOC_TRAIT_SIAM_ABILITY_DESCRIPTION)

- CIVILIZATION_SIAM__B01 (value 3): Gains a unique  Diplomatic Action Itsaraphab to immediately become Suzerain of a  City-State at a higher  Influence cost than  Befriend Independent.
  - Why: Grants DIPLOMACY_ACTION_BECOME_SUZERAIN.
  - Modifiers: TRAIT_MOD_ITSARAPHAB
- CIVILIZATION_SIAM__B02 (value 3): +3  Influence for every Civilization you are  Friendly or  Helpful with.
  - Why: Influence per friendly and helpful relationship.
  - Modifiers: TRAIT_MOD_ITSARAPHAB_MO_INFLUENCE_FRIENDLY, TRAIT_MOD_ITSARAPHAB_MO_INFLUENCE_HELPFUL
- CIVILIZATION_SIAM__B03 (value 2): +12  Tourism for every City-State you are Suzerain of.
  - Why: Activates the suzerain Tourism tracker (VICTORY_TRACKER_SIAM_SUZERAIN).
  - Modifiers: TRAIT_MOD_ITSARAPHAB_MO_CITY_STATE_TOURISM
- CIVILIZATION_SIAM__B04 (value 1): +30%  Production towards constructing Doi Suthep.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SIAM
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_SIAM. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_UPARAT. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_SILLA (AGE_ANTIQUITY, TRAIT_SILLA_ABILITY, text LOC_TRAIT_SILLA_ABILITY_AQ_DESCRIPTION)

- CIVILIZATION_SILLA__B01 (value 3): When you form an  Alliance, both Leaders receive a free  Trade Route from the other Leader's  Capital; these  Trade Routes do not go away when the  Alliance end
  - Why: Capital trade routes on alliance (AllianceCapitalRoutes).
  - Modifiers: MOD_SILLA_ALLIANCE_ROUTE
- CIVILIZATION_SILLA__B02 (value 2): +1  Influence for each Civilization you have at least 1  Trade Route with.
  - Why: +1 Influence per civilization traded with.
  - Modifiers: MOD_SILLA_INFLUENCE_PER_TRADE_PARTNER
- CIVILIZATION_SILLA__B03 (value 1): +30% Production towards constructing Emile Bell.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SILLA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).

## CIVILIZATION_SONGHAI (AGE_EXPLORATION, TRAIT_SONGHAI_ABILITY, text LOC_TRAIT_SONGHAI_ABILITY_DESCRIPTION)

- CIVILIZATION_SONGHAI__B01 (value 3): +2  Resource Capacity in  Cities on Navigable Rivers.
  - Why: +2 resource cap in cities whose center is on a navigable river.
  - Modifiers: TRAIT_MOD_NAVIGABLE_RIVER_RESOURCE_CAP
  - BiasTags: |TERRAIN_NAVIGABLE_RIVER|
- CIVILIZATION_SONGHAI__B02 (value 3): +1  Production in  Cities on Navigable Rivers for every  Resource assigned to them.
  - Why: Production per assigned resource in navigable-river cities.
  - Modifiers: TRAIT_MOD_RESOURCE_PRODUCTION
  - BiasTags: |TERRAIN_NAVIGABLE_RIVER|
- CIVILIZATION_SONGHAI__B03 (value 1, not movable): Can generate Homelands  Treasure Convoys on Navigable Rivers after completing the Kanta  Civic.
  - Why: Goes with the Kanta civic, whose own modifiers make the convoys.
  - Note: Goes with the Kanta civic, whose own modifiers make the convoys (CONTRACTS 31).
- CIVILIZATION_SONGHAI__B04 (value 1): +30%  Production towards constructing the Tomb of Askia.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SONGHAI
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_SONGHAI. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.

## CIVILIZATION_SPAIN (AGE_EXPLORATION, TRAIT_SPAIN_ABILITY, text LOC_TRAIT_SPAIN_ABILITY_DESCRIPTION)

- CIVILIZATION_SPAIN__B01 (value 3): +2  Food, +2  Gold and +2  Production in Settlements adjacent to Coast and in Settlements following your own  Religion, or +4 if it is both. Doubled in Settleme
  - Why: Food, Gold and Production in coastal settlements and in ones following your religion, doubled in distant lands.
  - Modifiers: TRAIT_MOD_COASTAL_SETTLEMENT_YIELDS, TRAIT_MOD_COASTAL_SETTLEMENT_YIELDS_DISTANT_LANDS, TRAIT_MOD_RELIGION_SETTLEMENT_YIELDS, TRAIT_MOD_RELIGION_SETTLEMENT_YIELDS_DISTANT_LANDS
  - BiasTags: |COAST|
- CIVILIZATION_SPAIN__B02 (value 2): +15%  Gold towards converting a  Town to a  City, or +30%  Gold in Settlements in Distant Lands.
  - Why: +15% / +30% (distant lands) on the town-to-city project.
  - Modifiers: MOD_TRAIT_SPAIN_ABILITY_TOWN_CONVERSION, MOD_TRAIT_SPAIN_ABILITY_TOWN_CONVERSION_DISTANT
- CIVILIZATION_SPAIN__B03 (value 1): +30%  Production towards constructing El Escorial.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_SPAIN
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_OCEAN_CONQUISTADOR. Deep-water embarkation for the Conquistador; it rides on the unique unit, no bullet describes it.
- Unplaced: MOD_REVEAL_CIV_CULTURE_TREE_SPAIN. Reveals the civilization's own civics tree; it travels with the civics, not with an ability bullet.
- Unplaced: TRAIT_MOD_GRANT_CONQUISTADOR_DISTANT_LANDS. Grants the civilization's great person (1.5.1); no bullet describes it.
- Unplaced: TRAIT_MOD_GRANT_CONQUISTADOR_QUARTER. Grants the civilization's great person (1.5.1); no bullet describes it.

## CIVILIZATION_TONGA (AGE_ANTIQUITY, TRAIT_TONGA_ABILITY, text LOC_TRAIT_TONGA_ABILITY_DESCRIPTION)

- CIVILIZATION_TONGA__B01 (value 2): +1 Influence on the Palace and City Halls in Settlements adjacent to Coast.
  - Why: +1 Influence on the Palace and City Halls adjacent to coast.
  - Modifiers: MOD_TONGA_PALACE_CITY_HALL_INFLUENCE
  - BiasTags: |TERRAIN_COAST|COAST| (from the text: COAST)
- CIVILIZATION_TONGA__B02 (value 3): Receive a free  Trade Route from a new  City-State when you become their Suzerain.
  - Why: Suzerain capital routes (EFFECT_ADJUST_PLAYER_SUZERAIN_CAPITAL_ROUTES).
  - Modifiers: MOD_TONGA_CS_TRADE
- CIVILIZATION_TONGA__B03 (value 1): Cannot use the  City-State - Incorporate or in Distant Lands the Levy Unit Action.
  - Why: Forbids city-state incorporation (a drawback).
  - Modifiers: MOD_TONGA_FORBID_INCOPERATE
- CIVILIZATION_TONGA__B04 (value 1): +30% Production towards constructing Ha'amonga 'a Maui.
  - Why: +30% favored wonder production.
  - Modifiers: MOD_CIV_WONDER_PRODUCTION_TONGA
  - Note: Wonder: dealt as +30% towards this civilization's favored wonder, named (CONTRACTS 31).
- Unplaced: MOD_TONGA_MEET_DISTANT_LAND_CIVS. Meeting distant-lands civilizations and safe deep-water trade units; no bullet describes them.
- Unplaced: MOD_TONGA_OCEAN_TRADE. Meeting distant-lands civilizations and safe deep-water trade units; no bullet describes them.
