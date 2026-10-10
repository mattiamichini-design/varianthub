"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Check, ChevronDown, CircleAlert, CircleCheck, Grid2X2, List, LoaderCircle, Lock, LockOpen, Maximize2, PanelsTopLeft, Pencil, Palette, X } from "lucide-react";
import { ComponentCatalog } from "./ComponentCatalog";
import { ComponentMetadataPanel } from "./ComponentMetadataPanel";
import { ComponentSelector } from "./ComponentSelector";
import { VariantHubGrid } from "./VariantHubGrid";
import { resolveAvailableGridColumns, VariantHubToolbar } from "./VariantHubToolbar";
import { VariantChooserDialog } from "./VariantChooserDialog";
import { resolveViewportPresets, VariantHubCanvasPrototype, type VariantHubViewportPresets } from "./VariantHubCanvasPrototype";
import { resolveVariantSource } from "./variantSource";
import { buildComparisonTarget, reconcileComparedVariantIds } from "./fullPage";
import { useVariantHub, type ArtboardGeometry } from "./provider";
import type { ComponentMetadataPatch, ComponentWithVariants, VariantHubComparisonTarget } from "./types";
import { VariantHubMark } from "./VariantHubMark";

const EMPTY_STRING_ARRAY: string[] = [];
const DEFAULT_GRID_COLS = 2;
type CanvasPreset = "mobile" | "tablet" | "desktop" | "wide" | "custom";

