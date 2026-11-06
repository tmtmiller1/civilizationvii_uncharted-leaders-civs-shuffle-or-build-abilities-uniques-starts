"""Builds the lshuf-probe-accordion mod for probe 13 (SPEC.md section 7).

Run: python3 -I build-accordion-probe.py   (writes ./lshuf-probe-accordion/)

Setup side (shell scope): two leader accordions as native array Select parameters with UxHint InvertSelection, one
storing values wrapped as |LEADER_X| and one storing plain LEADER_X; an "Include modded leaders" check box; and a
stand-in modded accordion (two base leaders) shown only while the box is on, through ParameterDependencies.
Game side: one action group per leader per stored list, matched with ConfigurationValueContains, each inserting a tag
into LShufProbeHits, so the game shows which leaders each list left out.
"""
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "lshuf-probe-accordion")
FRONTEND = os.path.expanduser("~/Library/Application Support/Civilization VII/Debug/frontend-copy.sqlite")
leaders = [r[0] for r in sqlite3.connect(FRONTEND).execute(
    "select LeaderType from Leaders where Domain='StandardLeaders' and LeaderType like 'LEADER_%' order by LeaderType")]
MODDED_STANDINS = ["LEADER_AMINA", "LEADER_PACHACUTI"]


def w(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def param(pid, name, domain, key, sort, array=1, default="NULL", hint="'InvertSelection'"):
    return (f"INSERT INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup, "
            f"ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, "
            f"SupportsInternetMultiplayer, SupportsHotseatMultiplayer, UxHint, SortIndex) VALUES ('{pid}', '{name}', "
            f"'{name}_DESC', '{domain}', {array}, {default}, 'Game', '{key}', 'AdvancedOptions', 0, 0, 1, 1, 1, 1, "
            f"{hint}, {sort});\n")


setup = "-- Probe 13: leader accordions on the advanced setup screen.\n"
setup += param("LShufLeadersIn", "LOC_LSHUF_P13_LEADERS", "LShufLeaders", "LShufExcludedLeaders", 5000)
setup += param("LShufLeadersInPlain", "LOC_LSHUF_P13_LEADERS_PLAIN", "LShufLeadersPlain", "LShufExcludedLeadersPlain", 5001)
setup += param("LShufIncludeModded", "LOC_LSHUF_P13_INCLUDE_MODDED", "bool", "LShufIncludeModded", 5002, array=0,
               default="0", hint="NULL")
setup += param("LShufModdedIn", "LOC_LSHUF_P13_MODDED", "LShufModded", "LShufExcludedModdedLeaders", 5003)
setup += ("INSERT INTO ParameterDependencies (ParameterID, ConfigurationGroup, ConfigurationKey, Operator, "
          "ConfigurationValue) VALUES ('LShufModdedIn', 'Game', 'LShufIncludeModded', 'Equals', 1);\n")
setup += ("INSERT INTO DomainValues (Domain, Value, Name, Description, SortIndex) SELECT 'LShufLeaders', "
          "'|' || LeaderType || '|', LeaderName, LeaderName, 100 FROM Leaders WHERE Domain = 'StandardLeaders' AND "
          "LeaderType LIKE 'LEADER_%';\n")
setup += ("INSERT INTO DomainValues (Domain, Value, Name, Description, SortIndex) SELECT 'LShufLeadersPlain', "
          "LeaderType, LeaderName, LeaderName, 100 FROM Leaders WHERE Domain = 'StandardLeaders' AND "
          "LeaderType LIKE 'LEADER_%';\n")
setup += ("INSERT INTO DomainValues (Domain, Value, Name, Description, SortIndex) SELECT 'LShufModded', "
          "'|' || LeaderType || '|', LeaderName, LeaderName, 100 FROM Leaders WHERE Domain = 'StandardLeaders' AND "
          f"LeaderType IN ({', '.join(repr(l) for l in MODDED_STANDINS)});\n")
w("data/setup-params.sql", setup)

text = ""
for tag, s in [("LOC_LSHUF_P13_LEADERS", "Probe: leaders in the deal (marked)"),
               ("LOC_LSHUF_P13_LEADERS_PLAIN", "Probe: leaders in the deal (plain)"),
               ("LOC_LSHUF_P13_INCLUDE_MODDED", "Probe: include modded leaders"),
               ("LOC_LSHUF_P13_MODDED", "Probe: modded leaders in the deal")]:
    for t, v in [(tag, s), (tag + "_DESC", s)]:
        text += f"INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text) VALUES ('en_US', '{t}', '{v}');\n"
w("text/setup-text.sql", text)


def cfg(kind, key, value):
    return (f"<{kind}><Group>Game</Group><ConfigurationId>{key}</ConfigurationId>"
            f"<Value>{value}</Value></{kind}>")


criteria = []
for l in leaders:
    criteria.append((f"MK:{l}", cfg("ConfigurationValueContains", "LShufExcludedLeaders", f"|{l}|")))
    criteria.append((f"PL:{l}", cfg("ConfigurationValueContains", "LShufExcludedLeadersPlain", l)))
for l in MODDED_STANDINS:
    criteria.append((f"MD:{l}", cfg("ConfigurationValueContains", "LShufExcludedModdedLeaders", f"|{l}|")))
for v in ["1", "true"]:
    criteria.append((f"INC:{v}", cfg("ConfigurationValueMatches", "LShufIncludeModded", v)))

crit_xml, group_xml = [], []
for i, (tag, xml) in enumerate(criteria):
    cid = f"c{i:03d}"
    crit_xml.append(f'\t\t<Criteria id="{cid}">\n\t\t\t{xml}\n\t\t</Criteria>')
    w(f"data/hits/{cid}.sql", f"INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('{tag}');\n")
    group_xml.append(
        f'\t\t<ActionGroup id="lshuf-probe-acc-{cid}" scope="game" criteria="{cid}">\n'
        f'\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>\n'
        f'\t\t\t<Actions><UpdateDatabase><Item>data/hits/{cid}.sql</Item></UpdateDatabase></Actions>\n'
        f'\t\t</ActionGroup>')
w("data/hits-table.sql", "CREATE TABLE IF NOT EXISTS LShufProbeHits (Tag TEXT PRIMARY KEY NOT NULL);\n"
  "INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('ALWAYS');\n")

w("lshuf-probe-accordion.modinfo", f"""<?xml version="1.0" encoding="utf-8"?>
<Mod id="lshuf-probe-accordion" version="1" xmlns="ModInfo">
\t<Properties>
\t\t<Name>Leader Shuffle probe: leader accordions</Name>
\t\t<Description>Probe 13 for the spec. Not for release.</Description>
\t\t<Authors>tower</Authors>
\t\t<Package>Mod</Package>
\t\t<AffectsSavedGames>1</AffectsSavedGames>
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
\t\t<ActionGroup id="lshuf-probe-acc-shell" scope="shell" criteria="always">
\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>
\t\t\t<Actions>
\t\t\t\t<UpdateDatabase><Item>data/setup-params.sql</Item></UpdateDatabase>
\t\t\t\t<UpdateText><Item>text/setup-text.sql</Item></UpdateText>
\t\t\t</Actions>
\t\t</ActionGroup>
\t\t<ActionGroup id="lshuf-probe-acc-game" scope="game" criteria="always">
\t\t\t<Properties><LoadOrder>100</LoadOrder></Properties>
\t\t\t<Actions><UpdateDatabase><Item>data/hits-table.sql</Item></UpdateDatabase></Actions>
\t\t</ActionGroup>
{chr(10).join(group_xml)}
\t</ActionGroups>
</Mod>
""")
print(f"wrote {OUT}: {len(criteria)} criteria groups, {len(leaders)} leaders")
