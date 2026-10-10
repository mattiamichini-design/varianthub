import { expect, test } from "@playwright/test";

test("public playground has working HTML and served URL examples", async ({ page }) => {
  for (const name of ["Project brief", "Live brief URL"]) {
    await page.goto("/playground");
    await page.getByRole("region", { name: "Explorations" }).getByRole("button", { name: new RegExp(name) }).click();
    const frame = page.frameLocator("iframe").first();
    await frame.getByLabel("Project name").fill("Workspace example");
    await frame.getByLabel("What should change?").fill("A clearer first step");
    await frame.getByRole("button", { name: "Save brief" }).click();
    await expect(frame.getByRole("status")).toHaveText("Brief saved for this preview.");
    await frame.getByRole("link", { name: "Project details" }).click();
    await expect(frame.getByRole("heading", { name: "Project details" })).toBeVisible();
  }
});

test("landing installs manually or with an agent and preserves the playground return flow", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Good interfaces deserve a proper comparison.",
  );
  await expect(
    page.locator(".site-footer").getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveAttribute("href", "https://github.com/mattiamichini-design/varianthub");
  await page
    .getByRole("link", { name: "Install VariantHub", exact: true })
    .click();
  const install = page.locator("#installation");
  await expect(install.locator(".is-open pre")).toContainText("git clone https://github.com/mattiamichini-design/varianthub.git");
  await install.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(
    install.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "node packages/runner/src/cli.mjs init",
  );
  await install
    .getByRole("button", { name: "Add a few alternatives.", exact: true })
    .click();
  await expect(install.locator(".is-open pre")).toContainText('"explorations"');
  await install.getByRole("tab", { name: "React", exact: true }).click();
  await expect(install.locator(".is-open pre")).toContainText("getComponentVariants");
  await install
    .getByRole("tab", { name: "Use an AI agent", exact: true })
    .click();
  await expect(install.locator(".is-open .prompt-bubble")).toContainText(
    "Use varianthub to create two alternatives",
  );
  await install
    .getByRole("button", { name: "Open your workspace.", exact: true })
    .click();
  await expect(install.locator(".is-open .prompt-bubble")).toContainText(
    "open the workspace",
  );
  await install
    .getByRole("tab", { name: "Do it yourself", exact: true })
    .click();
  await expect(install.locator(".is-open pre")).toContainText(
    "node /path/to/varianthub/packages/runner/src/cli.mjs start",
  );

  await page
    .locator(".site-header")
    .getByRole("button", { name: "Playground", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const playground = page.frameLocator(
    'iframe[title="Interactive VariantHub playground"]',
  );
  await expect(
    playground.getByRole("button", { name: /Action surface Action surface/i }),
  ).toBeVisible();
  await playground
    .getByRole("button", { name: /Action surface Action surface/i })
    .click();
  await expect(
    playground.getByRole("button", { name: "Canvas", exact: true }),
  ).toBeVisible();
  await playground.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(
    playground.getByRole("button", { name: "Canvas", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Reset demo", exact: true }).click();
  await playground.getByRole("button", { name: /Action surface Action surface/i }).click();
  await expect(playground.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Install", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(install.getByRole("heading", { level: 2 })).toBeInViewport();

  await page
    .locator("#agent-skills")
    .getByRole("tab", { name: "VariantHub", exact: true })
    .click();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Replay", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".agent-answer")).toContainText(
    "Both directions are ready",
  );
  await page
    .getByRole("button", {
      name: "Does my project need a cloud account?",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("No. The local runner works in your project", {
      exact: false,
    }),
  ).toBeVisible();
});

test("scroll expands the hero, advances all views and releases the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const track = page.locator(".hero-scroll");
  const bounds = await track.boundingBox();
  if (!bounds) throw new Error("Missing hero scroll track");
  for (const [progress, label] of [
    [0.15, "Compare"],
    [0.4, "Arrange"],
    [0.6, "Test"],
    [0.8, "Keep"],
  ] as const) {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      bounds.y + (bounds.height - 900) * progress - 16,
    );
    await expect(
      page.getByRole("tab", { name: label, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(track).toHaveAttribute("data-pinned", "true");
    await expect.poll(async () => (await page.locator(".hero-stage").boundingBox())!.width).toBeGreaterThan(1390);
  }
  const scrollBeforeKeep = await page.evaluate(() => scrollY);
  await expect(page.frameLocator('iframe[title="Keep — live VariantHub preview"]').getByRole("heading", { name: "Visible variants", exact: true })).toBeVisible();
  expect(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeKeep)).toBeLessThan(4);
  await page.getByRole("tab", { name: "Arrange", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for a closer look." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to page", exact: true }).click();
  await expect(page.locator("#why-varianthub h2")).toBeInViewport();
  await expect(track).toHaveAttribute("data-pinned", "false");
});

test("mobile and reduced motion keep every section usable without horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const hero = await page.locator(".hero-scroll").boundingBox();
    expect(hero!.height).toBeLessThan(1100);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Agent skills" })
    .click();
  await expect(page.locator("#agent-skills h2")).toBeInViewport();
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Explore another direction." }),
  ).toBeVisible();
});

test("mobile proposal keeps the outcomes stacked and all integration choices discoverable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".hero-intro h1")).toHaveCSS("text-align", "left");
  await expect(page.locator(".preview-open").first()).toBeHidden();
  await expect(page.locator(".preview-expand").first()).toBeHidden();
  await expect(page.locator(".outcome-card").first()).toHaveCSS("position", "sticky");
  const cards = page.locator(".outcome-card");
  await cards.last().evaluate(node => scrollTo(0, scrollY + node.getBoundingClientRect().top - 24));
  await expect.poll(() => cards.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)))).toEqual([108, 120, 132, 144]);
  await expect.poll(() => cards.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-stack-depth")))).toEqual(["3", "2", "1", "0"]);
  const stackedWidths = await cards.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
  expect(stackedWidths).toEqual([...stackedWidths].sort((a, b) => a - b));
  await expect(cards.last()).toHaveCSS("max-height", "none");
  const activeCardHeight = await cards.last().evaluate(node => node.getBoundingClientRect().height);
  const activeContentHeight = await cards.last().locator(":scope > *").evaluateAll(nodes => nodes.reduce((height, node) => height + node.getBoundingClientRect().height, 0));
  expect(activeCardHeight).toBeCloseTo(activeContentHeight + 2, 0);
  expect(activeCardHeight).toBeLessThan(460);
  expect(await cards.evaluateAll(nodes => nodes.slice(0, -1).every(node => getComputedStyle(node).clipPath !== "none"))).toBe(true);

  const layout = page.locator(".integration-layout");
  const integrationTabs = layout.locator(".integration-tabs [role=tab]");
  const cardBox = await layout.boundingBox();
  const trackBox = await layout.locator(".integration-tabs").boundingBox();
  expect(trackBox!.x).toBeCloseTo(cardBox!.x + 1, 0);
  expect(trackBox!.x + trackBox!.width).toBeCloseTo(cardBox!.x + cardBox!.width - 1, 0);
  const lastChoice = await integrationTabs.last().boundingBox();
  expect(lastChoice!.x).toBeLessThan(390);
  expect(lastChoice!.x + lastChoice!.width).toBeGreaterThan(390);
  expect(trackBox!.x + trackBox!.width - lastChoice!.x).toBeGreaterThanOrEqual(lastChoice!.width / 2 - 1);

  const active = integrationTabs.first();
  await expect(active.locator("i").first()).toBeVisible();
  await expect(active).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(
    await active.evaluate((node) => getComputedStyle(node, "::before").backgroundColor),
  ).toBe("rgb(28, 90, 254)");

  await integrationTabs.last().click();
  await expect.poll(() => page.locator(".integration-tabs").evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await expect(layout.getByRole("tabpanel").getByLabel("URL integration code")).toBeVisible();
  await expect(layout.locator(".integration-stage.brand-field")).toBeVisible();
  await expect(layout.locator(".code-caption")).toHaveCount(0);
  await expect(layout.locator(".integration-content")).toHaveCSS("animation-name", "integration-enter-mobile");
  const tabsBox = await page.locator(".integration-tabs").boundingBox();
  const visibleLastChoice = await integrationTabs.last().boundingBox();
  expect(visibleLastChoice!.x + visibleLastChoice!.width).toBeLessThanOrEqual(tabsBox!.x + tabsBox!.width);

  await integrationTabs.first().click();
  await expect.poll(async () => {
    const [track, first] = await Promise.all([
      layout.locator(".integration-tabs").boundingBox(),
      integrationTabs.first().boundingBox(),
    ]);
    return first!.x >= track!.x && first!.x + first!.width <= track!.x + track!.width;
  }).toBe(true);

  await page.setViewportSize({ width: 320, height: 844 });
  const narrowLastChoice = await integrationTabs.last().boundingBox();
  const narrowTrack = await layout.locator(".integration-tabs").boundingBox();
  expect(narrowTrack!.x + narrowTrack!.width - narrowLastChoice!.x).toBeGreaterThanOrEqual(narrowLastChoice!.width / 2 - 1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".outcome-card").first()).toHaveCSS("position", "static");
});

