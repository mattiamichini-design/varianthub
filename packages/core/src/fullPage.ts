import type { VariantHubCatalogItem, VariantHubComparisonTarget } from "./types";

export const MAX_COMPARED_VARIANTS = 20;

export function reconcileVariantDiscovery(
  registeredVariantIds: string[],
  knownVariantOrder: string[],
  visibleVariantIds: string[],
  pendingVariantIds: string[] = [],
): { variantOrder: string[]; comparedVariantIds: string[]; pendingVariantIds: string[] } {
  const registered = [...new Set(registeredVariantIds)];
  const available = new Set(registered);
  const known = knownVariantOrder.filter((id) => available.has(id));
  const knownSet = new Set(knownVariantOrder);
  const added = registered.filter((id) => !knownSet.has(id));
  const variantOrder = [...known, ...added];
  const visible = visibleVariantIds.filter((id) => available.has(id));
  const current = visible.length ? visible : variantOrder.slice(0, MAX_COMPARED_VARIANTS);
  const pending = [...new Set([...pendingVariantIds.filter((id) => available.has(id)), ...added])];
  const candidate = variantOrder.filter((id) => current.includes(id) || pending.includes(id));

  return candidate.length <= MAX_COMPARED_VARIANTS
    ? { variantOrder, comparedVariantIds: candidate, pendingVariantIds: [] }
    : { variantOrder, comparedVariantIds: current.slice(0, MAX_COMPARED_VARIANTS), pendingVariantIds: pending };
}

export function reconcileComparedVariantIds(
  visualOrder: string[],
  selectedVariantIds: string[],
  activeVariantId?: string,
  defaultWhenEmpty = true,
): string[] {
  const available = Array.from(new Set(visualOrder));
  const selected = new Set(selectedVariantIds);
  const reconciled = (selectedVariantIds.length > 0 || !defaultWhenEmpty
    ? available.filter((id) => selected.has(id) || id === activeVariantId)
    : available
  ).slice(0, MAX_COMPARED_VARIANTS);

  if (!activeVariantId || !available.includes(activeVariantId) || reconciled.includes(activeVariantId)) {
    return reconciled;
  }

  return reconciled.length === MAX_COMPARED_VARIANTS
    ? [...reconciled.slice(0, -1), activeVariantId]
    : [...reconciled, activeVariantId];
}

export function resolveCatalogItemKind(
  item: Pick<VariantHubCatalogItem, "kind">,
): "component" | "page" {
  return item.kind === "page" ? "page" : "component";
}

export function buildVariantSequence(
  visualOrder: string[],
  selectedVariantIds: string[],
  activeVariantId?: string,
): string[] {
  return reconcileComparedVariantIds(visualOrder, selectedVariantIds, activeVariantId);
}

export function buildComparisonTarget(
  itemKey: string,
  visualOrder: string[],
  selectedVariantIds: string[],
): VariantHubComparisonTarget | undefined {
  const sequenceVariantIds = reconcileComparedVariantIds(
    visualOrder,
    selectedVariantIds,
  );
  const variantId = sequenceVariantIds[0];

  return variantId
    ? { itemKey, variantId, sequenceVariantIds }
    : undefined;
}

export function getAdjacentVariantId(
  sequence: string[],
  activeVariantId: string,
  direction: -1 | 1,
): string | undefined {
  if (sequence.length === 0) return undefined;
  const index = Math.max(0, sequence.indexOf(activeVariantId));
  return sequence[(index + direction + sequence.length) % sequence.length];
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}
