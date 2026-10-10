import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export const test = base;

/**
 * Wait until the exploration page has hydrated and loaded its shared layout. Controls are rendered on the
 * server first, so earlier input can be lost, and the loaded layout replaces earlier local changes.
 */
export async function expectLayoutLoaded(page: Page) {
  await expect(page.locator('.vh-save-status--saved').first()).toHaveAttribute('title', 'Saved');
}

/** Open an exploration and wait until it accepts input. */
export async function openExploration(page: Page, key: string) {
  await page.goto(`/items/${key}`);
  await expectLayoutLoaded(page);
}
