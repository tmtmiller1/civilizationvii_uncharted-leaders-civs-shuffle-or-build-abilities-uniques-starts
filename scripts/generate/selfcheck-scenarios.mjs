// The game configs the self-check runs: every mode at several seeds, the switches, keep and left-out lists, the
// modded boxes, and the split modes again with the mapping marked reviewed so the piece deal itself runs.
import { DEALING, MODE, ONOFF, PERSONA } from "../../shared/lshuf-constants.js";

const ALL_MODES = Object.values(MODE);

function cfg(seed, extra = {}) {
  return { LShufSeed: String(seed), ...extra };
}

export function scenarios() {
  const out = [];
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
  return out;
}
