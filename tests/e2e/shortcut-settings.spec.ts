import { expect, test } from './fixtures';

// Chromium's private API is available only on chrome://extensions, never in Volet's UI.
declare global {
  namespace chrome.developerPrivate {
    function updateExtensionCommand(update: { extensionId: string; commandName: string; keybinding: string }): Promise<void>;
  }
}

test('native defaults, custom shortcuts and unassigned actions use the same binding control', async ({ context, worker }) => {
  const extensionId = new URL(worker.url()).host;
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const sidebar = options.getByRole('button', { name: 'Change show or hide the sidebar shortcut', exact: true });
  await expect(options.getByRole('switch', { name: 'Enable tab switcher' })).toBeChecked();
  await expect(sidebar).toHaveAttribute('data-binding', 'default');
  await expect(sidebar).toContainText('Alt+S');
  await expect(sidebar).toContainText('Default');
  const unassigned = options.getByRole('button', { name: 'Change pin or unpin the current tab shortcut', exact: true });
  await expect(unassigned).toHaveAttribute('data-binding', 'unset');
  await expect(unassigned).toHaveText('Not set');

  const manager = await context.newPage();
  await manager.goto('chrome://extensions/');
  // Use the same browser API as Chrome's shortcut editor, inside this disposable profile only.
  await manager.evaluate(async (id) => {
    await chrome.developerPrivate.updateExtensionCommand({ extensionId: id, commandName: 'toggle-sidebar', keybinding: 'Alt+Shift+Y' });
  }, extensionId);
  await options.bringToFront();
  // Headless Chromium does not dispatch window focus when bringToFront changes tabs.
  await options.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(sidebar).toHaveAttribute('data-binding', 'custom');
  await expect(sidebar).toContainText('Custom');
  const recorder = options.getByRole('button', { name: 'Set close highlighted tab shortcut' });
  await recorder.click();
  await recorder.press('Meta+Backspace');
  await expect(recorder).toHaveAttribute('data-binding', 'custom');
  const nativeStyle = await sidebar.evaluate((element) => ({ radius: getComputedStyle(element).borderRadius, color: getComputedStyle(element).color }));
  const localStyle = await recorder.evaluate((element) => ({ radius: getComputedStyle(element).borderRadius, color: getComputedStyle(element).color }));
  expect(localStyle).toEqual(nativeStyle);

  await manager.bringToFront();
  await manager.evaluate(async (id) => {
    await chrome.developerPrivate.updateExtensionCommand({ extensionId: id, commandName: 'toggle-sidebar', keybinding: '' });
  }, extensionId);
  await options.bringToFront();
  // Headless Chromium does not dispatch window focus when bringToFront changes tabs.
  await options.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(sidebar).toHaveAttribute('data-binding', 'unset');
  await expect(sidebar).toHaveText('Not set');
});

test('the switcher toggle persists without clearing shortcuts or changing website access', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/options.html`);
  const before = await worker.evaluate(async () => ({
    commands: await chrome.commands.getAll(),
    access: await chrome.permissions.contains({ origins: ['<all_urls>'] }),
  }));
  const toggle = page.getByRole('switch', { name: 'Enable tab switcher' });
  await expect(toggle).toBeChecked();
  await toggle.focus();
  await toggle.press('Space');
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => worker.evaluate(async () => (await chrome.storage.local.get('recentTabsOn')).recentTabsOn)).toBe(false);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  expect(await worker.evaluate(async () => ({
    commands: await chrome.commands.getAll(),
    access: await chrome.permissions.contains({ origins: ['<all_urls>'] }),
  }))).toEqual(before);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect.poll(() => worker.evaluate(async () => (await chrome.storage.local.get('recentTabsOn')).recentTabsOn)).toBe(true);
});
