import { expect, test } from "@playwright/test";

const examples = [
  ...["slate-quiet", "blue-standard", "violet-strong"].map(id => `action-surface/${id}`),
  ...["card-slate", "card-amber"].map(id => `information-card/${id}`),
  ...["cobalt-focus", "coral-editorial", "lime-contrast"].map(id => `northstar-landing/${id}`),
  ...Array.from({ length: 12 }, (_, index) => `responsive-controls/direction-${index + 1}`),
];

for (const width of [1280, 390]) {
  test(`public examples remain readable within a ${width}px viewport`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    for (const example of [...examples, "html-brief"]) {
      await test.step(example, async () => {
        const path = example === "html-brief" ? "/examples/brief/index.html" : `/variant-render/${example}`;
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1, h2").first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
        if (!example.startsWith("responsive-controls/") || /direction-(1|3)$/.test(example)) {
          await page.screenshot({ path: info.outputPath(`${example.replaceAll("/", "-")}-${width}.png`), fullPage: true });
        }
      });
    }
  });
}

test("action examples preserve keyboard activation and their reversible states", async ({ page }) => {
  for (const [id, initial, completed] of [
    ["slate-quiet", "Open review", "Review opened"],
    ["blue-standard", "Request approval", "Approval sent"],
    ["violet-strong", "Publish preview", "Preview published"],
  ]) {
    await page.goto(`/variant-render/action-surface/${id}`);
    const button = page.getByRole("button", { name: initial, exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: completed, exact: true })).toBeFocused();
    await expect(page.getByText("Status updated", { exact: true })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(button).toBeFocused();
    await expect(page.getByText("Ready to continue", { exact: true })).toBeVisible();
  }
});

test("responsive form keeps its input and keyboard order when the layout changes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/variant-render/responsive-controls/direction-3");
  const breakpoint = page.getByLabel("Viewport breakpoint");
  await expect.poll(() => breakpoint.evaluate(el => getComputedStyle(el, "::after").content)).toBe('"Desktop"');
  const note = page.getByRole("textbox", { name: "Workspace note" });
  await note.fill("Keep this decision while resizing");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Audience" })).toBeFocused();
  await page.getByRole("combobox", { name: "Audience" }).selectOption("studio");
  await page.getByLabel("What should people remember?").fill("A clear next step");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(note).toHaveValue("Keep this decision while resizing");
  await expect(page.getByRole("combobox", { name: "Audience" })).toHaveValue("studio");
  await expect(page.getByLabel("What should people remember?")).toHaveValue("A clear next step");
  await expect.poll(() => breakpoint.evaluate(el => getComputedStyle(el, "::after").content)).toBe('"Mobile"');
  await page.getByRole("button", { name: "Prepare direction", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Brief ready", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Jump to details" }).click();
  await expect(page).toHaveURL(/#bottom$/);
  await expect(page.getByRole("heading", { name: "Leave the room with a decision." })).toBeInViewport();
});

test("standalone brief retains native validation, keyboard submission and navigation", async ({ page }) => {
  await page.goto("/examples/brief/index.html");
  await page.getByRole("button", { name: "Save brief" }).click();
  await expect(page.getByLabel("Project name")).toBeFocused();
  await expect(page.getByRole("status")).toBeEmpty();
  await page.getByLabel("Project name").fill("Public example");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("What should change?")).toBeFocused();
  await page.keyboard.type("Make the next action clear");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Save brief" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Brief saved for this preview.");
  await page.getByRole("link", { name: "Project details", exact: true }).click();
  await expect(page).toHaveURL(/#details$/);
  await expect(page.getByRole("heading", { name: "Project details", exact: true })).toBeInViewport();
});

test("all Northstar layouts retain internal and external navigation", async ({ page }) => {
  for (const id of ["cobalt-focus", "coral-editorial", "lime-contrast"]) {
    await page.goto(`/variant-render/northstar-landing/${id}`);
    await page.getByRole("link", { name: "Explore details", exact: true }).click();
    await expect(page).toHaveURL(/#details$/);
    await expect(page.getByRole("heading", { name: "Make room for the idea that changes the room." })).toBeInViewport();
    const external = page.getByRole("link", { name: /Visit example.com/ });
    await expect(external).toHaveAttribute("target", "_blank");
    await expect(external).toHaveAttribute("rel", /noreferrer|noopener/);
    await page.getByRole("link", { name: /Back to top/ }).click();
    await expect(page).toHaveURL(/#top$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  }
});
