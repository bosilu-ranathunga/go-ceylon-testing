const { Given, When, Then } = require("@cucumber/cucumber");
const assert = require("assert");
const BASE_URL =
  process.env.BASE_URL || "https://go-ceylon-frontend.vercel.app";
const LOGIN_PATH = process.env.LOGIN_PATH || "/login";

// NOTE: No Before/After hooks here — the shared browser is managed by
// support/hooks.js which launches a single headless Chromium instance and
// provides this.page for every scenario.  Adding a separate chromium.launch()
// here caused a second headed Chrome window to open for every scenario.

Given("the user is on the login page", async function () {
  let response = await this.page.goto(`${BASE_URL}${LOGIN_PATH}`, {
    waitUntil: "domcontentloaded",
  });

  // Fallback for hosts that 404 on deep-link routes
  if (!response || response.status() >= 400) {
    response = await this.page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
    });
  }

  await this.page.waitForSelector("#email", { timeout: 10000 });
  await this.page.waitForSelector("#password", { timeout: 10000 });
});

When("the user enters valid username and password", async function () {
  await this.page.fill("#email", "rabjinajith@gmail.com");
  await this.page.fill("#password", "123");
});

When("clicks the login button", async function () {
  await this.page.click('button[type="submit"]');
});

Then("the user should see the dashboard", async function () {
  await this.page.waitForURL(/user|dashboard/i, { timeout: 10000 });
  const currentUrl = this.page.url();
  assert(
    currentUrl.includes("user") || currentUrl.includes("dashboard"),
    `Expected to be on dashboard/user page, but got: ${currentUrl}`,
  );
});
