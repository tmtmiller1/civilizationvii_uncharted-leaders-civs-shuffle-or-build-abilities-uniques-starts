// Dev-only ESLint flat config. Not shipped.
//
// The game's JS engine throws a SyntaxError on `??` mixed with `&&` or `||` without parentheses, which
// `node --check` lets through (probe 11). no-mixed-operators with the three in one group rejects it everywhere.

// @eslint/js ships with eslint itself, so it needs no entry of its own in package.json.
import js from "@eslint/js";

const ENGINE_GLOBALS = {
  // Civ7 true globals used without importing (see civ7-modding-docs/06).
  Game: "readonly",
  GameContext: "readonly",
  Players: "readonly",
  GameInfo: "readonly",
  GameplayMap: "readonly",
  RevealedStates: "readonly",
  Configuration: "readonly",
  Network: "readonly",
  Locale: "readonly",
  Database: "readonly",
  Controls: "readonly",
  Units: "readonly",
  Cities: "readonly",
  Constructibles: "readonly",
  Districts: "readonly",
  GrowthTypes: "readonly",
  ProductionKind: "readonly",
  Modding: "readonly",
  UI: "readonly",
  Input: "readonly",
  WorldUI: "readonly",
  Camera: "readonly",
  InterpolationFunc: "readonly",
  KeyframeFlag: "readonly",
  PlacementMode: "readonly",
  UniqueQuarterTypes: "readonly",
  InterfaceMode: "readonly",
  Audio: "readonly",
  GameTutorial: "readonly",
  Chart: "readonly",
  HallofFame: "readonly",
  // The save list, which names the user folder the Hall of Fame file lives in.
  GameStateStorage: "readonly",
  SaveLocationCategories: "readonly",
  SaveLocationOptions: "readonly",
  SaveLocations: "readonly",
  SaveTypes: "readonly",
  SaveFileTypes: "readonly",
  Loading: "readonly",
  Coherent: "readonly",
  Component: "readonly",
  DiplomacyActionTypes: "readonly",
  YieldTypes: "readonly",
  ProgressionTreeNodeState: "readonly",
  UIViewExperience: "readonly",
  VictoryManager: "readonly",
  SerialBase: "readonly",
  DiplomacyPlayerRelationships: "readonly",
  InputActionStatuses: "readonly",
  PlayerOperationTypes: "readonly",
  GameValueStepTypes: "readonly",
  DomainType: "readonly",
  ContextManager: "readonly",
  engine: "readonly",
  PlayerIds: "readonly",
  GameSetup: "readonly",
  GameSetupDomainValueInvalidReason: "readonly",
  GameStateTypes: "readonly",
  GameValueDisplayTypes: "readonly",
  Autoplay: "readonly"
};

const BROWSER_GLOBALS = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  HTMLElement: "readonly",
  URL: "readonly",
  navigator: "readonly",
  Proxy: "readonly",
  globalThis: "readonly",
  structuredClone: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  MutationObserver: "readonly",
  ResizeObserver: "readonly",
  getComputedStyle: "readonly",
  performance: "readonly",
  requestIdleCallback: "readonly",
  Blob: "readonly",
  FileReader: "readonly",
  DOMParser: "readonly",
  Node: "readonly",
  SVGElement: "readonly",
  btoa: "readonly",
  atob: "readonly",
  XMLHttpRequest: "readonly"
};

const NODE_GLOBALS = {
  process: "readonly",
  console: "readonly",
  globalThis: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  structuredClone: "readonly",
  performance: "readonly"
};

const NULLISH_MIX = [
  "error",
  { groups: [["??", "&&", "||"]], allowSamePrecedence: false }
];

const SHARED_RULES = {
  ...js.configs.recommended.rules,
  "no-mixed-operators": NULLISH_MIX,
  "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  eqeqeq: ["error", "always", { null: "ignore" }],
  "max-len": [
    "error",
    { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }
  ]
};

// Shipped code (ui/, shared/) also gets the size limits.
const SHIPPED_RULES = {
  ...SHARED_RULES,
  complexity: ["error", 12],
  "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],
  "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
  "max-params": ["error", 5],
  "max-depth": ["error", 4]
};

export default [
  { ignores: ["node_modules/**", "devtools/**", "tests/fixtures/db/**"] },
  {
    files: ["ui/**/*.js", "shared/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...ENGINE_GLOBALS, ...BROWSER_GLOBALS }
    },
    rules: SHIPPED_RULES
  },
  {
    files: ["tests/**/*.mjs", "scripts/**/*.mjs", "tests/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...NODE_GLOBALS, ...ENGINE_GLOBALS, ...BROWSER_GLOBALS }
    },
    rules: SHARED_RULES
  }
];
