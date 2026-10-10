"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  VariantHubProvider,
  VariantHubCanvasPage,
  VariantHubImmersivePage,
  useVariantHub,
  type VariantHubComparisonTarget,
  type VariantHubCatalogItem,
} from "varianthub-core";
import {
  demoCatalog,
  getDemoVariantFrameUrl,
} from "@/components/variant-hub-catalog";

const reactCatalog = demoCatalog
  .filter((item) =>
    [
      "action-surface",
      "information-card",
      "northstar-landing",
      "responsive-controls",
    ].includes(item.key),
  )
  .map((item) =>
    item.key === "information-card"
      ? {
          ...item,
          description: "Compare content hierarchy, spacing and color.",
        }
      : item,
  );

const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function PublicPlayground({ mode = "catalog" }: { mode?: string }) {
  return (
    <VariantHubProvider
      storageKey={`varianthub-public-${mode}`}
      projectId="varianthub-public-demo"
    >
      <Playground mode={mode} />
    </VariantHubProvider>
  );
}
function Playground({ mode }: { mode: string }) {
  const origin = useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
  const catalog = useMemo<VariantHubCatalogItem[]>(() => [
    ...reactCatalog,
    { key: "html-brief", name: "Project brief", kind: "page", path: "examples/brief/index.html",
      description: "A plain HTML form with validation and page navigation.",
      variants: [{ id: "quiet", name: "Quiet brief", source: { type: "html", entry: "/examples/brief/index.html" } }] },
    ...(origin ? [{ key: "url-brief", name: "Live brief URL", kind: "page" as const, path: `${origin}/examples/brief/index.html`,
      description: "The same page loaded from a running URL on this demo server.",
      variants: [{ id: "served", name: "Served brief", source: { type: "url" as const, url: `${origin}/examples/brief/index.html` } }] }] : []),
  ], [origin]);
  const frameUrl = (target: VariantHubComparisonTarget) => {
    const source = catalog.find(item => item.key === target.itemKey)?.variants.find(variant => variant.id === target.variantId)?.source;
    return source?.type === "html" ? source.entry : source?.type === "url" ? source.url : getDemoVariantFrameUrl(target);
  };
  const [itemKey, setItemKey] = useState<string | null>(
    mode === "catalog"
      ? null
      : (mode === "compare" || mode === "keep")
        ? "action-surface"
        : "northstar-landing",
  );
  const [comparison, setComparison] =
    useState<VariantHubComparisonTarget | null>(
      mode === "test"
        ? {
            itemKey: "northstar-landing",
            variantId: "cobalt-focus",
            sequenceVariantIds: [
              "cobalt-focus",
              "coral-editorial",
              "lime-contrast",
            ],
          }
        : null,
    );
  const {
    syncVariants,
    setPresentation,
    setGridCols,
    setVariantsFavorite,
    setResponsiveLayout,
    components,
  } = useVariantHub();
  useEffect(() => {
    for (const item of catalog) syncVariants(item.key, item.variants);
    if (mode === "arrange") setPresentation("northstar-landing", "canvas");
    if (mode === "keep") setGridCols("action-surface", 1);
    if (mode === "keep")
      setVariantsFavorite(
        "action-surface",
        ["slate-quiet", "blue-standard"],
        true,
      );
  }, [catalog, mode, syncVariants, setPresentation, setVariantsFavorite, setGridCols]);
  const item = catalog.find((item) => item.key === comparison?.itemKey);
  if (comparison && item)
    return (
      <VariantHubImmersivePage
        projectId="varianthub-public-demo"
        item={item}
        activeVariantId={comparison.variantId}
        sequenceVariantIds={
          comparison.sequenceVariantIds ??
          item.variants.map((variant) => variant.id)
        }
        responsiveLayout={
          components[item.key]?.responsive?.[comparison.variantId]
        }
        onResponsiveLayoutChange={(layout) =>
          setResponsiveLayout(item.key, comparison.variantId, layout)
        }
        getFrameUrl={frameUrl}
        onNavigate={(variantId) => setComparison({ ...comparison, variantId })}
        onExit={() => setComparison(null)}
        openInNewTab={(target) =>
          window.open(
            frameUrl(target),
            "_blank",
            "noopener,noreferrer",
          )
        }
      />
    );
  return (
    <VariantHubCanvasPage
      initialVariantChooserOpen={mode === "keep"}
      componentsWithVariants={catalog}
      getComponentVariants={(key) => catalog.find((item) => item.key === key)}
      activeItemKey={itemKey}
      onOpenComponent={setItemKey}
      onBrandClick={() => setItemKey(null)}
      onGoHome={() => setItemKey(null)}
      getVariantFrameUrl={frameUrl}
      onCompareVariants={setComparison}
      exportEnabled={false}
      title="VariantHub"
    />
  );
}
