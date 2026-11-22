// The line under each dropdown in the mod's section and on the build pages (CONTRACTS 34): what the current pick
// does, in the player's words. One text key per row and value; the AI players' rows and your own rows each have
// their own wording. Pure: no game globals, so the tests read it directly.

import { HUMAN_SAME, PARAM } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";

// The rows that carry a line, and the key prefix each uses: LOC_LSHUF_LINE_<prefix>_<value without LSHUF_>.
export const LINE_ROWS = {
  [PARAM.Mode]: "AI",
  [PARAM.CivMode]: "AI",
  [PARAM.HumanMode]: "YOU",
  [PARAM.HumanCivMode]: "YOU",
  [PARAM.Personality]: "PERSONALITY",
  [PARAM.Reveal]: "REVEAL"
};

// The values each row's line covers, so the tests can check every key exists.
export const LINE_VALUES = {
  [PARAM.Mode]: ["LSHUF_MODE_NONE", "LSHUF_MODE_AGENDAS", "LSHUF_MODE_AGENDAS_ATTRIBUTES", "LSHUF_MODE_SWAP_LEADERS",
    "LSHUF_MODE_SWAP_ABILITIES", "LSHUF_MODE_SPLIT_MATCHED", "LSHUF_MODE_SPLIT_RANDOM", "LSHUF_MODE_CUSTOM"],
  [PARAM.CivMode]: ["LSHUF_CM_NORMAL", "LSHUF_CM_WHOLE", "LSHUF_CM_PARTIAL", "LSHUF_CM_SPLIT", "LSHUF_CM_CUSTOM"],
  [PARAM.HumanMode]: [HUMAN_SAME.leader, "LSHUF_MODE_NONE", "LSHUF_MODE_AGENDAS_ATTRIBUTES", "LSHUF_MODE_SWAP_LEADERS",
    "LSHUF_MODE_SWAP_ABILITIES", "LSHUF_MODE_SPLIT_MATCHED", "LSHUF_MODE_SPLIT_RANDOM"],
  [PARAM.HumanCivMode]: [HUMAN_SAME.civ, "LSHUF_CM_NORMAL", "LSHUF_CM_WHOLE", "LSHUF_CM_PARTIAL", "LSHUF_CM_SPLIT"],
  [PARAM.Personality]: ["LSHUF_PERSONA_STAYS", "LSHUF_PERSONA_FOLLOWS", "LSHUF_PERSONA_REDEALT"],
  [PARAM.Reveal]: ["LSHUF_REVEAL_START", "LSHUF_REVEAL_MET"]
};

// The text key of a row's line for a value, or null when the row has none.
export function lineKey(paramId, value) {
  const prefix = LINE_ROWS[paramId];
  if (!prefix || value == null || value === "") return null;
  return `LOC_LSHUF_LINE_${prefix}_${String(value).replace(/^LSHUF_/, "")}`;
}

// Your civilization's row also carries the build pages' pointer under its line.
export const BUILD_HINT_KEY = "LOC_LSHUF_LINE_YOU_BUILD";
