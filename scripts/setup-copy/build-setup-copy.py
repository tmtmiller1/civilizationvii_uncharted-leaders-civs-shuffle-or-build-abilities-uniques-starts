"""Write data/setup-copy/setup-copy.sql: the setup-side copy of the gameplay rows the deal reads (CONTRACTS.md 4.2).

Run from anywhere (rerunnable, read-only on its inputs):
    python3 -I scripts/setup-copy/build-setup-copy.py [--db PATH] [--mods-root PATH] [--out PATH] [--check]
                                                     [--compare-db PATH] [--age-rows]

Inputs
  --db         the compiled gameplay database (default: Debug/gameplay-copy.sqlite). It's copied to a temp folder
               first and never written.
  --mods-root  the reference corpus on tp-share; the 27 listed modded leaders' rows are read from their mod files
               (shared/lshuf-known-leaders.js gives the workshop folder) by applying each mod's Antiquity game-scope
               UpdateDatabase files to a copy of --db and reading the leader's rows back.
  --age-rows   also copy the Exploration and Modern StartBiasResources civ rows from the game's age XML files. Off by
               default: the Antiquity database has none, so with them in the copy the preview would deal rows an
               Antiquity game doesn't have (see the report printed at the end).
  --check      load data/schema/*.sql and the output into a copy of Debug/frontend-copy.sqlite and count the rows.
  --compare-db a second gameplay database (for example the mods-off 1.5.0 baseline) whose vanilla rows should match.

Only base game and DLC leaders (VANILLA_LEADERS) are copied from --db, and only their ability and attribute traits,
so rows other mods add to LeaderTraits (Cultural Diffusion's flips, Partisans) and probe rows stay out.
"""
import argparse
import os
import re
import shutil
import sqlite3
import sys
import tempfile
import xml.etree.ElementTree as ET
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
MOD_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CIV = os.path.expanduser("~/Library/Application Support/Civilization VII/Debug")
DEFAULT_DB = os.path.join(CIV, "gameplay-copy.sqlite")
FRONTEND_DB = os.path.join(CIV, "frontend-copy.sqlite")
DEFAULT_MODS = "/Volumes/tp-share/Repos_Mine/civilization_vii_reference_mods"
# The 1.5.0 game files saved in the workspace (<workspace>/tower_mods_in_dev/<mod>); LSHUF_GAME_FILES overrides.
GAME_FILES = os.environ.get("LSHUF_GAME_FILES") or os.path.join(
    MOD_ROOT, "..", "..", "civilization_vii_1.5.0_game_files", "Resources", "Base", "modules"
)
DEFAULT_OUT = os.path.join(MOD_ROOT, "data", "setup-copy", "setup-copy.sql")

ATTRIBUTE_TRAITS = [
    "TRAIT_LEADER_ATTRIBUTE_CULTURAL", "TRAIT_LEADER_ATTRIBUTE_ECONOMIC", "TRAIT_LEADER_ATTRIBUTE_EXPANSIONIST",
    "TRAIT_LEADER_ATTRIBUTE_MILITARISTIC", "TRAIT_LEADER_ATTRIBUTE_POLITICAL", "TRAIT_LEADER_ATTRIBUTE_SCIENTIFIC",
    "TRAIT_LEADER_ATTRIBUTE_WILDCARD",
]

