import { type Locator, type Page } from "@playwright/test";
import { expect, expectLayoutLoaded, openExploration, test } from "./fixtures";

const pageItem = {
  key: "northstar-landing",
  name: "Northstar landing page",
  variants: [
    { id: "cobalt-focus", name: "Cobalt focus" },
    { id: "coral-editorial", name: "Coral editorial" },
    { id: "lime-contrast", name: "Lime contrast" },
  ],
} as const;

function visibleButton(page: Page, title: string) {
  return page.locator(`button[title="${title}"]:visible`).first();
}

function previewFrames(page: Page) {
  return page.locator("iframe");
}

function activeImmersiveFrame(page: Page) {
  return page.locator("iframe:visible").first();
}

function immersiveFrame(page: Page, variantId: string) {
  return page.locator(`iframe[data-variant-id="${variantId}"]:visible`).first();
}

async function expectPreviewVariant(page: Page, variantId: string, itemKey: string = pageItem.key) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/preview/${itemKey}/${variantId}`);
}

async function contentFrame(iframe: Locator) {
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  expect(frame, "the preview iframe should have a browsing context").not.toBeNull();
  return frame!;
}

async function openPageItem(page: Page) {
  await page.goto(`/items/${pageItem.key}`);
  await expectLayoutLoaded(page);
  await expect(page.locator(".vh-toolbar-selection").getByText("3 visible", { exact: false })).toBeVisible();
  await expect(page.getByText(pageItem.variants[0].name, { exact: true }).first()).toBeVisible();
}

/** Select a card and wait until it reports the selection, repeating the click if the workspace state replaced it. */
async function selectVariant(page: Page, name: string) {
  await expect(async () => {
    const select = page.getByRole("button", { name: `Select ${name}`, exact: true });
    if (await select.count()) await select.click();
    await expect(page.getByRole("button", { name: `Deselect ${name}`, exact: true })).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function openImmersive(page: Page, variantId: string = pageItem.variants[0].id) {
  if (await page.getByRole("button", { name: "Compare", exact: true }).count()) {
    await page.getByRole("button", { name: "Compare", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "More actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Compare all", exact: true }).click();
  }
  await expectPreviewVariant(page, variantId);
  await expect(page.getByRole("button", { name: /next variant/i })).toBeVisible();
}


// These browser scenarios share repository-owned layouts; reset only the demo fixtures.
test.beforeEach(async ({ request, baseURL }) => {
  const session = await (await request.get("/api/workspace")).json();
  for (const [key, ids, columns] of [
    ["action-surface", ["slate-quiet", "blue-standard", "violet-strong"], 2],
    ["northstar-landing", ["cobalt-focus", "coral-editorial", "lime-contrast"], 1],
  ] as const) {
    const current = await (await request.get(`/api/workspace/${key}`)).json();
    const response = await request.put(`/api/workspace/${key}`, {
      headers: { Origin: new URL(baseURL!).origin, "X-VariantHub-Token": session.token },
      data: { revision: current.revision, layout: { version: 1, variantOrder: ids, comparedVariantIds: ids, gridCols: columns } },
    });
    expect(response.status()).toBe(200);
  }
});

test.describe("page variants in the comparison grid", () => {
  test("uses the standard VariantHub catalog and has no standalone demo wrapper", async ({ page }) => {
    await page.goto("/workspace");

    await expect(page.getByRole("heading", { name: "VariantHub", exact: true })).toBeVisible();
    await expect(page.getByText(pageItem.name, { exact: true }).filter({visible:true}).first()).toBeVisible();
    await expect(page.getByText("Standalone application", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Demo catalog", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Integration model", { exact: true })).toHaveCount(0);
  });

  test("renders the route-selected detail in the initial response", async ({ page }) => {
    const response = await page.goto("/items/action-surface");
    const html = await response?.text();

    expect(html).toContain("Slate / quiet");
    await expect(page.getByRole("button", { name: "Open review", exact: true }).first()).toBeVisible();
  });

  test("defaults page items to one column and uses real iframe viewports at 1/2/3 columns", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPageItem(page);

    const firstFrame = page.locator(`iframe[title="${pageItem.variants[0].name} page preview"]`);
    await expect(firstFrame).toHaveAttribute("src", /\/variant-render\//);
    await expect(page.locator(".vh-page-card .vh-card-timestamp")).toHaveCount(3);
    await expect(page.getByText("Open full page", { exact: true })).toHaveCount(0);
    await expect(visibleButton(page, "1 column")).toHaveAttribute("aria-pressed", "true");

    const widths: number[] = [];
    for (const [columns, title] of [
      [1, "1 column"],
      [2, "2 columns"],
      [3, "3 columns"],
    ] as const) {
      await visibleButton(page, title).click();
      await expect(visibleButton(page, title)).toHaveAttribute("aria-pressed", "true");
      await expect(firstFrame).toBeVisible();
      const frame = await contentFrame(firstFrame);
      widths.push(await frame.evaluate(() => window.innerWidth));
      await test.info().attach(`${columns}-column-iframe-width`, {
        body: String(widths.at(-1)),
        contentType: "text/plain",
      });
    }

    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  test("does not navigate offscreen iframe documents until their cards approach the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 650 });
    await openPageItem(page);

    await expect(
      page.locator(`iframe[title="${pageItem.variants[0].name} page preview"]`),
    ).toHaveAttribute("src", /\/variant-render\//);
    const initialFrameCount = await previewFrames(page).count();
    expect(initialFrameCount).toBeGreaterThan(0);
    expect(initialFrameCount).toBeLessThan(3);

    await page.getByText(pageItem.variants[2].name, { exact: true }).first().scrollIntoViewIfNeeded();
    const lastFrame = page.locator(
      `iframe[title="${pageItem.variants[2].name} page preview"]`,
    );
    await expect(lastFrame).toHaveAttribute(
      "src",
      new RegExp(`/variant-render/${pageItem.key}/${pageItem.variants[2].id}`),
    );
    const frame = await contentFrame(lastFrame);
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
  });

  test("keeps component items on the existing React preview path", async ({ page }) => {
    await openPageItem(page);
    await page.keyboard.press("Control+k");
    await page.locator(".vh-selector-option:visible").filter({ hasText: "Action surface" }).click();

    await expect(page.getByRole("button", { name: "Open review", exact: true }).first()).toBeVisible();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect(previewFrames(page)).toHaveCount(0);
    await expect(visibleButton(page, "2 columns")).toHaveAttribute("aria-pressed", "true");
  });

  test("compares selected component variants in the same immersive shell", async ({ page }) => {
    await openExploration(page, "action-surface");
    await page.getByRole("button", { name: "Select Blue / standard", exact:true }).click();
    await page.getByRole("button", { name: "Select Violet / strong", exact:true }).click();
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expectPreviewVariant(page, "blue-standard", "action-surface");

    await expect(page.getByText("1 of 2", { exact: true })).toBeVisible();
    const frame = await contentFrame(immersiveFrame(page, "blue-standard"));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
    await expect(frame.getByRole("button", { name: "Request approval", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, "violet-strong", "action-surface");
  });
});

test.describe("immersive page preview", () => {
  test("opens from the toolbar and supports a reloadable deep link", async ({ page }) => {
    await openPageItem(page);
    await openImmersive(page);

    await expectPreviewVariant(page, pageItem.variants[0].id);
    await expect(page.getByText(pageItem.name, { exact: true }).filter({visible:true}).first()).toBeVisible();
    await expect(page.getByText(pageItem.variants[0].name, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText(pageItem.variants[0].name, { exact: true })).toBeVisible();
    const frame = await contentFrame(activeImmersiveFrame(page));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
  });

  test("switches with toolbar buttons, wraps, and forwards arrow shortcuts from the iframe", async ({
    page,
  }) => {
    await page.goto(`/preview/${pageItem.key}/${pageItem.variants[0].id}`);
    await expect(page.getByRole("button", { name: /previous variant/i })).toBeVisible();

    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[1].id);

    await page.getByRole("button", { name: /previous variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[0].id);

    let frame = await contentFrame(immersiveFrame(page, pageItem.variants[0].id));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
    await frame.locator("body").press("ArrowLeft");
    await expectPreviewVariant(page, pageItem.variants[2].id);

    frame = await contentFrame(immersiveFrame(page, pageItem.variants[2].id));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
    await frame.locator("body").press("ArrowRight");
    await expectPreviewVariant(page, pageItem.variants[0].id);
  });

  test("uses only selected variants as the comparison sequence", async ({
    page,
  }) => {
    await openPageItem(page);
    const selected = pageItem.variants.slice(1);
    for (const variant of selected) await selectVariant(page, variant.name);

    await openImmersive(page, selected[0].id);
    await expect(page.getByText("1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, selected[1].id);
    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, selected[0].id);
  });

  test("initializes an unsaved comparison with the registered variants", async ({ page }) => {
    await openPageItem(page);
    await openImmersive(page);

    await expect(page.getByText(/1\s*(?:of|\/)\s*3/i)).toBeVisible();
    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[1].id);
    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[2].id);
  });

  test("restores the hash and scroll position separately for each variant", async ({ page }) => {
    await page.goto(`/preview/${pageItem.key}/${pageItem.variants[0].id}`);
    let frame = await contentFrame(immersiveFrame(page, pageItem.variants[0].id));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
    await frame.getByRole("link", { name: "Explore details" }).click();
    await expect
      .poll(async () => {
        const currentFrame = await contentFrame(
          immersiveFrame(page, pageItem.variants[0].id),
        );
        return currentFrame.evaluate(() => location.hash);
      })
      .toBe("#details");
    frame = await contentFrame(immersiveFrame(page, pageItem.variants[0].id));
    const cobaltScroll = await frame.evaluate(() => window.scrollY);
    expect(cobaltScroll).toBeGreaterThan(0);

    await page.getByRole("button", { name: /next variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[1].id);
    frame = await contentFrame(immersiveFrame(page, pageItem.variants[1].id));
    await expect(frame.getByTestId("variant-renderer")).toBeVisible();
    await frame.getByRole("link", { name: "Story", exact: true }).click();
    await expect
      .poll(async () => {
        const currentFrame = await contentFrame(
          immersiveFrame(page, pageItem.variants[1].id),
        );
        return currentFrame.evaluate(() => location.hash);
      })
      .toBe("#story");

    await page.getByRole("button", { name: /previous variant/i }).click();
    await expectPreviewVariant(page, pageItem.variants[0].id);
    await expect
      .poll(async () => {
        const currentFrame = await contentFrame(
          immersiveFrame(page, pageItem.variants[0].id),
        );
        return currentFrame.evaluate(() => location.hash);
      })
      .toBe("#details");
    await expect
      .poll(async () => {
        const currentFrame = await contentFrame(
          immersiveFrame(page, pageItem.variants[0].id),
        );
        return currentFrame.evaluate(() => window.scrollY);
      })
      .toBeGreaterThanOrEqual(cobaltScroll - 2);
  });

  test("opens external links in a new tab without navigating the embedded document", async ({ page }) => {
    await page.goto(`/preview/${pageItem.key}/${pageItem.variants[0].id}`);
    const frame = await contentFrame(activeImmersiveFrame(page));
    const frameUrl = frame.url();

    const popupPromise = page.waitForEvent("popup");
    await frame.getByRole("link", { name: "Visit example.com" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/^https:\/\/example\.com\/?/);
    expect(frame.url()).toBe(frameUrl);
    await popup.close();
  });

  test("returns to the comparison grid and mounts at most active/previous/next frames", async ({ page }) => {
    await openPageItem(page);
    await openImmersive(page);
    await expect(previewFrames(page)).toHaveCount(3);

    await page.getByRole("button", { name: /exit|back/i }).first().click();
    await expect(page).not.toHaveURL(/\/preview\//);
    await expect(page.getByText(pageItem.variants[0].name, { exact: true }).first()).toBeVisible();
  });

  test("shows safe not-found states for unknown items and variants", async ({ page }) => {
    await page.goto("/preview/missing-item/missing-variant");
    await expect(
      page.getByRole("heading", { name: /this page could not be found/i }),
    ).toBeVisible();
    await expect(previewFrames(page)).toHaveCount(0);

    await page.goto(`/variant-render/${pageItem.key}/missing-variant`);
    await expect(
      page.getByRole("heading", { name: /this page could not be found/i }),
    ).toBeVisible();
  });
});