test("installation returns to the first step when the desktop sequence becomes mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const install = page.locator("#installation");
  await install.getByRole("button", { name: "Open your workspace.", exact: true }).click();
  await expect(install.getByRole("button", { name: "Open your workspace.", exact: true })).toHaveAttribute("aria-expanded", "true");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(install.getByRole("button", { name: "Start with your project.", exact: true })).toHaveAttribute("aria-expanded", "true");
});

test("Keep opens the real chooser and integration cards remain inside their section", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("tab", { name: "Keep", exact: true }).click();
  const keep = page.frameLocator('iframe[title="Keep — live VariantHub preview"]');
  await expect(keep.getByRole("heading", { name: "Visible variants", exact: true })).toBeVisible();
  await expect(keep.getByRole("button", { name: "Apply", exact: true })).toBeVisible();
  const layout = page.locator(".integration-layout");
  const boxes = await layout.locator('[role="tab"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(boxes.every(height => height >= 100 && height < 180)).toBe(true);
  await page.getByRole("tab", { name: /Your HTML pages/ }).click();
  await expect(layout.getByRole("tabpanel")).toContainText("HTML");
  const bottom = await layout.evaluate(node => node.getBoundingClientRect().bottom);
  expect(await page.locator("#workspace").evaluate(node => node.getBoundingClientRect().top)).toBeGreaterThanOrEqual(bottom);
  for (const field of await page.locator(".outcome-art,.organization-art").all()) {
    const pattern = field.locator(".brand-contours");
    if (await pattern.count()) {
      const outer = await field.boundingBox();
      const inner = await pattern.boundingBox();
      expect(inner!.x).toBeLessThan(outer!.x);
      expect(inner!.x + inner!.width).toBeGreaterThan(outer!.x + outer!.width);
    }
  }
});

