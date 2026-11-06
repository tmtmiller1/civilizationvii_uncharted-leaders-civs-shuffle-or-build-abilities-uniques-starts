"""Builds the lshuf-probe mod for Leader Shuffle probes 1, 7, 8 and 10 (SPEC.md section 7).

Run: python3 -I build-probe-mod.py   (writes ./lshuf-probe/)

Probe 1: a new trait on Amina carrying one of Pachacuti's ability modifiers, with a description assembled from
         Amina's text plus Pachacuti's third bullet.
Probe 7: one action group per load criterion under test; each inserts a tag into LShufProbeHits when it applies.
Probe 8: a game-scope UI script rewrites Amina's LeaderItems row and adds a LeaderTags row in the config database,
         and records when it ran; the setup-side check is done by eval at the main menu.
Probe 10: a shell-scope UpdateDatabase writes a small start-bias table into the setup database.
"""
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "lshuf-probe")
FRONTEND = os.path.expanduser("~/Library/Application Support/Civilization VII/Debug/frontend-copy.sqlite")

leaders = [r[0] for r in sqlite3.connect(FRONTEND).execute(
    "select LeaderType from Leaders where Domain='StandardLeaders' order by LeaderType")]
leaders.append("LEADER_NOPE")  # a leader that doesn't exist: the control

criteria = []  # (tag, criterion xml)
for lt in leaders:
    criteria.append((f"LP:{lt}", f"<LeaderPlayable>{lt}</LeaderPlayable>"))
    criteria.append((f"LPD:{lt}", f"<LeaderPlayable>StandardLeaders::{lt}</LeaderPlayable>"))


def cfg(kind, key, value):
    return (f"<{kind}><Group>Game</Group><ConfigurationId>{key}</ConfigurationId>"
            f"<Value>{value}</Value></{kind}>")


criteria += [
    ("M1:int-key=1", cfg("ConfigurationValueMatches", "LShufKeep_LEADER_AMINA", "1")),
    ("M2:str-key=1", cfg("ConfigurationValueMatches", "LShufKeepStr_LEADER_AMINA", "1")),
    ("M3:unset-key=1 (control)", cfg("ConfigurationValueMatches", "LShufKeep_LEADER_PACHACUTI", "1")),
    ("C1:list-key has AMINA", cfg("ConfigurationValueContains", "LShufKeepList", "LEADER_AMINA")),
    ("C2:list-key has NOPE (control)", cfg("ConfigurationValueContains", "LShufKeepList", "LEADER_NOPE")),
    ("C3:csv-key has AMINA", cfg("ConfigurationValueContains", "LShufKeepCsv", "LEADER_AMINA")),
    ("C4:str-key in 1,2,3", cfg("ConfigurationValueContains", "LShufKeepStr_LEADER_AMINA", "1,2,3")),
    ("C5:str-key in 2,3 (control)", cfg("ConfigurationValueContains", "LShufKeepStr_LEADER_AMINA", "2,3")),
    ("C6:int-key in 1,2,3", cfg("ConfigurationValueContains", "LShufKeep_LEADER_AMINA", "1,2,3")),
]


