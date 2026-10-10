"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { ComponentMetadataPatch, ComponentWithVariants } from "./types";

type ComponentMetadataPanelProps = {
  component: ComponentWithVariants;
  availableCategories: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, patch: ComponentMetadataPatch) => void | Promise<void>;
};

function parseTokenInput(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ComponentMetadataPanel({
  component,
  availableCategories,
  isOpen,
  onClose,
  onSave,
}: ComponentMetadataPanelProps) {
  const [name, setName] = useState(component.name);
  const [description, setDescription] = useState(component.description ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    component.categories ?? [],
  );
  const [newCategory, setNewCategory] = useState("");
  const [tagInput, setTagInput] = useState((component.tags ?? []).join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const orderedCategories = useMemo(() => {
    const categorySet = new Set([...availableCategories, ...selectedCategories]);
    return Array.from(categorySet).sort();
  }, [availableCategories, selectedCategories]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) {
      dialog?.showModal();
      nameRef.current?.focus();
    }
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(false);
    try {
      const nextCategories = new Set(selectedCategories);
      const nextNewCategory = newCategory.trim();
      if (nextNewCategory) {
        nextCategories.add(nextNewCategory);
      }

      await onSave(component.key, {
        name: name.trim() || component.name,
        description: description.trim(),
        categories: Array.from(nextCategories),
        tags: parseTokenInput(tagInput),
      });
      setNewCategory("");
      onClose();
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (!isSaving) onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="vh-component-meta-modal"
      aria-labelledby="vh-component-meta-title"
      aria-describedby="vh-component-meta-subtitle"
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="vh-component-meta-modal-header">
        <div>
          <h2 id="vh-component-meta-title" className="vh-component-meta-modal-title">
            Edit component
          </h2>
          <p id="vh-component-meta-subtitle" className="vh-component-meta-modal-subtitle">
            Update its details and keep your explorations organized.
          </p>
        </div>

        <button type="button" className="vh-modal-close" onClick={handleClose} aria-label="Close dialog" disabled={isSaving}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form className="vh-component-meta-form" onSubmit={handleSubmit}>
        <div className="vh-component-meta-modal-body">
          <div className="vh-component-meta-grid">
            <div className="vh-component-meta-field">
              <label className="vh-component-meta-label" htmlFor="vh-component-meta-name">Name</label>
              <input
                ref={nameRef}
                id="vh-component-meta-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="vh-component-meta-input"
                placeholder="Component name"
              />
            </div>

            <div className="vh-component-meta-field">
              <label className="vh-component-meta-label" htmlFor="vh-component-meta-description">Description</label>
              <textarea
                id="vh-component-meta-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="vh-component-meta-textarea"
                placeholder="Add context for this component and what the variants explore"
                rows={3}
              />
            </div>

            <fieldset className="vh-component-meta-field">
              <legend className="vh-component-meta-label">Categories</legend>
              <div className="vh-component-meta-category-list">
                {orderedCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      className={isSelected ? "vh-component-meta-chip vh-component-meta-chip--selected" : "vh-component-meta-chip"}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((entry) => entry !== category)
                            : [...prev, category],
                        );
                      }}
                    >
                      {isSelected ? <Check aria-hidden="true" /> : null}
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="vh-component-meta-input-wrap">
                <Plus className="vh-component-meta-icon h-4 w-4" aria-hidden="true" />
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="vh-component-meta-input vh-component-meta-input--with-icon vh-component-meta-new-category"
                  placeholder="New category"
                  aria-label="New category"
                />
              </div>
            </fieldset>

            <div className="vh-component-meta-field">
              <div className="vh-component-meta-label-row">
                <label className="vh-component-meta-label" htmlFor="vh-component-meta-tags">Tags</label>
                <span className="vh-component-meta-helper">Separate with commas</span>
              </div>
              <input
                id="vh-component-meta-tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                className="vh-component-meta-input"
                placeholder="sticky, mobile, editorial"
              />
              <div className="vh-component-meta-tag-preview" aria-label="Tag preview">
                {parseTokenInput(tagInput).map((tag) => (
                  <span key={tag} className="vh-component-meta-chip vh-component-meta-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="vh-component-meta-actions">
          {saveError ? <p role="alert">Could not save details. Please try again.</p> : null}
          <button type="button" className="vh-component-meta-cancel" onClick={handleClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="vh-component-meta-submit" disabled={isSaving} aria-busy={isSaving}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
