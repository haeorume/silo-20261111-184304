const { test, expect } = require('@playwright/test');

test.describe('FlowSync E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('Load app and display empty board', async ({ page }) => {
    await page.goto('http://localhost:9999/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Allow app to finish loading

    const cols = await page.locator('section').count();
    expect(cols).toBe(3);

    const labels = await page.locator('h2').allTextContents();
    expect(labels).toContain('To do');
    expect(labels).toContain('Doing');
    expect(labels).toContain('Done');
  });

  test('Add a card via "무료로 시작하기" button', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const startBtn = page.locator('button.cta:has-text("무료로 시작하기")');
    await startBtn.click();

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const originalPrompt = window.prompt;
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') resolve('Review Q3 roadmap');
          else if (msg === 'Due date') resolve('');
          return originalPrompt?.(msg, def);
        };
      });
    });

    expect(result).toBe('Review Q3 roadmap');

    await page.waitForSelector('article:has-text("Review Q3 roadmap")', { timeout: 5000 });

    const todoCards = await page.locator('section:has-text("To do") article').count();
    expect(todoCards).toBe(1);

    const card = page.locator('article:has-text("Review Q3 roadmap")');
    const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
    expect(priorityText).toContain('AI Priority:');
  });

  test('Move card between columns', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const todoCard = page.locator('section:has-text("To do") article').first();
    const select = todoCard.locator('select');

    await select.selectOption({ value: 'doing' });
    expect(await todoCard.locator('select').inputValue()).toBe('doing');

    await select.selectOption({ value: 'done' });
    expect(await todoCard.locator('select').inputValue()).toBe('done');

    const doneCards = await page.locator('section:has-text("Done") article').count();
    expect(doneCards).toBe(1);
  });

  test('Update due date', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const todoCards = await page.locator('section:has-text("To do") article').count();
    if (todoCards === 0) {
      await page.click('button.cta:has-text("무료로 시작하기")');
      await page.evaluate(() => {
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') return 'Set due date';
          if (msg === 'Due date') return '';
        };
      });
    }

    const todoCard = page.locator('section:has-text("To do") article').first();
    const dueInput = todoCard.locator('input[type="text"]');

    await dueInput.fill('2026-11-25');
    expect(await dueInput.inputValue()).toBe('2026-11-25');

    const dueText = await todoCard.locator('select').parent().locator('div').nth(1).textContent();
    expect(dueText).toContain('2026-11-25');
  });

  test('Delete a card', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const todoCards = await page.locator('section:has-text("To do") article').count();
    if (todoCards === 0) {
      await page.click('button.cta:has-text("무료로 시작하기")');
      await page.evaluate(() => {
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') return 'Delete me';
          if (msg === 'Due date') return '';
        };
      });
    }

    const todoCard = page.locator('section:has-text("To do") article').first();
    const deleteBtn = todoCard.locator('select').parent().locator('button:has-text("×")');

    await deleteBtn.click();

    const remainingCards = await page.locator('article').count();
    expect(remainingCards).toBeLessThan(todoCards + 1);
  });

  test('Display AI Priority scores', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.click('button.cta:has-text("무료로 시작하기")');
      await page.evaluate(() => {
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') return `Task ${i + 1} with varying length`;
          if (msg === 'Due date') return '';
        };
      });
    }

    await page.waitForSelector('article', { timeout: 5000 });

    const cards = page.locator('article');
    for (const card of await cards.all()) {
      const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
      expect(priorityText).toContain('AI Priority:');
    }
  });

  test('Switch between views', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const todoCards = await page.locator('section:has-text("To do") article').count();
    if (todoCards === 0) {
      await page.click('button.cta:has-text("무료로 시작하기")');
      await page.evaluate(() => {
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') return 'View switch test';
          if (msg === 'Due date') return '';
        };
      });
    }

    const boardBtn = page.locator('nav button[data-view="board"]');
    const listBtn = page.locator('nav button[data-view="list"]');
    const timelineBtn = page.locator('nav button[data-view="timeline"]');

    expect(boardBtn).toBeVisible();
    expect(listBtn).toBeVisible();
    expect(timelineBtn).toBeVisible();

    await listBtn.click();
    expect(await page.locator('main#app').className()).toContain('list');

    await timelineBtn.click();
    expect(await page.locator('main#app').className()).toContain('timeline');

    await boardBtn.click();
    expect(await page.locator('main#app').className()).toContain('board');
  });

  test('Display toast notification on save', async ({ page }) => {
    await page.waitForTimeout(500); // Ensure app is loaded

    const startBtn = page.locator('button.cta:has-text("무료로 시작하기")');
    await startBtn.click();

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const originalPrompt = window.prompt;
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') resolve('Test card');
          if (msg === 'Due date') resolve('');
          return originalPrompt?.(msg, def);
        };
      });
    });

    await page.waitForSelector('#toast:not([hidden])', { timeout: 3000 });

    const toast = page.locator('#toast');
    expect(toast).toBeVisible();
  });

  test.afterAll(async () => {
    await page.evaluate(() => localStorage.clear());
  });
});
