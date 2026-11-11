const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('=== Page Title ===');
  console.log(await page.title());

  console.log('\n=== Checking for #app ===');
  await page.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  const app = await page.locator('#app').first();
  if (await app.isVisible()) {
    console.log('Found #app');
    const html = await page.locator('#app').innerHTML();
    console.log('HTML:', html.substring(0, 500));

    const sections = await page.locator('#app section').count();
    console.log('Sections count:', sections);

    const articles = await page.locator('#app article').count();
    console.log('Articles count:', articles);

    const h2s = await page.locator('#app h2').allTextContents();
    console.log('H2 labels:', h2s);

    const startBtn = await page.locator('button.cta:has-text("무료로 시작하기")').first();
    console.log('Start button visible:', await startBtn.isVisible());

  } else {
    console.log('#app not found');
  }

  await browser.close();
})();
