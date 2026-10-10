import { notFound } from "next/navigation";
import { VariantHubImmersivePreview } from "@/components/variant-hub-immersive-preview";
import { getDemoVariant } from "@/components/variant-hub-catalog";
import { requireMaintainerRoutes } from "@/lib/maintainer-routes";

type PreviewPageProps = {
  params: Promise<{
    itemKey: string;
    variantId: string;
  }>;
  searchParams: Promise<{
    sequence?: string | string[];
  }>;
};

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  requireMaintainerRoutes();
  const [{ itemKey, variantId }, query] = await Promise.all([params, searchParams]);
  const entry = getDemoVariant(itemKey, variantId);

  if (!entry) {
    notFound();
  }

  const rawSequence = Array.isArray(query.sequence) ? query.sequence[0] : query.sequence;
  const requestedSequence = rawSequence?.split(",").filter(Boolean);
  const registeredVariantIds = new Set(entry.item.variants.map((variant) => variant.id));
  const sequenceVariantIds =
    requestedSequence?.length &&
    requestedSequence.includes(entry.variant.id) &&
    requestedSequence.every((id) => registeredVariantIds.has(id))
      ? [...new Set(requestedSequence)]
      : undefined;

  return (
    <VariantHubImmersivePreview
      itemKey={entry.item.key}
      activeVariantId={entry.variant.id}
      sequenceVariantIds={sequenceVariantIds}
    />
  );
}
