// The shuffle covers every player in games of every size the game offers (2 to 12 players, MapSizes): each leader
// in the game is dealt, nobody outside it is touched, and the JS preview equals the game's SQL. The civilization
// rows deal over every civilization of the age whatever the player count, so they ride along on Split up.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { DEAL_MODES, runBoth, SPLIT_MODES, WHOLE_MODES } from "./_deal.mjs";
import { CC_MODE, CU_MODE } from "../shared/lshuf-constants.js";
import { KNOWN_LEADERS, MODDED_LEADER_TYPES } from "../shared/lshuf-known-leaders.js";

const SIZES = [2, 3, 4, 6, 8, 10, 12];
const BASE = KNOWN_LEADERS.filter((l) => !MODDED_LEADER_TYPES.includes(l));

// A different set of leaders for each size, so the sizes don't all share the same first few.
const playersFor = (n) => Array.from({ length: n }, (_, i) => BASE[(n * 3 + i * 2) % BASE.length]);

function checkWhole(o, playing, where) {
  const held = new Map();
  for (const l of o.leaders.filter((r) => playing.includes(r.LeaderType))) {
    assert.equal(l.Status, "dealt", `${where}: ${l.LeaderType} is dealt`);
    assert.ok(playing.includes(l.AbilityFrom), `${where}: ${l.LeaderType}'s ability comes from a leader in the game`);
    assert.notEqual(l.AbilityFrom, l.LeaderType, `${where}: ${l.LeaderType} got someone else's ability`);
    held.set(l.AbilityFrom, (held.get(l.AbilityFrom) || 0) + 1);
  }
  for (const l of playing) assert.equal(held.get(l), 1, `${where}: ${l}'s ability is held once`);
}

function checkSplit(o, playing, db, where) {
  const dealt = o.pieces.filter((p) => p.Kind === "bullet");
  for (const p of dealt) {
    assert.ok(playing.includes(p.LeaderType), `${where}: ${p.PieceId} went to a leader in the game`);
    assert.ok(playing.includes(p.FromLeaderType), `${where}: ${p.PieceId} came from a leader in the game`);
  }
  for (const l of playing) {
    const own = rows(db, "SELECT COUNT(*) AS n FROM LShufMapping WHERE LeaderType = ? AND Kind = 'bullet' AND COALESCE(Movable, 1) = 1", l)[0].n;
    assert.equal(dealt.filter((p) => p.LeaderType === l).length, own, `${where}: ${l} gets back as many bonuses as it gave`);
  }
}

function checkOutsiders(o, playing, where) {
  for (const l of o.leaders) {
    if (playing.includes(l.LeaderType)) continue;
    assert.equal(l.Status, "asshipped", `${where}: ${l.LeaderType} isn't in the game and plays as shipped`);
    assert.equal(l.AbilityFrom, l.LeaderType, `${where}: ${l.LeaderType} keeps its own ability`);
  }
}

for (const n of SIZES) {
  test(`${n} players: every leader in the game is shuffled, in every mode`, async () => {
    const playing = playersFor(n);
    assert.equal(new Set(playing).size, n, "distinct leaders");
    const notInGame = KNOWN_LEADERS.filter((l) => !playing.includes(l));
    for (const Mode of DEAL_MODES) {
      const where = `${n} players ${Mode}`;
      const options = { Mode, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split };
      const r = await runBoth({ spec: { seed: 11 + n, options, notInGame } });
      try {
        assertSameResult(r.js, r.sql, where);
        const o = r.objects("sql");
        assert.equal(o.meta.filter((m) => String(m.Name).startsWith("Fallback_")).length, 0, `${where}: nothing fell back`);
        if (WHOLE_MODES.includes(Mode)) checkWhole(o, playing, where);
        if (SPLIT_MODES.includes(Mode)) checkSplit(o, playing, r.run.db, where);
        checkOutsiders(o, playing, where);
        for (const l of playing) {
          assert.ok(o.attributes.some((a) => a.LeaderType === l), `${where}: ${l} holds attributes`);
        }
        assert.ok(o.civPieces.some((p) => p.Kind === "civic"), `${where}: civics were dealt`);
        assert.ok(o.civPieces.some((p) => p.Kind === "unique"), `${where}: uniques were dealt`);
        const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys("base"));
        assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
      } finally {
        r.run.close();
      }
    }
  });
}
