// A small, forgiving XML reader for the Civ VII data files leader mods ship (Database, GameEffects, ModInfo).
// It builds a plain tree: { name, attrs, children, text }. Comments, processing instructions and DOCTYPE are
// skipped; CDATA and the five standard entities are read as text. Namespaces are kept as part of the name.

const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return e in ENTITIES ? ENTITIES[e] : m;
  });
}

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1]] = decodeEntities(m[3] !== undefined ? m[3] : m[4]);
  return attrs;
}

export function parseXml(source) {
  const text = String(source).replace(/^\uFEFF/, "");
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  let i = 0;
  const top = () => stack[stack.length - 1];
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) {
      top().text += decodeEntities(text.slice(i));
      break;
    }
    if (lt > i) top().text += decodeEntities(text.slice(i, lt));
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      top().text += text.slice(lt + 9, end < 0 ? text.length : end);
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<?", lt)) {
      const end = text.indexOf("?>", lt + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith("<!", lt)) {
      const end = text.indexOf(">", lt + 2);
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    // Find the end of the tag, skipping quoted attribute values.
    let j = lt + 1;
    let quote = null;
    while (j < text.length) {
      const c = text[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
      j++;
    }
    const inner = text.slice(lt + 1, j);
    i = j + 1;
    if (inner.startsWith("/")) {
      const name = inner.slice(1).trim();
      // Pop to the matching open tag; tolerate stray closers.
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameMatch = body.match(/^\s*([^\s/>]+)/);
    if (!nameMatch) continue;
    const node = { name: nameMatch[1], attrs: parseAttrs(body.slice(nameMatch[0].length)), children: [], text: "" };
    top().children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root;
}

export const childrenNamed = (node, name) => node.children.filter((c) => c.name === name);
export const firstChild = (node, name) => node.children.find((c) => c.name === name) || null;

// Every descendant (depth first) with this element name.
export function findAll(node, name, out = []) {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}
