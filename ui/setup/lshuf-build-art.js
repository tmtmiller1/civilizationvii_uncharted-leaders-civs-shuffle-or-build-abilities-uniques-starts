// Art for the Build your own leader screen, by name only: the game's own icon routes and blp names, the way its
// create-game screens use them. Nothing here points at a file in the mod.
//
// - Leader portraits: UI.getIconCSS(leaderType, "PORTRAIT_MASK"), as leader-select-button.js's LeaderPortrait does.
// - Attribute icons: UI.getIconCSS("ATTRIBUTE_<KIND>", "OUTLINE"), as attribute-icon.js does (it derives the name
//   from the LOC_TAG_TRAIT_<KIND>_NAME key).
// - Civilization cards: url("blp:bg-panel-<civ>") for the background (civ-select-model.js builds the same name) and
//   UI.getIconURL(civType, "") for the symbol (its line 221).
// - Slots and tags: blp:memento_slot-base.png and blp:tag_equipped.png, from memento-select.js.

const guard = (fn, fallback) => {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch (_) {
    return fallback;
  }
};

const cssUrl = (url) => (url ? `url("${url}")` : "");

export const SLOT_BASE = cssUrl("blp:memento_slot-base.png");
export const TAG_EQUIPPED = cssUrl("blp:tag_equipped.png");
export const UNKNOWN_PORTRAIT = cssUrl("fs://game/base-standard/leader_portrait_unknown.png");

export function leaderPortrait(leaderType) {
  if (!leaderType) return UNKNOWN_PORTRAIT;
  const css = guard(() => UI.getIconCSS(leaderType, "PORTRAIT_MASK"), "");
  return css || UNKNOWN_PORTRAIT;
}

// TAG_TRAIT_CULTURAL -> ATTRIBUTE_CULTURAL
export const attributeIconName = (tagType) => String(tagType || "").replace(/^TAG_TRAIT_/, "ATTRIBUTE_");

export function attributeIcon(tagType) {
  const name = attributeIconName(tagType);
  return name ? guard(() => UI.getIconCSS(name, "OUTLINE"), "") : "";
}

export function civBackground(civilizationType) {
  if (!civilizationType) return "";
  return cssUrl(`blp:bg-panel-${civilizationType.replace("CIVILIZATION_", "").toLowerCase()}`);
}

// A unique unit's, building's, quarter's or improvement's icon, by its type name, the way the game's unit and
// constructible panels ask for them.
export function uniqueIcon(type) {
  return type ? guard(() => UI.getIconCSS(type, ""), "") : "";
}

export function civSymbol(civilizationType, iconFile) {
  const url = civilizationType ? guard(() => UI.getIconURL(civilizationType, ""), "") : "";
  if (url) return cssUrl(url);
  return iconFile ? cssUrl(`blp:${String(iconFile).replace(/\.png$/i, "")}`) : "";
}
