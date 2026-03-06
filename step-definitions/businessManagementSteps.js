const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://go-ceylon-frontend.vercel.app';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';
const BUSINESS_HOME_PATH = process.env.BUSINESS_HOME_PATH || '/business/';
const BUSINESS_ADD_PATH = process.env.BUSINESS_ADD_PATH || '/business/add';

const BUSINESS_USER_EMAIL = process.env.BUSINESS_USER_EMAIL || 'dilmi@gmail.com';
const BUSINESS_USER_PASSWORD = process.env.BUSINESS_USER_PASSWORD || '123';

let browser;
let page;
let createdBusinessName;
let updatedBusinessName;

const resolveUploadImagePath = () => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sample-image.png');

    if (!fs.existsSync(fixturePath)) {
        const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2WZ9kAAAAASUVORK5CYII=';
        fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
        fs.writeFileSync(fixturePath, Buffer.from(pngBase64, 'base64'));
    }

    return fixturePath;
};

setDefaultTimeout(90 * 1000);

Before({ tags: '@businessManagement' }, async () => {
    browser = await chromium.launch({ headless: process.env.CI ? true : false });
    page = await browser.newPage();
});

After({ tags: '@businessManagement' }, async () => {
    if (browser) {
        await browser.close();
    }
});

Given('the business user is on the login page', async () => {
    let response = await page.goto(`${BASE_URL}${LOGIN_PATH}`, { waitUntil: 'domcontentloaded' });

    if (!response || response.status() >= 400) {
        response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForSelector('#email', { timeout: 15000 });
    await page.waitForSelector('#password', { timeout: 15000 });
});

When('the business user logs in with valid credentials', async () => {
    await page.fill('#email', BUSINESS_USER_EMAIL);
    await page.fill('#password', BUSINESS_USER_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/business\/?$/i, { timeout: 25000 });
});

When('the business user navigates to add business page', async () => {
    let onAddBusinessPage = false;

    try {
        await page.goto(`${BASE_URL}${BUSINESS_ADD_PATH}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('input[name="business_name"]', { timeout: 12000 });
        onAddBusinessPage = true;
    } catch (_error) {
        onAddBusinessPage = false;
    }

    if (!onAddBusinessPage) {
        await page.goto(`${BASE_URL}${BUSINESS_HOME_PATH}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.locator('a[href="/business/add"]').first().click();
    }

    await page.waitForSelector('input[name="business_name"]', { timeout: 30000 });
});

When('the business user fills valid business details', async () => {
    createdBusinessName = `Playwright Business ${Date.now()}`;

    await page.fill('input[name="business_name"]', createdBusinessName);
    await page.selectOption('select[name="business_category"]', 'Restaurant');
    await page.fill('input[name="contact_number"]', '0771234567');

    await page.getByRole('button', { name: /continue/i }).click();

    await page.fill('input[name="address"]', '123 Test Street, Colombo');
    await page.fill('textarea[name="description"]', 'Business created by Playwright automation for management flow testing.');

    await page.getByRole('button', { name: /continue/i }).click();

    const imagePath = resolveUploadImagePath();
    await page.setInputFiles('input[name="images"]', imagePath);
});

When('the business user submits the business form', async () => {
    await page.getByRole('button', { name: /create business/i }).click();
});

Then('the business user should see a business created success message', async () => {
    const successLocator = page.locator('text=Business created successfully!').first();
    await successLocator.waitFor({ timeout: 20000 });

    const isVisible = await successLocator.isVisible();
    assert(isVisible, 'Expected success message after creating business.');

    await page.waitForURL(/\/business\/?$/i, { timeout: 25000 });
});

When('the business user opens the created business details', async () => {
    const businessCard = page.locator('a').filter({ hasText: createdBusinessName }).first();
    await businessCard.waitFor({ state: 'visible', timeout: 30000 });
    await businessCard.click();

    await page.waitForURL(/\/business\/info\//i, { timeout: 20000 });
    await page.getByRole('heading', { name: createdBusinessName }).first().waitFor({ timeout: 15000 });
});

When('the business user updates the created business details', async () => {
    await page.getByRole('button', { name: /^Edit$/i }).click();

    await page.waitForURL(/\/business\/update\//i, { timeout: 20000 });
    await page.waitForSelector('input[name="business_name"]', { timeout: 20000 });

    updatedBusinessName = `${createdBusinessName} Updated`;
    await page.fill('input[name="business_name"]', updatedBusinessName);

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /update business/i }).click();
});

Then('the business user should see a business updated success message', async () => {
    const successLocator = page.locator('text=Business updated successfully!').first();
    await successLocator.waitFor({ timeout: 20000 });

    const isVisible = await successLocator.isVisible();
    assert(isVisible, 'Expected success message after updating business.');

    await page.waitForURL(/\/business\/info\//i, { timeout: 25000 });
    await page.getByRole('heading', { name: updatedBusinessName }).first().waitFor({ timeout: 15000 });
});

When('the business user deletes the updated business', async () => {
    await page.getByRole('button', { name: /^Delete$/i }).first().click();

    const deleteModal = page.locator('text=Delete Business').first();
    await deleteModal.waitFor({ timeout: 10000 });

    await page.getByRole('button', { name: /^Delete$/i }).nth(1).click();
});

Then('the business should be removed from the business list', async () => {
    await page.waitForURL(/\/business\/?$/i, { timeout: 25000 });

    const deletedCard = page.locator('a').filter({ hasText: updatedBusinessName });
    await deletedCard.first().waitFor({ state: 'detached', timeout: 30000 }).catch(() => { });

    const count = await deletedCard.count();
    assert.strictEqual(count, 0, `Expected business '${updatedBusinessName}' to be removed from the list.`);
});
