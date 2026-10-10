import type { VariantHubCatalogItem } from "varianthub-core";
import { sourceExamples } from "./source-examples";
import {
  DemoActionSurface,
  DemoInformationCard,
  NorthstarLanding,
  ResponsiveFixture,
  VariantGrowthFixture,
} from "./showcase/demo-showcase";

export const demoCatalog: VariantHubCatalogItem[] = [
  {
    key: "action-surface",
    name: "Action surface",
    path: "demo/action-surface",
    description: "CTA hierarchy and interaction states.",
    categories: ["Actions"],
    tags: ["demo", "interactive"],
    sourcePaths: ["src/components/showcase/demo-showcase.tsx"],
    variants: [
      { id: "slate-quiet", name: "Slate / quiet", description: "Low-emphasis neutral action.", component: () => <DemoActionSurface tone="slate" /> },
      { id: "blue-standard", name: "Blue / standard", description: "Default primary action.", component: () => <DemoActionSurface tone="blue" /> },
      { id: "violet-strong", name: "Violet / strong", description: "High-emphasis action with elevation.", component: () => <DemoActionSurface tone="violet" /> },
    ],
  },
  {
    key: "information-card",
    name: "Information card",
    path: "demo/information-card",
    description: "A deliberately small, isolated card catalog for this standalone host.",
    categories: ["Content"],
    tags: ["demo", "layout"],
    sourcePaths: ["src/components/showcase/demo-showcase.tsx"],
    variants: [
      { id: "card-slate", name: "Slate header", description: "Neutral information hierarchy.", component: () => <DemoInformationCard tone="slate" /> },
      { id: "card-amber", name: "Amber header", description: "Warm, attention-oriented hierarchy.", component: () => <DemoInformationCard tone="amber" /> },
    ],
  },
  {
    key: "northstar-landing",
    kind: "page",
    name: "Northstar landing page",
    path: "demo/northstar-landing",
    description: "Three complete landing-page directions with internal navigation and independent scrolling.",
    categories: ["Pages"],
    tags: ["demo", "landing", "responsive"],
    sourcePaths: ["src/components/showcase/demo-showcase.tsx"],
    variants: [
      {
        id: "cobalt-focus",
        name: "Cobalt focus",
        description: "Precise, product-led direction with a strong cobalt signal.",
        component: () => <NorthstarLanding accent="cobalt" />,
      },
      {
        id: "coral-editorial",
        name: "Coral editorial",
        description: "Warm editorial direction with a more expressive voice.",
        component: () => <NorthstarLanding accent="coral" />,
      },
      {
        id: "lime-contrast",
        name: "Lime contrast",
        description: "High-contrast campaign direction for a confident launch.",
        component: () => <NorthstarLanding accent="lime" />,
      },
    ],
  },
  {
    key: "responsive-controls", kind: "page", name: "Responsive controls",
    path: "demo/responsive-controls", description: "Forms, viewport behavior and twelve live alternatives.",
    sourcePaths: ["src/components/showcase/demo-showcase.tsx"], categories: ["Forms"], tags: ["responsive", "interactive"],
    variants: Array.from({length: 12}, (_, index) => ({id: `direction-${index + 1}`, name: `Direction ${index + 1}`, component: () => <ResponsiveFixture index={index + 1} />})),
  },
  {
    key: "variant-growth-limit", name: "Variant growth limit",
    path: "demo/variant-growth-limit", description: "Twenty-six alternatives for testing automatic discovery and the visible workspace limit.",
    sourcePaths: ["src/components/showcase/demo-showcase.tsx"], categories: ["Actions"], tags: ["capacity", "testing"],
    variants: Array.from({length: 26}, (_, index) => ({
      id: `growth-${index + 1}`,
      name: `Growth direction ${String(index + 1).padStart(2, "0")}`,
      description: index >= 20 ? "Newly registered direction for the capacity review." : "Existing direction in the visible workspace.",
      component: () => <VariantGrowthFixture index={index + 1} />,
    })),
  },
  ...sourceExamples,
];

export function getDemoCatalogItem(itemKey: string) {
  return demoCatalog.find((item) => item.key === itemKey);
}

export function getDemoVariant(itemKey: string, variantId: string) {
  const item = getDemoCatalogItem(itemKey);
  const variant = item?.variants.find((candidate) => candidate.id === variantId);
  return item && variant ? { item, variant } : undefined;
}

export function getDemoVariantFrameUrl({
  itemKey,
  variantId,
}: {
  itemKey: string;
  variantId: string;
}) {
  const source = getDemoVariant(itemKey, variantId)?.variant.source;
  if (source?.type === "html") return source.entry;
  if (source?.type === "url") return source.url;
  return `/variant-render/${encodeURIComponent(itemKey)}/${encodeURIComponent(variantId)}`;
}

export function getDemoVariantComparisonUrl({
  itemKey,
  variantId,
  sequenceVariantIds,
}: {
  itemKey: string;
  variantId: string;
  sequenceVariantIds?: string[];
}) {
  const pathname = `/preview/${encodeURIComponent(itemKey)}/${encodeURIComponent(variantId)}`;

  if (!sequenceVariantIds?.length) {
    return pathname;
  }

  const searchParams = new URLSearchParams({
    sequence: sequenceVariantIds.join(","),
  });
  return `${pathname}?${searchParams.toString()}`;
}
