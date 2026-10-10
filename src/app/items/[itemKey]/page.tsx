import { notFound } from "next/navigation";
import { VariantHubDemo } from "@/components/variant-hub-demo";
import { getDemoCatalogItem } from "@/components/variant-hub-catalog";
import { requireMaintainerRoutes } from "@/lib/maintainer-routes";

type ItemPageProps = {
  params: Promise<{ itemKey: string }>;
};

export default async function ItemPage({ params }: ItemPageProps) {
  requireMaintainerRoutes();
  const { itemKey } = await params;

  if (!getDemoCatalogItem(itemKey)) {
    notFound();
  }

  return <VariantHubDemo itemKey={itemKey} />;
}
