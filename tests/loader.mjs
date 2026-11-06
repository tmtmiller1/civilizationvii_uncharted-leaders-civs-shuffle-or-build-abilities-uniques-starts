// Maps the game's import paths onto this checkout for tests. Engine modules (/core/..., /base-standard/...) resolve
// to tests/stubs/engine-module-stub.mjs when it exists; a test that needs a real stand-in mocks it itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const loaderDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(loaderDir, "..");
const MODULE_PREFIX = "/re-dealable-leader-abilities-attributes-and-start-biases/";
const STUB_FILE = path.join(loaderDir, "stubs", "engine-module-stub.mjs");

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith(MODULE_PREFIX)) {
    const mapped = path.join(projectRoot, specifier.slice(MODULE_PREFIX.length));
    return { url: pathToFileURL(mapped).href, shortCircuit: true };
  }
  if ((specifier.startsWith("/core/") || specifier.startsWith("/base-standard/")) && fs.existsSync(STUB_FILE)) {
    return { url: pathToFileURL(STUB_FILE).href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
