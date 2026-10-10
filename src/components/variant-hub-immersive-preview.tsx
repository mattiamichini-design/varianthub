"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  buildVariantSequence,
  VariantHubImmersivePage,
  useVariantHubComponent,
  useVariantHub,
  type VariantHubCatalogItem,
} from "varianthub-core";
import {
  getDemoCatalogItem,
  getDemoVariantFrameUrl,
  getDemoVariantComparisonUrl,
} from "@/components/variant-hub-catalog";

type VariantHubImmersivePreviewProps = {
  itemKey: string;
  activeVariantId: string;
  sequenceVariantIds?: string[];
};

export function VariantHubImmersivePreview({
  itemKey,
  activeVariantId,
  sequenceVariantIds,
}: VariantHubImmersivePreviewProps) {
  const item = getDemoCatalogItem(itemKey);

  if (!item) {
    return null;
  }

  return (
    <ImmersivePage
      item={item}
      activeVariantId={activeVariantId}
      sequenceVariantIds={sequenceVariantIds}
    />
  );
}

function ImmersivePage({
  item,
  activeVariantId,
  sequenceVariantIds,
}: {
  item: VariantHubCatalogItem;
  activeVariantId: string;
  sequenceVariantIds?: string[];
}) {
  const router = useRouter();
  const { comparedVariantIds, variantOrder, responsive } = useVariantHubComponent(item.key);
  const { projectId, syncVariants, setActiveComponent, setResponsiveLayout } = useVariantHub();
  useEffect(() => {
    syncVariants(item.key, item.variants);
    setActiveComponent(item.key);
  }, [item, syncVariants, setActiveComponent]);
  const registeredIds = item.variants.map((variant) => variant.id);
  const visualOrder = [...variantOrder.filter(id => registeredIds.includes(id)), ...registeredIds.filter(id => !variantOrder.includes(id))];
  const sequence = buildVariantSequence(visualOrder, sequenceVariantIds?.length ? sequenceVariantIds : comparedVariantIds ?? [], activeVariantId);

  const navigate = useCallback(
    (variantId: string) => {
      router.replace(
        getDemoVariantComparisonUrl({
          itemKey: item.key,
          variantId,
          sequenceVariantIds: sequence,
        }),
        { scroll: false },
      );
    },
    [item.key, router, sequence],
  );

  const exit = useCallback(() => {
    const returnToCanvas = sessionStorage.getItem("varianthub:return-to-canvas");
    sessionStorage.removeItem("varianthub:return-to-canvas");

    if (returnToCanvas) {
      router.back();
      return;
    }

    router.push("/workspace");
  }, [router]);

  return (
    <VariantHubImmersivePage
      projectId={projectId}
      item={item}
      activeVariantId={activeVariantId}
      sequenceVariantIds={sequence}
      responsiveLayout={responsive?.[activeVariantId]}
      onResponsiveLayoutChange={layout => setResponsiveLayout(item.key, activeVariantId, layout)}
      getFrameUrl={getDemoVariantFrameUrl}
      onNavigate={navigate}
      onExit={exit}
      openInNewTab={(target) => {
        window.open(getDemoVariantFrameUrl(target), "_blank", "noopener,noreferrer");
      }}
    />
  );
}
