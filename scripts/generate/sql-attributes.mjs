// Deal step 3: attribute cards (every attribute mode but Swap whole leaders), one unrolled step per slot.
import { SALT } from "../../shared/lshuf-key.js";
import { ATTR_FILL_CAP, ATTR_REPAIR_CAP, ATTR_STEP_CAP } from "../../shared/deal/lshuf-deal-util.js";
import { CFG, header, key, rankUpdate, work } from "./sql-util.mjs";

function deck() {
  return `${work("LShufWork_ACard", "CardId TEXT PRIMARY KEY, FromLeader TEXT, TraitType TEXT, Rank INTEGER, K INTEGER, Ord INTEGER")}
INSERT INTO LShufWork_ACard (CardId, FromLeader, TraitType)
  SELECT lt.LeaderType || '|' || lt.TraitType, lt.LeaderType, lt.TraitType
  FROM LeaderTraits lt JOIN LShufWork_Pool p ON p.Axis = 'T' AND p.LeaderType = lt.LeaderType
  WHERE lt.TraitType IN (SELECT TraitType FROM LShufAttributeTraits) AND ${CFG("IsPaired")} = 0;
${rankUpdate("LShufWork_ACard", "Rank", [], [["CardId"]])}
UPDATE LShufWork_ACard SET K = ${key(SALT.Attributes, "Rank")};
${rankUpdate("LShufWork_ACard", "Ord", [], [["K"], ["CardId"]])}
${work("LShufWork_ASlot", "LeaderType TEXT, TraitType TEXT, J INTEGER, K INTEGER, Ord INTEGER, PRIMARY KEY (LeaderType, TraitType)")}
INSERT INTO LShufWork_ASlot (LeaderType, TraitType, K) SELECT c.FromLeader, c.TraitType, p.K
  FROM LShufWork_ACard c JOIN LShufWork_Pool p ON p.Axis = 'TS' AND p.LeaderType = c.FromLeader;
${rankUpdate("LShufWork_ASlot", "J", ["LeaderType"], [["TraitType"]])}
${rankUpdate("LShufWork_ASlot", "Ord", [], [["J"], ["K"], ["LeaderType"]])}
${work("LShufWork_ADealt", "Ord INTEGER PRIMARY KEY, LeaderType TEXT, CardId TEXT")}
`;
}

// The next open slot takes the first card in deck order that isn't dealt and whose kind its leader doesn't hold
// yet, another leader's card first. No such card leaves the slot empty (CardId NULL).
function stepView() {
  return `DROP VIEW IF EXISTS LShufWork_NextASlot;
CREATE VIEW LShufWork_NextASlot AS SELECT s.Ord AS Ord, s.LeaderType AS LeaderType, a.CardId AS CardId
  FROM (SELECT x.Ord, x.LeaderType FROM LShufWork_ASlot x
    WHERE NOT EXISTS (SELECT 1 FROM LShufWork_ADealt d WHERE d.Ord = x.Ord) ORDER BY x.Ord LIMIT 1) s
  LEFT JOIN LShufWork_ACard a ON NOT EXISTS (SELECT 1 FROM LShufWork_ADealt d WHERE d.CardId = a.CardId)
    AND a.TraitType NOT IN (SELECT b.TraitType FROM LShufWork_ADealt d JOIN LShufWork_ACard b ON b.CardId = d.CardId
      WHERE d.LeaderType = s.LeaderType)
  ORDER BY CASE WHEN a.FromLeader = s.LeaderType THEN 1 ELSE 0 END, a.Ord
  LIMIT 1;
`;
}

function steps() {
  const one = "INSERT INTO LShufWork_ADealt (Ord, LeaderType, CardId) SELECT Ord, LeaderType, CardId FROM LShufWork_NextASlot;";
  return Array.from({ length: ATTR_STEP_CAP }, () => one).join("\n");
}

