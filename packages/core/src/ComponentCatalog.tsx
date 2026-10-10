"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Clock3, Search, Star, X } from "lucide-react";
import { cn } from "./classnames";
import { formatComponentDate, getComponentUpdatedAt } from "./componentTimeline";
import { getVariantSourceType } from "./variantSource";
import type { SourceMetadata } from "./provider";
import type { ComponentWithVariants } from "./types";

type ComponentCatalogProps = {
  components: ComponentWithVariants[];
  componentVariantCreatedAt?: Record<string, Record<string, string>>;
  componentVariantUpdatedAt?: Record<string, Record<string, string>>;
  recentlyOpenedAt?: Record<string, string>;
  sourceMetadata?: Record<string, SourceMetadata>;
  metadataError?: boolean;
  onRefreshMetadata?: () => void;
  onSelect: (key: string) => void;
  view: ViewMode;
};

type ViewMode = "grid" | "list";
type SourceFilter = "all" | "react" | "html" | "url";

function getExplorationSource(component: ComponentWithVariants) {
  const sources = new Set(component.variants.map(getVariantSourceType));
  return sources.size === 1 ? Array.from(sources)[0]! : "mixed";
}

function includesSearch(component: ComponentWithVariants, term: string) {
  return [
    component.name,
    component.key,
    component.path,
    component.description ?? "",
    ...(component.categories ?? []),
    ...(component.tags ?? []),
  ].some((value) => value.toLowerCase().includes(term));
}

export function ComponentCatalog({
  components,
  componentVariantCreatedAt = {},
  componentVariantUpdatedAt = {},
  recentlyOpenedAt = {},
  sourceMetadata = {},
  metadataError = false,
  onRefreshMetadata,
  onSelect,
  view,
}: ComponentCatalogProps) {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceFilter>("all");
  const [recentOnly, setRecentOnly] = useState(false);

  const filteredComponents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return components
      .filter((component) => !term || includesSearch(component, term))
      .filter((component) => source === "all" || getExplorationSource(component) === source)
      .filter((component) => !recentOnly || Boolean(recentlyOpenedAt[component.key]))
      .sort((left, right) => {
        const leftOpened = Date.parse(recentlyOpenedAt[left.key] ?? "") || 0;
        const rightOpened = Date.parse(recentlyOpenedAt[right.key] ?? "") || 0;
        return rightOpened - leftOpened;
      });
  }, [components, recentOnly, recentlyOpenedAt, search, source]);

  return (
    <main className="vh-catalog">
      <div className="vh-catalog-intro">
      <header className="vh-catalog-heading">
        <div className="vh-catalog-heading-copy">
          <h2>Explorations</h2>
          <p role="status">
            {search.trim()
              ? `${filteredComponents.length} matching “${search.trim()}”`
              : "Live variants registered in this repository."}
          </p>
        </div>
        <div className="vh-catalog-controls">
          <div className="vh-catalog-search">
            <Search aria-hidden="true" />
            <input aria-label="Search explorations" ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
            {search ? (
              <button type="button" className="vh-catalog-search-clear" aria-label="Clear search" onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}><X aria-hidden="true" /></button>
            ) : null}
          </div>
          <div className="vh-catalog-source-select vh-select">
          <select aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
            <option value="all">All sources</option>
            <option value="react">React</option>
            <option value="html">HTML</option>
            <option value="url">URL</option>
          </select>
          <ChevronDown aria-hidden="true" />
          </div>
          <div className="vh-catalog-source-chips" aria-label="Filter by source" role="group">
            {(["all", "react", "html", "url"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)}>
                {value === "all" ? "All" : value.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={recentOnly} onClick={() => setRecentOnly((value) => !value)}>
            <Clock3 aria-hidden="true" /> Recently opened
          </button>
        </div>
      </header>

      {metadataError ? (
        <div className="vh-catalog-notice" role="status">
          <span>Repository activity is temporarily unavailable.</span>
          {onRefreshMetadata ? <button type="button" onClick={onRefreshMetadata}>Refresh</button> : null}
        </div>
      ) : null}
      </div>

      {filteredComponents.length > 0 ? (
        <section className={cn("vh-catalog-results", view === "list" && "vh-catalog-results--list")} aria-label="Explorations">
          {filteredComponents.map((component, index) => {
            const sourceType = getExplorationSource(component);
            const updatedAt = getComponentUpdatedAt(
              component,
              componentVariantUpdatedAt[component.key],
              componentVariantCreatedAt[component.key],
              true,
            );
            const openedAt = recentlyOpenedAt[component.key];
            const metadata = sourceMetadata[component.key];
            const activityAt = openedAt ?? metadata?.lastCommit ?? (metadata ? undefined : updatedAt);
            const activityLabel = openedAt ? "Opened" : metadata?.lastCommit || updatedAt ? "Commit" : undefined;
            return (
              <button key={component.key} type="button" className="vh-exploration-card" onClick={() => onSelect(component.key)}>
                <span className={cn("vh-exploration-cover", `vh-exploration-cover--${index % 10}`)}>
                  <span>{component.name}</span>
                  <span className="vh-exploration-cover-lines" aria-hidden="true"><i /><i /><i /></span>
                </span>
                <span className="vh-exploration-card-body">
                  <span className="vh-exploration-title-row">
                    <span>
                      <span className="vh-exploration-title-heading">
                        <strong>{component.name}</strong>
                        {metadata?.localChanges ? (
                          <span className="vh-exploration-modified" title="Uncommitted source changes">
                            <span className="vh-sr-only">Uncommitted source changes</span>
                          </span>
                        ) : null}
                      </span>
                      {component.description ? <small>{component.description}</small> : null}
                    </span>
                    {(component.tags ?? []).includes("favorite") ? <Star className="vh-exploration-favorite" aria-label="Favorite" /> : null}
                  </span>
                  <span className="vh-exploration-meta" title={[openedAt && `Opened: ${openedAt}`, metadata?.lastCommit && `Last source commit: ${metadata.lastCommit}`, metadata?.localChanges && "Uncommitted source changes"].filter(Boolean).join(" · ")}>
                    <span className="vh-exploration-meta-summary">
                      <b>{sourceType === "mixed" ? "Mixed" : sourceType.toUpperCase()}</b>
                      <strong>{component.variants.length} variant{component.variants.length === 1 ? "" : "s"}</strong>
                    </span>
                    <span className="vh-exploration-meta-date">
                      {activityAt && activityLabel
                        ? `${activityLabel} ${formatComponentDate(activityAt)}`
                        : metadata?.history === "no-head"
                          ? "No commits yet"
                          : metadata?.history === "no-git"
                            ? "History unavailable"
                            : "Never opened"}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="vh-catalog-empty">
          <h2>No explorations found</h2>
          <p>Try a different search or clear the active filters.</p>
        </section>
      )}
    </main>
  );
}
