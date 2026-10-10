import { test, expect } from '@playwright/test';

test('demo details can be edited and survive a reload', async ({ page }) => {
  await page.goto('/items/information-card');
  await expect(page.locator('.vh-save-status')).toHaveAttribute('title', 'Saved');
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit component' });
  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Discarded name');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Information card');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Updated information card');
  await dialog.getByRole('textbox', { name: 'Description', exact: true }).fill('Updated demo details');
  await dialog.getByRole('textbox', { name: 'New category', exact: true }).fill('Documentation');
  await dialog.getByRole('textbox', { name: 'Tags', exact: true }).fill('reference, stable');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator('.vh-save-status')).toHaveAttribute('title', 'Saved');
  await expect(page.getByRole('button', { name: 'Updated information card', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('Updated demo details');
  await expect(dialog.getByRole('button', { name: 'Documentation', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('textbox', { name: 'Tags', exact: true })).toHaveValue('reference, stable');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
});
