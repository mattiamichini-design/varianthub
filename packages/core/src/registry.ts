"use client";

import React from "react";
import type { ComponentWithVariants, VariantMeta } from "./types";

export type VariantHubRegistry = {
  registerComponentVariants: (config: ComponentWithVariants) => void;
  clearRegisteredComponentVariants: () => void;
  getComponentsWithVariants: () => ComponentWithVariants[];
  getComponentVariants: (key: string) => ComponentWithVariants | undefined;
  hasVariants: (key: string) => boolean;
};

export function createVariantHubRegistry(): VariantHubRegistry {
  const variantRegistry = new Map<string, ComponentWithVariants>();

  return {
    registerComponentVariants(config: ComponentWithVariants) {
      variantRegistry.set(config.key, config);
    },
    clearRegisteredComponentVariants() {
      variantRegistry.clear();
    },
    getComponentsWithVariants() {
      return Array.from(variantRegistry.values());
    },
    getComponentVariants(key: string) {
      return variantRegistry.get(key);
    },
    hasVariants(key: string) {
      const component = variantRegistry.get(key);
      return !!component && component.variants.length > 0;
    },
  };
}

export function createVariant(
  id: string,
  name: string,
  importFn: () => Promise<{
    default: React.ComponentType<Record<string, unknown>>;
  }>,
  description?: string,
): VariantMeta {
  const LazyComponent = React.lazy(importFn);

  return {
    id,
    name,
    description,
    component: LazyComponent,
  };
}
