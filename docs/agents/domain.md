# Domain Docs

How engineering skills should consume this repository's domain documentation while exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repository root, or `CONTEXT-MAP.md` if it exists.
- ADRs under `docs/adr/` that touch the area being explored.

If these files do not exist, proceed silently. The domain-modeling workflow creates them lazily when terminology or architectural decisions are actually resolved.

## File structure

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Use terms as defined in `CONTEXT.md` in issue titles, proposals, hypotheses, and tests. If a needed concept is missing, reconsider the wording or record a genuine domain-modeling gap.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
