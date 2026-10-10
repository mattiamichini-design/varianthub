---
name: varianthub
description: VariantHub authoring: register React, HTML or URL alternatives and verify live comparisons.
---

# Author an exploration

1. Read the project's existing registration. For React integration contracts, read the installed `varianthub-core/README.md`; for HTML/URL configuration, read `../../README.md`. An Exploration groups alternatives of one subject; a Variant is one alternative; an Artboard presents that Variant at a viewport. Choose component or page kind independently from source type. Done when a stable exploration key, variant IDs and source locations are known.
2. Reuse the current host integration. React variants compile in the owning application. For plain HTML, register an entry with its relative assets inside configured roots. URL sources must already be served and permit embedding. Declare local source paths for honest Git history. If this skill was copied outside its package, resolve the runner README from the GitHub checkout's `packages/runner/README.md`. Done when the source opens directly and its registration uses the supported source contract.
3. Keep up to twenty alternatives visible in the workspace. New registrations join automatically while they fit. When additions exceed twenty, preserve the current view and use the capacity review to choose which alternatives to hide. Card selection is temporary: Compare uses selected cards, or all visible cards when none are selected; clearing selection never hides a card. Preserve existing identifiers and sources. Done when registered alternatives are reachable and the comparison respects the limit.
4. Verify the active surface: Grid supports one to four columns; Live Canvas compares the same ordered subset; responsive detail presents four independent instances of one Variant. Check clicks, input, scrolling and a relevant media-query breakpoint. Viewport resize changes actual dimensions; zoom only changes presentation. Canvas presets arrange artboards without overlap; Custom shows the last resized dimensions and Apply size to all propagates them. Grid keeps all column counts selectable and shows a content-area viewport empty state when the selected count cannot fit. Cmd/Ctrl+K opens the exploration command menu. Done when the source and real viewer behave together.
5. Verify a completed persistent change and reload. Shared layout is repository-owned; favorites, visits and camera are personal. Treat Save failed and Save conflict as unfinished work: retry a failed save or explicitly reload newer shared data. Done when the result survives reload or its remaining failure is reported.

Home covers are generated from stable identity and title. Source dates derive from declared history; opening the viewer is not a source modification. Use visible controls when iframe focus prevents shortcuts. Cross-origin URL/scroll introspection and arbitrary application-state serialization are not guaranteed.

VariantHub is a local workspace. Authoring requires no screenshot capture, cloud account, export conversion or mandatory mock preparation.

A new exploration shows all available variants up to twenty. Known hidden variants stay hidden when new registrations arrive. If the visible set plus new registrations exceeds twenty, do not silently drop old or new variants: leave the current view unchanged and resolve the pending capacity review. Clear resets action selection, not visibility. The last visible variant cannot be removed through Manage variants.
