"use client";

import type { ReactNode } from "react";
import type { VariantHubCatalogItem } from "./types";
import { VariantHubVariantContent } from "./variantSource";

export type VariantHubVariantRendererProps = {
  item: VariantHubCatalogItem;
  variantId: string;
  componentProps?: Record<string, unknown>;
  fallback?: ReactNode;
};

export function VariantHubVariantRenderer({
  item,
  variantId,
  componentProps = {},
  fallback = <div role="status">Loading variant…</div>,
}: VariantHubVariantRendererProps) {
  const variant = item.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return <div role="alert">Variant “{variantId}” was not found.</div>;
  }
  return <VariantHubVariantContent variant={variant} componentProps={componentProps} fallback={fallback} />;
}
