"use client";

import { useId, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ChevronDown, Star } from "lucide-react";
import { cn } from "./classnames";
import { DragSourceDeltaProvider } from "./useDragSourceTransform";
import { buildVariantSequence } from "./fullPage";
import { VariantCard } from "./VariantCard";
import { PageVariantCard } from "./PageVariantCard";
import { resolveVariantSource } from "./variantSource";
import type { VariantHubCatalogItem, VariantHubComparisonTarget, VariantMeta } from "./types";

const FAVORITES_DROP_ID = "variant-group-favorites";
const OTHER_VARIANTS_DROP_ID = "variant-group-other";
const DEFAULT_GROUPS_OPEN = { favorites: true, other: true };
// The grid scrolls beneath the page header, so a group can sit under the
// pointer while clipped out of view. Only accept targets the pointer can see.
const variantGridCollisionDetection: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  if (!pointer) return closestCenter(args);
  const visible = document.elementFromPoint?.(pointer.x, pointer.y);
  if (visible !== undefined && !visible?.closest(".vh-grid-shell")) return [];
  return pointerWithin(args);
};

type VariantDrop = {
  order: string[];
  favorite?: boolean;
};

export function resolveVariantDrop(
  currentOrder: string[],
  favoriteVariants: string[],
  activeId: string,
  overId: string,
): VariantDrop | undefined {
  const oldIndex = currentOrder.indexOf(activeId);
  if (oldIndex < 0) return;

  const favoriteSet = new Set(favoriteVariants);
  const wasFavorite = favoriteSet.has(activeId);
  const targetFavorite = overId === FAVORITES_DROP_ID
    ? true
    : overId === OTHER_VARIANTS_DROP_ID
      ? false
      : favoriteSet.has(overId);

  if (overId !== FAVORITES_DROP_ID && overId !== OTHER_VARIANTS_DROP_ID) {
    const newIndex = currentOrder.indexOf(overId);
    if (newIndex < 0) return;
    return {
      order: oldIndex === newIndex ? currentOrder : arrayMove(currentOrder, oldIndex, newIndex),
      ...(wasFavorite !== targetFavorite ? { favorite: targetFavorite } : {}),
    };
  }

  const withoutActive = currentOrder.filter((id) => id !== activeId);
  const favorites = withoutActive.filter((id) => favoriteSet.has(id));
  const others = withoutActive.filter((id) => !favoriteSet.has(id));
  const order = targetFavorite
    ? [...favorites, activeId, ...others]
    : [...favorites, ...others, activeId];

  return {
    order,
    ...(wasFavorite !== targetFavorite ? { favorite: targetFavorite } : {}),
  };
}

function VariantGroupHeading({
  id,
  label,
  visibleLabel,
  count,
  description,
  cardIds,
  isDropTarget,
  empty,
  order,
  roomyDropTarget,
  expanded,
  onToggle,
  emptyZoneId,
}: {
  id: string;
  label: string;
  visibleLabel: string;
  count: number;
  description?: string;
  cardIds: string[];
  isDropTarget: boolean;
  empty?: boolean;
  order: number;
  roomyDropTarget?: boolean;
  expanded: boolean;
  onToggle: () => void;
  emptyZoneId?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  const controlledIds = [...cardIds, ...(emptyZoneId ? [emptyZoneId] : [])];
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "vh-variant-group-heading",
        empty && expanded && "vh-variant-group-heading--empty",
        roomyDropTarget && "vh-variant-group-heading--roomy-drop-target",
      )}
      style={{ order }}
      aria-label={label}
      aria-owns={cardIds.length ? cardIds.join(" ") : undefined}
      data-drop-target={isDropTarget || undefined}
    >
      <button
        type="button"
        className="vh-variant-group-toggle"
        aria-expanded={expanded}
        aria-controls={controlledIds.length ? controlledIds.join(" ") : undefined}
        onClick={onToggle}
      >
        <ChevronDown className="vh-variant-group-chevron" aria-hidden="true" />
        <span className="vh-variant-group-title">{visibleLabel}</span>
        <span className="vh-variant-group-count">{count}</span>
        {description ? <span className="vh-variant-group-description">{description}</span> : null}
      </button>
      {empty ? (
        <div
          id={emptyZoneId}
          className="vh-favorites-dropzone"
          data-drop-target={isDropTarget || undefined}
          hidden={!expanded}
        >
          <Star className="vh-favorites-empty-star" aria-hidden="true" />
          <strong>{isDropTarget ? "Drop to add to favorites" : "Keep your strongest directions here"}</strong>
          <span>{isDropTarget ? "This variant will move out of the list below." : "Drag a variant into this area, or click its star."}</span>
        </div>
      ) : null}
    </section>
  );
}