# (table, columns, leader column or None). Same names and columns as data/schema/frontend-tables.sql.
TABLES = [
    ("Leaders", ["LeaderType", "IsMajorLeader", "InheritFrom"]),
    ("LeaderTraits", ["LeaderType", "TraitType"]),
    ("Traits", ["TraitType", "Name", "Description"]),
    ("TraitModifiers", ["TraitType", "ModifierId"]),
    ("Modifiers", ["ModifierId", "ModifierType", "OwnerRequirementSetId", "SubjectRequirementSetId"]),
    ("RequirementSetRequirements", ["RequirementSetId", "RequirementId"]),
    ("Requirements", ["RequirementId", "RequirementType"]),
    ("LegacyCivilizations", ["CivilizationType", "Age"]),
    ("LeaderCivPriorities", ["Leader", "Civilization", "Priority"]),
    ("LeaderAgendas", ["LeaderType", "NameKey"]),
    ("TypeNames", ["Type", "Name"]),
    ("AttributeActions", ["TraitType", "ActionType", "ActionNameKey"]),
    ("CivItems", ["CivilizationType", "Age", "Kind", "Type", "NameKey", "DescKey", "TraitType"]),
    ("CivCivics", ["CivilizationType", "NodeType", "NodeNameKey", "UnlockType", "UnlockKind", "UnlockNameKey"]),
    ("ProgressionTreeNodeUnlocks", ["ProgressionTreeNodeType", "TargetType", "TargetKind", "RequiredTraitType"]),
    ("ProgressionTreeNodes", ["ProgressionTreeNodeType", "ProgressionTree"]),
    ("Attributes", ["AttributeType", "ProgressionTreeType"]),
    ("StartBiasBiomes", ["CivilizationType", "LeaderType", "BiomeType", "Score"]),
    ("StartBiasTerrains", ["CivilizationType", "LeaderType", "TerrainType", "Score"]),
    ("StartBiasAdjacentToCoasts", ["CivilizationType", "LeaderType", "Score"]),
    ("StartBiasFeatureClasses", ["CivilizationType", "LeaderType", "FeatureClassType", "Score"]),
    ("StartBiasRivers", ["CivilizationType", "LeaderType", "Score"]),
    ("StartBiasLakes", ["CivilizationType", "LeaderType", "Score"]),
    ("StartBiasNaturalWonders", ["CivilizationType", "LeaderType", "Score"]),
    ("StartBiasIslands", ["CivilizationType", "LeaderType", "Score"]),
    ("StartBiasResources", ["CivilizationType", "LeaderType", "ResourceType", "Score"]),
]
BIAS_TABLES = [t for t, _ in TABLES if t.startswith("StartBias")]


def known_leaders():
    text = open(os.path.join(MOD_ROOT, "shared", "lshuf-known-leaders.js"), encoding="utf-8").read()
    vanilla_block = text.split("export const VANILLA_LEADERS = [", 1)[1].split("];", 1)[0]
    vanilla = re.findall(r'"(LEADER_\w+)"', vanilla_block)
    modded = re.findall(r'leaderType: "(LEADER_\w+)", modId: "([^"]+)", workshopId: "(\d+)"', text)
    return vanilla, [{"leader": l, "modId": m, "workshop": w} for l, m, w in modded]


def q(con, sql, args=()):
    return con.execute(sql, args).fetchall()


def in_list(values):
    return ",".join("?" * len(values)) or "NULL"


def requirement_closure(con, set_ids):
    """Requirement sets reachable from set_ids, through REQUIREMENT_REQUIREMENTSET_IS_MET arguments."""
    seen, todo = set(), [s for s in set_ids if s]
    while todo:
        sid = todo.pop()
        if sid in seen:
            continue
        seen.add(sid)
        rows = q(con, "SELECT ra.Value FROM RequirementSetRequirements r JOIN RequirementArguments ra "
                 "ON ra.RequirementId = r.RequirementId WHERE r.RequirementSetId = ? AND ra.Name = 'RequirementSetId'",
                 (sid,))
        todo.extend(v for (v,) in rows if v and v not in seen)
    return sorted(seen)


# LShufSetup_CivItems and LShufSetup_CivCivics come from scripts/setup-copy/build-civ-items.mjs (all three ages);
# this script only empties them so setup-copy-civ.sql can fill them after it.


