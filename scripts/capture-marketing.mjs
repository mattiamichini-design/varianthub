import { chromium } from '@playwright/test';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {});
try {
  const page = await browser.newPage({viewport: {width: 540, height: 1000}, deviceScaleFactor: 2, reducedMotion: 'reduce'});
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
  await page.goto(`${base}/playground?mode=keep`);
  // Capture only the dialog surface: the landing page draws its own shadow, so the
  // page, backdrops and dialog shadow must stay out of the rounded corners.
  await page.addStyleTag({content: `
    html, body { background: transparent !important; }
    body * { visibility: hidden !important; }
    .vh-comparison-dialog, .vh-comparison-dialog *,
    .vh-selector-dialog .vh-selector-menu, .vh-selector-dialog .vh-selector-menu * { visibility: visible !important; }
    ::backdrop { background: transparent !important; backdrop-filter: none !important; }
    .vh-comparison-dialog, .vh-selector-dialog .vh-selector-menu { border: 0 !important; box-shadow: none !important; }
  `});
  const chooser = page.locator('.vh-comparison-dialog');
  await chooser.waitFor({state: 'visible'});
  await page.evaluate(() => document.fonts.ready);
  await chooser.screenshot({path: 'public/brand/variant-chooser.png', animations: 'disabled', omitBackground: true});
  console.log('variant-chooser', await chooser.boundingBox());
  await page.getByRole('button', {name: 'Close variant chooser', exact: true}).click();
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.locator('.vh-selector-dialog .vh-selector-menu');
  await search.waitFor({state: 'visible'});
  await search.screenshot({path: 'public/brand/workspace-search.png', animations: 'disabled', omitBackground: true});
  console.log('workspace-search', await search.boundingBox());
} finally {
  await browser.close();
}
