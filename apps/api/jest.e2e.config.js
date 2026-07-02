/**
 * E2E config — reuses the unit config (transform, shared-package mapper,
 * rootDir) but targets *.e2e-spec.ts and allows longer boots (app + DB + Redis).
 * @type {import('jest').Config}
 */
module.exports = {
  ...require("./jest.config.js"),
  testRegex: ".e2e-spec.ts$",
  testTimeout: 30000,
};
