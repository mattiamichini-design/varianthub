---
status: accepted
---

# Co-locate the core package and host with npm workspaces

The reusable `varianthub-core` package lives in `packages/core` beside the Next host. Several React applications consume its interface, which justifies a package seam but not separate repositories or manual tarball transfer for every integrated change. npm workspaces let source, host and integration checks change together without another build orchestrator. Packed clean-consumer checks stay necessary, because workspace success alone does not prove package completeness.

Shared comparison reconciliation, an instance-aware artboard frame and a semantic CSS token interface hold the rules required by Grid, Live Canvas and responsive detail. Do not introduce a generic plugin framework or duplicate the viewer in the host.