function ViewportPresetPicker({ value, presets, customSize, onChange }: {
  value: CanvasPreset;
  presets: VariantHubViewportPresets;
  customSize: { width: number; height: number };
  onChange: (preset: CanvasPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusedOption, setFocusedOption] = useState<CanvasPreset>(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Record<CanvasPreset, HTMLButtonElement | null>>({ mobile: null, tablet: null, desktop: null, wide: null, custom: null });
  const options: { value: CanvasPreset; label: string; dimensions: { width: number; height: number } }[] = [
    { value: "mobile", label: "Mobile", dimensions: presets.mobile },
    { value: "tablet", label: "Tablet", dimensions: presets.tablet },
    { value: "desktop", label: "Desktop", dimensions: presets.desktop },
    { value: "wide", label: "Wide", dimensions: presets.wide },
    { value: "custom", label: "Custom", dimensions: customSize },
  ];
  const selected = options.find((option) => option.value === value)!;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const openMenu = () => {
    setFocusedOption(value);
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[value]?.focus());
  };

  return (
    <div className="vh-viewport-picker" ref={rootRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button ref={triggerRef} type="button" className="vh-viewport-trigger" aria-label="Viewport" aria-haspopup="menu" aria-expanded={open} onPointerDown={(event) => {
        if (open) event.preventDefault();
      }} onFocus={(event) => {
        if (open && rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={(event) => {
        if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          openMenu();
        }
      }}>
        <span>{selected.label} · <span className="vh-viewport-trigger-size">{Math.round(selected.dimensions.width)} × {Math.round(selected.dimensions.height)}</span></span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? <div className="vh-viewport-menu" role="menu" aria-label="Viewport presets" onKeyDown={(event) => {
        const currentIndex = options.findIndex((option) => option.value === document.activeElement?.getAttribute("data-value"));
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const step = event.key === "ArrowDown" ? 1 : -1;
          const nextIndex = (currentIndex + step + options.length) % options.length;
          setFocusedOption(options[nextIndex]!.value);
          optionRefs.current[options[nextIndex]!.value]?.focus();
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          const nextOption = options[event.key === "Home" ? 0 : options.length - 1]!.value;
          setFocusedOption(nextOption);
          optionRefs.current[nextOption]?.focus();
        }
      }}>
        <span className="vh-viewport-menu-header">Viewport presets</span>
        {options.map((option) => <button key={option.value} ref={(node) => { optionRefs.current[option.value] = node; }} type="button" role="menuitemradio" aria-checked={value === option.value} tabIndex={focusedOption === option.value ? 0 : -1} data-value={option.value} className={option.value === "custom" ? "vh-viewport-option vh-viewport-option--custom" : "vh-viewport-option"} onFocus={() => setFocusedOption(option.value)} onClick={() => {
          onChange(option.value);
          setOpen(false);
          triggerRef.current?.focus();
        }}>
          <span>{option.label}</span>
          <span className="vh-viewport-option-size">{Math.round(option.dimensions.width)} × {Math.round(option.dimensions.height)}</span>
          {value === option.value ? <Check aria-hidden="true" /> : null}
        </button>)}
      </div> : null}
    </div>
  );
}

function HeaderSaveStatus({
  status,
  errorMessage,
  onRetry,
  onReload,
}: {
  status?: "loading" | "saving" | "saved" | "error" | "conflict";
  errorMessage?: string;
  onRetry: () => void;
  onReload: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<"error" | "conflict">("error");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);
  if (status === "saved" && isOpen) setIsOpen(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => actionRef.current?.focus());
  }, [isOpen]);
  if (!status) return null;
  const label = status === "loading" ? "Loading shared layout…"
    : status === "saving" ? "Saving…"
    : status === "saved" ? "Saved"
    : status === "conflict" ? "Save conflict. Reload shared layout"
    : "Save failed. Retry save";
  const icon = status === "saved" ? <CircleCheck aria-hidden="true" />
    : status === "loading" || status === "saving" ? <LoaderCircle aria-hidden="true" />
    : <CircleAlert aria-hidden="true" />;
  const className = `vh-save-status vh-save-status--${status}`;
  const announcement = <span className="vh-sr-only" role="status" aria-live="polite">{label}</span>;

  const actionable = status === "error" || status === "conflict";
  const issue = actionable ? status : openIssue;
  if (!actionable && !isOpen) return null;

  return (
    <div className="vh-save-status-wrap" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={actionable ? className : `vh-save-status vh-save-status--${issue}`}
        title={actionable ? label : issue === "conflict" ? "Resolving save conflict…" : "Retrying save…"}
        aria-label={`${actionable ? label : issue === "conflict" ? "Resolving save conflict" : "Retrying save"}. View details`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          if (actionable) setOpenIssue(status);
          setIsOpen((open) => !open);
        }}
      >
        {actionable ? icon : <CircleAlert aria-hidden="true" />}
      </button>
      {announcement}
      {isOpen ? (
        <div className="vh-save-status-popover" role="dialog" aria-label={issue === "conflict" ? "Resolve save conflict" : "Save layout details"}>
          <div className="vh-save-status-popover-heading">
            <strong>{issue === "conflict" ? "Shared layout changed" : "Couldn’t save layout"}</strong>
            <button type="button" className="vh-modal-close" aria-label="Close save details" onClick={() => { setIsOpen(false); triggerRef.current?.focus(); }}><X aria-hidden="true" /></button>
          </div>
          <p>{issue === "conflict" ? "Reloading the shared layout replaces your local unsaved choices." : "Your layout changes are still in this tab. Retry saving them to the project. No Git commit is required."}</p>
          {errorMessage ? <small>{errorMessage}</small> : null}
          <button ref={actionRef} type="button" className="vh-save-status-action" disabled={status === "loading" || status === "saving"} onClick={issue === "conflict" ? onReload : onRetry}>
            {issue === "conflict" ? "Reload shared layout" : status === "saving" ? "Saving…" : "Retry save"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type VariantHubCanvasPageProps = {
  componentsWithVariants: ComponentWithVariants[];
  getComponentVariants: (key: string) => ComponentWithVariants | undefined;
  headerActions?: ReactNode;
  defaultGridCols?: number;
  initialVariantChooserOpen?: boolean;
  autoSelectFirstComponent?: boolean;
  /** Controlled route selection. Pass `null` to show the catalog. */
  activeItemKey?: string | null;
  showEmptyState?: boolean;
  exportEnabled?: boolean;
  title?: string;
  onBrandClick?: () => void;
  onOpenComponent?: (key: string) => void;
  onGoHome?: () => void;
  getVariantFrameUrl?: (target: VariantHubComparisonTarget) => string;
  onCompareVariants?: (target: VariantHubComparisonTarget) => void;
  /** @deprecated Use `getVariantFrameUrl`. */
  getPageVariantFrameUrl?: (target: VariantHubComparisonTarget) => string;
  /** @deprecated Use `onCompareVariants`. */
  onOpenPageVariant?: (target: VariantHubComparisonTarget) => void;
  onSaveComponentMetadata?: (
    key: string,
    patch: ComponentMetadataPatch,
  ) => void | Promise<void>;
  viewportPresets?: Partial<VariantHubViewportPresets>;
};

export function VariantHubCanvasPage({
  componentsWithVariants,
  getComponentVariants,
  headerActions,
  defaultGridCols = DEFAULT_GRID_COLS,
  initialVariantChooserOpen = false,
  autoSelectFirstComponent = false,
  activeItemKey,
  showEmptyState = true,
  exportEnabled = true,
  title = "VariantHub",
  onBrandClick,
  onOpenComponent,
  onGoHome,
  getVariantFrameUrl,
  onCompareVariants,
  getPageVariantFrameUrl,
  onOpenPageVariant,
  onSaveComponentMetadata,
  viewportPresets,
}: VariantHubCanvasPageProps) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isVariantChooserOpen, setIsVariantChooserOpen] = useState(initialVariantChooserOpen);
  const [variantChooserDraft, setVariantChooserDraft] = useState<string[]>(() => initialVariantChooserOpen ? (componentsWithVariants.find(item => item.key === activeItemKey)?.variants.map(variant => variant.id) ?? []) : []);
  const autoOpenedDiscovery = useRef("");
  const discoveryComponent = useRef<string | undefined>(initialVariantChooserOpen ? activeItemKey ?? undefined : undefined);
  const {
    activeComponentKey,
    components,
    clearActiveComponent,
    setActiveComponent,
    syncVariants,
    setVariantOrder,
    setComparedVariants,
    resolvePendingVariants,
    toggleVariantSelection,
    setVariantsFavorite,
    selectAllVariants,
    clearSelection,
    setZoom,
    setGridCols,
    sourceMetadata,
    metadataError,
    lastOpened,
    saveStatus,
    saveErrors,
    refreshMetadata,
    retrySave,
    reloadLayout,
    setCanvasLayout,
    setPresentation,
    setCamera,
  } = useVariantHub();

  const safeActiveComponentKey = activeItemKey === undefined
    ? (isHydrated ? activeComponentKey : undefined)
    : (activeItemKey ?? undefined);
  const safeComponents = useMemo(
    () => isHydrated ? components : {},
    [components, isHydrated],
  );
  const activeComponent = safeActiveComponentKey
    ? getComponentVariants(safeActiveComponentKey)
    : undefined;
  const variantHubState = safeActiveComponentKey
    ? safeComponents[safeActiveComponentKey]
    : undefined;

  const variantOrder = variantHubState?.variantOrder ?? EMPTY_STRING_ARRAY;
  const selectedVariants = variantHubState?.selectedVariants ?? EMPTY_STRING_ARRAY;
  const favoriteVariants =
    variantHubState?.favoriteVariants ?? EMPTY_STRING_ARRAY;
  const variantCreatedAt = variantHubState?.variantCreatedAt ?? {};
  const variantUpdatedAt = variantHubState?.variantUpdatedAt ?? {};
  const pendingVariantIds = variantHubState?.pendingVariantIds ?? EMPTY_STRING_ARRAY;
  const zoom = variantHubState?.zoom || 100;
  const effectiveGetVariantFrameUrl = getVariantFrameUrl ?? getPageVariantFrameUrl;
  const effectiveCompareVariants = onCompareVariants ?? onOpenPageVariant;
  const presentation = variantHubState?.presentation ?? "grid";
  const gridCols = activeComponent?.kind === "page"
    ? Math.min(4, variantHubState?.gridCols ?? 1)
    : (variantHubState?.gridCols ?? defaultGridCols);
  const canvasPreset = variantHubState?.canvas?.preset ?? "desktop";
  const canvasResizeLocked = variantHubState?.canvas?.resizeLocked ?? false;
  const presets = resolveViewportPresets(viewportPresets);
  const firstCanvasGeometry = Object.values(variantHubState?.canvas?.artboards ?? {})[0];
  const presetDimensions = canvasPreset === "custom"
    ? { width: firstCanvasGeometry?.width ?? 960, height: firstCanvasGeometry?.height ?? 720 }
    : presets[canvasPreset];
  const [lastCanvasSize, setLastCanvasSize] = useState<{ componentKey: string; artboardId?: string; width: number; height: number }>();
  const [customCanvasDraft, setCustomCanvasDraft] = useState({ width: "960", height: "720" });
  const canvasLayoutRef = useRef<{ componentKey?: string; artboards: Record<string, ArtboardGeometry> }>({ artboards: {} });
  const applicableCanvasSize = lastCanvasSize && lastCanvasSize.componentKey === activeComponent?.key ? lastCanvasSize : presetDimensions;
  const availableGridColumns = useSyncExternalStore(
    (notify) => { window.addEventListener("resize", notify); return () => window.removeEventListener("resize", notify); },
    () => resolveAvailableGridColumns(window.innerWidth),
    () => 4,
  );

  useEffect(() => {
    canvasLayoutRef.current = {
      componentKey: activeComponent?.key,
      artboards: variantHubState?.canvas?.artboards ?? {},
    };
  }, [activeComponent?.key, variantHubState?.canvas?.artboards]);

  const [draftSize, setDraftSize] = useState<{ width: number; height: number }>();
  if (draftSize?.width !== applicableCanvasSize.width || draftSize?.height !== applicableCanvasSize.height) {
    setDraftSize(applicableCanvasSize);
    setCustomCanvasDraft({ width: String(Math.round(applicableCanvasSize.width)), height: String(Math.round(applicableCanvasSize.height)) });
  }

  const visualVariantOrder = useMemo(() => {
    if (!activeComponent) return EMPTY_STRING_ARRAY;
    const registeredIds = activeComponent.variants.map((variant) => variant.id);
    const registeredSet = new Set(registeredIds);
    const orderedIds = [
      ...variantOrder.filter((id) => registeredSet.has(id)),
      ...registeredIds.filter((id) => !variantOrder.includes(id)),
    ];
    const favoriteSet = new Set(favoriteVariants);
    return [
      ...orderedIds.filter((id) => favoriteSet.has(id)),
      ...orderedIds.filter((id) => !favoriteSet.has(id)),
    ];
  }, [activeComponent, favoriteVariants, variantOrder]);

  useEffect(() => {
    if (activeItemKey) setActiveComponent(activeItemKey);
  }, [activeItemKey, setActiveComponent]);

  useEffect(() => {
    if (activeItemKey !== undefined || !autoSelectFirstComponent || componentsWithVariants.length === 0) {
      return;
    }

    const fallbackKey = componentsWithVariants[0]?.key;
    if (!fallbackKey) {
      return;
    }

    const selectedExists = safeActiveComponentKey
      ? componentsWithVariants.some(
          (component) => component.key === safeActiveComponentKey,
        )
      : false;

    if (!selectedExists) {
      setActiveComponent(fallbackKey);
      syncVariants(
        fallbackKey,
        getComponentVariants(fallbackKey)?.variants ?? [],
      );
    }
  }, [
    autoSelectFirstComponent,
    activeItemKey,
    componentsWithVariants,
    getComponentVariants,
    safeActiveComponentKey,
    setActiveComponent,
    syncVariants,
  ]);

  useEffect(() => {
    if (!safeActiveComponentKey || !activeComponent) {
      return;
    }

    syncVariants(safeActiveComponentKey, activeComponent.variants);
    if (variantHubState?.gridCols === undefined) {
      setGridCols(
        safeActiveComponentKey,
        activeComponent.kind === "page" ? 1 : defaultGridCols,
      );
    }
  }, [activeComponent, defaultGridCols, safeActiveComponentKey, setGridCols, syncVariants, variantHubState?.gridCols]);

  const selectedFavoriteCount = useMemo(
    () => selectedVariants.filter((id) => favoriteVariants.includes(id)).length,
    [favoriteVariants, selectedVariants],
  );
  const canUnfavoriteSelection =
    selectedVariants.length > 0 &&
    selectedFavoriteCount === selectedVariants.length;
  const comparedVariantIds = useMemo(
    () => reconcileComparedVariantIds(
      visualVariantOrder,
      variantHubState?.comparedVariantIds ?? EMPTY_STRING_ARRAY,
    ),
    [variantHubState?.comparedVariantIds, visualVariantOrder],
  );
  const discoveryDraft = useMemo(() => visualVariantOrder.filter((id) => comparedVariantIds.includes(id) || pendingVariantIds.includes(id)), [comparedVariantIds, pendingVariantIds, visualVariantOrder]);

  useEffect(() => {
    if (discoveryComponent.current !== activeComponent?.key) {
      discoveryComponent.current = activeComponent?.key;
      autoOpenedDiscovery.current = "";
      setIsVariantChooserOpen(false);
    }
    if (!activeComponent || pendingVariantIds.length === 0) {
      autoOpenedDiscovery.current = "";
      return;
    }
    const signature = `${activeComponent.key}:${pendingVariantIds.join(":")}`;
    if (autoOpenedDiscovery.current === signature) return;
    autoOpenedDiscovery.current = signature;
    setVariantChooserDraft(discoveryDraft);
    setIsVariantChooserOpen(true);
  }, [activeComponent, discoveryDraft, pendingVariantIds]);
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(
          componentsWithVariants.flatMap((component) => component.categories ?? []),
        ),
      ).sort(),
    [componentsWithVariants],
  );
  const componentVariantCreatedAt = useMemo(
    () =>
      Object.fromEntries(
        componentsWithVariants.map((component) => [
          component.key,
          safeComponents[component.key]?.variantCreatedAt ?? {},
        ]),
      ),
    [componentsWithVariants, safeComponents],
  );
  const componentVariantUpdatedAt = useMemo(
    () =>
      Object.fromEntries(
        componentsWithVariants.map((component) => [
          component.key,
          safeComponents[component.key]?.variantUpdatedAt ?? {},
        ]),
      ),
    [componentsWithVariants, safeComponents],
  );

  const handleSelectComponent = useCallback(
    (key: string) => {
      onOpenComponent?.(key);
      setActiveComponent(key);
      const component = getComponentVariants(key);
      if (component) {
        syncVariants(key, component.variants);
      }
    },
    [getComponentVariants, onOpenComponent, setActiveComponent, syncVariants],
  );

  const handleExport = useCallback(() => {
    if (!exportEnabled || !activeComponent || selectedVariants.length === 0) {
      return;
    }

    const exportData = {
      component: activeComponent.key,
      componentName: activeComponent.name,
      selectedVariants: selectedVariants.map((id) => {
        const variant = activeComponent.variants.find(
          (entry) => entry.id === id,
        );
        return {
          id,
          name: variant?.name || id,
          description: variant?.description,
        };
      }),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeComponent.key}-variants.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeComponent, exportEnabled, selectedVariants]);

  const handleGridColsChange = useCallback((cols: number) => {
    if (safeActiveComponentKey) setGridCols(safeActiveComponentKey, cols);
  }, [safeActiveComponentKey, setGridCols]);

  const handleCompare = useCallback(() => {
    if (!activeComponent || !effectiveCompareVariants) return;
    const target = buildComparisonTarget(
      activeComponent.key,
      visualVariantOrder,
      selectedVariants.length ? selectedVariants : comparedVariantIds,
    );
    if (target) effectiveCompareVariants(target);
  }, [activeComponent, comparedVariantIds, effectiveCompareVariants, selectedVariants, visualVariantOrder]);

  const handleCompareAll = useCallback(() => {
    if (!activeComponent || !effectiveCompareVariants) return;
    const target = buildComparisonTarget(
      activeComponent.key,
      visualVariantOrder,
      comparedVariantIds,
    );
    if (target) effectiveCompareVariants(target);
  }, [activeComponent, comparedVariantIds, effectiveCompareVariants, visualVariantOrder]);

  const arrangeCanvasArtboards = useCallback((
    ids: string[],
    dimensions: { width: number; height: number },
  ) => Object.fromEntries(ids.map((id, index) => [id, {
    x: index * (dimensions.width + 80),
    y: 0,
    width: dimensions.width,
    height: dimensions.height,
  }])), []);

  const selectCanvasPreset = useCallback((preset: CanvasPreset) => {
    if (!activeComponent) return;
    const current = variantHubState?.canvas?.artboards ?? {};
    if (preset === "custom") {
      setCanvasLayout(activeComponent.key, { preset, resizeLocked: canvasResizeLocked, artboards: current });
      return;
    }
    const dimensions = presets[preset];
    setLastCanvasSize({ componentKey: activeComponent.key, ...dimensions });
    const artboards = arrangeCanvasArtboards(comparedVariantIds, dimensions);
    canvasLayoutRef.current = { componentKey: activeComponent.key, artboards };
    setCanvasLayout(activeComponent.key, { preset, resizeLocked: canvasResizeLocked, artboards });
  }, [activeComponent, arrangeCanvasArtboards, canvasResizeLocked, comparedVariantIds, presets, setCanvasLayout, variantHubState?.canvas?.artboards]);

  const commitCustomCanvasSize = useCallback((dimension: "width" | "height") => {
    if (!activeComponent) return;
    const value = Number(customCanvasDraft[dimension]);
    if (!Number.isFinite(value) || value < 100 || value > 7680) {
      setCustomCanvasDraft((draft) => ({ ...draft, [dimension]: String(Math.round(applicableCanvasSize[dimension])) }));
      return;
    }
    const targetId = lastCanvasSize?.componentKey === activeComponent.key && lastCanvasSize.artboardId && comparedVariantIds.includes(lastCanvasSize.artboardId)
      ? lastCanvasSize.artboardId
      : comparedVariantIds[0];
    if (!targetId) return;
    const current = variantHubState?.canvas?.artboards ?? arrangeCanvasArtboards(comparedVariantIds, applicableCanvasSize);
    const target = current[targetId] ?? { x: 0, y: 0, width: applicableCanvasSize.width, height: applicableCanvasSize.height };
    const size = {
      width: dimension === "width" ? Math.round(value) : applicableCanvasSize.width,
      height: dimension === "height" ? Math.round(value) : applicableCanvasSize.height,
    };
    const artboards = { ...current, [targetId]: { ...target, ...size } };
    setLastCanvasSize({ componentKey: activeComponent.key, artboardId: targetId, ...size });
    canvasLayoutRef.current = { componentKey: activeComponent.key, artboards };
    setCanvasLayout(activeComponent.key, { preset: "custom", resizeLocked: canvasResizeLocked, artboards });
  }, [activeComponent, applicableCanvasSize, arrangeCanvasArtboards, canvasResizeLocked, comparedVariantIds, customCanvasDraft, lastCanvasSize, setCanvasLayout, variantHubState?.canvas?.artboards]);

  return (
    <div className="vh-root">
      <header className="vh-page-header">
        <div className="vh-page-header-inner">
          <div className="vh-page-header-row">
            <button
              type="button"
              className="vh-page-brand"
              data-mark-trigger
              onClick={onBrandClick ?? onGoHome ?? clearActiveComponent}
            >
              <VariantHubMark motion="hover" className="vh-page-brand-badge" />
              <h1 className="vh-page-brand-title">{title}</h1>
            </button>

            {headerActions ? (
              <div className="vh-page-header-actions-mobile">
                {headerActions}
              </div>
            ) : null}
          </div>

          {componentsWithVariants.length > 0 ? (
            <div className="vh-page-controls-row">
              <div className="vh-page-divider" />
              <div className="vh-page-exploration">
                <div className="vh-page-selector">
                  <ComponentSelector
                    components={componentsWithVariants}
                    selectedKey={safeActiveComponentKey}
                    selectedStatus={activeComponent && saveStatus[activeComponent.key] && saveStatus[activeComponent.key] !== "error" && saveStatus[activeComponent.key] !== "conflict" ? (
                      <span className={`vh-save-status vh-save-status--${saveStatus[activeComponent.key]}`} title={saveStatus[activeComponent.key] === "loading" ? "Loading shared layout…" : saveStatus[activeComponent.key] === "saving" ? "Saving…" : "Saved"}>
                        {saveStatus[activeComponent.key] === "saved" ? <CircleCheck aria-hidden="true" /> : <LoaderCircle aria-hidden="true" />}
                        <span className="vh-sr-only" role="status" aria-live="polite">{saveStatus[activeComponent.key] === "loading" ? "Loading shared layout…" : saveStatus[activeComponent.key] === "saving" ? "Saving…" : "Saved"}</span>
                      </span>
                    ) : null}
                    componentVariantCreatedAt={componentVariantCreatedAt}
                    componentVariantUpdatedAt={componentVariantUpdatedAt}
                    recentlyOpenedAt={lastOpened}
                    onSelect={handleSelectComponent}
                  />
                </div>
                {activeComponent && onSaveComponentMetadata ? (
                  <button type="button" className="vh-header-edit-button" aria-label="Edit details" title="Edit details" onClick={() => setIsMetadataOpen(true)}>
                    <Pencil aria-hidden="true" />
                  </button>
                ) : null}
                {activeComponent ? (
                  <HeaderSaveStatus
                    status={saveStatus[activeComponent.key]}
                    errorMessage={saveErrors[activeComponent.key]}
                    onRetry={() => retrySave(activeComponent.key)}
                    onReload={() => reloadLayout(activeComponent.key)}
                  />
                ) : null}
              </div>

              {!activeComponent ? (
                <div className="vh-presentation-switch vh-segmented" role="group" aria-label="Catalog view">
                  <button type="button" aria-pressed={catalogView === "list"} onClick={() => setCatalogView("list")}><List />List</button>
                  <button type="button" aria-pressed={catalogView === "grid"} onClick={() => setCatalogView("grid")}><Grid2X2 />Grid</button>
                </div>
              ) : activeComponent && effectiveGetVariantFrameUrl ? (
                <div className="vh-presentation-switch vh-segmented" role="group" aria-label="Presentation">
                  <button type="button" aria-pressed={presentation === "grid"} onClick={() => setPresentation(activeComponent.key, "grid")}><Grid2X2 />Grid</button>
                  <button type="button" aria-pressed={presentation === "canvas"} onClick={() => setPresentation(activeComponent.key, "canvas")}><PanelsTopLeft />Canvas</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {headerActions ? (
            <div className="vh-page-header-actions-desktop">
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>

      {!activeComponent ? (
        <ComponentCatalog
          components={componentsWithVariants}
          componentVariantCreatedAt={componentVariantCreatedAt}
          componentVariantUpdatedAt={componentVariantUpdatedAt}
          recentlyOpenedAt={lastOpened}
          sourceMetadata={sourceMetadata}
          metadataError={metadataError}
          onRefreshMetadata={refreshMetadata}
          onSelect={handleSelectComponent}
          view={catalogView}
        />
      ) : (
        <>
          {onSaveComponentMetadata ? (
            <ComponentMetadataPanel
              key={`${activeComponent.key}:${isMetadataOpen ? "open" : "closed"}`}
              component={activeComponent}
              availableCategories={availableCategories}
              isOpen={isMetadataOpen}
              onClose={() => setIsMetadataOpen(false)}
              onSave={onSaveComponentMetadata}
            />
          ) : null}

          {presentation === "grid" ? <VariantHubToolbar
            zoom={zoom}
            onZoomChange={setZoom}
            selectedCount={selectedVariants.length}
            comparedCount={comparedVariantIds.length}
            totalCount={activeComponent.variants.length}
            onSelectAll={() => {
              if (safeActiveComponentKey) {
                selectAllVariants(safeActiveComponentKey);
              }
            }}
            onClearSelection={() => {
              if (safeActiveComponentKey) {
                clearSelection(safeActiveComponentKey);
              }
            }}
            onExport={handleExport}
            onFavoriteSelected={() => {
              if (safeActiveComponentKey && selectedVariants.length > 0) {
                setVariantsFavorite(
                  safeActiveComponentKey,
                  selectedVariants,
                  !canUnfavoriteSelection,
                );
              }
            }}
            onCompare={handleCompare}
            onCompareAll={effectiveCompareVariants ? handleCompareAll : undefined}
            onChooseVariants={() => {
              setVariantChooserDraft(pendingVariantIds.length ? discoveryDraft : comparedVariantIds);
              setIsVariantChooserOpen(true);
            }}
            canUnfavoriteSelection={canUnfavoriteSelection}
            canFavoriteSelection={selectedVariants.length > 0}
            compareEnabled={!!effectiveCompareVariants && comparedVariantIds.length > 0}
            gridCols={gridCols}
            onGridColsChange={handleGridColsChange}
            exportEnabled={exportEnabled}
            isPage={activeComponent.kind === "page"}
          /> : null}

          {presentation === "grid" ? <main className="vh-page-main">
            {gridCols <= availableGridColumns ? <VariantHubGrid
              variants={activeComponent.variants.filter((variant) => comparedVariantIds.includes(variant.id))}
              variantOrder={comparedVariantIds}
              selectedVariants={selectedVariants}
              favoriteVariants={favoriteVariants}
              variantCreatedAt={variantCreatedAt}
              variantUpdatedAt={variantUpdatedAt}
              zoom={zoom}
              gridCols={gridCols}
              onOrderChange={(order) => {
                if (safeActiveComponentKey) {
                  setVariantOrder(safeActiveComponentKey, order);
                }
              }}
              onToggleSelect={(variantId) => {
                if (safeActiveComponentKey) toggleVariantSelection(safeActiveComponentKey, variantId);
              }}
              onToggleFavorite={(variantId) => {
                if (safeActiveComponentKey) {
                  const isFavorite = favoriteVariants.includes(variantId);
                  setVariantsFavorite(
                    safeActiveComponentKey,
                    [variantId],
                    !isFavorite,
                  );
                }
              }}
              item={activeComponent}
              getVariantFrameUrl={effectiveGetVariantFrameUrl}
              onOpenPageVariant={effectiveCompareVariants}
            /> : <section className="vh-space-notice-wrap" role="status" aria-live="polite">
              <div className="vh-space-notice">
                <div className="vh-space-notice-visual" aria-hidden="true">
                  <Grid2X2 className="vh-space-notice-grid-icon" />
                  <Maximize2 className="vh-space-notice-expand-icon" />
                </div>
                <div className="vh-space-notice-copy">
                  <h2 className="vh-space-notice-title">This layout needs more room</h2>
                  <p className="vh-space-notice-text">Increase the window width to view {gridCols} columns.</p>
                </div>
              </div>
            </section>}
          </main> : effectiveGetVariantFrameUrl ? (
            <main className="vh-production-canvas">
              <div className="vh-canvas-settings">
                <span className="vh-canvas-settings-label">Viewport</span>
                <div className="vh-viewport-controls">
                  <ViewportPresetPicker value={canvasPreset} presets={presets} customSize={applicableCanvasSize} onChange={selectCanvasPreset} />
                  {canvasPreset === "custom" ? <div className="vh-custom-viewport-size" role="group" aria-label="Custom viewport size">
                    {(["width", "height"] as const).map((dimension, index) => <span className="vh-custom-viewport-field" key={dimension}>
                      {index ? <span className="vh-custom-viewport-separator" aria-hidden="true">×</span> : null}
                      <label>
                      <span aria-hidden="true">{dimension === "width" ? "W" : "H"}</span>
                      <input type="number" inputMode="numeric" min={100} max={7680} required aria-label={`Custom viewport ${dimension}`} value={customCanvasDraft[dimension]} onChange={(event) => setCustomCanvasDraft((draft) => ({ ...draft, [dimension]: event.target.value }))} onBlur={() => commitCustomCanvasSize(dimension)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
                      </label>
                    </span>)}
                  </div> : null}
                </div>
                {canvasPreset === "custom" ? <button type="button" onClick={() => {
                  const artboards = arrangeCanvasArtboards(comparedVariantIds,applicableCanvasSize);
                  canvasLayoutRef.current = {componentKey:activeComponent.key,artboards};
                  setCanvasLayout(activeComponent.key,{preset:"custom",resizeLocked:canvasResizeLocked,artboards});
                }}>Apply size to all</button> : null}
                <button type="button" className="vh-resize-lock" aria-pressed={canvasResizeLocked} onClick={() => setCanvasLayout(activeComponent.key,{preset:canvasPreset,resizeLocked:!canvasResizeLocked,artboards:variantHubState?.canvas?.artboards ?? {}})}>{canvasResizeLocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}{canvasResizeLocked ? "Unlock resize" : "Lock resize"}</button>
              </div>
              <VariantHubCanvasPrototype
                key={`${activeComponent.key}:${comparedVariantIds.join(":")}`}
                artboards={comparedVariantIds.map((variantId)=>{ const variant=activeComponent.variants.find((candidate)=>candidate.id===variantId)!; return {id:variantId,variantId,instanceId:`canvas:${variantId}`,name:variant?.name??variantId,error:variant ? resolveVariantSource(variant).error : "Variant not found.",src:effectiveGetVariantFrameUrl({itemKey:activeComponent.key,variantId,sequenceVariantIds:comparedVariantIds}),...presetDimensions}; })}
                initialLayout={variantHubState?.canvas?.artboards}
                resizeLocked={canvasResizeLocked}
                initialViewport={variantHubState?.camera}
                onViewportChange={(camera)=>setCamera(activeComponent.key,camera)}
                onOpenArtboard={(variantId)=>effectiveCompareVariants?.({itemKey:activeComponent.key,variantId,sequenceVariantIds:comparedVariantIds})}
                onLayoutChange={(artboards)=>{
                  const current = variantHubState?.canvas?.artboards ?? {};
                  const previous = canvasLayoutRef.current.componentKey === activeComponent.key ? canvasLayoutRef.current.artboards : current;
                  const resized = Object.entries(artboards).find(([id, geometry]) => geometry.width !== previous[id]?.width || geometry.height !== previous[id]?.height);
                  if (resized) setLastCanvasSize({componentKey:activeComponent.key,artboardId:resized[0],width:resized[1].width,height:resized[1].height});
                  canvasLayoutRef.current = {componentKey:activeComponent.key,artboards};
                  setCanvasLayout(activeComponent.key,{preset:canvasPreset !== "custom" && Object.values(artboards).some(({width,height})=>width!==presetDimensions.width||height!==presetDimensions.height) ? "custom" : canvasPreset,resizeLocked:canvasResizeLocked,artboards});
                }}
              />
            </main>
          ) : null}
          {saveStatus[activeComponent.key] === "loading" ? <div className="vh-layout-loading" role="status">Loading shared layout…</div> : null}
          {isVariantChooserOpen ? (
            <VariantChooserDialog
              embedded={initialVariantChooserOpen}
              variants={activeComponent.variants}
              variantOrder={activeComponent.variants.map((variant) => variant.id)}
              comparedVariantIds={variantChooserDraft}
              newVariantIds={pendingVariantIds}
              onClose={() => setIsVariantChooserOpen(false)}
              onApply={() => {
                if (pendingVariantIds.length) resolvePendingVariants(activeComponent.key, variantChooserDraft);
                else setComparedVariants(activeComponent.key, variantChooserDraft);
                setIsVariantChooserOpen(false);
              }}
              onSelect={setVariantChooserDraft}
              onToggle={(variantId) => setVariantChooserDraft((current) => current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId])}
            />
          ) : null}
        </>
      )}

      {!activeComponent && showEmptyState && componentsWithVariants.length === 0 ? (
        <div className="vh-empty-state">
          <div className="vh-empty-state-icon">
            <Palette className="h-8 w-8" />
          </div>
          <div className="vh-empty-state-copy">
            <h2 className="vh-empty-state-title">Select a component</h2>
            <p className="vh-empty-state-text">
              Choose a component from the dropdown to explore its variants
            </p>
          </div>

          <div className="vh-empty-note">
            <p>
              <strong>No components with variants found.</strong>
            </p>
            <p>
              Create variants by adding a <code>variants/</code> folder to
              your component and registering them using{" "}
              <code>registerComponentVariants()</code>.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
