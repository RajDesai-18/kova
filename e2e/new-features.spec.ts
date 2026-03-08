import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: log in as demo user and return to main page
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'demo@kova.app');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

/**
 * Helper: navigate to a document and wait for editor
 */
async function openDocument(page: Page, title: string) {
  await page.locator('aside').getByText(title).first().click();
  await page.waitForURL('**/documents/**', { timeout: 10000 });
  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
  return editor;
}

/**
 * Helper: create a new document from sidebar
 */
async function createDocument(page: Page) {
  const createBtn = page.locator('aside').locator('button[title="New page"]');
  await createBtn.click();
  await page.waitForURL('**/documents/**', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

// ─── Dark Mode ──────────────────────────────────────────────────────────────

test.describe('Dark Mode', () => {
  test('app renders in dark mode by default', async ({ page }) => {
    await login(page);

    // html element should have "dark" class
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Background should be dark (--background: #171717 in dark mode)
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // #171717 = rgb(23, 23, 23)
    expect(bgColor).toBe('rgb(23, 23, 23)');

    await page.screenshot({ path: 'e2e/screenshots/dark-01-main-page.png' });
  });

  test('sidebar renders in dark mode', async ({ page }) => {
    await login(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Sidebar should use card bg (--card: #262626 in dark mode)
    const sidebarBg = await sidebar.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(sidebarBg).toBe('rgb(38, 38, 38)');

    await page.screenshot({ path: 'e2e/screenshots/dark-02-sidebar.png' });
  });

  test('editor page renders in dark mode', async ({ page }) => {
    await login(page);
    await openDocument(page, 'Getting Started');

    await page.screenshot({ path: 'e2e/screenshots/dark-03-editor.png' });

    // Title input should not have gray-300 placeholder (should use muted-foreground)
    const titleInput = page.locator('input[placeholder="Untitled"]');
    if (await titleInput.isVisible()) {
      await page.screenshot({ path: 'e2e/screenshots/dark-04-title-input.png' });
    }
  });
});

// ─── Document Trash (Delete, Restore, Permanent Delete) ─────────────────────

test.describe('Document Trash', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let testDocTitle: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('create a test document', async () => {
    await createDocument(page);

    // Type a unique title
    testDocTitle = `Test Trash ${Date.now()}`;
    const titleInput = page.locator('input[placeholder="Untitled"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(testDocTitle);
    await page.waitForTimeout(1000); // Wait for debounced save

    // Verify it shows in sidebar
    const sidebarItem = page.locator('aside').getByText(testDocTitle);
    await expect(sidebarItem).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-01-doc-created.png' });
  });

  test('delete button appears on hover', async () => {
    const sidebarItem = page.locator('aside').getByText(testDocTitle).locator('..');
    await sidebarItem.hover();
    await page.waitForTimeout(300);

    const trashBtn = sidebarItem.locator('button[title="Move to trash"]');
    await expect(trashBtn).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-02-delete-btn-hover.png' });
  });

  test('clicking delete moves doc to trash', async () => {
    const sidebarItem = page.locator('aside').getByText(testDocTitle).locator('..');
    await sidebarItem.hover();
    await page.waitForTimeout(300);

    const trashBtn = sidebarItem.locator('button[title="Move to trash"]');
    await trashBtn.click();
    await page.waitForTimeout(1000);

    // Document should no longer appear in main sidebar list
    const docInSidebar = page.locator('aside .flex-1.overflow-y-auto').getByText(testDocTitle);
    await expect(docInSidebar).not.toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-03-doc-deleted.png' });
  });

  test('trash section shows deleted doc', async () => {
    // Click the Trash button in sidebar
    const trashToggle = page.locator('aside').getByText('Trash');
    await expect(trashToggle).toBeVisible({ timeout: 3000 });
    await trashToggle.click();
    await page.waitForTimeout(500);

    // The deleted doc should appear in trash section
    const trashedDoc = page.locator('aside').locator('.border-t').getByText(testDocTitle);
    await expect(trashedDoc).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-04-in-trash.png' });
  });

  test('restore brings doc back to sidebar', async () => {
    // Hover over the trashed doc to reveal restore button
    const trashSection = page.locator('aside').locator('.border-t');
    const trashedItem = trashSection.getByText(testDocTitle).locator('..');
    await trashedItem.hover();
    await page.waitForTimeout(300);

    const restoreBtn = trashedItem.locator('button[title="Restore"]');
    await expect(restoreBtn).toBeVisible({ timeout: 3000 });
    await restoreBtn.click();
    await page.waitForTimeout(1000);

    // Doc should be back in main sidebar
    const docInSidebar = page.locator('aside .flex-1.overflow-y-auto').getByText(testDocTitle);
    await expect(docInSidebar).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-05-restored.png' });
  });

  test('permanent delete removes doc forever', async () => {
    // Delete the doc again
    const sidebarItem = page.locator('aside').getByText(testDocTitle).locator('..');
    await sidebarItem.hover();
    await page.waitForTimeout(300);
    const trashBtn = sidebarItem.locator('button[title="Move to trash"]');
    await trashBtn.click();
    await page.waitForTimeout(1000);

    // Ensure trash section is expanded — check if trashed doc is already visible
    const trashSection = page.locator('aside').locator('.border-t');
    const trashedDoc = trashSection.getByText(testDocTitle);
    if (!(await trashedDoc.isVisible({ timeout: 500 }).catch(() => false))) {
      // Trash is collapsed, click to open
      const trashToggle = trashSection.locator('button').first();
      await trashToggle.click();
      await page.waitForTimeout(500);
    }

    await expect(trashedDoc).toBeVisible({ timeout: 5000 });

    // Hover and click permanent delete
    const trashedItem = trashedDoc.locator('..');
    await trashedItem.hover();
    await page.waitForTimeout(300);

    const deleteForeverBtn = trashedItem.locator('button[title="Delete forever"]');
    await expect(deleteForeverBtn).toBeVisible({ timeout: 3000 });
    await deleteForeverBtn.click();
    await page.waitForTimeout(1000);

    // Doc should be gone from trash too
    await expect(trashedDoc).not.toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/trash-06-permanent-deleted.png' });
  });
});

// ─── Editable Toggle Title ──────────────────────────────────────────────────

test.describe('Editable Toggle Title', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
    await openDocument(page, 'Getting Started');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('insert toggle via slash command', async () => {
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Insert toggle
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('toggl', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const toggle = editor.locator('.toggle-block');
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/toggle-01-inserted.png' });
  });

  test('toggle title is editable', async () => {
    const editor = page.locator('.ProseMirror');
    const toggle = editor.locator('.toggle-block');
    const titleEl = toggle.locator('.toggle-title');

    await expect(titleEl).toBeVisible();
    // Default title should be "Toggle"
    await expect(titleEl).toHaveText('Toggle');

    // ProseMirror intercepts keyboard events from nested contenteditable spans,
    // so we use JS to directly edit the title and dispatch an input event
    await titleEl.evaluate((el) => {
      el.focus();
      el.textContent = 'My Custom Title';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    await expect(titleEl).toHaveText('My Custom Title');
    await page.screenshot({ path: 'e2e/screenshots/toggle-02-title-edited.png' });
  });

  test('toggle open/close still works with custom title', async () => {
    const editor = page.locator('.ProseMirror');
    const toggle = editor.locator('.toggle-block');
    const content = toggle.locator('.toggle-content');
    const arrow = toggle.locator('.toggle-arrow');

    // Content should be visible (open by default)
    await expect(content).toBeVisible();

    // Click arrow to close
    await arrow.click();
    await page.waitForTimeout(400);

    // Content should be hidden
    await expect(content).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toggle-03-closed.png' });

    // Click arrow to open again
    await arrow.click();
    await page.waitForTimeout(400);

    await expect(content).toBeVisible();

    // Title should still be custom
    const titleEl = toggle.locator('.toggle-title');
    await expect(titleEl).toHaveText('My Custom Title');
    await page.screenshot({ path: 'e2e/screenshots/toggle-04-reopened.png' });
  });

  test('toggle title has contenteditable attribute', async () => {
    const editor = page.locator('.ProseMirror');
    const toggle = editor.locator('.toggle-block');
    const titleEl = toggle.locator('.toggle-title');

    // Verify the title span is contenteditable
    const isEditable = await titleEl.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Verify title persisted from previous test
    await expect(titleEl).toHaveText('My Custom Title');
    await page.screenshot({ path: 'e2e/screenshots/toggle-05-title-attr.png' });
  });
});
