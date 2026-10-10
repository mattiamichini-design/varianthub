import { type Locator, type Page } from '@playwright/test';
import { expect, expectLayoutLoaded, openExploration, test } from './fixtures';

/** Press the drag handle and move past the activation distance until dnd-kit reports an active drag. */
async function startDrag(page: Page, handle: Locator) {
  await expect(async () => {
    await page.mouse.up();
    await handle.click({ trial: true });
    const box = await handle.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 12, box!.y + box!.height / 2 + 12, { steps: 3 });
    await expect(handle).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
  }).toPass();
}

test('favorites move between sections, persist and accept a drag into the empty area', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openExploration(page, 'action-surface');
  const favoriteButton = page.getByRole('button', { name: 'Add Blue / standard to favorites', exact: true });
  await favoriteButton.click();
  await expect(page.getByRole('button', { name: 'Remove Blue / standard from favorites', exact: true })).toBeVisible();
  await expect(page.locator('.vh-card')).toHaveCount(3);
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toHaveCount(1);
  await page.reload();
  await expectLayoutLoaded(page);
  const remove = page.getByRole('button', { name: 'Remove Blue / standard from favorites', exact: true });
  await expect(remove).toBeVisible();
  await remove.click();
  const target = page.locator('.vh-favorites-dropzone');
  await expect(target).toBeVisible();
  const handle = page.getByRole('button', { name: 'Reorder Blue / standard', exact: true });
  await startDrag(page, handle);
  await expect(async () => {
    const end = await target.boundingBox();
    await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, { steps: 5 });
    await expect(target).toHaveAttribute('data-drop-target', 'true', { timeout: 1_000 });
  }).toPass();
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Remove Blue / standard from favorites', exact: true })).toBeVisible();
  await expect(page.locator('.vh-card')).toHaveCount(3);
  const otherVariants = page.getByRole('region', { name: 'Other variants', exact: true });
  await expect.poll(async () => (await handle.boundingBox())!.y).toBeLessThan((await otherVariants.boundingBox())!.y);
  await startDrag(page, handle);
  // Aim at the section's current position until it reports itself as the drop target.
  await expect(async () => {
    const back = await otherVariants.boundingBox();
    await page.mouse.move(back!.x + back!.width / 2, back!.y + back!.height / 2, { steps: 5 });
    await expect(otherVariants).toHaveAttribute('data-drop-target', 'true', { timeout: 1_000 });
  }).toPass();
  await page.mouse.up();
  await expect(favoriteButton).toBeVisible();
  await expect(target).toBeVisible();
  await startDrag(page, handle);
  await page.mouse.move(1400, 30, { steps: 20 });
  await page.mouse.up();
  await expect(favoriteButton).toBeVisible();
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toHaveCount(0);
});


test('starring a live component keeps its current interaction state', async ({ page }) => {
  await openExploration(page, 'action-surface');
  const card = page.locator('.vh-grid-card').filter({ has: page.getByRole('button', { name: 'Reorder Blue / standard', exact: true }) });
  await card.getByRole('button', { name: 'Request approval', exact: true }).click();
  await card.getByRole('button', { name: 'Add Blue / standard to favorites', exact: true }).click();
  await expect(card).toHaveAttribute('data-group', 'favorites');
  await page.locator('.vh-grid').evaluate(node => { node.setAttribute('tabindex', '-1'); (node as HTMLElement).focus(); });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Favorites\b/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(card.getByRole('button', { name: 'Reorder Blue / standard', exact: true })).toBeFocused();
  await expect(card.getByRole('button', { name: 'Approval sent', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Remove Blue / standard from favorites', exact: true }).click();
  await expect(card).toHaveAttribute('data-group', 'other');
  await expect(card.getByRole('button', { name: 'Approval sent', exact: true })).toBeVisible();
});

test('starring a full-page preview does not reload its live document', async ({ page }) => {
  await openExploration(page, 'fieldwork-html');
  await page.getByRole('button', { name: 'Add Afterhours / nocturnal to favorites', exact: true }).scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe[src="/examples/fieldwork/afterhours.html"]').first();
  await expect(frame.getByRole('heading', { name: 'Less noise. More wonder.' })).toBeVisible();
  await frame.locator('body').evaluate(node => node.setAttribute('data-session-check', 'kept'));
  await page.getByRole('button', { name: 'Add Afterhours / nocturnal to favorites', exact: true }).click();
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toHaveCount(1);
  await expect(frame.locator('body')).toHaveAttribute('data-session-check', 'kept');
  await page.getByRole('button', { name: 'Remove Afterhours / nocturnal from favorites', exact: true }).click();
  await expect(frame.locator('body')).toHaveAttribute('data-session-check', 'kept');
});


test('sections collapse independently without resetting a live preview', async ({ page }) => {
  await openExploration(page, 'fieldwork-html');
  await page.getByRole('button', { name: 'Add Afterhours / nocturnal to favorites', exact: true }).scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe[src="/examples/fieldwork/afterhours.html"]').first();
  await expect(frame.getByRole('heading', { name: 'Less noise. More wonder.' })).toBeVisible();
  await frame.locator('body').evaluate(node => node.setAttribute('data-session-check', 'kept'));
  await page.getByRole('button', { name: 'Add Afterhours / nocturnal to favorites', exact: true }).click();
  const favorites = page.getByRole('button', { name: /^Favorites\b/ });
  const other = page.getByRole('button', { name: /^Other variants\b/ });
  await favorites.click();
  await expect(favorites).toHaveAttribute('aria-expanded', 'false');
  await expect(other).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toBeHidden();
  await other.click();
  await expect(page.locator('.vh-grid-card[data-group="other"]')).toBeHidden();
  await favorites.focus();
  await page.keyboard.press('Space');
  await expect(favorites).toHaveAttribute('aria-expanded', 'true');
  await expect(frame.locator('body')).toHaveAttribute('data-session-check', 'kept');
  await expect(other).toHaveAttribute('aria-expanded', 'false');
});

test('hiding a favorite preserves its star when made visible again', async ({ page }) => {
  await openExploration(page, 'action-surface');
  await page.getByRole('button', { name: 'Add Blue / standard to favorites', exact: true }).click();
  const openChooser = async () => {
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Manage variants', exact: true }).click();
  };
  await openChooser();
  await page.locator('.vh-variant-chooser-option').filter({ hasText: 'Blue / standard' }).click();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toHaveCount(0);
  await expect(page.locator('.vh-grid-card')).toHaveCount(2);
  await openChooser();
  await page.locator('.vh-variant-chooser-option').filter({ hasText: 'Blue / standard' }).click();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.vh-grid-card[data-group="favorites"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Remove Blue / standard from favorites', exact: true })).toBeVisible();
});
