// Stand-in for every /core/ and /base-standard/ module a shipped file imports. Tests that need behaviour set the
// globals they use before importing the module under test.
export default class {}
export const ComponentRegistry = { get: () => null, register: () => {} };
