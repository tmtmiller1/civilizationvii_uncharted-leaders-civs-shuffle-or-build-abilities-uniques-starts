// Splits a SQL file into statements so one bad statement in a leader mod doesn't stop the rest from loading.
// Knows '...' strings (with '' escapes), "..." and [...] and `...` identifiers, -- and /* */ comments, and
// CREATE TRIGGER ... BEGIN ... END bodies.

export function splitSql(source) {
  const text = String(source).replace(/^\uFEFF/, "");
  const out = [];
  let start = 0;
  let i = 0;
  let depth = 0; // BEGIN ... END nesting inside triggers
  const n = text.length;
  const word = (at) => {
    const m = /^[A-Za-z_]+/.exec(text.slice(at, at + 16));
    return m ? m[0].toUpperCase() : "";
  };
  while (i < n) {
    const c = text[i];
    if (c === "-" && text[i + 1] === "-") {
      const e = text.indexOf("\n", i);
      i = e < 0 ? n : e + 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e < 0 ? n : e + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      let j = i + 1;
      while (j < n) {
        if (text[j] === close) {
          if (close !== "]" && text[j + 1] === close) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c) && (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]))) {
      const w = word(i);
      if (w === "BEGIN" && /CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER/i.test(text.slice(start, i))) depth++;
      else if (w === "END" && depth > 0) depth--;
      i += Math.max(w.length, 1);
      continue;
    }
    if (c === ";" && depth === 0) {
      const stmt = text.slice(start, i).trim();
      if (stmt) out.push(stmt);
      start = i + 1;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail && !/^(--[^\n]*\n?|\s|\/\*[\s\S]*?\*\/)*$/.test(tail)) out.push(tail);
  return out;
}
