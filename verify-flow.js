const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: false });

  let pass1, pass2, pass3, pass4, pass5, pass6_13, pass7, pass8;

  // Test 1: Load app and display empty board
  console.log('=== [1] Load app and display empty board ===');
  const page1 = await browser.newPage();
  await page1.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(5000);

  const cols = await page1.locator('section').count();
  console.log(`Columns count: ${cols} (expected: 3)`);

  const labels = await page1.locator('h2').allTextContents();
  console.log(`Column labels: ${labels.join(', ')}`);

  pass1 = cols === 3 && labels.includes('To do') && labels.includes('Doing') && labels.includes('Done');
  console.log(`Result: ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Add a card via "무료로 시작하기" button
  console.log('=== [2] Add a card via "무료로 시작하기" button ===');
  const page2 = await browser.newPage();
  await page2.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(500);

  const startBtn = page2.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn.click();

  const result = await page2.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('Review Q3 roadmap');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  console.log(`Prompt result: ${result}`);

  await page2.waitForSelector('article:has-text("Review Q3 roadmap")', { timeout: 5000 });

  const todoCards = await page2.locator('section:has-text("To do") article').count();
  console.log(`Todo cards count: ${todoCards} (expected: 1)`);

  const card = page2.locator('article:has-text("Review Q3 roadmap")');
  const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
  console.log(`Priority text: ${priorityText}`);

  pass2 = result === 'Review Q3 roadmap' && todoCards === 1 && priorityText.includes('AI Priority:');
  console.log(`Result: ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Move card between columns
  console.log('=== [3] Move card between columns ===');
  const page3 = await browser.newPage();
  await page3.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page3.waitForTimeout(500);

  const startBtn3 = page3.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn3.click();

  const result3 = await page3.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('Move test card');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  await page3.waitForSelector('article:has-text("Move test card")', { timeout: 5000 });

  const todoCard = page3.locator('section:has-text("To do") article').first();
  const select = todoCard.locator('select');

  await select.selectOption({ value: 'doing' });
  console.log(`Status after first move: ${await select.inputValue()}`);

  await select.selectOption({ value: 'done' });
  console.log(`Status after second move: ${await select.inputValue()}`);

  const doneCards = await page3.locator('section:has-text("Done") article').count();
  console.log(`Done cards count: ${doneCards} (expected: 1)`);

  pass3 = await select.inputValue() === 'done' && doneCards === 1;
  console.log(`Result: ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Update due date
  console.log('=== [4] Update due date ===');
  const page4 = await browser.newPage();
  await page4.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page4.waitForTimeout(500);

  const startBtn4 = page4.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn4.click();

  const result4 = await page4.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('Set due date');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  await page4.waitForSelector('article:has-text("Set due date")', { timeout: 5000 });

  const todoCard4 = page4.locator('section:has-text("To do") article').first();
  const dueInput = todoCard4.locator('input[type="text"]');

  await dueInput.fill('2026-11-25');
  console.log(`Due date input value: ${await dueInput.inputValue()}`);

  const dueText = await todoCard4.locator('select').parent().locator('div').nth(1).textContent();
  console.log(`Due date display: ${dueText}`);

  pass4 = await dueInput.inputValue() === '2026-11-25' && dueText.includes('2026-11-25');
  console.log(`Result: ${pass4 ? 'PASS' : 'FAIL'}\n`);

  // Test 5: Delete a card
  console.log('=== [5] Delete a card ===');
  const page5 = await browser.newPage();
  await page5.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page5.waitForTimeout(500);

  const startBtn5 = page5.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn5.click();

  const result5 = await page5.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('Delete me');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  await page5.waitForSelector('article:has-text("Delete me")', { timeout: 5000 });

  const todoCardsBefore = await page5.locator('section:has-text("To do") article').count();
  const todoCard5 = page5.locator('section:has-text("To do") article').first();
  const deleteBtn = todoCard5.locator('select').parent().locator('button:has-text("×")');

  await deleteBtn.click();

  const remainingCards = await page5.locator('article').count();
  console.log(`Remaining cards: ${remainingCards} (expected: <${todoCardsBefore + 1})`);

  pass5 = remainingCards < todoCardsBefore + 1;
  console.log(`Result: ${pass5 ? 'PASS' : 'FAIL'}\n`);

  // Test 6: Display AI Priority scores
  console.log('=== [6] Display AI Priority scores ===');
  const page6 = await browser.newPage();
  await page6.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page6.waitForTimeout(500);

  for (let i = 0; i < 3; i++) {
    const startBtn6 = page6.locator('button.cta:has-text("무료로 시작하기")');
    await startBtn6.click();

    const result6 = await page6.evaluate(() => {
      return new Promise((resolve) => {
        const originalPrompt = window.prompt;
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') resolve(`Task ${i + 1} with varying length`);
          else if (msg === 'Due date') resolve('');
          return originalPrompt?.(msg, def);
        };
      });
    });
  }

  await page6.waitForSelector('article', { timeout: 5000 });

  const cards = page6.locator('article');
  let pass6_14 = true;
  for (const card of await cards.all()) {
    const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
    if (!priorityText.includes('AI Priority:')) {
      console.log(`Card missing AI Priority: ${await card.locator('select').parent().locator('div').nth(1).textContent()}`);
      pass6_14 = false;
    }
  }
  console.log(`Result: ${pass6_14 ? 'PASS' : 'FAIL'}\n`);

  // Test 7: Switch between views
  console.log('=== [7] Switch between views ===');
  const page7 = await browser.newPage();
  await page7.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page7.waitForTimeout(500);

  const startBtn7 = page7.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn7.click();

  const result7 = await page7.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('View switch test');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  await page7.waitForSelector('article:has-text("View switch test")', { timeout: 5000 });

  const boardBtn = page7.locator('nav button[data-view="board"]');
  const listBtn = page7.locator('nav button[data-view="list"]');
  const timelineBtn = page7.locator('nav button[data-view="timeline"]');

  console.log(`Board view class: ${await page7.locator('main#app').className()}`);
  await listBtn.click();
  console.log(`List view class: ${await page7.locator('main#app').className()}`);

  await timelineBtn.click();
  console.log(`Timeline view class: ${await page7.locator('main#app').className()}`);

  await boardBtn.click();
  console.log(`Back to board view class: ${await page7.locator('main#app').className()}`);

  pass7 = await page7.locator('main#app').className().includes('board');
  console.log(`Result: ${pass7 ? 'PASS' : 'FAIL'}\n`);

  // Test 8: Display toast notification on save
  console.log('=== [8] Display toast notification on save ===');
  const page8 = await browser.newPage();
  await page8.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
  await page8.waitForTimeout(500);

  const startBtn8 = page8.locator('button.cta:has-text("무료로 시작하기")');
  await startBtn8.click();

  const result8 = await page8.evaluate(() => {
    return new Promise((resolve) => {
      const originalPrompt = window.prompt;
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') resolve('Test card');
        else if (msg === 'Due date') resolve('');
        return originalPrompt?.(msg, def);
      };
    });
  });

  await page8.waitForSelector('#toast:not([hidden])', { timeout: 3000 });

  const toast = page8.locator('#toast');
  console.log(`Toast visible: ${await toast.isVisible()}`);

  pass8 = await toast.isVisible();
  console.log(`Result: ${pass8 ? 'PASS' : 'FAIL'}\n`);

  await browser.close();

  console.log('=== SUMMARY ===');
  const allPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6_14 && pass7 && pass8;
  console.log(`Overall: ${allPass ? 'ALL PASS' : 'SOME FAILURES'}\n`);

  return allPass;
}

run().then(success => {
  console.log(`\nFinal status: ${success ? 'SUCCESS' : 'FAILURE'}`);
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
