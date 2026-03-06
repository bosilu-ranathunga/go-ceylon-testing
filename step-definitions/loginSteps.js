const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const assert = require('assert');
const BASE_URL = process.env.BASE_URL || 'https://go-ceylon-frontend.vercel.app';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';

const USER_EMAIL = process.env.USER_EMAIL || 'rabjinajith@gmail.com';
const USER_PASSWORD = process.env.USER_PASSWORD || '123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const BUSINESS_EMAIL = process.env.BUSINESS_USER_EMAIL || 'dilmi@gmail.com';
const BUSINESS_PASSWORD = process.env.BUSINESS_USER_PASSWORD || '123';

let browser;
let page;

const roleCredentials = {
    user: { email: USER_EMAIL, password: USER_PASSWORD },
    admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    business: { email: BUSINESS_EMAIL, password: BUSINESS_PASSWORD },
};

const roleDestinationRegex = {
    user: /\/user\/?|dashboard/i,
    admin: /\/admin\/dashboard\/?/i,
    business: /\/business\/?/i,
};

const fillCredentialsForRole = async (role) => {
    const creds = roleCredentials[role];
    assert(creds, `Unsupported login role: ${role}`);

    await page.fill('#email', creds.email);
    await page.fill('#password', creds.password);
};

const assertRedirectForRole = async (role) => {
    const expectedRegex = roleDestinationRegex[role];
    assert(expectedRegex, `Unsupported login role: ${role}`);

    await page.waitForURL(expectedRegex, { timeout: 15000 });
    const currentUrl = page.url();
    assert(expectedRegex.test(currentUrl), `Expected ${role} to land on matching route, but got: ${currentUrl}`);
};

Before({ tags: '@login' }, async () => {
    browser = await chromium.launch({ headless: process.env.CI ? true : false });
    page = await browser.newPage();
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
    await fillCredentialsForRole('user');
});

When('the admin enters valid username and password', async () => {
    await fillCredentialsForRole('admin');
});

When('the business user enters valid username and password', async () => {
    await fillCredentialsForRole('business');
});

When('clicks the login button', async () => {
    await page.click('button[type="submit"]');
});

Then('the user should see the dashboard', async () => {
    await assertRedirectForRole('user');
});

Then('the admin should see the dashboard', async () => {
    await assertRedirectForRole('admin');
});

Then('the business user should see the dashboard', async () => {
    await assertRedirectForRole('business');
});

After({ tags: '@login' }, async () => {
    if (browser) {
        await browser.close();
    }
});