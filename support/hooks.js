"use strict";
/**
 * support/hooks.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP / TEARDOWN
 *
 * Lifecycle hooks executed around every scenario:
 *
 *  BeforeAll  ─ launch one shared Chromium browser (headless)
 *  Before     ─ open a fresh BrowserContext+Page per scenario; tag metadata
 *  After      ─ screenshot on failure, then close the context
 *  AfterAll   ─ close the browser process
 *
 * Using one browser + per-scenario contexts keeps the suite fast while
 * ensuring full isolation (cookies, localStorage, route intercepts).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  BeforeAll,
  AfterAll,
  Before,
  After,
  Status,
} = require("@cucumber/cucumber");
const { chromium } = require("@playwright/test");

// ── Shared browser (one per test run) ───────────────────────────────────────
let sharedBrowser = null;

BeforeAll({ timeout: 60_000 }, async function () {
  sharedBrowser = await chromium.launch({
    headless: false,
    slowMo: 100, // slight delay so you can follow what's happening
  });
  console.log("[BeforeAll] Chromium launched.");
});

// ── Per-scenario setup ──────────────────────────────────────────────────────
Before({ timeout: 30_000 }, async function (scenario) {
  // Make the shared browser accessible via `this.browser` in step definitions.
  this.browser = sharedBrowser;

  // Fresh context = isolated localStorage, cookies, and network intercepts.
  this.context = await sharedBrowser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Log all console errors from the page to help diagnose test failures.
    logger: {
      isEnabled: () => false,
    },
  });

  this.page = await this.context.newPage();

  // Capture browser-side console errors for debugging.
  this.page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.warn(`[Browser console.error] ${msg.text()}`);
    }
  });

  // Store scenario metadata for use in steps or reporting.
  this.scenarioName = scenario.pickle.name;
  this.tags = scenario.pickle.tags.map((t) => t.name);

  // Reset per-scenario state.
  this.download = null;
  this.capturedRequests = [];

  console.log(`[Before] Scenario: "${this.scenarioName}"`);
});

// ── Per-scenario teardown ───────────────────────────────────────────────────
After({ timeout: 30_000 }, async function (scenario) {
  const result = scenario.result;

  // On failure: attach a full-page screenshot to the Cucumber report.
  if (result && result.status === Status.FAILED && this.page) {
    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      this.attach(screenshot, "image/png");
      console.warn(
        `[After] ❌ Scenario FAILED: "${this.scenarioName}" — screenshot attached.`,
      );
    } catch (screenshotErr) {
      console.warn(
        "[After] Could not capture screenshot:",
        screenshotErr.message,
      );
    }
  }

  // Close the context (frees all pages and network intercepts).
  if (this.context) {
    await this.context.close();
    this.context = null;
    this.page = null;
  }
});

// ── Global teardown ─────────────────────────────────────────────────────────
AfterAll({ timeout: 30_000 }, async function () {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    console.log("[AfterAll] Chromium closed.");
  }
});
