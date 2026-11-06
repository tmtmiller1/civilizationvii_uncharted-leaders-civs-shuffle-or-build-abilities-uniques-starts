// Workstream C's check 1 (SPEC section 3, "Modded leaders"): checkModinfoText(xml, readFile) and
// isPortraitOnlyScript(text) from ui/setup/lshuf-mod-check.js pass data-only and portrait-only mods and fail any mod
// that runs code. Fixture strings are in tests/fixtures/mod-check/cases.mjs.
//
// Assumed, as the contract doesn't fix them: readFile(path) takes the modinfo's Item path and returns a Promise of
// the file's text, or of null when it can't be read; checkModinfoText returns (or resolves to) { ok, why }, `why`
// being one of REASON.ModdedNotOK's text codes from CONTRACTS section 3.
import assert from "node:assert/strict";
import test from "node:test";

import { importShipped } from "./_harness.mjs";
import {
  EXPECTED,
  FILES,
  MODINFOS,
  PORTRAIT_SCRIPT,
  PORTRAIT_SCRIPT_PLAIN,
  SCRIPT_CODE_IN_ARGUMENT,
  SCRIPT_LISTENER_ONLY,
  SCRIPT_WITH_OTHER_CODE
} from "./fixtures/mod-check/cases.mjs";

const load = () => importShipped("ui/setup/lshuf-mod-check.js");

test("isPortraitOnlyScript", async () => {
  const { isPortraitOnlyScript } = await load();
  assert.equal(isPortraitOnlyScript(PORTRAIT_SCRIPT_PLAIN), true, "plain registerImageLeader calls");
  assert.equal(
    isPortraitOnlyScript(PORTRAIT_SCRIPT),
    true,
    "the listed MAO mods' shape: a call, then the same call inside engine.whenReady (with a BOM)"
  );
  assert.equal(isPortraitOnlyScript(SCRIPT_WITH_OTHER_CODE), false, "portraits plus an engine.on handler");
  assert.equal(isPortraitOnlyScript(SCRIPT_CODE_IN_ARGUMENT), false, "code inside the call's arguments");
  assert.equal(isPortraitOnlyScript(SCRIPT_LISTENER_ONLY), false, "no portrait call at all");
});

test("checkModinfoText on each fixture modinfo", async () => {
  const { checkModinfoText } = await load();
  const asked = [];
  const readFile = async (rel) => {
    asked.push(rel);
    return Object.prototype.hasOwnProperty.call(FILES, rel) ? FILES[rel] : null;
  };
  for (const [name, xml] of Object.entries(MODINFOS)) {
    const got = await checkModinfoText(xml, readFile);
    const want = EXPECTED[name];
    assert.equal(got?.ok, want.ok, `${name}: ok`);
    if (want.why) assert.equal(got.why, want.why, `${name}: why`);
  }
  assert.ok(asked.includes("ui/leader-register.js"), "the UIScripts file was read, not trusted by name");
  assert.ok(!asked.some((p) => p.endsWith(".png")), "image files aren't read");
});
