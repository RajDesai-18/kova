import { test, expect } from '@playwright/test';

const TEST_USER = {
  name: 'E2E Test User',
  email: `e2e-${Date.now()}@test.com`,
  password: 'testpass123',
};

test.describe('Full E2E Flow', () => {
  test('register → login → create doc → edit → sidebar nav → logout', async ({ page }) => {
    // 1. Visit login page
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await page.screenshot({ path: 'e2e/screenshots/01-login-page.png' });

    // 2. Navigate to register
    await page.click('a[href="/register"]');
    await page.waitForURL('**/register');
    await expect(page.locator('h1')).toContainText('Create an account');
    await page.screenshot({ path: 'e2e/screenshots/02-register-page.png' });

    // 3. Register new user
    await page.fill('#name', TEST_USER.name);
    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Should redirect to main page after registration
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/03-main-page-after-register.png' });

    // 4. Verify sidebar is visible with Documents header
    await expect(page.getByText('Documents', { exact: true })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/04-sidebar-visible.png' });

    // 5. Create a new document via sidebar
    await page.click('button[title="New page"]');
    await page.waitForTimeout(2000);

    // Should navigate to new document
    await page.waitForURL('**/documents/**', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/05-new-document.png' });

    // 6. Edit document title
    const titleInput = page.locator('input[placeholder="Untitled"]');
    await titleInput.waitFor({ timeout: 5000 });
    await titleInput.fill('My Test Document');
    await page.waitForTimeout(600); // wait for debounce
    await page.screenshot({ path: 'e2e/screenshots/06-document-titled.png' });

    // 7. Type in the editor
    const editor = page.locator('.ProseMirror');
    await editor.waitFor({ timeout: 5000 });
    await editor.click();
    await editor.type('Hello from Playwright E2E test!');
    await page.waitForTimeout(600); // wait for debounce
    await page.screenshot({ path: 'e2e/screenshots/07-document-with-content.png' });

    // 8. Verify document appears in sidebar
    await expect(page.locator('aside').getByText('My Test Document')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/08-sidebar-with-doc.png' });

    // 9. Toggle sidebar closed
    const menuButton = page.locator('main button').first();
    await menuButton.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/09-sidebar-collapsed.png' });

    // Toggle back open
    await menuButton.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/10-sidebar-reopened.png' });

    // 10. Logout
    const userButton = page.locator('aside button').first();
    await userButton.click();
    await page.waitForTimeout(200);
    await page.click('text=Log out');
    await page.waitForURL('**/login', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/11-logged-out.png' });

    // 11. Login with the account we just created
    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify our document is still there
    await expect(page.locator('aside').getByText('My Test Document')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/12-logged-back-in.png' });
  });

  test('demo account login with seeded docs', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', 'demo@kova.app');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Demo account should have seeded documents
    await expect(page.locator('aside').getByText('Getting Started')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('aside').getByText('Project Notes')).toBeVisible();
    await expect(page.locator('aside').getByText('Ideas')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/13-demo-account.png' });

    // Click on Getting Started document
    await page.locator('aside').getByText('Getting Started').click();
    await page.waitForURL('**/documents/**', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/14-getting-started-doc.png' });

    // Verify the editor loaded (ProseMirror div exists with content)
    const editorContent = page.locator('.ProseMirror');
    await expect(editorContent).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/15-doc-content-loaded.png' });
  });
});
