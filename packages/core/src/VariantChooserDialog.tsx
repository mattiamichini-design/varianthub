"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { MAX_COMPARED_VARIANTS } from "./fullPage";
import type { VariantMeta } from "./types";

export function VariantChooserDialog({
  variants,
  variantOrder,
  comparedVariantIds,
  onToggle,
  onSelect,
  onClose,
  newVariantIds = [],
  onApply,
  embedded = false,
}: {
  embedded?: boolean;
  variants: VariantMeta[];
  variantOrder: string[];
  comparedVariantIds: string[];
  onToggle: (variantId: string) => void;
  onSelect: (variantIds: string[]) => void;
  onClose: () => void;
  newVariantIds?: string[];
  onApply: () => void;
}) {
  const [sortOrder, setSortOrder] = useState("oldest");
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const orderedVariants = variantOrder.flatMap((id, index) => {
    const variant = variantsById.get(id);
    return variant ? [{ variant, number: index + 1 }] : [];
  });
  if (sortOrder === "newest") orderedVariants.reverse();
  const comparedSet = new Set(comparedVariantIds);
  const newSet = new Set(newVariantIds);
  const isDiscovery = newVariantIds.length > 0;
  const excess = Math.max(0, comparedVariantIds.length - MAX_COMPARED_VARIANTS);
  const isReady = comparedVariantIds.length > 0 && excess === 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (embedded) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [embedded]);
  return (
    <dialog open={embedded || undefined} data-embedded={embedded || undefined} ref={dialogRef} className="vh-comparison-dialog-layer" aria-labelledby="vh-variant-chooser-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="vh-comparison-dialog vh-comparison-dialog--chooser">
        <div className="vh-comparison-dialog-copy vh-variant-chooser-heading">
          <div>
            <h2 id="vh-variant-chooser-title">{isDiscovery ? `${newVariantIds.length} new variants added` : "Visible variants"}</h2>
            <p>Choose up to {MAX_COMPARED_VARIANTS} variants for Grid and Canvas.</p>
          </div>
          <button type="button" className="vh-modal-close" onClick={onClose} aria-label="Close variant chooser"><X aria-hidden="true" /></button>
        </div>
        <div className="vh-variant-discovery-notice">
          <div className="vh-variant-chooser-summary">
            <button type="button" className="vh-variant-chooser-sort" title={sortOrder === "oldest" ? "Oldest first" : "Newest first"} aria-label={sortOrder === "oldest" ? "Oldest first. Show newest first" : "Newest first. Show oldest first"} onClick={() => setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")}>
              {sortOrder === "oldest" ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
            </button>
            <span role="status" aria-live="polite"><strong>{comparedVariantIds.length} selected</strong> · {MAX_COMPARED_VARIANTS} maximum</span>
          </div>
          <div className="vh-variant-chooser-bulk-actions">
            {variants.length <= MAX_COMPARED_VARIANTS ? (
              <button type="button" onClick={() => onSelect(variantOrder)}>Select all</button>
            ) : (
              <>
                <button type="button" onClick={() => onSelect(variantOrder.slice(0, MAX_COMPARED_VARIANTS))}>First 20</button>
                <button type="button" onClick={() => onSelect(variantOrder.slice(-MAX_COMPARED_VARIANTS))}>Latest 20</button>
              </>
            )}
            <button type="button" onClick={() => onSelect([])}>Clear all</button>
          </div>
        </div>
        <div className="vh-comparison-dialog-options" role="list">
          {orderedVariants.map(({ variant, number }) => {
            const selected = comparedSet.has(variant.id);
            return (
              <button
                key={variant.id}
                type="button"
                className="vh-variant-chooser-option"
                aria-pressed={selected}
                onClick={() => onToggle(variant.id)}
              >
                <span><span className="vh-variant-chooser-name"><span className="vh-variant-chooser-number" aria-hidden="true">{String(number).padStart(2, "0")}</span><strong>{variant.name}</strong>{newSet.has(variant.id) ? <small className="vh-variant-new-badge">New</small> : null}</span>{variant.description ? <small>{variant.description}</small> : null}</span>
                <span className="vh-variant-chooser-check" aria-hidden="true">{selected ? <Check /> : null}</span>
              </button>
            );
          })}
        </div>
        <footer className="vh-variant-discovery-footer">
          <p>{excess ? `Hide ${excess} to continue. ` : isReady ? "Ready to apply. " : "Select at least one variant. "}Your current view stays unchanged until you apply.</p>
          <div>
            <button type="button" onClick={onClose}>{isDiscovery ? "Later" : "Cancel"}</button>
            <button type="button" className="vh-comparison-dialog-confirm" disabled={comparedVariantIds.length === 0 || excess > 0} onClick={onApply}>Apply</button>
          </div>
        </footer>
      </section>
    </dialog>
  );
}
