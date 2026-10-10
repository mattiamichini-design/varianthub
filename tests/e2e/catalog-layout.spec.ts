import { expect, test } from '@playwright/test';

test('catalog covers alternate after filtering and metadata stays within cards', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.route('**/api/workspace?refresh', route => route.fulfill({ json: { projectId: 'varianthub-demo', token: 'test', metadata: { 'action-surface': { history: 'git', localChanges: true, lastCommit: '2026-09-15T10:00:00Z' } } } }));
  await page.goto('/workspace');
  await expect(page.locator('.vh-exploration-modified[title="Uncommitted source changes"]')).toHaveCount(1);
  await expect(page.locator('.vh-exploration-card').filter({ hasText: 'Action surface' }).locator('.vh-exploration-meta-date')).toContainText('Sep 15, 2026');
  const covers = page.locator('.vh-exploration-cover');
  const colors = () => covers.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  await expect(covers).toHaveCount(7);
  expect(new Set(await colors()).size).toBe(7);
  for (const mode of ['Grid', 'List']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    const bounds = await page.locator('.vh-exploration-meta').evaluateAll(nodes => nodes.map(node => ({
      fits: node.scrollWidth <= node.clientWidth,
      cardFits: node.closest('.vh-exploration-card')!.scrollWidth <= node.closest('.vh-exploration-card')!.clientWidth,
    })));
    expect(bounds.every(row => row.fits && row.cardFits)).toBe(true);
    await expect(page.locator('.vh-exploration-meta-date').first()).toHaveCSS('white-space', 'nowrap');
  }
  await page.getByRole('combobox', { name: 'Filter by source' }).selectOption('react');
  const filtered = await colors();
  expect(new Set(filtered).size).toBe(filtered.length);
});