test("desktop navigation reaches its section and the hero always previews the next stage", async ({ page }) => {
  await page.goto("/");
  for (const height of [700, 900, 1080]) {
    await page.setViewportSize({ width: 1440, height });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const stage = await page.locator(".hero-stage").boundingBox();
    expect(stage!.y).toBeLessThan(height - 60);
    expect(stage!.y).toBeGreaterThan(400);
  }
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Agent skills" }).click();
  await expect(page.locator("#agent-skills h2")).toBeInViewport();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Agent skills" })).toHaveAttribute("aria-current", "location");
  await page.getByRole("tab", { name: "VariantHub", exact: true }).click();
  await expect(page.locator(".agent-copy h3")).toHaveText("Explore another direction.");
  await page.getByRole("tab", { name: "VariantHub Builder", exact: true }).click();
  await expect(page.locator(".agent-copy h3")).toHaveText("Get your repo ready.");
});

test("installation fills the viewport and holds the second step open for reading", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const track = page.locator(".install-scroll");
  const bounds = await track.boundingBox();
  for (const progress of [.38, .5, .58]) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), bounds!.y + (bounds!.height - 900) * progress);
    await expect.poll(() => track.evaluate(node => node.style.getPropertyValue("--reveal-1"))).toBe("1");
    await expect.poll(() => page.locator("#install-panel-1").evaluate(node => Number(getComputedStyle(node).opacity))).toBe(1);
    const field = await page.locator(".install-field").boundingBox();
    expect(field!.height).toBeGreaterThanOrEqual(868);
    expect(field!.y).toBe(16);
  }
  await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), bounds!.y + (bounds!.height - 900) * .28);
  // The open step has no heading of its own, so its trigger title stays readable.
  await expect.poll(() => page.locator("#install-trigger-0 > .step-title").evaluate(node => Number(getComputedStyle(node).opacity))).toBe(1);
});

test("installation finishes each transition after scrolling stops in either direction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bounds = await page.locator(".install-scroll").boundingBox();
  for (const [progress, index] of [[.36, 1], [.69, 2], [.5, 1], [.2, 0]]) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), bounds!.y + (bounds!.height - 900) * progress);
    const panel = page.locator(`#install-panel-${index}`);
    await expect.poll(() => panel.evaluate(node => Math.abs(node.getBoundingClientRect().height - node.querySelector('.install-open-content')!.getBoundingClientRect().height))).toBeLessThan(1);
    await expect.poll(() => page.locator('.install-panel').evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().height > 1).length)).toBe(1);
  }
});

