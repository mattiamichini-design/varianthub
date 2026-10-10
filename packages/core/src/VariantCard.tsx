"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Maximize2, Star } from "lucide-react";
import { cn } from "./classnames";
import { useDragSourceTransform } from "./useDragSourceTransform";
import { formatVariantTimestamp } from "./variantTimestamp";
import type { VariantMeta } from "./types";
import { VariantHubVariantContent } from "./variantSource";

type VariantCardProps = {
  variant: VariantMeta;
  isSelected: boolean;
  isFavorite: boolean;
  createdAt?: string;
  updatedAt?: string;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  onOpen?: () => void;
  zoom: number;
  componentProps?: Record<string, unknown>;
};

export function VariantCard({
  variant,
  isSelected,
  isFavorite,
  createdAt,
  updatedAt,
  onToggleSelect,
  onToggleFavorite,
  onOpen,
  zoom,
  componentProps = {},
}: VariantCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: variant.id,
  });
  const dragTransform = useDragSourceTransform(variant.id, transform);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(dragTransform),
        transition,
      }}
      className={cn(
        "vh-card",
        isDragging ? "vh-card--dragging" : null,
      )}
    >
      <div className="vh-card-header">
        <div className="vh-card-header-main">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="vh-card-drag-handle"
            aria-label={`Reorder ${variant.name}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="vh-card-copy">
            <span className="vh-card-title">{variant.name}</span>
            {variant.description ? (
              <span className="vh-card-description">{variant.description}</span>
            ) : null}
          </div>
        </div>

        <div className="vh-card-actions">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              "vh-card-favorite",
              isFavorite && "vh-card-favorite--active",
            )}
            title={isFavorite ? "Remove favorite" : "Mark as favorite"}
            aria-label={isFavorite ? `Remove ${variant.name} from favorites` : `Add ${variant.name} to favorites`}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </button>

          {onOpen ? (
            <button type="button" onClick={onOpen} className="vh-card-open" title="Open full screen" aria-label={`Open ${variant.name} full screen`}>
              <Maximize2 className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onToggleSelect}
            className={cn(
              "vh-card-select",
              isSelected && "vh-card-select--selected",
            )}
            aria-label={isSelected ? `Deselect ${variant.name}` : `Select ${variant.name}`}
          >
            {isSelected ? <Check className="h-2.5 w-2.5" /> : null}
          </button>
        </div>
      </div>

      <div
        className="vh-card-preview"
        style={{ minHeight: `${200 * (zoom / 100)}px` }}
      >
        <div
          className="vh-card-preview-inner"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${100 / (zoom / 100)}%`,
          }}
        >
          <div className="vh-card-preview-content">
            <VariantHubVariantContent
              variant={variant}
              componentProps={componentProps}
              fallback={<div className="vh-card-preview-loading">Loading…</div>}
            />
          </div>
        </div>
      </div>

      <div className="vh-card-footer">
        <div className="vh-card-id">{variant.id}</div>
        <div className="vh-card-timestamp">
          {formatVariantTimestamp(updatedAt || createdAt)}
        </div>
      </div>
    </div>
  );
}
