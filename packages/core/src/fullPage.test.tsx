import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VARIANT_HUB_MESSAGE_SOURCE,
  VariantHubImmersivePage,
  VariantHubToolbar,
  PageVariantCard,
  VariantHubPreviewBridge,
  VariantHubVariantRenderer,
  buildVariantSequence,
  buildComparisonTarget,
  getVariantSourceType,
  reconcileComparedVariantIds,
  reconcileVariantDiscovery,
  resolveViewportPresets,
  isVariantHubPreviewMessage,
  normalizeVariantHubState,
  createVariant,
  type VariantHubCatalogItem,
} from "./index";
import { VariantHubPreviewFrame } from "./VariantHubPreviewFrame";

const item: VariantHubCatalogItem = {
  key: "landing",
  name: "Landing",
  path: "/landing",
  kind: "page",
  variants: [
    { id: "a", name: "Alpha", component: () => <main>Alpha</main> },
    { id: "b", name: "Beta", component: () => <main>Beta</main> },
    { id: "c", name: "Gamma", component: () => <main>Gamma</main> },
    { id: "d", name: "Delta", component: () => <main>Delta</main> },
  ],
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("full-page public seams", () => {
  it("falls back from invalid project viewport presets", () => {
    expect(resolveViewportPresets({ mobile: { width: Number.NaN, height: 900 } }).mobile).toEqual({ width: 390, height: 844 });
    expect(resolveViewportPresets({ mobile: { width: 412, height: 915 } }).mobile).toEqual({ width: 412, height: 915 });
  });

  it("normalizes legacy component state without discarding it", () => {
    const state = normalizeVariantHubState({
      activeComponentKey: "landing",
      components: {
        landing: {
          componentKey: "landing",
          variantOrder: ["b", "a"],
          selectedVariants: ["b"],
          favoriteVariants: [],
          variantCreatedAt: {},
          variantUpdatedAt: {},
          variantSignatures: {},
          zoom: 75,
        },
      },
    });

    expect(state.components.landing).toMatchObject({
      variantOrder: ["b", "a"],
      selectedVariants: [],
      zoom: 75,
      gridCols: undefined,
    });
    expect(
      normalizeVariantHubState({
        activeComponentKey: "landing",
        components: { landing: { ...state.components.landing, gridCols: 3 } },
      }).components.landing.gridCols,
    ).toBe(3);
  });

  it("builds the immersive sequence from selected variants, otherwise all", () => {
    expect(buildVariantSequence(["b", "a", "c"], ["a", "c"], "b")).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(buildVariantSequence(["b", "a", "c"], [], "a")).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(buildVariantSequence(["b", "a", "c"], ["c", "b"], "b")).toEqual([
      "b",
      "c",
    ]);
    expect(
      buildVariantSequence(["cobalt", "coral"], ["coral"], "cobalt"),
    ).toEqual(["cobalt", "coral"]);
    expect(
      buildVariantSequence(["coral", "lime", "cobalt"], ["coral"], "cobalt"),
    ).toEqual(["coral", "cobalt"]);
  });

  it("builds toolbar comparisons from all or only selected variants", () => {
    expect(buildComparisonTarget("landing", ["b", "a", "c"], [])).toEqual({
      itemKey: "landing",
      variantId: "b",
      sequenceVariantIds: ["b", "a", "c"],
    });
    expect(buildComparisonTarget("landing", ["b", "a", "c"], ["c", "b"])).toEqual({
      itemKey: "landing",
      variantId: "b",
      sequenceVariantIds: ["b", "c"],
    });
  });

  it("normalizes legacy React sources and caps comparison without hiding variants", () => {
    expect(getVariantSourceType(item.variants[0]!)).toBe("react");
    const ids = Array.from({ length: 22 }, (_, index) => `v${index + 1}`);
    expect(reconcileComparedVariantIds(ids, [])).toEqual(ids.slice(0, 20));
    expect(reconcileComparedVariantIds(ids, ids.slice(0, 20), "v22")).toEqual([
      ...ids.slice(0, 19),
      "v22",
    ]);
  });

  it("adds new registrations until twenty and preserves intentionally hidden known variants", () => {
    const ids = (count: number) => Array.from({length: count}, (_, index) => `v${index + 1}`);
    expect(reconcileVariantDiscovery(ids(8), ids(6), ids(6))).toMatchObject({comparedVariantIds: ids(8), pendingVariantIds: []});
    expect(reconcileVariantDiscovery(ids(16), ids(10), ids(10))).toMatchObject({comparedVariantIds: ids(16), pendingVariantIds: []});
    expect(reconcileVariantDiscovery(ids(8), ids(6), ["v1", "v2", "v3", "v4"])).toMatchObject({
      comparedVariantIds: ["v1", "v2", "v3", "v4", "v7", "v8"],
      pendingVariantIds: [],
    });
  });

  it("keeps twenty previews stable while six additions await an explicit choice", () => {
    const registered = Array.from({length: 26}, (_, index) => `v${index + 1}`);
    const result = reconcileVariantDiscovery(registered, registered.slice(0, 20), registered.slice(0, 20));
    expect(result.comparedVariantIds).toEqual(registered.slice(0, 20));
    expect(result.pendingVariantIds).toEqual(registered.slice(20));
    expect(reconcileVariantDiscovery(registered, registered, result.comparedVariantIds, result.pendingVariantIds)).toEqual(result);
  });

  it("isolates an invalid source instead of breaking sibling variants", () => {
    const invalidItem = {
      ...item,
      variants: [
        item.variants[0]!,
        { id: "bad", name: "Broken URL", source: { type: "url", url: "file:///tmp/private" } },
      ],
    } as VariantHubCatalogItem;
    render(<VariantHubVariantRenderer item={invalidItem} variantId="bad" />);
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP or HTTPS");
    cleanup();
    render(<VariantHubVariantRenderer item={invalidItem} variantId="a" />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders a registered variant through the public renderer", () => {
    render(<VariantHubVariantRenderer item={item} variantId="b" />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("accepts lazy variants created by the registry helper", async () => {
    const variant = createVariant("lazy", "Lazy", async () => ({ default: () => <main>Lazy works</main> }));
    expect(getVariantSourceType(variant)).toBe("react");
    render(<VariantHubVariantRenderer item={{ ...item, variants: [variant] }} variantId="lazy" />);
    expect(await screen.findByText("Lazy works")).toBeInTheDocument();
  });

  it("rejects unsafe HTML entry protocols", () => {
    const unsafe = { id: "unsafe", name: "Unsafe", source: { type: "html", entry: "javascript:alert(1)" } } as VariantHubCatalogItem["variants"][number];
    render(<VariantHubVariantRenderer item={{ ...item, variants: [unsafe] }} variantId="unsafe" />);
    expect(screen.getByRole("alert")).toHaveTextContent("safe relative path");
  });

  it("does not assign a page iframe until the card approaches the viewport", () => {
    let reveal: (() => void) | undefined;
    class Observer {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    render(
      <PageVariantCard
        itemKey={item.key}
        variant={item.variants[0]!}
        frameUrl="/render/a"
        isSelected={false}
        isFavorite={false}
        createdAt="2026-07-10T09:00:00.000Z"
        onToggleSelect={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.queryByTitle("Alpha page preview")).not.toBeInTheDocument();
    act(() => reveal?.());
    expect(screen.getByTitle("Alpha page preview")).toHaveAttribute("src", "/render/a");
    expect(screen.getByText("2026-07-10 09:00 UTC")).toBeInTheDocument();
    expect(screen.queryByText("Open full page")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("preserves the deprecated page-card open callback for direct consumers", () => {
    const onOpen = vi.fn();
    render(
      <PageVariantCard
        itemKey={item.key}
        variant={item.variants[0]!}
        frameUrl="/render/a"
        isSelected={false}
        isFavorite={false}
        onToggleSelect={vi.fn()}
        onToggleFavorite={vi.fn()}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Alpha full page" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("keeps at most the active, previous and next immersive frames mounted", () => {
    render(
      <VariantHubImmersivePage
        item={item}
        activeVariantId="b"
        selectedVariantIds={[]}
        getFrameUrl={({ variantId }) => `/render/${variantId}`}
        onNavigate={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getAllByTitle(/Landing/)).toHaveLength(3);
  });

  it("offers direct-source and retry controls for preview recovery", () => {
    render(
      <VariantHubPreviewFrame src="/render/a" title="Landing — Alpha" />,
    );
    const firstFrame = screen.getByTitle("Landing — Alpha");
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "/render/a");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByTitle("Landing — Alpha")).not.toBe(firstFrame);
  });

  it("retains blob preview URLs and carries instance identity in their fragment", () => {
    sessionStorage.setItem('varianthub:demo:landing:a:immersive:page-session',JSON.stringify({href:`blob:${window.location.origin}/expired-id#story`,scrollY:120}));
    const { container } = render(<VariantHubImmersivePage projectId="demo" item={item} activeVariantId="a"
      getFrameUrl={() => `blob:${window.location.origin}/preview-id#vhRoute=landing%2Fa`}
      onNavigate={vi.fn()} onExit={vi.fn()} />);
    const frame = container.querySelector<HTMLIFrameElement>('iframe[data-variant-id="a"]')!;
    const url = new URL(frame.src);
    expect(url.protocol).toBe("blob:");
    expect(url.pathname).toContain("/preview-id");
    expect(url.search).toBe("");
    const identity = new URLSearchParams(url.hash.slice(1));
    expect(identity.get("vhAnchor")).toBe("story");
    expect(identity.get("vhProject")).toBe("demo");
    expect(identity.get("vhVariant")).toBe("a");
    expect(identity.get("vhInstance")).toBe("immersive");
  });

  it("keeps an explicit immersive sequence stable after navigation", () => {
    const stableItem: VariantHubCatalogItem = {
      ...item,
      variants: [
        { id: "cobalt", name: "Cobalt", component: () => null },
        { id: "coral", name: "Coral", component: () => null },
        { id: "lime", name: "Lime", component: () => null },
      ],
    };
    const props = {
      item: stableItem,
      selectedVariantIds: ["coral"],
      sequenceVariantIds: ["cobalt", "coral"],
      getFrameUrl: ({ variantId }: { variantId: string }) => `/render/${variantId}`,
      onNavigate: vi.fn(),
      onExit: vi.fn(),
    };
    const { rerender } = render(
      <VariantHubImmersivePage {...props} activeVariantId="cobalt" />,
    );
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    rerender(<VariantHubImmersivePage {...props} activeVariantId="coral" />);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    const reorderedProps = {
      ...props,
      sequenceVariantIds: ["coral", "cobalt"],
    };
    rerender(
      <VariantHubImmersivePage {...reorderedProps} activeVariantId="coral" />,
    );
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    rerender(
      <VariantHubImmersivePage {...reorderedProps} activeVariantId="cobalt" />,
    );
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("falls back when an explicit sequence excludes the active variant", () => {
    const { container } = render(
      <VariantHubImmersivePage
        item={item}
        activeVariantId="c"
        selectedVariantIds={["a"]}
        sequenceVariantIds={["a", "b"]}
        getFrameUrl={({ variantId }) => `/render/${variantId}`}
        onNavigate={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(within(container).getByText("2 of 2")).toBeInTheDocument();
    expect(within(container).getAllByTitle(/Landing/)).toHaveLength(2);
  });

  it("offers Compare all in More without a selection", () => {
    const onCompare = vi.fn();
    render(
      <VariantHubToolbar
        zoom={100}
        onZoomChange={vi.fn()}
        selectedCount={0}
        totalCount={4}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
        onExport={vi.fn()}
        onFavoriteSelected={vi.fn()}
        onCompareAll={onCompare}
        canFavoriteSelection={false}
        canUnfavoriteSelection={false}
        gridCols={2}
        onGridColsChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Compare", exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Compare all" }));
    expect(onCompare).toHaveBeenCalledOnce();
  });

  it("handles plain arrows and Escape while ignoring editable targets", () => {
    const onNavigate = vi.fn();
    const onExit = vi.fn();
    render(
      <>
        <input aria-label="Editor" />
        <VariantHubImmersivePage
          item={item}
          activeVariantId="b"
          selectedVariantIds={[]}
          getFrameUrl={({ variantId }) => `/render/${variantId}`}
          onNavigate={onNavigate}
          onExit={onExit}
        />
      </>,
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onNavigate).toHaveBeenCalledWith("c");
    fireEvent.keyDown(screen.getByLabelText("Editor"), {
      key: "ArrowLeft",
    });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("accepts only schema-valid preview messages", () => {
    expect(
      isVariantHubPreviewMessage({
        source: VARIANT_HUB_MESSAGE_SOURCE,
        type: "shortcut",
        key: "Escape",
        shiftKey: false,
      }),
    ).toBe(true);
    expect(
      isVariantHubPreviewMessage({
        source: VARIANT_HUB_MESSAGE_SOURCE,
        type: "state",
        href: "/render/a",
        scrollY: Number.NaN,
      }),
    ).toBe(false);
    expect(isVariantHubPreviewMessage({ source: "attacker", type: "shortcut" })).toBe(false);
  });

  it("persists frame state only when the complete frame identity matches", () => {
    render(
      <VariantHubImmersivePage
        projectId="demo"
        item={item}
        activeVariantId="b"
        getFrameUrl={({ variantId }) => `/render/${variantId}`}
        onNavigate={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    const frame = screen.getByTitle("Landing — Beta") as HTMLIFrameElement;
    const send = (variantId: string, scrollY: number) => window.dispatchEvent(new MessageEvent("message", {
      origin: window.location.origin,
      source: frame.contentWindow,
      data: {
        source: VARIANT_HUB_MESSAGE_SOURCE,
        type: "state",
        projectId: "demo",
        itemKey: "landing",
        variantId,
        instanceId: "immersive",
        href: `${window.location.origin}/render/${variantId}`,
        scrollY,
      },
    }));

    send("a", 10);
    expect(sessionStorage).toHaveLength(0);
    send("b", 20);
    expect(JSON.parse(sessionStorage.getItem("varianthub:demo:landing:b:immersive:page-session") ?? "null")).toMatchObject({ scrollY: 20 });
  });

  it("forwards preview shortcuts only from the configured same-origin frame", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage },
    });
    render(<VariantHubPreviewBridge projectId="demo" itemKey="landing" variantId="a" instanceId="mobile" />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "shortcut", key: "ArrowRight", projectId: "demo", itemKey: "landing", variantId: "a", instanceId: "mobile" }),
      window.location.origin,
    );
  });

  it("coalesces SPA navigation state reports into an animation frame", () => {
    const postMessage = vi.fn();
    let scheduledReport: FrameRequestCallback | undefined;
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        scheduledReport = callback;
        return 42;
      });
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage },
    });
    render(<VariantHubPreviewBridge />);
    postMessage.mockClear();

    window.history.pushState({}, "", "#spa-navigation");
    window.dispatchEvent(new Event("scroll"));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    act(() => scheduledReport?.(0));

    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "state", href: expect.stringContaining("#spa-navigation") }),
      window.location.origin,
    );
    requestAnimationFrame.mockRestore();
  });
});
