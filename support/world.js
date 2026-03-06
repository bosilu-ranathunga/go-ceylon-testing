"use strict";
/**
 * support/world.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXTURES
 * Defines the Cucumber World — the shared object ("this") that every step
 * definition receives.  Playwright's browser, context and page live here so
 * all steps can access them without global state.
 *
 * The actual browser launch/teardown is done in hooks.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  World,
  setWorldConstructor,
  setDefaultTimeout,
} = require("@cucumber/cucumber");

// Global step timeout: 30 seconds per step.
setDefaultTimeout(30_000);

class BookingWorld extends World {
  constructor(options) {
    super(options);

    /**
     * Playwright objects — populated by Before/BeforeAll hooks in hooks.js.
     * @type {import('@playwright/test').Browser | null}
     */
    this.browser = null;

    /**
     * A fresh BrowserContext per scenario (isolated cookies, storage, etc.).
     * @type {import('@playwright/test').BrowserContext | null}
     */
    this.context = null;

    /**
     * The active Page used by all step definitions.
     * @type {import('@playwright/test').Page | null}
     */
    this.page = null;

    /**
     * Stores a triggered Download object for receipt-download assertions.
     * @type {import('@playwright/test').Download | null}
     */
    this.download = null;

    /**
     * Captures route-intercept details so tests can assert on what was sent.
     * Each entry: { method, url, body }
     * @type {Array<{method: string, url: string, body: string | null}>}
     */
    this.capturedRequests = [];

    /**
     * Metadata: the name of the running scenario (set by the Before hook).
     * @type {string}
     */
    this.scenarioName = "";

    /**
     * Tags applied to the running scenario (set by the Before hook).
     * @type {string[]}
     */
    this.tags = [];
  }
}

setWorldConstructor(BookingWorld);
