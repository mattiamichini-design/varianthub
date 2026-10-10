---
status: superseded by ADR-0003
---

# A repository-scoped workspace with portable exploration exports

[ADR 0003](0003-local-workspace-without-export.md) supersedes the export part of this decision.

VariantHub serves developers and designers working in code, and runs against one repository at a time. Explorations and variants belong to that repository. Comments, approvals, stakeholder decision workflows and a central multiproject application are outside the product scope. This trades a complete hosted review service for a smaller local workflow with less infrastructure and maintenance.

This decision also proposed an exploration export: a ready-to-host folder, optionally archived as ZIP, containing client-side HTML, JavaScript, CSS and assets for one exploration, viewable in a browser without the author's development server. Server-dependent or externally hosted variants would have needed an explicitly prepared self-contained representation.
