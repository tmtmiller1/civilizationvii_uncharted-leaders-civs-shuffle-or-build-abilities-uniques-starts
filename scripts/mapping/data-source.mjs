// One way to read a leader's ability, whether it lives in the compiled gameplay DB (base game and DLC) or in a
// leader mod's own files loaded into a scratch DB (mod-loader.mjs). Everything the mapping script needs:
// the ability trait, its modifiers with arguments and requirements, and the things a modifier reaches through
// (attached modifiers, unit abilities, constructible adjacencies).

const splitList = (v) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export class DataSource {
  // db: DatabaseSync with gameplay tables. fallback: another DataSource for rows the first doesn't hold (a mod's
  // scratch DB falls back to the vanilla gameplay DB). gameEffects: Map of modifiers defined in GameEffects XML.
  constructor(db, { fallback = null, gameEffects = null } = {}) {
    this.db = db;
    this.fallback = fallback;
    this.gameEffects = gameEffects || new Map();
    this.cache = new Map();
  }

  all(sql, ...params) {
    try {
      return this.db.prepare(sql).all(...params);
    } catch {
      return [];
    }
  }

  get(sql, ...params) {
    return this.all(sql, ...params)[0];
  }

  // { id, modifierType, effect, collection, args: [{name, value}], subject: [req], owner: [req], origin }
  // req = { id, type, inverse, args: [{name, value}] }
  modifier(id) {
    const key = `m:${id}`;
    if (this.cache.has(key)) return this.cache.get(key);
    let result = null;
    const ge = this.gameEffects.get(id);
    if (ge) {
      result = { ...ge, origin: "gameeffects" };
    } else {
      const m = this.get("SELECT * FROM Modifiers WHERE ModifierId = ?", id);
      if (m) {
        const dyn = this.dynamic(m.ModifierType);
        result = {
          id,
          modifierType: m.ModifierType,
          effect: dyn ? dyn.EffectType : null,
          collection: dyn ? dyn.CollectionType : null,
          args: this.all("SELECT Name AS name, Value AS value FROM ModifierArguments WHERE ModifierId = ?", id),
          subject: this.requirementSet(m.SubjectRequirementSetId),
          owner: this.requirementSet(m.OwnerRequirementSetId),
          subjectSetId: m.SubjectRequirementSetId,
          ownerSetId: m.OwnerRequirementSetId,
          origin: "db"
        };
      } else if (this.fallback) {
        result = this.fallback.modifier(id);
      }
    }
    this.cache.set(key, result);
    return result;
  }

  dynamic(modifierType) {
    const row = this.get("SELECT * FROM DynamicModifiers WHERE ModifierType = ?", modifierType);
    if (row) return row;
    return this.fallback ? this.fallback.dynamic(modifierType) : null;
  }

  requirementSet(setId) {
    if (!setId) return [];
    const rows = this.all(
      "SELECT r.RequirementId AS id, r.RequirementType AS type, r.Inverse AS inverse FROM RequirementSetRequirements s JOIN Requirements r ON r.RequirementId = s.RequirementId WHERE s.RequirementSetId = ?",
      setId
    );
    if (!rows.length && this.fallback) return this.fallback.requirementSet(setId);
    return rows.map((r) => ({
      ...r,
      inverse: !!r.inverse,
      args: this.all("SELECT Name AS name, Value AS value FROM RequirementArguments WHERE RequirementId = ?", r.id)
    }));
  }

  unitAbilityModifiers(abilityType) {
    const rows = this.all("SELECT ModifierId FROM UnitAbilityModifiers WHERE UnitAbilityType = ?", abilityType);
    if (!rows.length && this.fallback) return this.fallback.unitAbilityModifiers(abilityType);
    return rows.map((r) => r.ModifierId);
  }

  adjacency(id) {
    const row = this.get("SELECT * FROM Adjacency_YieldChanges WHERE ID = ?", id);
    if (row) return row;
    return this.fallback ? this.fallback.adjacency(id) : null;
  }

  kindOf(type) {
    const row = this.get("SELECT Kind FROM Types WHERE Type = ?", type);
    if (row) return row.Kind;
    return this.fallback ? this.fallback.kindOf(type) : null;
  }

  tagCategory(tag) {
    const row = this.get("SELECT Category FROM Tags WHERE Tag = ?", tag);
    if (row) return row.Category;
    return this.fallback ? this.fallback.tagCategory(tag) : null;
  }

  // Every value a modifier reaches: its own arguments and requirement arguments, plus those of attached
  // modifiers, granted unit abilities' modifiers, nested requirement sets and activated adjacencies.
  // Returns [{ where, name, value, reqType, inverse }].
  reach(modifierId, seen = new Set()) {
    if (seen.has(modifierId)) return [];
    seen.add(modifierId);
    const m = this.modifier(modifierId);
    if (!m) return [];
    const out = [];
    const walkReqs = (reqs, where, depth) => {
      for (const r of reqs) {
        out.push({ where, name: "#type", value: r.type, reqType: r.type, inverse: r.inverse, args: r.args });
        for (const a of r.args) {
          for (const v of splitList(a.value)) {
            out.push({ where, name: a.name, value: v, reqType: r.type, inverse: r.inverse });
            if (a.name === "RequirementSetId" && depth < 4) walkReqs(this.requirementSet(v), where, depth + 1);
          }
        }
      }
    };
    for (const a of m.args) {
      if (a.name === "Tooltip") continue;
      for (const v of splitList(a.value)) {
        out.push({ where: `arg:${modifierId}`, name: a.name, value: v });
        if (a.name === "ModifierId") out.push(...this.reach(v, seen));
        if (a.name === "AbilityType" || a.name === "UnitAbilityType") {
          for (const sub of this.unitAbilityModifiers(v)) out.push(...this.reach(sub, seen));
        }
        if (a.name === "ConstructibleAdjacency") {
          const adj = this.adjacency(v);
          if (adj) {
            for (const [col, val] of Object.entries(adj)) {
              if (val === null || val === 0 || val === "0" || col === "ID") continue;
              out.push({ where: `adjacency:${v}`, name: col, value: String(val) });
            }
          }
        }
      }
    }
    walkReqs(m.subject, `subject:${modifierId}`, 0);
    walkReqs(m.owner, `owner:${modifierId}`, 0);
    return out;
  }
}
