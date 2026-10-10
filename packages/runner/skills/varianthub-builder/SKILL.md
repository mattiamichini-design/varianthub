---
name: varianthub-builder
description: Install, upgrade or verify the VariantHub runner and reusable core package in a consumer project.
---

# Integrate VariantHub

1. Inspect the consumer's runtime and current package versions. For the prebuilt HTML/URL runner, read `../../README.md`; for a React host, read the installed `varianthub-core/README.md`. If this skill was copied outside its package, resolve the runner README from the GitHub checkout's `packages/runner/README.md`. Preserve stable project and exploration identifiers. Done when the integration path is known.
2. Clone and build `https://github.com/mattiamichini-design/varianthub` (`npm ci && npm run build:packages`) and run its CLI directly with the consumer root. Do not publish to or install the application from public package registries. For HTML/URL, use the runner's repeatable init and start commands; retain existing configuration and configured roots. For React, preserve host-owned renderer and detail routes with the shared core. Done when the consumer starts from the checkout with its own project root.
3. Preserve the shared semantic CSS-token contract. Apply a theme stylesheet after the core stylesheet; keep behavior in the shared viewer and source content styling in its owning project. Verify a theme override on home, Grid and detail. Done when the change needs no duplicate viewer or source-code edits to restyle controls.
4. Verify migration through real routes. Existing repository layout wins over browser preferences; removed IDs reconcile without deleting sources. Shared settings, conflict recovery and browser-personal state have separate storage. Done when reload and an existing deep link work with the migrated data.
5. Maintainers build the core and runner, pack them, inspect contents and install into a clean temporary consumer. Exercise one React registration and one HTML page with relative CSS and JavaScript. Check the supported Node version and included licenses. Done when the installed artifacts work outside the workspace; a source build alone is insufficient.

Use the package scripts as the command source of truth. Browser automation belongs to maintainer verification and is not a runtime installation dependency. GitHub is the only distribution channel; packed verification is local and does not authorize registry publication.
