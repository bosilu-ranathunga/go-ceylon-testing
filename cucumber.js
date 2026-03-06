"use strict";
/**
 * cucumber.js  —  Cucumber CLI configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Three named profiles:
 *
 *   default    — runs all scenarios
 *   smoke      — runs only @smoke scenarios (fast sanity check)
 *   regression — runs only @regression scenarios (full regression suite)
 *
 * Usage:
 *   npm test                     # default profile (all scenarios)
 *   npm run test:smoke            # smoke profile
 *   npm run test:regression       # regression profile
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {Record<string, import('@cucumber/cucumber').IConfiguration>} */
const common = {
  // Load the world, hooks, mocks, and step definitions in the right order.
  require: [
    "support/world.js", // Custom World (fixtures) — must come first
    "support/hooks.js", // BeforeAll / Before / After / AfterAll
    "support/mocks.js", // Exported helpers (no Cucumber registration needed)
    "step-definitions/**/*.js",
  ],

  format: [
    // Human-readable coloured output in the terminal.
    "@cucumber/pretty-formatter",

    // Machine-readable JSON for the HTML report generator.
    // Written to reports/json/ (separate from reports/html/) so the reporter's
    // recursive file scan never picks up its own enriched-output.json.
    "json:reports/json/cucumber-report.json",

    // Summary line at the end of a run (pass/fail counts).
    "summary",
  ],

  formatOptions: {
    // Use async/await in generated step snippets (not callbacks).
    snippetInterface: "async-await",
  },

  // Run scenarios in sequence (parallel: 2+ can be enabled once tests are stable).
  parallel: 1,

  // Fail fast in CI to save time; omit locally for full output.
  failFast: !!process.env.CI,
};

module.exports = {
  // ── Profile: default (all scenarios) ──────────────────────────────────────
  default: {
    ...common,
  },

  // ── Profile: smoke (@smoke tag only) ──────────────────────────────────────
  smoke: {
    ...common,
    tags: "@smoke",
  },

  // ── Profile: regression (@regression tag only) ────────────────────────────
  regression: {
    ...common,
    tags: "@regression",
  },

  // ── Profile: traveler-only ─────────────────────────────────────────────────
  traveler: {
    ...common,
    tags: "@traveler",
  },

  // ── Profile: guide-only ───────────────────────────────────────────────────
  guide: {
    ...common,
    tags: "@guide",
  },
};
