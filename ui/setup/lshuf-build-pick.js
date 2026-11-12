// Your own leader and civilization, picked right in the build window instead of going back to the game's list. It
// writes the same player setting the game's leader and civ lists write (PlayerLeader, PlayerCivilization), so those
// screens show the same pick, and offers only what the game's list lets you choose (owned, unlocked).
import { B_MODE, ONOFF, PARAM } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { paramValue } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";
import { PLAIN_RANDOM } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { el } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import { dropdown } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-parts.js";
import { pickerItems } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-layout.js";

const log = (msg) => console.warn(`[lshuf-build] ${msg}`);

function localId() {
  try {
    return GameContext.localPlayerID;
  } catch (_) {
    return -1;
  }
}

function nameOf(handle) {
  try {
    const key = typeof handle === "string" ? handle : GameSetup.resolveString(handle);
    return key ? Locale.compose(key) : "";
  } catch (_) {
    return "";
  }
}

// The slot's valid picks (owned, unlocked), Random left out: [{ value, label }].
function validChoices(values) {
  const valid = typeof GameSetupDomainValueInvalidReason === "object" ? GameSetupDomainValueInvalidReason.Valid : 0;
  const out = [];
  for (const pv of values) {
    const value = pv && pv.value != null ? String(pv.value) : "";
    if (!value || value === PLAIN_RANDOM || pv.invalidReason !== valid) continue;
    out.push({ value, label: nameOf(pv.name) || value });
  }
  return out;
}

// The dropdown items for a player's leader or civilization and the index of the current pick (pickerItems). opts:
// playerId (the local player when left out), allowRandom (Random heads the list as a pick; without it the list has
// no Random and reads Select until a pick is made).
export function hostChoices(paramName, opts = {}) {
  try {
    const p = GameSetup.findPlayerParameter(opts.playerId == null ? localId() : opts.playerId, paramName);
    if (!p || !p.domain) return { items: [], selected: 0 };
    const current = p.value && p.value.value != null ? String(p.value.value) : PLAIN_RANDOM;
    return pickerItems(validChoices(p.domain.possibleValues || []), current, {
      allowRandom: !!opts.allowRandom, randomValue: PLAIN_RANDOM,
      randomLabel: Locale.compose("LOC_LSHUF_BUILD_RANDOM"), selectLabel: Locale.compose("LOC_LSHUF_BUILD_SELECT")
    });
  } catch (e) {
    log(`choices for ${paramName} failed: ${e}`);
    return { items: [], selected: 0 };
  }
}

// Whether the start terrain part deals, which a civ start terrain card needs to count (the deal's B axis).
export function biasesLive() {
  const v = paramValue(PARAM.Biases) || B_MODE.Normal;
  return v !== B_MODE.Normal && v !== ONOFF.Off;
}

function setHost(paramName, value, playerId) {
  try {
    const id = playerId == null ? localId() : playerId;
    let r = GameSetup.setPlayerParameterValue(id, paramName, value);
    if (r === 5) r = GameSetup.setPlayerParameterValue(id, paramName, value);
    return r;
  } catch (e) {
    log(`setPlayerParameterValue(${paramName}) failed: ${e}`);
    return -1;
  }
}

// A labelled dropdown for a player's leader ("leader") or civilization ("civ"); onChange runs after a pick lands.
// With no opts it's the host's own, without Random (your build pages). opts.playerId names another player, and
// opts.allowRandom puts Random at the head of the list as a pick that writes RANDOM back (the AI players window).
export function hostPicker(scope, onChange, opts = {}) {
  const paramName = scope === "civ" ? "PlayerCivilization" : "PlayerLeader";
  const { items, selected } = hostChoices(paramName, opts);
  const box = el("div", `lshuf-build__pick lshuf-pick--${scope === "civ" ? "civ" : "leader"} flex flex-row items-center mt-2`);
  if (items.filter((i) => i.value && i.value !== PLAIN_RANDOM).length < 1) return box;
  const label = el("div", "font-body text-sm text-accent-2 mr-2");
  label.textContent = Locale.compose(scope === "civ" ? "LOC_LSHUF_BUILD_PICK_CIV" : "LOC_LSHUF_BUILD_PICK_LEADER");
  const dd = dropdown(items, (value) => {
    if (!value) return;
    setHost(paramName, value, opts.playerId);
    onChange();
  }, "lshuf-build__pick-dropdown", selected);
  box.append(label, dd);
  return box;
}
