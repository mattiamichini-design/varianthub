import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveVariantDrop, VariantHubGrid } from "./VariantHubGrid";
import type { VariantHubCatalogItem, VariantMeta } from "./types";

afterEach(cleanup);

const variants: VariantMeta[] = [
  { id: "favorite", name: "Favorite", source: { type: "url", url: "/favorite" } },
  { id: "other", name: "Other", source: { type: "url", url: "/other" } },
];

const item = (key: string): VariantHubCatalogItem => ({ key, name: key, path: key, kind: "page", variants });

function renderGrid(itemKey = "one") {
  return render(
    <VariantHubGrid
      variants={variants}
      variantOrder={["favorite", "other"]}
      selectedVariants={[]}
      favoriteVariants={["favorite"]}
      variantCreatedAt={{}}
      variantUpdatedAt={{}}
      zoom={100}
      gridCols={2}
      onOrderChange={() => {}}
      onToggleSelect={() => {}}
      onToggleFavorite={() => {}}
      item={item(itemKey)}
      getVariantFrameUrl={({ variantId }) => `/${variantId}`}
    />,
  );
}

describe("resolveVariantDrop", () => {
  it("moves variants within and between favorite groups without duplicates", () => {
    expect(resolveVariantDrop(["a", "b", "c"], ["a"], "c", "b")).toEqual({
      order: ["a", "c", "b"],
    });
    expect(resolveVariantDrop(["a", "b", "c"], ["a"], "c", "variant-group-favorites")).toEqual({
      order: ["a", "c", "b"],
      favorite: true,
    });
    expect(resolveVariantDrop(["a", "c", "b"], ["a", "c"], "a", "variant-group-other")).toEqual({
      order: ["c", "b", "a"],
      favorite: false,
    });
  });

  it("ignores unknown drop targets", () => {
    expect(resolveVariantDrop(["a", "b"], [], "a", "outside")).toBeUndefined();
  });
});

it("collapses each group independently without replacing live cards", () => {
  const view = renderGrid();
  const favoritesToggle = screen.getByRole("button", { name: /Favorites/ });
  const otherToggle = screen.getByRole("button", { name: /Other variants/ });
  const favoriteCard = view.container.querySelector<HTMLElement>('[data-group="favorites"]')!;
  const favoriteFrame = favoriteCard.querySelector("iframe")!;

  for (const id of favoritesToggle.getAttribute("aria-controls")!.split(" ")) {
    expect(document.getElementById(id)).not.toBeNull();
  }

  fireEvent.click(favoritesToggle);
  expect(favoritesToggle).toHaveAttribute("aria-expanded", "false");
  expect(favoriteCard).toHaveAttribute("hidden");
  expect(favoriteCard).toHaveAttribute("inert");
  expect(screen.getByRole("button", { name: /Other variants/ })).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(otherToggle);
  fireEvent.click(favoritesToggle);
  expect(screen.getByRole("button", { name: /Favorites/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: /Other variants/ })).toHaveAttribute("aria-expanded", "false");
  expect(view.container.querySelector('[data-group="favorites"]')).toBe(favoriteCard);
  expect(favoriteCard.querySelector("iframe")).toBe(favoriteFrame);
});

it("defaults disclosure state open for each catalog item", () => {
  const view = renderGrid("one");
  fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));

  view.rerender(
    <VariantHubGrid
      variants={variants}
      variantOrder={["favorite", "other"]}
      selectedVariants={[]}
      favoriteVariants={["favorite"]}
      variantCreatedAt={{}}
      variantUpdatedAt={{}}
      zoom={100}
      gridCols={2}
      onOrderChange={() => {}}
      onToggleSelect={() => {}}
      onToggleFavorite={() => {}}
      item={item("two")}
      getVariantFrameUrl={({ variantId }) => `/${variantId}`}
    />,
  );

  expect(screen.getByRole("button", { name: /Favorites/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: /Other variants/ })).toHaveAttribute("aria-expanded", "true");
});
