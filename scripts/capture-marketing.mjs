import { chromium } from '@playwright/test';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {});
try {
  const page = await browser.newPage({viewport: {width: 540, height: 1000}, deviceScaleFactor: 2, reducedMotion: 'reduce'});
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
  await page.goto(`${base}/playground?mode=keep`);
  const chooser = page.locator('.vh-comparison-dialog');
  await chooser.waitFor({state: 'visible'});
  await page.evaluate(() => document.fonts.ready);
  await chooser.screenshot({path: 'public/brand/variant-chooser.png', animations: 'disabled'});
  console.log('variant-chooser', await chooser.boundingBox());
  await page.getByRole('button', {name: 'Close variant chooser', exact: true}).click();
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.locator('.vh-selector-dialog');
  await search.waitFor({state: 'visible'});
  await search.screenshot({path: 'public/brand/workspace-search.png', animations: 'disabled'});
  console.log('workspace-search', await search.boundingBox());
} finally {
  await browser.close();
}
