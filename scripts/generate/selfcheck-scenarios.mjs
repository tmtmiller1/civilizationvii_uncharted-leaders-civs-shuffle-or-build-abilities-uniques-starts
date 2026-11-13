// The game configs the self-check runs: every mode at several seeds, the switches, keep and left-out lists, the
// modded boxes, and the split modes again with the mapping marked reviewed so the piece deal itself runs.
import { A_MODE, B_MODE, DEALING, MODE, ONOFF, PERSONA, PRESET_PERSONA, T_MODE } from "../../shared/lshuf-constants.js";

const ALL_MODES = Object.values(MODE);

// A preset writes its AI agendas value too (CONTRACTS 33), the way the setup screen writes it.
function cfg(seed, extra = {}) {
  const persona = PRESET_PERSONA[extra.LShufMode];
  const agendas = persona && !extra.LShufPersonality ? { LShufPersonality: persona } : {};
  return { LShufSeed: String(seed), ...agendas, ...extra };
}

// Custom combinations of the three parts (CONTRACTS 15): Leader shuffle reads Custom, the deal follows the parts.
const CUSTOM = [
  ["whole abilities, paired attributes, rolled terrain", A_MODE.Whole, T_MODE.Paired, B_MODE.Rolled],
  ["split abilities, paired attributes, paired terrain", A_MODE.Split, T_MODE.Paired, B_MODE.Paired],
  ["whole abilities, normal attributes, matched terrain", A_MODE.Whole, T_MODE.Normal, B_MODE.Matched],
  ["normal abilities, random attributes, paired terrain (falls back to rolled)", A_MODE.Normal, T_MODE.Random, B_MODE.Paired],
  ["split abilities, attributes off, normal terrain", A_MODE.Split, ONOFF.Off, B_MODE.Normal]
];

