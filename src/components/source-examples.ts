import type { VariantHubCatalogItem } from "varianthub-core";

export const sourceExamples: VariantHubCatalogItem[] = [
  {
    key: "fieldwork-html", kind: "page", name: "Fieldwork · HTML journal",
    path: "public/examples/fieldwork", description: "Two independent journals made with HTML, CSS and JavaScript. Real links, responsive layouts and a local signup form.",
    categories: ["Pages"], tags: ["html", "editorial", "starter"],
    sourcePaths: ["public/examples/fieldwork"],
    variants: [
      { id: "fieldwork", name: "Fieldwork / botanical", description: "An unhurried editorial journal with a botanical cover.", source: { type: "html", entry: "/examples/fieldwork/index.html" } },
      { id: "afterhours", name: "Afterhours / nocturnal", description: "A darker journal with expressive typography and a cool palette.", source: { type: "html", entry: "/examples/fieldwork/afterhours.html" } },
    ],
  },
  {
    key: "external-playground", kind: "page", name: "External · Spatial playground",
    path: "https://threejs.org/examples/css3d_periodictable.html",
    description: "A live external three.js example. Switch between table, sphere, helix and grid on the original website.",
    categories: ["Pages"], tags: ["url", "external", "interactive"],
    variants: [{ id: "periodic-table", name: "Periodic table / three.js", description: "An externally hosted CSS3D composition. Requires an internet connection.", source: { type: "url", url: "https://threejs.org/examples/css3d_periodictable.html" } }],
  },
];
