const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://go-ceylon-frontend.vercel.app';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';
const ADMIN_ADD_ATTRACTION_PATH = process.env.ADMIN_ADD_ATTRACTION_PATH || '/admin/add-locations';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let browser;
let page;

const resolveUploadImagePath = () => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sample-image.png');

    if (!fs.existsSync(fixturePath)) {
        // Keep the upload file inside the test workspace so CI and local runs use the same deterministic path.
        const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2WZ9kAAAAASUVORK5CYII=';
        fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
        fs.writeFileSync(fixturePath, Buffer.from(pngBase64, 'base64'));
    }

    return fixturePath;
};

setDefaultTimeout(60 * 1000);

Before({ tags: '@adminAddAttraction' }, async () => {
    browser = await chromium.launch({ headless: process.env.CI ? true : false });
    page = await browser.newPage();
});

After({ tags: '@adminAddAttraction' }, async () => {
    if (browser) {
        await browser.close();
    }
});

Given('the admin is on the login page', async () => {
    let response = await page.goto(`${BASE_URL}${LOGIN_PATH}`, { waitUntil: 'domcontentloaded' });

    // Fallback for hosts that 404 on deep-link routes
    if (!response || response.status() >= 400) {
        response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForSelector('#email', { timeout: 15000 });
    await page.waitForSelector('#password', { timeout: 15000 });
});

When('the admin logs in with valid credentials', async () => {
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/admin|dashboard/i, { timeout: 20000 });
});

When('the admin navigates to the add attraction page', async () => {
    let onAddAttractionPage = false;

    try {
        await page.goto(`${BASE_URL}${ADMIN_ADD_ATTRACTION_PATH}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('#name', { timeout: 12000 });
        onAddAttractionPage = true;
    } catch (_error) {
        onAddAttractionPage = false;
    }

    // Fallback for environments where deep-linking to admin subroutes is blocked.
    if (!onAddAttractionPage) {
        await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.getByText('Location', { exact: true }).click();
        await page.getByRole('link', { name: /new location/i }).click();
    }

    await page.waitForSelector('#name', { timeout: 30000 });
    await page.waitForSelector('#google_map_url', { timeout: 30000 });
    await page.waitForSelector('#images', { state: 'attached', timeout: 30000 });
    await page.waitForSelector('#point-0', { timeout: 30000 });
    await page.waitForSelector('#text-0', { timeout: 30000 });
});

When('the admin fills valid attraction details', async () => {
    const attractionName = `Playwright Attraction ${Date.now()}`;

    await page.fill('#name', attractionName);

    // ReactQuill uses a content-editable div instead of a regular input.
    await page.locator('.ql-editor').first().fill('A scenic attraction created by automated Playwright test.');

    await page.fill('#google_map_url', 'https://maps.app.goo.gl/abc123XYZ');

    // Select one tag from react-select.
    await page.click('#tags');
    await page.keyboard.type('Beach');
    await page.keyboard.press('Enter');

    const imagePath = resolveUploadImagePath();
    await page.setInputFiles('#images', imagePath);

    await page.fill('#point-0', 'PO1234');
    await page.fill('#text-0', 'Main viewpoint near the entrance.');
});

When('the admin submits the attraction form', async () => {
    await page.getByRole('button', { name: /create attraction/i }).click();
});

Then('the admin should see an attraction created success message', async () => {
    const successLocator = page.locator('text=Attraction created successfully!');

    await successLocator.first().waitFor({ timeout: 20000 });

    const isVisible = await successLocator.first().isVisible();
    assert(isVisible, 'Expected success message after creating attraction.');
});