def extract(con, leaders, civ_rows):
    """Rows of every table for these leaders, read from con. civ_rows: copy civilization-keyed rows too."""
    out = {t: [] for t, _ in TABLES}
    leaders = [l for (l,) in q(con, f"SELECT LeaderType FROM Leaders WHERE IsMajorLeader = 1 AND LeaderType IN "
                                    f"({in_list(leaders)}) ORDER BY LeaderType", leaders)]
    if not leaders:
        return out, leaders
    L = in_list(leaders)
    out["Leaders"] = q(con, f"SELECT LeaderType, IsMajorLeader, InheritFrom FROM Leaders WHERE LeaderType IN ({L}) "
                            "ORDER BY LeaderType", leaders)
    lt = q(con, f"SELECT lt.LeaderType, lt.TraitType FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType "
                f"WHERE lt.LeaderType IN ({L}) AND lt.TraitType NOT LIKE 'TRAIT_LSHUF%' AND (t.Name IS NOT NULL "
                f"OR lt.TraitType IN ({in_list(ATTRIBUTE_TRAITS)})) ORDER BY lt.LeaderType, lt.TraitType",
           leaders + ATTRIBUTE_TRAITS)
    out["LeaderTraits"] = lt
    traits = sorted({t for _, t in lt})
    T = in_list(traits)
    out["Traits"] = q(con, f"SELECT TraitType, Name, Description FROM Traits WHERE TraitType IN ({T}) "
                           "ORDER BY TraitType", traits)
    out["TraitModifiers"] = q(con, f"SELECT TraitType, ModifierId FROM TraitModifiers WHERE TraitType IN ({T}) "
                                   "ORDER BY TraitType, ModifierId", traits)
    mods = sorted({m for _, m in out["TraitModifiers"]})
    M = in_list(mods)
    out["Modifiers"] = q(con, f"SELECT ModifierId, ModifierType, OwnerRequirementSetId, SubjectRequirementSetId "
                              f"FROM Modifiers WHERE ModifierId IN ({M}) ORDER BY ModifierId", mods)
    sets = requirement_closure(con, {s for r in out["Modifiers"] for s in (r[2], r[3])})
    S = in_list(sets)
    out["RequirementSetRequirements"] = q(con, f"SELECT RequirementSetId, RequirementId FROM RequirementSetRequirements "
                                               f"WHERE RequirementSetId IN ({S}) ORDER BY 1, 2", sets)
    reqs = sorted({r for _, r in out["RequirementSetRequirements"]})
    out["Requirements"] = q(con, f"SELECT RequirementId, RequirementType FROM Requirements WHERE RequirementId IN "
                                 f"({in_list(reqs)}) ORDER BY 1", reqs)
    out["LeaderCivPriorities"] = q(con, f"SELECT Leader, Civilization, Priority FROM LeaderCivPriorities WHERE Leader "
                                        f"IN ({L}) ORDER BY 1, 2", leaders)
    out["TypeNames"] = q(con, "SELECT BiomeType, Name FROM Biomes UNION ALL SELECT TerrainType, Name FROM Terrains "
                              "UNION ALL SELECT FeatureClassType, Name FROM FeatureClasses "
                              "UNION ALL SELECT ResourceType, Name FROM Resources ORDER BY 1")
    out["AttributeActions"] = q(con, "SELECT tm.TraitType, da.DiplomacyActionType, da.Name FROM TraitModifiers tm "
                                     "JOIN ModifierArguments ma ON ma.ModifierId = tm.ModifierId AND ma.Name = 'ActionType' "
                                     "JOIN DiplomacyActions da ON da.DiplomacyActionType = ma.Value "
                                     "WHERE tm.TraitType LIKE 'TRAIT_LEADER_ATTRIBUTE_%' ORDER BY 1, 2")
    # Agenda names: the Name strings on a leader's ability modifiers that are diplomacy agendas.
    out["LeaderAgendas"] = q(con, f"SELECT DISTINCT lt.LeaderType, ms.Text FROM LeaderTraits lt "
                                  f"JOIN TraitModifiers tm ON tm.TraitType = lt.TraitType "
                                  f"JOIN ModifierStrings ms ON ms.ModifierId = tm.ModifierId AND ms.Context = 'Name' "
                                  f"WHERE lt.LeaderType IN ({L}) AND lt.TraitType IN ({T}) "
                                  f"AND ms.Text LIKE 'LOC_DIPLOMACY_AGENDA_%_NAME' ORDER BY 1, 2", leaders + traits)
    out["ProgressionTreeNodeUnlocks"] = q(
        con, f"SELECT ProgressionTreeNodeType, TargetType, TargetKind, RequiredTraitType FROM ProgressionTreeNodeUnlocks "
             f"WHERE RequiredTraitType IN ({T}) ORDER BY 1, 2", traits)
    nodes = sorted({r[0] for r in out["ProgressionTreeNodeUnlocks"]})
    out["ProgressionTreeNodes"] = q(con, f"SELECT ProgressionTreeNodeType, ProgressionTree FROM ProgressionTreeNodes "
                                         f"WHERE ProgressionTreeNodeType IN ({in_list(nodes)}) ORDER BY 1", nodes)
    if civ_rows:
        out["LegacyCivilizations"] = q(con, "SELECT CivilizationType, Age FROM LegacyCivilizations ORDER BY 1")
        out["Attributes"] = q(con, "SELECT AttributeType, ProgressionTreeType FROM Attributes ORDER BY 1")
    for table, cols in TABLES:
        if table not in BIAS_TABLES:
            continue
        where = f"LeaderType IN ({L})" + (" OR (LeaderType IS NULL AND CivilizationType IS NOT NULL)" if civ_rows else "")
        out[table] = q(con, f"SELECT {', '.join(cols)} FROM {table} WHERE {where} ORDER BY 1, 2, 3", leaders)
    return out, leaders


