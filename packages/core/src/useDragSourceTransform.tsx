import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDndMonitor, type UniqueIdentifier } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

type Delta = { x: number; y: number };
type DragDelta = { id: UniqueIdentifier; delta: Delta } | null;

function createDragDeltaStore() {
  let current: DragDelta = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next: DragDelta) => { current = next; listeners.forEach((listener) => listener()); },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

const DragDeltaContext = createContext<ReturnType<typeof createDragDeltaStore> | null>(null);
const noSubscription = () => () => {};

/** Publishes the pointer delta of the active drag. Render inside a DndContext. */
export function DragSourceDeltaProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createDragDeltaStore);
  useDndMonitor({
    onDragMove: (event) => store.set({ id: event.active.id, delta: event.delta }),
    onDragEnd: () => store.set(null),
    onDragCancel: () => store.set(null),
  });
  return <DragDeltaContext.Provider value={store}>{children}</DragDeltaContext.Provider>;
}

/**
 * Sortable only moves the dragged card while it hovers another card. Over a
 * group drop zone (Favorites, Other variants) it snaps the card back home, so
 * the drag looks stuck. Follow the pointer for the whole drag instead.
 */
export function useDragSourceTransform(id: UniqueIdentifier, sortableTransform: Transform | null): Transform | null {
  const store = useContext(DragDeltaContext);
  const delta = useSyncExternalStore(
    store?.subscribe ?? noSubscription,
    () => { const drag = store?.get(); return drag?.id === id ? drag.delta : null; },
    () => null,
  );
  return delta ? { x: delta.x, y: delta.y, scaleX: 1, scaleY: 1 } : sortableTransform;
}
