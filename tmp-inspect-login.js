const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://go-ceylon-frontend.vercel.app/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await page.waitForTimeout(3000);

  const url = page.url();
  const title = await page.title();

  const inputs = await page.$$eval('input', (elements) =>
    elements.map((element) => ({
      id: element.id,
      name: element.name,
      type: element.type,
      placeholder: element.placeholder,
      class: element.className,
    }))
  );

  const buttons = await page.$$eval('button', (elements) =>
    elements.map((element) => ({
      text: (element.textContent || '').trim(),
      type: element.type,
      class: element.className,
    }))
  );

  console.log(JSON.stringify({ url, title, inputs, buttons }, null, 2));

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
