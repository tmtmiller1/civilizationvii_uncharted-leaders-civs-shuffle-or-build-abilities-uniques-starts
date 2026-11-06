// Registers tests/loader.mjs so /re-dealable-leader-abilities-attributes-and-start-biases/... imports resolve to this
// checkout. Use with `node --import ./tests/register-loader.mjs <file>`.
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
