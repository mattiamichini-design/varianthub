import type { ComponentWithVariants } from "./types";

export type ComponentSortOption =
  | "name-asc"
  | "name-desc"
  | "updated-asc"
  | "updated-desc";

export const COMPONENT_SORT_OPTIONS: Array<{
  value: ComponentSortOption;
  label: string;
}> = [
  { value: "name-asc", label: "A to Z" },
  { value: "name-desc", label: "Z to A" },
  { value: "updated-asc", label: "First updated" },
  { value: "updated-desc", label: "Last updated" },
];

export function getTimestampValue(timestamp?: string): number | undefined {
  if (!timestamp) {
    return undefined;
  }

  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? undefined : value;
}

export function getComponentCreatedAt(
  component: ComponentWithVariants,
  variantCreatedAt: Record<string, string> = {},
): string | undefined {
  const timestamps = [
    component.createdAt,
    ...component.variants.map(
      (variant) => variantCreatedAt[variant.id] ?? variant.createdAt,
    ),
  ].filter((timestamp): timestamp is string => Boolean(timestamp));

  return timestamps.reduce<string | undefined>((earliest, timestamp) => {
    const timestampValue = getTimestampValue(timestamp);
    const earliestValue = getTimestampValue(earliest);

    if (timestampValue === undefined) {
      return earliest;
    }

    if (earliestValue === undefined || timestampValue < earliestValue) {
      return timestamp;
    }

    return earliest;
  }, undefined);
}

export function getComponentUpdatedAt(
  component: ComponentWithVariants,
  variantUpdatedAt: Record<string, string> = {},
  variantCreatedAt: Record<string, string> = {},
  fallbackToCreated = false,
): string | undefined {
  const timestamps = [
    component.updatedAt,
    ...component.variants.map(
      (variant) => {
        const createdAt = variantCreatedAt[variant.id] ?? variant.createdAt;
        const updatedAt = variant.updatedAt ?? variantUpdatedAt[variant.id];

        if (updatedAt && updatedAt !== createdAt) {
          return updatedAt;
        }

        return fallbackToCreated ? createdAt : undefined;
      },
    ),
  ].filter((timestamp): timestamp is string => Boolean(timestamp));

  return timestamps.reduce<string | undefined>((latest, timestamp) => {
    const timestampValue = getTimestampValue(timestamp);
    const latestValue = getTimestampValue(latest);

    if (timestampValue === undefined) {
      return latest;
    }

    if (latestValue === undefined || timestampValue > latestValue) {
      return timestamp;
    }

    return latest;
  }, undefined);
}

export function formatComponentDate(timestamp?: string): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function compareComponents(
  left: ComponentWithVariants,
  right: ComponentWithVariants,
  sortOption: ComponentSortOption,
  componentUpdatedAt: Record<string, string | undefined> = {},
  originalIndex: Record<string, number> = {},
): number {
  if (sortOption === "name-asc") {
    return left.name.localeCompare(right.name);
  }

  if (sortOption === "name-desc") {
    return right.name.localeCompare(left.name);
  }

  const leftUpdatedValue = getTimestampValue(componentUpdatedAt[left.key]);
  const rightUpdatedValue = getTimestampValue(componentUpdatedAt[right.key]);
  const leftFallback = originalIndex[left.key] ?? 0;
  const rightFallback = originalIndex[right.key] ?? 0;

  if (leftUpdatedValue === undefined && rightUpdatedValue === undefined) {
    return leftFallback - rightFallback;
  }

  if (leftUpdatedValue === undefined) {
    return 1;
  }

  if (rightUpdatedValue === undefined) {
    return -1;
  }

  return sortOption === "updated-asc"
    ? leftUpdatedValue - rightUpdatedValue
    : rightUpdatedValue - leftUpdatedValue;
}
