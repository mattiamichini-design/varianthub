import { expect, openExploration, test } from './fixtures';

test('catalog reports matching results and restores its description when search is cleared', async ({ page }) => {
  await page.goto('/workspace');
  const search = page.getByRole('textbox', { name: 'Search explorations', exact: true });
  const summary = page.locator('.vh-catalog-heading-copy [role="status"]');
  await search.fill('ac');
  await expect(summary).toHaveText('4 matching “ac”');
  await expect(page.locator('.vh-exploration-card')).toHaveCount(4);
  await search.fill('zz-no-match');
  await expect(summary).toHaveText('0 matching “zz-no-match”');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(page.locator('.vh-exploration-card')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Clear search', exact: true })).toHaveCount(0);
  await expect(summary).toHaveText('Live variants registered in this repository.');
});

test('exploration chooser excludes the internal landing and retains search and native sorting', async ({ page }) => {
  await openExploration(page, 'northstar-landing');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Open exploration' });
  const search = dialog.getByRole('combobox', { name: 'Search explorations' });
  await dialog.getByRole('combobox', { name: 'Sort', exact: true }).selectOption('updated-asc');
  await expect(dialog.getByRole('combobox', { name: 'Sort', exact: true })).toHaveValue('updated-asc');
  await search.fill('VariantHub landing');
  await expect(dialog.getByText('No explorations found')).toBeVisible();
  await search.fill('Information card');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/items\/information-card$/);
});