test("integration selection animates in both directions inside its stationary shell", async ({ page }) => {
  await page.goto("/");
  const layout = page.locator(".integration-layout");
  const shell = layout.locator(".integration-detail");
  await layout.scrollIntoViewIfNeeded();
  const before = await shell.boundingBox();
  await layout.getByRole("tab", { name: /Your HTML pages/ }).click();
  await expect(layout.getByRole("tabpanel").getByLabel("HTML integration code")).toBeVisible();
  await expect(shell).toHaveCSS("--switch-direction", "1");
  await layout.getByRole("tab", { name: /Your React components/ }).click();
  await expect(layout.getByRole("tabpanel").getByLabel("React integration code")).toBeVisible();
  await expect(shell).toHaveCSS("--switch-direction", "-1");
  const after = await shell.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.x).toBe(before?.x);
});

test("fast wheel gestures cannot skip hero screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const track = page.locator(".hero-scroll");
  await expect(track).toHaveCSS("--expansion", "0");
  await page.mouse.move(1400, 500);
  await page.mouse.wheel(0, 2400);
  await expect(track).toHaveAttribute("data-pinned", "false");
  await expect.poll(async () => (await track.boundingBox())!.y).toBeCloseTo(198, 0);
  await page.mouse.wheel(0, 120);
  await expect(track).toHaveAttribute("data-pinned", "true");
  await expect(page.getByRole("tab", { name: "Compare", exact: true })).toHaveAttribute("aria-selected", "true");
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(80);
    await page.mouse.wheel(0, 10 * Math.pow(.75, i));
  }
  await expect(page.getByRole("tab", { name: "Compare", exact: true })).toHaveAttribute("aria-selected", "true");
  for (const name of ["Arrange", "Test", "Keep"]) {
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, 2400);
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(track).toHaveAttribute("data-pinned", "true");
  }
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 2400);
  await expect(track).toHaveAttribute("data-pinned", "false");
});

test("reversing a selection during its exit never leaves the card blank", async ({ page }) => {
  await page.goto("/");
  const layout = page.locator(".integration-layout");
  await layout.scrollIntoViewIfNeeded();
  await layout.getByRole("tab", { name: /Your HTML pages/ }).click();
  await page.waitForTimeout(50);
  await layout.getByRole("tab", { name: /Your React components/ }).click();
  await expect(layout.locator(".integration-content")).toHaveCSS("opacity", "1");
});

test("continuous wheel input advances and reverses without needing an idle gap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const track = page.locator(".hero-scroll");
  const box = await track.boundingBox();
  await page.evaluate(y => scrollTo(0,y), box!.y + 200);
  await expect(track).toHaveAttribute("data-pinned", "true");
  await page.mouse.move(1400,500);
  for (let i=0;i<22;i++) { await page.mouse.wheel(0,100); await page.waitForTimeout(90); }
  await expect(page.getByRole("tab",{name:"Keep",exact:true})).toHaveAttribute("aria-selected","true");
  for (let i=0;i<32;i++) { await page.mouse.wheel(0,-100); await page.waitForTimeout(90); }
  await expect(track).toHaveAttribute("data-pinned","false");
  expect(await page.evaluate(() => scrollY)).toBeLessThan(box!.y);
});

test("hero can be reentered from below and exited above after fast reverse gestures", async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const track = page.locator('.hero-scroll');
  await expect(track).toHaveCSS('--expansion','0');
  const box = await track.boundingBox();
  await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), box!.y + box!.height - 800);
  await page.mouse.move(1400,600);
  for (const name of ['Keep','Test','Arrange','Compare']) {
    await page.mouse.wheel(0,-2400);
    await expect(page.getByRole('tab',{name,exact:true})).toHaveAttribute('aria-selected','true');
    await expect(track).toHaveAttribute('data-pinned','true');
    await expect(page.locator('.feature-copy')).toHaveCSS('opacity','1');
    await page.waitForTimeout(750);
  }
  await page.mouse.wheel(0,-2400);
  await expect(track).toHaveAttribute('data-pinned','false');
});