type VariantHubGridProps = {
  variants: VariantMeta[];
  variantOrder: string[];
  selectedVariants: string[];
  favoriteVariants: string[];
  variantCreatedAt: Record<string, string>;
  variantUpdatedAt: Record<string, string>;
  zoom: number;
  gridCols: number;
  onOrderChange: (newOrder: string[]) => void;
  onToggleSelect: (variantId: string) => void;
  onToggleFavorite: (variantId: string) => void;
  componentProps?: Record<string, unknown>;
  item?: VariantHubCatalogItem;
  getVariantFrameUrl?: (target: VariantHubComparisonTarget) => string;
  /** @deprecated Use `getVariantFrameUrl`. */
  getPageVariantFrameUrl?: (target: VariantHubComparisonTarget) => string;
  /** Opens a variant in the full-screen viewer. */
  onOpenPageVariant?: (target: VariantHubComparisonTarget) => void;
};

export function VariantHubGrid({
  variants,
  variantOrder,
  selectedVariants,
  favoriteVariants,
  variantCreatedAt,
  variantUpdatedAt,
  zoom,
  gridCols,
  onOrderChange,
  onToggleSelect,
  onToggleFavorite,
  componentProps,
  item,
  getVariantFrameUrl,
  getPageVariantFrameUrl,
  onOpenPageVariant,
}: VariantHubGridProps) {
  const gridDomId = useId();
  const [activeId, setActiveId] = useState<string>();
  const [overId, setOverId] = useState<string>();
  const [groupsOpenByItem, setGroupsOpenByItem] = useState<Record<string, typeof DEFAULT_GROUPS_OPEN>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const variantMap = useMemo(() => {
    const map = new Map<string, VariantMeta>();
    variants.forEach((variant) => map.set(variant.id, variant));
    return map;
  }, [variants]);

  const orderedVariants = useMemo(() => {
    const baseOrder =
      variantOrder.length > 0
        ? variantOrder
        : variants.map((variant) => variant.id);
    const ordered = baseOrder
      .map((id) => variantMap.get(id))
      .filter((variant): variant is VariantMeta => !!variant);

    if (ordered.length === 0) {
      return variants;
    }

    const orderedIds = new Set(ordered.map((variant) => variant.id));
    const missing = variants.filter((variant) => !orderedIds.has(variant.id));
    const merged = [...ordered, ...missing];
    const favoriteSet = new Set(favoriteVariants);
    const favorites = merged.filter((variant) => favoriteSet.has(variant.id));
    const regular = merged.filter((variant) => !favoriteSet.has(variant.id));

    return [...favorites, ...regular];
  }, [favoriteVariants, variantMap, variantOrder, variants]);

  const favoriteSet = useMemo(() => new Set(favoriteVariants), [favoriteVariants]);
  const itemStateKey = item?.key ?? "default";
  const groupsOpen = groupsOpenByItem[itemStateKey] ?? DEFAULT_GROUPS_OPEN;
  const favoriteCount = orderedVariants.filter((variant) => favoriteSet.has(variant.id)).length;
  const otherCount = orderedVariants.length - favoriteCount;
  const cardId = (variantId: string) => `${gridDomId}-variant-card-${encodeURIComponent(variantId)}`;
  const favoritesEmptyZoneId = `${gridDomId}-favorites-empty-zone`;
  const targetIsFavorite = overId === FAVORITES_DROP_ID || (
    !!overId && overId !== OTHER_VARIANTS_DROP_ID && favoriteSet.has(overId)
  );
  const isDraggingToFavorites = !!activeId && !favoriteSet.has(activeId) && targetIsFavorite;

  const resetDragState = () => {
    setActiveId(undefined);
    setOverId(undefined);
  };
  const setGroupOpen = (group: keyof typeof DEFAULT_GROUPS_OPEN, expanded: boolean) => {
    setGroupsOpenByItem((current) => ({
      ...current,
      [itemStateKey]: { ...(current[itemStateKey] ?? DEFAULT_GROUPS_OPEN), [group]: expanded },
    }));
  };

  return (
    <DndContext
      id={`variant-grid-${item?.key ?? "default"}`}
      sensors={sensors}
      collisionDetection={variantGridCollisionDetection}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragOver={(event: DragOverEvent) => setOverId(event.over ? String(event.over.id) : undefined)}
      onDragCancel={resetDragState}
      onDragEnd={(event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
          const currentOrder = orderedVariants.map((variant) => variant.id);
          const drop = resolveVariantDrop(currentOrder, favoriteVariants, String(active.id), String(over.id));
          if (drop) {
            if (drop.order.some((id, index) => id !== currentOrder[index])) onOrderChange(drop.order);
            if (drop.favorite !== undefined) {
              setGroupOpen(drop.favorite ? "favorites" : "other", true);
              onToggleFavorite(String(active.id));
            }
          }
        }
        resetDragState();
      }}
    >
      <DragSourceDeltaProvider>
      <SortableContext
        items={orderedVariants
          .filter((variant) => favoriteSet.has(variant.id) ? groupsOpen.favorites : groupsOpen.other)
          .map((variant) => variant.id)}
        strategy={rectSortingStrategy}
      >
        <div className="vh-grid-shell">
          <div className={cn("vh-grid", `vh-grid-cols-${gridCols}`)}>
            <VariantGroupHeading
              id={FAVORITES_DROP_ID}
              label="Favorites"
              visibleLabel="Favorites"
              count={favoriteCount}
              description={favoriteCount ? "Your shortlist · Unstar to move back" : undefined}
              cardIds={orderedVariants.filter((variant) => favoriteSet.has(variant.id)).map((variant) => cardId(variant.id))}
              isDropTarget={isDraggingToFavorites}
              empty={!favoriteCount}
              order={0}
              expanded={groupsOpen.favorites}
              onToggle={() => setGroupOpen("favorites", !groupsOpen.favorites)}
              emptyZoneId={!favoriteCount ? favoritesEmptyZoneId : undefined}
            />
            {variants.map((variant) => {
              const visualIndex = orderedVariants.findIndex((entry) => entry.id === variant.id);
              const isFavorite = favoriteSet.has(variant.id);
              return (
              <div
                key={variant.id}
                id={cardId(variant.id)}
                className="vh-grid-card"
                data-group={isFavorite ? "favorites" : "other"}
                hidden={isFavorite ? !groupsOpen.favorites : !groupsOpen.other}
                inert={isFavorite ? !groupsOpen.favorites : !groupsOpen.other}
                style={{ order: visualIndex + (isFavorite ? 1 : 2) }}
              >
                {item?.kind === "page" && (getVariantFrameUrl ?? getPageVariantFrameUrl) ? (
                  <PageVariantCard
                    itemKey={item.key}
                    variant={variant}
                    sourceError={resolveVariantSource(variant).error}
                    frameUrl={(getVariantFrameUrl ?? getPageVariantFrameUrl)!({ itemKey: item.key, variantId: variant.id })}
                    isSelected={selectedVariants.includes(variant.id)}
                    isFavorite={favoriteVariants.includes(variant.id)}
                    createdAt={variantCreatedAt[variant.id] ?? variant.createdAt}
                    updatedAt={variantUpdatedAt[variant.id] ?? variant.updatedAt}
                    onToggleSelect={() => onToggleSelect(variant.id)}
                    onToggleFavorite={() => onToggleFavorite(variant.id)}
                    onOpen={item && onOpenPageVariant ? () => onOpenPageVariant({
                      itemKey: item.key,
                      variantId: variant.id,
                      sequenceVariantIds: buildVariantSequence(
                        orderedVariants.map((entry) => entry.id),
                        selectedVariants,
                        variant.id,
                      ),
                    }) : undefined}
                  />
                ) : (
                  <VariantCard
                    variant={variant}
                    isSelected={selectedVariants.includes(variant.id)}
                    isFavorite={favoriteVariants.includes(variant.id)}
                    createdAt={variantCreatedAt[variant.id] ?? variant.createdAt}
                    updatedAt={variantUpdatedAt[variant.id] ?? variant.updatedAt}
                    onToggleSelect={() => onToggleSelect(variant.id)}
                    onToggleFavorite={() => onToggleFavorite(variant.id)}
                    onOpen={item && onOpenPageVariant ? () => onOpenPageVariant({
                      itemKey: item.key,
                      variantId: variant.id,
                      sequenceVariantIds: buildVariantSequence(
                        orderedVariants.map((entry) => entry.id),
                        selectedVariants,
                        variant.id,
                      ),
                    }) : undefined}
                    zoom={zoom}
                    componentProps={componentProps}
                  />
                )}
              </div>
              );
            })}
            <VariantGroupHeading
              id={OTHER_VARIANTS_DROP_ID}
              label="Other variants"
              visibleLabel={favoriteCount ? "Other variants" : "All variants"}
              count={otherCount}
              cardIds={orderedVariants.filter((variant) => !favoriteSet.has(variant.id)).map((variant) => cardId(variant.id))}
              isDropTarget={!!activeId && favoriteSet.has(activeId) && !targetIsFavorite}
              order={favoriteCount + 1}
              roomyDropTarget={!otherCount}
              expanded={groupsOpen.other}
              onToggle={() => setGroupOpen("other", !groupsOpen.other)}
            />
          </div>
        </div>
      </SortableContext>
      </DragSourceDeltaProvider>
    </DndContext>
  );
}
