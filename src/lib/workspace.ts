import { createWorkspace } from 'varianthub/server';
import config from '../../varianthub.config.json';

// Next compiles route modules separately; share one session and write queue across them.
const host = globalThis as typeof globalThis & {variantHubWorkspace?: ReturnType<typeof createWorkspace>; variantHubWorkspaceConfig?: string};
// New explorations must also reach the cached API host during hot reload.
const root = process.env.VARIANTHUB_WORKSPACE_ROOT ?? process.cwd();
const configSignature = JSON.stringify([config, root]);
if (!host.variantHubWorkspace || host.variantHubWorkspaceConfig !== configSignature) {
  host.variantHubWorkspaceConfig = configSignature;
  host.variantHubWorkspace = createWorkspace({root, config, allowWrites: process.env.NODE_ENV !== 'production'});
}
const workspace = host.variantHubWorkspace;
export default workspace;
