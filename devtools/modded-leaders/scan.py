"""Classify the leader mods in the reference corpus: can each leader be dealt whole, or does a script tie part of its
ability to its own leader type?

Run: python3 -I scan.py [--top N]
Reads the corpus on tp-share and the Workshop cache; writes modded-leaders.tsv beside this script and prints a summary.

Classes:
  data        no scripts besides portrait registration; the ability is all data and deals whole
  cosmetic    scripts, but none that changes the game (no requests, grants or writes); deals whole
  scripted    a script that changes the game and names the mod's own leader or compares leaderType; the scripted
              part stays with the leader, so the leader plays as shipped
  unclear     a script that changes the game without naming the leader; treated like scripted
"""
import glob
import json
import os
import re
import sys

ROOT = "/Volumes/tp-share/Repos_Mine/civilization_vii_reference_mods"
# The workspace this mod sits in (<workspace>/tower_mods_in_dev/<mod>/devtools/modded-leaders); LSHUF_WORKSPACE overrides.
REPO = os.environ.get("LSHUF_WORKSPACE") or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
DOSSIERS = f"{REPO}/other_peoples_mods_analysis/mod-dossiers"
WORKSHOP = f"{REPO}/other_peoples_mods_analysis/_workshop-cache/details.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modded-leaders.tsv")

LEADER_DECL = [
    # A LEADER_ id written shortly before KIND_LEADER in the same row, in XML or SQL, any case.
    re.compile(r"""['"](LEADER_\w+)['"][^'"\n<>]{0,40}['"]KIND_LEADER['"]"""),
    re.compile(r"""KIND_LEADER['"][^'"\n<>]{0,40}['"](LEADER_\w+)['"]"""),
    re.compile(r"<Type>(LEADER_\w+)</Type>\s*<Kind>KIND_LEADER</Kind>"),
]
WRITES = re.compile(
    r"sendRequest|Game\.\w+Operations|\.addYield|\.changeGold|\.grant\w*\(|WorldBuilder|\.setTerrain"
    r"|Players\.get\([^)]*\)\.\w+\.(?:add|change|set|remove)\w*\(|createUnit|Units\.create"
)


def leader_mods():
    for f in glob.glob(f"{DOSSIERS}/*.md"):
        t = open(f, encoding="utf-8").read()
        m = re.search(r"^\| (?:gameplay|frontend) \| Leaders \| (\d+) \|", t, re.M)
        if m and int(m.group(1)) > 0:
            yield os.path.basename(f)[:-3]


def scan(mid):
    d = os.path.join(ROOT, mid)
    if not os.path.isdir(d):
        return None
    files = [p for p in glob.glob(d + "/**/*", recursive=True) if os.path.isfile(p) and "/.git/" not in p]
    read = lambda p: open(p, encoding="utf-8", errors="ignore").read()
    data = "\n".join(read(p) for p in files if p.endswith((".xml", ".sql")))
    leaders = sorted({m for rx in LEADER_DECL for m in rx.findall(data)})
    js = {os.path.relpath(p, d): read(p) for p in files if p.endswith(".js") and not p.endswith("leader-register.js")}
    changers = {p: v for p, v in js.items() if WRITES.search(v)}
    keyed = [p for p, v in changers.items() if any(l in v for l in leaders) or re.search(r"leaderType\s*[!=]==?", v)]
    if not js:
        cls = "data"
    elif not changers:
        cls = "cosmetic"
    elif keyed:
        cls = "scripted"
    else:
        cls = "unclear"
    return leaders, cls, keyed or sorted(changers)


def main():
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else None
    items = json.load(open(WORKSHOP, encoding="utf-8"))["items"]
    subs = lambda i: int(items.get(i, {}).get("subscriptions") or 0)
    mods = sorted(leader_mods(), key=subs, reverse=True)[:top]
    counts, lines = {}, []
    for mid in mods:
        r = scan(mid)
        if r is None:
            continue
        leaders, cls, files = r
        counts[cls] = counts.get(cls, 0) + 1
        title = re.sub(r"\s+", " ", items.get(mid, {}).get("title", "")).strip()
        lines.append("\t".join([mid, str(subs(mid)), title, cls, ",".join(leaders), ";".join(files)]))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("ModId\tSubscriptions\tTitle\tClass\tLeaders\tScripts\n" + "\n".join(lines) + "\n")
    print(f"{len(lines)} leader mods scanned -> {OUT}")
    print(counts)


if __name__ == "__main__":
    main()
