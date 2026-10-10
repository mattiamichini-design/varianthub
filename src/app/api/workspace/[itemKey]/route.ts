import workspace from '@/lib/workspace';
import { requireMaintainerRoutes } from '@/lib/maintainer-routes';

type Context = {params: Promise<{itemKey: string}>};
export async function GET(request: Request, context: Context) {
  requireMaintainerRoutes();
  return (await workspace).handle(request, (await context.params).itemKey);
}
export async function PUT(request: Request, context: Context) {
  requireMaintainerRoutes();
  return (await workspace).handle(request, (await context.params).itemKey);
}
