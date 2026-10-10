import { notFound } from "next/navigation";

/**
 * The maintainer workspace (`/workspace`, `/items/*`, `/preview/*` and `/api/workspace`)
 * exercises the viewer against this repository's demo catalog and writes layouts to disk.
 * It runs under `next dev`. Production builds return 404 for it unless
 * `VARIANTHUB_MAINTAINER_ROUTES=1` is set when building and starting the site.
 */
export const maintainerRoutesEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.VARIANTHUB_MAINTAINER_ROUTES === "1";

export function requireMaintainerRoutes() {
  if (!maintainerRoutesEnabled) notFound();
}
