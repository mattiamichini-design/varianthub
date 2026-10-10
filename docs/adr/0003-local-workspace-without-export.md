---
status: accepted
---

# Keep the product focused on the local workspace

VariantHub runs within one project repository and serves developers and designers working in code. Export and hosted client presentation are out of scope because preparing self-contained versions of arbitrary variants would complicate routine authoring. Comments, approvals, a hosted service and a central multiproject application are also out of scope. This supersedes the export part of [ADR 0001](0001-repository-scoped-live-workspace.md): do not add an export CLI, ZIP pipeline, backend-to-demo conversion, export-specific source contract or mandatory mock preparation.

The home uses automatically composed covers with a subtle background and title. It needs neither user-provided images nor screenshot capture infrastructure, which keeps installation and maintenance small.
