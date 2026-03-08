import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: log in as demo user, navigate to a document, and return the editor locator.
 */
async function setupEditor(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'demo@kova.app');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click on Getting Started document
  await page.locator('aside').getByText('Getting Started').click();
  await page.waitForURL('**/documents/**', { timeout: 10000 });

  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // Wait for WebSocket sync
  return editor;
}

/**
 * Helper: clear editor content
 */
async function clearEditor(page: Page) {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);
}

/**
 * Helper: use a slash command. Clears any existing content first for a clean state.
 */
async function useSlashCommand(page: Page, commandLabel: string) {
  const editor = page.locator('.ProseMirror');

  // Press Enter to get to a new empty line
  await editor.press('Enter');
  await page.waitForTimeout(100);

  // Type / to trigger slash command
  await page.keyboard.type('/');
  await page.waitForTimeout(400);

  // Wait for slash menu
  const menu = page.locator('.absolute.z-50.w-72');
  await expect(menu).toBeVisible({ timeout: 3000 });

  // Type filter characters (first few chars of command name)
  const filterChars = commandLabel.slice(0, 5).toLowerCase();
  for (const char of filterChars) {
    await page.keyboard.type(char, { delay: 60 });
  }
  await page.waitForTimeout(300);

  // Find and click the exact command
  const commandButton = menu.locator(`button >> text="${commandLabel}"`).first();
  if (await commandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await commandButton.click();
  } else {
    // Fallback: press Enter to select first filtered result
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(400);
}

test.describe('Slash Commands', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await setupEditor(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('slash menu opens on / and closes on Escape', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);

    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-01-menu-open.png' });

    // Close menu and clean up
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.keyboard.press('Backspace'); // Remove the "/" character
    await page.waitForTimeout(200);
  });

  test('Heading 1', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();

    // Type / directly (we're already on an empty line after clear)
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });

    // Type to filter
    await page.keyboard.type('head', { delay: 60 });
    await page.waitForTimeout(300);

    // Click Heading 1
    const btn = menu.locator('button').filter({ hasText: 'Heading 1' }).first();
    await btn.click();
    await page.waitForTimeout(400);

    // Type test content
    await page.keyboard.type('Heading 1 Test');
    await page.waitForTimeout(200);

    const h1 = editor.locator('h1');
    await expect(h1).toBeVisible({ timeout: 3000 });
    await expect(h1).toContainText('Heading 1 Test');
    await page.screenshot({ path: 'e2e/screenshots/slash-02-heading1.png' });
  });

  test('Heading 2', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('headi', { delay: 60 });
    await page.waitForTimeout(300);

    // Use arrow down to get to Heading 2 (Heading 1 is first)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Heading 2 Test');
    await page.waitForTimeout(200);

    const h2 = editor.locator('h2');
    await expect(h2).toBeVisible({ timeout: 3000 });
    await expect(h2).toContainText('Heading 2 Test');
    await page.screenshot({ path: 'e2e/screenshots/slash-03-heading2.png' });
  });

  test('Heading 3', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('headi', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Heading 3 Test');
    await page.waitForTimeout(200);

    const h3 = editor.locator('h3');
    await expect(h3).toBeVisible({ timeout: 3000 });
    await expect(h3).toContainText('Heading 3 Test');
    await page.screenshot({ path: 'e2e/screenshots/slash-04-heading3.png' });
  });

  test('Bullet List', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('bulle', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Bullet item 1');
    await page.waitForTimeout(200);

    const ul = editor.locator('ul:not([data-type="taskList"])');
    await expect(ul).toBeVisible({ timeout: 3000 });
    await expect(ul).toContainText('Bullet item 1');
    await page.screenshot({ path: 'e2e/screenshots/slash-05-bullet-list.png' });
  });

  test('Numbered List', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('numbe', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Numbered item 1');
    await page.waitForTimeout(200);

    const ol = editor.locator('ol');
    await expect(ol).toBeVisible({ timeout: 3000 });
    await expect(ol).toContainText('Numbered item 1');
    await page.screenshot({ path: 'e2e/screenshots/slash-06-numbered-list.png' });
  });

  test('To-do List', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('to-do', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Task item');
    await page.waitForTimeout(200);

    const taskList = editor.locator('ul[data-type="taskList"]');
    await expect(taskList).toBeVisible({ timeout: 3000 });
    await expect(taskList).toContainText('Task item');
    await page.screenshot({ path: 'e2e/screenshots/slash-07-todo-list.png' });
  });

  test('Toggle List', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
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

    // Type inside toggle content
    const content = toggle.locator('.toggle-content');
    await content.click();
    await page.keyboard.type('Toggle content');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'e2e/screenshots/slash-08-toggle.png' });

    // Click summary to collapse
    const summary = toggle.locator('.toggle-summary');
    await summary.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screenshots/slash-08b-toggle-collapsed.png' });

    // Click again to expand
    await summary.click();
    await page.waitForTimeout(400);
  });

  test('Callout', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('callo', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const callout = editor.locator('.callout-block');
    await expect(callout).toBeVisible({ timeout: 3000 });

    const calloutContent = callout.locator('.callout-content');
    await calloutContent.click();
    await page.keyboard.type('Callout text');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'e2e/screenshots/slash-09-callout.png' });
  });

  test('Code Block', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('code', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('const x = 42;');
    await page.waitForTimeout(200);

    const pre = editor.locator('pre');
    await expect(pre).toBeVisible({ timeout: 3000 });
    await expect(pre).toContainText('const x = 42');
    await page.screenshot({ path: 'e2e/screenshots/slash-10-code-block.png' });
  });

  test('Blockquote', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('quote', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('A famous quote');
    await page.waitForTimeout(200);

    const bq = editor.locator('blockquote');
    await expect(bq).toBeVisible({ timeout: 3000 });
    await expect(bq).toContainText('A famous quote');
    await page.screenshot({ path: 'e2e/screenshots/slash-11-blockquote.png' });
  });

  test('Divider', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('Some text above divider');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('divid', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    const hr = editor.locator('hr');
    await expect(hr.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-12-divider.png' });
  });

  test('Table', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('table', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const table = editor.locator('table');
    await expect(table).toBeVisible({ timeout: 3000 });
    const rows = table.locator('tr');
    await expect(rows).toHaveCount(3);
    await page.screenshot({ path: 'e2e/screenshots/slash-13-table.png' });
  });

  test('Small Text (font-size 14px)', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('small', { delay: 60 });
    await page.waitForTimeout(300);
    // "Heading 3" (description "Small heading") matches first, ArrowDown to "Small Text"
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Small text');
    await page.waitForTimeout(200);

    const small = editor.locator('[style*="font-size: 14px"]');
    await expect(small.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-14-small-text.png' });
  });

  test('Large Text (font-size 20px)', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('large', { delay: 60 });
    await page.waitForTimeout(300);
    // "Heading 1" (description "Large heading") matches first, ArrowDown to "Large Text"
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Large text');
    await page.waitForTimeout(200);

    const large = editor.locator('[style*="font-size: 20px"]');
    await expect(large.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-15-large-text.png' });
  });

  test('Huge Text (font-size 24px)', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('huge', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Huge text');
    await page.waitForTimeout(200);

    const huge = editor.locator('[style*="font-size: 24px"]');
    await expect(huge.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-16-huge-text.png' });
  });

  test('Align Center', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('cente', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Center aligned');
    await page.waitForTimeout(200);

    const centered = editor.locator('[style*="text-align: center"]');
    await expect(centered.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-17-align-center.png' });
  });

  test('Align Right', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    const menu = page.locator('.absolute.z-50.w-72');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await page.keyboard.type('right', { delay: 60 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await page.keyboard.type('Right aligned');
    await page.waitForTimeout(200);

    const right = editor.locator('[style*="text-align: right"]');
    await expect(right.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/slash-18-align-right.png' });
  });

  test('final screenshot', async () => {
    await page.screenshot({ path: 'e2e/screenshots/slash-19-final.png', fullPage: true });
  });
});

test.describe('Bubble Toolbar Formatting', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await setupEditor(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('setup: type text and select it', async () => {
    await clearEditor(page);
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('Test text for formatting');
    await page.waitForTimeout(300);

    // Select all
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    // Toolbar should appear
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');
    await expect(toolbar).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e/screenshots/toolbar-01-visible.png' });
  });

  test('Bold', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await toolbar.getByText('B', { exact: true }).first().click();
    await page.waitForTimeout(300);

    await expect(editor.locator('strong')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-02-bold.png' });

    // Undo
    await toolbar.getByText('B', { exact: true }).first().click();
    await page.waitForTimeout(200);
  });

  test('Italic', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await toolbar.getByText('I', { exact: true }).first().click();
    await page.waitForTimeout(300);

    await expect(editor.locator('em')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-03-italic.png' });

    await toolbar.getByText('I', { exact: true }).first().click();
    await page.waitForTimeout(200);
  });

  test('Underline', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await toolbar.getByText('U', { exact: true }).first().click();
    await page.waitForTimeout(300);

    await expect(editor.locator('u')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-04-underline.png' });

    await toolbar.getByText('U', { exact: true }).first().click();
    await page.waitForTimeout(200);
  });

  test('Strikethrough', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await toolbar.getByText('S', { exact: true }).first().click();
    await page.waitForTimeout(300);

    await expect(editor.locator('s')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-05-strike.png' });

    await toolbar.getByText('S', { exact: true }).first().click();
    await page.waitForTimeout(200);
  });

  test('Inline Code', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await toolbar.getByText('<>', { exact: true }).click();
    await page.waitForTimeout(300);

    await expect(editor.locator('code')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-06-code.png' });

    await toolbar.getByText('<>', { exact: true }).click();
    await page.waitForTimeout(200);
  });

  test('Text Color picker opens and applies red', async () => {
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    const colorBtn = toolbar.locator('button[title="Text color"]');
    await colorBtn.click();
    await page.waitForTimeout(400);

    // Color grid should be visible inside toolbar
    const colorGrid = toolbar.locator('.grid.grid-cols-4').first();
    await expect(colorGrid).toBeVisible({ timeout: 2000 });
    await page.screenshot({ path: 'e2e/screenshots/toolbar-07-color-picker.png' });

    // Click red
    await colorGrid.locator('button[title="Red"]').click();
    await page.waitForTimeout(300);

    const editor = page.locator('.ProseMirror');
    const colored = editor.locator('[style*="color"]');
    await expect(colored.first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-08-color-applied.png' });
  });

  test('Highlight picker opens and applies yellow', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    // Re-select
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    const highlightBtn = toolbar.locator('button[title="Highlight"]');
    await highlightBtn.click();
    await page.waitForTimeout(400);

    const highlightGrid = toolbar.locator('.grid.grid-cols-4').first();
    await expect(highlightGrid).toBeVisible({ timeout: 2000 });
    await page.screenshot({ path: 'e2e/screenshots/toolbar-09-highlight-picker.png' });

    await highlightGrid.locator('button[title="Yellow"]').click();
    await page.waitForTimeout(300);

    await expect(editor.locator('mark')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-10-highlight-applied.png' });
  });

  test('Block Type dropdown - switch to Heading 2', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Block type"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screenshots/toolbar-11-block-type-dropdown.png' });

    await toolbar.getByText('Heading 2', { exact: true }).click();
    await page.waitForTimeout(300);

    await expect(editor.locator('h2')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-12-heading2-applied.png' });

    // Switch back to paragraph
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);
    await toolbar.locator('button[title="Block type"]').click();
    await page.waitForTimeout(400);
    await toolbar.getByText('Paragraph', { exact: true }).click();
    await page.waitForTimeout(200);
  });

  test('Font Size dropdown - Large', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Font size"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screenshots/toolbar-13-font-size-dropdown.png' });

    await toolbar.getByText('Large', { exact: true }).click();
    await page.waitForTimeout(300);

    await expect(editor.locator('[style*="font-size: 20px"]').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-14-font-size-applied.png' });
  });

  test('Bullet List from toolbar', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Bullet list"]').click();
    await page.waitForTimeout(300);

    await expect(editor.locator('ul:not([data-type="taskList"])')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-15-bullet-list.png' });

    // Toggle off
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);
    await toolbar.locator('button[title="Bullet list"]').click();
    await page.waitForTimeout(200);
  });

  test('Numbered List from toolbar', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Numbered list"]').click();
    await page.waitForTimeout(300);

    await expect(editor.locator('ol')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-16-numbered-list.png' });

    // Toggle off
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);
    await toolbar.locator('button[title="Numbered list"]').click();
    await page.waitForTimeout(200);
  });

  test('Align Center from toolbar', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Align center"]').click();
    await page.waitForTimeout(300);

    await expect(editor.locator('[style*="text-align: center"]').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-17-align-center.png' });

    // Reset
    await toolbar.locator('button[title="Align left"]').click();
    await page.waitForTimeout(200);
  });

  test('Align Right from toolbar', async () => {
    const editor = page.locator('.ProseMirror');
    const toolbar = page.locator('.absolute.z-50.rounded-lg.border');

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await toolbar.locator('button[title="Align right"]').click();
    await page.waitForTimeout(300);

    await expect(editor.locator('[style*="text-align: right"]').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-18-align-right.png' });
  });

  test('final screenshot', async () => {
    await page.screenshot({ path: 'e2e/screenshots/toolbar-19-final.png', fullPage: true });
  });
});
