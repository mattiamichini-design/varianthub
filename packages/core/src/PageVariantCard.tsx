"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Maximize2, RefreshCw, Star } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "./classnames";
import { useDragSourceTransform } from "./useDragSourceTransform";
import { formatVariantTimestamp } from "./variantTimestamp";
import type { VariantMeta } from "./types";

export type PageVariantCardProps = {
  itemKey: string;
  variant: VariantMeta;
  frameUrl: string;
  isSelected: boolean;
  isFavorite: boolean;
  createdAt?: string;
  updatedAt?: string;
  sourceError?: string;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  /** Opens this variant in the full-screen viewer. */
  onOpen?: () => void;
};

export function PageVariantCard(props: PageVariantCardProps) {
  const { variant, frameUrl, sourceError, isSelected, isFavorite, createdAt, updatedAt, onToggleSelect, onToggleFavorite, onOpen } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: variant.id });
  const dragTransform = useDragSourceTransform(variant.id, transform);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof window !== "undefined" && !("IntersectionObserver" in window),
  );
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setShouldLoad(true); },
      { rootMargin: "600px 0px" },
    );
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!shouldLoad || loaded || sourceError) return;
    const timeout = window.setTimeout(() => setFailed(true), 15_000);
    return () => window.clearTimeout(timeout);
  }, [loaded, retry, shouldLoad, sourceError]);
  return (
    <article
      ref={setNodeRef}
      className={cn("vh-card", "vh-page-card", isDragging && "vh-card--dragging")}
      style={{ transform: CSS.Transform.toString(dragTransform), transition }}
    >
      <div className="vh-card-header">
        <div className="vh-card-header-main">
          <button type="button" {...attributes} {...listeners} className="vh-card-drag-handle" aria-label={`Reorder ${variant.name}`}><GripVertical className="h-4 w-4" /></button>
          <div className="vh-card-copy"><span className="vh-card-title">{variant.name}</span>{variant.description ? <span className="vh-card-description">{variant.description}</span> : null}</div>
        </div>
        <div className="vh-card-actions">
          <button type="button" onClick={onToggleFavorite} className={cn("vh-card-favorite", isFavorite && "vh-card-favorite--active")} aria-label={isFavorite ? `Remove ${variant.name} from favorites` : `Add ${variant.name} to favorites`}><Star className={cn("h-4 w-4", isFavorite && "fill-current")} /></button>
          {onOpen ? <button type="button" className="vh-card-open" onClick={onOpen} title="Open full screen" aria-label={`Open ${variant.name} full page`}><Maximize2 className="h-4 w-4" /></button> : null}
          <button type="button" onClick={onToggleSelect} className={cn("vh-card-select", isSelected && "vh-card-select--selected")} aria-label={isSelected ? `Deselect ${variant.name}` : `Select ${variant.name}`}>{isSelected ? <Check className="h-2.5 w-2.5" /> : null}</button>
        </div>
      </div>
      <div ref={viewportRef} className="vh-page-card-preview">
        {sourceError ? <div className="vh-source-error" role="alert">{sourceError}</div> : null}
        {!sourceError && !loaded && !failed ? <div className="vh-card-preview-loading" role="status">Loading page…</div> : null}
        {failed ? <button type="button" className="vh-page-card-retry" onClick={() => { setFailed(false); setLoaded(false); setRetry((value) => value + 1); }}><RefreshCw className="h-4 w-4" /> Retry preview</button> : null}
        {shouldLoad && !failed && !sourceError ? <iframe key={retry} src={frameUrl} title={`${variant.name} page preview`} loading="lazy" onLoad={() => setLoaded(true)} /> : null}
      </div>
      <div className="vh-card-footer">
        <span className="vh-card-id">{variant.id}</span>
        <span className="vh-card-timestamp">{formatVariantTimestamp(updatedAt || createdAt)}</span>
      </div>
    </article>
  );
}
