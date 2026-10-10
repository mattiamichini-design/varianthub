import { notFound } from "next/navigation";
import { VariantHubDemoRenderer } from "@/components/variant-hub-demo-renderer";
import { getDemoVariant } from "@/components/variant-hub-catalog";

type RendererPageProps = {
  params: Promise<{
    itemKey: string;
    variantId: string;
  }>;
};

export default async function RendererPage({ params }: RendererPageProps) {
  const { itemKey, variantId } = await params;
  const entry = getDemoVariant(itemKey, variantId);

  if (!entry) {
    notFound();
  }

  return <VariantHubDemoRenderer itemKey={entry.item.key} variantId={entry.variant.id} />;
}