# ---- Reading a mod's files into a database, the way the game's loader does for an Antiquity game ----

AGE = "AGE_ANTIQUITY"
MODS_IN_USE = {"base-standard", "age-antiquity", "core"}


def strip_ns(tag):
    return tag.split("}", 1)[-1]


def criterion_met(node):
    name = strip_ns(node.tag)
    text = (node.text or "").strip()
    if name == "AlwaysMet":
        return True
    if name == "AgeInUse":
        return text == AGE
    if name == "AgeWasUsed":
        return False
    if name == "ModInUse":
        return text in MODS_IN_USE
    if name == "RuleSetInUse":
        return text in ("RULESET_STANDARD", "")
    if name == "LeaderPlayable":
        return True
    return False


def criteria_met(crit):
    kids = list(crit)
    if not kids:
        return True
    results = []
    for k in kids:
        r = criterion_met(k)
        if (k.get("inverse") or "").lower() in ("1", "true"):
            r = not r
        results.append(r)
    return any(results) if (crit.get("any") or "").lower() in ("1", "true") else all(results)


def game_files(modinfo_path):
    """The UpdateDatabase files of the game-scope groups whose criteria an Antiquity game meets, in load order."""
    root = ET.parse(modinfo_path).getroot()
    crits = {}
    for c in root.iter():
        if strip_ns(c.tag) == "Criteria" and c.get("id"):
            crits[c.get("id")] = criteria_met(c)
    groups = []
    for i, g in enumerate(root.iter()):
        if strip_ns(g.tag) != "ActionGroup" or g.get("scope") != "game":
            continue
        if not crits.get(g.get("criteria"), False):
            continue
        order = 0
        for p in g.iter():
            if strip_ns(p.tag) == "LoadOrder" and (p.text or "").strip().lstrip("-").isdigit():
                order = int(p.text.strip())
        files = []
        for a in g.iter():
            if strip_ns(a.tag) == "UpdateDatabase":
                files.extend((it.text or "").strip() for it in a if strip_ns(it.tag) == "Item")
        groups.append((order, i, files))
    groups.sort()
    return [f for _, _, fs in groups for f in fs if f]


def split_sql(text):
    stmts, buf = [], ""
    for line in text.splitlines(keepends=True):
        buf += line
        if sqlite3.complete_statement(buf):
            stmts.append(buf.strip())
            buf = ""
    if buf.strip():
        stmts.append(buf.strip())
    return [s for s in stmts if s.strip(" ;\n\t")]


def table_columns(con, table, cache={}):
    key = (id(con), table)
    if key not in cache:
        cache[key] = {r[1]: r[2] for r in q(con, f"PRAGMA table_info('{table}')")}
    return cache[key]


def value_of(raw, coltype):
    if raw is None:
        return None
    if "BOOL" in (coltype or "").upper() and raw.lower() in ("true", "false"):
        return 1 if raw.lower() == "true" else 0
    return raw


def row_values(el):
    vals = dict(el.attrib)
    for c in el:
        vals[strip_ns(c.tag)] = (c.text or "").strip() if c.text is not None else None
    return vals


def insert_row(con, table, vals, verb="INSERT"):
    cols = table_columns(con, table)
    if not cols:
        raise ValueError(f"no table {table}")
    names = [k for k in vals if k in cols]
    missing = [k for k in vals if k not in cols]
    if missing:
        raise ValueError(f"{table}: no column {missing}")
    con.execute(f"{verb} INTO {table} ({', '.join(names)}) VALUES ({in_list(names)})",
                [value_of(vals[n], cols[n]) for n in names])


