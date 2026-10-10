import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export const test = base.extend({
  // The API client keeps idle sockets until the dev server's keep-alive timeout, which can close a socket
  // just as a later call reuses it (ECONNRESET). Closing each connection after its response avoids that race.
  request: async ({ playwright, baseURL }, provide) => {
    const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Connection: 'close' } });
    await provide(request);
    await request.dispose();
  },
});

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
