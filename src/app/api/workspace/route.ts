import workspace from '@/lib/workspace';
import { requireMaintainerRoutes } from '@/lib/maintainer-routes';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  requireMaintainerRoutes();
  return (await workspace).handle(request);
}
