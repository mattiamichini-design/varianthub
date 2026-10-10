"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  CheckSquare,
  Download,
  Maximize2,
  MoreHorizontal,
  Square,
  Star,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "./classnames";
import { MAX_COMPARED_VARIANTS } from "./fullPage";

type VariantHubToolbarProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedCount: number;
  comparedCount?: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExport: () => void;
  onFavoriteSelected: () => void;
  onCompare?: () => void;
  onCompareAll?: () => void;
  onChooseVariants?: () => void;
  canFavoriteSelection: boolean;
  canUnfavoriteSelection: boolean;
  compareEnabled?: boolean;
  gridCols: number;
  onGridColsChange: (cols: number) => void;
  exportEnabled?: boolean;
  isPage?: boolean;
  explorationName?: string;
  saveStatus?: "loading" | "saving" | "saved" | "error" | "conflict";
  onRetrySave?: () => void;
  onReloadLayout?: () => void;
};

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const GRID_OPTIONS = [1, 2, 3, 4];

export function resolveAvailableGridColumns(viewportWidth: number) {
  return viewportWidth < 720 ? 1 : viewportWidth < 1024 ? 2 : viewportWidth < 1280 ? 3 : 4;
}

function ToolbarButton({
  children,
  className,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("vh-toolbar-button", className)}
    >
      {children}
    </button>
  );
}

function GridIcon({ cols, className }: { cols: number; className?: string }) {
  const size = 16;
  const gap = 1.5;
  const padding = 1;

  const getGridConfig = (gridCols: number) => {
    switch (gridCols) {
      case 1:
        return { cols: 1, rows: 3 };
      case 2:
        return { cols: 2, rows: 2 };
      case 3:
        return { cols: 3, rows: 2 };
      case 4:
        return { cols: 4, rows: 2 };
      default:
        return { cols: 3, rows: 2 };
    }
  };

  const config = getGridConfig(cols);
  const availableWidth = size - padding * 2;
  const availableHeight = size - padding * 2;
  const cellWidth = (availableWidth - gap * (config.cols - 1)) / config.cols;
  const cellHeight = (availableHeight - gap * (config.rows - 1)) / config.rows;
  const cells = [];

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      const x = padding + col * (cellWidth + gap);
      const y = padding + row * (cellHeight + gap);
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={x}
          y={y}
          width={cellWidth}
          height={cellHeight}
          rx={0.5}
          fill="currentColor"
        />,
      );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