test("hero expansion reveals a fixed artwork canvas and anchor navigation bypasses steps", async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const track = page.locator('.hero-scroll');
  await expect(track).toHaveCSS('--expansion','0');
  const canvas = page.locator('.hero-stage > .brand-contours');
  const compact = await canvas.boundingBox();
  await page.mouse.move(1400,600);
  await page.mouse.wheel(0,2400);
  await expect.poll(async () => (await track.boundingBox())!.y).toBeCloseTo(198,0);
  await page.mouse.wheel(0,120);
  await expect(track).toHaveAttribute('data-pinned','true');
  await expect.poll(async () => (await page.locator('.hero-stage').boundingBox())!.width).toBeGreaterThan(1390);
  const expanded = await canvas.boundingBox();
  expect(expanded!.width).toBeCloseTo(compact!.width, 2);
  expect(expanded!.height).toBeCloseTo(compact!.height, 2);
  expect(Math.abs(expanded!.x-compact!.x)).toBeLessThan(1);
  await page.getByRole('button',{name:'Back to page',exact:true}).click();
  await expect(page.locator('#why-varianthub h2')).toBeInViewport();
  await page.getByRole('link',{name:'VariantHub home'}).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const started = Date.now();
  await page.getByRole('navigation').getByRole('link',{name:'Agent skills',exact:true}).click();
  await expect(page.locator('#agent-skills h2')).toBeInViewport({timeout:1200});
  expect(Date.now()-started).toBeLessThan(1200);
  await expect(track).toHaveAttribute('data-pinned','false');
  await expect(page.getByRole('tab',{name:'Compare',exact:true})).toHaveAttribute('aria-selected','true');
});

test('expansion animates its position and installation provides an exit', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('.hero-scroll')).toHaveCSS('--expansion','0');
  await page.mouse.move(1400,600);
  await page.mouse.wheel(0,2400);
  await expect.poll(async () => (await page.locator('.hero-scroll').boundingBox())!.y).toBeCloseTo(198,0);
  await page.mouse.wheel(0,120);
  await expect.poll(() => page.locator('.hero-stage').evaluate(el => el.getAnimations().some(a => a.effect instanceof KeyframeEffect && a.effect.getKeyframes().some(k => String(k.transform).includes('translateY'))))).toBe(true);
  await page.getByRole('button',{name:'Back to page',exact:true}).click();
  await page.getByRole('link',{name:'Install',exact:true}).click();
  await expect.poll(async () => (await page.locator('#installation').boundingBox())!.y).toBeCloseTo(100, 0);
  const installationTop = (await page.locator('.install-scroll').boundingBox())!.y;
  await page.mouse.wheel(0, installationTop - 180);
  await expect(page.locator('.install-scroll')).toHaveAttribute('data-pinned','true');
  await page.getByRole('button',{name:'Close installation preview',exact:true}).click();
  await expect(page.locator('.install-scroll')).toHaveAttribute('data-pinned','false');
  await expect(page.locator('#faq h2')).toBeInViewport();
});


test('hero and installation move their artwork with selection and contain terminal shadows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const patterns = ['.hero-stage > .brand-contours', '.install-field > .brand-contours'];
  for (const [i, track] of ['.hero-scroll', '.install-scroll'].entries()) {
    await page.locator(track).evaluate(el => scrollTo({top:scrollY + el.getBoundingClientRect().top + 100,behavior:'instant'}));
    await expect(page.locator(track)).toHaveAttribute('data-pinned', 'true');
    const pattern = page.locator(patterns[i]);
    const before = await pattern.evaluate(el => getComputedStyle(el).translate);
    if (i === 0) await page.getByRole('tab', { name: 'Arrange', exact: true }).click();
    else await page.getByRole('button', { name: 'Add a few alternatives.', exact: true }).click();
    await expect(page.locator(track)).toHaveCSS('--scene-step', '1');
    await expect.poll(() => pattern.evaluate(el => getComputedStyle(el).translate)).not.toBe(before);
    await expect(page.locator(`${i ? '.install-field' : '.hero-stage'} > .brand-grain`)).toHaveCSS('translate', 'none');
  }
  await page.getByRole('button', { name: 'Start with your project.', exact: true }).click();
  await expect(page.locator('#install-panel-0 .install-panel-inner')).toHaveCSS('overflow','visible');
  const shadow = await page.locator('#install-panel-0 .terminal-window').evaluate(el => getComputedStyle(el).boxShadow);
  expect(shadow).toContain('6px 14px -4px');
});
