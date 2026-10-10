---
status: accepted
---

# Separate the website from the packages people run

The repository keeps the npm workspace from [ADR 0004](0004-colocate-core-and-host.md). The root package owns the Next website, the public sample playground and the maintainer routes. `varianthub` (`packages/runner`) owns the prebuilt local HTML/URL workspace, CLI, persistence adapter and both agent skills. `varianthub-core` (`packages/core`) owns the shared React viewer. Neither package brings in the website, its assets, Next or its shader library.

The runner starts at its workspace catalog at `/`. A React consumer mounts the viewer in its own application and supplies its own renderer and detail routes. It can import persistence from `varianthub/server`, the same export the website uses. The runner does not compile arbitrary React code.

Package file allowlists and a real tarball consumer check enforce this boundary. `prepack` builds current output so a clean checkout cannot pack a missing viewer. Runner tests and maintainer sources are excluded from the archive.

The verification fixture installs only `varianthub` for HTML/URL, with no React dependency tree. A second fixture installs the core and runner tarballs with React and esbuild, compiles real components and opens the product without any website source. Browser tests cover Grid, Canvas, detail, responsive sizes, assets, source navigation and persistence. Runner tests cover origin, path, symlink, revision and read-only checks.

GitHub is the only distribution channel. All packages keep `"private": true` and are never published to a package registry.
