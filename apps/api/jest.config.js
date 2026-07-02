/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts", "!src/**/*.module.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  // @linkforge/shared is ESM/CJS dual-built; tests resolve its CJS output.
  // `turbo test` runs `^build` first, so dist/ is present in CI.
  moduleNameMapper: {
    "^@linkforge/shared$": "<rootDir>/../../packages/shared/dist/index.cjs",
  },
};
