"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { VariantHubPreviewBridge, VariantHubProvider } from "varianthub-core";

export function VariantHubAppProvider({ children, workspace }: { children: ReactNode; workspace: boolean }) {
  const pathname = usePathname();
  const rendererMatch = pathname.match(
    /^\/variant-render\/([^/]+)\/([^/]+)\/?$/,
  );
  const itemKey = rendererMatch?.[1] ? decodeURIComponent(rendererMatch[1]) : undefined;
  const variantId = rendererMatch?.[2] ? decodeURIComponent(rendererMatch[2]) : undefined;

  if (rendererMatch) {
    return <><VariantHubPreviewBridge itemKey={itemKey} variantId={variantId} />{children}</>;
  }

  // The site pages and production 404s render without the maintainer workspace session.
  if (!workspace || pathname === "/" || pathname === "/playground") return children;

  return (
    <VariantHubProvider storageKey="varianthub-app-demo-state" projectId="varianthub-demo" workspaceEndpoint="/api/workspace">
      <VariantHubPreviewBridge itemKey={itemKey} variantId={variantId} />
      {children}
    </VariantHubProvider>
  );
}
