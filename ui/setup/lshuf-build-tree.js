// The civics tree drawn in the civ build screen's detail pane when a Unique civics card is shown (CONTRACTS 18):
// the civ's own civics as the game's tree screen lays them out, one column per step along the prerequisite chain,
// each civic a box with its name, culture cost and what it unlocks (traditions, buildings, quarters, improvements,
// a civics-only unit) with the game's icons, and lines from each civic to the ones it needs. Data: the setup
// copy's LShufSetup_CivicNodes and LShufSetup_CivCivics, the shell's Traditions and CivilizationItems.

import { el } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import { compose } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-query.js";
import { civicsTreeData } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-civics.js";

const stylize = (text) => (Locale.stylize ? Locale.stylize(text) : text);

function nodeBox(node, picked) {
  const box = el("div", "lshuf-tree__node flex flex-col");
  if (picked) box.classList.add("lshuf-tree__node--picked");
  box.setAttribute("data-node", node.node);
  const title = el("div", "lshuf-tree__node-name font-title text-sm uppercase text-secondary");
  title.textContent = node.name;
  const cost = el("div", "lshuf-tree__node-cost font-body text-xs text-accent-2");
  cost.innerHTML = stylize(compose("LOC_LSHUF_TREE_COST", String(node.cost || 0)));
  box.append(title, cost);
  for (const line of node.unlocks) {
    const row = el("div", "lshuf-tree__unlock font-body text-xs");
    row.innerHTML = stylize(line);
    box.appendChild(row);
  }
  return box;
}

// An L-shaped line from the right middle of `from` to the left middle of `to`, in the canvas's coordinates.
function connector(canvas, from, to) {
  const c = canvas.getBoundingClientRect();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const x1 = a.right - c.left;
  const y1 = a.top + a.height / 2 - c.top;
  const x2 = b.left - c.left;
  const y2 = b.top + b.height / 2 - c.top;
  const xm = (x1 + x2) / 2;
  const seg = (left, top, width, height) => {
    const d = el("div", "lshuf-tree__line");
    d.style.left = `${left}px`;
    d.style.top = `${top}px`;
    d.style.width = `${Math.max(2, width)}px`;
    d.style.height = `${Math.max(2, height)}px`;
    canvas.appendChild(d);
  };
  seg(x1, y1, xm - x1, 2);
  seg(xm, Math.min(y1, y2), 2, Math.abs(y2 - y1));
  seg(xm, y2, x2 - xm, 2);
}

// The tree for one civilization, or null when the setup copy has no nodes for it. pickedNode: the civic a single
// civic card stands for, drawn with a highlight.
export function renderCivicsTree(civ, treeName, pickedNode = null) {
  const data = civicsTreeData(civ);
  if (!data.length) return null;
  const root = el("div", "lshuf-tree flex flex-col");
  const head = el("div", "lshuf-tree__title font-title text-lg uppercase text-secondary mb-2");
  head.textContent = treeName;
  root.appendChild(head);
  const canvas = el("div", "lshuf-tree__canvas relative flex flex-row items-start");
  const depths = [...new Set(data.map((n) => n.depth))].sort((a, b) => a - b);
  const boxes = new Map();
  for (const d of depths) {
    const col = el("div", "lshuf-tree__column flex flex-col");
    for (const node of data.filter((n) => n.depth === d)) {
      const box = nodeBox(node, node.node === pickedNode);
      boxes.set(node.node, box);
      col.appendChild(box);
    }
    canvas.appendChild(col);
  }
  root.appendChild(canvas);
  // The lines need the boxes on screen first.
  requestAnimationFrame(() => {
    try {
      for (const node of data) {
        for (const pre of node.prereqs) {
          if (boxes.has(pre) && boxes.has(node.node)) connector(canvas, boxes.get(pre), boxes.get(node.node));
        }
      }
    } catch (e) {
      console.warn(`[lshuf-build] tree lines failed: ${e}`);
    }
  });
  return root;
}
