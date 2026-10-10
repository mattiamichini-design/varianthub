import { VariantHubDemo } from "@/components/variant-hub-demo";
import { requireMaintainerRoutes } from "@/lib/maintainer-routes";

export default function WorkspacePage() {
  requireMaintainerRoutes();
  return <VariantHubDemo />;
}
