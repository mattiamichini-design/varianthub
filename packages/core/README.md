# varianthub-core

Shared VariantHub runtime for consumers.

This package contains the viewer and styles, not the VariantHub website. Install it into a host that already compiles React. Clone and build `packages/core` from [the repository](https://github.com/mattiamichini-design/varianthub), then reference it from your host with its usual local dependency or source setup. GitHub is the only distribution channel; the package is not published to a registry.

Import `varianthub-core/styles.css` once. Mount a `VariantHubProvider` with a stable `projectId`, pass your catalog to `VariantHubCanvasPage`, and wire `onOpenComponent` to your host router. Grid can render React components directly. Canvas and detail also need `getVariantFrameUrl` pointing to a real host route which renders `VariantHubVariantRenderer` and `VariantHubPreviewBridge`. A catalog registration alone does not create these routes. Wire `onCompareVariants` to a route mounting `VariantHubImmersivePage` and forward its navigation callbacks.

For optional repository layout persistence and both agent skills, use `packages/runner` from the same checkout. Import `createWorkspace` from `varianthub/server` in your local server and forward the workspace API requests. The prebuilt HTML/URL CLI is not a React compiler. Maintainers can run `npm run verify:packages` in the repository to build and exercise a complete minimal React host from `tests/consumers/react`, with no Next or marketing code.

## Includes

- `VariantHubProvider`
- `useVariantHub`
- `useVariantHubComponent`
- `VariantHubCanvasPage`
- `ComponentSelector`
- `VariantHubToolbar`
- `VariantHubGrid`
- `VariantCard`
- `PageVariantCard` with near-viewport lazy iframe loading
- `VariantHubVariantRenderer`
- `VariantHubImmersivePage`
- `VariantHubPreviewBridge`
- registry factory helpers
- lazy `createVariant()` helper

## Consumer-owned responsibilities

The consuming app keeps ownership of:

- variant registration files
- public vs internal registry bootstrapping
- route mounting and host-specific header actions
- project docs and roadmap/task tracking
- any project-specific data, copy, or promotion workflow

## Recommended integration

Create a local singleton registry wrapper, keep registration files in the consumer, and render the shared `VariantHubCanvasPage` from thin local wrappers that choose which registry set to mount (`full`, `public`, etc.).

## Full-page variants

Catalog entries accept `kind?: "component" | "page"`; omitting `kind` preserves the component behavior. `ComponentWithVariants` remains as a deprecated alias of `VariantHubCatalogItem`.

For page entries, pass `getPageVariantFrameUrl({ itemKey, variantId })` and `onOpenPageVariant({ itemKey, variantId })` to `VariantHubCanvasPage`. Mount `VariantHubVariantRenderer` and `VariantHubPreviewBridge` in the consumer-owned iframe renderer route. Mount `VariantHubImmersivePage` in the consumer-owned preview route and connect `onNavigate` to the host router.

The immersive shell mounts no more than the active, previous, and next iframe. It supports `Shift+Left`, `Shift+Right`, and `Escape`; validates bridge messages by origin, source window, and schema; and keeps each variant's internal URL and scroll position in `sessionStorage`.

## Sources and shared layouts

Legacy `{id, name, component}` variants remain valid, including lazy React components. Canonical declarations use `source: {type: 'react', component}`, `{type: 'html', entry}` or `{type: 'url', url}`. The host resolves frame URLs and owns compilation. Malformed sources fail individually. Comparison surfaces share an ordered maximum of twenty variants; the chooser still lists every registration.

Pass a stable `projectId` and optional `workspaceEndpoint` to the provider. The local adapter exposes metadata and revision-checked layouts. On directly mounted detail routes, synchronize the catalog with `syncVariants` and connect `responsiveLayout` / `onResponsiveLayoutChange` to provider state. Pass `projectId` to immersive detail so browser frame history is isolated between projects. Renderer routes mount the bridge without another workspace provider.

## Theme contract

Import `varianthub-core/styles.css` once, then your override stylesheet. Override semantic variables on `.vh-root, .vh-immersive` to swap the visual theme without changing components:

```css
.vh-root, .vh-immersive {
  --vh-color-accent: #244a43;
  --vh-color-accent-foreground: #fff;
  --vh-font-sans: "Your font", system-ui, sans-serif;
  --vh-radius-md: 8px;
  --vh-space-4: 16px;
}
```

The token source is `src/styles/theme.css`; structure and responsive layout are in `src/styles/varianthub.css`. A `vh-theme-dark` class selects the supplied dark overrides. Fonts belong to the host. Both comparison and detail accept `viewportPresets` to override mobile/tablet/desktop/wide CSS-pixel dimensions. A surface switch may reload application state; pan and zoom within a canvas preserve mounted frames.

Workspace visibility and action selection are independent: Manage variants controls up to twenty visible previews; selecting or clearing cards never hides them. Compare opens selected cards, or all visible cards when none are selected. `comparedVariantIds` retains its legacy wire name for visible membership; selection is temporary. Cmd/Ctrl+K opens the command menu, also available from the exploration selector.

Canvas presets resize and arrange every visible artboard without overlap. Custom displays the last resized dimensions; Apply size to all propagates those dimensions. The resize lock remains independent. Nested segmented controls derive child radius from the outer radius minus border and padding, keeping theme overrides consistent.

A new exploration shows all available variants up to twenty. New registrations join the visible workspace automatically while the result stays within twenty, without restoring known variants the user intentionally hid. If additions exceed the limit, the existing view stays unchanged and a persistent capacity review asks which variants to hide before applying. The last visible variant cannot be removed through Manage variants.