def apply_database_xml(con, root, errors, src):
    for table_el in root:
        table = strip_ns(table_el.tag)
        for op in table_el:
            kind = strip_ns(op.tag)
            try:
                if kind == "Row":
                    insert_row(con, table, row_values(op))
                elif kind == "Replace":
                    insert_row(con, table, row_values(op), "INSERT OR REPLACE")
                elif kind == "InsertOrIgnore":
                    insert_row(con, table, row_values(op), "INSERT OR IGNORE")
                elif kind == "Delete":
                    vals = row_values(op)
                    con.execute(f"DELETE FROM {table} WHERE " + " AND ".join(f"{k} = ?" for k in vals), list(vals.values()))
                elif kind == "Update":
                    where = next((row_values(c) for c in op if strip_ns(c.tag) == "Where"), {})
                    sets = next((row_values(c) for c in op if strip_ns(c.tag) == "Set"), {})
                    if sets:
                        con.execute(f"UPDATE {table} SET " + ", ".join(f"{k} = ?" for k in sets)
                                    + (" WHERE " + " AND ".join(f"{k} = ?" for k in where) if where else ""),
                                    list(sets.values()) + list(where.values()))
            except (sqlite3.Error, ValueError) as e:
                errors.append(f"{src}: {table}/{kind}: {e}")


def add_requirement_set(con, set_id, el, errors, src):
    con.execute("INSERT OR IGNORE INTO RequirementSets (RequirementSetId, RequirementSetType) VALUES (?, ?)",
                (set_id, el.get("type") or "REQUIREMENTSET_TEST_ALL"))
    n = 0
    for r in el:
        if strip_ns(r.tag) != "Requirement":
            continue
        n += 1
        rid = r.get("id") or f"{set_id}_{n}"
        try:
            con.execute("INSERT OR IGNORE INTO Requirements (RequirementId, RequirementType, Inverse) VALUES (?, ?, ?)",
                        (rid, r.get("type"), 1 if (r.get("inverse") or "").lower() in ("1", "true") else 0))
            con.execute("INSERT OR IGNORE INTO RequirementSetRequirements (RequirementSetId, RequirementId) "
                        "VALUES (?, ?)", (set_id, rid))
            for a in r:
                if strip_ns(a.tag) == "Argument":
                    con.execute("INSERT OR REPLACE INTO RequirementArguments (RequirementId, Name, Value) "
                                "VALUES (?, ?, ?)", (rid, a.get("name"), (a.text or "").strip()))
        except sqlite3.Error as e:
            errors.append(f"{src}: requirement {rid}: {e}")


def apply_game_effects(con, root, errors, src):
    for el in root:
        kind = strip_ns(el.tag)
        if kind == "RequirementSet" and el.get("id"):
            add_requirement_set(con, el.get("id"), el, errors, src)
            continue
        if kind != "Modifier" or not el.get("id"):
            continue
        mid = el.get("id")
        mtype = f"{mid}_TYPE"
        owner = subject = None
        for part in el:
            tag = strip_ns(part.tag)
            if tag == "SubjectRequirements":
                subject = f"{mid}_SUBJECT_REQUIREMENTS"
                add_requirement_set(con, subject, part, errors, src)
            elif tag == "OwnerRequirements":
                owner = f"{mid}_OWNER_REQUIREMENTS"
                add_requirement_set(con, owner, part, errors, src)
        try:
            con.execute("INSERT OR IGNORE INTO DynamicModifiers (ModifierType, CollectionType, EffectType) "
                        "VALUES (?, ?, ?)", (mtype, el.get("collection"), el.get("effect")))
            con.execute("INSERT OR REPLACE INTO Modifiers (ModifierId, ModifierType, OwnerRequirementSetId, "
                        "SubjectRequirementSetId) VALUES (?, ?, ?, ?)", (mid, mtype, owner, subject))
            for a in el:
                if strip_ns(a.tag) == "Argument":
                    con.execute("INSERT OR REPLACE INTO ModifierArguments (ModifierId, Name, Value) VALUES (?, ?, ?)",
                                (mid, a.get("name"), (a.text or "").strip()))
        except sqlite3.Error as e:
            errors.append(f"{src}: modifier {mid}: {e}")


