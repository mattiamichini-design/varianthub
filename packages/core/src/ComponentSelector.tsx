"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Command, FolderTree, Layers, Search, Tags, X } from "lucide-react";
import { cn } from "./classnames";
import {
  COMPONENT_SORT_OPTIONS,
  compareComponents,
  getComponentUpdatedAt,
  type ComponentSortOption,
} from "./componentTimeline";
import type { ComponentWithVariants } from "./types";

type ComponentSelectorProps = {
  components: ComponentWithVariants[];
  selectedKey?: string;
  selectedStatus?: ReactNode;
  componentVariantCreatedAt?: Record<string, Record<string, string>>;
  componentVariantUpdatedAt?: Record<string, Record<string, string>>;
  recentlyOpenedAt?: Record<string, string>;
  onSelect: (key: string) => void;
};

function CommandShortcut() {
  return <span className="vh-selector-shortcut" aria-hidden="true"><Command />K</span>;
}

export function ComponentSelector({
  components,
  selectedKey,
  selectedStatus,
  componentVariantCreatedAt = {},
  componentVariantUpdatedAt = {},
  recentlyOpenedAt = {},
  onSelect,
}: ComponentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] =
    useState<ComponentSortOption>("updated-desc");
  const [activeIndex, setActiveIndex] = useState(0);
  const [launcherIndex, setLauncherIndex] = useState(0);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const launcherSearchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const commandTitleId = useId();
  const commandOptionsId = useId();
  const launcherId = useId();
  const launcherOptionsId = useId();

  const availableCategories = useMemo(
    () => Array.from(new Set(components.flatMap((component) => component.categories ?? []))).sort(),
    [components],
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const formatPath = (path: string) => {
    const normalized = path.replace(/^src\/(components\/)?/, "");
    return normalized.replace(/\/variants(?:\/.*)?$/, "") || normalized;
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const originalIndex = Object.fromEntries(
      components.map((component, index) => [component.key, index]),
    );
    const componentUpdatedAt = Object.fromEntries(
      components.map((component) => [
        component.key,
        getComponentUpdatedAt(
          component,
          componentVariantUpdatedAt[component.key],
          componentVariantCreatedAt[component.key],
          true,
        ),
      ]),
    );

    return components
      .filter((component) =>
        selectedCategory === "all"
          ? true
          : (component.categories ?? []).includes(selectedCategory),
      )
      .map((component) => {
        const haystacks = [
          component.name,
          component.key,
          component.path,
          component.description ?? "",
          ...(component.categories ?? []),
          ...(component.tags ?? []),
        ].map((value) => value.toLowerCase());

        let score = 0;

        if (term) {
          if (component.name.toLowerCase() === term) {
            score += 100;
          }
          if (component.name.toLowerCase().startsWith(term)) {
            score += 60;
          }
          if (component.name.toLowerCase().includes(term)) {
            score += 40;
          }
          if (component.path.toLowerCase().includes(term)) {
            score += 20;
          }
          if ((component.categories ?? []).some((entry) => entry.toLowerCase().includes(term))) {
            score += 20;
          }
          if ((component.tags ?? []).some((entry) => entry.toLowerCase().includes(term))) {
            score += 12;
          }
          if (component.key.toLowerCase().includes(term)) {
            score += 10;
          }
          if (component.description?.toLowerCase().includes(term)) {
            score += 8;
          }
          if (!haystacks.some((value) => value.includes(term))) {
            return null;
          }
        }

        return { component, score };
      })
      .filter((entry): entry is { component: ComponentWithVariants; score: number } => entry !== null)
      .sort((left, right) => {
        if (term && right.score !== left.score) {
          return right.score - left.score;
        }

        return compareComponents(
          left.component,
          right.component,
          sortOption,
          componentUpdatedAt,
          originalIndex,
        );
      })
      .map((entry) => entry.component);
  }, [
    componentVariantCreatedAt,
    componentVariantUpdatedAt,
    components,
    search,
    selectedCategory,
    sortOption,
  ]);

  const selected = components.find(
    (component) => component.key === selectedKey,
  );

  const recent = useMemo(() => filtered
    .filter((component) => recentlyOpenedAt[component.key])
    .sort((left, right) => (Date.parse(recentlyOpenedAt[right.key]!) || 0) - (Date.parse(recentlyOpenedAt[left.key]!) || 0))
    .slice(0, 3), [filtered, recentlyOpenedAt]);
  const recentKeys = useMemo(() => new Set(recent.map((component) => component.key)), [recent]);
  const commandOptions = useMemo(
    () => [...recent, ...filtered.filter((component) => !recentKeys.has(component.key))],
    [filtered, recent, recentKeys],
  );

  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsLauncherOpen(false);
        setActiveIndex(0);
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) {
      dialog?.showModal();
      searchRef.current?.focus();
    }
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    launcherSearchRef.current?.focus();
    const closeLauncher = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsLauncherOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", closeLauncher);
    return () => window.removeEventListener("keydown", closeLauncher);
  }, [isLauncherOpen]);

  useEffect(() => {
    if (!isOpen || !commandOptions[activeIndex]) return;
    document.getElementById(`${commandOptionsId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, commandOptions, commandOptionsId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const releaseKey = () => setPressedKey(null);
    window.addEventListener("blur", releaseKey);
    return () => window.removeEventListener("blur", releaseKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isLauncherOpen || !commandOptions[launcherIndex]) return;
    document.getElementById(`${launcherOptionsId}-${launcherIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [commandOptions, isLauncherOpen, launcherIndex, launcherOptionsId]);

  const choose = (key: string) => {
    onSelect(key);
    setIsLauncherOpen(false);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="vh-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsLauncherOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-controls={launcherId}
        aria-expanded={isLauncherOpen}
        aria-label={selected?.name ?? "All explorations"}
        className={cn(
          "vh-selector-trigger",
          isOpen && "vh-selector-trigger--open",
        )}
      >
        <span className="vh-selector-trigger-main">
          <Layers className="vh-selector-icon h-4 w-4" />
          {selected ? (
            <span className="vh-selector-label">{selected.name}</span>
          ) : (
            <span className="vh-selector-placeholder">All explorations</span>
          )}
          {selected ? selectedStatus : null}
        </span>
        <CommandShortcut />
      </button>

      {isLauncherOpen ? <>
        <button type="button" tabIndex={-1} className="vh-selector-launcher-backdrop" aria-label="Close exploration menu" onClick={() => setIsLauncherOpen(false)} />
        <div id={launcherId} className="vh-selector-launcher" role="dialog" aria-label="Choose an exploration">
          <div className="vh-selector-launcher-search">
            <Search aria-hidden="true" />
            <input
              ref={launcherSearchRef}
              type="search"
              aria-label="Search explorations"
              placeholder="Search explorations…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setLauncherIndex(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); setLauncherIndex((index) => commandOptions.length ? Math.min(commandOptions.length - 1, index + 1) : 0); }
                if (event.key === "ArrowUp") { event.preventDefault(); setLauncherIndex((index) => Math.max(0, index - 1)); }
                if (event.key === "Enter" && commandOptions[launcherIndex]) { event.preventDefault(); choose(commandOptions[launcherIndex].key); }
              }}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={launcherOptionsId}
              aria-expanded="true"
              aria-activedescendant={commandOptions[launcherIndex] ? `${launcherOptionsId}-${launcherIndex}` : undefined}
            />
          </div>
          <div id={launcherOptionsId} className="vh-selector-launcher-options" role="listbox" aria-label="Explorations">
          {recent.length ? <>
            <span className="vh-selector-launcher-label">Recently opened</span>
            {recent.map((component, index) => <button id={`${launcherOptionsId}-${index}`} key={component.key} type="button" tabIndex={-1} role="option" aria-selected={index === launcherIndex} className={cn(index === launcherIndex && "vh-selector-launcher-option--focused")} onClick={() => choose(component.key)}>
              <Layers />{component.name}<span>{component.variants.length}</span>
            </button>)}
          </> : null}
          {filtered.length > recent.length ? <span className="vh-selector-launcher-label">All explorations</span> : null}
          {filtered.filter((component) => !recentKeys.has(component.key)).map((component, index) => {
            const optionIndex = index + recent.length;
            return <button id={`${launcherOptionsId}-${optionIndex}`} key={component.key} type="button" tabIndex={-1} role="option" aria-selected={optionIndex === launcherIndex} className={cn(optionIndex === launcherIndex && "vh-selector-launcher-option--focused")} onClick={() => choose(component.key)}>
              <Layers />{component.name}<span>{component.variants.length}</span>
            </button>;
          })}
          {filtered.length === 0 ? <div className="vh-selector-empty">No explorations found</div> : null}
          </div>
          <button className="vh-selector-launcher-command" type="button" onClick={() => { setIsLauncherOpen(false); setActiveIndex(0); setIsOpen(true); }}><Command />Open command menu <CommandShortcut /></button>
        </div>
      </> : null}

      <dialog
        ref={dialogRef}
        className="vh-selector-dialog"
        aria-labelledby={commandTitleId}
        onCancel={() => setIsOpen(false)}
        onClose={() => { setIsOpen(false); setPressedKey(null); triggerRef.current?.focus(); }}
        onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}
      >
          <div
            className="vh-selector-menu"
            onKeyDownCapture={(event) => {
              if (event.target instanceof HTMLSelectElement) return;
              if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
              if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) setPressedKey(event.key);
              if (event.key === "Escape") event.preventDefault();
            }}
            onKeyUpCapture={(event) => {
              if (event.target instanceof HTMLSelectElement) return;
              if (pressedKey !== event.key) return;
              setPressedKey(null);
              if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); return; }
              const targetIsOption = event.target instanceof Element && event.target.closest("[role='option']");
              if (event.key === "Enter" && commandOptions[activeIndex] && (event.target === searchRef.current || targetIsOption)) {
                event.preventDefault();
                choose(commandOptions[activeIndex].key);
              }
            }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPressedKey(null);
            }}
            onKeyDown={(event) => {
            if (event.target instanceof HTMLSelectElement) return;
            if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
            const targetIsOption = event.target instanceof Element && event.target.closest("[role='option']");
            if (event.target !== searchRef.current && !targetIsOption) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => commandOptions.length ? Math.min(commandOptions.length - 1, index + 1) : 0); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
            if (event.key === "Enter") event.preventDefault();
          }}>
            <div className="vh-selector-dialog-heading">
              <span><Command /><strong id={commandTitleId}>Open exploration</strong></span>
              <button type="button" className="vh-modal-close" onClick={() => setIsOpen(false)} aria-label="Close command menu"><X aria-hidden="true" /></button>
            </div>
            <div className="vh-selector-search">
              <div className="vh-selector-search-input-wrap">
                <Search className="vh-selector-search-icon" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Search explorations"
                  placeholder="Search explorations..."
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); }}
                  className="vh-selector-search-input"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={commandOptionsId}
                  aria-expanded="true"
                  aria-activedescendant={commandOptions[activeIndex] ? `${commandOptionsId}-${activeIndex}` : undefined}
                />
              </div>

              {availableCategories.length > 0 ? (
                <div className="vh-selector-filters" aria-label="Component categories">
                  <button
                    type="button"
                    className={cn(
                      "vh-selector-filter-chip",
                      selectedCategory === "all" && "vh-selector-filter-chip--active",
                    )}
                    onClick={() => { setSelectedCategory("all"); setActiveIndex(0); }}
                  >
                    All
                  </button>
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={cn(
                        "vh-selector-filter-chip",
                        selectedCategory === category && "vh-selector-filter-chip--active",
                      )}
                      onClick={() => { setSelectedCategory(category); setActiveIndex(0); }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="vh-selector-sort">
                <span>Sort</span>
                <span className="vh-select"><select
                  value={sortOption}
                  onChange={(event) => { setSortOption(event.target.value as ComponentSortOption); setActiveIndex(0); }}
                  className="vh-selector-sort-select"
                >
                  {COMPONENT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select><ChevronDown aria-hidden="true" /></span>
              </label>
            </div>

            <div id={commandOptionsId} className="vh-selector-options" role="listbox" aria-label="Explorations">
              {filtered.length === 0 ? (
                <div className="vh-selector-empty">No explorations found</div>
              ) : (
                <>
                {recent.length ? <><p className="vh-selector-section-label">Recently opened</p>{recent.map((component, index) => (
                  <button id={`${commandOptionsId}-${index}`} type="button" tabIndex={-1} role="option" aria-selected={index === activeIndex} key={`recent:${component.key}`} onClick={() => choose(component.key)} className={cn("vh-selector-option", index === activeIndex && "vh-selector-option--focused")}>
                    <span className="vh-selector-option-main"><span className="vh-selector-option-name">{component.name}</span><span className="vh-selector-option-path">{formatPath(component.path)}</span></span>
                    <span className="vh-selector-option-count">{component.variants.length} variant{component.variants.length !== 1 ? "s" : ""}</span>
                  </button>
                ))}</> : null}
                {filtered.length > recent.length ? <p className="vh-selector-section-label">All explorations</p> : null}
                {filtered.filter((component) => !recentKeys.has(component.key)).map((component, index) => (
                  <button
                    type="button"
                    tabIndex={-1}
                    key={component.key}
                    id={`${commandOptionsId}-${index + recent.length}`}
                    role="option"
                    aria-selected={index + recent.length === activeIndex}
                    onClick={() => choose(component.key)}
                    className={cn(
                      "vh-selector-option",
                      component.key === selectedKey
                        ? "vh-selector-option--active"
                        : null,
                      index + recent.length === activeIndex && "vh-selector-option--focused",
                    )}
                  >
                    <span className="vh-selector-option-main">
                      <span className="vh-selector-option-name">{component.name}</span>
                      <span className="vh-selector-option-path">{formatPath(component.path)}</span>
                      {component.description ? (
                        <span className="vh-selector-option-description">
                          {component.description}
                        </span>
                      ) : null}
                      <span className="vh-selector-option-chips">
                        {(component.categories ?? []).slice(0, 2).map((category) => (
                          <span key={`${component.key}-${category}`} className="vh-selector-inline-chip">
                            <FolderTree aria-hidden="true" />
                            {category}
                          </span>
                        ))}
                        {(component.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={`${component.key}-${tag}`} className="vh-selector-inline-chip">
                            <Tags aria-hidden="true" />
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="vh-selector-option-count">
                      {component.variants.length} variant
                      {component.variants.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
                </>
              )}
            </div>
            <footer className="vh-selector-footer">
              <span className="vh-selector-key-group"><span><kbd data-pressed={pressedKey === "ArrowUp" || undefined}>↑</kbd><kbd data-pressed={pressedKey === "ArrowDown" || undefined}>↓</kbd>Navigate</span><span><kbd data-pressed={pressedKey === "Enter" || undefined}>↵</kbd>Open</span></span>
              <span className="vh-selector-key-group"><span><kbd data-pressed={pressedKey === "Escape" || undefined}>Esc</kbd>Close</span></span>
            </footer>
          </div>
      </dialog>
    </div>
  );
}