export function scenarios() {
  const out = [];
  CUSTOM.forEach(([name, a, t, b], i) => {
    out.push({ name: `custom: ${name}`, reviewed: a === A_MODE.Split,
      config: cfg(40 + i, { LShufMode: "LSHUF_MODE_CUSTOM", LShufAbilities: a, LShufAttributes: t, LShufBiases: b }) });
  });
  for (const mode of ALL_MODES) {
    for (const seed of [1, 17, 256]) out.push({ name: `${mode} seed ${seed}`, config: cfg(seed, { LShufMode: mode }) });
  }
  for (const mode of [MODE.SplitMatched, MODE.SplitRandom]) {
    for (const seed of [2, 99, 200]) {
      out.push({ name: `${mode} reviewed seed ${seed}`, reviewed: true, config: cfg(seed, { LShufMode: mode }) });
    }
    out.push({
      name: `${mode} reviewed pure chance seed 5`,
      reviewed: true,
      config: cfg(5, { LShufMode: mode, LShufDealing: DEALING.Chance })
    });
  }
  for (const persona of [PERSONA.Stays, PERSONA.Redealt]) {
    for (const mode of [MODE.SwapAbilities, MODE.SwapLeaders, MODE.SplitMatched]) {
      out.push({
        name: `${mode} ${persona} seed 33`,
        reviewed: mode === MODE.SplitMatched,
        config: cfg(33, { LShufMode: mode, LShufPersonality: persona })
      });
    }
  }
  const off = { LShufAbilities: ONOFF.Off, LShufAttributes: ONOFF.Off, LShufBiases: ONOFF.Off };
  out.push({ name: "NONE all three Off", config: cfg(8, off) });
  out.push({ name: "SWAP_LEADERS all three Off, persona re-dealt", config: cfg(8, { ...off, LShufMode: MODE.SwapLeaders, LShufPersonality: PERSONA.Redealt }) });
  out.push({ name: "SWAP_ABILITIES abilities Off", config: cfg(9, { LShufMode: MODE.SwapAbilities, LShufAbilities: ONOFF.Off }) });
  out.push({ name: "SPLIT_MATCHED attributes Off reviewed", reviewed: true, config: cfg(10, { LShufMode: MODE.SplitMatched, LShufAttributes: ONOFF.Off }) });
  out.push({ name: "SPLIT_RANDOM biases Off reviewed", reviewed: true, config: cfg(11, { LShufMode: MODE.SplitRandom, LShufBiases: ONOFF.Off }) });
  out.push({
    name: "SWAP_LEADERS keep + left out + not in game",
    config: cfg(12, {
      LShufMode: MODE.SwapLeaders,
      LShufKeep_LEADER_AMINA: "1",
      LShufKeep_LEADER_PACHACUTI: "0",
      LShufExcludedLeaders: ["|LEADER_XERXES|", "|LEADER_IBN_BATTUTA|"],
      LShufNotInGame: ["|LEADER_YI_SUN_SIN|"]
    })
  });
  const modded = {
    LShufModdedAbilities: "1",
    LShufModdedAttributes: "1",
    LShufModdedBiases: "1",
    LShufModOK_LEADER_Nearl: "1",
    LShufModOK_LEADER_Bocchi: "1"
  };
  out.push({ name: "SPLIT_MATCHED modded on reviewed", reviewed: true, config: cfg(13, { LShufMode: MODE.SplitMatched, ...modded }) });
  out.push({ name: "SWAP_ABILITIES modded on", config: cfg(14, { LShufMode: MODE.SwapAbilities, ...modded }) });
  out.push({
    name: "SPLIT_RANDOM modded attributes only reviewed",
    reviewed: true,
    config: cfg(15, { LShufMode: MODE.SplitRandom, LShufModdedAttributes: "1", LShufModOK_LEADER_Nearl: "1" })
  });
  out.push({
    name: "SWAP_ABILITIES too few (all but one left out)",
    config: cfg(16, {
      LShufMode: MODE.SwapAbilities,
      LShufNotInGame: ["|LEADER_ADA_LOVELACE|", "|LEADER_ALEXANDER|"].concat(
        ["AMINA", "ASHOKA", "ASHOKA_ALT", "AUGUSTUS", "BENJAMIN_FRANKLIN", "BOLIVAR", "CATHERINE", "CHARLEMAGNE", "CONFUCIUS",
          "EDWARD_TEACH", "ELIZABETH", "FRIEDRICH", "FRIEDRICH_ALT", "GENGHIS_KHAN", "GILGAMESH", "HARRIET_TUBMAN",
          "HATSHEPSUT", "HIMIKO", "HIMIKO_ALT", "IBN_BATTUTA", "ISABELLA", "JOSE_RIZAL", "LAFAYETTE", "LAKSHMIBAI",
          "MACHIAVELLI", "NAPOLEON", "NAPOLEON_ALT", "PACHACUTI", "SAYYIDA_AL_HURRA", "TECUMSEH", "TOYOTOMI_HIDEYOSHI",
          "TRUNG_TRAC", "WASHINGTON", "XERXES", "XERXES_ALT"].map((n) => `|LEADER_${n}|`)
      )
    })
  });
  out.push({ name: "no seed row (defaults to 1), SPLIT_RANDOM", config: { LShufMode: MODE.SplitRandom } });
  // Build your own leader (CONTRACTS 13).
  const built = (ids) => ids.map((id) => `|${id}|`);
  const amina = { LShufBuilder: ["|LEADER_AMINA|"], LShufBuilderCiv: ["|CIVILIZATION_ROME|"] };
  const hand = built(["LEADER_PACHACUTI__WHOLE", "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "ATTR_TRAIT_LEADER_ATTRIBUTE_MILITARISTIC",
    "PERSONA_LEADER_XERXES", "BIAS_LEADER_PACHACUTI", "CIVBIAS_CIVILIZATION_EGYPT"]);
  for (const mode of ALL_MODES) {
    out.push({ name: `build ${mode} seed 21`, config: cfg(21, { LShufMode: mode, ...amina, LShufBuilt: hand }) });
  }
  out.push({
    name: "build SPLIT_MATCHED reviewed bullets seed 22",
    reviewed: true,
    config: cfg(22, { LShufMode: MODE.SplitMatched, ...amina, LShufBuilt: built(["LEADER_PACHACUTI__B01", "LEADER_XERXES__B02",
      "LEADER_AMINA__B01", "ATTR_TRAIT_LEADER_ATTRIBUTE_ECONOMIC"]) })
  });
  out.push({
    name: "build SWAP_LEADERS own whole, no civ, seed 23",
    config: cfg(23, { LShufMode: MODE.SwapLeaders, LShufBuilder: ["|LEADER_AMINA|"], LShufBuilt: built(["LEADER_AMINA__WHOLE", "BIAS_LEADER_AMINA"]) })
  });
  // Builder slots: the host and two AI leaders; Pachacuti's whole is ticked by slots 1 and 2 and goes to slot 1.
  const ai2 = { LShufBuilder2: ["|LEADER_XERXES|"], LShufBuilderCiv2: ["|CIVILIZATION_PERSIA|"],
    LShufBuilt2: built(["LEADER_PACHACUTI__WHOLE", "LEADER_AMINA__WHOLE", "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "BIAS_LEADER_AMINA"]) };
  const ai3 = { LShufBuilder3: ["|LEADER_HATSHEPSUT|"],
    LShufBuilt3: built(["LEADER_HATSHEPSUT__B01", "LEADER_CONFUCIUS__B02", "ATTR_TRAIT_LEADER_ATTRIBUTE_ECONOMIC", "PERSONA_LEADER_AMINA"]) };
  for (const mode of ALL_MODES) {
    out.push({ name: `build three slots ${mode} seed 25`, config: cfg(25, { LShufMode: mode, ...amina, LShufBuilt: hand, ...ai2, ...ai3 }) });
  }
  // You on your own (CONTRACTS 33): the host's cards as copies over the AI players' deal, on every preset.
  for (const mode of ALL_MODES) {
    out.push({ name: `own mode ${mode} seed 27`, config: cfg(27, { LShufMode: mode, LShufHumanFollows: "0", ...amina, LShufBuilt: hand }) });
  }
  out.push({
    name: "build slot 2 only (host not building), SPLIT_RANDOM seed 26",
    config: cfg(26, { LShufMode: MODE.SplitRandom, ...ai2 })
  });
  out.push({
    name: "build SWAP_ABILITIES persona re-dealt + builder kept (not in game reason), seed 24",
    config: cfg(24, { LShufMode: MODE.SwapAbilities, LShufPersonality: PERSONA.Redealt, LShufKeep_LEADER_AMINA: "1", ...amina, LShufBuilt: hand })
  });
  // Civilizations shuffle too (CONTRACTS 16): each value of the two rows, with and without the host's civ build.
  const civHand = built(["CIVABIL_CIVILIZATION_GREECE", "LEADER_PACHACUTI__WHOLE"]);
  const civValues = [
    ["LSHUF_CA_SWAPPED", "LSHUF_CU_NORMAL"], ["LSHUF_CA_SWAPPED", "LSHUF_CU_PAIRED"], ["LSHUF_CA_NORMAL", "LSHUF_CU_SHUFFLED"],
    ["LSHUF_CA_SWAPPED", "LSHUF_CU_SHUFFLED"], ["LSHUF_OFF", "LSHUF_OFF"], ["LSHUF_CA_NORMAL", "LSHUF_CU_PAIRED"]
  ];
  for (const mode of [MODE.SwapAbilities, MODE.SplitMatched]) {
    for (const [ca, cu] of civValues) {
      out.push({ name: `civ shuffle ${mode} ${ca} ${cu} seed 31`, config: cfg(31, { LShufMode: mode, LShufCivAbilities: ca, LShufCivUniques: cu }) });
    }
    out.push({
      name: `civ shuffle ${mode} swapped+paired with a civ build seed 32`,
      config: cfg(32, { LShufMode: mode, LShufCivAbilities: "LSHUF_CA_SWAPPED", LShufCivUniques: "LSHUF_CU_PAIRED", ...amina, LShufBuilt: civHand })
    });
  }
  out.push({ name: "civ shuffle on Normal parts (custom) swapped+shuffled seed 33",
    config: cfg(33, { LShufMode: MODE.None, LShufCivAbilities: "LSHUF_CA_SWAPPED", LShufCivUniques: "LSHUF_CU_SHUFFLED" }) });
  return out;
}
