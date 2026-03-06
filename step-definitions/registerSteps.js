const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'https://go-ceylon-frontend.vercel.app';
const REGISTER_PATH = process.env.REGISTER_PATH || '/register';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';

let browser;
let page;

// Registration page can take longer on deployed environments...
setDefaultTimeout(30 * 1000);

Before({ tags: '@register' }, async () => {
    browser = await chromium.launch({ headless: process.env.CI ? true : false });
    page = await browser.newPage();

    // Mock APIs needed by registration so scenarios are stable on hosted UI.
    await page.route('**/location', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                locations: [
                    { _id: 'loc-colombo', name: 'Colombo' },
                    { _id: 'loc-kandy', name: 'Kandy' },
                ],
            }),
        });
    });

    await page.route('**/users', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
            return;
        }
        await route.fallback();
    });

    await page.route('**/guides', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
            return;
        }
        await route.fallback();
    });

    await page.route('**/businesses', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
            return;
        }
        await route.fallback();
    });
});

After({ tags: '@register' }, async () => {
    if (browser) {
        await browser.close();
    }
});

Given('the user is on the registration page', async () => {
    let deepLinkWorked = false;

    try {
        const response = await page.goto(`${BASE_URL}${REGISTER_PATH}`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
        });

        if (response && response.status() < 400) {
            await page.waitForSelector('text=/Choose Account Type|Select Account Type/i', { timeout: 5000 });
            deepLinkWorked = true;
        }
    } catch (_error) {
        deepLinkWorked = false;
    }

    // Fallback: open home/login page and navigate via the visible Sign Up link.
    if (!deepLinkWorked) {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.getByRole('link', { name: /sign up/i }).click();
    }

    await page.waitForSelector('text=/Choose Account Type|Select Account Type/i', { timeout: 20000 });
});

When('the user selects Traveller account type', async () => {
    await page.getByText('Traveller', { exact: true }).first().click();
    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user selects Guide account type', async () => {
    await page.getByText('Guide', { exact: true }).first().click();
    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user selects Business account type', async () => {
    await page.getByText('Business', { exact: true }).first().click();
    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user enters valid registration details', async () => {
    const uniqueEmail = `traveller_${Date.now()}@example.com`;

    await page.fill('#name', 'Playwright Traveller');
    await page.fill('#email', uniqueEmail);
    await page.fill('#phone', '947712345678');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');

    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user enters valid guide personal details', async () => {
    const uniqueEmail = `guide_${Date.now()}@example.com`;

    await page.fill('#name', 'Playwright Guide');
    await page.fill('#email', uniqueEmail);
    await page.fill('#phone', '947712345678');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');

    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user enters valid business personal details', async () => {
    const uniqueEmail = `business_${Date.now()}@example.com`;

    await page.fill('#name', 'Playwright Business Owner');
    await page.fill('#email', uniqueEmail);
    await page.fill('#phone', '947712345678');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');

    await page.getByRole('button', { name: /continue/i }).click();
});

When('the user selects travel preferences and submits the form', async () => {
    await page.getByText('Beach Getaways').click();
    await page.getByRole('button', { name: /complete registration/i }).click();
});

When('the user enters valid guide specific details and submits the form', async () => {
    await page.getByText('English', { exact: true }).click();
    await page.selectOption('#gender', 'Male');
    await page.fill('#price', '50');
    await page.fill('#dob', '1995-05-15');
    await page.selectOption('#location', ['loc-colombo']);
    await page.getByRole('button', { name: /complete registration/i }).click();
});

When('the user enters valid business specific details and submits the form', async () => {
    await page.fill('#companyName', 'Playwright Travels Pvt Ltd');
    await page.selectOption('#businessType', 'Travel Agency');
    await page.selectOption('#employeeCount', '11-50');
    await page.getByRole('button', { name: /complete registration/i }).click();
});

Then('the user should see the registration success message', async () => {
    await page.waitForSelector('text=Registration Successful!', { timeout: 15000 });

    const successHeading = await page.textContent('h2');
    assert(
        successHeading && successHeading.includes('Registration Successful!'),
        `Expected success heading, but got: ${successHeading}`
    );
});
