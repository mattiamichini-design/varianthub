"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { VariantHubCanvasPage, type ComponentMetadataPatch } from "varianthub-core";
import {
  demoCatalog,
  getDemoVariantFrameUrl,
  getDemoVariantComparisonUrl,
} from "@/components/variant-hub-catalog";

export function VariantHubDemo({ itemKey }: { itemKey?: string }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [overrides, setOverrides] = useState<Record<string, ComponentMetadataPatch>>({});
  const catalog = useMemo(() => {
    if (!hydrated) return demoCatalog;
    return demoCatalog.map((item) => {
      try {
        const patch = overrides[item.key] ?? JSON.parse(localStorage.getItem(`varianthub:demo-metadata:${item.key}`) ?? "null");
        if (!patch || typeof patch !== "object") return item;
        return {
          ...item,
          ...(typeof patch.name === "string" ? { name: patch.name } : {}),
          ...(typeof patch.description === "string" ? { description: patch.description } : {}),
          ...(Array.isArray(patch.categories) && patch.categories.every((value: unknown) => typeof value === "string") ? { categories: patch.categories } : {}),
          ...(Array.isArray(patch.tags) && patch.tags.every((value: unknown) => typeof value === "string") ? { tags: patch.tags } : {}),
        };
      } catch { return item; }
    });
  }, [hydrated, overrides]);
  function saveMetadata(key: string, patch: ComponentMetadataPatch) {
    localStorage.setItem(`varianthub:demo-metadata:${key}`, JSON.stringify(patch));
    setOverrides((items) => ({ ...items, [key]: patch }));
  }
  const catalogByKey = useMemo(
    () => new Map(catalog.map((item) => [item.key, item])),
    [catalog],
  );

  return (
    <VariantHubCanvasPage
      componentsWithVariants={catalog}
      onSaveComponentMetadata={saveMetadata}
      activeItemKey={itemKey ?? null}
      getComponentVariants={(key) => catalogByKey.get(key)}
      getVariantFrameUrl={getDemoVariantFrameUrl}
      onCompareVariants={(target) => {
        sessionStorage.setItem("varianthub:return-to-canvas", window.location.href);
        router.push(getDemoVariantComparisonUrl(target));
      }}
      onOpenComponent={(key) => router.push(`/items/${encodeURIComponent(key)}`)}
      onBrandClick={() => {
        router.push("/workspace");
      }}
      autoSelectFirstComponent={false}
      exportEnabled={false}
      title="VariantHub"
    />
  );
}
