const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const assert = require('assert');
const BASE_URL = process.env.BASE_URL || 'https://go-ceylon-frontend.vercel.app';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';

let browser;
let page;

Before({ tags: '@login' }, async () => {
    browser = await chromium.launch({ headless: process.env.CI ? true : false });
    page = await browser.newPage();
});

After({ tags: '@login' }, async () => {
    if (browser) {
        await browser.close();
    }
});

Given('the user is on the login page', async () => {
    let response = await page.goto(`${BASE_URL}${LOGIN_PATH}`, { waitUntil: 'domcontentloaded' });

    // Fallback for hosts that 404 on deep-link routes
    if (!response || response.status() >= 400) {
        response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForSelector('#email', { timeout: 10000 });
    await page.waitForSelector('#password', { timeout: 10000 });
});

When('the user enters valid username and password', async () => {
    await page.fill('#email', 'rabjinajith@gmail.com');
    await page.fill('#password', '123');
});

When('clicks the login button', async () => {
    await page.click('button[type="submit"]');
});

Then('the user should see the dashboard', async () => {
    await page.waitForURL(/user|dashboard/i, { timeout: 10000 });
    const currentUrl = page.url();
    assert(
        currentUrl.includes('user') || currentUrl.includes('dashboard'),
        `Expected to be on dashboard/user page, but got: ${currentUrl}`
    );
});