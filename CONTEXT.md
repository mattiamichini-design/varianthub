# VariantHub

VariantHub is a design workspace for developers and designers who explore and compare live UI alternatives in their project's code.

## Language

**Project**:
The product or codebase whose explorations belong to one repository.
_Avoid_: Exploration when referring to the whole project

**Exploration**:
A subject being explored through an ordered collection of related UI alternatives, concerning either a component or a page. This is the concept previously called a catalog item, not an additional level above it.
_Avoid_: Catalog item, item, component when referring to both kinds

**Component exploration**:
An exploration whose alternatives are isolated interface components.
_Avoid_: Component item, widget item

**Page exploration**:
An exploration whose alternatives are complete navigable pages.
_Avoid_: Page item, full-screen component, page mode

**Variant**:
One alternative within an exploration. A variant displayed at several viewport sizes remains one variant.
_Avoid_: Iteration as a distinct entity, version

**Artboard**:
A live presentation of a variant at a particular viewport size, with its own position on a canvas.
_Avoid_: Variant when referring only to its presentation, screenshot

**Grid**:
The exploration view that arranges variants in rows with a chosen number of columns.
_Avoid_: Canvas when referring to the ordered grid

**Live Canvas**:
A spatial comparison surface whose artboards can be positioned and resized while their contents remain interactive.
_Avoid_: Drawing editor, nested exploration

**Variant detail**:
The dedicated view of a variant, offering immersive preview or responsive comparison and navigation to sibling variants.
_Avoid_: New exploration, browser fullscreen

**Immersive preview**:
The presentation that gives one variant the available viewing area while retaining minimal VariantHub navigation.
_Avoid_: Fullscreen, because browser fullscreen is not required

**Responsive comparison**:
The variant-detail presentation of the same variant in several artboards with different viewport sizes.
_Avoid_: Canvas inside a canvas, additional variants

**Viewport preset**:
A named viewing width and height, such as Mobile, Tablet, Desktop, or Large desktop.
_Avoid_: Device emulator

**Exploration cover**:
An automatically composed graphic identifying an exploration through its title and a subtle background color.
_Avoid_: Screenshot, live preview, uploaded image