def w(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def sq(s):
    return s.replace("'", "''")


crit_xml, group_xml = [], []
for i, (tag, xml) in enumerate(criteria):
    cid = f"c{i:03d}"
    crit_xml.append(f'\t\t<Criteria id="{cid}">\n\t\t\t{xml}\n\t\t</Criteria>')
    w(f"data/hits/{cid}.sql", f"INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('{sq(tag)}');\n")
    group_xml.append(
        f'\t\t<ActionGroup id="lshuf-probe-{cid}" scope="game" criteria="{cid}">\n'
        f'\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>\n'
        f'\t\t\t<Actions><UpdateDatabase><Item>data/hits/{cid}.sql</Item></UpdateDatabase></Actions>\n'
        f'\t\t</ActionGroup>')

w("data/hits-table.sql", "CREATE TABLE IF NOT EXISTS LShufProbeHits (Tag TEXT PRIMARY KEY NOT NULL);\n"
  "INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('ALWAYS');\n")

w("data/amina-trait.sql", """-- Probe 1: one Pachacuti bullet (10% of a city's Food as Production) on Amina through a trait of our own.
INSERT INTO Types (Type, Kind) VALUES ('TRAIT_LSHUF_PROBE_AMINA', 'KIND_TRAIT');
INSERT INTO Traits (TraitType, Name, Description, InternalOnly)
VALUES ('TRAIT_LSHUF_PROBE_AMINA', 'LOC_TRAIT_LSHUF_PROBE_AMINA_NAME', 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION', 1);
INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES ('LEADER_AMINA', 'TRAIT_LSHUF_PROBE_AMINA');
INSERT INTO TraitModifiers (TraitType, ModifierId)
SELECT 'TRAIT_LSHUF_PROBE_AMINA', ModifierId FROM Modifiers WHERE ModifierId = 'PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD';
""")

# Amina's description without its closing tag, then Pachacuti's text from its third [LI] on.
w("text/amina-trait-text.sql", """-- Probe 1: Amina's ability text plus Pachacuti's third bullet, in each language the game has.
INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text)
SELECT a.Language, 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION',
  replace(a.Text, '[/BLIST]', '') ||
  substr(p.Text,
    instr(p.Text, '[LI]') + 3
    + instr(substr(p.Text, instr(p.Text, '[LI]') + 4), '[LI]')
    + instr(substr(p.Text, instr(p.Text, '[LI]') + 4 + instr(substr(p.Text, instr(p.Text, '[LI]') + 4), '[LI]')), '[LI]'))
FROM LocalizedText a
JOIN LocalizedText p ON p.Language = a.Language AND p.Tag = 'LOC_TRAIT_LEADER_PACHACUTI_ABILITY_DESCRIPTION'
WHERE a.Tag = 'LOC_TRAIT_LEADER_AMINA_ABILITY_DESCRIPTION';
INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text)
SELECT Language, 'LOC_TRAIT_LSHUF_PROBE_AMINA_NAME', Text FROM LocalizedText
WHERE Tag = 'LOC_TRAIT_LEADER_AMINA_ABILITY_NAME';
""")

w("data/shell-bias.sql", """-- Probe 10: a setup-side start-bias table, read back at a fresh main menu.
CREATE TABLE IF NOT EXISTS LShufSetupBias (LeaderType TEXT, CivilizationType TEXT, Kind TEXT, Target TEXT, Score INTEGER);
INSERT INTO LShufSetupBias VALUES ('LEADER_PACHACUTI', NULL, 'Terrain', 'TERRAIN_MOUNTAIN', 40);
INSERT INTO LShufSetupBias VALUES ('LEADER_AMINA', NULL, 'Biome', 'BIOME_PLAINS', 20);
INSERT INTO LShufSetupBias VALUES (NULL, 'CIVILIZATION_ENGLAND', 'Islands', NULL, 50000);
""")

w("ui/lshuf-probe-game.js", """// Probe 8: rewrite Amina's ability row and add an attribute tag in the config database, from a game-scope script.
(function () {
  const r = { loadedAt: Date.now(), loadingStateAtLoad: null, updates: [], readBack: null, errors: [] };
  globalThis.__lshufProbe = r;
  try { r.loadingStateAtLoad = UI.getGameLoadingState(); } catch (e) { r.errors.push("state: " + e); }
  const q = (sql) => {
    try { const out = Database.query("config", sql); r.updates.push({ sql, out: out === undefined ? "undefined" : out }); }
    catch (e) { r.errors.push(sql + " -> " + e); }
  };
  q("UPDATE LeaderItems SET Description = 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION' "
    + "WHERE LeaderType = 'LEADER_AMINA' AND Kind = 'KIND_TRAIT'");
  q("INSERT INTO LeaderTags (LeaderDomain, LeaderType, TagType) VALUES ('StandardLeaders', 'LEADER_AMINA', 'TAG_TRAIT_SCIENTIFIC')");
  try {
    r.readBack = {
      item: Database.query("config", "SELECT Description FROM LeaderItems WHERE LeaderType = 'LEADER_AMINA' AND Kind = 'KIND_TRAIT'"),
      tags: Database.query("config", "SELECT TagType FROM LeaderTags WHERE LeaderType = 'LEADER_AMINA'"),
    };
  } catch (e) { r.errors.push("readBack: " + e); }
  console.warn("[lshuf-probe] game script ran: " + JSON.stringify(r));
})();
""")

modinfo = f"""<?xml version="1.0" encoding="utf-8"?>
<Mod id="lshuf-probe" version="1" xmlns="ModInfo">
\t<Properties>
\t\t<Name>Leader Shuffle probe</Name>
\t\t<Description>Probes 1, 7, 8 and 10 for the Leader Shuffle spec. Not for release.</Description>
\t\t<Authors>tower</Authors>
\t\t<Package>Mod</Package>
\t\t<AffectsSavedGames>1</AffectsSavedGames>
\t\t<ShowInBrowser>1</ShowInBrowser>
\t</Properties>
\t<Dependencies>
\t\t<Mod id="core" title="Core"/>
\t\t<Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME"/>
\t</Dependencies>
\t<ActionCriteria>
\t\t<Criteria id="always"><AlwaysMet></AlwaysMet></Criteria>
{chr(10).join(crit_xml)}
\t</ActionCriteria>
\t<ActionGroups>
\t\t<ActionGroup id="lshuf-probe-shell" scope="shell" criteria="always">
\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>
\t\t\t<Actions><UpdateDatabase><Item>data/shell-bias.sql</Item></UpdateDatabase></Actions>
\t\t</ActionGroup>
\t\t<ActionGroup id="lshuf-probe-game" scope="game" criteria="always">
\t\t\t<Properties><LoadOrder>100</LoadOrder></Properties>
\t\t\t<Actions>
\t\t\t\t<UpdateDatabase><Item>data/hits-table.sql</Item><Item>data/amina-trait.sql</Item></UpdateDatabase>
\t\t\t\t<UpdateText><Item>text/amina-trait-text.sql</Item></UpdateText>
\t\t\t\t<UIScripts><Item>ui/lshuf-probe-game.js</Item></UIScripts>
\t\t\t</Actions>
\t\t</ActionGroup>
{chr(10).join(group_xml)}
\t</ActionGroups>
</Mod>
"""
w("lshuf-probe.modinfo", modinfo)
print(f"wrote {OUT}: {len(criteria)} criteria groups")