// After the pass: each undealt card (deck order, ATTR_REPAIR_CAP tries) swaps with the first dealt card (slot
// order) that can move to an empty slot of another leader, with no kind held twice on either side.
function repairView() {
  const holds = (leader, trait, extra = "") => `EXISTS (SELECT 1 FROM LShufWork_ADealt d JOIN LShufWork_ACard b ON b.CardId = d.CardId
      WHERE d.LeaderType = ${leader} AND b.TraitType = ${trait}${extra})`;
  return `${work("LShufWork_ATried", "CardId TEXT PRIMARY KEY")}
${work("LShufWork_ARep", "U TEXT, COrd INTEGER, CCard TEXT, SOrd INTEGER")}
DROP VIEW IF EXISTS LShufWork_NextRepair;
CREATE VIEW LShufWork_NextRepair AS SELECT u.CardId AS U, p.COrd AS COrd, p.CCard AS CCard, p.SOrd AS SOrd
  FROM (SELECT a.CardId, a.TraitType FROM LShufWork_ACard a
    WHERE NOT EXISTS (SELECT 1 FROM LShufWork_ADealt d WHERE d.CardId = a.CardId)
      AND NOT EXISTS (SELECT 1 FROM LShufWork_ATried t WHERE t.CardId = a.CardId) ORDER BY a.Ord LIMIT 1) u
  LEFT JOIN (SELECT c.Ord AS COrd, c.CardId AS CCard, c.LeaderType AS H, cc.TraitType AS CT, s.Ord AS SOrd, s.LeaderType AS S
    FROM LShufWork_ADealt c JOIN LShufWork_ACard cc ON cc.CardId = c.CardId
    JOIN LShufWork_ADealt s ON s.CardId IS NULL AND s.LeaderType <> c.LeaderType) p
    ON NOT ${holds("p.S", "p.CT")} AND NOT ${holds("p.H", "u.TraitType", " AND d.Ord <> p.COrd")}
  ORDER BY p.COrd, p.SOrd LIMIT 1;
`;
}

function repairSteps() {
  const one = `DELETE FROM LShufWork_ARep;
INSERT INTO LShufWork_ARep (U, COrd, CCard, SOrd) SELECT U, COrd, CCard, SOrd FROM LShufWork_NextRepair;
INSERT OR IGNORE INTO LShufWork_ATried (CardId) SELECT U FROM LShufWork_ARep;
UPDATE LShufWork_ADealt SET CardId = (SELECT U FROM LShufWork_ARep) WHERE Ord = (SELECT COrd FROM LShufWork_ARep);
UPDATE LShufWork_ADealt SET CardId = (SELECT CCard FROM LShufWork_ARep) WHERE Ord = (SELECT SOrd FROM LShufWork_ARep);`;
  return Array.from({ length: ATTR_REPAIR_CAP }, () => one).join("\n");
}

// Last: each slot still empty (slot order, ATTR_FILL_CAP steps) takes the first leftover card in deck order, a kind
// its leader doesn't hold first, then another leader's card first, even if the card repeats a kind.
function fillSteps() {
  const slot = "LShufWork_AFill";
  const held = `EXISTS (SELECT 1 FROM LShufWork_ADealt d JOIN LShufWork_ACard b ON b.CardId = d.CardId
          WHERE d.LeaderType = ${slot}.LeaderType AND b.TraitType = a.TraitType)`;
  const one = `DELETE FROM ${slot};
INSERT INTO ${slot} (Ord, LeaderType) SELECT x.Ord, x.LeaderType FROM LShufWork_ADealt x WHERE x.CardId IS NULL
  AND NOT EXISTS (SELECT 1 FROM LShufWork_AFillTried t WHERE t.Ord = x.Ord) ORDER BY x.Ord LIMIT 1;
UPDATE ${slot} SET CardId = (SELECT r.CardId FROM (SELECT a.CardId AS CardId, CASE WHEN ${held} THEN 1 ELSE 0 END AS H,
      CASE WHEN a.FromLeader = ${slot}.LeaderType THEN 1 ELSE 0 END AS Own, a.Ord AS Ord FROM LShufWork_ACard a
      WHERE NOT EXISTS (SELECT 1 FROM LShufWork_ADealt d WHERE d.CardId = a.CardId)) r
    ORDER BY r.H, r.Own, r.Ord LIMIT 1);
INSERT OR IGNORE INTO LShufWork_AFillTried (Ord) SELECT Ord FROM ${slot};
UPDATE LShufWork_ADealt SET CardId = (SELECT CardId FROM ${slot}) WHERE Ord = (SELECT Ord FROM ${slot}) AND (SELECT CardId FROM ${slot}) IS NOT NULL;`;
  return `${work(slot, "Ord INTEGER, LeaderType TEXT, CardId TEXT")}
${work("LShufWork_AFillTried", "Ord INTEGER PRIMARY KEY")}
${Array.from({ length: ATTR_FILL_CAP }, () => one).join("\n")}`;
}

export function attributesSql() {
  return [header("Deal step 3: attribute cards"), deck(), stepView(), steps(), repairView(), repairSteps(), fillSteps()].join("\n");
}
