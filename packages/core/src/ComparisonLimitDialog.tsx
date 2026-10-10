"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { VariantMeta } from "./types";

export function ComparisonLimitDialog({
  variant,
  comparedVariants,
  onCancel,
  onReplace,
}: {
  variant: VariantMeta;
  comparedVariants: VariantMeta[];
  onCancel: () => void;
  onReplace: (variantId: string) => void;
}) {
  const [replaceId, setReplaceId] = useState(comparedVariants[0]?.id ?? "");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="vh-comparison-dialog-layer" onCancel={onCancel} onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="vh-comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="vh-comparison-dialog-title">
        <header className="vh-comparison-dialog-copy vh-variant-chooser-heading">
          <div>
            <h2 id="vh-comparison-dialog-title">Replace a visible variant</h2>
            <p>The workspace is full. Choose one variant to remove before adding “{variant.name}”.</p>
          </div>
          <button type="button" className="vh-modal-close" onClick={onCancel} aria-label="Close replacement dialog"><X aria-hidden="true" /></button>
        </header>
        <div className="vh-comparison-dialog-options" role="radiogroup" aria-label="Variant to replace">
          {comparedVariants.map((candidate) => (
            <label key={candidate.id} className="vh-comparison-dialog-option">
              <span>{candidate.name}<small>{candidate.id}</small></span>
              <input type="radio" name="replace-variant" value={candidate.id} checked={replaceId === candidate.id} onChange={() => setReplaceId(candidate.id)} />
            </label>
          ))}
        </div>
        <footer className="vh-comparison-dialog-footer">
          <p>Or start a new exploration for a separate direction.</p>
          <div className="vh-comparison-dialog-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" className="vh-comparison-dialog-confirm" disabled={!replaceId} onClick={() => onReplace(replaceId)}>Replace and add</button>
          </div>
        </footer>
      </section>
    </dialog>
  );
}