def apply_file(con, path, errors):
    src = os.path.basename(path)
    if not os.path.isfile(path):
        errors.append(f"{src}: file missing")
        return
    text = open(path, encoding="utf-8-sig", errors="replace").read()
    if path.lower().endswith(".sql"):
        for stmt in split_sql(text):
            try:
                con.execute(stmt)
            except sqlite3.Error as e:
                errors.append(f"{src}: {e}: {stmt[:80]!r}")
        return
    try:
        root = ET.fromstring(text)
    except ET.ParseError as e:
        errors.append(f"{src}: XML: {e}")
        return
    if strip_ns(root.tag) == "GameEffects":
        apply_game_effects(con, root, errors, src)
    else:
        apply_database_xml(con, root, errors, src)


def load_modded(base_db, mods_root, modded, tmp):
    """One database per mod folder, with that mod's Antiquity game files applied. Returns {leader: rows}, notes."""
    result, notes = {}, []
    by_folder = {}
    for m in modded:
        by_folder.setdefault(m["workshop"], []).append(m["leader"])
    for folder, leaders in sorted(by_folder.items()):
        mod_dir = os.path.join(mods_root, folder)
        infos = [f for f in os.listdir(mod_dir) if f.endswith(".modinfo")] if os.path.isdir(mod_dir) else []
        if not infos:
            notes.append(f"{folder}: no modinfo on tp-share; {', '.join(leaders)} left out of the copy")
            continue
        db = os.path.join(tmp, f"mod-{folder}.sqlite")
        shutil.copyfile(base_db, db)
        con = sqlite3.connect(db)
        # The game's loader defines Make_Hash; its value only fills Types.Hash, which the copy doesn't read.
        con.create_function("Make_Hash", 1, lambda v: zlib.crc32(str(v).encode("utf-8")) - (1 << 31))
        errors = []
        for rel in game_files(os.path.join(mod_dir, infos[0])):
            apply_file(con, os.path.join(mod_dir, rel), errors)
        con.commit()
        rows, found = extract(con, leaders, civ_rows=False)
        for leader in leaders:
            if leader not in found:
                notes.append(f"{folder}: {leader} has no major Leaders row after loading its files")
        if found:
            result[folder] = rows
        relevant = [e for e in errors if "UNIQUE constraint" not in e]
        copied = {t for t, _ in TABLES}
        hits = [e for e in relevant if re.search(r": (\w+)/", e) and re.search(r": (\w+)/", e).group(1) in copied
                or (".sql:" in e and any(re.search(rf"\b{t}\b", e) for t in copied))]
        if relevant:
            notes.append(f"{folder}: {len(relevant)} load errors, {len(hits)} touching a copied table")
            notes.extend(f"    {e[:200]}" for e in hits[:4])
        con.close()
    return result, notes


def age_resource_rows():
    rows = []
    for rel in ("age-exploration/data/civilizations-exploration.xml", "age-modern/data/civilizations-modern.xml"):
        path = os.path.join(GAME_FILES, rel)
        if not os.path.isfile(path):
            continue
        for el in ET.parse(path).getroot().iter():
            if strip_ns(el.tag) == "StartBiasResources":
                for r in el:
                    v = row_values(r)
                    rows.append((v.get("CivilizationType"), v.get("LeaderType"), v.get("ResourceType"),
                                 int(v.get("Score", 0))))
    return rows


# ---- Output ----