function MoreActions({
  onCompareAll,
  onChooseVariants,
}: {
  onCompareAll?: () => void;
  onChooseVariants?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const close = (event: PointerEvent | globalThis.KeyboardEvent) => {
      if (event instanceof globalThis.KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        triggerRef.current?.focus();
      } else if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const activate = (action: () => void) => {
    setOpen(false);
    action();
  };
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? current + 1 : event.key === "ArrowUp" ? current - 1 : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
    if (next < 0 && event.key !== "ArrowUp") return;
    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <div
      className="vh-toolbar-more"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="vh-toolbar-button vh-toolbar-button--more"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal aria-hidden="true" />
        <span>More</span>
      </button>
      {open ? (
        <div id={menuId} className="vh-toolbar-menu" role="menu" aria-label="More actions" onKeyDown={handleMenuKeyDown}>
          {onCompareAll ? (
            <button ref={firstItemRef} type="button" role="menuitem" tabIndex={-1} onClick={() => activate(onCompareAll)}>
              <Maximize2 aria-hidden="true" /> Compare all
            </button>
          ) : null}
          {onChooseVariants ? (
            <button ref={onCompareAll ? undefined : firstItemRef} type="button" role="menuitem" tabIndex={-1} onClick={() => activate(onChooseVariants)}>
              <CheckSquare aria-hidden="true" /> Manage variants
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VariantHubToolbar({
  zoom,
  onZoomChange,
  selectedCount,
  totalCount,
  comparedCount = selectedCount || Math.min(totalCount, MAX_COMPARED_VARIANTS),
  onSelectAll,
  onClearSelection,
  onExport,
  onFavoriteSelected,
  onCompare,
  onCompareAll,
  onChooseVariants,
  canFavoriteSelection,
  canUnfavoriteSelection,
  compareEnabled = true,
  gridCols,
  onGridColsChange,
  exportEnabled = true,
  isPage = false,
}: VariantHubToolbarProps) {
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const hasSelection = selectedCount > 0;
  const hasMoreActions = !!onChooseVariants || (!!onCompareAll && comparedCount >= 2);
  return (
    <div className="vh-toolbar">
      <div className="vh-toolbar-inner">
        <div className="vh-toolbar-selection" aria-label="Variant selection">
          <span className="vh-toolbar-stat"><b>{comparedCount}</b> visible</span>
          <span className="vh-toolbar-stat"><b>{selectedCount}</b> selected</span>
          {hasSelection ? (
            <ToolbarButton onClick={onClearSelection} ariaLabel="Clear selection">
              <Square aria-hidden="true" /> Clear
            </ToolbarButton>
          ) : comparedCount > 0 ? (
            <ToolbarButton onClick={onSelectAll}>
              <CheckSquare aria-hidden="true" /> Select all
            </ToolbarButton>
          ) : null}
          {hasSelection && canFavoriteSelection ? (
            <ToolbarButton onClick={onFavoriteSelected}>
              <Star className={cn(canUnfavoriteSelection && "fill-current")} aria-hidden="true" />
              {canUnfavoriteSelection ? "Unfavorite" : "Favorite"}
            </ToolbarButton>
          ) : null}
          {selectedCount >= 2 && onCompare && compareEnabled ? (
            <ToolbarButton onClick={onCompare} ariaLabel="Compare">
              <Maximize2 aria-hidden="true" /> Compare {selectedCount}
            </ToolbarButton>
          ) : null}
          {hasMoreActions ? (
            <MoreActions
              onCompareAll={comparedCount >= 2 ? onCompareAll : undefined}
              onChooseVariants={onChooseVariants}
            />
          ) : null}
          {hasSelection && exportEnabled ? (
            <ToolbarButton onClick={onExport}>
              <Download aria-hidden="true" /> Export
            </ToolbarButton>
          ) : null}
        </div>
        <div className="vh-toolbar-layout" aria-label="View controls">
          <div className="vh-toolbar-grid-mobile">
            <div className="vh-toolbar-grid-mobile-inner vh-segmented">
              {GRID_OPTIONS.map((cols) => (
                <button
                  type="button"
                  key={cols}
                  onClick={() => onGridColsChange(cols)}
                  className={cn(
                    "vh-toolbar-grid-button",
                    cols === gridCols && "vh-toolbar-grid-button--active",
                  )}
                  title={`${cols} column${cols > 1 ? "s" : ""}`}
                  aria-pressed={cols === gridCols}
                >
                  <GridIcon cols={cols} className="h-4 w-4" />
                  <span className="vh-toolbar-grid-count">{cols}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="vh-toolbar-grid-desktop vh-segmented">
            {GRID_OPTIONS.map((cols) => (
              <button
                type="button"
                key={cols}
                onClick={() => onGridColsChange(cols)}
                className={cn(
                  "vh-toolbar-grid-button",
                  cols === gridCols && "vh-toolbar-grid-button--active",
                )}
                title={`${cols} column${cols > 1 ? "s" : ""}`}
                aria-pressed={cols === gridCols}
              >
                <GridIcon cols={cols} className="h-4 w-4" />
                <span className="vh-toolbar-grid-count">{cols}</span>
              </button>
            ))}
          </div>

          {!isPage ? <div className="vh-toolbar-divider" /> : null}

          <div className="vh-toolbar-controls">
            {!isPage ? <><div className="vh-toolbar-zoom">
              <ToolbarButton
                className="vh-toolbar-button--icon"
                ariaLabel="Zoom out"
                onClick={() => onZoomChange(ZOOM_LEVELS[zoomIndex - 1] ?? zoom)}
                disabled={zoomIndex <= 0}
              >
                <ZoomOut className="h-4 w-4" />
              </ToolbarButton>
              <span className="vh-toolbar-zoom-value">{zoom}%</span>
              <ToolbarButton
                className="vh-toolbar-button--icon"
                ariaLabel="Zoom in"
                onClick={() => onZoomChange(ZOOM_LEVELS[zoomIndex + 1] ?? zoom)}
                disabled={
                  zoomIndex === -1 || zoomIndex >= ZOOM_LEVELS.length - 1
                }
              >
                <ZoomIn className="h-4 w-4" />
              </ToolbarButton>
            </div>

            </> : null}
          </div>

        </div>
      </div>
    </div>
  );
}
