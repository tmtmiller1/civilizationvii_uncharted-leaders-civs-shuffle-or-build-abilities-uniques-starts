# Modded leaders

Scanned 2026-11-06 with [devtools/modded-leaders/scan.py](../devtools/modded-leaders/scan.py) over the 204 leader mods
in the reference corpus (tp-share, last topped up 2026-10-26). The full list, one mod per line with its leaders, class
and the scripts that decided it, is [modded-leaders.tsv](../devtools/modded-leaders/modded-leaders.tsv). Everything here
was read from the mods' files; none of it has been watched in a game.

## Why a list

A modded leader's ability can live partly in scripts that check the player's leader type (`leaderType ===
LEADER_AMIYACORE` in Amiya's, for example). Moving the ability's data to another leader leaves that scripted part
behind with the original leader. Nothing in the game's database shows which leaders do this: the scripted mods use
ordinary modifiers and ordinary `[LI]` bullets like everyone else, and a script in our mod can't read another mod's
code. So the scan reads the mods' files ahead of time and the mod ships what it found.

## What the scan found

| Class | Mods | Meaning | Could be dealt whole |
| --- | --- | --- | --- |
| data | 69 | No scripts besides portrait registration (`leader-register.js`) | Yes |
| cosmetic | 80 | Scripts that don't change the game (portraits, toasts, screens); no requests, grants or writes | Yes |
| scripted | 44 | A script that changes the game and names the mod's own leader or compares `leaderType` | No |
| unclear | 11 | A script that changes the game without naming the leader | No, to be safe |

301 leaders across 201 mods; 3 mods declare their leader in a way the scan doesn't read and count as unknown. Of the 40
most-subscribed leader mods, 32 could have been dealt whole.

## Decision

On 2026-11-06 the owner first chose that all modded leaders play as shipped, since a list kept by scanning goes stale.
Probe 12 then showed the setup screen can read an installed mod's modinfo and scripts live, so the same day the owner
added the 25 leader mods below to a list: a listed leader is dealt only when a check on the player's own files passes at
setup. Unlisted leaders still play as shipped. SPEC.md section 3, "Modded leaders", has the rules; the scan above is how
the 25 were found.

## Leaders built like the base game's

Asked 2026-11-06: which popular modded leaders are structured the way base leaders are, so they could be dealt like
DLC leaders? The "data" class is the starting point: these mods ship no scripts at all, only portrait registration.
For the 25 most-subscribed of them (Remilia Scarlet, Qin Shi Huang (FGO), Oda Nobunaga (FGO), Youmu Konpaku, Mao Zedong,
Gilgamesh, Kaguya Houraisan, Tanya Degurechaff, Olga Marie, Yuyuko Saigyouji, Nearl, Flandre Scarlet, Patchouli
Knowledge, Bocchi, Astolfo, Okita Souji, Eirin Yagokoro, the Witch Trial pack, Yamada Ryo, Alice Margatroid, Cirno 2.0,
Hieda no Akyuu, Koishi Komeiji, Wu Zetian (FGO), Aya Shameimaru), read from their files:

- The ability is a trait with ordinary modifiers, as in the base game.
- Each uses `REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES` about six times, for which civs the leader unlocks and for its
  leader-level reward cards (Remilia: `REQSET_LEADER_IS_REMILIA` on four civ unlocks, `REQSET_LEGEND_LEVEL_4/8_REMILIA` on
  reward cards). The base game does the same for its leaders (1,833 such requirements, all on challenges, triumphs and
  unlocks; none on an ability modifier), and those belong with the leader, so they stay put.
- Nothing found ties their ability modifiers to their own leader type.

These are the 25 on the list. Their mapping rows (bullet to modifiers) are reviewed by hand, as for DLC leaders.