def sql_value(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(int(v)) if float(v).is_integer() else str(v)
    return "'" + str(v).replace("'", "''") + "'"


def merge(tables, extra):
    for t, rows in extra.items():
        have = set(tables[t])
        tables[t].extend(r for r in rows if r not in have)


def known_leaders_sql(vanilla, modded):
    """LShufKnownLeaders in config: the deal reads it in the shell too (CONTRACTS.md 4.2), and nothing else fills it
    there. Same rows as the gameplay side, from shared/lshuf-known-leaders.js; INSERT OR IGNORE, so it can run twice."""
    rows = [(l, 0, None) for l in vanilla] + [(m["leader"], 1, m["modId"]) for m in modded]
    return ["INSERT OR IGNORE INTO LShufKnownLeaders (LeaderType, IsModded, ModId) VALUES",
            ",\n".join("  (" + ", ".join(sql_value(v) for v in r) + ")" for r in rows) + ";"]


def write_sql(path, tables, header, extra_lines=()):
    lines = [header, ""]
    for table, cols in TABLES:
        lines.append(f"DELETE FROM LShufSetup_{table};")
    for table, cols in TABLES:
        rows = sorted(set(tables[table]), key=lambda r: tuple("" if x is None else str(x) for x in r))
        for i in range(0, len(rows), 200):
            chunk = rows[i:i + 200]
            lines.append(f"INSERT INTO LShufSetup_{table} ({', '.join(cols)}) VALUES")
            lines.append(",\n".join("  (" + ", ".join(sql_value(v) for v in r) + ")" for r in chunk) + ";")
    lines.extend(extra_lines)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def check_load(out_path, tmp):
    db = os.path.join(tmp, "frontend-check.sqlite")
    shutil.copyfile(FRONTEND_DB, db)
    con = sqlite3.connect(db)
    for rel in ("data/schema/gameplay-tables.sql", "data/schema/frontend-tables.sql"):
        con.executescript(open(os.path.join(MOD_ROOT, rel), encoding="utf-8").read())
    con.executescript(open(out_path, encoding="utf-8").read())
    con.executescript(open(out_path, encoding="utf-8").read())  # twice: the DELETEs keep it exact
    counts = {f"LShufSetup_{t}": q(con, f"SELECT COUNT(*) FROM LShufSetup_{t}")[0][0] for t, _ in TABLES}
    counts["LShufKnownLeaders"] = q(con, "SELECT COUNT(*) FROM LShufKnownLeaders")[0][0]
    con.close()
    return counts


def compare(tables, other_db, vanilla, tmp):
    db = os.path.join(tmp, "compare.sqlite")
    shutil.copyfile(other_db, db)
    con = sqlite3.connect(db)
    theirs, _ = extract(con, vanilla, civ_rows=True)
    con.close()
    diffs = []
    for t, _ in TABLES:
        a, b = set(tables[t]), set(theirs[t])
        if a != b:
            diffs.append(f"{t}: {len(a - b)} only here, {len(b - a)} only in the compare DB")
    return diffs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--mods-root", default=DEFAULT_MODS)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--compare-db")
    ap.add_argument("--age-rows", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    vanilla, modded = known_leaders()
    with tempfile.TemporaryDirectory() as tmp:
        base = os.path.join(tmp, "gameplay.sqlite")
        shutil.copyfile(args.db, base)
        con = sqlite3.connect(base)
        tables, found = extract(con, vanilla, civ_rows=True)
        con.close()
        print(f"vanilla and DLC leaders read: {len(found)} of {len(vanilla)}")
        diffs = compare(tables, args.compare_db, vanilla, tmp) if args.compare_db else []
        notes = []
        if os.path.isdir(args.mods_root):
            per_mod, notes = load_modded(base, args.mods_root, modded, tmp)
            for rows in per_mod.values():
                merge(tables, rows)
            got = sorted({r[0] for r in tables["Leaders"]} - set(found))
            print(f"modded leaders read: {len(got)} of {len(modded)}")
        else:
            notes.append(f"{args.mods_root} not mounted; modded leaders left out")
        if args.age_rows:
            merge(tables, {"StartBiasResources": age_resource_rows()})
        header = ("-- Generated by scripts/setup-copy/build-setup-copy.py; don't edit by hand. Setup-side copies of the "
                  "gameplay rows the deal\n-- reads (CONTRACTS.md 4.2), for the leader-select preview. Base game and "
                  "DLC from the compiled 1.5.0 database (Antiquity),\n-- listed modded leaders from their own files. "
                  "The shell keeps only the leaders and civs that have a config row.")
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        write_sql(args.out, tables, header, known_leaders_sql(vanilla, modded))
        print(f"wrote {args.out}")
        for t, _ in TABLES:
            print(f"  {t}: {len(set(tables[t]))}")
        for n in notes:
            print(f"note: {n}")
        for d in diffs:
            print(f"compare: {d}")
        if args.compare_db and not diffs:
            print("compare: vanilla rows match the compare DB")
        if not args.age_rows:
            print(f"note: {len(age_resource_rows())} Exploration/Modern StartBiasResources civ rows left out "
                  "(the Antiquity database has none); --age-rows adds them")
        if args.check:
            counts = check_load(args.out, tmp)
            print("check: loaded twice into a copy of frontend-copy.sqlite after data/schema/*.sql")
            for t, n in counts.items():
                print(f"  {t}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
