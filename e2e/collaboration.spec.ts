import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function openDocument(page: Page, docName: string) {
  await page.locator('aside').getByText(docName).click();
  await page.waitForURL('**/documents/**', { timeout: 10000 });
  // Wait for WebSocket connection and editor to render
  await page.locator('.ProseMirror').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
}

test.describe('Real-Time Collaboration', () => {
  test('two users can open the same document and see the editor', async ({ browser }) => {
    // Create two independent browser contexts (like two separate browsers)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login as demo user in browser 1
    await loginAs(page1, 'demo@kova.app', 'password123');
    await page1.screenshot({ path: 'e2e/screenshots/collab-01-user1-logged-in.png' });

    // Login as collab user in browser 2
    await loginAs(page2, 'demo2@kova.app', 'password123');
    await page2.screenshot({ path: 'e2e/screenshots/collab-02-user2-logged-in.png' });

    // Both open the "Getting Started" document
    await openDocument(page1, 'Getting Started');
    await page1.screenshot({ path: 'e2e/screenshots/collab-03-user1-document.png' });

    await openDocument(page2, 'Getting Started');
    await page2.screenshot({ path: 'e2e/screenshots/collab-04-user2-document.png' });

    // Verify both editors are visible and loaded
    const editor1 = page1.locator('.ProseMirror');
    const editor2 = page2.locator('.ProseMirror');
    await expect(editor1).toBeVisible();
    await expect(editor2).toBeVisible();

    // User 1 types some text
    await editor1.click();
    await page1.keyboard.press('End');
    await page1.keyboard.press('Enter');
    const testText = `Collab test ${Date.now()}`;
    await page1.keyboard.type(testText);
    await page1.waitForTimeout(2000);
    await page1.screenshot({ path: 'e2e/screenshots/collab-05-user1-typed.png' });

    // Verify user 2 sees the text (synced via WebSocket)
    await page2.waitForTimeout(3000);
    await expect(editor2).toContainText(testText, { timeout: 10000 });
    await page2.screenshot({ path: 'e2e/screenshots/collab-06-user2-sees-sync.png' });

    // Check that no client-side errors occurred (no crash)
    // The page should still be functional
    await expect(page1.locator('input[placeholder="Untitled"]').or(page1.locator('input').first())).toBeVisible();
    await expect(page2.locator('input[placeholder="Untitled"]').or(page2.locator('input').first())).toBeVisible();

    await page1.screenshot({ path: 'e2e/screenshots/collab-07-final-user1.png' });
    await page2.screenshot({ path: 'e2e/screenshots/collab-08-final-user2.png' });

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
