"use client";

import { VariantHubVariantRenderer } from "varianthub-core";
import { getDemoVariant } from "@/components/variant-hub-catalog";

export function VariantHubDemoRenderer({
  itemKey,
  variantId,
}: {
  itemKey: string;
  variantId: string;
}) {
  const entry = getDemoVariant(itemKey, variantId);

  if (!entry) {
    return null;
  }

  return (
    <div
      data-testid="variant-renderer"
      className={entry.item.kind === "page" || itemKey === "action-surface" || itemKey === "information-card" ? undefined : "grid min-h-screen place-items-center bg-slate-50 p-8"}
    >
      <VariantHubVariantRenderer item={entry.item} variantId={entry.variant.id} />
    </div>
  );
}
