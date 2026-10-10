import type { ComponentType } from "react";

export type VariantHubVariantSource =
  | { type: "react"; component: ComponentType<Record<string, unknown>> }
  | { type: "html"; entry: string }
  | { type: "url"; url: string };

type VariantMetaBase = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  sourcePaths?: string[];
};

export type VariantMeta = VariantMetaBase &
  (
    | { source: VariantHubVariantSource; component?: ComponentType<Record<string, unknown>> }
    | {
        /** @deprecated Use `source: { type: "react", component }`. */
        component: ComponentType<Record<string, unknown>>;
        source?: undefined;
      }
  );

export type ComponentMetadataPatch = {
  name?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
};

export type VariantHubCatalogItem = {
  key: string;
  name: string;
  path: string;
  /** Omitted for backwards compatibility and interpreted as `component`. */
  kind?: "component" | "page";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  categories?: string[];
  tags?: string[];
  sourcePaths?: string[];
  variants: VariantMeta[];
};

/** @deprecated Use `VariantHubCatalogItem`. */
export type ComponentWithVariants = VariantHubCatalogItem;

export type VariantHubComparisonTarget = {
  itemKey: string;
  variantId: string;
  sequenceVariantIds?: string[];
};

/** @deprecated Use `VariantHubComparisonTarget`. */
export type VariantHubPageVariantTarget = VariantHubComparisonTarget;

export type VariantHubComponentState = {
  componentKey: string;
  variantOrder: string[];
  /** Temporary selection for Compare/Favorite; never controls card visibility. */
  selectedVariants: string[];
  /** Visible workspace membership; wire name retained for version-1 layouts. */
  comparedVariantIds?: string[];
  /** Newly registered variants awaiting an explicit visibility choice. Browser-local. */
  pendingVariantIds?: string[];
  favoriteVariants: string[];
  variantCreatedAt: Record<string, string>;
  variantUpdatedAt: Record<string, string>;
  variantSignatures: Record<string, string>;
  zoom: number;
  gridCols?: number;
};

export type VariantHubState = {
  activeComponentKey?: string;
  components: Record<string, VariantHubComponentState>;
};

export type VariantHubActions = {
  setActiveComponent: (key: string) => void;
  clearActiveComponent: () => void;
  syncVariants: (componentKey: string, variants: VariantMeta[]) => void;
  setVariantOrder: (componentKey: string, order: string[]) => void;
  toggleVariantSelection: (componentKey: string, variantId: string) => void;
  setComparedVariants: (componentKey: string, variantIds: string[]) => void;
  resolvePendingVariants: (componentKey: string, variantIds: string[]) => void;
  setVariantsFavorite: (
    componentKey: string,
    variantIds: string[],
    isFavorite: boolean,
  ) => void;
  selectAllVariants: (componentKey: string) => void;
  clearSelection: (componentKey: string) => void;
  setZoom: (zoom: number) => void;
  setGridCols: (itemKey: string, cols: number) => void;
  reset: () => void;
};
