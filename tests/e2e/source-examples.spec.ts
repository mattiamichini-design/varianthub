import { expect, openExploration, test } from './fixtures';

test('HTML examples load their assets and interactions inside the real preview', async ({ page }) => {
  await page.goto('/workspace');
  await page.getByRole('combobox', { name: 'Filter by source' }).selectOption('html');
  await expect(page.locator('.vh-exploration-card')).toHaveCount(1);
  await openExploration(page, 'fieldwork-html');
  const frame = page.frameLocator('iframe[src="/examples/fieldwork/index.html"]').first();
  await expect(frame.getByRole('heading', { name: 'A little closer to the outside.' })).toBeVisible();
  await frame.getByRole('link', { name: 'Explore the journal' }).click();
  await frame.getByLabel('Your email address').fill('reader@example.com');
  await frame.getByRole('button', { name: 'Count me in' }).click();
  await expect(frame.getByRole('status')).toContainText("You're on the list");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/fieldwork/afterhours.html');
  await expect(page.getByRole('heading', { name: 'Less noise. More wonder.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('external examples retain their URL and support cross-origin frame interaction', async ({ page }) => {
  // Keep CI deterministic; the actual three.js endpoint is also checked manually.
  await page.route('https://threejs.org/examples/css3d_periodictable.html', route => route.fulfill({
    contentType: 'text/html', body: '<button onclick="this.textContent=\'Sphere active\'">SPHERE</button>',
  }));
  await page.goto('/workspace');
  await page.getByRole('combobox', { name: 'Filter by source' }).selectOption('url');
  await expect(page.locator('.vh-exploration-card')).toHaveCount(1);
  await openExploration(page, 'external-playground');
  const frame = page.frameLocator('iframe[src="https://threejs.org/examples/css3d_periodictable.html"]').first();
  await frame.getByRole('button', { name: 'SPHERE' }).click();
  await expect(frame.getByRole('button', { name: 'Sphere active' })).toBeVisible();
});
