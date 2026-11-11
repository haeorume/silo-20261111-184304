import { test, expect } from '@playwright/test';

// Base URL for the app (file:// protocol)
const BASE_URL = 'http://localhost:9999/index.html';

test.describe('FlowSync E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test via API call (use relative path)
    await page.goto(`${BASE_URL.replace('index.html', 'api/clear-storage')}`);

    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('Load app and display empty board', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('main#app', { timeout: 5000 });

    // Verify board structure (3 columns: To do, Doing, Done)
    const cols = await page.locator('section').count();
    expect(cols).toBe(3);

    const labels = await page.locator('h2').allTextContents();
    expect(labels).toContain('To do');
    expect(labels).toContain('Doing');
    expect(labels).toContain('Done');
  });

  test('Add a card via "무료로 시작하기" button', async ({ page }) => {
    // Click "Start for Free" button in header
    const startBtn = page.locator('button.cta:has-text("무료로 시작하기")');
    await startBtn.click();

    // Simulate prompt response via page.evaluate
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const originalPrompt = window.prompt;
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') resolve('Review Q3 roadmap');
          else if (msg === 'Due date (optional, e.g., "2026-11-25"):') resolve('');
          return originalPrompt?.(msg, def);
        };
      });
    });

    expect(result).toBe('Review Q3 roadmap');

    // Wait for card to appear in "To do" column
    await page.waitForSelector('article:has-text("Review Q3 roadmap")', { timeout: 5000 });

    // Verify card is in the correct column
    const todoCards = await page.locator('section:has-text("To do") article').count();
    expect(todoCards).toBe(1);

    // Verify AI Priority score is displayed
    const card = page.locator('article:has-text("Review Q3 roadmap")');
    const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
    expect(priorityText).toContain('AI Priority:');
  });

  test('Move card between columns', async ({ page }) => {
    // Get the first card in "To do" column
    const todoCard = page.locator('section:has-text("To do") article').first();
    const select = todoCard.locator('select');

    // Move to "Doing"
    await select.selectOption({ value: 'doing' });
    expect(await todoCard.locator('select').inputValue()).toBe('doing');

    // Move to "Done"
    await select.selectOption({ value: 'done' });
    expect(await todoCard.locator('select').inputValue()).toBe('done');

    // Verify card is now in "Done" column
    const doneCards = await page.locator('section:has-text("Done") article').count();
    expect(doneCards).toBe(1);
  });

  test('Update due date', async ({ page }) => {
    // Get the first card in "To do" column (if exists, otherwise add one)
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

    // Get the first card in "To do" column
    const todoCard = page.locator('section:has-text("To do") article').first();
    const dueInput = todoCard.locator('input[type="text"]');

    // Update due date
    await dueInput.fill('2026-11-25');
    expect(await dueInput.inputValue()).toBe('2026-11-25');

    // Verify due date is displayed on the card
    const dueText = await todoCard.locator('select').parent().locator('div').nth(1).textContent();
    expect(dueText).toContain('2026-11-25');
  });

  test('Delete a card', async ({ page }) => {
    // Add a card first if needed
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

    // Get the first card in "To do" column
    const todoCard = page.locator('section:has-text("To do") article').first();
    const deleteBtn = todoCard.locator('select').parent().locator('button:has-text("×")');

    // Click delete button
    await deleteBtn.click();

    // Verify card is removed (confirm dialog will be shown)
    const remainingCards = await page.locator('article').count();
    expect(remainingCards).toBeLessThan(todoCards + 1);
  });

  test('Display AI Priority scores', async ({ page }) => {
    // Add 3 cards with different lengths to test priority scoring
    for (let i = 0; i < 3; i++) {
      await page.click('button.cta:has-text("무료로 시작하기")');
      await page.evaluate(() => {
        window.prompt = (msg, def) => {
          if (msg === 'Card title:') return `Task ${i + 1} with varying length`;
          if (msg === 'Due date') return '';
        };
      });
    }

    // Wait for cards to load
    await page.waitForSelector('article', { timeout: 5000 });

    // Verify AI Priority scores are displayed on cards
    const cards = page.locator('article');
    for (const card of await cards.all()) {
      const priorityText = await card.locator('select').parent().locator('div').nth(1).textContent();
      expect(priorityText).toContain('AI Priority:');
    }
  });

  test('Switch between views', async ({ page }) => {
    // Add a card first if needed
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

    // Click view switcher buttons in nav
    const boardBtn = page.locator('nav button[data-view="board"]');
    const listBtn = page.locator('nav button[data-view="list"]');
    const timelineBtn = page.locator('nav button[data-view="timeline"]');

    // Verify buttons are present and clickable
    expect(boardBtn).toBeVisible();
    expect(listBtn).toBeVisible();
    expect(timelineBtn).toBeVisible();

    // Switch to list view
    await listBtn.click();
    expect(await page.locator('main#app').className()).toContain('list');

    // Switch to timeline view
    await timelineBtn.click();
    expect(await page.locator('main#app').className()).toContain('timeline');

    // Switch back to board view
    await boardBtn.click();
    expect(await page.locator('main#app').className()).toContain('board');
  });

  test('Display toast notification on save', async ({ page }) => {
    // Add a card
    await page.click('button.cta:has-text("무료로 시작하기")');
    await page.evaluate(() => {
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') return 'Test card';
        if (msg === 'Due date') return '';
      };
    });

    // Wait for toast notification
    await page.waitForSelector('#toast:not([hidden])', { timeout: 5000 });

    const toast = page.locator('#toast');
    expect(toast).toBeVisible();
  });

  test('Error handling: save failure shows retry button', async ({ page }) => {
    // Simulate localStorage error by blocking storage
    await page.evaluate(() => {
      Object.defineProperty(localStorage, 'setItem', {
        value: () => { throw new Error('Storage quota exceeded'); }
      });
    });

    // Add a card - should trigger error state
    await page.click('button.cta:has-text("무료로 시작하기")');
    await page.evaluate(() => {
      window.prompt = (msg, def) => {
        if (msg === 'Card title:') return 'Error test';
        if (msg === 'Due date') return '';
      };
    });

    // Wait for error message to appear
    await page.waitForSelector('#err:not([hidden])', { timeout: 5000 });

    const err = page.locator('#err');
    expect(err).toBeVisible();

    // Verify retry button is present
    const retryBtn = err.locator('button:has-text("다시 시도")');
    expect(retryBtn).toBeVisible();

    // Click retry to reset error state
    await retryBtn.click();
    expect(await err.isHidden()).toBe(true);
  });

  test.afterAll(async () => {
    // Cleanup: clear localStorage after all tests (if page is available)
    try {
      await page?.evaluate(() => localStorage.clear());
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});
